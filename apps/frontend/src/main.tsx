import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";
import { initInstallPrompt } from "./pwa/install/installPrompt.service";
import { registerServiceWorker } from "./pwa/service-worker/registerServiceWorker";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});

initInstallPrompt();
registerServiceWorker();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/kittywallet">
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
