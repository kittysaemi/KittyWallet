import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { TransactionForm } from "../../features/transactions/TransactionForm";
import { ReceiptCameraSheet } from "../../features/receipt-analysis/ui/ReceiptCameraSheet";
import { receiptAnalysisApi, type ReceiptAnalysisDraft } from "../../entities/receipt/api/receiptAnalysisApi";
import { isAxiosError } from "axios";

const TransactionNewPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [analysisError, setAnalysisError] = React.useState("");
  const [receiptDraft, setReceiptDraft] = React.useState<ReceiptAnalysisDraft>();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const source = searchParams.get("receiptSource");
  const closeSource = () => setSearchParams({}, { replace: true });
  const analyze = async (file: File) => { setIsAnalyzing(true); setAnalysisError(""); try { setReceiptDraft(await receiptAnalysisApi.analyze(file)); closeSource(); } catch (error) { const status = isAxiosError(error) ? error.response?.status : undefined; const code = isAxiosError(error) ? (error.response?.data as { error?: { code?: string } } | undefined)?.error?.code : undefined; setAnalysisError(`영수증 분석 실패${status ? ` (${status}${code ? `: ${code}` : ""})` : ""}`); closeSource(); } finally { setIsAnalyzing(false); } };
  React.useEffect(() => { if (source === "gallery") inputRef.current?.click(); }, [source]);
  return <div className="min-h-screen bg-[var(--color-bg-primary)]"><div className="mx-auto max-w-[480px] px-4 pb-10 pt-6"><div className="mb-6 flex items-center gap-3"><button type="button" onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-xl" aria-label="뒤로"><ChevronLeft size={20}/></button><h1 className="font-gamja text-2xl">거래 등록</h1></div><div className="rounded-2xl border p-5">{analysisError && <p className="mb-3 text-sm text-[var(--color-danger)]">{analysisError}</p>}<TransactionForm receiptDraft={receiptDraft} onSuccess={() => navigate("/transactions")}/></div></div><input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; closeSource(); if (file) void analyze(file); event.currentTarget.value = ""; }}/>{source === "camera" && <ReceiptCameraSheet isAnalyzing={isAnalyzing} onClose={closeSource} onCapture={(file) => void analyze(file)}/>}</div>;
};

export default TransactionNewPage;
