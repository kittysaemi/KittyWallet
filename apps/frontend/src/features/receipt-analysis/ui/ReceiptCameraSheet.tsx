import React from "react";
import { Camera, X } from "lucide-react";

interface ReceiptCameraSheetProps {
  isAnalyzing: boolean;
  onClose: () => void;
  onCapture: (image: File) => void;
}

export const ReceiptCameraSheet: React.FC<ReceiptCameraSheetProps> = ({ isAnalyzing, onClose, onCapture }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [error, setError] = React.useState("");
  const [isCameraReady, setIsCameraReady] = React.useState(false);
  const [isCapturing, setIsCapturing] = React.useState(false);
  React.useEffect(() => {
    let stream: MediaStream | undefined;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      .then((value) => { stream = value; if (videoRef.current) videoRef.current.srcObject = value; })
      .catch(() => setError("카메라를 사용할 수 없어요. 사진첩에서 영수증을 선택해 주세요."));
    return () => stream?.getTracks().forEach((track) => track.stop());
  }, []);
  const capture = () => {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) {
      setError("카메라를 준비하는 중이에요. 잠시 후 다시 눌러 주세요.");
      return;
    }
    const canvas = document.createElement("canvas");
    setIsCapturing(true);
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) {
        setIsCapturing(false);
        setError("사진을 캡처하지 못했어요. 다시 시도해 주세요.");
        return;
      }
      onCapture(new File([blob], "receipt.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.9);
  };
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black p-4"><section className="w-full max-w-[480px]" aria-label="영수증 카메라"><div className="mb-3 flex items-center justify-between text-white"><h2 className="font-gamja text-xl">영수증 촬영</h2><button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10" aria-label="카메라 닫기"><X size={20}/></button></div>{error ? <div className="rounded-2xl bg-white p-5 text-center"><p>{error}</p><button type="button" onClick={() => { setError(""); setIsCapturing(false); }} className="mt-3 rounded-xl bg-[var(--color-primary)] px-4 py-2">다시 시도</button></div> : <div className="overflow-hidden rounded-2xl bg-black"><video ref={videoRef} onLoadedMetadata={() => setIsCameraReady(true)} autoPlay playsInline className="aspect-[3/4] w-full object-cover"/><div className="bg-white p-4 text-center text-sm"><Camera className="mx-auto mb-2" size={20}/><button type="button" disabled={isAnalyzing || isCapturing || !isCameraReady} onClick={capture} className="mt-3 min-h-11 w-full rounded-xl bg-[var(--color-primary)] font-semibold disabled:opacity-50">{isCapturing && !isAnalyzing ? "사진 캡처 중..." : isAnalyzing ? "서버로 전송하고 분석 중..." : isCameraReady ? "촬영하고 분석하기" : "카메라 준비 중..."}</button></div></div>}</section></div>;
};
