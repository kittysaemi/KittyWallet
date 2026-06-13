import { defineConfig } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { workboxConfig } from "./src/pwa/workbox/workbox.config";

// VitePWA가 정적 manifest link를 주입하는데, Chrome은 이 태그를 파싱하자마자
// fetch를 시작한다. JS로 href를 바꿔도 항상 너무 늦으므로 빌드/서빙 시점에 교체해야 한다.
// enforce: 'post'로 VitePWA보다 늦게 실행 → 모든 manifest link를 제거하고 동적 endpoint 하나만 삽입.
const dynamicManifestPlugin = (): Plugin => ({
  name: "dynamic-manifest",
  enforce: "post",
  transformIndexHtml(html: string): string {
    const stripped = html.replace(/<link rel="manifest"[^>]*>/g, "");
    return stripped.replace(
      "</head>",
      '<link id="manifest-link" rel="manifest" href="/kittywallet/api/v1/manifest" crossorigin="use-credentials">\n</head>'
    );
  }
});

export default defineConfig({
  base: "/kittywallet/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/themes/**/*.png", "icons/themes/**/*.ico"],
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
            src: "/kittywallet/icons/themes/pink/pwa/icon-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/kittywallet/icons/themes/pink/pwa/icon-512x512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "/kittywallet/icons/themes/pink/pwa/maskable-icon-512x512.png",
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
    }),
    dynamicManifestPlugin()
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
