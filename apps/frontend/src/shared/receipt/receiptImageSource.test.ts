import { describe, expect, it, vi } from "vitest";
import { FilePickerReceiptImageSource, WebCameraReceiptImageSource } from "./receiptImageSource";

describe("FilePickerReceiptImageSource", () => {
  it('has id "file-picker"', () => {
    expect(new FilePickerReceiptImageSource().id).toBe("file-picker");
  });

  it("is always available", async () => {
    await expect(new FilePickerReceiptImageSource().isAvailable()).resolves.toBe(true);
  });
});

describe("WebCameraReceiptImageSource", () => {
  it('has id "web-camera"', () => {
    expect(new WebCameraReceiptImageSource().id).toBe("web-camera");
  });

  it("is available when getUserMedia is supported", async () => {
    Object.defineProperty(navigator, "mediaDevices", {
      value: { getUserMedia: vi.fn() },
      configurable: true,
    });
    await expect(new WebCameraReceiptImageSource().isAvailable()).resolves.toBe(true);
  });

  it("is not available when getUserMedia is absent", async () => {
    Object.defineProperty(navigator, "mediaDevices", {
      value: {},
      configurable: true,
    });
    await expect(new WebCameraReceiptImageSource().isAvailable()).resolves.toBe(false);
  });

  it("is not available when mediaDevices is undefined", async () => {
    Object.defineProperty(navigator, "mediaDevices", {
      value: undefined,
      configurable: true,
    });
    await expect(new WebCameraReceiptImageSource().isAvailable()).resolves.toBe(false);
  });
});
