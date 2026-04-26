import React, { useState, useEffect, useCallback } from "react";
import {
  makeStyles,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  FormControlLabel,
  Box,
  Divider,
  Paper,
  Tooltip,
  CircularProgress,
  Link,
} from "@material-ui/core";
import MoreVert from "@material-ui/icons/MoreVert";
import CalendarToday from "@material-ui/icons/CalendarToday";
import Note from "@material-ui/icons/Note";
import NotificationsActive from "@material-ui/icons/NotificationsActive";
import Add from "@material-ui/icons/Add";
import Close from "@material-ui/icons/Close";
import AttachFile from "@material-ui/icons/AttachFile";
import Edit from "@material-ui/icons/Edit";
import DeleteOutline from "@material-ui/icons/DeleteOutline";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const SETORES = [
  { id: "consulta", name: "Consulta" },
  { id: "instalacao", name: "Instalação" },
  { id: "visita_tecnica", name: "Visita Técnica" },
];

const TIPOS_AGENDAMENTO = ["Consulta", "Instalação", "Visita Técnica", "Retorno", "Outro"];
const STATUS_ANOTACAO = ["aberta", "concluída", "pendente"];

const modalMaxWidth = 480;

const useStyles = makeStyles((theme) => ({
  /** Faixa acima do campo de mensagem — não sobrepõe o histórico do chat */
  toolbar: {
    flexShrink: 0,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: theme.spacing(0.5),
    padding: theme.spacing(0.5, 1),
    paddingRight: theme.spacing(1.5),
    borderTop: `1px solid ${theme.palette.divider}`,
    backgroundColor:
      theme.palette.type === "dark" ? theme.palette.grey[900] : theme.palette.grey[100],
    zIndex: 1,
  },
  iconBtn: {
    backgroundColor: theme.palette.primary.main,
    color: "#fff",
    boxShadow: theme.shadows[2],
    padding: theme.spacing(0.75),
    "&:hover": {
      backgroundColor: theme.palette.primary.dark,
      boxShadow: theme.shadows[4],
    },
  },
  iconBtnMore: {
    backgroundColor: theme.palette.primary.main,
    color: "#fff",
    boxShadow: theme.shadows[2],
    padding: theme.spacing(0.75),
    "&:hover": {
      backgroundColor: theme.palette.primary.dark,
      boxShadow: theme.shadows[4],
    },
  },
  modalContent: {
    padding: theme.spacing(2),
    overflowY: "auto",
    maxHeight: "70vh",
  },
  formField: {
    marginBottom: theme.spacing(2),
  },
  listEmpty: {
    padding: theme.spacing(3),
    textAlign: "center",
    color: theme.palette.text.secondary,
  },
  tabPanel: {
    paddingTop: theme.spacing(0),
  },
}));

const LS_PREFIX = "ticket_calendar_";

function loadFromStorage(ticketId, key) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + ticketId + "_" + key);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

function saveToStorage(ticketId, key, data) {
  try {
    localStorage.setItem(LS_PREFIX + ticketId + "_" + key, JSON.stringify(data));
  } catch (e) {}
}

