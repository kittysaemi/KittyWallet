import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { NormalizedReceiptImage } from "../application/receipt-image.types";
import type { ReceiptOcrProvider, ReceiptOcrResult } from "../application/receipt-ocr.types";

@Injectable()
export class PaddleOcrReceiptOcrProvider implements ReceiptOcrProvider {
  readonly id = "paddle";
  private readonly logger = new Logger(PaddleOcrReceiptOcrProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async analyze(image: NormalizedReceiptImage): Promise<ReceiptOcrResult> {
    const serviceUrl = this.configService.get<string>("PADDLE_OCR_URL") ?? "http://ocr:8000";
    const timeoutMs = Number(this.configService.get<string>("OCR_TIMEOUT_MS") ?? 45_000);

    const makeRequest = () => {
      const form = new FormData();
      form.append("image", new Blob([Uint8Array.from(image.buffer)], { type: image.mimeType }), "receipt.jpg");
      if (image.isCamera) form.append("is_camera", "true");
      return fetch(`${serviceUrl}/v1/ocr`, { method: "POST", body: form, signal: AbortSignal.timeout(timeoutMs) });
    };

    let response: Response;
    try {
      response = await makeRequest();
    } catch (firstError) {
      const firstCode = (firstError as NodeJS.ErrnoException).code;
      // Retry once on connection errors — the container may have just restarted
      // after an OOM kill and be accepting connections again within 2 seconds.
      if (firstCode === "ECONNRESET" || firstCode === "ECONNREFUSED") {
        this.logger.warn(`PaddleOCR connection error (${firstCode}), retrying in 2 s…`);
        await new Promise<void>((resolve) => setTimeout(resolve, 2_000));
        try {
          response = await makeRequest();
        } catch (retryError) {
          this.throwOcrError(retryError);
        }
      } else {
        this.throwOcrError(firstError);
      }
    }

    if (!response!.ok) {
      const detail = (await response!.text()).replace(/\s+/g, " ").slice(0, 500);
      this.logger.error(`PaddleOCR request failed: status=${response!.status}, detail=${detail || "(empty response)"}`);
      throw new ServiceUnavailableException({ code: "RECEIPT_ANALYSIS_FAILED", message: "PaddleOCR 분석에 실패했습니다." });
    }
    return response!.json() as Promise<ReceiptOcrResult>;
  }

  private throwOcrError(error: unknown): never {
    const errCode = (error as NodeJS.ErrnoException).code;
    const reason = error instanceof Error ? `${error.name}(${errCode ?? ""}): ${error.message}` : "unknown error";
    this.logger.error(`PaddleOCR request could not complete: ${reason}`);
    // AbortSignal timeout, TCP-level timeout, and ECONNRESET (container OOM kill
    // during inference) are all treated as processing timeouts from the user's
    // perspective. ECONNREFUSED means the container is not running at all.
    const isTimeout =
      (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) ||
      errCode === "ETIMEDOUT" ||
      errCode === "ECONNRESET";
    throw new ServiceUnavailableException({
      code: isTimeout ? "RECEIPT_OCR_TIMEOUT" : "RECEIPT_OCR_PROVIDER_UNAVAILABLE",
      message: isTimeout ? "영수증 분석 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요." : "PaddleOCR 서비스를 사용할 수 없습니다."
    });
  }
}
