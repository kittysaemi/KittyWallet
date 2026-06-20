# 아이콘 API

## Provider 호환성 정책

- compatibility core는 provider 공통이며 Lucide는 첫 adapter일 뿐이다.
- upgrade 전 현재 등록 key와 대상 버전 key를 비교한다. alias/manual-map 근거가 있는 경우에만 provider_key 변경 plan을 만들고 icon_code는 유지한다.
- 삭제·누락·브랜드 제거는 자동 대체하지 않는다. 기존 provider 버전에서 snapshot을 확보해 fallback 또는 manual review로 분류한다.
- snapshot은 provider key lookup 실패 시에만 사용한다. 우선순위는 provider key, snapshot, 기본 fallback이다.
- snapshot payload는 허용된 svg 또는 icon-node 구조만 저장·렌더링하며 script, event handler, javascript URL은 허용하지 않는다.

## 정책 요약

- 아이콘은 계좌, 카드, 카테고리에서 공통으로 사용한다.
- 아이콘은 등록만 가능하며 사용자가 아이콘 자체를 수정하거나 삭제하지 않는다.
- 사용자는 사용자 아이콘의 표시/숨김 상태만 변경할 수 있다.
- `show=true` 아이콘만 신규 선택 목록에 표시한다.
- `show=false` 아이콘은 신규 선택 목록에서만 제외하며, 기존 데이터에 연결된 아이콘은 계속 표시한다.
- 아이콘 검색은 서버의 Icon Provider Adapter를 통해 수행한다.
- 현재 기본 Provider는 Lucide Icons지만, API 이름과 도메인 모델은 특정 Provider에 직접 의존하지 않는다.
- 검색 키워드, 내부 아이콘 코드, 외부 provider key는 분리한다.
- DB에는 전체 provider 후보를 미리 저장하지 않고 기본 아이콘과 사용자가 실제 등록한 아이콘의 사전/매핑 정보만 저장한다.
- 프론트 화면에는 아이콘 이름 텍스트를 표시하지 않고 아이콘 그래픽만 표시한다.

## 아이콘 사전/매핑

아이콘 사전은 내부 아이콘 코드와 외부 provider key의 매핑을 저장한다.

| 필드 | 설명 |
|---|---|
| icon_code | 서비스 내부 아이콘 코드. 예: `icon-cat` |
| provider_type | 현재 provider 유형. 예: `lucide` |
| provider_key | provider 내부 식별자. 예: `cat` |
| search_keywords | 프로그램 내부 검색어와 별칭 |

기본 아이콘은 seed에서 `ICON_DICTIONARY`와 `ICON`에 함께 생성한다.
사용자 아이콘은 검색 결과를 등록할 때 `ICON_DICTIONARY`를 생성 또는 재사용한 뒤 `ICON`에 생성한다.

## 기본 아이콘 시드

MVP 기본 아이콘은 현재 provider의 key를 기준으로 사전 매핑과 실제 아이콘 데이터를 함께 생성한다.

| 순서 | icon_code | provider_type | provider_key | 용도 예시 |
| ---: | --- | --- | --- | --- |
| 1 | icon-tag | lucide | tag | 기본 카테고리 공통 |
| 2 | icon-wallet | lucide | wallet | 계좌 |
| 3 | icon-credit-card | lucide | credit-card | 카드 |
| 4 | icon-shopping-bag | lucide | shopping-bag | 쇼핑 |
| 5 | icon-bus | lucide | bus | 교통비 |
| 6 | icon-utensils | lucide | utensils | 식비 |
| 7 | icon-heart-pulse | lucide | heart-pulse | 의료 |
| 8 | icon-graduation-cap | lucide | graduation-cap | 교육 |
| 9 | icon-music | lucide | music | 문화 |
| 10 | icon-receipt | lucide | receipt | 공과금 |
| 11 | icon-repeat | lucide | repeat | 구독 |
| 12 | icon-circle-dollar-sign | lucide | circle-dollar-sign | 급여 |
| 13 | icon-banknote-arrow-up | lucide | banknote-arrow-up | 수입 |
| 14 | icon-sandwich | lucide | sandwich | 점심 |

# 아이콘 목록 API

