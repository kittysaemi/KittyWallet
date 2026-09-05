/**
 * 모바일 IME(가상 키보드) 힌트 상수.
 *
 * 배경
 * -----
 * Android Chrome은 포커스된 입력 요소마다 `EditorInfo`를 새로 만들어 IME에 전달한다.
 * (Chromium: `content/.../input/ImeUtils.java#computeEditorInfo`)
 *
 * - `inputmode="numeric"` / `inputmode="decimal"` → `InputType.TYPE_CLASS_NUMBER`
 * - 일반 텍스트 입력            → `InputType.TYPE_CLASS_TEXT`
 *
 * 즉 "금액(숫자 키패드) → 메모(텍스트)" 순서로 포커스를 옮기면 `EditorInfo.inputType`의
 * 클래스 자체가 NUMBER → TEXT로 바뀌고, Android는 `InputMethodManager.restartInput()`으로
 * 키보드를 완전히 재초기화한다. 이때 일부 키보드 앱(삼성 키보드 등)이 직전 숫자 키패드
 * 상태를 기준으로 기본 언어(영문) 서브타입으로 되돌아가는 현상이 보고되었다.
 *
 * 웹에서 IME 언어를 직접 고정할 수 있는 표준 API는 없다.
 * Android에는 `EditorInfo.hintLocales`가 있지만 Chromium은 HTML `lang` 속성을
 * `hintLocales`로 전달하지 않는다(ImeUtils는 `hintLocales`를 전혀 설정하지 않는다).
 *
 * 따라서 아래 상수는 "웹에서 할 수 있는 최소한의 완화책"이며,
 * `EditorInfo`에 라틴 문자 전용 힌트가 섞여 들어가는 것을 막는 것을 목표로 한다.
 *
 * - `autoCapitalize="off"` → `TYPE_TEXT_FLAG_CAP_SENTENCES` 제거
 *   (Chrome의 기본값은 sentences라서 명시하지 않으면 항상 붙는다)
 * - `autoCorrect="off"`    → `TYPE_TEXT_FLAG_AUTO_CORRECT` 제거
 * - `spellCheck={false}`   → 라틴 기준 맞춤법 검사 비활성화
 * - `inputMode="text"`     → 텍스트 입력임을 명시(숫자 필드에서 넘어올 때 의도를 분명히 함)
 * - `lang="ko"`            → 현재 Chromium은 무시하지만 명세상 올바른 신호이며 무해하다
 *
 * 대문자 변환/자동 교정/맞춤법 검사는 한글 입력에서 의미가 없으므로,
 * IME 문제와 별개로도 한글 자유 입력 필드에 적용하는 것이 옳다.
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
 * 금액 등 숫자 키패드를 띄우는 입력 필드용 힌트.
 *
 * `TYPE_CLASS_NUMBER`에서는 대문자/자동교정 플래그가 무시되지만,
 * 클래스 전환 시 `EditorInfo`에 남는 라틴 힌트를 최소화하기 위해 동일하게 꺼 둔다.
 * `inputMode`는 호출부에서 `numeric`을 그대로 지정한다.
 */
export const NUMERIC_TEXT_INPUT_PROPS = {
  autoComplete: "off",
  autoCapitalize: "off",
  autoCorrect: "off",
  spellCheck: false
} as const;