export default function TicketFloatingActions({ ticketId }) {
  const classes = useStyles();
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const [eventos, setEventos] = useState([]);
  const [anotacoes, setAnotacoes] = useState([]);
  const [loadingAnotacoes, setLoadingAnotacoes] = useState(false);
  const [savingAnotacao, setSavingAnotacao] = useState(false);
  const [editAnotacao, setEditAnotacao] = useState(null);
  const [lembretes, setLembretes] = useState([]);

  const [formEvento, setFormEvento] = useState({
    setor: "consulta",
    responsavel: "",
    tipo: "Consulta",
    data: "",
    hora: "",
    localizacao: "",
    descricao: "",
  });
  const [formAnotacao, setFormAnotacao] = useState({ texto: "", arquivo: null });
  const [showFormAnotacao, setShowFormAnotacao] = useState(false);
  const [anotacaoEventoId, setAnotacaoEventoId] = useState(null);
  const [formLembrete, setFormLembrete] = useState({
    nome: "",
    descricao: "",
    data: "",
    hora: "",
    addGoogle: false,
  });
  const [lembreteEventoId, setLembreteEventoId] = useState(null);

  useEffect(() => {
    if (!ticketId) return;
    const e = loadFromStorage(ticketId, "eventos");
    const l = loadFromStorage(ticketId, "lembretes");
    if (Array.isArray(e)) setEventos(e);
    if (Array.isArray(l)) setLembretes(l);
  }, [ticketId]);

  const fetchAnotacoes = useCallback(async () => {
    if (!ticketId) return;
    setLoadingAnotacoes(true);
    try {
      const { data } = await api.get(`/tickets/${ticketId}/anotacoes`);
      setAnotacoes(Array.isArray(data.anotacoes) ? data.anotacoes : []);
    } catch (err) {
      toastError(err);
      setAnotacoes([]);
    } finally {
      setLoadingAnotacoes(false);
    }
  }, [ticketId]);

  useEffect(() => {
    if (!modalOpen || !ticketId || activeTab !== 1) return;
    fetchAnotacoes();
  }, [modalOpen, activeTab, ticketId, fetchAnotacoes]);

  const openModal = (tab) => {
    setActiveTab(tab);
    setModalOpen(true);
    setExpanded(false);
  };

  const handleCriarEvento = () => {
    if (!formEvento.data || !formEvento.hora) return;
    const novo = {
      id: "ev_" + Date.now(),
      ticketId,
      setor: formEvento.setor,
      responsavel: formEvento.responsavel,
      tipo: formEvento.tipo,
      data: formEvento.data,
      hora: formEvento.hora,
      localizacao: formEvento.localizacao || "",
      descricao: formEvento.descricao || "",
      createdAt: new Date().toISOString(),
    };
    const next = [...eventos, novo];
    setEventos(next);
    saveToStorage(ticketId, "eventos", next);
    setFormEvento({ ...formEvento, data: "", hora: "", localizacao: "", descricao: "" });
  };

  const handleSalvarAnotacao = async () => {
    const textoTrim = (formAnotacao.texto || "").trim();
    const textoFinal =
      textoTrim ||
      (formAnotacao.arquivo ? `Anexo: ${formAnotacao.arquivo.name}` : "");
    if (!textoFinal) return;
    setSavingAnotacao(true);
    try {
      if (formAnotacao.arquivo) {
        const fd = new FormData();
        fd.append("texto", textoTrim || textoFinal);
        if (anotacaoEventoId != null) fd.append("eventoId", String(anotacaoEventoId));
        fd.append("status", "aberta");
        fd.append("file", formAnotacao.arquivo);
        await api.post(`/tickets/${ticketId}/anotacoes`, fd);
      } else {
        await api.post(`/tickets/${ticketId}/anotacoes`, {
          texto: textoFinal,
          eventoId: anotacaoEventoId,
          status: "aberta",
        });
      }
      setFormAnotacao({ texto: "", arquivo: null });
      setShowFormAnotacao(false);
      setAnotacaoEventoId(null);
      await fetchAnotacoes();
    } catch (err) {
      toastError(err);
    } finally {
      setSavingAnotacao(false);
    }
  };

  const handleSalvarEdicaoAnotacao = async () => {
    if (!editAnotacao?.id) return;
    setSavingAnotacao(true);
    try {
      await api.patch(`/tickets/${ticketId}/anotacoes/${editAnotacao.id}`, {
        texto: (editAnotacao.texto || "").trim(),
        status: editAnotacao.status || "aberta",
      });
      setEditAnotacao(null);
      await fetchAnotacoes();
    } catch (err) {
      toastError(err);
    } finally {
      setSavingAnotacao(false);
    }
  };

  const handleExcluirAnotacao = async (id) => {
    if (!id || !window.confirm("Excluir esta anotação? Esta ação não pode ser desfeita.")) return;
    setSavingAnotacao(true);
    try {
      await api.delete(`/tickets/${ticketId}/anotacoes/${id}`);
      if (editAnotacao?.id === id) setEditAnotacao(null);
      await fetchAnotacoes();
    } catch (err) {
      toastError(err);
    } finally {
      setSavingAnotacao(false);
    }
  };

  const handleCriarLembrete = () => {
    if (!(formLembrete.nome || "").trim() || !formLembrete.data || !formLembrete.hora) return;
    const novo = {
      id: "lm_" + Date.now(),
      ticketId,
      eventoId: lembreteEventoId,
      nome: formLembrete.nome.trim(),
      descricao: formLembrete.descricao || "",
      data: formLembrete.data,
      hora: formLembrete.hora,
      addGoogle: formLembrete.addGoogle,
      createdAt: new Date().toISOString(),
    };
    const next = [...lembretes, novo];
    setLembretes(next);
    saveToStorage(ticketId, "lembretes", next);
    setFormLembrete({ nome: "", descricao: "", data: "", hora: "", addGoogle: false });
    setLembreteEventoId(null);
  };

  const eventosPorSetor = (setorId) => eventos.filter((e) => e.setor === setorId);

  if (!ticketId) return null;

  return (
    <>
      <div className={classes.toolbar}>
        {expanded && (
          <>
            <Tooltip title="Agendamento">
              <IconButton className={classes.iconBtn} onClick={() => openModal(0)} size="small">
                <CalendarToday fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Anotações">
              <IconButton className={classes.iconBtn} onClick={() => openModal(1)} size="small">
                <Note fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Lembretes">
              <IconButton className={classes.iconBtn} onClick={() => openModal(2)} size="small">
                <NotificationsActive fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}
        <Tooltip title={expanded ? "Fechar atalhos" : "Agendamento, anotações e lembretes"}>
          <IconButton
            className={classes.iconBtnMore}
            onClick={() => setExpanded((e) => !e)}
            size="small"
            aria-expanded={expanded}
            aria-label="Abrir menu de agendamento e lembretes"
          >
            <MoreVert fontSize="small" />
          </IconButton>
        </Tooltip>
      </div>

      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ style: { maxWidth: modalMaxWidth } }}
      >
        <DialogTitle disableTypography style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="h6">
            {activeTab === 0 && "Agendamento"}
            {activeTab === 1 && "Anotações"}
            {activeTab === 2 && "Lembretes"}
          </Typography>
          <IconButton onClick={() => setModalOpen(false)} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent className={classes.modalContent}>
          {activeTab === 0 && (
            <div className={classes.tabPanel}>
              <Typography variant="subtitle2" color="textSecondary" style={{ marginBottom: 12 }}>
                Criar evento vinculado ao calendário do setor
              </Typography>
              <FormControl fullWidth className={classes.formField}>
                <InputLabel>Setor</InputLabel>
                <Select value={formEvento.setor} onChange={(e) => setFormEvento({ ...formEvento, setor: e.target.value })} label="Setor">
                  {SETORES.map((s) => (
                    <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField fullWidth label="Nome do responsável" value={formEvento.responsavel} onChange={(e) => setFormEvento({ ...formEvento, responsavel: e.target.value })} className={classes.formField} />
              <FormControl fullWidth className={classes.formField}>
                <InputLabel>Tipo de agendamento</InputLabel>
                <Select value={formEvento.tipo} onChange={(e) => setFormEvento({ ...formEvento, tipo: e.target.value })} label="Tipo">
                  {TIPOS_AGENDAMENTO.map((t) => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField fullWidth type="date" label="Data" value={formEvento.data} onChange={(e) => setFormEvento({ ...formEvento, data: e.target.value })} InputLabelProps={{ shrink: true }} className={classes.formField} />
              <TextField fullWidth type="time" label="Hora" value={formEvento.hora} onChange={(e) => setFormEvento({ ...formEvento, hora: e.target.value })} InputLabelProps={{ shrink: true }} className={classes.formField} />
              <TextField fullWidth label="Localização (opcional)" value={formEvento.localizacao} onChange={(e) => setFormEvento({ ...formEvento, localizacao: e.target.value })} className={classes.formField} />
              <TextField fullWidth multiline rows={2} label="Descrição (opcional)" value={formEvento.descricao} onChange={(e) => setFormEvento({ ...formEvento, descricao: e.target.value })} className={classes.formField} />
              <Button variant="contained" color="primary" fullWidth startIcon={<Add />} onClick={handleCriarEvento} disabled={!formEvento.data || !formEvento.hora}>
                Criar evento
              </Button>
              <Divider style={{ margin: "24px 0 16px" }} />
              <Typography variant="subtitle2" style={{ marginBottom: 8 }}>Eventos por setor</Typography>
              {SETORES.map((setor) => {
                const list = eventosPorSetor(setor.id);
                return (
                  <Box key={setor.id} style={{ marginBottom: 16 }}>
                    <Typography variant="caption" color="textSecondary" style={{ fontWeight: 600 }}>{setor.name}</Typography>
                    {list.length === 0 ? (
                      <Typography variant="body2" color="textSecondary" className={classes.listEmpty}>Nenhum evento</Typography>
                    ) : (
                      <List dense>
                        {list.map((ev) => (
                          <ListItem key={ev.id}>
                            <ListItemText primary={`${ev.data} ${ev.hora} - ${ev.tipo}`} secondary={ev.responsavel ? `Responsável: ${ev.responsavel}` : ev.descricao} />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </Box>
                );
              })}
            </div>
          )}

          {activeTab === 1 && (
            <div className={classes.tabPanel}>
              {!showFormAnotacao ? (
                <Button variant="outlined" fullWidth startIcon={<Add />} onClick={() => setShowFormAnotacao(true)} style={{ marginBottom: 16 }}>
                  Criar nova anotação
                </Button>
              ) : (
                <Paper variant="outlined" style={{ padding: 16, marginBottom: 16 }}>
                  <Typography variant="subtitle2" style={{ marginBottom: 8 }}>Nova anotação</Typography>
                  <TextField fullWidth multiline rows={3} label="Texto livre" value={formAnotacao.texto} onChange={(e) => setFormAnotacao({ ...formAnotacao, texto: e.target.value })} className={classes.formField} />
                  <input type="file" id="anotacao-file" style={{ display: "none" }} onChange={(e) => setFormAnotacao({ ...formAnotacao, arquivo: e.target.files?.[0] || null })} />
                  <label htmlFor="anotacao-file">
                    <Button component="span" size="small" startIcon={<AttachFile />} style={{ marginRight: 8 }}>Upload arquivo</Button>
                  </label>
                  {formAnotacao.arquivo && <Typography variant="caption" color="textSecondary">{formAnotacao.arquivo.name}</Typography>}
                  <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      onClick={handleSalvarAnotacao}
                      disabled={
                        savingAnotacao ||
                        (!(formAnotacao.texto || "").trim() && !formAnotacao.arquivo)
                      }
                    >
                      {savingAnotacao ? <CircularProgress size={18} color="inherit" /> : "Salvar"}
                    </Button>
                    <Button
                      size="small"
                      disabled={savingAnotacao}
                      onClick={() => {
                        setShowFormAnotacao(false);
                        setFormAnotacao({ texto: "", arquivo: null });
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </Paper>
              )}
              <Typography variant="subtitle2" style={{ marginBottom: 8 }}>Listagem de anotações</Typography>
              {loadingAnotacoes ? (
                <Box display="flex" justifyContent="center" py={2}>
                  <CircularProgress size={28} />
                </Box>
              ) : anotacoes.length === 0 ? (
                <Typography variant="body2" className={classes.listEmpty}>
                  Nenhuma anotação encontrada. Use &quot;Criar nova anotação&quot; acima para adicionar.
                </Typography>
              ) : (
                <List dense>
                  {anotacoes.map((an) => (
                    <ListItem key={an.id} alignItems="flex-start">
                      {editAnotacao?.id === an.id ? (
                        <Box width="100%" py={1}>
                          <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Texto"
                            value={editAnotacao.texto}
                            onChange={(e) =>
                              setEditAnotacao((prev) => ({ ...prev, texto: e.target.value }))
                            }
                            className={classes.formField}
                            variant="outlined"
                            margin="dense"
                          />
                          <FormControl fullWidth variant="outlined" margin="dense" size="small">
                            <InputLabel>Status</InputLabel>
                            <Select
                              label="Status"
                              value={editAnotacao.status || "aberta"}
                              onChange={(e) =>
                                setEditAnotacao((prev) => ({ ...prev, status: e.target.value }))
                              }
                            >
                              {STATUS_ANOTACAO.map((s) => (
                                <MenuItem key={s} value={s}>
                                  {s}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <Box display="flex" gap={8} mt={1}>
                            <Button
                              size="small"
                              color="primary"
                              variant="contained"
                              onClick={handleSalvarEdicaoAnotacao}
                              disabled={savingAnotacao}
                            >
                              {savingAnotacao ? <CircularProgress size={18} color="inherit" /> : "Guardar"}
                            </Button>
                            <Button
                              size="small"
                              disabled={savingAnotacao}
                              onClick={() => setEditAnotacao(null)}
                            >
                              Cancelar
                            </Button>
                          </Box>
                        </Box>
                      ) : (
                        <>
                          <ListItemText
                            primary={new Date(an.createdAt).toLocaleString("pt-BR")}
                            secondary={
                              <span>
                                <Typography component="span" variant="body2" display="block">
                                  {an.texto || "(sem texto)"}
                                </Typography>
                                <Typography variant="caption" color="textSecondary" display="block">
                                  Status: {an.status || "—"}
                                </Typography>
                                {an.arquivoUrl ? (
                                  <Link
                                    href={an.arquivoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    variant="caption"
                                  >
                                    {an.arquivoNome || "Ver anexo"}
                                  </Link>
                                ) : null}
                              </span>
                            }
                          />
                          <ListItemSecondaryAction style={{ display: "flex", alignItems: "center", gap: 0 }}>
                            <Tooltip title="Editar">
                              <IconButton
                                edge="end"
                                size="small"
                                aria-label="editar anotação"
                                disabled={savingAnotacao || loadingAnotacoes}
                                onClick={() =>
                                  setEditAnotacao({
                                    id: an.id,
                                    texto: an.texto || "",
                                    status: an.status || "aberta",
                                  })
                                }
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Excluir">
                              <IconButton
                                edge="end"
                                size="small"
                                aria-label="excluir anotação"
                                disabled={savingAnotacao || loadingAnotacoes}
                                onClick={() => handleExcluirAnotacao(an.id)}
                              >
                                <DeleteOutline fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </ListItemSecondaryAction>
                        </>
                      )}
                    </ListItem>
                  ))}
                </List>
              )}
            </div>
          )}

          {activeTab === 2 && (
            <div className={classes.tabPanel}>
              <Typography variant="subtitle2" color="textSecondary" style={{ marginBottom: 12 }}>
                Criar lembrete vinculado a um evento
              </Typography>
              <TextField fullWidth label="Nome do lembrete" value={formLembrete.nome} onChange={(e) => setFormLembrete({ ...formLembrete, nome: e.target.value })} className={classes.formField} />
              <TextField fullWidth multiline rows={2} label="Descrição" value={formLembrete.descricao} onChange={(e) => setFormLembrete({ ...formLembrete, descricao: e.target.value })} className={classes.formField} />
              <TextField fullWidth type="date" label="Data" value={formLembrete.data} onChange={(e) => setFormLembrete({ ...formLembrete, data: e.target.value })} InputLabelProps={{ shrink: true }} className={classes.formField} />
              <TextField fullWidth type="time" label="Hora" value={formLembrete.hora} onChange={(e) => setFormLembrete({ ...formLembrete, hora: e.target.value })} InputLabelProps={{ shrink: true }} className={classes.formField} />
              <FormControlLabel control={<Checkbox checked={formLembrete.addGoogle} onChange={(e) => setFormLembrete({ ...formLembrete, addGoogle: e.target.checked })} />} label="Adicionar ao calendário do Google" />
              <Button variant="contained" color="primary" fullWidth startIcon={<Add />} onClick={handleCriarLembrete} disabled={!formLembrete.nome.trim() || !formLembrete.data || !formLembrete.hora} style={{ marginTop: 8 }}>
                Criar evento
              </Button>
              <Divider style={{ margin: "24px 0 16px" }} />
              <Typography variant="subtitle2" style={{ marginBottom: 8 }}>Lembretes</Typography>
              {lembretes.length === 0 ? (
                <Typography variant="body2" className={classes.listEmpty}>Nenhum lembrete encontrado</Typography>
              ) : (
                <List dense>
                  {lembretes.map((lm) => (
                    <ListItem key={lm.id}>
                      <ListItemText primary={lm.nome} secondary={`${lm.data} ${lm.hora}${lm.addGoogle ? " • Google Calendar" : ""}`} />
                    </ListItem>
                  ))}
                </List>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
