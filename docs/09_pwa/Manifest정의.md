# Manifest정의

## 1. 문서 목적

본 문서는 미냥이 지갑 PWA의 Web App Manifest 설정 기준을 정의한다.

Manifest는 브라우저가 미냥이 지갑을 설치 가능한 앱으로 인식하고, 홈 화면 설치 후 앱처럼 실행할 수 있도록 필요한 메타 정보를 제공한다.

본 문서는 다음 문서와 연계된다.

* PWA개요
* 설치정책
* ServiceWorker정의
* PWA상태정의
* 업데이트정책
* 하이브리드확장정책

---

# 2. Manifest 개요

Web App Manifest는 PWA 설치와 실행에 필요한 앱 정보를 정의하는 JSON 기반 설정이다.

브라우저는 Manifest 정보를 기준으로 다음 기능을 처리한다.

* 앱 이름 표시
* 홈 화면 아이콘 표시
* 앱 시작 URL 결정
* 실행 화면 모드 결정
* 테마 색상 적용
* Splash 화면 구성
* 설치 가능 여부 판단

Manifest는 PWA 설치 조건 중 하나이며, 설치정책의 `installable` 상태 진입 조건과 직접 연결된다.

참고 기준:

* MDN Web App Manifest
* W3C Web Application Manifest
* Vite PWA Plugin Manifest 설정

---

# 3. Manifest 적용 기준

미냥이 지갑은 Vite PWA Plugin을 통해 Manifest를 설정한다.

Manifest 설정은 별도 `manifest.json` 파일을 직접 관리하는 방식보다 `vite.config.ts` 내부에서 관리하는 방식을 기본으로 한다.

적용 기준은 다음과 같다.

| 항목     | 기준                           |
| ------ | ---------------------------- |
| 설정 위치  | `vite.config.ts`             |
| 적용 방식  | `VitePWA` plugin manifest 옵션 |
| 실행 모드  | `standalone`                 |
| 시작 URL | `/`                          |
| 범위     | `/`                          |
| 언어     | `ko-KR`                      |
| 방향     | `portrait`                   |
| 아이콘    | 192x192, 512x512 필수          |

---

# 4. Manifest 기본 설정

## 4.1 기본 예시

```ts
VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: 'KittyWallet',
    short_name: 'KittyWall',
    description: '계좌, 카드, 거래 내역을 관리하는 모바일 가계부 서비스',
    lang: 'ko-KR',
    start_url: '/kittywallet/',
    scope: '/kittywallet/',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: '#fda5e3',
    background_color: '#fce2f4',',
    icons: [
      {
        src: '/kittywallet/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png'
      },
      {
        src: '/icons/icon-512x512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      }
    ]
  }
})
```

---

# 5. Manifest 항목 정의

## 5.1 name

| 항목    | 내용                        |
| ----- | ------------------------- |
| 필드    | `name`                    |
| 값     | `KittyWallet`                  |
| 필수 여부 | 필수                        |
| 용도    | 설치 화면, 앱 정보, Splash 화면 표시 |

정책

* 서비스 공식명을 사용한다.
* 기존 명칭인 마이너스 가계부를 사용하지 않는다.
* 한글 서비스명을 기준으로 한다.

---

## 5.2 short_name

| 항목    | 내용             |
| ----- | -------------- |
| 필드    | `short_name`   |
| 값     | `KittyWall`        |
| 필수 여부 | 필수             |
| 용도    | 홈 화면 아이콘 하단 이름 |

정책

* 홈 화면에서 잘리지 않도록 짧은 이름을 사용한다.
* 띄어쓰기 없이 표시한다.
* Android 홈 화면 기준 6자 내외 표시를 고려한다.

---

## 5.3 description

| 항목    | 내용                                |
| ----- | --------------------------------- |
| 필드    | `description`                     |
| 값     | `계좌, 카드, 거래 내역을 관리하는 모바일 가계부 서비스` |
| 필수 여부 | 권장                                |
| 용도    | 브라우저 및 설치 정보 설명                   |

정책

* 서비스 목적을 간결하게 설명한다.
* 금융기관 자동 연동 서비스처럼 보이는 표현은 사용하지 않는다.
* 수동 기록 기반 가계부 서비스임을 명확히 한다.

---

## 5.4 lang

| 항목    | 내용         |
| ----- | ---------- |
| 필드    | `lang`     |
| 값     | `ko-KR`    |
| 필수 여부 | 권장         |
| 용도    | 앱 기본 언어 지정 |

정책

* 기본 언어는 한국어로 한다.
* 향후 다국어 지원 시 별도 정책 문서에서 확장한다.

---

