import { useSyncExternalStore } from "react";

/**
 * 화면 키보드(on-screen keyboard)를 사용하는 기기인지 판별한다.
 *
 * `inputmode`는 명세상 "화면 키보드가 있는 기기"를 위한 힌트다(MDN).
 * 물리 키보드만 있는 데스크톱에서는 사용자에게 아무 이득이 없는 반면,
 * Windows에서는 IME를 직접 입력(영문) 모드로 강제하는 부작용만 남는다.
 * 자세한 배경은 `shared/constants/inputIme.ts` 참고.
 *
 * 판별 기준은 주 포인터가 터치인지 여부(`pointer: coarse`)다.
 * `any-pointer`가 아니라 `pointer`를 쓰는 이유는, 마우스를 연결한
 * 투인원 기기처럼 물리 키보드를 주로 쓰는 환경까지 터치로 잡히는 것을
 * 막기 위해서다.
 */
const COARSE_POINTER_QUERY = "(pointer: coarse)";

function isSupported(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function";
}

function subscribe(onStoreChange: () => void): () => void {
  if (!isSupported()) return () => {};
  const mediaQueryList = window.matchMedia(COARSE_POINTER_QUERY);
  if (typeof mediaQueryList.addEventListener !== "function") return () => {};
  mediaQueryList.addEventListener("change", onStoreChange);
  return () => mediaQueryList.removeEventListener("change", onStoreChange);
}

function getSnapshot(): boolean {
  if (!isSupported()) return false;
  return window.matchMedia(COARSE_POINTER_QUERY).matches;
}

export function useHasOnScreenKeyboard(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
