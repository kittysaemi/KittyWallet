import type { Page, Route } from "@playwright/test";

type ApiBody = Record<string, unknown> | Array<unknown> | null;

interface TestTransaction {
  transaction_id: number;
  wallet_type: "ACCOUNT";
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
  transfer_group_id: string | null;
}

const testUser = { user_id: 2001, nickname: "테스트사용자" };

const accounts = [
  {
    account_id: 2001,
    account_name: "생활비 통장",
    icon_id: 3001,
    initial_balance: 500000,
    current_balance: 500000,
    allow_negative_balance: false,
    negative_balance_limit: 0,
    created_at: "2026-06-04T00:00:00.000Z",
    updated_at: "2026-06-04T00:00:00.000Z"
  },
  {
    account_id: 2002,
    account_name: "저축 통장",
    icon_id: 3001,
    initial_balance: 100000,
    current_balance: 100000,
    allow_negative_balance: false,
    negative_balance_limit: 0,
    created_at: "2026-06-04T00:00:00.000Z",
    updated_at: "2026-06-04T00:00:00.000Z"
  }
];

const accountNameById = new Map(accounts.map((a) => [a.account_id, a.account_name]));

const testCategory = {
  category_id: 9001,
  category_name: "계좌금액이동",
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
    icon_code: "icon-arrow-left-right",
    provider_type: "lucide",
    provider_key: "arrow-left-right",
    show: true,
    is_default: true,
    created_at: "2026-06-04T00:00:00.000Z",
    updated_at: "2026-06-04T00:00:00.000Z"
  }
];

const success = (data: ApiBody) => ({ success: true, data, error: null });

async function fulfillJson(route: Route, status: number, body: ApiBody) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

let nextTransactionId = 5001;
let nextTransferGroupId = 1;

