import { HttpStatus, Injectable } from "@nestjs/common";
import { AppException } from "../../../common/exceptions/app.exception";
import { AccountsRepository } from "../infrastructure/accounts.repository";

export interface AccountItem {
  account_id: number;
  account_name: string;
  icon_id: number;
  initial_balance: number;
  current_balance: number | null;
  use_yn: boolean;
  created_at: string;
  updated_at: string;
}

interface CreateAccountCommand {
  userId: bigint;
  accountName: string;
  initialBalance: number;
  iconId: bigint;
  useYn?: boolean;
}

interface UpdateAccountCommand {
  accountId: bigint;
  userId: bigint;
  accountName?: string;
  iconId?: bigint;
  useYn?: boolean;
}

@Injectable()
export class AccountsService {
  constructor(private readonly accountsRepository: AccountsRepository) {}

  async getAccounts(
    userId: bigint,
    useYn?: boolean,
    includeBalance = true
  ): Promise<{ items: AccountItem[] }> {
    const accounts = await this.accountsRepository.findMany(userId, useYn);
    return {
      items: accounts.map((account) => this.toItem(account, includeBalance))
    };
  }

  async createAccount(command: CreateAccountCommand): Promise<{ account_id: number }> {
    const accountName = this.normalizeName(command.accountName);
    await this.assertDuplicateName(accountName, command.userId);
    await this.assertIconExists(command.iconId, command.userId);

    if (command.initialBalance < 0) {
      throw new AppException(
        "VALIDATION_001",
        "초기 잔액은 0 이상이어야 합니다.",
        HttpStatus.BAD_REQUEST
      );
    }

    const account = await this.accountsRepository.create({
      user: { connect: { userId: command.userId } },
      icon: { connect: { iconId: command.iconId } },
      accountName,
      initialBalance: command.initialBalance,
      currentBalance: command.initialBalance,
      useYn: command.useYn ?? true
    });

    return { account_id: Number(account.accountId) };
  }

  async updateAccount(
    command: UpdateAccountCommand
  ): Promise<{ account_id: number; use_yn: boolean }> {
    if (
      command.accountName === undefined &&
      command.iconId === undefined &&
      command.useYn === undefined
    ) {
      throw new AppException(
        "VALIDATION_001",
        "수정 가능한 필드가 없습니다.",
        HttpStatus.BAD_REQUEST
      );
    }

    const account = await this.accountsRepository.findById(command.accountId, command.userId);
    if (!account) {
      throw new AppException("ACCOUNT_002", "계좌를 찾을 수 없습니다.", HttpStatus.NOT_FOUND);
    }

    const data: {
      accountName?: string;
      icon?: { connect: { iconId: bigint } };
      useYn?: boolean;
    } = {};

    if (command.accountName !== undefined) {
      const accountName = this.normalizeName(command.accountName);
      await this.assertDuplicateName(accountName, command.userId, account.accountId);
      data.accountName = accountName;
    }

    if (command.iconId !== undefined) {
      await this.assertIconExists(command.iconId, command.userId);
      data.icon = { connect: { iconId: command.iconId } };
    }

    if (command.useYn !== undefined) {
      data.useYn = command.useYn;
    }

    const updated = await this.accountsRepository.update(account.accountId, data);

    return {
      account_id: Number(updated.accountId),
      use_yn: updated.useYn
    };
  }

  private normalizeName(accountName: string): string {
    const normalized = accountName.trim();
    if (!normalized) {
      throw new AppException("VALIDATION_001", "계좌명을 입력해주세요.", HttpStatus.BAD_REQUEST);
    }
    return normalized;
  }

  private async assertDuplicateName(
    accountName: string,
    userId: bigint,
    excludeId?: bigint
  ): Promise<void> {
    const duplicate = await this.accountsRepository.findDuplicateName(
      accountName,
      userId,
      excludeId
    );
    if (duplicate) {
      throw new AppException("ACCOUNT_001", "이미 사용 중인 계좌명입니다.", HttpStatus.CONFLICT);
    }
  }

  private async assertIconExists(iconId: bigint, userId: bigint): Promise<void> {
    const icon = await this.accountsRepository.findAvailableIcon(iconId, userId);
    if (!icon) {
      throw new AppException("ICON_002", "아이콘을 찾을 수 없습니다.", HttpStatus.NOT_FOUND);
    }
  }

  private toItem(
    account: {
      accountId: bigint;
      accountName: string;
      iconId: bigint;
      initialBalance: { toNumber(): number };
      currentBalance: { toNumber(): number };
      useYn: boolean;
      createdAt: Date;
      updatedAt: Date;
    },
    includeBalance: boolean
  ): AccountItem {
    return {
      account_id: Number(account.accountId),
      account_name: account.accountName,
      icon_id: Number(account.iconId),
      initial_balance: account.initialBalance.toNumber(),
      current_balance: includeBalance ? account.currentBalance.toNumber() : null,
      use_yn: account.useYn,
      created_at: account.createdAt.toISOString(),
      updated_at: account.updatedAt.toISOString()
    };
  }
}
