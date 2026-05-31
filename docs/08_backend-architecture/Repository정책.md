# Repository 정책

## 1. 문서 목적

본 문서는 미냥이 지갑 백엔드의 Repository 사용 기준과 데이터 접근 규칙을 정의한다.

Repository는 비즈니스 계층이 DB 구현 기술에 직접 의존하지 않도록 분리하는 역할을 한다.

---

# 2. Repository 기본 원칙

| 항목 | 정책 |
|---|---|
| 접근 방식 | Repository Interface 기준 접근 |
| 구현체 | Prisma Repository 사용 |
| 호출 위치 | UseCase 또는 Application Service |
| Prisma 접근 | Repository 구현체 내부로 제한 |
| 반환 기준 | 필요한 데이터만 반환 |

---

# 3. 구조

```text
application
 └── repositories
     └── transaction.repository.ts

infrastructure
 └── repositories
     └── transaction.prisma-repository.ts
```

---

# 4. Interface 작성 기준

Repository Interface는 기능에 필요한 메서드만 정의한다.

예시:

```ts
export interface TransactionRepository {
  findById(id: string, userId: string): Promise<Transaction | null>;
  create(input: CreateTransactionInput): Promise<Transaction>;
  update(id: string, input: UpdateTransactionInput): Promise<Transaction>;
  softDelete(id: string, userId: string): Promise<void>;
  search(condition: TransactionSearchCondition): Promise<Transaction[]>;
}
```

---

# 5. Repository별 책임

| Repository | 책임 |
|---|---|
| UserRepository | 사용자 조회, 이메일 중복 확인 |
| AuthTokenRepository | Refresh Token 저장 및 검증 |
| TransactionRepository | 거래 조회, 등록, 수정, 논리 삭제 |
| AccountRepository | 계좌 조회, 등록, 수정, 잔액 변경 |
| CardRepository | 카드 조회, 등록, 수정 |
| CategoryRepository | 카테고리 조회, 등록, 수정 |
| IconRepository | 아이콘 조회, 등록, 표시 여부 변경 |
| StatisticsRepository | 통계 집계 쿼리 |
| SettingsRepository | USER_SETTING 조회 및 upsert |
| SyncClientRepository | SYNC_CLIENT 조회, 등록, last_synced_at 갱신 |
| SyncHistoryRepository | SYNC_HISTORY 기록 및 조회 |
| SyncRepository | 동기화 대상 저장 및 상태 조회 |

---

# 6. Prisma 사용 기준

* Prisma Client는 Repository 구현체 내부에서만 사용한다.
* include/select는 API 응답에 필요한 필드 기준으로 제한한다.
* user_id 조건을 반드시 포함해 사용자 데이터 분리를 보장한다.
* deleted_yn=true 데이터는 기본 조회에서 제외한다.
* use_yn, show 기준은 각 정책 문서에 따른다.

---

# 7. Transaction 처리 기준

여러 테이블을 동시에 변경하는 경우 Prisma Transaction을 사용한다.

필수 Transaction 대상:

* 거래 등록 + 계좌 잔액 반영
* 거래 수정 + 잔액 복구 + 잔액 재반영
* 거래 삭제 + 잔액 복구 + deleted_yn 처리
* 오프라인 동기화 일괄 처리
* 동기화 업로드 + 거래 반영 + SYNC_HISTORY 기록 + SYNC_CLIENT.last_synced_at 갱신
* 설정 저장 upsert 일괄 처리

---

# 8. 금지 사항

* Controller에서 Repository 직접 호출 금지
* Controller에서 Prisma 직접 호출 금지
* Repository에서 비즈니스 정책 판단 금지
* Repository에서 HTTP 예외 직접 생성 금지
* Repository에서 Response DTO 생성 금지
* 다른 모듈 Repository 구현체 직접 참조 금지

---

# 9. 최종 기준

Repository는 데이터 접근 기술을 숨기고 UseCase가 업무 흐름에 집중할 수 있도록 한다.

DB 구조가 변경되더라도 UseCase와 Controller 변경을 최소화하는 것을 목표로 한다.
