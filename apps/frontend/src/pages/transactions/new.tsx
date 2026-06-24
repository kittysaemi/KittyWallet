import React from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { TransactionForm } from "../../features/transactions/TransactionForm";
import { receiptAnalysisApi, type ReceiptAnalysisDraft } from "../../entities/receipt/api/receiptAnalysisApi";
import { toSupportErrorMessage } from "../../shared/api/apiError";

interface NavigationState {
  receiptFile?: File;
}

const TransactionNewPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const lastCreatedDateRef = React.useRef<string>();
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [analysisError, setAnalysisError] = React.useState("");
  const [receiptDraft, setReceiptDraft] = React.useState<ReceiptAnalysisDraft>();
  const [receiptPreviewUrl, setReceiptPreviewUrl] = React.useState<string>();
  const [receiptFileForAnalysis, setReceiptFileForAnalysis] = React.useState<File>();
  const [pastedText, setPastedText] = React.useState("");
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const galleryInputRef = React.useRef<HTMLInputElement>(null);
  const source = searchParams.get("receiptSource");
  const receiptFile = (location.state as NavigationState | null)?.receiptFile;

  const clearSource = () => setSearchParams({}, { replace: true });
  const prepareImage = React.useCallback((file: File) => {
    setReceiptDraft(undefined);
    setAnalysisError("");
    setReceiptFileForAnalysis(file);
    setReceiptPreviewUrl(URL.createObjectURL(file));
  }, []);
  const analyzeImage = React.useCallback(async (file: File) => {
    setIsAnalyzing(true);
    setAnalysisError("");
    try {
      setReceiptDraft(await receiptAnalysisApi.analyzeImage(file));
    } catch (error) {
      setAnalysisError(toSupportErrorMessage(error));
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  React.useEffect(() => {
    if (!receiptFile) return;
    prepareImage(receiptFile);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, navigate, prepareImage, receiptFile]);

  React.useEffect(() => () => {
    if (receiptPreviewUrl) URL.revokeObjectURL(receiptPreviewUrl);
  }, [receiptPreviewUrl]);

  const selectReplacementImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (file) prepareImage(file);
  };

  const clearImage = () => {
    setReceiptFileForAnalysis(undefined);
    setReceiptPreviewUrl(undefined);
    setReceiptDraft(undefined);
    setAnalysisError("");
  };

  const parsePastedText = async () => {
    if (!pastedText.trim()) return;
    setIsAnalyzing(true);
    setAnalysisError("");
    try {
      setReceiptDraft(await receiptAnalysisApi.parseText(pastedText));
      clearSource();
    } catch (error) {
      setAnalysisError(toSupportErrorMessage(error));
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
          {receiptFileForAnalysis && !isAnalyzing && !receiptDraft && (
            <section className="mb-4 rounded-xl border border-[var(--color-border-primary)] p-4" aria-label="영수증 촬영 안내">
              <p className="text-sm font-semibold">영수증이 선명한지 확인해 주세요</p>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">영수증 전체가 보이도록 가까이 찍고, 흔들림·반사광·그림자를 피해 주세요.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => void analyzeImage(receiptFileForAnalysis)} className="min-h-11 rounded-xl bg-[var(--color-primary)] text-sm font-semibold">분석하기</button>
                <button type="button" onClick={() => cameraInputRef.current?.click()} className="min-h-11 rounded-xl border text-sm font-semibold">다시 촬영</button>
                <button type="button" onClick={() => galleryInputRef.current?.click()} className="min-h-11 rounded-xl border text-sm font-semibold">사진 선택</button>
                <button type="button" onClick={clearImage} className="min-h-11 rounded-xl text-sm text-[var(--color-text-secondary)]">이미지 취소</button>
              </div>
            </section>
          )}
          {receiptDraft?.analysisQuality?.retryRecommended && (
            <section className="mb-4 rounded-xl border border-[var(--color-warning)] bg-[var(--color-warning-soft)] p-4" aria-live="polite">
              <p className="text-sm font-semibold">영수증 글자를 충분히 읽지 못했어요.</p>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">다시 촬영하거나 사진을 선택해 보세요. 현재 입력 화면에서 직접 수정할 수도 있습니다.</p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => cameraInputRef.current?.click()} className="min-h-10 rounded-xl border px-3 text-sm font-semibold">다시 촬영</button>
                <button type="button" onClick={() => galleryInputRef.current?.click()} className="min-h-10 rounded-xl border px-3 text-sm font-semibold">사진 선택</button>
              </div>
            </section>
          )}
          {isAnalyzing && !receiptPreviewUrl && <p className="mb-3 text-sm text-[var(--color-text-secondary)]">텍스트를 분석하고 있습니다…</p>}
          {analysisError && <p className="mb-3 text-sm text-[var(--color-danger)]">{analysisError}</p>}
          <TransactionForm
            receiptDraft={receiptDraft}
            onCreated={(finalDraft) => {
              lastCreatedDateRef.current = finalDraft.transaction_date;
              if (receiptDraft) void receiptAnalysisApi.saveTrainingSample(receiptDraft, finalDraft);
            }}
            onSuccess={() => navigate("/transactions", { state: { highlightDate: lastCreatedDateRef.current } })}
          />
        </div>
      </div>
      {source === "text" && !receiptDraft && (
        <div className="fixed inset-0 z-[70] flex items-end bg-black/50 px-4 pb-safe sm:items-center sm:justify-center">
          <section role="dialog" aria-modal="true" aria-labelledby="receipt-text-title" className="w-full max-w-[480px] rounded-t-3xl bg-[var(--color-bg-card)] p-5 shadow-2xl sm:rounded-3xl">
            <h2 id="receipt-text-title" className="font-gamja text-xl">영수증 텍스트 붙여넣기</h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">다른 앱에서 추출한 영수증 원문을 붙여 넣으면 거래 초안을 만듭니다.</p>
            <label htmlFor="receipt-ocr-text" className="sr-only">영수증 텍스트</label>
            <textarea id="receipt-ocr-text" autoFocus value={pastedText} onChange={(event) => setPastedText(event.target.value)} placeholder="영수증 텍스트를 붙여 넣어 주세요." className="mt-4 min-h-40 w-full rounded-xl border bg-[var(--color-bg-card)] p-3 text-base" />
            <div className="mt-4 flex gap-2"><button type="button" onClick={() => { (document.activeElement as HTMLElement)?.blur(); void parsePastedText(); }} disabled={isAnalyzing || !pastedText.trim()} className="min-h-11 flex-1 rounded-xl bg-[var(--color-primary)] text-sm font-semibold disabled:opacity-50">{isAnalyzing ? "분석 중…" : "텍스트 분석"}</button><button type="button" onClick={() => { (document.activeElement as HTMLElement)?.blur(); setPastedText(""); setAnalysisError(""); clearSource(); }} className="min-h-11 rounded-xl px-4 text-sm">취소</button></div>
          </section>
        </div>
      )}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={selectReplacementImage} />
      <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={selectReplacementImage} />
    </div>
  );
};

export default TransactionNewPage;