## 5.5 start_url

| 항목    | 내용                  |
| ----- | ------------------- |
| 필드    | `start_url`         |
| 값     | `/`                 |
| 필수 여부 | 필수                  |
| 용도    | 홈 화면 실행 시 최초 진입 URL |

정책

```text
홈 화면 실행
 ↓
start_url 접속
 ↓
PWA 실행 화면
 ↓
로그인 상태 확인
 ↓
대시보드 또는 로그인 화면 이동
```

* 특정 화면으로 직접 진입하지 않는다.
* 인증 상태에 따라 라우팅한다.
* 로그인 여부 판단은 앱 내부에서 처리한다.

---

## 5.6 scope

| 항목    | 내용               |
| ----- | ---------------- |
| 필드    | `scope`          |
| 값     | `/`              |
| 필수 여부 | 필수               |
| 용도    | PWA가 제어하는 URL 범위 |

정책

* 미냥이 지갑 전체 앱 경로를 PWA 범위로 포함한다.
* `scope` 밖의 URL은 브라우저 일반 탭으로 열릴 수 있다.
* 앱 내부 라우팅은 모두 `scope` 내부에 위치해야 한다.

---

## 5.7 display

| 항목    | 내용           |
| ----- | ------------ |
| 필드    | `display`    |
| 값     | `standalone` |
| 필수 여부 | 필수           |
| 용도    | 앱 실행 형태 지정   |

정책

* 홈 화면 설치 후 브라우저 주소창 없는 앱 형태로 실행한다.
* `installed` 상태 판단 기준으로 사용한다.
* `standalone` 실행 여부는 앱 초기화 시 확인한다.

판단 예시

```ts
const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as any).standalone === true
```

---

## 5.8 orientation

| 항목    | 내용            |
| ----- | ------------- |
| 필드    | `orientation` |
| 값     | `portrait`    |
| 필수 여부 | 권장            |
| 용도    | 앱 기본 화면 방향 지정 |

정책

* 미냥이 지갑은 모바일 세로 화면을 기준으로 설계한다.
* 가로 화면 전용 UI는 제공하지 않는다.
* 태블릿 환경에서도 기본은 세로 화면이다.

---

## 5.9 theme_color

| 항목    | 내용                  |
| ----- | ------------------- |
| 필드    | `theme_color`       |
| 값     | `#fda5e3`           |
| 필수 여부 | 권장                  |
| 용도    | 브라우저 UI 및 시스템 테마 색상 |

정책

* 초기값은 분홍색 계열을 사용한다.
* 추후 디자인 시스템에서 브랜드 컬러 확정 시 변경 가능하다.
* `index.html`의 `<meta name="theme-color">` 값과 일치시킨다.

---

## 5.10 background_color

| 항목    | 내용                 |
| ----- | ------------------ |
| 필드    | `background_color` |
| 값     | `#fce2f4`          |
| 필수 여부 | 권장                 |
| 용도    | Splash 화면 배경색      |

정책

* 앱 로딩 전 분홍색 배경을 표시한다.
* Splash 화면과 앱 초기 화면의 배경색을 맞춘다.
* 어두운 테마 지원 전까지 단일 색상으로 유지한다.

---

# 6. 아이콘 정의

## 6.1 필수 아이콘

| 크기               | 파일명                         | 용도               |
| ---------------- | --------------------------- | ---------------- |
| 192x192          | `icon-192x192.png`          | Android 설치 아이콘   |
| 512x512          | `icon-512x512.png`          | 고해상도 설치 아이콘      |
| 512x512 maskable | `icon-512x512-maskable.png` | Adaptive Icon 대응 |

---

## 6.2 아이콘 저장 위치

```text
public
 └─ icons
    ├─ icon-192x192.png
    ├─ icon-512x512.png
    └─ icon-512x512-maskable.png
```

---

## 6.3 아이콘 정책

* PNG 형식을 기본으로 사용한다.
* 투명 배경 사용 가능.
* 앱 아이콘은 서비스 로고 또는 지갑 이미지 기반으로 제작한다.
* 금융기관 로고처럼 오해될 수 있는 이미지는 사용하지 않는다.
* maskable 아이콘은 안전 영역을 고려하여 제작한다.

---

# 7. Splash 화면 정책

PWA Splash 화면은 Manifest의 다음 항목을 기반으로 브라우저가 자동 생성한다.

* `name`
* `icons`
* `background_color`
* `theme_color`

정책

```text
홈 화면 실행
 ↓
Splash 화면 표시
 ↓
앱 초기화
 ↓
로그인 상태 확인
 ↓
화면 이동
```

Splash 화면은 별도 화면으로 직접 구현하지 않는다.

