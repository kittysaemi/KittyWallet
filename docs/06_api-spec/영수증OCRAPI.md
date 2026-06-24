# OCR 및 문자 파싱 API

## 1. 목적과 범위

이 기능은 신규 거래 등록을 보조한다. 원본 이미지와 변환 이미지는 영구 저장하지 않으며, 분석 결과만 사용자의 확인을 위한 거래 초안에 반영한다. 이 API는 거래를 생성하거나 수정하지 않는다.

현재 비상용 개발 단계에서는 모델 품질 개선을 위해 OCR 원문 또는 텍스트 입력 원문과 사용자가 최종 확정한 거래 초안을 학습 표본으로 보관할 수 있다. 이는 분석 이력 기능과 구분되는 개발용 학습 데이터다. 상용화 전에는 사용자 동의, 보관 기간, 삭제, 비식별화 정책을 별도로 결정해야 하며, 상용 환경에서는 이 정책을 자동 적용하지 않는다.

OCR은 이미지에서 문자를 추출하는 역할만 맡는다. 문자 해석은 특정 영수증 규칙에 종속되지 않는 범용 문자 파싱 API가 맡으며, 영수증 거래 초안은 그 API의 `receipt-transaction` profile을 사용하는 첫 번째 소비자다.

## 2. 등록 방식

하단 `+`에서 다음 네 가지 방식으로 신규 거래 등록을 시작한다.

| 방식 | 제공 환경 | 동작 |
|---|---|---|
| 수동 입력 | PC 웹, 모바일 웹, Android, iPhone | 빈 거래 등록폼을 연다. |
| 카메라 입력 | 모바일 웹, Android, iPhone | 파일 입력의 `capture="environment"`를 사용해 기기의 후면 카메라 촬영을 요청한다. 웹캠 미리보기와 `getUserMedia`는 사용하지 않는다. |
| 사진 입력 | PC 웹, 모바일 웹, Android, iPhone | 기기의 사진첩 또는 파일 선택기에서 이미지를 선택한다. |
| 텍스트 입력 | PC 웹, 모바일 웹, Android, iPhone | 사용자가 다른 앱 등에서 추출한 OCR 원문을 붙여 넣어 문자 파싱 API에 전달한다. 거래 내용을 직접 작성하는 수동 입력과 구분한다. |

PC 웹에서는 카메라 입력을 표시하거나 제공하지 않는다. 모바일 브라우저에서 `capture`는 브라우저와 운영체제가 처리하는 힌트이므로, 카메라 앱 또는 사진 선택 화면 중 실제 제공 방식은 기기 정책에 따른다.

## 3. 교체 가능한 OCR provider

프론트엔드는 외부 OCR API를 직접 호출하지 않고 백엔드 내부 API만 호출한다. 백엔드는 `ReceiptImageNormalizer`, `ReceiptOcrProvider` 인터페이스로 이미지 처리와 문자 추출을 분리한다.

```ts
interface ReceiptImageNormalizer {
  normalize(input: Buffer): Promise<NormalizedReceiptImage>;
}

interface ReceiptOcrProvider {
  readonly id: string;
  analyze(image: NormalizedReceiptImage): Promise<ReceiptOcrResult>;
}
```

기본 provider는 Docker 내부에서 실행하는 `PaddleOCR 3.x(korean)`이며, 유료 외부 OCR·AI API는 사용하지 않는다. 기본값은 한국어 모바일 탐지·인식 모델과 문서 방향 보정만 사용해 모바일 CPU에서도 빠르게 분석한다. 세로 화면에서 하단 전체가 상단보다 현저히 밝은 오버레이 상세 패널을 감지하면, 해당 하단 패널을 확대해 한 번 더 OCR 한다. 문서 왜곡 보정과 텍스트 줄 방향 보정은 느린 사진에서만 환경변수로 켠다. 대비·이진화 이미지 중 하나를 임의로 선택하는 방식은 사용하지 않는다. CPU 환경에서 최신 PaddleOCR의 oneDNN 최적화는 호환성 문제를 피하기 위해 비활성화한다. 모델 파일은 Docker 볼륨에 보존해 컨테이너 재시작 때 다시 내려받지 않는다. `TesseractJsReceiptOcrProvider(kor+eng)`는 fallback provider로 유지한다. 이후 자체 실행하는 오픈소스 OCR 또는 문자 해석 모델로 변경하더라도 프론트엔드와 문자 파싱 API의 계약은 바꾸지 않는다. provider 선택은 환경변수와 백엔드 구현체 등록으로 처리한다.

