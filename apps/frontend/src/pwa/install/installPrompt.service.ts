import { usePwaStore } from "../state/pwa.store";
import { isInstalled } from "./installStatus.detector";
import { clearDismissed, isDismissedRecently, recordDismissed } from "./installPolicy";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export function initInstallPrompt(): () => void {
  const store = usePwaStore.getState();

  if (isInstalled()) {
    store.setInstallStatus("installed");
    return () => {};
  }

  const handleBeforeInstall = (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    if (!isDismissedRecently()) {
      store.setInstallStatus("installable");
    }
  };

  const handleAppInstalled = () => {
    deferredPrompt = null;
    clearDismissed();
    store.setInstallStatus("installed");
  };

  window.addEventListener("beforeinstallprompt", handleBeforeInstall);
  window.addEventListener("appinstalled", handleAppInstalled);

  return () => {
    window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    window.removeEventListener("appinstalled", handleAppInstalled);
  };
}

export async function triggerInstallPrompt(): Promise<void> {
  if (!deferredPrompt) return;
  await deferredPrompt.prompt();
  const result = await deferredPrompt.userChoice;
  deferredPrompt = null;
  if (result.outcome === "accepted") {
    usePwaStore.getState().setInstallStatus("installed");
  }
}

export function dismissInstallPrompt(): void {
  recordDismissed();
  usePwaStore.getState().setInstallStatus("dismissed");
}
