import { Request, Response } from "express";
import ListTicketEventosService from "../services/TicketEventoServices/ListTicketEventosService";
import CreateTicketEventoService from "../services/TicketEventoServices/CreateTicketEventoService";
import DeleteTicketEventoService from "../services/TicketEventoServices/DeleteTicketEventoService";
import ListTicketAnotacoesService from "../services/TicketAnotacaoServices/ListTicketAnotacoesService";
import CreateTicketAnotacaoService, {
  buildAnotacaoResponse
} from "../services/TicketAnotacaoServices/CreateTicketAnotacaoService";
import UpdateTicketAnotacaoService from "../services/TicketAnotacaoServices/UpdateTicketAnotacaoService";
import DeleteTicketAnotacaoService from "../services/TicketAnotacaoServices/DeleteTicketAnotacaoService";
import ListTicketLembretesService from "../services/TicketLembreteServices/ListTicketLembretesService";
import CreateTicketLembreteService from "../services/TicketLembreteServices/CreateTicketLembreteService";
import DeleteTicketLembreteService from "../services/TicketLembreteServices/DeleteTicketLembreteService";
import UpdateTicketLembreteService from "../services/TicketLembreteServices/UpdateTicketLembreteService";
import ListTicketLembreteDisparosService from "../services/TicketLembreteServices/ListTicketLembreteDisparosService";
import TestKanbanLembreteDispatchService from "../services/TicketLembreteServices/TestKanbanLembreteDispatchService";
import AppError from "../errors/AppError";
import { resolveTicketIdFromRouteParam } from "../helpers/ResolveTicketIdFromRoute";

// ---- Eventos ----
export const listEventos = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { companyId } = req.user;
  const id = await resolveTicketIdFromRouteParam(ticketId, companyId);
  const { eventos } = await ListTicketEventosService(id, companyId);
  return res.status(200).json({ eventos });
};

export const createEvento = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { companyId } = req.user;
  const id = await resolveTicketIdFromRouteParam(ticketId, companyId);
  const { setor, responsavel, tipo, data, hora, localizacao, descricao } = req.body;
  const evento = await CreateTicketEventoService(id, companyId, {
    setor,
    responsavel,
    tipo,
    data,
    hora,
    localizacao,
    descricao
  });
  return res.status(201).json({ evento });
};

export const deleteEvento = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId, eventoId } = req.params;
  const { companyId } = req.user;
  const id = await resolveTicketIdFromRouteParam(ticketId, companyId);
  await DeleteTicketEventoService(id, companyId, parseInt(eventoId, 10));
  return res.status(204).send();
};

// ---- Anotações ----
export const listAnotacoes = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { companyId } = req.user;
  const id = await resolveTicketIdFromRouteParam(ticketId, companyId);
  const { anotacoes } = await ListTicketAnotacoesService(id, companyId);
  return res.status(200).json({ anotacoes });
};

export const createAnotacao = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { companyId } = req.user;
  const ticketIdNum = await resolveTicketIdFromRouteParam(ticketId, companyId);

  let texto: string;
  let eventoId: number | null = null;
  let status = "aberta";
  let arquivoNome: string | null = null;
  let arquivoPath: string | null = null;

  if (req.file) {
    texto = (req.body.texto || "").trim();
    eventoId =
      req.body.eventoId != null && req.body.eventoId !== ""
        ? parseInt(String(req.body.eventoId), 10)
        : null;
    status = (req.body.status || "aberta").trim() || "aberta";
    arquivoNome = req.file.originalname || req.file.filename;
    arquivoPath = req.file.filename;
  } else {
    const body = req.body;
    texto = (body.texto || "").trim();
    eventoId =
      body.eventoId != null && body.eventoId !== ""
        ? parseInt(String(body.eventoId), 10)
        : null;
    status = (body.status || "aberta").trim() || "aberta";
  }

  const anotacao = await CreateTicketAnotacaoService(ticketIdNum, companyId, {
    texto,
    eventoId,
    status,
    arquivoNome,
    arquivoPath
  });

  const response = buildAnotacaoResponse(anotacao, companyId, ticketIdNum);
  return res.status(201).json({ anotacao: response });
};

