import React, { useEffect, useMemo, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  makeStyles,
  Paper,
  Tooltip,
  Typography,
} from "@material-ui/core";
import NotificationsNoneIcon from "@material-ui/icons/NotificationsNone";
import HistoryIcon from "@material-ui/icons/History";
import ChatIcon from "@material-ui/icons/Chat";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const STORAGE_KEY = "azchat_notifications_center";
const READ_STORAGE_KEY = "azchat_notifications_read_ids";

const TYPE_TABS = [
  { value: "all", label: "Todos" },
  { value: "lembrete", label: "Lembretes" },
  { value: "kanban_move", label: "Kanban" },
];

const READ_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "unread", label: "Não visualizadas" },
  { value: "read", label: "Visualizadas" },
];

const useStyles = makeStyles((theme) => ({
  root: {
    flex: 1,
    height: "calc(100vh - 48px)",
    maxHeight: "calc(100vh - 48px)",
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    background: theme.palette.background.default,
  },
  header: {
    flexShrink: 0,
    padding: theme.spacing(2),
    borderBottom: `1px solid ${theme.palette.divider}`,
    background: theme.palette.background.paper,
  },
  content: {
    flex: 1,
    minHeight: 0,
    boxSizing: "border-box",
    overflow: "hidden",
    display: "grid",
    gridTemplateColumns: "minmax(360px, 430px) minmax(0, 1fr)",
    gap: theme.spacing(2),
    padding: theme.spacing(2),
    [theme.breakpoints.down("sm")]: {
      gridTemplateColumns: "1fr",
      gridTemplateRows: "minmax(220px, 38%) minmax(0, 1fr)",
    },
  },
  panel: {
    minHeight: 0,
    maxHeight: "100%",
    overflow: "hidden",
    borderRadius: 8,
    border: `1px solid ${theme.palette.divider}`,
  },
  listPanel: {
    display: "flex",
    flexDirection: "column",
  },
  filterBox: {
    flexShrink: 0,
    padding: theme.spacing(1.5),
  },
  chipRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(0.75),
  },
  readFilters: {
    marginTop: theme.spacing(1),
    paddingTop: theme.spacing(1),
    borderTop: `1px solid ${theme.palette.divider}`,
  },
  list: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    ...theme.scrollbarStyles,
  },
  listItem: {
    minHeight: 66,
    alignItems: "flex-start",
    padding: theme.spacing(1.25, 1.5),
    borderLeft: "4px solid transparent",
    transition: "background-color 120ms ease, border-color 120ms ease",
    "&:hover": {
      background: theme.palette.action.hover,
    },
  },
  listItemActive: {
    borderLeftColor: theme.palette.primary.main,
    background:
      theme.palette.type === "dark"
        ? "rgba(255,255,255,0.08)"
        : "rgba(0, 150, 136, 0.08)",
  },
  detail: {
    minHeight: 0,
    boxSizing: "border-box",
    padding: 0,
    overflowY: "auto",
    ...theme.scrollbarStyles,
  },
  empty: {
    height: "100%",
    minHeight: 240,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    color: theme.palette.text.secondary,
    padding: theme.spacing(3),
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    minWidth: 0,
  },
  detailHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing(2),
    padding: theme.spacing(2.25, 2.5, 1.5),
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  detailContent: {
    maxWidth: 1040,
  },
  metaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(0.75),
    padding: theme.spacing(1.5, 2.5, 0),
  },
  detailSection: {
    padding: theme.spacing(2, 2.5),
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  detailSectionTitle: {
    marginBottom: theme.spacing(1),
    color: theme.palette.text.secondary,
    fontWeight: 600,
    textTransform: "uppercase",
    fontSize: 11,
  },
  detailsList: {
    display: "grid",
    gridTemplateColumns: "140px minmax(0, 1fr)",
    rowGap: theme.spacing(0.75),
    columnGap: theme.spacing(2),
    [theme.breakpoints.down("sm")]: {
      gridTemplateColumns: "1fr",
      rowGap: theme.spacing(0.25),
    },
  },
  detailLabel: {
    color: theme.palette.text.secondary,
  },
  detailValue: {
    fontWeight: 600,
    minWidth: 0,
  },
  bodyBox: {
    whiteSpace: "pre-wrap",
    borderLeft: `3px solid ${theme.palette.primary.main}`,
    padding: theme.spacing(1.25, 1.5),
    lineHeight: 1.55,
    background:
      theme.palette.type === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0, 150, 136, 0.06)",
  },
  actionRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(1),
    padding: theme.spacing(2, 2.5),
    "& .MuiButton-root": {
      textTransform: "none",
    },
  },
  unreadDot: {
    width: 8,
    height: 8,
    flexShrink: 0,
    borderRadius: "50%",
    background: theme.palette.primary.main,
    marginTop: 9,
    marginRight: theme.spacing(1.25),
  },
  listTitle: {
    fontWeight: 500,
  },
  listSecondary: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(0.5),
    color: theme.palette.text.secondary,
  },
  iconButtonDanger: {
    color: theme.palette.error.main,
  },
}));

