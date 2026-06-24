## [1.26.9](https://github.com/kittysaemi/KittyWallet/compare/v1.26.8...v1.26.9) (2026-06-24)


### Bug Fixes

* preserve receipt image form data ([7575e6b](https://github.com/kittysaemi/KittyWallet/commit/7575e6b2bf25e5455b4d92acfece2f235962d0c9))

## [1.26.8](https://github.com/kittysaemi/KittyWallet/compare/v1.26.7...v1.26.8) (2026-06-24)


### Bug Fixes

* **ui:** 스크롤/페이지 위치 복원 문제 수정 ([#353](https://github.com/kittysaemi/KittyWallet/issues/353)) ([83c4433](https://github.com/kittysaemi/KittyWallet/commit/83c443351b6ea30be1aab3d36b8beb63e8c14eec))

## [1.26.7](https://github.com/kittysaemi/KittyWallet/compare/v1.26.6...v1.26.7) (2026-06-24)


### Bug Fixes

* **deploy:** clean disk before file upload ([e3edb28](https://github.com/kittysaemi/KittyWallet/commit/e3edb28defca88794a52622caab909580be5a03c))

## [1.26.6](https://github.com/kittysaemi/KittyWallet/compare/v1.26.5...v1.26.6) (2026-06-24)


### Bug Fixes

* **deploy:** guard Docker disk space ([6db2923](https://github.com/kittysaemi/KittyWallet/commit/6db2923e5aa2f7654c1f85fc281ee3490db47ada))

## [1.26.5](https://github.com/kittysaemi/KittyWallet/compare/v1.26.4...v1.26.5) (2026-06-24)


### Bug Fixes

* preserve iOS receipt upload boundary ([76c0ad9](https://github.com/kittysaemi/KittyWallet/commit/76c0ad9fa0397fcdf8f60caed85ce5b8ae924e16))

## [1.26.4](https://github.com/kittysaemi/KittyWallet/compare/v1.26.3...v1.26.4) (2026-06-24)


### Bug Fixes

* **ui:** 거래 등록 후 이전 화면으로 복귀 ([d3c1727](https://github.com/kittysaemi/KittyWallet/commit/d3c17273f2d2eba4f1ee554d2cd075037a04315d)), closes [#353](https://github.com/kittysaemi/KittyWallet/issues/353)

## [1.26.3](https://github.com/kittysaemi/KittyWallet/compare/v1.26.2...v1.26.3) (2026-06-24)


### Bug Fixes

* **ui:** iOS Safari 입력 포커스 시 자동 확대 방지 ([7a1161f](https://github.com/kittysaemi/KittyWallet/commit/7a1161f2c98cf493ffc40c9e0dd4f09f92f7b658)), closes [#353](https://github.com/kittysaemi/KittyWallet/issues/353)

## [1.26.2](https://github.com/kittysaemi/KittyWallet/compare/v1.26.1...v1.26.2) (2026-06-24)


### Bug Fixes

* configure production receipt OCR ([e17dc04](https://github.com/kittysaemi/KittyWallet/commit/e17dc043f2fa86e01a4c4d8200fab7c9c77b82c3))

## [1.26.1](https://github.com/kittysaemi/KittyWallet/compare/v1.26.0...v1.26.1) (2026-06-24)


### Bug Fixes

* publish OCR image for deployment ([0ac4cf0](https://github.com/kittysaemi/KittyWallet/commit/0ac4cf0f4360a0d1b117fc01a9c90311304e1a6e))

# [1.26.0](https://github.com/kittysaemi/KittyWallet/compare/v1.25.0...v1.26.0) (2026-06-24)


### Features

* improve receipt OCR quality ([6ba3d86](https://github.com/kittysaemi/KittyWallet/commit/6ba3d860a00d5b74ecbd245d2cf3d675359be4b4))

# [1.25.0](https://github.com/kittysaemi/KittyWallet/compare/v1.24.0...v1.25.0) (2026-06-22)


### Features

* add configurable receipt OCR provider ([2ef91c2](https://github.com/kittysaemi/KittyWallet/commit/2ef91c2d1376d967b94a7dc1b1ab9d11a97cf31c))
* add receipt analysis endpoint ([101e25b](https://github.com/kittysaemi/KittyWallet/commit/101e25bb9f79493ba793b0a2c63ef732420f844a))
* add reusable receipt text parsing ([f310a3d](https://github.com/kittysaemi/KittyWallet/commit/f310a3d083ec31680bbe4f935812aa6ba3234b75))
* add transaction entry options ([5daf151](https://github.com/kittysaemi/KittyWallet/commit/5daf1517810d14ddbcb017a44434d240ad004397))
* normalize receipt images in memory ([0ef9e04](https://github.com/kittysaemi/KittyWallet/commit/0ef9e044092a36cb39c85739dff04e23b28a6e62))
* parse receipt transaction drafts ([1f50b5a](https://github.com/kittysaemi/KittyWallet/commit/1f50b5a39905a7e13dbab5248e04aaedc7c0f09e))
* refine receipt analysis registration flow ([fe0c2a2](https://github.com/kittysaemi/KittyWallet/commit/fe0c2a203ad3baefedf0766f5bdd80569f50b46f))

# [1.24.0](https://github.com/kittysaemi/KittyWallet/compare/v1.23.0...v1.24.0) (2026-06-21)


### Features

* **api/#276:** 카테고리별 지출합계 통계 API 추가 ([5ff4de3](https://github.com/kittysaemi/KittyWallet/commit/5ff4de3cc5ac512ee6ee47acafb0699a49bfbe7f)), closes [api/#276](https://github.com/kittysaemi/KittyWallet/issues/276)
* **frontend-data/#277:** 카테고리별 지출합계 통계 프론트 API 타입/호출 추가 ([55d8c22](https://github.com/kittysaemi/KittyWallet/commit/55d8c22bdb782d4307553affc1f651d7385b0bd8)), closes [frontend-data/#277](https://github.com/kittysaemi/KittyWallet/issues/277)
* **ui/#278:** 통계 화면 카테고리별 지출합계 UI 추가 ([de000bb](https://github.com/kittysaemi/KittyWallet/commit/de000bbde9c820f5c6fd96743fb42663b5705440)), closes [ui/#278](https://github.com/kittysaemi/KittyWallet/issues/278)

# [1.23.0](https://github.com/kittysaemi/KittyWallet/compare/v1.22.3...v1.23.0) (2026-06-21)


### Bug Fixes

* **#312:** 할부 거래 수정 시 카테고리·날짜·메모 비활성화 ([81b03f4](https://github.com/kittysaemi/KittyWallet/commit/81b03f4bc753bf248d2747cad34cf530dd2c5e43)), closes [#312](https://github.com/kittysaemi/KittyWallet/issues/312)
* **lint:** WalletTransactionsPage unused isCurrentPeriod 변수 제거 ([e1b9463](https://github.com/kittysaemi/KittyWallet/commit/e1b9463d1dac572adc5bda8334627d0db93657c1))


### Features

* **#312:** 할부 이자 통합, 할부 전환, 대시보드 최근 거래 개선 ([dca6570](https://github.com/kittysaemi/KittyWallet/commit/dca657078606eec384eb741409b0f2f91128ed54)), closes [#312](https://github.com/kittysaemi/KittyWallet/issues/312)
* **#312:** 할부 전체 삭제, 미래 할부 금액 수정, 지갑 거래내역 미래 달 네비게이션 ([7d21fa5](https://github.com/kittysaemi/KittyWallet/commit/7d21fa5db9c8bb9782d76d9b4e5e6221802cd54a)), closes [#312](https://github.com/kittysaemi/KittyWallet/issues/312)

## [1.22.3](https://github.com/kittysaemi/KittyWallet/compare/v1.22.2...v1.22.3) (2026-06-21)


### Bug Fixes

* **#313:** sync_failed 항목 자동 정리 및 거래내역 목록 표시 제외 ([7ca03e3](https://github.com/kittysaemi/KittyWallet/commit/7ca03e3ab4f4d69e1bff79a1a8078f9539499a6f)), closes [#313](https://github.com/kittysaemi/KittyWallet/issues/313)

## [1.22.2](https://github.com/kittysaemi/KittyWallet/compare/v1.22.1...v1.22.2) (2026-06-21)


### Bug Fixes

* **#313:** 할부 unique 위반 수정 및 오프라인 거래내역 표시 ([e1bcf11](https://github.com/kittysaemi/KittyWallet/commit/e1bcf116501e8a7f47663d33293d46da5521ae0e)), closes [#313](https://github.com/kittysaemi/KittyWallet/issues/313)

## [1.22.1](https://github.com/kittysaemi/KittyWallet/compare/v1.22.0...v1.22.1) (2026-06-21)


### Bug Fixes

* **#313:** 할부 sync clientTempId 원자적 설정 및 오프라인 캐시 보호 ([f5deafe](https://github.com/kittysaemi/KittyWallet/commit/f5deafea7cd1d2f973a24cc103fb70619bba4d91)), closes [#313](https://github.com/kittysaemi/KittyWallet/issues/313)
* Prisma create 시 syncClientId relation connect 문법 적용 ([e14aab5](https://github.com/kittysaemi/KittyWallet/commit/e14aab532e02aaf782cba40c96e13c50cab4a3d4))

# [1.22.0](https://github.com/kittysaemi/KittyWallet/compare/v1.21.0...v1.22.0) (2026-06-21)


### Features

* add unused icon cleanup UI ([27b3796](https://github.com/kittysaemi/KittyWallet/commit/27b3796b66752b3c167104a7d78e1aeee0638f5c))

# [1.21.0](https://github.com/kittysaemi/KittyWallet/compare/v1.20.0...v1.21.0) (2026-06-21)


### Features

* **#313:** 카드할부 오프라인 Sync Queue payload 처리 추가 ([7361c79](https://github.com/kittysaemi/KittyWallet/commit/7361c79ee1cee389400ce56283108c410fa8e84f)), closes [#313](https://github.com/kittysaemi/KittyWallet/issues/313)

# [1.20.0](https://github.com/kittysaemi/KittyWallet/compare/v1.19.0...v1.20.0) (2026-06-21)


### Features

* clean up unused icon snapshots ([6128428](https://github.com/kittysaemi/KittyWallet/commit/612842870969f486258a4dc7980cd2968e38e427))

# [1.19.0](https://github.com/kittysaemi/KittyWallet/compare/v1.18.0...v1.19.0) (2026-06-21)


### Features

* delete unused icons ([1511d2c](https://github.com/kittysaemi/KittyWallet/commit/1511d2c2d220d9c7a1046b7901569ce9858159ed))

# [1.18.0](https://github.com/kittysaemi/KittyWallet/compare/v1.17.0...v1.18.0) (2026-06-20)


### Bug Fixes

* **#312:** CI 오류 수정 - 테스트 타임존 고정 및 타입 오류 수정 ([ef8beca](https://github.com/kittysaemi/KittyWallet/commit/ef8becaba2ecea487cded41015a35209fdbf1231)), closes [#312](https://github.com/kittysaemi/KittyWallet/issues/312)
* **#312:** 지갑 드롭다운 계좌/카드 ID 충돌 수정 및 할부 개월수 범위 조정 ([39ab36c](https://github.com/kittysaemi/KittyWallet/commit/39ab36c30b682efccaf2b0c70d11a265b34f0592)), closes [#312](https://github.com/kittysaemi/KittyWallet/issues/312)


### Features

* **#312:** 카드할부 등록/수정/목록/상세 화면 구현 ([d1e915d](https://github.com/kittysaemi/KittyWallet/commit/d1e915d5ff5af6862425c990fc2b87935be71f58)), closes [#312](https://github.com/kittysaemi/KittyWallet/issues/312)

# [1.17.0](https://github.com/kittysaemi/KittyWallet/compare/v1.16.0...v1.17.0) (2026-06-20)


### Features

* add icon cleanup candidates ([b01e4bc](https://github.com/kittysaemi/KittyWallet/commit/b01e4bce0706558cd418a41148be87780fcf23f3))

# [1.16.0](https://github.com/kittysaemi/KittyWallet/compare/v1.15.0...v1.16.0) (2026-06-20)


### Bug Fixes

* **#311:** 테스트 파일 미사용 import 린트 에러 수정 ([7d91c62](https://github.com/kittysaemi/KittyWallet/commit/7d91c62ecc6ad5dc504f6a79a290a5dd97aa7b44)), closes [#311](https://github.com/kittysaemi/KittyWallet/issues/311)


### Features

* **#311:** 카드할부 백엔드 로직 구현 및 단위 테스트 추가 ([2d28a27](https://github.com/kittysaemi/KittyWallet/commit/2d28a27e0b1ba45b217dbde53c5f2831891caafb)), closes [#311](https://github.com/kittysaemi/KittyWallet/issues/311)

# [1.15.0](https://github.com/kittysaemi/KittyWallet/compare/v1.14.0...v1.15.0) (2026-06-20)


### Features

* **#310:** 카드할부 데이터 모델 및 거래 API 계약 추가 ([8a19872](https://github.com/kittysaemi/KittyWallet/commit/8a19872c607d8a277df4dfef7ba711bbd6c80c4e)), closes [#310](https://github.com/kittysaemi/KittyWallet/issues/310)

# [1.14.0](https://github.com/kittysaemi/KittyWallet/compare/v1.13.0...v1.14.0) (2026-06-20)


### Features

* **ui:** add icon snapshot fallback ([6ecb4e4](https://github.com/kittysaemi/KittyWallet/commit/6ecb4e4cc14f5a6a4452305ba3db4a21577111d2))

# [1.13.0](https://github.com/kittysaemi/KittyWallet/compare/v1.12.0...v1.13.0) (2026-06-20)


### Features

* **api:** add icon snapshot storage ([549d319](https://github.com/kittysaemi/KittyWallet/commit/549d31980221a20a7ceea222d3fb052b77df2e1e))

# [1.12.0](https://github.com/kittysaemi/KittyWallet/compare/v1.11.0...v1.12.0) (2026-06-20)


### Bug Fixes

* **statistics:** 탭 라벨 공백 제거 통일 및 테스트 업데이트 ([#299](https://github.com/kittysaemi/KittyWallet/issues/299) [#302](https://github.com/kittysaemi/KittyWallet/issues/302)) ([5bfcbfb](https://github.com/kittysaemi/KittyWallet/commit/5bfcbfb50bca3deffa1c9ad79c0c58026dc45115))


### Features

* **statistics:** 통계 탭 2줄 구조·소비흐름 탭·네비게이터 정책 적용 ([#299](https://github.com/kittysaemi/KittyWallet/issues/299) [#300](https://github.com/kittysaemi/KittyWallet/issues/300) [#301](https://github.com/kittysaemi/KittyWallet/issues/301)) ([5a98be8](https://github.com/kittysaemi/KittyWallet/commit/5a98be859bcb5ae58466a6faba977ef72aed1ca7))

# [1.11.0](https://github.com/kittysaemi/KittyWallet/compare/v1.10.0...v1.11.0) (2026-06-20)


### Features

* **tools:** add icon migration plan ([c147aad](https://github.com/kittysaemi/KittyWallet/commit/c147aadc4c2f26c64a80fc34937f7343a7fa0f5c))

# [1.10.0](https://github.com/kittysaemi/KittyWallet/compare/v1.9.0...v1.10.0) (2026-06-20)


### Features

* **tools:** add Lucide compatibility adapter ([70811af](https://github.com/kittysaemi/KittyWallet/commit/70811afda2150f2210e141650c399db91a7ad45e))

# [1.9.0](https://github.com/kittysaemi/KittyWallet/compare/v1.8.0...v1.9.0) (2026-06-19)


### Features

* **tools:** add icon compatibility core ([40ad8fd](https://github.com/kittysaemi/KittyWallet/commit/40ad8fd1798bb964173b057a7e87606df99be92c))

# [1.8.0](https://github.com/kittysaemi/KittyWallet/compare/v1.7.1...v1.8.0) (2026-06-19)


### Bug Fixes

* **frontend:** 소비통계 Top5 주별→월별 전환 시 날짜 이동 불가 버그 수정 ([#172](https://github.com/kittysaemi/KittyWallet/issues/172)) ([08f85e2](https://github.com/kittysaemi/KittyWallet/commit/08f85e2087796d51640d6c641bb6164c03117a26))
* week label start date consistently shows il suffix ([34f3140](https://github.com/kittysaemi/KittyWallet/commit/34f3140e11dffc1d031dc0e5c091cb6d7b9143a6))
* 월별 모드에서 미래 날짜(일)로 baseDate 설정되는 버그 수정 ([779a76f](https://github.com/kittysaemi/KittyWallet/commit/779a76f053d98dc3c55323869a1dd261447d2903))


### Features

* apply compact week label with year prefix to wallet transactions page ([35350e3](https://github.com/kittysaemi/KittyWallet/commit/35350e359af365ac67e20f755bd1c66116ddf4bf))
* week label compact slash format with short year prefix ([9202e30](https://github.com/kittysaemi/KittyWallet/commit/9202e308dd321b03d47f6c4362526e85bfd5bf79))
* week label omits redundant month for same-month weeks ([445b613](https://github.com/kittysaemi/KittyWallet/commit/445b6134e3aa978a11c18487bb2beb6b1fec7353))
* week label shows year when not current year ([80301d0](https://github.com/kittysaemi/KittyWallet/commit/80301d0baed59c464c2613f28bc846316eec6fb3))
* week navigator shows year in small text above when not current year ([4219d91](https://github.com/kittysaemi/KittyWallet/commit/4219d9146a3fec3719c427e801cc84dbb6e3a2ea))
* 주별/월별 모드 전환 시 오늘 날짜로 초기화 ([5e79623](https://github.com/kittysaemi/KittyWallet/commit/5e79623c602473d9c9f8b17b757efafdd068046f))

## [1.7.1](https://github.com/kittysaemi/KittyWallet/compare/v1.7.0...v1.7.1) (2026-06-17)


### Bug Fixes

* **test:** 테스트 픽스처 타입 오류 수정 — icon_id null→number, use_yn 제거, TransactionItem 명시 ([35731fa](https://github.com/kittysaemi/KittyWallet/commit/35731fa0cacd6c95c944bc952114e6142e7837f9))

# [1.7.0](https://github.com/kittysaemi/KittyWallet/compare/v1.6.0...v1.7.0) (2026-06-17)


### Bug Fixes

* **frontend:** toDateValue 미사용 import 제거로 lint 오류 수정 ([e00159d](https://github.com/kittysaemi/KittyWallet/commit/e00159d4adc4512caeb74458391aad8e0056be20))


### Features

* **frontend:** 지갑별 거래내역 화면 및 공용 컴포넌트 구현 ([#283](https://github.com/kittysaemi/KittyWallet/issues/283) [#284](https://github.com/kittysaemi/KittyWallet/issues/284) [#285](https://github.com/kittysaemi/KittyWallet/issues/285)) ([8638e24](https://github.com/kittysaemi/KittyWallet/commit/8638e242316043ce86f78105b7498196006b8649))

# [1.6.0](https://github.com/kittysaemi/KittyWallet/compare/v1.5.3...v1.6.0) (2026-06-16)


### Features

* **api:** 거래 목록 지갑 필터 검증 및 카드 기간 지출 합계 지원 ([#282](https://github.com/kittysaemi/KittyWallet/issues/282)) ([e8596c8](https://github.com/kittysaemi/KittyWallet/commit/e8596c88863cca3ac19c26a2dd02666a28fa6f2f))

## [1.5.3](https://github.com/kittysaemi/KittyWallet/compare/v1.5.2...v1.5.3) (2026-06-14)


### Bug Fixes

* 대시보드 전체보기로 거래내역 진입 시 페이지·스크롤 초기화 ([6a935f7](https://github.com/kittysaemi/KittyWallet/commit/6a935f76581323a73cd881bcc9bbfb9906bdd251))

## [1.5.2](https://github.com/kittysaemi/KittyWallet/compare/v1.5.1...v1.5.2) (2026-06-14)


### Bug Fixes

* **ui:** 아이콘 관리 등록버튼 스타일을 계좌·카드·카테고리와 통일 ([df9248c](https://github.com/kittysaemi/KittyWallet/commit/df9248c9870b1c956c56d0ddc5a03aab475185e4))
* **ui:** 아이콘 등록버튼 항상 표시 및 토글 방식으로 변경 ([c5d0c21](https://github.com/kittysaemi/KittyWallet/commit/c5d0c2187cedd9e4fa0d9f9ae6c3ea02912ac0fd))

## [1.5.1](https://github.com/kittysaemi/KittyWallet/compare/v1.5.0...v1.5.1) (2026-06-14)


### Bug Fixes

* **ui:** 거래 수정 후 거래내역 페이지 위치 초기화 버그 수정 ([#272](https://github.com/kittysaemi/KittyWallet/issues/272)) ([c4c5771](https://github.com/kittysaemi/KittyWallet/commit/c4c57710baabf19f5bf655c0a801c39217c854c3))
* 거래 수정 후 페이지/스크롤 위치 초기화 및 비활성 카드 404 오류 수정 ([2c276a5](https://github.com/kittysaemi/KittyWallet/commit/2c276a5e3f52d064431522f4bc59f32db03b271f))

# [1.5.0](https://github.com/kittysaemi/KittyWallet/compare/v1.4.0...v1.5.0) (2026-06-14)


### Features

* **ui:** 카테고리 관리 통계 제외 바텀시트 추가 ([#256](https://github.com/kittysaemi/KittyWallet/issues/256)) ([692eb98](https://github.com/kittysaemi/KittyWallet/commit/692eb9805e34c4f05ba8846069a6d120192644dc))

# [1.4.0](https://github.com/kittysaemi/KittyWallet/compare/v1.3.1...v1.4.0) (2026-06-14)


### Features

* **api:** apply category statistics inclusion ([cb203a5](https://github.com/kittysaemi/KittyWallet/commit/cb203a5f217a8a6820616df0b02e8fff53ab710b))

## [1.3.1](https://github.com/kittysaemi/KittyWallet/compare/v1.3.0...v1.3.1) (2026-06-14)


### Bug Fixes

* **frontend:** iOS Chrome 하단 네비게이션바 고정 안 됨 수정 (100vh → 100dvh) ([51bd914](https://github.com/kittysaemi/KittyWallet/commit/51bd91473a1e75dc4cae9002bb94eb7f08ecee47)), closes [#251](https://github.com/kittysaemi/KittyWallet/issues/251)

# [1.3.0](https://github.com/kittysaemi/KittyWallet/compare/v1.2.4...v1.3.0) (2026-06-13)


### Features

* **settings:** 시간대 설정 기능 추가 및 날짜 계산 전체 적용 ([#249](https://github.com/kittysaemi/KittyWallet/issues/249)) ([a50220a](https://github.com/kittysaemi/KittyWallet/commit/a50220a34361c3f6cdf8202cd7d9e4622edf3418))

## [1.2.4](https://github.com/kittysaemi/KittyWallet/compare/v1.2.3...v1.2.4) (2026-06-13)


### Bug Fixes

* app.tsx 머지 충돌 마커 제거 ([34a6dfe](https://github.com/kittysaemi/KittyWallet/commit/34a6dfe95b732c6d4c52cb656cc915297a8b9b3f))
* **settings:** iOS 전용 — 테마 미리보기 시 localStorage 변경 방지 ([aa594fa](https://github.com/kittysaemi/KittyWallet/commit/aa594fa3e81595449bc644e9684f4ae07bc00b0f))

## [1.2.3](https://github.com/kittysaemi/KittyWallet/compare/v1.2.2...v1.2.3) (2026-06-13)


### Bug Fixes

* **pwa:** iOS 환경에서만 파싱 시점에 favicon 테마 교체 ([ca0a96f](https://github.com/kittysaemi/KittyWallet/commit/ca0a96f90160d00322ea95b6b38924cf75f41728))

## [1.2.2](https://github.com/kittysaemi/KittyWallet/compare/v1.2.1...v1.2.2) (2026-06-13)


### Bug Fixes

* **pwa:** favicon URL에 타임스탬프 쿼리 추가로 iOS WebKit 캐시 우회 ([cc6668f](https://github.com/kittysaemi/KittyWallet/commit/cc6668f500bd3a6e4351fe59adc1e74d1b7404fc))

## [1.2.1](https://github.com/kittysaemi/KittyWallet/compare/v1.2.0...v1.2.1) (2026-06-13)


### Bug Fixes

* **pwa:** 테마 변경 시 파비콘 DOM 요소 교체로 Chrome 재fetch 강제 ([9fc9aa0](https://github.com/kittysaemi/KittyWallet/commit/9fc9aa01c088404b26981491d8e6c2da48e799f6)), closes [#238](https://github.com/kittysaemi/KittyWallet/issues/238)

# [1.2.0](https://github.com/kittysaemi/KittyWallet/compare/v1.1.0...v1.2.0) (2026-06-13)


### Bug Fixes

* **e2e:** pwa_check manifest link 셀렉터 수정 ([7c4bccd](https://github.com/kittysaemi/KittyWallet/commit/7c4bccdafbeb6e6b466dce5605a27197edf7222e)), closes [#manifest-link](https://github.com/kittysaemi/KittyWallet/issues/manifest-link)
* **pwa:** manifest 동적 교체 방식 수정 — Vite 플러그인 + 쿠키 기반 ([002dbdd](https://github.com/kittysaemi/KittyWallet/commit/002dbdd2ac8cb61f0fe2df080173c8b92afdbb9a))


### Features

* **pwa:** manifest 동적 서빙 엔드포인트 구현 ([#238](https://github.com/kittysaemi/KittyWallet/issues/238)) ([0e03a19](https://github.com/kittysaemi/KittyWallet/commit/0e03a19a9c79a253145d2102a6e0ea0c8501ec5f)), closes [#manifest-link](https://github.com/kittysaemi/KittyWallet/issues/manifest-link)

# [1.1.0](https://github.com/kittysaemi/KittyWallet/compare/v1.0.3...v1.1.0) (2026-06-13)


### Features

* **pwa:** 테마별 앱 아이콘 패키지 적용 ([#239](https://github.com/kittysaemi/KittyWallet/issues/239)) ([bf29faa](https://github.com/kittysaemi/KittyWallet/commit/bf29faa2dd95d0aeae0bad7cb1fb0b53d0e4115c))

## [1.0.3](https://github.com/kittysaemi/KittyWallet/compare/v1.0.2...v1.0.3) (2026-06-13)


### Bug Fixes

* **theme:** THEME_PRIMARY_COLORS 헥스값 소문자로 수정 (E2E 테스트 통과) ([305a0c2](https://github.com/kittysaemi/KittyWallet/commit/305a0c286daa8d80201296ff29322b6a3c8f184d))
* **ui:** Top5 주별 수입 표시 및 테마색 새로고침/PWA 타이틀바 수정 ([9fb7d53](https://github.com/kittysaemi/KittyWallet/commit/9fb7d536f34153babbb78006afdcc2086e575897))

## [1.0.2](https://github.com/kittysaemi/KittyWallet/compare/v1.0.1...v1.0.2) (2026-06-13)


### Bug Fixes

* **statistics:** Sankey 링크 가로 길이 확장 (NODE_W 95, gap 70px) ([ec4297a](https://github.com/kittysaemi/KittyWallet/commit/ec4297aad50014405af564dfd5bd8b45391beddf))

## [1.0.1](https://github.com/kittysaemi/KittyWallet/compare/v1.0.0...v1.0.1) (2026-06-13)


### Bug Fixes

* **statistics:** Sankey 그래프 지갑별 분류 및 UI 개선 ([a1edd6b](https://github.com/kittysaemi/KittyWallet/commit/a1edd6bc7e1793dae1d81981ce83263280a0299e)), closes [#172](https://github.com/kittysaemi/KittyWallet/issues/172)
* **test:** 프론트엔드 Sankey 테스트 mock 노드 ID 업데이트 ([ba8f613](https://github.com/kittysaemi/KittyWallet/commit/ba8f6135836ede039a3577cc8988aed82306745f))

# 1.0.0 (2026-06-13)


### Bug Fixes

* [#172](https://github.com/kittysaemi/KittyWallet/issues/172) 후속 UI 버그 수정 ([dbd90e5](https://github.com/kittysaemi/KittyWallet/commit/dbd90e519dc15e6aa800abcc7a8ed4cbcbb4f66a))
* **#172:** UI 버그 수정 — Bug 5·6 및 추가 발견 버그 처리 ([fb0ceb5](https://github.com/kittysaemi/KittyWallet/commit/fb0ceb5f561cab72c0e77a38146fa48e4f781b22)), closes [#172](https://github.com/kittysaemi/KittyWallet/issues/172)
* **auth:** remove status field reference from refresh-token use case ([3e558d2](https://github.com/kittysaemi/KittyWallet/commit/3e558d25a7acea6298cb3749563e863ae2ea7903))
* **dashboard:** 대시보드 UI 개편 및 lint 오류 수정 ([19cd810](https://github.com/kittysaemi/KittyWallet/commit/19cd810bcbefaf872ef93acc59a5e21a76cd016a))
* **e2e:** resolve strict mode violation in transaction test ([0fa5902](https://github.com/kittysaemi/KittyWallet/commit/0fa590237fce484e54aa6eec06f60f3dd7ebf931))
* **e2e:** transaction 테스트 셀렉터 업데이트 (거래 내역→전체 보기) ([08181b5](https://github.com/kittysaemi/KittyWallet/commit/08181b5b831ff2dde61534a2b64f6e57b489f3db))
* **e2e:** use context.route() to intercept Service Worker requests ([63900ef](https://github.com/kittysaemi/KittyWallet/commit/63900ef70612c0dbff607b0f04e523d0aeb937a5))
* **e2e:** 대시보드 API mock 추가 및 테스트 셀렉터 업데이트 ([ba81475](https://github.com/kittysaemi/KittyWallet/commit/ba814759aeef4a66ec404320602c89fb2871d20c))
* **frontend:** resolve issue 172 ui bugs ([992dfbc](https://github.com/kittysaemi/KittyWallet/commit/992dfbcb91710d551bfd5cffe54031973f9a8748))
* **frontend:** 미사용 Link import 제거 [#145](https://github.com/kittysaemi/KittyWallet/issues/145) ([8fcb8e3](https://github.com/kittysaemi/KittyWallet/commit/8fcb8e3e9112e43580c1afe5d9516e6ff865ba40))
* **frontend:** 배포 후 asset 캐시 갱신 ([bb4c487](https://github.com/kittysaemi/KittyWallet/commit/bb4c48712a86eda9e289704af1468a8ddcb7f60e))
* **icon:** run default seed during deploy ([d68b6ce](https://github.com/kittysaemi/KittyWallet/commit/d68b6ce608a378d9a7633226057ab40f2e10b211))
* **issue-195:** block decimal input on numeric amount fields ([70a3c03](https://github.com/kittysaemi/KittyWallet/commit/70a3c037622b41f5d40d71958dcd4b3ebfc63bb7))
* **issue-56:** enable PWA devOptions for CI E2E and fix manifest test ([1c513b1](https://github.com/kittysaemi/KittyWallet/commit/1c513b132124038b1c7cff085ac0392a2af13d86))
* **issue-58:** remove unused variable and import to pass lint ([826787a](https://github.com/kittysaemi/KittyWallet/commit/826787a68e5a0db16379474a203d6af2150f5f44))
* **issues-191-193:** add in-transaction balance guard and disable submit on insufficient balance ([268abf5](https://github.com/kittysaemi/KittyWallet/commit/268abf5c5597f9735dcde11ec004305c9a830f73)), closes [#191](https://github.com/kittysaemi/KittyWallet/issues/191) [#192](https://github.com/kittysaemi/KittyWallet/issues/192) [#193](https://github.com/kittysaemi/KittyWallet/issues/193)
* **management:** 이름 수정 Enter 비활성화 버그 및 명칭 커서 제거 ([8cfdef0](https://github.com/kittysaemi/KittyWallet/commit/8cfdef01ca69fa51e79840fb654c6a03cf93e9d7))
* Sankey 차트 높이 제한 및 수입 흐름 데이터 조회 보강 ([5df598f](https://github.com/kittysaemi/KittyWallet/commit/5df598fb22406359679eb6e032bdff2e11f6ff80))
* **statistics:** constrain Sankey SVG rendered height to viewBox height ([60c86f8](https://github.com/kittysaemi/KittyWallet/commit/60c86f88ff613f42fb1b1493c8d69867d599f702))
* **statistics:** reduce Sankey max height and guard income Top5 display ([071ac34](https://github.com/kittysaemi/KittyWallet/commit/071ac344bb6e5320c04edbe307c83889e509a992))
* **test:** resolve strict mode violation in Top5 category test ([908a670](https://github.com/kittysaemi/KittyWallet/commit/908a67044c85a7b37a146b40efb41b348d4d4b26))
* **transaction-form:** 결제수단→지갑, 잔액 힌트, 에러 파싱, 지갑 타입 판별 수정 ([f2f79ce](https://github.com/kittysaemi/KittyWallet/commit/f2f79ced70aa3dd796fc59f28bc2c57839c91d4e))
* UI/UX 확인 후 발견된 버그 4건 수정 ([#172](https://github.com/kittysaemi/KittyWallet/issues/172)) ([54303a1](https://github.com/kittysaemi/KittyWallet/commit/54303a146be272fd75de4653f9e4f9715ce156e7))
* **ui:** 전역 텍스트 커서 제거 및 거래 내역 지갑 정보 표시 ([2051153](https://github.com/kittysaemi/KittyWallet/commit/2051153448c2d8ddeb55611701e2aed0790902cd))
* update categories service test mock to include icon relation ([75c1098](https://github.com/kittysaemi/KittyWallet/commit/75c10984fff4fed841bbc7b71afd95ab9c60e17f))
* 버전 주입 방식을 vite define에서 직접 import로 변경 ([c6058e5](https://github.com/kittysaemi/KittyWallet/commit/c6058e54924eb02bf592ad977a7e79ffe17f0f8c))
* 버전 표시 위치를 앱 설정 페이지로 이동 ([8281584](https://github.com/kittysaemi/KittyWallet/commit/8281584810d46723070a00a4b3f1943de0ba5feb))
* 버전 표시를 카드 내부 저장 버튼 하단으로 이동 ([accd2ef](https://github.com/kittysaemi/KittyWallet/commit/accd2efceb466908cfc0a48c2edce51103aad718))
* 앱 설정 버전 표시 위치 조정 ([0851c4a](https://github.com/kittysaemi/KittyWallet/commit/0851c4ac1c9d1b9464bb225cbf3029e9c313c533))


### Features

* **#219:** add income flow Sankey and income Top 5 statistics ([ac40b56](https://github.com/kittysaemi/KittyWallet/commit/ac40b5637653d48008a738dbd9d56e3d3a65a17e)), closes [#219](https://github.com/kittysaemi/KittyWallet/issues/219)
* **account:** 계좌 DB 스키마 구성 (Prisma) ([8365ab9](https://github.com/kittysaemi/KittyWallet/commit/8365ab99bef4d289027ba8a36dfb774c7cfcb28c)), closes [#30](https://github.com/kittysaemi/KittyWallet/issues/30)
* **account:** 계좌 등록/수정 화면 구현 ([1f3c06f](https://github.com/kittysaemi/KittyWallet/commit/1f3c06f0f38370cf8298dccb44a3a2f70425c2d6)), closes [#33](https://github.com/kittysaemi/KittyWallet/issues/33)
* **account:** 계좌 목록 화면 구현 ([1228e8d](https://github.com/kittysaemi/KittyWallet/commit/1228e8d589042c855219ee3351fef52f9f222219)), closes [#32](https://github.com/kittysaemi/KittyWallet/issues/32)
* **account:** 계좌 비활성화 처리 및 AccountSelect 컴포넌트 구현 ([ab9f4a9](https://github.com/kittysaemi/KittyWallet/commit/ab9f4a903533be8c6546dff5c4e994d6dbc0445c)), closes [#34](https://github.com/kittysaemi/KittyWallet/issues/34)
* **account:** 계좌 조회/등록/수정 API 구현 ([81d827b](https://github.com/kittysaemi/KittyWallet/commit/81d827b496dfeb9d44379b960beacce792a08c31)), closes [#31](https://github.com/kittysaemi/KittyWallet/issues/31)
* **auth:** Prisma 스키마 구성 - USER, REFRESH_TOKEN 테이블 (서브이슈 2-1) ([0561cd3](https://github.com/kittysaemi/KittyWallet/commit/0561cd37420b2de91a4da49b4731617c7a97e4f2))
* **auth:** 비밀번호 재설정 API 구현 ([434e7bc](https://github.com/kittysaemi/KittyWallet/commit/434e7bc9d4ee2151f372e4d84ccf6b88decb29c4))
* **auth:** 비밀번호 재설정 요청 API 구현 ([ac0d248](https://github.com/kittysaemi/KittyWallet/commit/ac0d2484a375aeda364a44cc9e9346c73be4597b))
* **auth:** 프론트엔드 인증 상태 관리, 로그인/회원가입 화면, 라우터 가드 구현 (서브이슈 2-5 ~ 2-8) ([97fd7af](https://github.com/kittysaemi/KittyWallet/commit/97fd7af50590cc70831ec294df57a0ec388a5524))
* **auth:** 회원가입/로그인/토큰재발급/로그아웃 API 및 JWT Guard 구현 (서브이슈 2-2, 2-3, 2-4) ([e52333e](https://github.com/kittysaemi/KittyWallet/commit/e52333e90e885aa1a486dd93712ee7cfc932cc59))
* **card:** 카드 DB 스키마 구성 (Prisma) ([8a6ff5d](https://github.com/kittysaemi/KittyWallet/commit/8a6ff5d766ea819bc5643d72566cb9bfc466a523)), closes [#35](https://github.com/kittysaemi/KittyWallet/issues/35)
* **card:** 카드 목록/등록/수정 화면 구현 ([#37](https://github.com/kittysaemi/KittyWallet/issues/37) + [#38](https://github.com/kittysaemi/KittyWallet/issues/38)) ([b9537ac](https://github.com/kittysaemi/KittyWallet/commit/b9537ac3fc85997bde282ed6aa589e6306858fef))
* **card:** 카드 비활성화 처리 및 CardSelect 컴포넌트 구현 ([8302662](https://github.com/kittysaemi/KittyWallet/commit/83026625f707103d99009db58980ec62ea709d5b)), closes [#39](https://github.com/kittysaemi/KittyWallet/issues/39)
* **card:** 카드 조회/등록/수정 API 구현 ([8c3618c](https://github.com/kittysaemi/KittyWallet/commit/8c3618c13b62e5b0326e8cef3e2fa127ca5fcb1d)), closes [#36](https://github.com/kittysaemi/KittyWallet/issues/36)
* **category:** 카테고리 API 구현 ([cf394aa](https://github.com/kittysaemi/KittyWallet/commit/cf394aa1201c490dbd69de1a0e0c6fb8392f227c))
* **category:** 카테고리 관리 목록 화면 구현 ([64e0ca8](https://github.com/kittysaemi/KittyWallet/commit/64e0ca836da99bbcf85942fd9b2accda1515c59b))
* **category:** 카테고리 스키마 및 시드 추가 ([c5ddb23](https://github.com/kittysaemi/KittyWallet/commit/c5ddb23b5b87f00919cdd76731060dc6db625419))
* **dashboard-api:** 대시보드 조회 API 구현 [#93](https://github.com/kittysaemi/KittyWallet/issues/93) ([d4e963c](https://github.com/kittysaemi/KittyWallet/commit/d4e963c4b089e269275a87ec95340d87ce283b67))
* **dashboard-ui:** 대시보드 화면 구현 [#95](https://github.com/kittysaemi/KittyWallet/issues/95) ([438b261](https://github.com/kittysaemi/KittyWallet/commit/438b2616d88ff2d1fb7b842630cc2d70a290f9a8))
* **frontend:** 전체 화면 UI/UX 점검 및 브랜딩 개선 [#145](https://github.com/kittysaemi/KittyWallet/issues/145) ([940cf31](https://github.com/kittysaemi/KittyWallet/commit/940cf318bb9430453707a12eb86aa4b5db4f1e52))
* **icon:** provider 기반 아이콘 관리 구현 ([12cb485](https://github.com/kittysaemi/KittyWallet/commit/12cb485d1b91c9185c15390c134e1dd4af0a7c4d))
* **issue-154,issue-155:** UserStatus 제거 및 회원탈퇴 물리 삭제 구현 ([b48fee2](https://github.com/kittysaemi/KittyWallet/commit/b48fee242f2537efa866f1e69cb5cd0fb1de77d3)), closes [#154](https://github.com/kittysaemi/KittyWallet/issues/154) [#155](https://github.com/kittysaemi/KittyWallet/issues/155) [#152](https://github.com/kittysaemi/KittyWallet/issues/152) [#154](https://github.com/kittysaemi/KittyWallet/issues/154) [#155](https://github.com/kittysaemi/KittyWallet/issues/155)
* **issue-156:** 회원탈퇴 복구 불가 안내 및 로그인 실패 문구 정리 ([74d5235](https://github.com/kittysaemi/KittyWallet/commit/74d523578041cb214052f117666288b1aa5fd0ef)), closes [#152](https://github.com/kittysaemi/KittyWallet/issues/152) [#156](https://github.com/kittysaemi/KittyWallet/issues/156)
* **issue-194:** remove use_yn (account deactivation) feature ([9ca2a5f](https://github.com/kittysaemi/KittyWallet/commit/9ca2a5f193a06f06bb458c08293834f06024dbd5))
* **issue-56:** add PWA plugin, manifest, and install prompt handling ([aa74634](https://github.com/kittysaemi/KittyWallet/commit/aa74634145e8599d8d5feee4b0a356a6df7026e0))
* **issue-57:** configure Workbox runtime caching strategies and cache invalidation ([c061639](https://github.com/kittysaemi/KittyWallet/commit/c061639e4a28c38496e1c51b0d98903551a18004))
* **issue-58:** implement IndexedDB schema and repositories for offline storage ([9ccbeaf](https://github.com/kittysaemi/KittyWallet/commit/9ccbeaf28a4662f9cea4da9e13b09ba156072117))
* **pwa:** 오프라인 Sync Queue 동기화 구현 ([d3bd23f](https://github.com/kittysaemi/KittyWallet/commit/d3bd23f4942090c9e4d0aa37c13265bb7b8a8cf9)), closes [#59](https://github.com/kittysaemi/KittyWallet/issues/59) [#12](https://github.com/kittysaemi/KittyWallet/issues/12)
* **pwa:** 전역 오프라인 상태 UI 구현 ([b04e1aa](https://github.com/kittysaemi/KittyWallet/commit/b04e1aaa6d983bc80b947f8b9b98af822ad3ac4d)), closes [#60](https://github.com/kittysaemi/KittyWallet/issues/60) [#12](https://github.com/kittysaemi/KittyWallet/issues/12)
* semantic-release 자동화 및 설정 화면 버전 표시 추가 ([da1ad28](https://github.com/kittysaemi/KittyWallet/commit/da1ad28f2bb79c4584a4672d48ac155187533bee))
* **setting:** add app settings ui ([082d11a](https://github.com/kittysaemi/KittyWallet/commit/082d11ace35ae2e50e5f2cc6c9796da0ed003981))
* **setting:** add user setting schema ([f9c6bbd](https://github.com/kittysaemi/KittyWallet/commit/f9c6bbd05ebffa268135f3fafcc1a7cebfe1d849))
* **setting:** implement settings api ([e5e15d4](https://github.com/kittysaemi/KittyWallet/commit/e5e15d456c609e2567e58035f5139a9e99e01cef))
* **setting:** refine app settings screen ([e9786f5](https://github.com/kittysaemi/KittyWallet/commit/e9786f5e6ebdcdd08a6a6e70de7a56c7281c5438))
* **settings:** 사용자 프로필/회원탈퇴 UI 구현 [#99](https://github.com/kittysaemi/KittyWallet/issues/99) ([8e22f98](https://github.com/kittysaemi/KittyWallet/commit/8e22f981cf8c0b02a63c9e422c9ea15776afde2c))
* **statistics:** [#160](https://github.com/kittysaemi/KittyWallet/issues/160) 시각화 전용 API 4종 추가 (B안) ([8e4a649](https://github.com/kittysaemi/KittyWallet/commit/8e4a649332a49abe4a4bdf46a4c9f51a60483f5c)), closes [#158](https://github.com/kittysaemi/KittyWallet/issues/158)
* **statistics:** [#161](https://github.com/kittysaemi/KittyWallet/issues/161) 통계 화면 탭 기반 UI 구현 ([0ef2649](https://github.com/kittysaemi/KittyWallet/commit/0ef264964449ff2f8461f154fbe65718b102b52f))
* **statistics:** [#162](https://github.com/kittysaemi/KittyWallet/issues/162) 지출 흐름 Sankey 다이어그램 추가 ([28f2e1a](https://github.com/kittysaemi/KittyWallet/commit/28f2e1a375a53187c2ede10f1116d521081540a2))
* **statistics:** add chart statistics screen ([2703f87](https://github.com/kittysaemi/KittyWallet/commit/2703f87e6f133dcd1c9a35dc43cf4d01b2842baf))
* **statistics:** add period analysis view ([e82cd09](https://github.com/kittysaemi/KittyWallet/commit/e82cd091dcddd753a040c99d50c41ee206b1ae9f))
* **statistics:** 통계 집계 API 구현 ([6c3e67c](https://github.com/kittysaemi/KittyWallet/commit/6c3e67ce49e9a1e7b1995cf56c963b15af29b95c))
* **transaction-search:** 거래 검색 화면 구현 [#52](https://github.com/kittysaemi/KittyWallet/issues/52) ([c0447be](https://github.com/kittysaemi/KittyWallet/commit/c0447be7cee0e13bbaa3fedcf3b1b6117a4bdf12))
* **transaction:** 거래 DB 스키마 구성 (Prisma) [#44](https://github.com/kittysaemi/KittyWallet/issues/44) ([55b1a4b](https://github.com/kittysaemi/KittyWallet/commit/55b1a4b1c516bc4e3cb3b458df5d7094eb4db7ca))
* **transaction:** 거래 검색 API - keyword 대소문자 구분 없는 검색 적용 [#48](https://github.com/kittysaemi/KittyWallet/issues/48) ([2a7f43c](https://github.com/kittysaemi/KittyWallet/commit/2a7f43ca12c2993e0e83e483b56009a9ca24575c))
* **transaction:** 거래 등록 API 구현 [#45](https://github.com/kittysaemi/KittyWallet/issues/45) ([988eb3e](https://github.com/kittysaemi/KittyWallet/commit/988eb3ea7afac7b055b031ff4e4326439dd69be8))
* **transaction:** 거래 등록 화면 구현 [#50](https://github.com/kittysaemi/KittyWallet/issues/50) ([ba2c611](https://github.com/kittysaemi/KittyWallet/commit/ba2c611b3b1b394090b0e47d245818f336fe883b))
* **transaction:** 거래 목록/조회 API 구현 [#46](https://github.com/kittysaemi/KittyWallet/issues/46) ([2f37750](https://github.com/kittysaemi/KittyWallet/commit/2f37750bb72271e1379351aae6c2b87aaf7f9278))
* **transaction:** 거래 목록/홈 화면 구현 [#49](https://github.com/kittysaemi/KittyWallet/issues/49) ([911bbe3](https://github.com/kittysaemi/KittyWallet/commit/911bbe38e79d80b0491ad4ccedb3297fbf5b8704))
* **transaction:** 거래 수정/삭제 API 구현 [#47](https://github.com/kittysaemi/KittyWallet/issues/47) ([35feda4](https://github.com/kittysaemi/KittyWallet/commit/35feda49cdcd96aa22716e9be2793672e8ead467))
* **transaction:** 거래 수정/삭제 처리 [#51](https://github.com/kittysaemi/KittyWallet/issues/51) ([20ee7cb](https://github.com/kittysaemi/KittyWallet/commit/20ee7cb6444ed47c58ab8bbac6cd6d27ab1f10c5))
* **transaction:** 등록 폼 드롭다운 + 목록 카테고리 아이콘 적용 [#50](https://github.com/kittysaemi/KittyWallet/issues/50) ([0cfd96f](https://github.com/kittysaemi/KittyWallet/commit/0cfd96f50ede388bc66f88b740ab18d8821caf07))
* **users:** 사용자 조회/프로필 수정 API 구현 [#97](https://github.com/kittysaemi/KittyWallet/issues/97) ([045e184](https://github.com/kittysaemi/KittyWallet/commit/045e184767898ed5c48a445003103a5873bd1e12))
* **users:** 회원 탈퇴 API 구현 [#98](https://github.com/kittysaemi/KittyWallet/issues/98) ([b6c81c8](https://github.com/kittysaemi/KittyWallet/commit/b6c81c87d8939595a13276511915bfdd17f6cbe3))
* 계좌/카드 아카이브, 삭제된 지갑 거래 처리, 거래내역 UI 개선 ([5e672cc](https://github.com/kittysaemi/KittyWallet/commit/5e672cc1a71ed70702955a0bc59f0e7562ed9178))

# Changelog

All notable changes to KittyWallet will be documented in this file.

<!-- semantic-release will append entries below this line -->
