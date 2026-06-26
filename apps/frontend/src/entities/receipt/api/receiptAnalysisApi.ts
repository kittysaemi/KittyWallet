import { apiClient } from "../../../shared/api/apiClient";

export type ReceiptSourceType = "OCR_IMAGE" | "PASTED_TEXT";

export interface ReceiptAnalysisDraft {
  profile: "receipt-transaction";
  fields: {
    transactionDate?: { value: string; confidence: number };
    totalAmount?: { value: number; confidence: number; currency?: "KRW" };
    merchant?: { value: string; confidence: number };
  };
  items: Array<{ value: string; confidence: number }>;
  warnings: string[];
  parserVersion: string;
  analysisQuality?: {
    retryRecommended: boolean;
    reasons: Array<"LOW_CONFIDENCE" | "MISSING_CORE_FIELDS">;
  };
  sourceText: string;
  sourceType: ReceiptSourceType;
}

export interface TextParseDraft extends Omit<ReceiptAnalysisDraft, "sourceType"> {
  sourceType: "PASTED_TEXT";
}

const MAX_UPLOAD_DIMENSION = 2000;
const TARGET_UPLOAD_BYTES = 2 * 1024 * 1024;
const JPEG_QUALITIES = [0.82, 0.72, 0.62, 0.52];

const canvasToJpeg = (canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> =>
  new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));

const shouldKeepOriginal = (image: File): boolean =>
  image.size <= TARGET_UPLOAD_BYTES || image.type === "image/heic" || image.type === "image/heif";

async function prepareReceiptImage(image: File): Promise<File> {
  if (!image.type.startsWith("image/") || shouldKeepOriginal(image) || typeof createImageBitmap !== "function") return image;

  try {
    const bitmap = await createImageBitmap(image);
    try {
      const scale = Math.min(1, MAX_UPLOAD_DIMENSION / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      let compressed: Blob | null = null;
      for (const quality of JPEG_QUALITIES) {
        compressed = await canvasToJpeg(canvas, quality);
        if (compressed && compressed.size <= TARGET_UPLOAD_BYTES) break;
      }
      if (!compressed) return image;

      return new File([compressed], image.name.replace(/\.[^.]+$/, ".jpg"), {
        type: "image/jpeg",
        lastModified: image.lastModified
      });
    } finally {
      bitmap.close();
    }
  } catch {
    // Some browsers cannot decode HEIC/HEIF in Canvas. The backend normalizer
    // accepts those formats and performs the conversion after upload.
    return image;
  }
}

export const receiptAnalysisApi = {
  analyzeImage: async (image: File, isCamera?: boolean): Promise<ReceiptAnalysisDraft> => {
    const formData = new FormData();
    formData.append("image", await prepareReceiptImage(image));
    if (isCamera) formData.append("is_camera", "true");
    // Do not set Content-Type here. Browsers must add the multipart boundary;
    // forcing the media type can make iOS Safari send a request Multer cannot parse.
    const response = await apiClient.post<{ data: ReceiptAnalysisDraft }>("/receipt-analyses", formData);
    return response.data.data;
  },

  parseText: async (text: string): Promise<TextParseDraft> => {
    const response = await apiClient.post<{ data: Omit<TextParseDraft, "sourceType" | "sourceText"> }>("/text-parses", {
      profile: "receipt-transaction",
      text,
      locale: "ko-KR"
    });
    return { ...response.data.data, sourceText: text, sourceType: "PASTED_TEXT" };
  },

  saveTrainingSample: async (draft: ReceiptAnalysisDraft, finalDraft: Record<string, unknown>): Promise<void> => {
    await apiClient.post("/text-parses/training-samples", {
      profile: draft.profile,
      source_type: draft.sourceType,
      source_text: draft.sourceText,
      final_draft: finalDraft,
      parser_version: draft.parserVersion
    });
  }
};
