import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Activity, RefreshCw } from "lucide-react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { z } from "zod";
import { createApiClient } from "@kittywallet/shared-api";
import type { HealthStatus } from "@kittywallet/shared-types";
import "./styles.css";

const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const apiClient = createApiClient({ baseUrl: apiBaseUrl });
const queryClient = new QueryClient();
const healthSchema = z.object({
  status: z.enum(["ok", "error"]),
  timestamp: z.string()
});
const _healthContract: HealthStatus = {
  status: "ok",
  timestamp: new Date(0).toISOString()
};

function App(): JSX.Element {
  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: async () => healthSchema.parse(await apiClient.health.getHealth())
  });

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-950">
      <section
        className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-4xl content-center gap-8"
        aria-labelledby="app-title"
      >
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-normal text-emerald-700">
            KITTYWALLET
          </p>
          <h1 id="app-title" className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">
            Offline-first wallet foundation
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
            Initial PWA, API, shared package, and Docker development environment are wired together
            for the next product features.
          </p>
        </div>

        <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-md bg-emerald-100 text-emerald-800">
                <Activity size={20} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-500">API health</p>
                <p className="text-lg font-bold">
                  {healthQuery.isLoading
                    ? "Checking"
                    : healthQuery.isError
                      ? "Unavailable"
                      : (healthQuery.data?.status.toUpperCase() ?? "Unknown")}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="grid size-10 place-items-center rounded-md border border-slate-200 text-slate-700 transition hover:bg-slate-100"
              onClick={() => void healthQuery.refetch()}
              aria-label="Refresh API health"
            >
              <RefreshCw size={18} aria-hidden="true" />
            </button>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            {healthQuery.data?.timestamp ?? "Waiting for backend response"}
          </p>
        </div>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<App />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