## Endpoint

`GET /api/v1/icons`

## Query Parameters

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| show | boolean | N | true | true면 신규 선택 가능한 아이콘만 조회 |

## Response

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "icon_id": 1,
        "icon_code": "icon-wallet",
        "provider_type": "lucide",
        "provider_key": "wallet",
        "snapshot": null,
        "show": true,
        "is_default": true,
        "created_at": "2026-05-30T01:00:00Z",
        "updated_at": "2026-05-30T01:00:00Z"
      }
    ]
  },
  "error": null
}
```

`snapshot`은 provider key lookup 실패 시에만 사용할 fallback 정보다. 존재하는 경우 `snapshot_hash`, `snapshot_format`, `snapshot_payload`을 포함하며, 정상 provider 렌더링보다 우선하지 않는다.

# 아이콘 검색 옵션 API

## 목적

프론트에서 입력한 프로그램 검색어를 서버에 전달하고, 서버가 현재 Icon Provider Adapter를 통해 등록 가능한 아이콘 후보를 반환한다.

## Endpoint

`GET /api/v1/icon-options`

## Query Parameters

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| keyword | string | Y | 프로그램 내부 검색어 |

## Response

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "icon_code": "icon-cat",
        "provider_type": "lucide",
        "provider_key": "cat"
      }
    ]
  },
  "error": null
}
```

## 비즈니스 규칙

- API 경로에는 특정 provider 이름을 포함하지 않는다.
- 서버는 검색어를 현재 provider 검색 조건으로 변환한다.
- 등록되지 않은 provider 아이콘도 검색 후보로 반환할 수 있다.
- 사용자가 등록하면 서버는 사전 매핑을 생성하거나 기존 매핑을 재사용한다.

# 아이콘 등록 API

## 목적

사용자가 선택한 검색 후보를 사용자 아이콘으로 등록한다.

## Endpoint

`POST /api/v1/icons`

## Request Body

```json
{
  "icon_code": "icon-cat",
  "show": true
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| icon_code | string | Y | 서비스 내부 아이콘 코드 |
| show | boolean | N | 표시 여부. 기본값 true |

## 비즈니스 규칙

- 서버는 `icon_code`를 현재 Icon Provider Adapter 기준으로 검증한다.
- `ICON_DICTIONARY`에 매핑이 없으면 생성하고, 있으면 재사용한다.
- 같은 사용자가 이미 선택 가능한 동일 아이콘을 보유하고 있으면 중복으로 등록하지 않는다.
- 기본 아이콘은 seed 데이터로만 생성하며 사용자 API로 생성하지 않는다.
- 아이콘은 등록 후 수정/삭제하지 않는다.

## Response

```json
{
  "success": true,
  "data": {
    "icon_id": 1
  },
  "error": null
}
```

## 오류 처리

| HTTP Status | 코드 | 설명 |
|---|---|---|
| 400 | VALIDATION_001 | 필수값 누락 또는 형식 오류 |
| 400 | ICON_003 | 등록 가능한 아이콘이 아님 |
| 409 | ICON_001 | 중복 아이콘 |

# 아이콘 표시 상태 변경 API

## 목적

사용자 아이콘의 신규 선택 목록 표시 여부를 변경한다.

## Endpoint

`PUT /api/v1/icons/{id}`

## Request Body

```json
{
  "show": false
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| show | boolean | Y | false면 신규 선택 목록에서 제외 |

## Response

```json
{
  "success": true,
  "data": {
    "icon_id": 1,
    "show": false
  },
  "error": null
}
```

## 오류 처리

| HTTP Status | 코드 | 설명 |
|---|---|---|
| 400 | VALIDATION_001 | 수정 가능한 필드가 없음 |
| 404 | ICON_002 | 아이콘 없음 |

# 아이콘 선택 정책

- 아이콘 선택 화면은 `GET /api/v1/icons?show=true` 응답을 기준으로 표시한다.
- 사용자가 아이콘을 클릭하면 해당 아이콘이 단일 선택된다.
- 선택 완료 후 호출 화면에 `icon_id`와 `icon_code`를 반환한다.
- 선택 UI에는 아이콘 이름 텍스트를 표시하지 않는다.
