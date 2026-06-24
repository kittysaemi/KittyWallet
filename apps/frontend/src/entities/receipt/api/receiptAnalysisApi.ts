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
  sourceText: string;
  sourceType: ReceiptSourceType;
}

export interface TextParseDraft extends Omit<ReceiptAnalysisDraft, "sourceType"> {
  sourceType: "PASTED_TEXT";
}

export const receiptAnalysisApi = {
  analyzeImage: async (image: File): Promise<ReceiptAnalysisDraft> => {
    const formData = new FormData();
    formData.append("image", image);
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
