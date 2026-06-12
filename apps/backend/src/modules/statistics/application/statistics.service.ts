import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma, TransactionType, WalletType } from "@prisma/client";
import { AppException } from "../../../common/exceptions/app.exception";
import {
  StatisticsRepository,
  TransactionTypeAmountGroup,
  WalletTypeCategoryGroup
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

interface GetVisualizationCommand extends BaseStatisticsCommand {
  month?: string;
  transactionType?: string;
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

  async getSummaryStatistics(command: GetVisualizationCommand) {
    const month = command.month ?? new Date().toISOString().slice(0, 7);
    const { startDate, endDate } = this.parseMonth(month);
    const condition = {
      userId: command.userId,
      startDate,
      endDate,
      walletType: this.toWalletType(command.walletType),
      walletId: command.walletId
    };

    const [summaryGroups, categoryGroups] = await Promise.all([
      this.statisticsRepository.groupAmountsByTransactionType(condition),
      this.statisticsRepository.groupAmountsByCategory({
        ...condition,
        transactionType: TransactionType.EXPENSE
      })
    ]);
    const summary = this.summarizeTransactionTypeGroups(summaryGroups);
    const topCategoryGroup = categoryGroups[0] ?? null;

    return {
      month,
      income_amount: summary.incomeAmount,
      expense_amount: summary.expenseAmount,
      net_amount: summary.incomeAmount - summary.expenseAmount,
      transaction_count: summary.transactionCount,
      top_category: topCategoryGroup
        ? {
            category_id: Number(topCategoryGroup.categoryId),
            category_name: topCategoryGroup.category?.categoryName ?? "",
            icon_id: topCategoryGroup.category ? Number(topCategoryGroup.category.iconId) : null,
            amount: this.toNumber(topCategoryGroup.amount)
          }
        : null
    };
  }

  async getCategoryTopStatistics(command: GetVisualizationCommand) {
    const month = command.month ?? new Date().toISOString().slice(0, 7);
    const { startDate, endDate } = this.parseMonth(month);
    const isIncome = command.transactionType === "INCOME";
    const txType = isIncome ? TransactionType.INCOME : TransactionType.EXPENSE;
    const groups = await this.statisticsRepository.groupAmountsByCategory({
      userId: command.userId,
      startDate,
      endDate,
      walletType: this.toWalletType(command.walletType),
      walletId: command.walletId,
      transactionType: txType
    });

    const totalAmount = groups.reduce((sum, g) => sum + this.toNumber(g.amount), 0);
    const top5 = groups.slice(0, 5);
    const othersAmount = groups.slice(5).reduce((sum, g) => sum + this.toNumber(g.amount), 0);

    const items = top5.map((g, i) => {
      const amount = this.toNumber(g.amount);
      return {
        rank: i + 1,
        category_id: Number(g.categoryId),
        category_name: g.category?.categoryName ?? "",
        icon_id: g.category ? Number(g.category.iconId) : null,
        amount,
        ratio: totalAmount > 0 ? Math.round((amount / totalAmount) * 10000) / 100 : 0
      };
    });

    if (othersAmount > 0) {
      items.push({
        rank: null as unknown as number,
        category_id: null as unknown as number,
        category_name: "기타",
        icon_id: null,
        amount: othersAmount,
        ratio: totalAmount > 0 ? Math.round((othersAmount / totalAmount) * 10000) / 100 : 0
      });
    }

    if (isIncome) {
      return { month, total_income: totalAmount, items };
    }
    return { month, total_expense: totalAmount, items };
  }

  async getCalendarStatistics(command: GetVisualizationCommand) {
    const month = command.month ?? new Date().toISOString().slice(0, 7);
    const { startDate, endDate } = this.parseMonth(month);
    const dailyGroups = await this.statisticsRepository.groupDailyAmountsByTransactionType({
      userId: command.userId,
      startDate,
      endDate,
      walletType: this.toWalletType(command.walletType),
      walletId: command.walletId,
      transactionType: TransactionType.EXPENSE
    });

    const dailyMap = new Map<string, number>();
    for (const group of dailyGroups) {
      const dateKey = this.formatDate(group.transactionDate);
      dailyMap.set(dateKey, (dailyMap.get(dateKey) ?? 0) + this.toNumber(group.amount));
    }

    const dailyItems = Array.from(dailyMap.entries()).map(([date, expense_amount]) => ({
      date,
      expense_amount
    }));
    const maxDailyExpense = dailyItems.reduce((max, item) => Math.max(max, item.expense_amount), 0);

    return { month, max_daily_expense: maxDailyExpense, daily_items: dailyItems };
  }

  async getSankeyStatistics(command: GetVisualizationCommand) {
    const month = command.month ?? new Date().toISOString().slice(0, 7);
    const { startDate, endDate } = this.parseMonth(month);
    const condition = {
      userId: command.userId,
      startDate,
      endDate,
      walletType: this.toWalletType(command.walletType),
      walletId: command.walletId
    };

    const [crossGroups, categoryGroups] = await Promise.all([
      this.statisticsRepository.groupExpensesByWalletTypeAndCategory(condition),
      this.statisticsRepository.groupAmountsByCategory({
        ...condition,
        transactionType: TransactionType.EXPENSE
      })
    ]);

    if (crossGroups.length === 0) {
      return { month, total_expense: 0, nodes: [], links: [] };
    }

    const totalExpense = categoryGroups.reduce((sum, g) => sum + this.toNumber(g.amount), 0);

    const walletTotals = new Map<string, number>();
    for (const g of crossGroups) {
      const key = g.walletType;
      walletTotals.set(key, (walletTotals.get(key) ?? 0) + this.toNumber(g.amount));
    }

    const top5Categories = categoryGroups.slice(0, 5);
    const top5Ids = new Set(top5Categories.map((g) => String(g.categoryId)));

    const catTotals = new Map<string, number>();
    let othersTotal = 0;
    for (const g of crossGroups) {
      const catKey = String(g.categoryId);
      if (top5Ids.has(catKey)) {
        catTotals.set(catKey, (catTotals.get(catKey) ?? 0) + this.toNumber(g.amount));
      } else {
        othersTotal += this.toNumber(g.amount);
      }
    }

    const nodes = [
      { id: "total", name: "총 지출", value: totalExpense },
      ...Array.from(walletTotals.entries()).map(([walletType, value]) => ({
        id: walletType.toLowerCase(),
        name: walletType === "ACCOUNT" ? "계좌" : "카드",
        value
      })),
      ...top5Categories.map((g) => ({
        id: `cat_${g.categoryId}`,
        name: g.category?.categoryName ?? "",
        value: catTotals.get(String(g.categoryId)) ?? 0
      })),
      ...(othersTotal > 0 ? [{ id: "cat_other", name: "기타", value: othersTotal }] : [])
    ];

    const walletCatLinks = this.buildWalletCatLinks(crossGroups, top5Ids);

    const links = [
      ...Array.from(walletTotals.entries()).map(([walletType, value]) => ({
        source: "total",
        target: walletType.toLowerCase(),
        value
      })),
      ...walletCatLinks
    ];

    return { month, total_expense: totalExpense, nodes, links };
  }

  async getSankeyIncomeStatistics(command: GetVisualizationCommand) {
    const month = command.month ?? new Date().toISOString().slice(0, 7);
    const { startDate, endDate } = this.parseMonth(month);
    const condition = {
      userId: command.userId,
      startDate,
      endDate,
      walletType: this.toWalletType(command.walletType),
      walletId: command.walletId
    };

    const [crossGroups, categoryGroups] = await Promise.all([
      this.statisticsRepository.groupIncomesByWalletTypeAndCategory(condition),
      this.statisticsRepository.groupAmountsByCategory({
        ...condition,
        transactionType: TransactionType.INCOME
      })
    ]);

    if (crossGroups.length === 0) {
      return { month, total_income: 0, nodes: [], links: [] };
    }

    const totalIncome = categoryGroups.reduce((sum, g) => sum + this.toNumber(g.amount), 0);

    const walletTotals = new Map<string, number>();
    for (const g of crossGroups) {
      const key = g.walletType;
      walletTotals.set(key, (walletTotals.get(key) ?? 0) + this.toNumber(g.amount));
    }

    const top5Categories = categoryGroups.slice(0, 5);
    const top5Ids = new Set(top5Categories.map((g) => String(g.categoryId)));

    const catTotals = new Map<string, number>();
    let othersTotal = 0;
    for (const g of crossGroups) {
      const catKey = String(g.categoryId);
      if (top5Ids.has(catKey)) {
        catTotals.set(catKey, (catTotals.get(catKey) ?? 0) + this.toNumber(g.amount));
      } else {
        othersTotal += this.toNumber(g.amount);
      }
    }

    const nodes = [
      { id: "total", name: "총 수입", value: totalIncome },
      ...Array.from(walletTotals.entries()).map(([walletType, value]) => ({
        id: walletType.toLowerCase(),
        name: walletType === "ACCOUNT" ? "계좌" : "카드",
        value
      })),
      ...top5Categories.map((g) => ({
        id: `cat_${g.categoryId}`,
        name: g.category?.categoryName ?? "",
        value: catTotals.get(String(g.categoryId)) ?? 0
      })),
      ...(othersTotal > 0 ? [{ id: "cat_other", name: "기타", value: othersTotal }] : [])
    ];

    const walletCatLinks = this.buildWalletCatLinks(crossGroups, top5Ids);

    const links = [
      ...Array.from(walletTotals.entries()).map(([walletType, value]) => ({
        source: "total",
        target: walletType.toLowerCase(),
        value
      })),
      ...walletCatLinks
    ];

    return { month, total_income: totalIncome, nodes, links };
  }

  private buildWalletCatLinks(
    crossGroups: WalletTypeCategoryGroup[],
    top5Ids: Set<string>
  ): { source: string; target: string; value: number }[] {
    const linkMap = new Map<string, number>();
    const othersMap = new Map<string, number>();

    for (const g of crossGroups) {
      const walletKey = g.walletType.toLowerCase();
      const catKey = String(g.categoryId);
      const amount = this.toNumber(g.amount);

      if (top5Ids.has(catKey)) {
        const key = `${walletKey}|cat_${catKey}`;
        linkMap.set(key, (linkMap.get(key) ?? 0) + amount);
      } else {
        othersMap.set(walletKey, (othersMap.get(walletKey) ?? 0) + amount);
      }
    }

    const links = Array.from(linkMap.entries()).map(([key, value]) => {
      const [source, target] = key.split("|");
      return { source, target, value };
    });

    for (const [walletKey, value] of othersMap.entries()) {
      links.push({ source: walletKey, target: "cat_other", value });
    }

    return links;
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