export async function installTransferE2EFixtures(page: Page) {
  const transactions: TestTransaction[] = [];
  const ctx = page.context();

  await ctx.route("**/api/v1/dashboard**", async (route) => {
    await fulfillJson(route, 200, success({
      user: testUser,
      asset_summary: {
        total_asset_amount: 600000,
        account_count: accounts.length,
        active_account_count: accounts.length,
        card_count: 0,
        active_card_count: 0,
        currency: "KRW"
      },
      spending_summary: {
        period_type: "MONTH",
        start_date: "2026-09-01",
        end_date: "2026-09-30",
        income_amount: 0,
        expense_amount: 0,
        card_expense_amount: 0,
        net_amount: 0,
        transaction_count: 0
      },
      recent_transactions: [],
      sync_summary: { has_pending_sync: false, pending_count: 0, failed_count: 0, last_synced_at: null },
      cache_policy: { cacheable: true, recommended_stale_time_seconds: 60 }
    }));
  });

  await ctx.route("**/api/v1/auth/refresh", async (route) => {
    await fulfillJson(route, 200, { success: false, data: null, error: null });
  });

  await ctx.route("**/api/v1/auth/login", async (route) => {
    await fulfillJson(route, 200, success({ access_token: "e2e-access-token", user: testUser }));
  });

  await ctx.route("**/api/v1/settings**", async (route) => {
    await fulfillJson(route, 200, success({
      settings: { theme: "cat-pink", font_size: "medium", currency: "KRW" },
      updated_at: "2026-06-04T00:00:00.000Z"
    }));
  });

  await ctx.route("**/api/v1/accounts**", async (route) => {
    await fulfillJson(route, 200, success({ items: accounts }));
  });

  await ctx.route("**/api/v1/cards**", async (route) => {
    await fulfillJson(route, 200, success({ items: [] }));
  });

  await ctx.route("**/api/v1/categories**", async (route) => {
    await fulfillJson(route, 200, success({ items: [testCategory] }));
  });

  await ctx.route("**/api/v1/icons**", async (route) => {
    await fulfillJson(route, 200, success({ items: testIcons }));
  });

  // 계좌이동 관련 엔드포인트는 모두 /api/v1/transactions 아래에 있어(단건 조회 포함),
  // Playwright route 패턴 우선순위 문제를 피하기 위해 라우트 하나에서 경로를 직접 분기한다.
  await ctx.route("**/api/v1/transactions**", async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const path = url.pathname;

    if (path.endsWith("/transactions/recent")) {
      await fulfillJson(route, 200, success({ items: [] }));
      return;
    }

    if (path.endsWith("/transactions/transfer") && method === "POST") {
      const body = request.postDataJSON() as {
        from_account_id: number;
        to_account_id: number;
        amount: number;
        transaction_date: string;
        memo?: string;
      };
      const transferGroupId = `tg-${nextTransferGroupId++}`;
      const fromTx: TestTransaction = {
        transaction_id: nextTransactionId++,
        wallet_type: "ACCOUNT",
        wallet_id: body.from_account_id,
        wallet_name: accountNameById.get(body.from_account_id) ?? "",
        category_id: testCategory.category_id,
        category_name: testCategory.category_name,
        transaction_type: "EXPENSE",
        amount: body.amount,
        memo: body.memo ?? null,
        transaction_date: body.transaction_date,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        transfer_group_id: transferGroupId
      };
      const toTx: TestTransaction = {
        ...fromTx,
        transaction_id: nextTransactionId++,
        wallet_id: body.to_account_id,
        wallet_name: accountNameById.get(body.to_account_id) ?? "",
        transaction_type: "INCOME"
      };
      transactions.push(fromTx, toTx);
      await fulfillJson(route, 201, success({
        transfer_group_id: transferGroupId,
        from_transaction_id: fromTx.transaction_id,
        to_transaction_id: toTx.transaction_id,
        from_account_id: body.from_account_id,
        to_account_id: body.to_account_id,
        amount: body.amount,
        transaction_date: body.transaction_date,
        updated_at: fromTx.updated_at
      }));
      return;
    }

    const transferMatch = path.match(/\/transactions\/transfer\/([^/]+)$/);
    if (transferMatch) {
      const transferGroupId = transferMatch[1];
      const pair = transactions.filter((t) => t.transfer_group_id === transferGroupId);

      if (method === "GET") {
        const from = pair.find((t) => t.transaction_type === "EXPENSE")!;
        const to = pair.find((t) => t.transaction_type === "INCOME")!;
        await fulfillJson(route, 200, success({
          transfer_group_id: transferGroupId,
          from_transaction_id: from.transaction_id,
          to_transaction_id: to.transaction_id,
          from_account_id: from.wallet_id,
          to_account_id: to.wallet_id,
          amount: from.amount,
          transaction_date: from.transaction_date,
          updated_at: from.updated_at
        }));
        return;
      }

      if (method === "PATCH") {
        const body = request.postDataJSON() as {
          from_account_id?: number;
          to_account_id?: number;
          amount?: number;
          transaction_date?: string;
          memo?: string | null;
        };
        const from = pair.find((t) => t.transaction_type === "EXPENSE")!;
        const to = pair.find((t) => t.transaction_type === "INCOME")!;
        const fromAccountId = body.from_account_id ?? from.wallet_id;
        const toAccountId = body.to_account_id ?? to.wallet_id;
        const amount = body.amount ?? from.amount;
        const date = body.transaction_date ?? from.transaction_date;
        const memo = body.memo === undefined ? from.memo : body.memo;
        [from, to].forEach((t) => {
          t.amount = amount;
          t.transaction_date = date;
          t.memo = memo;
          t.updated_at = new Date().toISOString();
        });
        from.wallet_id = fromAccountId;
        from.wallet_name = accountNameById.get(fromAccountId) ?? "";
        to.wallet_id = toAccountId;
        to.wallet_name = accountNameById.get(toAccountId) ?? "";
        await fulfillJson(route, 200, success({
          transfer_group_id: transferGroupId,
          from_transaction_id: from.transaction_id,
          to_transaction_id: to.transaction_id,
          from_account_id: fromAccountId,
          to_account_id: toAccountId,
          amount,
          transaction_date: date,
          updated_at: from.updated_at
        }));
        return;
      }

      if (method === "DELETE") {
        const remaining = transactions.filter((t) => t.transfer_group_id !== transferGroupId);
        transactions.splice(0, transactions.length, ...remaining);
        await fulfillJson(route, 200, success(null));
        return;
      }
    }

    const singleMatch = path.match(/\/transactions\/(\d+)$/);
    if (singleMatch) {
      const transactionId = Number(singleMatch[1]);
      const tx = transactions.find((t) => t.transaction_id === transactionId);
      if (method === "GET" && tx) {
        await fulfillJson(route, 200, success({ ...tx, wallet_deleted: false }));
        return;
      }
    }

    if (method === "GET") {
      const walletId = url.searchParams.get("wallet_id");
      const items = walletId
        ? transactions.filter((t) => t.wallet_id === Number(walletId))
        : transactions;
      await fulfillJson(route, 200, success({
        items,
        page: 1,
        limit: 20,
        total_count: items.length,
        period_summary: { total_expense: 0 }
      }));
      return;
    }

    await route.continue();
  });
}

export { accounts as transferE2EAccounts, todayDate };
