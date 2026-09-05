/**
 * IME(입력기) 힌트 상수.
 *
 * 증상
 * -----
 * "모든 등록 수정 화면에서 메모 작성 시작 시 영어로 무조건 변경됨"
 * 사용자가 확인한 재현 시점은 "거래등록화면에서 금액 입력 직후"이다.
 *
 * 공통 원인: 금액 필드의 `inputmode="numeric"`
 * ------------------------------------------
 * 브라우저는 `inputmode`를 OS 입력기에 그대로 전달한다. 문제는 그 값이
 * "이 필드는 숫자 전용"이라는 뜻이라서, CJK 입력기가 한글 조합을 꺼 버린다는 점이다.
 * 금액(numeric) -> 날짜 -> 메모(text) 순서를 모든 등록/수정 화면이 공유하므로
 * 증상이 화면 전반에 나타난다.
 *
 * Windows (데스크톱) - 주 재현 환경
 * ---------------------------------
 * Windows에서 Chromium은 TSF(Text Services Framework)를 쓰고,
 * `ui/base/ime/win/tsf_input_scope.cc`의 `GetInputScopes()`가
 * type과 inputmode에서 각각 InputScope를 뽑아 **둘 다** 붙인다.
 *
 * - `ConvertTextInputModeToInputScope`: NUMERIC -> `IS_DIGITS`, DECIMAL -> `IS_NUMBER`
 * - `ConvertTextInputTypeToInputScope`: type="text" -> `IS_DEFAULT`(미부착)
 *
 * 즉 `<input type="text" inputmode="numeric">`은 Windows에 `IS_DIGITS`로 광고된다.
 * Mozc의 InputScope 설계 문서는 `IS_NUMBER`/`IS_DIGITS`에 대한 입력기의
 * 기대 동작을 "Direct Mode (IME Off)" 즉 조합 자체를 끄는 것으로 규정한다.
 * 같은 문서가 "이 변경은 temporal and volatile해야 하며 (1) 클라이언트가 보는 모드와
 * (2) TSF가 보는 모드를 따로 관리해야 한다"고 덧붙이는데, 이 복원 처리를 하지 않는
 * 입력기에서는 숫자 필드를 벗어난 뒤에도 직접 입력(영문) 상태가 그대로 남는다.
 * 그래서 사용자가 메모 칸에서 한/영을 다시 눌러야 한다.
 *
 * 참고: Windows InputScope에는 `IS_HANGUL_FULLWIDTH` 같은 값이 있지만
 * Chromium은 어떤 HTML 속성도 여기에 매핑하지 않는다. `lang="ko"`로 한글 모드를
 * 강제할 방법은 없다. 즉 **텍스트 필드 쪽에서 할 수 있는 일은 없고,
 * 숫자 필드가 IS_DIGITS를 내보내지 않게 하는 것이 유일한 지렛대다.**
 *
 * Android (모바일) - 부차적
 * -------------------------
 * Android Chrome은 포커스마다 EditorInfo를 새로 만든다
 * (Chromium `ImeUtils#computeEditorInfo`).
 * `inputmode="numeric"` -> `TYPE_CLASS_NUMBER`, 일반 텍스트 -> `TYPE_CLASS_TEXT`이므로
 * 금액에서 메모로 넘어가면 inputType 클래스가 바뀌고 `restartInput()`으로
 * 키보드가 완전히 재초기화된다. 이때 일부 키보드 앱이 기본 언어로 되돌아간다.
 * 여기서도 Chromium은 `EditorInfo.hintLocales`를 설정하지 않으므로
 * `lang`으로 언어를 지정할 방법은 없다.
 *
 * 대응
 * ----
 * 1. 숫자 필드: `useNumericFieldProps()`가 화면 키보드가 있는 기기에서만
 *    `inputmode="numeric"`을 내보낸다. 데스크톱에서는 `inputmode`가 사용자에게
 *    아무 이득이 없으므로(명세상 화면 키보드용 힌트다) 생략해도 손해가 없고,
 *    Windows 증상의 직접 원인이 사라진다.
 * 2. 한글 텍스트 필드: 아래 `KOREAN_TEXT_INPUT_PROPS`.
 *    Windows에서는 사실상 무효이고 Android 완화책에 가깝다.
 */

/**
 * 한글 자유 입력 필드용 힌트.
 *
 * - `autoCapitalize="off"` -> Android `TYPE_TEXT_FLAG_CAP_SENTENCES` 제거
 *   (Chrome 기본값이 sentences라서 명시하지 않으면 항상 붙는다)
 * - `autoCorrect="off"`    -> Android `TYPE_TEXT_FLAG_AUTO_CORRECT` 제거
 * - `spellCheck={false}`   -> 라틴 기준 맞춤법 검사 비활성화
 * - `inputMode="text"`     -> 텍스트 입력임을 명시 (Windows에서는 IS_DEFAULT로 무해)
 * - `lang="ko"`            -> 현재 어느 플랫폼에서도 IME 언어 선택에 쓰이지 않지만
 *                             명세상 올바른 신호이며 무해하다
 *
 * 대문자 변환/자동 교정/맞춤법 검사는 한글 입력에서 의미가 없으므로
 * IME 문제와 별개로도 한글 필드에 적용하는 것이 옳다.
 *
 * 주의: 이메일/비밀번호 등 라틴 입력 필드에는 적용하지 않는다.
 */
export const KOREAN_TEXT_INPUT_PROPS = {
  lang: "ko",
  inputMode: "text",
  autoCapitalize: "off",
  autoCorrect: "off",
  spellCheck: false
} as const;

/**
 * 숫자 입력 필드용 힌트 중 기기와 무관한 부분.
 *
 * `inputMode`는 기기에 따라 달라지므로 여기 두지 않는다.
 * 호출부에서는 이 상수를 직접 쓰지 말고 `useNumericFieldProps()`를 사용한다.
 */
export const NUMERIC_TEXT_INPUT_PROPS = {
  autoComplete: "off",
  autoCapitalize: "off",
  autoCorrect: "off",
  spellCheck: false
} as const;