export const updateAnotacao = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId, anotacaoId } = req.params;
  const { companyId } = req.user;
  const id = await resolveTicketIdFromRouteParam(ticketId, companyId);
  const { status, texto } = req.body;
  const anotacao = await UpdateTicketAnotacaoService(
    id,
    companyId,
    parseInt(anotacaoId, 10),
    { status, texto }
  );
  const baseUrl = `${process.env.BACKEND_URL}${process.env.PROXY_PORT ? `:${process.env.PROXY_PORT}` : ""}`;
  const arquivoUrl = anotacao.arquivoPath
    ? `${baseUrl}/public/company${companyId}/anotacoes/${id}/${anotacao.arquivoPath}`
    : null;
  return res.status(200).json({
    anotacao: {
      id: anotacao.id,
      ticketId: anotacao.ticketId,
      eventoId: anotacao.eventoId,
      texto: anotacao.texto,
      arquivoNome: anotacao.arquivoNome,
      arquivoUrl,
      status: anotacao.status,
      createdAt: anotacao.createdAt
    }
  });
};

export const deleteAnotacao = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId, anotacaoId } = req.params;
  const { companyId } = req.user;
  const id = await resolveTicketIdFromRouteParam(ticketId, companyId);
  await DeleteTicketAnotacaoService(id, companyId, parseInt(anotacaoId, 10));
  return res.status(204).send();
};

// ---- Lembretes ----
export const listLembretes = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { companyId } = req.user;
  const id = await resolveTicketIdFromRouteParam(ticketId, companyId);
  const { lembretes } = await ListTicketLembretesService(id, companyId);
  return res.status(200).json({ lembretes });
};

export const createLembrete = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { companyId } = req.user;
  const id = await resolveTicketIdFromRouteParam(ticketId, companyId);
  const b = req.body;
  const lembrete = await CreateTicketLembreteService(id, companyId, {
    nome: b.nome,
    descricao: b.descricao,
    data: b.data,
    hora: b.hora,
    eventoId: b.eventoId != null ? parseInt(String(b.eventoId), 10) : null,
    addGoogle: b.addGoogle === true || b.addGoogle === "true",
    tipoGatilho: b.tipoGatilho,
    ativo: b.ativo,
    mensagemTemplate: b.mensagemTemplate,
    destinoTipo: b.destinoTipo,
    destinoId: b.destinoId != null ? parseInt(String(b.destinoId), 10) : null,
    diasAntecedencia: b.diasAntecedencia != null ? Number(b.diasAntecedencia) : null,
    antecedenciaMinutos:
      b.antecedenciaMinutos != null ? Number(b.antecedenciaMinutos) : null
  });
  return res.status(201).json({ lembrete });
};

export const updateLembrete = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId, lembreteId } = req.params;
  const { companyId } = req.user;
  const id = await resolveTicketIdFromRouteParam(ticketId, companyId);
  const lembrete = await UpdateTicketLembreteService(
    id,
    companyId,
    parseInt(lembreteId, 10),
    req.body
  );
  return res.status(200).json({ lembrete });
};

export const deleteLembrete = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId, lembreteId } = req.params;
  const { companyId } = req.user;
  const id = await resolveTicketIdFromRouteParam(ticketId, companyId);
  await DeleteTicketLembreteService(id, companyId, parseInt(lembreteId, 10));
  return res.status(204).send();
};

export const listLembreteDisparos = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId, lembreteId } = req.params;
  const { companyId } = req.user;
  try {
    const id = await resolveTicketIdFromRouteParam(ticketId, companyId);
    const { disparos } = await ListTicketLembreteDisparosService(
      id,
      companyId,
      parseInt(lembreteId, 10)
    );
    return res.status(200).json({ disparos });
  } catch (e) {
    if (e instanceof AppError) {
      return res.status(e.statusCode).json({ error: e.message });
    }
    throw e;
  }
};

export const testLembreteDispatch = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId, lembreteId } = req.params;
  const { companyId } = req.user;
  try {
    const id = await resolveTicketIdFromRouteParam(ticketId, companyId);
    await TestKanbanLembreteDispatchService(
      id,
      companyId,
      parseInt(lembreteId, 10)
    );
    return res.status(200).json({ ok: true });
  } catch (e) {
    if (e instanceof AppError) {
      return res.status(e.statusCode).json({ error: e.message });
    }
    throw e;
  }
};
