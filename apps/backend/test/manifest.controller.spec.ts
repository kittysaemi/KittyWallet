import { Test } from "@nestjs/testing";
import { ManifestController } from "../src/modules/manifest/manifest.controller";

const mockRes = () => {
  const res: Record<string, jest.Mock> = {};
  res.setHeader = jest.fn();
  res.json = jest.fn();
  return res;
};

describe("ManifestController", () => {
  let controller: ManifestController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ManifestController]
    }).compile();
    controller = moduleRef.get(ManifestController);
  });

  it("returns pink manifest by default (no query, no cookie)", () => {
    const res = mockRes();
    controller.getManifest(undefined as unknown as string, undefined as unknown as string, res as never);
    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "application/manifest+json");
    const manifest = (res.json as jest.Mock).mock.calls[0][0];
    expect(manifest.theme_color).toBe("#fda5e3");
    expect(manifest.background_color).toBe("#fce2f4");
    expect(manifest.icons[0].src).toContain("/themes/pink/pwa/");
    expect(manifest.icons.find((i: { purpose: string }) => i.purpose === "maskable")).toBeDefined();
  });

  it("returns mint manifest for theme=mint query param", () => {
    const res = mockRes();
    controller.getManifest("mint", undefined as unknown as string, res as never);
    const manifest = (res.json as jest.Mock).mock.calls[0][0];
    expect(manifest.theme_color).toBe("#77d8b8");
    expect(manifest.background_color).toBe("#e6f7f1");
    expect(manifest.icons[0].src).toContain("/themes/mint/pwa/");
  });

  it("returns purple manifest for theme=purple query param", () => {
    const res = mockRes();
    controller.getManifest("purple", undefined as unknown as string, res as never);
    const manifest = (res.json as jest.Mock).mock.calls[0][0];
    expect(manifest.theme_color).toBe("#bfa8ff");
    expect(manifest.background_color).toBe("#ede8ff");
    expect(manifest.icons[0].src).toContain("/themes/purple/pwa/");
  });

  it("falls back to pink for unknown theme query param", () => {
    const res = mockRes();
    controller.getManifest("unknown", undefined as unknown as string, res as never);
    const manifest = (res.json as jest.Mock).mock.calls[0][0];
    expect(manifest.theme_color).toBe("#fda5e3");
    expect(manifest.icons[0].src).toContain("/themes/pink/pwa/");
  });

  it("reads theme from kw_theme cookie when no query param", () => {
    const res = mockRes();
    controller.getManifest(undefined as unknown as string, "session_id=abc; kw_theme=mint; other=val", res as never);
    const manifest = (res.json as jest.Mock).mock.calls[0][0];
    expect(manifest.theme_color).toBe("#77d8b8");
    expect(manifest.icons[0].src).toContain("/themes/mint/pwa/");
  });

  it("reads purple theme from cookie", () => {
    const res = mockRes();
    controller.getManifest(undefined as unknown as string, "kw_theme=purple", res as never);
    const manifest = (res.json as jest.Mock).mock.calls[0][0];
    expect(manifest.theme_color).toBe("#bfa8ff");
    expect(manifest.icons[0].src).toContain("/themes/purple/pwa/");
  });

  it("query param overrides cookie", () => {
    const res = mockRes();
    controller.getManifest("purple", "kw_theme=mint", res as never);
    const manifest = (res.json as jest.Mock).mock.calls[0][0];
    expect(manifest.theme_color).toBe("#bfa8ff");
    expect(manifest.icons[0].src).toContain("/themes/purple/pwa/");
  });

  it("includes required manifest fields", () => {
    const res = mockRes();
    controller.getManifest("pink", undefined as unknown as string, res as never);
    const manifest = (res.json as jest.Mock).mock.calls[0][0];
    expect(manifest.name).toBe("KittyWallet");
    expect(manifest.short_name).toBe("KittyWall");
    expect(manifest.start_url).toBe("/kittywallet/");
    expect(manifest.scope).toBe("/kittywallet/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons).toHaveLength(3);
  });
});
