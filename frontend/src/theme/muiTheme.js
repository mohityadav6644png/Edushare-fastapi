import { createTheme } from "@mui/material/styles";

const lightPalette = {
  mode: "light",
  primary: {
    main: "#3f51b5",
  },
  secondary: {
    main: "#ff9800",
  },
  background: {
    default: "#f9fafb",
    paper: "#ffffff",
  },
  text: {
    primary: "#1e293b",
    secondary: "#475569",
  },
};

const darkPalette = {
  mode: "dark",
  primary: {
    main: "#90caf9",
  },
  secondary: {
    main: "#fbc02d",
  },
  background: {
    default: "#121212",
    paper: "#1e1e1e",
  },
  text: {
    primary: "#f1f5f9",
    secondary: "#cbd5e1",
  },
};

const typography = {
  fontFamily: "'Inter', 'Poppins', 'Roboto', sans-serif",
  h1: { fontSize: "2rem", fontWeight: 600 },
  h2: { fontSize: "1.75rem", fontWeight: 600 },
  h3: { fontSize: "1.5rem", fontWeight: 600 },
  h4: { fontSize: "1.25rem", fontWeight: 500 },
  h5: { fontSize: "1rem", fontWeight: 500 },
  body1: { fontSize: "1rem", lineHeight: 1.6 },
  body2: { fontSize: "0.9rem", lineHeight: 1.5 },
};

const components = {
  MuiPaper: {
    styleOverrides: {
      root: {
        borderRadius: 16,
        boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 12,
        textTransform: "none",
        fontWeight: 500,
        padding: "8px 16px",
      },
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: {
        borderRadius: 0,
        boxShadow: "none",
      },
    },
  },
};

export const getTheme = (mode) =>
  createTheme({
    palette: mode === "light" ? lightPalette : darkPalette,
    typography,
    components,
    shape: { borderRadius: 12 },
  });
