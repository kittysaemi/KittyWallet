import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma, TransactionType, WalletType } from "@prisma/client";
import { AppException } from "../../../common/exceptions/app.exception";
import {
  StatisticsRepository,
  TransactionTypeAmountGroup
} from "../infrastructure/statistics.repository";

interface BaseStatisticsCommand {
  userId: bigint;
  walletType?: string;
  walletId?: bigint;
}

interface GetMonthlyStatisticsCommand extends BaseStatisticsCommand {
  month?: string;
}

interface GetCategoryStatisticsCommand extends BaseStatisticsCommand {
  startDate: string;
  endDate: string;
  transactionType?: string;
  limit: number;
}

interface GetPeriodStatisticsCommand extends BaseStatisticsCommand {
  startDate: string;
  endDate: string;
  groupBy?: string;
}

interface AmountSummary {
  incomeAmount: number;
  expenseAmount: number;
  transactionCount: number;
}

@Injectable()
export class StatisticsService {
  constructor(private readonly statisticsRepository: StatisticsRepository) {}

  async getMonthlyStatistics(command: GetMonthlyStatisticsCommand) {
    const month = command.month ?? new Date().toISOString().slice(0, 7);
    const { startDate, endDate } = this.parseMonth(month);
    const condition = {
      userId: command.userId,
      startDate,
      endDate,
      walletType: this.toWalletType(command.walletType),
      walletId: command.walletId
    };

    const [summaryGroups, dailyGroups] = await Promise.all([
      this.statisticsRepository.groupAmountsByTransactionType(condition),
      this.statisticsRepository.groupDailyAmountsByTransactionType(condition)
    ]);
    const summary = this.summarizeTransactionTypeGroups(summaryGroups);
    const dailyMap = new Map<string, AmountSummary>();

    for (const group of dailyGroups) {
      const dateKey = this.formatDate(group.transactionDate);
      const current = dailyMap.get(dateKey) ?? this.emptySummary();
      this.addToSummary(current, group);
      dailyMap.set(dateKey, current);
    }

    return {
      month,
      wallet_type: command.walletType ?? null,
      income_amount: summary.incomeAmount,
      expense_amount: summary.expenseAmount,
      net_amount: summary.incomeAmount - summary.expenseAmount,
      transaction_count: summary.transactionCount,
      daily_items: Array.from(dailyMap.entries()).map(([date, item]) => ({
        date,
        income_amount: item.incomeAmount,
        expense_amount: item.expenseAmount,
        transaction_count: item.transactionCount
      }))
    };
  }

  async getCategoryStatistics(command: GetCategoryStatisticsCommand) {
    const { startDate, endDate } = this.parseDateRange(command.startDate, command.endDate);
    const transactionType = this.toTransactionType(command.transactionType ?? "EXPENSE");
    this.validateWalletTransactionType(command.walletType, transactionType);

    const groups = await this.statisticsRepository.groupAmountsByCategory({
      userId: command.userId,
      startDate,
      endDate,
      transactionType,
      walletType: this.toWalletType(command.walletType),
      walletId: command.walletId
    });
    const limitedGroups = groups.slice(0, command.limit);
    const totalAmount = groups.reduce((sum, group) => sum + this.toNumber(group.amount), 0);

    return {
      start_date: command.startDate,
      end_date: command.endDate,
      total_amount: totalAmount,
      items: limitedGroups.map((group) => {
        const amount = this.toNumber(group.amount);
        return {
          category_id: Number(group.categoryId),
          category_name: group.category?.categoryName ?? "",
          icon_id: group.category ? Number(group.category.iconId) : null,
          amount,
          transaction_count: group.transactionCount,
          ratio: totalAmount > 0 ? Math.round((amount / totalAmount) * 10000) / 100 : 0
        };
      })
    };
  }