단, 앱 내부 초기 로딩 화면은 별도로 제공할 수 있다.

---

# 8. 설치 상태와 Manifest 연결

## 8.1 installable 상태

`installable` 상태는 다음 조건이 충족될 때 가능하다.

```text
Manifest 정상 로드
AND
필수 Manifest 항목 존재
AND
Service Worker 등록 완료
AND
HTTPS 실행
AND
브라우저 설치 조건 충족
```

Manifest 관점 필수 항목

* `name`
* `short_name`
* `start_url`
* `display`
* `icons`

---

## 8.2 installed 상태

`installed` 상태는 다음 조건으로 판단한다.

```text
display-mode: standalone
OR
iOS navigator.standalone = true
```

Manifest의 `display: standalone` 값은 installed 판단과 직접 연결된다.

---

# 9. 앱 바로가기 정책

Manifest의 `shortcuts` 항목은 초기 MVP에서는 사용하지 않는다.

## 제외 사유

* 초기 기능 복잡도 증가
* 인증 상태와 직접 진입 화면 처리 필요
* 오프라인 상태 처리 복잡도 증가

향후 검토 가능한 바로가기

| 바로가기  | URL                 |
| ----- | ------------------- |
| 거래 등록 | `/transactions/new` |
| 거래 검색 | `/transactions`     |
| 소비 통계 | `/statistics`       |

MVP 이후 적용 시 인증 상태 확인 후 안전하게 라우팅해야 한다.

---

# 10. 스크린샷 정책

Manifest의 `screenshots` 항목은 초기 MVP에서는 필수로 사용하지 않는다.

향후 설치 경험 개선이 필요한 경우 추가한다.

예상 항목

* 대시보드 화면
* 거래 등록 화면
* 소비 통계 화면

---

# 11. Manifest 검증 기준

Manifest는 배포 전 다음 기준으로 검증한다.

| 검증 항목             | 기준           |
| ----------------- | ------------ |
| Manifest 로드       | 정상           |
| name              | 존재           |
| short_name        | 존재           |
| start_url         | `/kittywallet/` |
| scope             | `/kittywallet/` |
| display           | `standalone` |
| icons             | 192, 512 존재  |
| maskable icon     | 존재           |
| theme_color       | meta 값과 일치   |
| Lighthouse PWA 검사 | 통과           |

---

# 12. 예외 처리

## Manifest 로드 실패

처리

* 설치 기능 비활성화
* `unsupported` 상태 처리
* 일반 웹 서비스로 동작

---

## 아이콘 누락

처리

* 설치 가능 상태 진입 차단 가능
* 배포 전 검증에서 실패 처리

---

## start_url 접근 실패

처리

* PWA 실행 실패로 간주
* 기본 라우트 `/kittywallet/` 복구 필요

---

## scope 불일치

처리

* PWA 내부 라우팅 오류 가능
* 배포 전 수정 필수

---

# 13. Vite PWA Plugin 적용 기준

미냥이 지갑은 Vite 기반 프론트엔드 구조를 사용한다.

Manifest는 `vite-plugin-pwa` 설정에서 관리한다.

기준 구조

```ts
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa'

export default {
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'KittyWallet',
        short_name: 'KittyWall',
        description: '계좌, 카드, 거래 내역을 관리하는 모바일 가계부 서비스',
        lang: 'ko-KR',
        start_url: '/kittywallet/',
        scope: '/kittywallet/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#fda5e3',
        background_color: '#fce2f4',
        icons: [
          {
            src: '/kittywallet/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512x512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
}
```

---

# 14. 관련 문서 연결

| 관련 문서           | 연결 내용                                  |
| --------------- | -------------------------------------- |
| PWA개요           | Manifest의 역할과 PWA 구성 요소                |
| 설치정책            | installable, installed 상태 기준           |
| ServiceWorker정의 | 설치 조건 중 Service Worker 등록              |
| PWA상태정의         | installable, installed, unsupported 상태 |
| 업데이트정책          | 새 버전 배포 시 앱 갱신                         |
| 하이브리드확장정책       | Capacitor 앱 전환 시 아이콘 및 앱명 기준           |

---

# 15. 최종 기준

미냥이 지갑의 Manifest는 다음 기준을 반드시 만족해야 한다.

* 서비스명은 KittyWallet으로 표시
* 홈 화면 설치 가능
* `standalone` 실행 지원
* 모바일 세로 화면 기준
* 192x192, 512x512 아이콘 제공
* maskable 아이콘 제공
* 앱 실행 시 `/` 경로에서 시작
* 설치정책의 `installable`, `installed` 상태와 연결
