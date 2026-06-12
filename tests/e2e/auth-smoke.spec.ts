import { expect, test } from "@playwright/test";
import { installE2EApiFixtures } from "./fixtures/api";

test("login page renders", async ({ page }) => {
  await installE2EApiFixtures(page);

  await page.goto("/kittywallet/login");

  await expect(page.getByRole("heading", { name: "KittyWallet" })).toBeVisible();
  await expect(page.getByPlaceholder("example@email.com")).toBeVisible();
});

test("E2E-CORE-001 API mock: signup, login, and enter dashboard", async ({ page }) => {
  await installE2EApiFixtures(page);

  await page.goto("/kittywallet/signup");
  await page.getByLabel("이메일").fill("test@example.com");
  await page.getByLabel("비밀번호", { exact: true }).fill("password123");
  await page.getByLabel("비밀번호 확인").fill("password123");
  await page.getByLabel("닉네임").fill("테스트사용자");
  await page.getByRole("button", { name: "회원가입" }).click();

  await expect(page).toHaveURL(/\/kittywallet\/login$/);

  await page.getByLabel("이메일").fill("test@example.com");
  await page.getByLabel("비밀번호").fill("password123");
  await page.getByRole("button", { name: "로그인" }).click();

  await expect(page).toHaveURL(/\/kittywallet\/dashboard$/);
  await expect(page.getByText("안녕하세요")).toBeVisible();
  await expect(page.getByText("테스트사용자")).toBeVisible();
  await expect(page.getByRole("button", { name: "로그아웃" })).toBeVisible();
});
