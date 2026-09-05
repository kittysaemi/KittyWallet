import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from "@nestjs/common";
import { CurrentUser, JwtPayload } from "../../../common/decorators/current-user.decorator";
import { TransactionsService } from "../application/transactions.service";
import { CreateTransactionRequestDto } from "./dto/request/create-transaction-request.dto";
import { UpdateTransactionRequestDto } from "./dto/request/update-transaction-request.dto";
import { ConvertToInstallmentRequestDto } from "./dto/request/convert-to-installment-request.dto";
import { TransactionListQueryDto } from "./dto/request/transaction-list-query.dto";
import { TransactionRecentQueryDto } from "./dto/request/transaction-recent-query.dto";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const DEFAULT_RECENT_LIMIT = 5;
const MAX_RECENT_LIMIT = 20;

// 다중 선택 필터(#353): 쿼리 파라미터는 DTO에서 형식 검증을 마친 쉼표 구분 문자열이다.
function parseCategoryIds(raw?: string): number[] | undefined {
  if (!raw) return undefined;
  const ids = raw.split(",").map((v) => parseInt(v, 10));
  return ids.length > 0 ? ids : undefined;
}

// `ACCOUNT:1,CARD:2` -> [{ walletType: "ACCOUNT", walletId: 1 }, { walletType: "CARD", walletId: 2 }]
function parseWalletRefs(
  raw?: string
): Array<{ walletType: "ACCOUNT" | "CARD"; walletId: number }> | undefined {
  if (!raw) return undefined;
  const refs = raw.split(",").map((token) => {
    const [walletType, walletId] = token.split(":");
    return { walletType: walletType as "ACCOUNT" | "CARD", walletId: parseInt(walletId, 10) };
  });
  return refs.length > 0 ? refs : undefined;
}

@Controller("transactions")
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  getTransactions(@CurrentUser() user: JwtPayload, @Query() query: TransactionListQueryDto) {
    const page = query.page ? Math.max(1, parseInt(query.page, 10)) : DEFAULT_PAGE;
    const limit = query.limit
      ? Math.min(100, Math.max(1, parseInt(query.limit, 10)))
      : DEFAULT_LIMIT;

    return this.transactionsService.getTransactions({
      userId: BigInt(user.sub),
      startDate: query.start_date,
      endDate: query.end_date,
      keyword: query.keyword,
      walletType: query.wallet_type,
      walletId: query.wallet_id ? parseInt(query.wallet_id, 10) : undefined,
      categoryId: query.category_id ? parseInt(query.category_id, 10) : undefined,
      categoryIds: parseCategoryIds(query.category_ids),
      walletRefs: parseWalletRefs(query.wallet_ids),
      excludeInstallment: query.exclude_installment === "true",
      transactionType: query.transaction_type,
      page,
      limit,
      sort: query.sort ?? "transaction_date_desc"
    });
  }

  @Get("recent")
  getRecentTransactions(
    @CurrentUser() user: JwtPayload,
    @Query() query: TransactionRecentQueryDto
  ) {
    const limit = query.limit
      ? Math.min(MAX_RECENT_LIMIT, Math.max(1, parseInt(query.limit, 10)))
      : DEFAULT_RECENT_LIMIT;
    return this.transactionsService.getRecentTransactions(BigInt(user.sub), limit);
  }

  @Get(":id")
  getTransaction(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.transactionsService.getTransaction(BigInt(id), BigInt(user.sub));
  }

  @Put(":id")
  updateTransaction(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: UpdateTransactionRequestDto
  ) {
    return this.transactionsService.updateTransaction({
      transactionId: BigInt(id),
      userId: BigInt(user.sub),
      walletType: dto.wallet_type,
      walletId: dto.wallet_id,
      categoryId: dto.category_id,
      transactionType: dto.transaction_type,
      amount: dto.amount,
      memo: dto.memo,
      transactionDate: dto.transaction_date,
      interest: dto.interest,
      timezone: dto.timezone
    });
  }

  @Delete(":id")
  deleteTransaction(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.transactionsService.deleteTransaction(BigInt(id), BigInt(user.sub));
  }

  @Post(":id/convert-to-installment")
  @HttpCode(201)
  convertToInstallment(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: ConvertToInstallmentRequestDto
  ) {
    return this.transactionsService.convertToInstallment(
      BigInt(id),
      BigInt(user.sub),
      dto.installment_months
    );
  }

  @Post()
  @HttpCode(201)
  createTransaction(@CurrentUser() user: JwtPayload, @Body() dto: CreateTransactionRequestDto) {
    return this.transactionsService.createTransaction({
      userId: BigInt(user.sub),
      walletType: dto.wallet_type,
      walletId: BigInt(dto.wallet_id),
      categoryId: BigInt(dto.category_id),
      transactionType: dto.transaction_type,
      amount: dto.amount,
      memo: dto.memo,
      transactionDate: dto.transaction_date,
      timezone: dto.timezone,
      installmentMonths: dto.installment?.installment_months
    });
  }
}
