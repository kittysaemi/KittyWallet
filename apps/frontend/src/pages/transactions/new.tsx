import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Camera, ChevronLeft, X } from "lucide-react";
import { TransactionForm } from "../../features/transactions/TransactionForm";

const TransactionNewPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [cameraError, setCameraError] = React.useState<string>("");
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const source = searchParams.get("receiptSource");
  const isCameraOpen = source === "camera";

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setSearchParams({});
  };

  React.useEffect(() => {
    if (!isCameraOpen) return;
    let active = true;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      .then((stream) => {
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setCameraError("카메라를 사용할 수 없어요. 사진첩에서 영수증을 선택해 주세요."));
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [isCameraOpen]);

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <div className="mx-auto max-w-[480px] px-4 pb-10 pt-6">
        <div className="mb-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-secondary)]"
            aria-label="뒤로"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="font-gamja text-2xl text-[var(--color-text-primary)]">거래 등록</h1>
        </div>

        <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5 shadow-[0_4px_16px_var(--color-card-shadow)]">
          <TransactionForm onSuccess={() => navigate("/transactions")} />
        </div>
      </div>
      {isCameraOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black p-4">
          <section className="w-full max-w-[480px]" aria-label="영수증 카메라">
            <div className="mb-3 flex items-center justify-between text-white">
              <h2 className="font-gamja text-xl">영수증 촬영</h2>
              <button type="button" onClick={closeCamera} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10" aria-label="카메라 닫기"><X size={20} /></button>
            </div>
            {cameraError ? (
              <div className="rounded-2xl bg-white p-5 text-center text-sm text-[var(--color-text-secondary)]">
                <p>{cameraError}</p>
                <button type="button" onClick={closeCamera} className="mt-4 min-h-11 rounded-xl bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-text-primary)]">닫기</button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl bg-black">
                <video ref={videoRef} autoPlay playsInline className="aspect-[3/4] w-full object-cover" />
                <div className="bg-white p-4 text-center text-sm text-[var(--color-text-secondary)]"><Camera className="mx-auto mb-2 text-[var(--color-primary)]" size={20} />영수증이 화면에 잘 보이도록 맞춰 주세요.</div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default TransactionNewPage;
