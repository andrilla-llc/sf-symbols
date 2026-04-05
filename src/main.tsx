import { createRoot } from "react-dom/client";
import "./globals.css";
import App from "./App.tsx";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Missing #root element in index.html");
}

createRoot(rootElement).render(<App />);
