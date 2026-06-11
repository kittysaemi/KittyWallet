import { test, expect } from "@playwright/test";
import { installE2EApiFixtures } from "./fixtures/api";

const FAKE_JWT = "eyJhbGciOiJub25lIn0.eyJzdWIiOiIxMDAxIn0.fake";

async function fulfillJson(
  route: import("@playwright/test").Route,
  status: number,
  body: unknown
) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

test("PWA: HTML에 manifest 링크 및 theme-color meta 포함 확인", async ({
  page,
}) => {
  await page.goto("/");

  const manifestHref = await page
    .locator('link[rel="manifest"]')
    .getAttribute("href");
  expect(manifestHref).toBeTruthy();

  const themeColor = await page
    .locator('meta[name="theme-color"]')
    .getAttribute("content");
  expect(themeColor).toBe("#fda5e3");
});

test("PWA: manifest.webmanifest 내용 확인", async ({ page }) => {
  const res = await page.request.get("/manifest.webmanifest");
  expect(res.status()).toBe(200);

  const manifest = await res.json();
  expect(manifest.name).toBe("KittyWallet");
  expect(manifest.short_name).toBe("KittyWall");
  expect(manifest.display).toBe("standalone");
  expect(manifest.theme_color).toBe("#fda5e3");
  expect(manifest.icons).toHaveLength(3);
  expect(
    manifest.icons.some((i: { purpose?: string }) =>
      i.purpose?.includes("maskable")
    )
  ).toBe(true);
});

test("PWA: 설치 배너 — installable 상태에서 표시, 닫기 후 숨김 및 localStorage 기록", async ({
  page,
}) => {
  await installE2EApiFixtures(page);
  await page.route("**/api/v1/auth/refresh", (route) =>
    fulfillJson(route, 200, {
      success: true,
      data: { access_token: FAKE_JWT },
      error: null,
    })
  );

  await page.goto("/dashboard");
  await expect(page.locator("text=안녕하세요")).toBeVisible({ timeout: 10000 });

  expect(
    await page.locator("text=KittyWallet을 홈 화면에 설치해보세요.").count()
  ).toBe(0);

  await page.evaluate(() => {
    const event = Object.assign(new Event("beforeinstallprompt"), {
      prompt: async () => {},
      userChoice: Promise.resolve({ outcome: "dismissed" }),
    });
    window.dispatchEvent(event);
  });

  await expect(
    page.locator("text=KittyWallet을 홈 화면에 설치해보세요.")
  ).toBeVisible({ timeout: 3000 });
  await expect(page.getByRole("button", { name: "설치하기" })).toBeVisible();

  await page.getByRole("button", { name: "설치 안내 닫기" }).click();
  await expect(
    page.locator("text=KittyWallet을 홈 화면에 설치해보세요.")
  ).toBeHidden();

  const dismissed = await page.evaluate(() =>
    localStorage.getItem("installDismissedAt")
  );
  expect(dismissed).not.toBeNull();
});
