export const ERROR_CODES = {
  AUTH_001: { code: 'AUTH_001', message: '이미 가입된 이메일입니다.', statusCode: 409 },
  AUTH_002: { code: 'AUTH_002', message: '이메일 또는 비밀번호가 일치하지 않습니다.', statusCode: 401 },
  AUTH_003: { code: 'AUTH_003', message: '비활성 사용자입니다.', statusCode: 401 },
  AUTH_004: { code: 'AUTH_004', message: '인증이 만료되었습니다.', statusCode: 401 },
  AUTH_005: { code: 'AUTH_005', message: '비밀번호 확인이 일치하지 않습니다.', statusCode: 400 },
  AUTH_006: { code: 'AUTH_006', message: '로그아웃 처리에 실패했습니다.', statusCode: 500 },
  AUTH_007: { code: 'AUTH_007', message: '재설정 토큰이 만료되었거나 유효하지 않습니다.', statusCode: 401 },
  AUTH_008: { code: 'AUTH_008', message: '비밀번호 재설정 대상 사용자를 찾을 수 없습니다.', statusCode: 404 },
  VALIDATION_001: { code: 'VALIDATION_001', message: '입력값이 올바르지 않습니다.', statusCode: 400 },
} as const;

export type ErrorCodeKey = keyof typeof ERROR_CODES;
