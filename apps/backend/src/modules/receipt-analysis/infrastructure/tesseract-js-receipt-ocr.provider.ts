import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createWorker } from "tesseract.js";
import type { Worker } from "tesseract.js";
import type { NormalizedReceiptImage } from "../application/receipt-image.types";
import type { ReceiptOcrProvider, ReceiptOcrResult } from "../application/receipt-ocr.types";

const DEFAULT_TIMEOUT_MS = 15_000;

@Injectable()
export class TesseractJsReceiptOcrProvider implements ReceiptOcrProvider, OnModuleInit, OnModuleDestroy {
  readonly id = "tesseract";
  private worker: Worker | null = null;
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.initWorker();
  }

  async onModuleDestroy(): Promise<void> {
    const w = this.worker;
    this.worker = null;
    await w?.terminate();
  }

  async analyze(image: NormalizedReceiptImage): Promise<ReceiptOcrResult> {
    return this.enqueue(() => this.doAnalyze(image));
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const entry = this.queue.then(() => task());
    this.queue = entry.then(() => {}, () => {});
    return entry;
  }

  private async doAnalyze(image: NormalizedReceiptImage): Promise<ReceiptOcrResult> {
    if (!this.worker) await this.initWorker();
    const timeoutMs = Number(this.configService.get<string>("OCR_TIMEOUT_MS")) || DEFAULT_TIMEOUT_MS;

    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        this.worker!.recognize(image.buffer),
        new Promise<never>((_, reject) => {
          timeoutHandle = setTimeout(() => reject(new Error("OCR_TIMEOUT")), timeoutMs);
        })
      ]);
      clearTimeout(timeoutHandle);
      return { text: result.data.text.trim(), confidence: result.data.confidence };
    } catch (error) {
      clearTimeout(timeoutHandle);
      await this.worker?.terminate().catch(() => {});
      this.worker = null;
      await this.initWorker();
      throw error;
    }
  }

  private async initWorker(): Promise<void> {
    const languages = this.configService.get<string>("OCR_LANGUAGES") ?? "kor+eng";
    this.worker = await createWorker(languages);
  }
}
