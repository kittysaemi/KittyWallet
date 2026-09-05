import { expect, test } from "@playwright/test";
import { installTransferE2EFixtures } from "./fixtures/transferApi";

async function login(page: Parameters<typeof installTransferE2EFixtures>[0]) {
  await page.goto("/kittywallet/login");
  await page.getByLabel("이메일").fill("test@example.com");
  await page.getByLabel("비밀번호").fill("password123");
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/kittywallet\/dashboard$/);
}

test("E2E-TRANSFER-001 계좌이동 생성 → 라벨 노출 → 상세 → 수정(방향 전환) → 삭제", async ({ page }) => {
  await installTransferE2EFixtures(page);
  await login(page);

  // 1) 지갑별 거래내역에서 계좌이동 진입 (issue #391 빠른 진입점)
  await page.goto("/kittywallet/accounts/2001/transactions");
  await page.getByRole("button", { name: "거래등록/계좌이동" }).click();
  await page.getByRole("button", { name: "계좌이동", exact: true }).click();
  await expect(page).toHaveURL(/\/kittywallet\/transfer\/new\?fromAccountId=2001$/);

  // 보내는 계좌는 진입한 지갑으로 고정, 받는 계좌만 선택
  const [fromSelect, toSelect] = await page.getByRole("combobox").all();
  await expect(fromSelect).toBeDisabled();
  await toSelect.selectOption("2002");
  await page.getByLabel("이동 금액").fill("30000");
  await page.getByRole("button", { name: "계좌이동 등록" }).click();
  // 지갑별 거래내역에서 진입했으므로 일반 거래내역이 아니라 원래 지갑 화면으로 돌아온다 (#409)
  await expect(page).toHaveURL(/\/kittywallet\/accounts\/2001\/transactions$/);

  // 2) 지갑별 거래내역에 "계좌이동" 라벨 노출 확인 (양쪽 계좌 모두)
  await page.goto("/kittywallet/accounts/2001/transactions");
  await expect(page.getByText("계좌이동", { exact: true })).toBeVisible();
  await expect(page.getByText("-30,000원")).toBeVisible();

  await page.goto("/kittywallet/accounts/2002/transactions");
  await expect(page.getByText("계좌이동", { exact: true })).toBeVisible();
  await expect(page.getByText("+30,000원")).toBeVisible();

  // 3) 상세화면에서 계좌/금액 확인
  await page.goto("/kittywallet/accounts/2001/transactions");
  await page.getByText("계좌금액이동", { exact: true }).click();
  await expect(page).toHaveURL(/\/kittywallet\/transactions\/\d+$/);
  await expect(page.getByText("생활비 통장 (계좌)")).toBeVisible();
  await expect(page.getByText("-30,000원")).toBeVisible();

  // 4) 수정 화면 진입 후 방향 전환
  await page.getByRole("button", { name: "거래 수정" }).click();
  await expect(page).toHaveURL(/\/kittywallet\/transactions\/\d+\/edit$/);
  await expect(page.getByRole("heading", { name: "계좌이동 수정" })).toBeVisible();

  const [editFrom] = await page.getByRole("combobox").all();
  await expect(editFrom).toHaveValue("2001");
  await page.getByRole("button", { name: "보내는 계좌와 받는 계좌 서로 바꾸기" }).click();
  await expect(editFrom).toHaveValue("2002");
  await page.getByRole("button", { name: "수정 완료" }).click();
  // 이슈 #353: 수정 완료 후에는 원래 진입했던 지갑 거래내역 화면(여기서는 2001 계좌)으로 복귀한다.
  await expect(page).toHaveURL(/\/kittywallet\/accounts\/2001\/transactions$/);

  // 방향이 바뀌었으므로 2001은 이제 받는 계좌(입금), 2002는 보내는 계좌(출금)
  await page.goto("/kittywallet/accounts/2001/transactions");
  await expect(page.getByText("+30,000원")).toBeVisible();
  await page.goto("/kittywallet/accounts/2002/transactions");
  await expect(page.getByText("-30,000원")).toBeVisible();

  // 5) 삭제까지 전체 플로우
  await page.getByText("계좌금액이동", { exact: true }).click();
  await page.getByRole("button", { name: "거래 수정" }).click();
  await page.getByRole("button", { name: "거래 삭제" }).click();
  await page.getByRole("button", { name: "삭제", exact: true }).click();
  // 이슈 #353: 삭제 완료 후에도 원래 진입했던 지갑 거래내역 화면(여기서는 2002 계좌)으로 복귀한다.
  await expect(page).toHaveURL(/\/kittywallet\/accounts\/2002\/transactions$/);

  await page.goto("/kittywallet/accounts/2001/transactions");
  await expect(page.getByText("계좌이동", { exact: true })).toHaveCount(0);
  await expect(page.getByText("거래 내역이 없습니다")).toBeVisible();
  await page.goto("/kittywallet/accounts/2002/transactions");
  await expect(page.getByText("계좌이동", { exact: true })).toHaveCount(0);
  await expect(page.getByText("거래 내역이 없습니다")).toBeVisible();
});
