// src/theme.js
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    background: {
      default: "#ECEFF1", // A light gray-blue background for the entire page
    },
    primary: {
      main: "#1976d2",    // Default MUI blue
    },
    secondary: {
      main: "#D81B60",    // A pinkish accent
    },
  },
  shape: {
    borderRadius: 12, // Global corner rounding for components
  },
});

export default theme;
