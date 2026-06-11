import React from "react";
import { Download, X } from "lucide-react";
import { usePwaStore } from "../../pwa/state/pwa.store";
import { dismissInstallPrompt, triggerInstallPrompt } from "../../pwa/install/installPrompt.service";

const PwaInstallBanner: React.FC = () => {
  const installStatus = usePwaStore((s) => s.installStatus);

  if (installStatus !== "installable") return null;

  return (
    <div className="mb-4 flex items-center gap-3 rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] px-4 py-3 shadow-[0_4px_16px_var(--color-card-shadow)]">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]">
        <Download size={16} className="text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">KittyWallet을 홈 화면에 설치해보세요.</p>
        <button
          type="button"
          onClick={() => void triggerInstallPrompt()}
          className="mt-1 text-xs font-semibold text-[var(--color-primary)] hover:underline"
        >
          설치하기
        </button>
      </div>
      <button
        type="button"
        aria-label="설치 안내 닫기"
        onClick={dismissInstallPrompt}
        className="shrink-0 p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default PwaInstallBanner;
