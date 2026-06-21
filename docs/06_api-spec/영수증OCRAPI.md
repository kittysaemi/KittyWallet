# 영수증 OCR 분석 API

## 1. 목적

영수증 사진을 영구 저장하지 않고 일회성으로 분석해 신규 거래 등록폼의 초안을 반환한다. 이 API는 거래를 생성하거나 수정하지 않는다.

## 2. 교체 가능한 OCR provider

프론트엔드는 외부 OCR API를 직접 호출하지 않고 이 내부 API만 호출한다. 백엔드는 `ReceiptImageNormalizer`, `ReceiptOcrProvider`, `ReceiptParser` 인터페이스로 분리한다.

```ts
interface ReceiptImageNormalizer {
  normalize(input: Buffer): Promise<NormalizedReceiptImage>;
}

interface ReceiptOcrProvider {
  readonly id: string;
  analyze(image: NormalizedReceiptImage): Promise<ReceiptOcrResult>;
}

interface ReceiptParser {
  parse(result: ReceiptOcrResult): ReceiptDraft;
}
```

초기 provider는 `TesseractJsOcrProvider(kor+eng)`이다. 이미 배포된 provider의 선택, API 키, endpoint는 환경변수만으로 전환한다.

```env
OCR_PROVIDER=tesseract
OCR_LANGUAGES=kor+eng
OCR_TIMEOUT_MS=15000
```

## 3. POST /api/v1/receipt-analyses

### 요청

`multipart/form-data`의 `image` 필드로 이미지 한 장을 전송한다. 인증이 필요하다.

| 항목 | 기준 |
|---|---|
| 입력 형식 | HEIC/HEIF/JPEG/PNG/WEBP |
| 최대 원본 | 25MB |
| 정규화 | EXIF 회전 보정 후 JPEG, 긴 변 2,000px 이하, 최대 5MB |
| 저장 | 원본·정규화본·OCR 원문·분석 이력 저장 금지 |

### 성공 응답

```json
{
  "success": true,
  "data": {
    "merchant": "고양이마트",
    "transaction_date": "2026-06-21",
    "total_amount": 12800,
    "currency": "KRW",
    "memo_items": ["참치캔", "고양이 모래"],
    "warnings": []
  },
  "error": null
}
```

`memo_items`는 거래폼 메모 초안에만 반영한다. 계좌, 카드, 카테고리는 응답하지 않으며 거래를 자동 생성하지 않는다.

### 실패

| 코드 | HTTP | 의미 |
|---|---:|---|
| RECEIPT_IMAGE_REQUIRED | 400 | 이미지가 없거나 여러 장 전송 |
| RECEIPT_IMAGE_UNSUPPORTED | 400 | 지원하지 않는 실제 파일 형식 |
| RECEIPT_IMAGE_TOO_LARGE | 413 | 원본 또는 정규화본 크기 초과 |
| RECEIPT_IMAGE_INVALID | 400 | 손상 파일 또는 픽셀 제한 초과 |
| RECEIPT_ANALYSIS_TIMEOUT | 504 | 분석 시간 초과 |
| RECEIPT_ANALYSIS_FAILED | 422 | 읽을 수 있는 거래 초안을 만들지 못함 |

## 4. 오프라인

OCR 요청은 Sync Queue 대상이 아니다. 오프라인에서는 호출하지 않으며 사진을 브라우저 저장소에 보관하지 않는다.
