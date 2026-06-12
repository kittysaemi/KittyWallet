import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { workboxConfig } from "./src/pwa/workbox/workbox.config";
import pkg from "../../package.json";

export default defineConfig({
  base: "/kittywallet/",
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/*.png"],
      manifest: {
        name: "KittyWallet",
        short_name: "KittyWall",
        description: "계좌, 카드, 거래 내역을 관리하는 모바일 가계부 서비스",
        lang: "ko-KR",
        start_url: "/kittywallet/",
        scope: "/kittywallet/",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#fda5e3",
        background_color: "#fce2f4",
        icons: [
          {
            src: "/kittywallet/icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/kittywallet/icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "/kittywallet/icons/icon-512x512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      },
      workbox: workboxConfig,
      devOptions: {
        enabled: true,
        type: "module",
        suppressWarnings: true
      }
    })
  ],
  server: {
    port: 5173,
    proxy: {
      "/kittywallet/api": {
        target: "http://localhost:3700",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/kittywallet\/api/, "/api")
      }
    }
  },
  preview: {
    port: 4173
  }
});
