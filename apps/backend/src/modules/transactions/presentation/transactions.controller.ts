import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { CurrentUser, JwtPayload } from "../../../common/decorators/current-user.decorator";
import { TransactionsService } from "../application/transactions.service";
import { CreateTransactionRequestDto } from "./dto/request/create-transaction-request.dto";

@Controller("transactions")
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

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
