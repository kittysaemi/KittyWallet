import { Body, Controller, Delete, Get, HttpStatus, Param, Post, Put } from "@nestjs/common";
import { CurrentUser, JwtPayload } from "../../../common/decorators/current-user.decorator";
import { AppException } from "../../../common/exceptions/app.exception";
import {
  FavoriteTransactionsService,
  SaveFavoriteTransactionCommand
} from "../application/favorite-transactions.service";
import { SaveFavoriteTransactionRequestDto } from "./dto/request/save-favorite-transaction-request.dto";

function parseId(id: string): bigint {
  if (!/^[1-9]\d*$/.test(id)) {
    throw new AppException(
      "FAVORITE_001",
      "자주 쓰는 거래를 찾을 수 없습니다.",
      HttpStatus.NOT_FOUND
    );
  }
  return BigInt(id);
}

function toCommand(
  user: JwtPayload,
  dto: SaveFavoriteTransactionRequestDto
): SaveFavoriteTransactionCommand {
  return {
    userId: BigInt(user.sub),
    transactionType: dto.transaction_type,
    walletType: dto.wallet_type,
    walletId: BigInt(dto.wallet_id),
    categoryId: BigInt(dto.category_id),
    amount: dto.amount,
    memo: dto.memo
  };
}

@Controller("favorite-transactions")
export class FavoriteTransactionsController {
  constructor(private readonly service: FavoriteTransactionsService) {}

  @Get()
  getFavoriteTransactions(@CurrentUser() user: JwtPayload) {
    return this.service.getFavoriteTransactions(BigInt(user.sub));
  }

  @Post()
  createFavoriteTransaction(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SaveFavoriteTransactionRequestDto
  ) {
    return this.service.createFavoriteTransaction(toCommand(user, dto));
  }

  @Put(":id")
  updateFavoriteTransaction(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: SaveFavoriteTransactionRequestDto
  ) {
    return this.service.updateFavoriteTransaction(parseId(id), toCommand(user, dto));
  }

  @Delete(":id")
  deleteFavoriteTransaction(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.service.deleteFavoriteTransaction(parseId(id), BigInt(user.sub));
  }
}
