import { NUMERIC_TEXT_INPUT_PROPS } from "../constants/inputIme";
import { useHasOnScreenKeyboard } from "./useOnScreenKeyboard";

/**
 * 금액 등 숫자 입력 필드에 적용할 props.
 *
 * 화면 키보드가 있는 기기에서만 `inputmode="numeric"`을 내보낸다.
 * 데스크톱(물리 키보드)에서는 `inputmode`를 아예 생략해서 Windows TSF가
 * 해당 필드를 IS_DIGITS로 인식하고 한글 IME를 직접 입력 모드로 끄는 것을 막는다.
 *
 * 숫자만 입력되도록 하는 실제 필터링은 각 폼의 onChange/onKeyDown이 담당하므로
 * `inputmode`가 없어도 입력 검증 동작은 그대로 유지된다.
 */
export function useNumericFieldProps(): typeof NUMERIC_TEXT_INPUT_PROPS & {
  inputMode?: "numeric";
} {
  const hasOnScreenKeyboard = useHasOnScreenKeyboard();
  return {
    ...NUMERIC_TEXT_INPUT_PROPS,
    inputMode: hasOnScreenKeyboard ? "numeric" : undefined
  };
}
