import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import ErrorBoundary from "./components/ErrorBoundary";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

// Registra o service worker mínimo que habilita "Instalar aplicativo" no
// Android/Chrome (exigência da plataforma, sem cache de dados).
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Instalação como PWA fica indisponível, mas o app funciona normal.
    });
  });
}
