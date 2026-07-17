import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/familjen-grotesk";
import "@fontsource-variable/ibm-plex-sans";
import "./styles.css";
import { applyTheme, resolveTheme } from "./lib/theme.js";
import App from "./App.jsx";

applyTheme(resolveTheme());

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
