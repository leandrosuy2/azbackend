import React, { useState, useEffect } from "react";
import { useParams, useHistory } from "react-router-dom";
import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import CircularProgress from "@material-ui/core/CircularProgress";
import Button from "@material-ui/core/Button";
import ArrowBackIcon from "@material-ui/icons/ArrowBack";
import MenuBookIcon from "@material-ui/icons/MenuBook";
import Markdown from "markdown-to-jsx";
import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";

const TUTORIAIS = [
  {
    slug: "flowbuilder",
    title: "FlowBuilder — Passo a passo",
    description: "Como configurar os fluxos de conversa do início ao fim.",
    file: "PASSO-A-PASSO-FLOWBUILDER.md",
    icon: "🔄",
  },
  {
    slug: "filas",
    title: "Filas — Todos os campos",
    description: "Descrição de cada campo da tela de Filas (nome, cor, opções, horários, etc.).",
    file: "PASSO-A-PASSO-FILAS.md",
    icon: "📋",
  },
];

const useStyles = makeStyles((theme) => ({
  root: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    padding: theme.spacing(2),
    ...theme.scrollbarStyles,
  },
  listPaper: {
    padding: theme.spacing(3),
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: theme.spacing(2),
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    ...theme.scrollbarStyles,
  },
  card: {
    padding: theme.spacing(2.5),
    cursor: "pointer",
    transition: "all 0.2s ease",
    border: "1px solid",
    borderColor: "rgba(0,0,0,0.08)",
    "&:hover": {
      boxShadow: theme.shadows[4],
      borderColor: theme.palette.primary.main,
    },
  },
  cardIcon: {
    fontSize: "2rem",
    marginBottom: theme.spacing(1),
  },
  cardTitle: {
    fontWeight: 600,
    marginBottom: theme.spacing(0.5),
  },
  cardDescription: {
    color: theme.palette.text.secondary,
    fontSize: "0.9rem",
  },
  docWrapper: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    ...theme.scrollbarStyles,
  },
  docPaper: {
    padding: theme.spacing(3, 4),
    maxWidth: 800,
    margin: "0 auto",
    marginBottom: theme.spacing(4),
    "& h1": {
      marginTop: 0,
      paddingBottom: theme.spacing(1),
      borderBottom: "2px solid",
      borderColor: theme.palette.primary.main,
    },
    "& h2": {
      marginTop: theme.spacing(2.5),
      marginBottom: theme.spacing(1),
    },
    "& h3": {
      marginTop: theme.spacing(2),
      marginBottom: theme.spacing(0.5),
    },
    "& p": {
      lineHeight: 1.7,
      marginBottom: theme.spacing(1.5),
    },
    "& ul, & ol": {
      paddingLeft: theme.spacing(2.5),
      marginBottom: theme.spacing(1.5),
    },
    "& li": {
      marginBottom: theme.spacing(0.5),
    },
    "& table": {
      width: "100%",
      borderCollapse: "collapse",
      marginBottom: theme.spacing(2),
    },
    "& th, & td": {
      border: "1px solid",
      borderColor: "rgba(0,0,0,0.12)",
      padding: theme.spacing(1, 1.5),
      textAlign: "left",
    },
    "& th": {
      backgroundColor: "rgba(0,0,0,0.04)",
      fontWeight: 600,
    },
    "& hr": {
      border: "none",
      borderTop: "1px solid",
      borderColor: "rgba(0,0,0,0.08)",
      margin: theme.spacing(2, 0),
    },
  },
  backButton: {
    marginBottom: theme.spacing(2),
  },
  loadingBox: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: 200,
  },
  errorBox: {
    padding: theme.spacing(2),
    textAlign: "center",
    color: theme.palette.error.main,
  },
}));

const Tutoriais = () => {
  const classes = useStyles();
  const { slug } = useParams();
  const history = useHistory();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(!!slug);
  const [error, setError] = useState(null);

  const tutorial = TUTORIAIS.find((t) => t.slug === slug);

  useEffect(() => {
    if (!slug) {
      setContent("");
      setLoading(false);
      setError(null);
      return;
    }

    const t = TUTORIAIS.find((x) => x.slug === slug);
    if (!t) {
      setError("Tutorial não encontrado.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const base = process.env.PUBLIC_URL || "";
    const url = `${base}/docs/${t.file}`;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Arquivo não encontrado.");
        return res.text();
      })
      .then((text) => {
        setContent(text);
        setError(null);
      })
      .catch(() => {
        setError("Não foi possível carregar o tutorial. Verifique se o arquivo existe em public/docs.");
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const handleOpenTutorial = (s) => {
    history.push(`/tutoriais/${s}`);
  };

  if (!slug) {
    return (
      <MainContainer className={classes.root}>
        <MainHeader>
          <Title>
            <MenuBookIcon style={{ verticalAlign: "middle", marginRight: 8 }} />
            Tutoriais
          </Title>
        </MainHeader>
        <Paper className={classes.listPaper} elevation={1}>
          {TUTORIAIS.map((t) => (
            <Paper
              key={t.slug}
              className={classes.card}
              elevation={0}
              onClick={() => handleOpenTutorial(t.slug)}
            >
              <div className={classes.cardIcon}>{t.icon}</div>
              <Typography className={classes.cardTitle} variant="h6">
                {t.title}
              </Typography>
              <Typography className={classes.cardDescription} variant="body2">
                {t.description}
              </Typography>
            </Paper>
          ))}
        </Paper>
      </MainContainer>
    );
  }

  return (
    <MainContainer className={classes.root}>
      <MainHeader>
        <Title>{tutorial ? tutorial.title : "Tutorial"}</Title>
      </MainHeader>
      <Button
        className={classes.backButton}
        startIcon={<ArrowBackIcon />}
        onClick={() => history.push("/tutoriais")}
      >
        Voltar aos tutoriais
      </Button>

      {loading && (
        <div className={classes.loadingBox}>
          <CircularProgress />
        </div>
      )}

      {error && (
        <Paper className={classes.errorBox} elevation={1}>
          {error}
        </Paper>
      )}

      {!loading && !error && content && (
        <div className={classes.docWrapper}>
          <Paper className={classes.docPaper} elevation={1}>
            <Markdown>{content}</Markdown>
          </Paper>
        </div>
      )}
    </MainContainer>
  );
};

export default Tutoriais;
