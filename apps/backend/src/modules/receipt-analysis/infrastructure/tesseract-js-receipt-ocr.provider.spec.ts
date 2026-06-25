import { ConfigService } from "@nestjs/config";
import type { NormalizedReceiptImage } from "../application/receipt-image.types";

jest.mock("tesseract.js", () => ({ createWorker: jest.fn() }));
import { createWorker } from "tesseract.js";
import { TesseractJsReceiptOcrProvider } from "./tesseract-js-receipt-ocr.provider";

const mockCreateWorker = createWorker as jest.Mock;

const fakeImage: NormalizedReceiptImage = {
  buffer: Buffer.from("img"),
  mimeType: "image/jpeg",
  width: 100,
  height: 100
};

const makeWorkerMock = (recognizeImpl?: jest.Mock) => ({
  recognize: recognizeImpl ?? jest.fn().mockResolvedValue({ data: { text: "  결과  ", confidence: 85 } }),
  terminate: jest.fn().mockResolvedValue(undefined)
});

const makeProvider = (config: Record<string, string> = {}) => {
  const configService = { get: jest.fn((key: string) => config[key]) } as unknown as ConfigService;
  return new TesseractJsReceiptOcrProvider(configService);
};

describe("TesseractJsReceiptOcrProvider", () => {
  beforeEach(() => {
    mockCreateWorker.mockReset();
  });

  it("initializes a single worker on onModuleInit", async () => {
    mockCreateWorker.mockResolvedValue(makeWorkerMock());
    const provider = makeProvider();
    await provider.onModuleInit();

    expect(mockCreateWorker).toHaveBeenCalledTimes(1);
    expect(mockCreateWorker).toHaveBeenCalledWith("kor+eng");
  });

  it("uses OCR_LANGUAGES from config if set", async () => {
    mockCreateWorker.mockResolvedValue(makeWorkerMock());
    const provider = makeProvider({ OCR_LANGUAGES: "kor" });
    await provider.onModuleInit();

    expect(mockCreateWorker).toHaveBeenCalledWith("kor");
  });

  it("terminates worker on onModuleDestroy", async () => {
    const worker = makeWorkerMock();
    mockCreateWorker.mockResolvedValue(worker);
    const provider = makeProvider();
    await provider.onModuleInit();
    await provider.onModuleDestroy();

    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it("reuses the same worker for multiple analyze calls", async () => {
    const worker = makeWorkerMock();
    mockCreateWorker.mockResolvedValue(worker);
    const provider = makeProvider();
    await provider.onModuleInit();

    await provider.analyze(fakeImage);
    await provider.analyze(fakeImage);

    expect(mockCreateWorker).toHaveBeenCalledTimes(1);
    expect(worker.recognize).toHaveBeenCalledTimes(2);
  });

  it("returns trimmed text and confidence from worker", async () => {
    const worker = makeWorkerMock(
      jest.fn().mockResolvedValue({ data: { text: "  합계 12,800원  ", confidence: 77 } })
    );
    mockCreateWorker.mockResolvedValue(worker);
    const provider = makeProvider();
    await provider.onModuleInit();

    const result = await provider.analyze(fakeImage);

    expect(result.text).toBe("합계 12,800원");
    expect(result.confidence).toBe(77);
  });

  it("serializes concurrent requests so second starts after first completes", async () => {
    const callOrder: string[] = [];
    let resolveFirst!: () => void;

    const recognize = jest.fn()
      .mockImplementationOnce(() => {
        callOrder.push("first-start");
        return new Promise<{ data: { text: string; confidence: number } }>(res => {
          resolveFirst = () => {
            callOrder.push("first-end");
            res({ data: { text: "a", confidence: 80 } });
          };
        });
      })
      .mockImplementationOnce(async () => {
        callOrder.push("second");
        return { data: { text: "b", confidence: 80 } };
      });

    mockCreateWorker.mockResolvedValue(makeWorkerMock(recognize));
    const provider = makeProvider();
    await provider.onModuleInit();

    const p1 = provider.analyze(fakeImage);
    const p2 = provider.analyze(fakeImage);

    // yield until recognize is actually called and resolveFirst is assigned
    await new Promise(res => setImmediate(res));
    resolveFirst();
    await Promise.all([p1, p2]);

    expect(callOrder.indexOf("second")).toBeGreaterThan(callOrder.indexOf("first-end"));
  });

  it("terminates and reinitializes worker when recognize throws", async () => {
    const worker = makeWorkerMock(
      jest.fn().mockRejectedValueOnce(new Error("recognize_error"))
    );
    mockCreateWorker.mockResolvedValue(worker);
    const provider = makeProvider();
    await provider.onModuleInit();

    await expect(provider.analyze(fakeImage)).rejects.toThrow("recognize_error");

    expect(worker.terminate).toHaveBeenCalled();
    expect(mockCreateWorker).toHaveBeenCalledTimes(2);
  });

  it("second request succeeds after worker reinit following an error", async () => {
    const worker = makeWorkerMock(
      jest.fn()
        .mockRejectedValueOnce(new Error("OCR_TIMEOUT"))
        .mockResolvedValueOnce({ data: { text: "재시도 성공", confidence: 82 } })
    );
    mockCreateWorker.mockResolvedValue(worker);
    const provider = makeProvider();
    await provider.onModuleInit();

    await expect(provider.analyze(fakeImage)).rejects.toThrow("OCR_TIMEOUT");
    const result = await provider.analyze(fakeImage);

    expect(result.text).toBe("재시도 성공");
  });
});