function readNotifications() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (_) {
    return [];
  }
}

function writeNotifications(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (_) {
    /* ignore */
  }
}

function readReadIds() {
  try {
    const raw = localStorage.getItem(READ_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.map(String) : [];
  } catch (_) {
    return [];
  }
}

function writeReadIds(list) {
  try {
    localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(list));
  } catch (_) {
    /* ignore */
  }
}

function mergeNotifications(serverItems, localItems) {
  const byId = new Map();
  [...serverItems, ...localItems].forEach((item) => {
    if (!item?.id) return;
    byId.set(String(item.id), item);
  });
  return Array.from(byId.values()).sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });
}

function getDeleteEndpoint(item) {
  if (item?.kind === "lembrete" && item.disparoId) {
    return `/notifications/lembretes/${item.disparoId}`;
  }
  if (item?.kind === "kanban_move" && item.logId) {
    return `/notifications/kanban/${item.logId}`;
  }
  return null;
}

const NotificationsCenter = () => {
  const classes = useStyles();
  const history = useHistory();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const selectedIdFromUrl = query.get("id");

  const [items, setItems] = useState(() => readNotifications());
  const [selectedId, setSelectedId] = useState(selectedIdFromUrl);
  const [readIds, setReadIds] = useState(() => readReadIds());
  const [activeType, setActiveType] = useState("all");
  const [readFilter, setReadFilter] = useState("all");

  useEffect(() => {
    let mounted = true;

    const fetchHistory = async () => {
      try {
        const [lembretesRes, kanbanRes] = await Promise.all([
          api.get("/notifications/lembretes", { params: { limit: 120 } }),
          api.get("/notifications/kanban", { params: { limit: 120 } }),
        ]);
        if (!mounted) return;
        const serverNotifications = [
          ...(lembretesRes.data?.notifications || []),
          ...(kanbanRes.data?.notifications || []),
        ];
        setItems((current) =>
          mergeNotifications(mergeNotifications(current, readNotifications()), serverNotifications)
        );
      } catch (err) {
        toastError(err);
      }
    };

    fetchHistory();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const refresh = () => {
      setItems((current) => mergeNotifications(current, readNotifications()));
    };
    refresh();
    window.addEventListener("azchat-notifications-updated", refresh);
    return () => window.removeEventListener("azchat-notifications-updated", refresh);
  }, []);

  useEffect(() => {
    if (selectedIdFromUrl) setSelectedId(selectedIdFromUrl);
  }, [selectedIdFromUrl]);

  const readSet = useMemo(() => new Set(readIds.map(String)), [readIds]);

  const counts = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.all += 1;
        if (item.kind === "lembrete") acc.lembrete += 1;
        if (item.kind === "kanban_move") acc.kanban_move += 1;
        if (readSet.has(String(item.id))) acc.read += 1;
        else acc.unread += 1;
        return acc;
      },
      { all: 0, lembrete: 0, kanban_move: 0, read: 0, unread: 0 }
    );
  }, [items, readSet]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesType = activeType === "all" || item.kind === activeType;
      const isRead = readSet.has(String(item.id));
      const matchesRead =
        readFilter === "all" || (readFilter === "read" ? isRead : !isRead);
      return matchesType && matchesRead;
    });
  }, [items, activeType, readFilter, readSet]);

  const selected = useMemo(() => {
    if (!filteredItems.length) return null;
    return (
      filteredItems.find((item) => String(item.id) === String(selectedId)) ||
      filteredItems[0]
    );
  }, [filteredItems, selectedId]);

  const setReadState = (ids) => {
    const next = Array.from(new Set(ids.map(String)));
    setReadIds(next);
    writeReadIds(next);
    window.dispatchEvent(new Event("azchat-notifications-updated"));
  };

  const selectedIsRead = selected ? readSet.has(String(selected.id)) : false;

  const toggleSelectedRead = () => {
    if (!selected) return;
    if (selectedIsRead) {
      setReadState(readIds.filter((id) => String(id) !== String(selected.id)));
    } else {
      setReadState([...readIds, selected.id]);
    }
  };

  const markAllRead = () => {
    setReadState([...readIds, ...items.map((item) => item.id)]);
  };

  const removeItemLocally = (itemId) => {
    setItems((current) => {
      const next = current.filter((item) => String(item.id) !== String(itemId));
      writeNotifications(readNotifications().filter((item) => String(item.id) !== String(itemId)));
      return next;
    });
    setReadState(readIds.filter((id) => String(id) !== String(itemId)));
    setSelectedId(null);
  };

  const deleteSelected = async () => {
    if (!selected) return;
    const endpoint = getDeleteEndpoint(selected);
    const confirmed = window.confirm("Apagar esta notificação do histórico?");
    if (!confirmed) return;

    try {
      if (endpoint) {
        await api.delete(endpoint);
      }
      removeItemLocally(selected.id);
    } catch (err) {
      toastError(err);
    }
  };

  const openTicket = () => {
    if (!selected?.ticketId) return;
    history.push(`/tickets/${selected.ticketUuid || selected.ticketId}`);
  };

  return (
    <Box className={classes.root}>
      <Box className={classes.header}>
        <Box display="flex" alignItems="center" justifyContent="space-between" style={{ gap: 12 }}>
          <Box className={classes.titleRow}>
            <NotificationsNoneIcon color="primary" />
            <Box minWidth={0}>
              <Typography variant="h6">Notificações</Typography>
              <Typography variant="body2" color="textSecondary">
                Lembretes, movimentos do Kanban e avisos do sistema ficam reunidos aqui.
              </Typography>
            </Box>
          </Box>
          <Button size="small" variant="outlined" onClick={markAllRead} disabled={items.length === 0}>
            Marcar todas como visualizadas
          </Button>
        </Box>
      </Box>

      <Box className={classes.content}>
        <Paper elevation={0} className={`${classes.panel} ${classes.listPanel}`}>
          <Box className={classes.filterBox}>
            <Box className={classes.chipRow}>
              {TYPE_TABS.map((tab) => (
                <Chip
                  key={tab.value}
                  clickable
                  color={activeType === tab.value ? "primary" : "default"}
                  variant={activeType === tab.value ? "default" : "outlined"}
                  label={`${tab.label} (${counts[tab.value] || 0})`}
                  onClick={() => {
                    setActiveType(tab.value);
                    setSelectedId(null);
                  }}
                />
              ))}
            </Box>
            <Box className={`${classes.chipRow} ${classes.readFilters}`}>
              {READ_FILTERS.map((filter) => (
                <Chip
                  key={filter.value}
                  clickable
                  size="small"
                  color={readFilter === filter.value ? "primary" : "default"}
                  variant={readFilter === filter.value ? "default" : "outlined"}
                  label={`${filter.label}${
                    filter.value === "unread"
                      ? ` (${counts.unread})`
                      : filter.value === "read"
                        ? ` (${counts.read})`
                        : ""
                  }`}
                  onClick={() => {
                    setReadFilter(filter.value);
                    setSelectedId(null);
                  }}
                />
              ))}
            </Box>
          </Box>
          <Divider />
          {filteredItems.length === 0 ? (
            <Box className={classes.empty}>
              <Typography variant="body2">Nenhuma notificação neste filtro.</Typography>
            </Box>
          ) : (
            <List dense disablePadding className={classes.list}>
              {filteredItems.map((item) => (
                <React.Fragment key={item.id}>
                  <ListItem
                    button
                    className={`${classes.listItem} ${
                      String(selected?.id) === String(item.id) ? classes.listItemActive : ""
                    }`}
                    onClick={() => setSelectedId(item.id)}
                  >
                    {!readSet.has(String(item.id)) ? <span className={classes.unreadDot} /> : null}
                    <ListItemText
                      primary={
                        <Typography className={classes.listTitle} noWrap>
                          {item.title || "Notificação"}
                        </Typography>
                      }
                      secondary={
                        <span className={classes.listSecondary}>
                          <span>{item.kindLabel || item.kind || "Aviso"}</span>
                          <span>·</span>
                          <span>
                            {item.createdAt ? new Date(item.createdAt).toLocaleString("pt-BR") : ""}
                          </span>
                        </span>
                      }
                    />
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          )}
        </Paper>

        <Paper elevation={0} className={`${classes.panel} ${classes.detail}`}>
          {!selected ? (
            <Box className={classes.empty}>
              <Typography variant="body2">Selecione uma notificação para ver os detalhes.</Typography>
            </Box>
          ) : (
            <Box className={classes.detailContent}>
              <Box className={classes.detailHeader}>
                <Box className={classes.titleRow}>
                  <HistoryIcon color="primary" />
                  <Box minWidth={0}>
                    <Typography variant="h6">{selected.title || "Notificação"}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {selected.createdAt ? new Date(selected.createdAt).toLocaleString("pt-BR") : "Sem data"}
                    </Typography>
                  </Box>
                </Box>
                <Tooltip title="Apagar notificação">
                  <IconButton
                    size="small"
                    className={classes.iconButtonDanger}
                    onClick={deleteSelected}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Box className={classes.metaRow}>
                <Chip size="small" color="primary" label={selected.kindLabel || selected.kind || "Aviso"} />
                <Chip
                  size="small"
                  variant={selectedIsRead ? "default" : "outlined"}
                  label={selectedIsRead ? "Visualizada" : "Não visualizada"}
                />
                {selected.lembreteId ? <Chip size="small" label={`Lembrete #${selected.lembreteId}`} /> : null}
                {selected.ticketId ? <Chip size="small" label={`Ticket #${selected.ticketId}`} /> : null}
                {selected.destinoTipo ? <Chip size="small" label={`Destino: ${selected.destinoTipo}`} /> : null}
                {selected.whatsappEnviado ? <Chip size="small" label="WhatsApp enviado" variant="outlined" /> : null}
              </Box>
              {selected.clientName || selected.boardName || selected.cardName || selected.fromLabel || selected.toLabel || selected.userName ? (
                <Box className={classes.detailSection}>
                  <Typography className={classes.detailSectionTitle}>Contexto</Typography>
                  <Box className={classes.detailsList}>
                    {selected.clientName ? (
                      <>
                        <Typography variant="body2" className={classes.detailLabel}>Cliente</Typography>
                        <Typography variant="body2" className={classes.detailValue} noWrap>{selected.clientName}</Typography>
                      </>
                    ) : null}
                    {selected.boardName ? (
                      <>
                        <Typography variant="body2" className={classes.detailLabel}>Quadro</Typography>
                        <Typography variant="body2" className={classes.detailValue} noWrap>{selected.boardName}</Typography>
                      </>
                    ) : null}
                    {selected.cardName ? (
                      <>
                        <Typography variant="body2" className={classes.detailLabel}>Card</Typography>
                        <Typography variant="body2" className={classes.detailValue} noWrap>{selected.cardName}</Typography>
                      </>
                    ) : null}
                    {selected.fromLabel || selected.toLabel ? (
                      <>
                        <Typography variant="body2" className={classes.detailLabel}>Movimento</Typography>
                        <Typography variant="body2" className={classes.detailValue} noWrap>
                          {selected.fromLabel || "Sem etapa"} -> {selected.toLabel || "Sem etapa"}
                        </Typography>
                      </>
                    ) : null}
                    {selected.userName ? (
                      <>
                        <Typography variant="body2" className={classes.detailLabel}>Responsável</Typography>
                        <Typography variant="body2" className={classes.detailValue} noWrap>{selected.userName}</Typography>
                      </>
                    ) : null}
                  </Box>
                </Box>
              ) : null}
              <Box className={classes.detailSection}>
                <Typography className={classes.detailSectionTitle}>Mensagem</Typography>
                <Box className={classes.bodyBox}>
                  <Typography variant="body2">{selected.body || "Sem mensagem."}</Typography>
                  {selected.whatsappErro ? (
                    <Typography variant="caption" color="error" display="block" style={{ marginTop: 8 }}>
                      WhatsApp: {selected.whatsappErro}
                    </Typography>
                  ) : null}
                </Box>
              </Box>
              <Box className={classes.actionRow}>
                <Button variant="outlined" onClick={toggleSelectedRead}>
                  {selectedIsRead ? "Marcar como não visualizada" : "Marcar como visualizada"}
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<ChatIcon />}
                  disabled={!selected.ticketId}
                  onClick={openTicket}
                >
                  Abrir atendimento
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default NotificationsCenter;
