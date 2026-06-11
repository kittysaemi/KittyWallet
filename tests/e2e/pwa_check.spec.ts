import { test, expect, chromium } from '@playwright/test';
import { installE2EApiFixtures } from './fixtures/api';

const FAKE_JWT = "eyJhbGciOiJub25lIn0.eyJzdWIiOiIxMDAxIn0.fake";

async function fulfillJson(route: import('@playwright/test').Route, status: number, body: unknown) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

test('PWA: manifest 및 SW 파일 서빙 확인', async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // manifest.webmanifest 내용 확인
  await page.goto('http://localhost:4173/manifest.webmanifest');
  const manifest = JSON.parse(await page.evaluate(() => document.body.innerText));
  expect(manifest.name).toBe('KittyWallet');
  expect(manifest.short_name).toBe('KittyWall');
  expect(manifest.display).toBe('standalone');
  expect(manifest.theme_color).toBe('#fda5e3');
  expect(manifest.icons).toHaveLength(3);
  expect(manifest.icons.some((i: {purpose?: string}) => i.purpose?.includes('maskable'))).toBe(true);

  // sw.js 서빙 확인
  const swRes = await page.goto('http://localhost:4173/sw.js');
  expect(swRes?.status()).toBe(200);

  // HTML에 manifest 링크 및 theme-color 확인
  await page.goto('http://localhost:4173/');
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
  const themeColor = await page.locator('meta[name="theme-color"]').getAttribute('content');
  expect(themeColor).toBe('#fda5e3');

  await browser.close();
});

test('PWA: 설치 배너 — installable 상태에서 표시, 닫기 후 숨김 및 localStorage 기록', async ({ page }) => {
  // auth/refresh를 FAKE_JWT로 먼저 등록 (Playwright는 나중에 등록한 route가 우선)
  // → installE2EApiFixtures 먼저 호출 후 auth/refresh 덮어쓰기
  await installE2EApiFixtures(page);
  await page.route('**/api/v1/auth/refresh', (route) =>
    fulfillJson(route, 200, { success: true, data: { access_token: FAKE_JWT }, error: null })
  );

  await page.goto('/dashboard');
  await expect(page.locator('text=안녕하세요')).toBeVisible({ timeout: 10000 });

  // 기본(unsupported) 상태에서는 배너 없음
  expect(await page.locator('text=KittyWallet을 홈 화면에 설치해보세요.').count()).toBe(0);

  // beforeinstallprompt 이벤트 dispatch → installable 상태 진입
  await page.evaluate(() => {
    const event = Object.assign(new Event('beforeinstallprompt'), {
      prompt: async () => {},
      userChoice: Promise.resolve({ outcome: 'dismissed' }),
    });
    window.dispatchEvent(event);
  });

  await expect(page.locator('text=KittyWallet을 홈 화면에 설치해보세요.')).toBeVisible({ timeout: 3000 });
  await expect(page.getByRole('button', { name: '설치하기' })).toBeVisible();

  // 닫기 클릭 → 배너 사라짐
  await page.getByRole('button', { name: '설치 안내 닫기' }).click();
  await expect(page.locator('text=KittyWallet을 홈 화면에 설치해보세요.')).toBeHidden();

  // dismissed 시각이 localStorage에 기록됨
  const dismissed = await page.evaluate(() => localStorage.getItem('installDismissedAt'));
  expect(dismissed).not.toBeNull();
});
