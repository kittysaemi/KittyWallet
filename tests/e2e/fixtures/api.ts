import type { Page, Route } from "@playwright/test";

type ApiBody = Record<string, unknown> | Array<unknown> | null;

interface TestTransaction {
  transaction_id: number;
  wallet_type: "ACCOUNT" | "CARD";
  wallet_id: number;
  wallet_name: string;
  category_id: number;
  category_name: string;
  transaction_type: "INCOME" | "EXPENSE";
  amount: number;
  memo: string | null;
  transaction_date: string;
  created_at: string;
  updated_at: string;
}

const testUser = {
  user_id: 1001,
  nickname: "테스트사용자"
};

const testAccount = {
  account_id: 2001,
  account_name: "생활비 통장",
  icon_id: 3001,
  initial_balance: 500000,
  current_balance: 500000,
  use_yn: true,
  created_at: "2026-06-04T00:00:00.000Z",
  updated_at: "2026-06-04T00:00:00.000Z"
};

const testCategory = {
  category_id: 4001,
  category_name: "점심",
  icon_id: 3002,
  show: true,
  is_default: true,
  editable: false,
  created_at: "2026-06-04T00:00:00.000Z",
  updated_at: "2026-06-04T00:00:00.000Z"
};

const testIcons = [
  {
    icon_id: 3001,
    icon_code: "icon-wallet",
    provider_type: "lucide",
    provider_key: "wallet",
    show: true,
    is_default: true,
    created_at: "2026-06-04T00:00:00.000Z",
    updated_at: "2026-06-04T00:00:00.000Z"
  },
  {
    icon_id: 3002,
    icon_code: "icon-sandwich",
    provider_type: "lucide",
    provider_key: "sandwich",
    show: true,
    is_default: true,
    created_at: "2026-06-04T00:00:00.000Z",
    updated_at: "2026-06-04T00:00:00.000Z"
  }
];

const success = (data: ApiBody) => ({ success: true, data, error: null });

async function fulfillJson(route: Route, status: number, body: ApiBody) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body)
  });
}

export async function installE2EApiFixtures(page: Page) {
  const transactions: TestTransaction[] = [];

  await page.route("**/api/v1/auth/refresh", async (route) => {
    await fulfillJson(route, 200, { success: false, data: null, error: null });
  });

  await page.route("**/api/v1/auth/signup", async (route) => {
    await fulfillJson(route, 201, success({ user_id: testUser.user_id }));
  });

  await page.route("**/api/v1/auth/login", async (route) => {
    await fulfillJson(
      route,
      200,
      success({
        access_token: "e2e-access-token",
        user: testUser
      })
    );
  });

  await page.route("**/api/v1/accounts**", async (route) => {
    await fulfillJson(route, 200, success({ items: [testAccount] }));
  });

  await page.route("**/api/v1/cards**", async (route) => {
    await fulfillJson(route, 200, success({ items: [] }));
  });

  await page.route("**/api/v1/categories**", async (route) => {
    await fulfillJson(route, 200, success({ items: [testCategory] }));
  });

  await page.route("**/api/v1/icons**", async (route) => {
    await fulfillJson(route, 200, success({ items: testIcons }));
  });

  await page.route("**/api/v1/transactions/recent**", async (route) => {
    await fulfillJson(route, 200, success({ items: transactions.slice(0, 5) }));
  });

  await page.route("**/api/v1/transactions**", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      const body = request.postDataJSON() as {
        amount: number;
        category_id: number;
        memo?: string;
        transaction_date: string;
        transaction_type: "INCOME" | "EXPENSE";
        wallet_id: number;
        wallet_type: "ACCOUNT" | "CARD";
      };
      const transaction: TestTransaction = {
        transaction_id: 5001,
        wallet_type: body.wallet_type,
        wallet_id: body.wallet_id,
        wallet_name: testAccount.account_name,
        category_id: body.category_id,
        category_name: testCategory.category_name,
        transaction_type: body.transaction_type,
        amount: body.amount,
        memo: body.memo ?? null,
        transaction_date: body.transaction_date,
        created_at: "2026-06-04T00:00:00.000Z",
        updated_at: "2026-06-04T00:00:00.000Z"
      };
      transactions.splice(0, transactions.length, transaction);
      await fulfillJson(
        route,
        201,
        success({
          transaction_id: transaction.transaction_id,
          updated_at: transaction.updated_at,
          synced_at: null
        })
      );
      return;
    }

    await fulfillJson(
      route,
      200,
      success({
        items: transactions,
        page: 1,
        limit: 20,
        total_count: transactions.length
      })
    );
  });
}
