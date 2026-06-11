import type { VitePWAOptions } from "vite-plugin-pwa";
import { runtimeCaching } from "./runtimeCaching";

export const workboxConfig: VitePWAOptions["workbox"] = {
  globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
  cleanupOutdatedCaches: true,
  clientsClaim: true,
  skipWaiting: false,
  runtimeCaching,
};
