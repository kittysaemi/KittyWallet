import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser, JwtPayload } from "../../../common/decorators/current-user.decorator";
import { TransferService } from "../application/transfer.service";
import { CreateTransferRequestDto } from "./dto/request/create-transfer-request.dto";
import { UpdateTransferRequestDto } from "./dto/request/update-transfer-request.dto";

@Controller("transactions/transfer")
export class TransferController {
  constructor(private readonly transferService: TransferService) {}

  @Post()
  @HttpCode(201)
  createTransfer(@CurrentUser() user: JwtPayload, @Body() dto: CreateTransferRequestDto) {
    return this.transferService.createTransfer({
      userId: BigInt(user.sub),
      fromAccountId: BigInt(dto.from_account_id),
      toAccountId: BigInt(dto.to_account_id),
      amount: dto.amount,
      transactionDate: dto.transaction_date,
      memo: dto.memo,
      timezone: dto.timezone
    });
  }

  @Get(":transferGroupId")
  getTransfer(@CurrentUser() user: JwtPayload, @Param("transferGroupId") transferGroupId: string) {
    return this.transferService.getTransfer(BigInt(user.sub), transferGroupId);
  }

  @Patch(":transferGroupId")
  updateTransfer(
    @CurrentUser() user: JwtPayload,
    @Param("transferGroupId") transferGroupId: string,
    @Body() dto: UpdateTransferRequestDto
  ) {
    return this.transferService.updateTransfer({
      userId: BigInt(user.sub),
      transferGroupId,
      fromAccountId: dto.from_account_id,
      toAccountId: dto.to_account_id,
      amount: dto.amount,
      transactionDate: dto.transaction_date,
      memo: dto.memo,
      timezone: dto.timezone
    });
  }

  @Delete(":transferGroupId")
  deleteTransfer(@CurrentUser() user: JwtPayload, @Param("transferGroupId") transferGroupId: string) {
    return this.transferService.deleteTransfer(BigInt(user.sub), transferGroupId);
  }
}