```env
OCR_PROVIDER=paddle
PADDLE_OCR_URL=http://ocr:8000
OCR_LANGUAGES=kor+eng
OCR_TIMEOUT_MS=180000
PADDLE_OCR_USE_DOC_ORIENTATION=true
PADDLE_OCR_USE_DOC_UNWARPING=false
PADDLE_OCR_USE_TEXTLINE_ORIENTATION=false
PADDLE_OCR_DETECTION_MODEL=PP-OCRv5_mobile_det
PADDLE_OCR_RECOGNITION_MODEL=korean_PP-OCRv5_mobile_rec
```

`paddle`은 제공자 식별자이며 OCR 서비스의 내부 모델 버전과 분리한다. 따라서 향후 다른 OCR 서비스로 교체할 때는 `PADDLE_OCR_URL` 또는 `OCR_PROVIDER`만 변경하고, 거래 등록 화면과 OCR API 호출 코드는 변경하지 않는다.

PaddleOCR CPU 추론은 한 번에 하나의 작업만 처리한다. 분석 요청이 겹치면 뒤 요청은 순서대로 대기하며, 서비스 health check는 OCR 추론과 분리되어 계속 응답한다. 기본 시간 제한은 180초이고 운영 환경에서는 `OCR_TIMEOUT_MS`로 조정한다. 운영 Nginx API 프록시 제한은 OCR 제한보다 길어야 하며, 이미지 업로드 허용 크기(25MB)와 동일한 `client_max_body_size`를 사용한다.

## 4. 문자 파싱 API

### POST /api/v1/text-parses

OCR 결과 또는 사용자가 다른 곳에서 추출해 붙여 넣은 OCR 원문 문자열을 구조화된 후보값으로 변환한다. 이미지와 OCR provider에 의존하지 않는다. 이 endpoint는 수동 거래 입력을 대신하지 않는다.

```json
{
  "profile": "receipt-transaction",
  "text": "OCR 또는 사용자가 입력한 전체 문자열",
  "locale": "ko-KR"
}
```

`profile`은 파서 전략을 선택한다. 공통 API 계약은 유지하고 profile만 추가해 다른 프로젝트와 문서 유형을 지원한다. 초기 profile은 `receipt-transaction`이며, 이후 `invoice`, `bank-statement` 등은 별도 profile로 추가할 수 있다.

`receipt-transaction` profile은 라벨과 같은 줄 또는 바로 다음 줄의 값을 우선 추출한다. 현재 `주문 날짜`은 거래 날짜, `승인일시`의 `YYYYMMDDHHMMSS` 값은 앞 8자리를 거래 날짜로 정규화하며, `합계`, `판매 금액`, `매출액`은 총액, `상품명`은 메모 항목으로 해석한다. `상품명/단가/수량/금액` 표 헤더인 경우에는 탭 또는 두 칸 이상 공백으로 나뉜 바로 다음 행의 첫 상품 열을 메모 항목으로 사용한다. `주문 번호`, `회사명`, `서명`과 그 다음 줄은 메모 항목 후보에서 제외한다. 새 조건은 실제 원문 예시, 대상 필드, 라벨/값 위치, 제외어, 여러 후보의 우선순위, 기대 결과를 함께 정의하고 단위 테스트로 추가한다.

성공 응답은 확정값만 반환하지 않고 후보값의 신뢰도와 검토 경고를 포함한다.

```json
{
  "success": true,
  "data": {
    "fields": {
      "transactionDate": { "value": "2026-06-22", "confidence": 0.91 },
      "totalAmount": { "value": 12800, "currency": "KRW", "confidence": 0.74 },
      "merchant": { "value": "고양이마트", "confidence": 0.68 }
    },
    "items": [{ "value": "참치캔", "confidence": 0.82 }],
    "warnings": []
  },
  "error": null
}
```

## 5. POST /api/v1/receipt-analyses

이미지 기반 편의 endpoint다. `multipart/form-data`의 `image`를 받아 이미지 정규화와 OCR을 수행한 뒤, OCR 원문을 `receipt-transaction` profile의 문자 파싱 API에 전달한다. 인증이 필요하다.

| 항목 | 기준 |
|---|---|
| 입력 형식 | HEIC/HEIF/JPEG/PNG/WEBP |
| 최대 원본 | 25MB |
| 정규화 | EXIF 회전 보정 후 JPEG, 긴 변 2,000px 이하, 최대 5MB |
| 저장 | 원본·정규화본 저장 금지. 비상용 개발 환경에서만 OCR 원문 또는 텍스트 입력 원문과 최종 확정 초안을 학습 표본으로 보관 가능 |

분석 결과는 날짜, 총액, 상호, 상품명 메모의 거래폼 초안에만 반영한다. 계좌, 카드, 카테고리는 응답하거나 자동 변경하지 않는다.

## 6. 오프라인

OCR 및 문자 분석 요청은 Sync Queue 대상이 아니다. 오프라인에서는 호출하지 않으며 이미지와 분석 요청을 브라우저 저장소에 보관하지 않는다. 수동 입력은 기존 오프라인 거래 저장 정책을 따른다.
