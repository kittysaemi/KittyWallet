import { ConfigService } from "@nestjs/config";
import sharp from "sharp";
import { SharpReceiptImageNormalizer } from "./sharp-receipt-image.normalizer";

jest.mock("file-type", () => ({
  fileTypeFromBuffer: jest.fn(async () => ({ ext: "png", mime: "image/png" }))
}), { virtual: true });

const createNormalizer = () =>
  new SharpReceiptImageNormalizer({ get: jest.fn(() => undefined) } as unknown as ConfigService);

const meanBrightness = async (buffer: Buffer) => {
  const stats = await sharp(buffer).grayscale().stats();
  return stats.channels[0].mean;
};

describe("SharpReceiptImageNormalizer", () => {
  it("inverts dark-background light-text screenshots before OCR", async () => {
    const input = await sharp({
      create: {
        width: 240,
        height: 240,
        channels: 3,
        background: "#050505"
      }
    })
      .composite([{ input: Buffer.from('<svg width="240" height="240"><rect x="24" y="72" width="96" height="24" fill="white"/></svg>'), top: 0, left: 0 }])
      .png()
      .toBuffer();

    const result = await createNormalizer().normalize(input);

    expect(await meanBrightness(result.buffer)).toBeGreaterThan(220);
  });

  it("keeps ordinary light receipt images in their original polarity", async () => {
    const input = await sharp({
      create: {
        width: 240,
        height: 240,
        channels: 3,
        background: "#f8f8f8"
      }
    })
      .composite([{ input: Buffer.from('<svg width="240" height="240"><rect x="24" y="72" width="96" height="24" fill="black"/></svg>'), top: 0, left: 0 }])
      .png()
      .toBuffer();

    const result = await createNormalizer().normalize(input);

    expect(await meanBrightness(result.buffer)).toBeGreaterThan(200);
  });
});
