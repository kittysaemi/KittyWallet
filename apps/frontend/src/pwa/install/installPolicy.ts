const DISMISSED_KEY = "installDismissedAt";
const REDISPLAY_DELAY_MS = 24 * 60 * 60 * 1000; // 1일

export function recordDismissed(): void {
  localStorage.setItem(DISMISSED_KEY, new Date().toISOString());
}

export function isDismissedRecently(): boolean {
  const raw = localStorage.getItem(DISMISSED_KEY);
  if (!raw) return false;
  const dismissedAt = new Date(raw).getTime();
  return Date.now() - dismissedAt < REDISPLAY_DELAY_MS;
}

export function clearDismissed(): void {
  localStorage.removeItem(DISMISSED_KEY);
}
