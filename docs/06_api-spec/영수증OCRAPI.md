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
  normalize(input: Buffer, isCamera?: boolean): Promise<NormalizedReceiptImage>;
}

interface ReceiptOcrProvider {
  readonly id: string;
  analyze(image: NormalizedReceiptImage): Promise<ReceiptOcrResult>;
}
```

기본 provider는 Docker 내부에서 실행하는 `PaddleOCR 3.x(korean)`이며, 유료 외부 OCR·AI API는 사용하지 않는다. 기본값은 한국어 모바일 탐지·인식 모델과 문서 방향 보정만 사용해 모바일 CPU에서도 빠르게 분석한다. 세로 이미지에서 위→아래로 밝기를 스캔해 어두운 배경에서 밝은 콘텐츠 영역으로 전환되는 경계를 감지하면 해당 영역을 확대해 한 번 더 OCR한다. 배달앱·카드사 하단 시트, 중앙 모달, 카드 오버레이 등 다양한 위치를 지원한다. 이 처리는 카메라 사진에는 적용하지 않는다(자연 배경이 어두운 UI 오버레이 패턴을 모방해 잘못된 영역 크롭을 유발할 수 있음). 문서 왜곡 보정(`PADDLE_OCR_USE_DOC_UNWARPING`)은 기본값으로 비활성화한다. DocUNet 모델은 CPU에서 추론 시간이 매우 길어 타임아웃을 유발하므로, 필요한 경우 환경변수로만 켠다. 텍스트 줄 방향 보정도 마찬가지로 기본 비활성화한다. 평균 신뢰도가 `OCR_LOW_CONF_THRESHOLD`(기본 50%) 미만이면 2차 시도를 수행한다. 카메라 사진은 CLAHE(조명 불균일 보정)를, 스크린샷·열전사지는 적응형 이진화를 적용한다. 임계값을 70%에서 50%로 낮춘 이유는 깨끗한 카메라 사진이 55~65% 구간에 위치하는 경우가 많아 불필요한 이진화 2차 시도가 오히려 인식률을 떨어뜨렸기 때문이다. 카메라 여부(`is_camera` 플래그)는 프론트엔드가 `multipart/form-data`로 전달한 값을 최우선으로 사용한다. 프론트엔드는 `capture="environment"` 입력(카메라 촬영)과 갤러리 입력을 구분해 `is_camera=true`/생략으로 전달한다. 프론트엔드 hint가 없는 경우 서버가 이미지 형식으로 추론한다. HEIC/HEIF는 항상 카메라, PNG는 항상 스크린샷, JPEG는 EXIF 존재 여부를 참고한다. canvas 압축을 거친 JPEG는 EXIF가 제거되므로 EXIF 기반 추론은 canvas 압축을 건너뛴 경우에만 신뢰할 수 있다. 이 플래그를 OCR 서비스 요청에 포함한다. 대비·이진화 이미지 중 하나를 임의로 선택하는 방식은 사용하지 않는다. CPU 환경에서 최신 PaddleOCR의 oneDNN 최적화는 호환성 문제를 피하기 위해 비활성화한다. 모델 파일은 Docker 볼륨에 보존해 컨테이너 재시작 때 다시 내려받지 않는다. `TesseractJsReceiptOcrProvider(kor+eng)`는 fallback provider로 유지한다. 이후 자체 실행하는 오픈소스 OCR 또는 문자 해석 모델로 변경하더라도 프론트엔드와 문자 파싱 API의 계약은 바꾸지 않는다. provider 선택은 환경변수와 백엔드 구현체 등록으로 처리한다.

```env
OCR_PROVIDER=paddle
PADDLE_OCR_URL=http://ocr:8000
OCR_LANGUAGES=kor+eng
OCR_TIMEOUT_MS=50000
OCR_INFERENCE_TIMEOUT=20
OCR_MAX_SIDE=2000
OCR_LOW_CONF_THRESHOLD=50
PADDLE_OCR_USE_DOC_ORIENTATION=true
PADDLE_OCR_USE_DOC_UNWARPING=false
PADDLE_OCR_USE_TEXTLINE_ORIENTATION=false
PADDLE_OCR_DETECTION_MODEL=PP-OCRv5_mobile_det
PADDLE_OCR_RECOGNITION_MODEL=korean_PP-OCRv5_mobile_rec
```

`paddle`은 제공자 식별자이며 OCR 서비스의 내부 모델 버전과 분리한다. 따라서 향후 다른 OCR 서비스로 교체할 때는 `PADDLE_OCR_URL` 또는 `OCR_PROVIDER`만 변경하고, 거래 등록 화면과 OCR API 호출 코드는 변경하지 않는다.

PaddleOCR CPU 추론은 한 번에 하나의 작업만 처리한다. OCR 모델은 컨테이너 시작 시 실제 추론을 한 번 수행해 준비하며, 준비에 실패하면 health check가 통과하지 않아 배포 단계에서 실패한다. 따라서 첫 사용자 요청이 모델 로딩을 기다리지 않는다. 분석 요청이 겹치면 뒤 요청은 순서대로 대기하며, 서비스 health check는 OCR 추론과 분리되어 계속 응답한다. OCR 컨테이너는 2GB 메모리 제한으로 실행하며, OOM kill 후 재기동 중 연결 오류(ECONNRESET·ECONNREFUSED)가 발생하면 2초 대기 후 1회 재시도한다. 추론 한 건당 `OCR_INFERENCE_TIMEOUT`(기본 20초)을 초과하면 즉시 504를 반환해 락 점유를 방지한다. OCR 파이프라인은 최대 2회 추론 패스로 제한한다. 밝은 콘텐츠 영역 크롭 패스(2차)와 CLAHE·이진화 향상 패스(3차)는 상호 배제적으로 동작해, 2차 패스가 수행된 경우 3차 패스는 건너뛴다. 이를 통해 전체 파이프라인 소요 시간을 2 × `OCR_INFERENCE_TIMEOUT` + 오버헤드로 예측 가능하게 한다. 기본 시간 제한은 50초이고 운영 환경에서는 `OCR_TIMEOUT_MS`로 조정한다. 운영 Nginx API 프록시 제한은 OCR 제한보다 길어야 하며, 이미지 업로드 허용 크기(25MB)와 동일한 `client_max_body_size`를 사용한다. 브라우저에서 변환 가능한 큰 이미지는 2000px·약 2MB JPEG로 축소해 전송하고, HEIC/HEIF는 서버 변환 경로를 사용한다.

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

`receipt-transaction` profile은 라벨과 같은 줄 또는 바로 다음 줄의 값을 우선 추출한다.

**거래 날짜** 추출 순서는 다음과 같다.
1. 날짜 라벨(동일 선상, 우선순위 없음): `거래일시`, `결제일시`, `승인일시`, `이용일시`, `거래일`, `거래일자`, `거래날짜`, `결제날짜`, `결제일자`
2. 전체 줄 패턴 스캔: `YYYY-MM-DD`, `YYYYMMDD`, `YYMMDDHHmmss` 등
3. 최후 폴백: `주문날짜`, `주문일자`

`승인일시` 등의 `YYYYMMDDHHmmss` 형식은 앞 8자리를 날짜로 정규화한다.

**총액** 추출 순서는 다음과 같다.
1. 총액 라벨(동일 선상, 우선순위 없음): `판매금액`, `총합계`, `결제금액`, `매출액`, `합계`, `총액`, `받을금액`, `지불금액`, `이용금액`, `청구금액`, `총금액`
2. 폴백: 라벨 매칭 없고 금액 줄(`N원`, `N,NNN원`, `N,NNN` 등)이 영수증 전체에서 정확히 1개일 때 해당 금액 사용

**메모 항목** 추출 순서는 다음과 같다.
1. 상품 라벨: `상품명`, `품목`, `상품내역`, `구매처` — `상품명/단가/수량/금액` 표 헤더인 경우 탭 또는 두 칸 이상 공백으로 나뉜 바로 다음 행의 첫 상품 열을 사용
2. 상호 라벨: `공급자명`, `상호`, `가맹점명`
3. 폴백: 위 라벨이 없을 때 모든 영수증 유형에서 유의미한 첫 번째 텍스트 — 한국어(`가-힣`) 또는 영문자(`a-zA-Z`)가 1개 이상 포함되어야 하며, `주문 번호`, `회사명`, `서명`과 그 다음 줄, 그리고 사업자·대표자·주소·전화·카드·승인·번호·금액·부가세·공급·결제·거래·일시·합계·매출·주문·소지자·매입·성명·홈페이지·가맹점 포함 줄은 후보에서 제외

새 조건은 실제 원문 예시, 대상 필드, 라벨/값 위치, 제외어, 여러 후보의 우선순위, 기대 결과를 함께 정의하고 단위 테스트로 추가한다.

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

이미지 기반 편의 endpoint다. `multipart/form-data`의 `image`를 받아 이미지 정규화와 OCR을 수행한 뒤, OCR 원문을 `receipt-transaction` profile의 문자 파싱 API에 전달한다. 인증이 필요하다. 이미지 정규화는 다음 순서로 적용한다. 첫째, 스크린샷 등 카메라로 촬영하지 않은 이미지에서 배경과 대비가 높은 사각형 영수증 영역을 감지한 경우 해당 영역을 투시 변환으로 잘라내어 배경을 제거하고, 카메라 사진이거나 감지에 실패하면 원본 이미지를 그대로 사용한다. 카메라 사진에 투시 변환을 적용하면 자연 배경의 윤곽이 영수증 경계로 오인식되어 이미지가 왜곡될 수 있으므로 건너뛴다. 둘째, 캡처본처럼 검은 배경에 흰 글자가 많은 입력을 감지하면 흰 배경/검은 글자 방향으로 반전해 문자 추출 성공률을 높인다. OCR 원문은 파싱 전에 줄 병합·제어 문자·구분자 오류를 정규화하는 전처리를 거친다.

| 항목 | 기준 |
|---|---|
| 입력 형식 | HEIC/HEIF/JPEG/PNG/WEBP |
| 최대 원본 | 25MB |
| 정규화 | EXIF 회전 보정 → 카메라 여부 판단(프론트엔드 `is_camera` 우선 → HEIC 항상 카메라, PNG 항상 스크린샷, JPEG는 EXIF fallback) → 스크린샷 한정 배경 제거 → 다크 배경 반전(해당하는 경우) → JPEG 변환, 긴 변 2,000px 이하, 최대 5MB |
| OCR 전처리 | 제어 문자 제거, 구분자 정규화, 라벨·금액 줄 병합 분리 |
| 저장 | 원본·정규화본 저장 금지. 비상용 개발 환경에서만 OCR 원문 또는 텍스트 입력 원문과 최종 확정 초안을 학습 표본으로 보관 가능 |

분석 결과는 날짜, 총액, 상호, 상품명 메모의 거래폼 초안에만 반영한다. 계좌, 카드, 카테고리는 응답하거나 자동 변경하지 않는다. 이미지 분석 응답에는 영구 저장하지 않는 현재 요청 한정 품질 판단 `analysisQuality`를 포함할 수 있다. API가 OCR 평균 신뢰도가 낮거나 날짜·금액이 모두 없다고 판단하면 `retryRecommended: true`와 사유(`LOW_CONFIDENCE`, `MISSING_CORE_FIELDS`)를 반환하며, 화면은 재촬영·사진 다시 선택 안내를 표시한다. 사용자가 이미지 선명도를 직접 판정하지 않는다.

## 6. 오프라인

OCR 및 문자 분석 요청은 Sync Queue 대상이 아니다. 오프라인에서는 호출하지 않으며 이미지와 분석 요청을 브라우저 저장소에 보관하지 않는다. 수동 입력은 기존 오프라인 거래 저장 정책을 따른다.
