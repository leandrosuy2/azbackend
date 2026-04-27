import moment from "moment";
import TicketLembrete from "../../models/TicketLembrete";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import User from "../../models/User";
import TicketQuadro from "../../models/TicketQuadro";
import TicketLembreteDisparo from "../../models/TicketLembreteDisparo";
import { getIO } from "../../libs/socket";
import {
  formatKanbanLembreteTemplate,
  KanbanLembreteTemplateVars
} from "../../helpers/formatKanbanLembreteTemplate";
import ShowTicketService from "../TicketServices/ShowTicketService";
import SendWhatsAppMessage from "../WbotServices/SendWhatsAppMessage";

export type KanbanLembreteEvento =
  | { tipo: "movimentacao"; colunaNome: string }
  | { tipo: "mudanca_status"; status: string }
  | { tipo: "prazo_proximo" | "prazo_vencido"; dataPrazoLabel: string }
  | { tipo: "anexo_adicionado"; nomeArquivo: string }
  | { tipo: "agendado"; dataHoraLabel: string };

const normDestino = (raw: string | null | undefined): string =>
  {
    const d = String(raw || "interno")
      .trim()
      .toLowerCase();
    if (d === "sistema" || d === "sistema_alerta") return "interno";
    if (d === "grupo") return "fila";
    return d;
  };

/**
 * Dispara notificações (socket + opcional WhatsApp) para lembretes «inteligentes» ativos do ticket.
 */
const DispatchKanbanLembreteService = async (
  ticketId: number,
  companyId: number,
  evento: KanbanLembreteEvento,
  lembreteIdFilter?: number
): Promise<void> => {
  const tipoGatilho =
    evento.tipo === "movimentacao"
      ? "movimentacao"
      : evento.tipo === "mudanca_status"
        ? "mudanca_status"
        : evento.tipo === "anexo_adicionado"
          ? "anexo_adicionado"
          : evento.tipo === "agendado"
            ? "agendado"
            : evento.tipo;

  const where: Record<string, unknown> = {
    ticketId,
    companyId,
    ativo: true,
    tipoGatilho
  };
  if (lembreteIdFilter != null) {
    where.id = lembreteIdFilter;
  }

  const rows = await TicketLembrete.findAll({ where: where as any });

  if (!rows.length) {
    return;
  }

  const ticket = await Ticket.findOne({
    where: { id: ticketId, companyId },
    attributes: ["id", "userId", "queueId", "contactId", "whatsappId", "isGroup", "status"],
    include: [
      { model: Contact, attributes: ["name"], required: false },
      { model: User, attributes: ["name"], required: false }
    ]
  });

  if (!ticket) {
    return;
  }

  const quadro = await TicketQuadro.findOne({
    where: { ticketId },
    attributes: ["id", "nomeProjeto"]
  });

  const nomeCard =
    (quadro?.nomeProjeto && String(quadro.nomeProjeto).trim()) ||
    ticket.contact?.name ||
    `Ticket #${ticketId}`;

  const vars: KanbanLembreteTemplateVars = {
    nomeCard,
    contato: ticket.contact?.name || "",
    responsavel: ticket.user?.name || ""
  };

  if (evento.tipo === "movimentacao") {
    vars.coluna = evento.colunaNome;
  } else if (evento.tipo === "mudanca_status") {
    vars.status = evento.status;
  } else if (evento.tipo === "anexo_adicionado") {
    vars.arquivo = evento.nomeArquivo;
  } else if (evento.tipo === "agendado") {
    vars.data = evento.dataHoraLabel;
  } else if (evento.tipo === "prazo_proximo" || evento.tipo === "prazo_vencido") {
    vars.data = evento.dataPrazoLabel;
  }

  const io = getIO();
  const nsp = String(companyId);

  for (const lembrete of rows) {
    const body = formatKanbanLembreteTemplate(
      lembrete.mensagemTemplate,
      tipoGatilho,
      vars
    );

    const recent = await TicketLembreteDisparo.findOne({
      where: { lembreteId: lembrete.id, ticketId, companyId, tipoGatilho },
      order: [["createdAt", "DESC"]],
      attributes: ["corpo", "createdAt"]
    });
    if (recent) {
      const prevCorpo = String(recent.corpo || "");
      const prevAt = recent.createdAt;
      if (
        prevCorpo === body &&
        prevAt &&
        moment().diff(moment(prevAt), "seconds") < 60
      ) {
        continue;
      }
    }

    const dest = normDestino(lembrete.destinoTipo);
    let waErr: string | null = null;
    let sentWa = false;

    if (dest === "contato_whatsapp" || dest === "whatsapp" || dest === "contato") {
      try {
        const full = await ShowTicketService(ticketId, companyId);
        if (full.contactId && full.whatsappId) {
          await SendWhatsAppMessage({ body, ticket: full, msdelay: 1200 });
          sentWa = true;
        } else {
          waErr = "Ticket sem contato ou conexão WhatsApp vinculada.";
        }
      } catch (e: any) {
        waErr = e?.message ? String(e.message) : "Falha ao enviar WhatsApp.";
      }
    }

    const targetUserId =
      dest === "usuario" && lembrete.destinoId != null
        ? Number(lembrete.destinoId)
        : ticket.userId ?? null;

    io.of(nsp).to("notification").emit(`company-${companyId}-kanban-lembrete`, {
      ticketId,
      lembreteId: lembrete.id,
      titulo: lembrete.nome,
      body,
      tipoGatilho,
      destinoTipo: lembrete.destinoTipo || "interno",
      destinoId: lembrete.destinoId ?? null,
      targetUserId,
      targetQueueId: ticket.queueId ?? null,
      whatsappEnviado: sentWa,
      whatsappErro: waErr
    });

    let logStatus = "ok";
    if (dest === "contato_whatsapp" || dest === "whatsapp" || dest === "contato") {
      logStatus = sentWa ? "ok" : waErr ? "ok_interno" : "ok_interno";
    }

    await TicketLembreteDisparo.create({
      lembreteId: lembrete.id,
      ticketId,
      companyId,
      tipoGatilho,
      status: logStatus,
      canalInterno: true,
      canalWhatsapp: sentWa,
      corpo: body,
      erroWhatsapp: waErr
    });
  }
};

export default DispatchKanbanLembreteService;
