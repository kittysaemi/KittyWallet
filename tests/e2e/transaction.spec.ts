import { expect, test } from "@playwright/test";
import { installE2EApiFixtures } from "./fixtures/api";

async function login(page: Parameters<typeof installE2EApiFixtures>[0]) {
  await page.goto("/kittywallet/login");
  await page.getByLabel("이메일").fill("test@example.com");
  await page.getByLabel("비밀번호").fill("password123");
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/kittywallet\/dashboard$/);
}

test("E2E-CORE-002 API mock: login and register account transaction", async ({ page }) => {
  await installE2EApiFixtures(page);
  await login(page);

  await page.getByRole("link", { name: /전체 보기/ }).click();
  await expect(page).toHaveURL(/\/kittywallet\/transactions$/);
  await page.getByRole("link", { name: "거래 등록" }).click();

  await expect(page).toHaveURL(/\/kittywallet\/transactions\/new$/);
  await page.getByLabel("금액").fill("15000");
  await page.getByRole("button", { name: "지갑 선택" }).click();
  await page.getByRole("button", { name: /생활비 통장/ }).click();
  await page.getByRole("button", { name: "카테고리 선택" }).click();
  await page.getByRole("button", { name: /점심/ }).click();
  await page.getByLabel("메모 (선택)").fill("점심 식사");
  await page.getByRole("button", { name: "거래 등록" }).click();

  await expect(page).toHaveURL(/\/kittywallet\/transactions$/);
  await expect(page.getByText("점심")).toBeVisible();
  await expect(page.getByText("생활비 통장")).toBeVisible();
  await expect(page.getByText("-15,000원").first()).toBeVisible();
});
