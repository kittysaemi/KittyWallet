# DTO 정책

## 1. 문서 목적

본 문서는 미냥이 지갑 백엔드에서 사용하는 DTO의 종류, 작성 위치, 명명 규칙, 변환 기준을 정의한다.

DTO는 API 요청/응답 구조를 명확히 하고 Prisma Model이 외부로 직접 노출되지 않도록 하는 역할을 한다.

---

# 2. DTO 종류

| 종류 | 설명 |
|---|---|
| Request DTO | Body 입력값 정의 |
| Query DTO | 검색 조건 및 페이징 조건 정의 |
| Param DTO | URL Path Parameter 정의 |
| Response DTO | API 응답 데이터 구조 정의 |
| Command | UseCase 입력 객체 |
| Result | UseCase 출력 객체 |

---

# 3. 위치 기준

```text
presentation
 └── dto
     ├── request
     ├── response
     ├── query
     └── param

application
 └── dto
     ├── command
     └── result
```

---

# 4. 명명 규칙

| 유형 | 예시 |
|---|---|
| Request DTO | CreateTransactionRequestDto |
| Response DTO | TransactionResponseDto |
| Query DTO | SearchTransactionQueryDto |
| Param DTO | TransactionIdParamDto |
| Command | CreateTransactionCommand |
| Result | CreateTransactionResult |

---

# 5. Request DTO 기준

Request DTO는 외부 입력값을 검증하기 위한 구조이다.

포함 기준:

* 필수값 여부
* 타입
* 문자열 길이
* 숫자 범위
* 날짜 형식
* Enum 값

거래 등록 Request 예시 항목:

| 필드 | 필수 | 설명 |
|---|---|---|
| transaction_type | Y | 수입/지출 구분. INCOME/EXPENSE |
| wallet_type | Y | 계좌/카드 결제수단 구분. ACCOUNT/CARD |
| wallet_id | Y | `wallet_type=ACCOUNT`이면 account_id, `wallet_type=CARD`이면 card_id |
| category_id | Y | 카테고리 ID |
| amount | Y | 거래 금액 |
| transaction_date | Y | 거래일 |
| memo | N | 메모 |

`transaction_type=INCOME`인 경우 `wallet_type=CARD` 요청은 허용하지 않는다.

---

# 6. Response DTO 기준

Response DTO는 API 외부로 반환 가능한 필드만 포함한다.

금지 기준:

* password 반환 금지
* refresh_token 반환 금지
* 내부 관리용 필드 반환 금지
* Prisma Model 전체 반환 금지

---

# 7. Command 기준

Controller는 Request DTO를 UseCase에 직접 넘기지 않고 Command로 변환할 수 있다.

Command에는 인증 사용자 정보가 포함된다.

예시:

```text
CreateTransactionCommand
 ├── userId
 ├── transactionType
 ├── walletType
 ├── walletId
 ├── categoryId
 ├── amount
 ├── transactionDate
 └── memo
```

---

# 8. 변환 기준

```text
Request DTO
 → Command
 → UseCase
 → Result
 → Response DTO
 → Common Response
```

---

# 9. 공통 응답 구조

모든 API는 공통 응답 Wrapper로 반환한다.

```json
{
  "success": true,
  "data": {},
  "message": "요청이 성공했습니다."
}
```

오류 응답은 백엔드예외처리 문서를 따른다.

---

# 10. API별 필수 DTO

다음 DTO는 화면/정책 문서와 API 명세에 연결된 MVP 필수 DTO이다.

| API 영역 | Request/Query DTO | Response DTO | 비고 |
|---|---|---|---|
| 인증 | SignUpRequestDto | SignUpResponseDto | email, password, password_confirm, nickname 검증 |
| 인증 | LoginRequestDto | LoginResponseDto | access_token, refresh_token, user 반환 |
| 인증 | RefreshTokenRequestDto | RefreshTokenResponseDto | refresh_token 입력, access_token 반환 |
| 인증 | LogoutRequestDto | LogoutResponseDto | refresh_token 폐기 |
| 인증 | ResetPasswordRequestDto | ResetPasswordResponseDto | reset_token, new_password 검증 |
| 거래 | CreateTransactionRequestDto | TransactionIdResponseDto | 거래 등록 |
| 거래 | UpdateTransactionRequestDto | TransactionIdResponseDto | 거래 수정 |
| 거래 | TransactionIdParamDto | TransactionDetailResponseDto | 거래 상세 조회 |
| 거래 | SearchTransactionQueryDto | TransactionListResponseDto | 목록 필터, 페이징, 정렬 |
| 거래 | RecentTransactionQueryDto | RecentTransactionListResponseDto | 최근 거래 limit |
| 계좌 | UpdateAccountRequestDto | AccountResponseDto | account_name, icon_id, use_yn |
| 카드 | UpdateCardRequestDto | CardResponseDto | card_name, icon_id, use_yn |
| 카테고리 | CreateCategoryRequestDto | CategoryIdResponseDto | category_name, icon_id, show |
| 카테고리 | UpdateCategoryRequestDto | CategoryResponseDto | category_name, icon_id, show |
| 아이콘 | CreateIconRequestDto | IconIdResponseDto | icon_code, show |
| 아이콘 | UpdateIconRequestDto | IconResponseDto | show |
| 아이콘 | IconListQueryDto | IconListResponseDto | show 필터 |
| 설정 | UpdateSettingsRequestDto | SettingsResponseDto | USER_SETTING upsert |
| 설정 | SettingsQueryDto | SettingsResponseDto | key 단건 또는 전체 조회 |
| 동기화 | SyncUploadRequestDto | SyncUploadResponseDto | client_id, client_temp_id, sync_action |
| 동기화 | SyncDownloadQueryDto | SyncDownloadResponseDto | client_id, since |
| 동기화 | SyncItemResultDto | SyncItemResultDto | 항목별 SUCCESS/FAILED/CONFLICT |

Query DTO 필드명은 API 명세의 snake_case를 기준으로 하며, Application Layer Command/Query로 변환할 때만 camelCase를 사용할 수 있다.

동기화 DTO 필수 기준:

| 필드 | 적용 DTO | 설명 |
|---|---|---|
| client_id | SyncUploadRequestDto, SyncDownloadQueryDto | SYNC_CLIENT 식별자 |
| client_temp_id | SyncUploadRequestDto.items | TRANSACTION 중복 방지 키 |
| sync_action | SyncUploadRequestDto.items | CREATE/UPDATE/DELETE |
| updated_at | SyncUploadRequestDto.items.payload | 충돌 판단 기준 |
| synced_at | SyncUploadResponseDto, SyncDownloadResponseDto | 서버 반영 완료 시각 |

---

# 11. 금지 사항

* Prisma Model 직접 반환 금지
* Request Body를 any로 처리 금지
* Controller에서 임의 객체 응답 금지
* 비밀번호, 토큰 등 민감정보 DTO 포함 금지
* API 명세와 다른 DTO 임의 작성 금지
