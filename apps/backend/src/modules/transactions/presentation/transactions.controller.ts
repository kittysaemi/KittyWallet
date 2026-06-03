import { Body, Controller, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import { CurrentUser, JwtPayload } from "../../../common/decorators/current-user.decorator";
import { TransactionsService } from "../application/transactions.service";
import { CreateTransactionRequestDto } from "./dto/request/create-transaction-request.dto";
import { TransactionListQueryDto } from "./dto/request/transaction-list-query.dto";
import { TransactionRecentQueryDto } from "./dto/request/transaction-recent-query.dto";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const DEFAULT_RECENT_LIMIT = 5;
const MAX_RECENT_LIMIT = 20;

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
      transactionDate: dto.transaction_date
    });
  }
}
