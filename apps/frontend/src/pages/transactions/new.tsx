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
  const [receiptFileForAnalysis, setReceiptFileForAnalysis] = React.useState<File>();
  const [retryOverlayDismissed, setRetryOverlayDismissed] = React.useState(false);
  const [pastedText, setPastedText] = React.useState("");
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const galleryInputRef = React.useRef<HTMLInputElement>(null);
  const urlSource = searchParams.get("receiptSource");
  const [lastImageSource, setLastImageSource] = React.useState<"camera" | "gallery">(
    urlSource === "camera" ? "camera" : "gallery"
  );
  const receiptFile = (location.state as NavigationState | null)?.receiptFile;

  const clearSource = () => setSearchParams({}, { replace: true });

  const analyzeImage = React.useCallback(async (file: File, isCameraPhoto: boolean) => {
    setIsAnalyzing(true);
    setAnalysisError("");
    setRetryOverlayDismissed(false);
    try {
      setReceiptDraft(await receiptAnalysisApi.analyzeImage(file, isCameraPhoto));
    } catch (error) {
      setAnalysisError(toSupportErrorMessage(error));
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const prepareImage = React.useCallback((file: File) => {
    setReceiptDraft(undefined);
    setAnalysisError("");
    setRetryOverlayDismissed(false);
    setReceiptFileForAnalysis(file);
  }, []);

  React.useEffect(() => {
    if (receiptFileForAnalysis) void analyzeImage(receiptFileForAnalysis, lastImageSource === "camera");
  }, [receiptFileForAnalysis, analyzeImage, lastImageSource]);

  React.useEffect(() => {
    if (!receiptFile) return;
    prepareImage(receiptFile);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, navigate, prepareImage, receiptFile]);

  const selectCameraImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    setLastImageSource("camera");
    if (file) prepareImage(file);
  };

  const selectGalleryImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    setLastImageSource("gallery");
    if (file) prepareImage(file);
  };

  const cancelAndGoBack = () => {
    sessionStorage.setItem("reopenEntrySheet", "1");
    navigate(-1);
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

  const isRetryRecommended = !retryOverlayDismissed && !!receiptDraft?.analysisQuality?.retryRecommended && !!receiptFileForAnalysis;
  const showImageOverlay = !!receiptFileForAnalysis && (isAnalyzing || !!analysisError || isRetryRecommended);
  const isCamera = lastImageSource === "camera";

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <div className="mx-auto max-w-[480px] px-4 pb-10 pt-6">
        <div className="mb-6 flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-xl" aria-label="뒤로"><ChevronLeft size={20} /></button>
          <h1 className="font-gamja text-2xl">거래 등록</h1>
        </div>
        <div className="rounded-2xl border p-5">
          {isAnalyzing && !receiptFileForAnalysis && <p className="mb-3 text-sm text-[var(--color-text-secondary)]">텍스트를 분석하고 있습니다…</p>}
          {analysisError && !receiptFileForAnalysis && <p className="mb-3 text-sm text-[var(--color-danger)]">{analysisError}</p>}
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

      {showImageOverlay && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4">
          <section role="dialog" aria-modal="true" aria-live="polite" className="w-full max-w-[320px] rounded-3xl bg-[var(--color-bg-card)] p-6 text-center shadow-2xl">
            {isAnalyzing && (
              <>
                <div className="mb-4 flex justify-center">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-border-primary)] border-t-[var(--color-primary)]" />
                </div>
                <p className="mb-6 text-sm font-semibold">분석 중…</p>
              </>
            )}
            {!isAnalyzing && !!analysisError && (
              <>
                <p className="mb-4 text-sm font-semibold text-[var(--color-danger)]">{analysisError}</p>
                <button
                  type="button"
                  onClick={() => {
                    if (isCamera) cameraInputRef.current?.click();
                    else galleryInputRef.current?.click();
                  }}
                  className="mb-2 min-h-11 w-full rounded-xl bg-[var(--color-primary)] text-sm font-semibold"
                >
                  {isCamera ? "재촬영" : "사진 재선택"}
                </button>
              </>
            )}
            {!isAnalyzing && isRetryRecommended && (
              <>
                <p className="mb-1 text-sm font-semibold">영수증 글자를 충분히 읽지 못했어요.</p>
                <p className="mb-4 text-xs text-[var(--color-text-secondary)]">다시 시도하거나 직접 입력할 수 있습니다.</p>
                <button
                  type="button"
                  onClick={() => {
                    if (isCamera) cameraInputRef.current?.click();
                    else galleryInputRef.current?.click();
                  }}
                  className="mb-2 min-h-11 w-full rounded-xl bg-[var(--color-primary)] text-sm font-semibold"
                >
                  {isCamera ? "재촬영" : "사진 재선택"}
                </button>
                <button
                  type="button"
                  onClick={() => setRetryOverlayDismissed(true)}
                  className="mb-2 min-h-11 w-full rounded-xl border text-sm font-semibold"
                >
                  이대로 계속
                </button>
              </>
            )}
            <button
              type="button"
              onClick={cancelAndGoBack}
              className="min-h-11 w-full rounded-xl text-sm text-[var(--color-text-secondary)]"
            >
              취소
            </button>
          </section>
        </div>
      )}

      {urlSource === "text" && !receiptDraft && (
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

      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={selectCameraImage} />
      <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={selectGalleryImage} />
    </div>
  );
};

export default TransactionNewPage;
