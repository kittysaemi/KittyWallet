export function isInstalled(): boolean {
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  if ("standalone" in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true) return true;
  return false;
}
