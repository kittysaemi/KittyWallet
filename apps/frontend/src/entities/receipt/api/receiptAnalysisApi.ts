import { apiClient } from "../../../shared/api/apiClient";

export interface ReceiptAnalysisDraft {
  merchant?: string;
  transactionDate?: string;
  totalAmount?: number;
  memoItems: string[];
  warnings: string[];
}

export const receiptAnalysisApi = {
  analyze: async (image: File): Promise<ReceiptAnalysisDraft> => {
    const formData = new FormData();
    formData.append("image", image);
    const response = await apiClient.post<{ data: ReceiptAnalysisDraft }>("/receipt-analyses", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return response.data.data;
  }
};
