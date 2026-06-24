import React from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { isAxiosError } from "axios";
import { TransactionForm } from "../../features/transactions/TransactionForm";
import { receiptAnalysisApi, type ReceiptAnalysisDraft } from "../../entities/receipt/api/receiptAnalysisApi";

interface NavigationState {
  receiptFile?: File;
}

const TransactionNewPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [analysisError, setAnalysisError] = React.useState("");
  const [receiptDraft, setReceiptDraft] = React.useState<ReceiptAnalysisDraft>();
  const [receiptPreviewUrl, setReceiptPreviewUrl] = React.useState<string>();
  const [pastedText, setPastedText] = React.useState("");
  const source = searchParams.get("receiptSource");
  const receiptFile = (location.state as NavigationState | null)?.receiptFile;

  const clearSource = () => setSearchParams({}, { replace: true });
  const analyzeImage = React.useCallback(async (file: File) => {
    setIsAnalyzing(true);
    setAnalysisError("");
    try {
      setReceiptDraft(await receiptAnalysisApi.analyzeImage(file));
    } catch (error) {
      const responseError = isAxiosError(error) ? error.response?.data as { error?: { message?: string } } | undefined : undefined;
      setAnalysisError(responseError?.error?.message ?? "영수증 분석에 실패했습니다. 네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  React.useEffect(() => {
    if (!receiptFile) return;
    const previewUrl = URL.createObjectURL(receiptFile);
    setReceiptPreviewUrl(previewUrl);
    void analyzeImage(receiptFile);
    navigate(location.pathname, { replace: true, state: null });
  }, [analyzeImage, location.pathname, navigate, receiptFile]);

  React.useEffect(() => () => {
    if (receiptPreviewUrl) URL.revokeObjectURL(receiptPreviewUrl);
  }, [receiptPreviewUrl]);

  const parsePastedText = async () => {
    if (!pastedText.trim()) return;
    setIsAnalyzing(true);
    setAnalysisError("");
    try {
      setReceiptDraft(await receiptAnalysisApi.parseText(pastedText));
      clearSource();
    } catch (error) {
      const responseError = isAxiosError(error) ? error.response?.data as { error?: { message?: string } } | undefined : undefined;
      setAnalysisError(responseError?.error?.message ?? "텍스트 분석에 실패했습니다. 원문을 확인해 주세요.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <div className="mx-auto max-w-[480px] px-4 pb-10 pt-6">
        <div className="mb-6 flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-xl" aria-label="뒤로"><ChevronLeft size={20} /></button>
          <h1 className="font-gamja text-2xl">거래 등록</h1>
        </div>
        <div className="rounded-2xl border p-5">
          {receiptPreviewUrl && (
            <figure className="mb-4 overflow-hidden rounded-xl border bg-[var(--color-bg-secondary)]">
              <img src={receiptPreviewUrl} alt="촬영한 영수증" className="max-h-64 w-full object-contain" />
              {isAnalyzing && <figcaption className="border-t px-3 py-2 text-sm text-[var(--color-text-secondary)]">서버로 전송하고 영수증을 분석하고 있습니다…</figcaption>}
            </figure>
          )}
          {isAnalyzing && !receiptPreviewUrl && <p className="mb-3 text-sm text-[var(--color-text-secondary)]">텍스트를 분석하고 있습니다…</p>}
          {analysisError && <p className="mb-3 text-sm text-[var(--color-danger)]">{analysisError}</p>}
          <TransactionForm
            receiptDraft={receiptDraft}
            onCreated={(finalDraft) => { if (receiptDraft) void receiptAnalysisApi.saveTrainingSample(receiptDraft, finalDraft); }}
            onSuccess={() => navigate(-1)}
          />
        </div>
      </div>
      {source === "text" && !receiptDraft && (
        <div className="fixed inset-0 z-[70] flex items-end bg-black/50 px-4 pb-safe sm:items-center sm:justify-center">
          <section role="dialog" aria-modal="true" aria-labelledby="receipt-text-title" className="w-full max-w-[480px] rounded-t-3xl bg-[var(--color-bg-card)] p-5 shadow-2xl sm:rounded-3xl">
            <h2 id="receipt-text-title" className="font-gamja text-xl">영수증 텍스트 붙여넣기</h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">다른 앱에서 추출한 영수증 원문을 붙여 넣으면 거래 초안을 만듭니다.</p>
            <label htmlFor="receipt-ocr-text" className="sr-only">영수증 텍스트</label>
            <textarea id="receipt-ocr-text" autoFocus value={pastedText} onChange={(event) => setPastedText(event.target.value)} placeholder="영수증 텍스트를 붙여 넣어 주세요." className="mt-4 min-h-40 w-full rounded-xl border bg-[var(--color-bg-card)] p-3 text-sm" />
            <div className="mt-4 flex gap-2"><button type="button" onClick={() => void parsePastedText()} disabled={isAnalyzing || !pastedText.trim()} className="min-h-11 flex-1 rounded-xl bg-[var(--color-primary)] text-sm font-semibold disabled:opacity-50">{isAnalyzing ? "분석 중…" : "텍스트 분석"}</button><button type="button" onClick={() => { setPastedText(""); setAnalysisError(""); clearSource(); }} className="min-h-11 rounded-xl px-4 text-sm">취소</button></div>
          </section>
        </div>
      )}
    </div>
  );
};

export default TransactionNewPage;