  async getPeriodStatistics(command: GetPeriodStatisticsCommand) {
    const { startDate, endDate } = this.parseDateRange(command.startDate, command.endDate);
    const groupBy = command.groupBy ?? "DAY";
    const dailyGroups = await this.statisticsRepository.groupDailyAmountsByTransactionType({
      userId: command.userId,
      startDate,
      endDate,
      walletType: this.toWalletType(command.walletType),
      walletId: command.walletId
    });
    const summary = this.summarizeTransactionTypeGroups(dailyGroups);
    const itemMap = new Map<string, AmountSummary>();

    for (const group of dailyGroups) {
      const period =
        groupBy === "MONTH"
          ? this.formatMonth(group.transactionDate)
          : this.formatDate(group.transactionDate);
      const current = itemMap.get(period) ?? this.emptySummary();
      this.addToSummary(current, group);
      itemMap.set(period, current);
    }

    return {
      start_date: command.startDate,
      end_date: command.endDate,
      income_amount: summary.incomeAmount,
      expense_amount: summary.expenseAmount,
      net_amount: summary.incomeAmount - summary.expenseAmount,
      items: Array.from(itemMap.entries()).map(([period, item]) => ({
        period,
        income_amount: item.incomeAmount,
        expense_amount: item.expenseAmount,
        transaction_count: item.transactionCount
      }))
    };
  }

  private summarizeTransactionTypeGroups(groups: TransactionTypeAmountGroup[]): AmountSummary {
    const summary = this.emptySummary();
    for (const group of groups) {
      this.addToSummary(summary, group);
    }
    return summary;
  }

  private addToSummary(summary: AmountSummary, group: TransactionTypeAmountGroup): void {
    const amount = this.toNumber(group.amount);
    if (group.transactionType === "INCOME") {
      summary.incomeAmount += amount;
    } else {
      summary.expenseAmount += amount;
    }
    summary.transactionCount += group.transactionCount;
  }

  private emptySummary(): AmountSummary {
    return { incomeAmount: 0, expenseAmount: 0, transactionCount: 0 };
  }

  private parseMonth(month: string): { startDate: Date; endDate: Date } {
    const match = /^(\d{4})-(\d{2})$/.exec(month);
    if (!match) {
      this.throwInvalidParameter();
    }
    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    if (monthIndex < 0 || monthIndex > 11) {
      this.throwInvalidParameter();
    }
    return {
      startDate: new Date(Date.UTC(year, monthIndex, 1)),
      endDate: new Date(Date.UTC(year, monthIndex + 1, 0))
    };
  }

  private parseDateRange(
    startDateValue: string,
    endDateValue: string
  ): { startDate: Date; endDate: Date } {
    const startDate = this.parseDate(startDateValue);
    const endDate = this.parseDate(endDateValue);
    if (startDate > endDate) {
      this.throwInvalidParameter();
    }
    return { startDate, endDate };
  }

  private parseDate(value: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      this.throwInvalidParameter();
    }
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || this.formatDate(date) !== value) {
      this.throwInvalidParameter();
    }
    return date;
  }

  private toWalletType(walletType?: string): WalletType | undefined {
    return walletType as WalletType | undefined;
  }

  private toTransactionType(transactionType: string): TransactionType {
    return transactionType as TransactionType;
  }

  private validateWalletTransactionType(
    walletType: string | undefined,
    transactionType: TransactionType
  ): void {
    if (walletType === "CARD" && transactionType === "INCOME") {
      this.throwInvalidParameter();
    }
  }

  private toNumber(value: Prisma.Decimal | null): number {
    return value ? value.toNumber() : 0;
  }

  private formatDate(date: Date): string {
    return date.toISOString().split("T")[0];
  }

  private formatMonth(date: Date): string {
    return date.toISOString().slice(0, 7);
  }

  private throwInvalidParameter(): never {
    throw new AppException(
      "STAT_002",
      "Invalid statistics query parameter.",
      HttpStatus.BAD_REQUEST
    );
  }
}
