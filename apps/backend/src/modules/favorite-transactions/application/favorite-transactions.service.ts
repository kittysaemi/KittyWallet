import { HttpStatus, Injectable } from "@nestjs/common";
import { Account } from "@prisma/client";
import { AppException } from "../../../common/exceptions/app.exception";
import {
  FavoriteTransactionsRepository,
  FavoriteTransactionWithCategory
} from "../infrastructure/favorite-transactions.repository";

type TransactionType = "INCOME" | "EXPENSE";
type WalletType = "ACCOUNT" | "CARD";

export interface FavoriteTransactionItem {
  favorite_transaction_id: number;
  transaction_type: TransactionType;
  wallet_type: WalletType;
  wallet_id: number;
  wallet_name: string;
  wallet_use_yn: boolean;
  wallet_deleted: boolean;
  category_id: number;
  category_name: string;
  category_show: boolean;
  amount: number;
  memo: string | null;
  balance_insufficient: boolean;
  created_at: string;
  updated_at: string;
}

export interface SaveFavoriteTransactionCommand {
  userId: bigint;
  transactionType: TransactionType;
  walletType: WalletType;
  walletId: bigint;
  categoryId: bigint;
  amount: number;
  memo?: string;
}

export interface SaveFavoriteTransactionResult {
  favorite_transaction_id: number;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class FavoriteTransactionsService {
  constructor(private readonly repository: FavoriteTransactionsRepository) {}

  async getFavoriteTransactions(userId: bigint): Promise<{ items: FavoriteTransactionItem[] }> {
    const favorites = await this.repository.findMany(userId);
    const accountIds = favorites.filter((f) => f.walletType === "ACCOUNT").map((f) => f.walletId);
    const cardIds = favorites.filter((f) => f.walletType === "CARD").map((f) => f.walletId);
    const [accounts, cards] = await Promise.all([
      this.repository.findAccountsByIds(userId, accountIds),
      this.repository.findCardsByIds(userId, cardIds)
    ]);
    const accountMap = new Map(accounts.map((a) => [String(a.accountId), a]));
    const cardMap = new Map(cards.map((c) => [String(c.cardId), c]));

    return {
      items: favorites.map((favorite) => {
        const amount = favorite.amount.toNumber();
        if (favorite.walletType === "ACCOUNT") {
          const account = accountMap.get(String(favorite.walletId));
          return this.toItem(favorite, {
            name: account?.accountName ?? "",
            // 계좌에는 사용 여부(use_yn) 값이 없어 삭제 여부로만 사용 가능 상태를 판단한다.
            useYn: true,
            deleted: !account || account.deletedYn,
            balanceInsufficient:
              favorite.transactionType === "EXPENSE" && !!account && isBalanceShort(account, amount)
          });
        }
        const card = cardMap.get(String(favorite.walletId));
        return this.toItem(favorite, {
          name: card?.cardName ?? "",
          useYn: card?.useYn ?? false,
          deleted: !card || card.deletedYn,
          balanceInsufficient: false
        });
      })
    };
  }

  async createFavoriteTransaction(
    command: SaveFavoriteTransactionCommand
  ): Promise<SaveFavoriteTransactionResult> {
    await this.assertSavable(command);
    const created = await this.repository.create({
      userId: command.userId,
      transactionType: command.transactionType,
      walletType: command.walletType,
      walletId: command.walletId,
      categoryId: command.categoryId,
      amount: command.amount,
      memo: normalizeMemo(command.memo)
    });
    return toSaveResult(created);
  }

  async updateFavoriteTransaction(
    favoriteTransactionId: bigint,
    command: SaveFavoriteTransactionCommand
  ): Promise<SaveFavoriteTransactionResult> {
    await this.assertExists(favoriteTransactionId, command.userId);
    await this.assertSavable(command);
    // created_at은 목록 최신순 기준이므로 수정하지 않는다.
    const updated = await this.repository.update(favoriteTransactionId, {
      transactionType: command.transactionType,
      walletType: command.walletType,
      walletId: command.walletId,
      categoryId: command.categoryId,
      amount: command.amount,
      memo: normalizeMemo(command.memo)
    });
    return toSaveResult(updated);
  }

  async deleteFavoriteTransaction(
    favoriteTransactionId: bigint,
    userId: bigint
  ): Promise<{ favorite_transaction_id: number }> {
    await this.assertExists(favoriteTransactionId, userId);
    await this.repository.update(favoriteTransactionId, { deletedYn: true });
    return { favorite_transaction_id: Number(favoriteTransactionId) };
  }

  // 거래 등록 API와 같은 기준으로 검증한다. 날짜와 잔액은 검증하지 않는다(거래정책.md 11.1).
  private async assertSavable(command: SaveFavoriteTransactionCommand): Promise<void> {
    if (command.transactionType === "INCOME" && command.walletType === "CARD") {
      throw new AppException(
        "TX_007",
        "카드로 수입 거래를 저장할 수 없습니다.",
        HttpStatus.BAD_REQUEST
      );
    }
    if (!Number.isInteger(command.amount) || command.amount <= 0) {
      throw new AppException("TX_002", "금액은 0보다 커야 합니다.", HttpStatus.BAD_REQUEST);
    }
    const category = await this.repository.findCategory(command.categoryId, command.userId);
    if (!category) {
      throw new AppException("CATEGORY_002", "카테고리를 찾을 수 없습니다.", HttpStatus.NOT_FOUND);
    }
    if (command.walletType === "ACCOUNT") {
      const account = await this.repository.findActiveAccount(command.walletId, command.userId);
      if (!account) {
        throw new AppException("TX_003", "존재하지 않는 계좌입니다.", HttpStatus.NOT_FOUND);
      }
      return;
    }
    const card = await this.repository.findActiveCard(command.walletId, command.userId);
    if (!card) {
      throw new AppException("TX_004", "존재하지 않는 카드입니다.", HttpStatus.NOT_FOUND);
    }
  }

  private async assertExists(favoriteTransactionId: bigint, userId: bigint): Promise<void> {
    const favorite = await this.repository.findById(favoriteTransactionId, userId);
    if (!favorite) {
      throw new AppException(
        "FAVORITE_001",
        "자주 쓰는 거래를 찾을 수 없습니다.",
        HttpStatus.NOT_FOUND
      );
    }
  }

  private toItem(
    favorite: FavoriteTransactionWithCategory,
    wallet: { name: string; useYn: boolean; deleted: boolean; balanceInsufficient: boolean }
  ): FavoriteTransactionItem {
    const { category } = favorite;
    const userSetting = category.categoryUserSettings[0];
    const categoryShow = category.isDefault ? (userSetting?.show ?? category.show) : category.show;
    return {
      favorite_transaction_id: Number(favorite.favoriteTransactionId),
      transaction_type: favorite.transactionType,
      wallet_type: favorite.walletType,
      wallet_id: Number(favorite.walletId),
      wallet_name: wallet.name,
      wallet_use_yn: wallet.useYn,
      wallet_deleted: wallet.deleted,
      category_id: Number(favorite.categoryId),
      category_name: category.categoryName,
      category_show: categoryShow,
      amount: favorite.amount.toNumber(),
      memo: favorite.memo,
      balance_insufficient: wallet.balanceInsufficient,
      created_at: favorite.createdAt.toISOString(),
      updated_at: favorite.updatedAt.toISOString()
    };
  }
}

// 현재 잔액 − 금액이 허용 범위(마이너스 미허용 0원, 허용 시 -마이너스 한도)보다 작아지는지
function isBalanceShort(account: Account, amount: number): boolean {
  const minAllowed = account.allowNegativeBalance ? -account.negativeBalanceLimit.toNumber() : 0;
  return account.currentBalance.toNumber() - amount < minAllowed;
}

function normalizeMemo(memo?: string): string | null {
  return memo ? memo : null;
}

function toSaveResult(favorite: {
  favoriteTransactionId: bigint;
  createdAt: Date;
  updatedAt: Date;
}): SaveFavoriteTransactionResult {
  return {
    favorite_transaction_id: Number(favorite.favoriteTransactionId),
    created_at: favorite.createdAt.toISOString(),
    updated_at: favorite.updatedAt.toISOString()
  };
}
