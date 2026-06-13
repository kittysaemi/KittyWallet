import { Controller, Get, Header, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { Public } from "../../common/decorators/public.decorator";

const THEME_CONFIG = {
  pink: { theme_color: "#fda5e3", background_color: "#fce2f4" },
  mint: { theme_color: "#77d8b8", background_color: "#e6f7f1" },
  purple: { theme_color: "#bfa8ff", background_color: "#ede8ff" }
} as const;

type ThemeFolder = keyof typeof THEME_CONFIG;

function resolveTheme(theme: unknown): ThemeFolder {
  if (theme === "mint" || theme === "purple") return theme;
  return "pink";
}

@Public()
@Controller("manifest")
export class ManifestController {
  @Get()
  @Header("Cache-Control", "no-cache, no-store")
  getManifest(@Query("theme") theme: string, @Res() res: Response): void {
    const folder = resolveTheme(theme);
    const { theme_color, background_color } = THEME_CONFIG[folder];
    const base = `/kittywallet/icons/themes/${folder}/pwa`;

    res.setHeader("Content-Type", "application/manifest+json");
    res.json({
      name: "KittyWallet",
      short_name: "KittyWall",
      description: "계좌, 카드, 거래 내역을 관리하는 모바일 가계부 서비스",
      lang: "ko-KR",
      start_url: "/kittywallet/",
      scope: "/kittywallet/",
      display: "standalone",
      orientation: "portrait",
      theme_color,
      background_color,
      icons: [
        { src: `${base}/icon-192x192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
        { src: `${base}/icon-512x512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
        { src: `${base}/maskable-icon-512x512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" }
      ]
    });
  }
}
