import { Body, Controller, Get, Param, Post, Put, Query } from "@nestjs/common";
import { CurrentUser, JwtPayload } from "../../../common/decorators/current-user.decorator";
import { AccountsService } from "../application/accounts.service";
import { AccountListQueryDto } from "./dto/request/account-list-query.dto";
import { CreateAccountRequestDto } from "./dto/request/create-account-request.dto";
import { UpdateAccountRequestDto } from "./dto/request/update-account-request.dto";

@Controller("accounts")
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  getAccounts(@CurrentUser() user: JwtPayload, @Query() query: AccountListQueryDto) {
    const useYn = query.use_yn === undefined ? undefined : query.use_yn === "true";
    const includeBalance = query.include_balance === undefined ? true : query.include_balance === "true";
    return this.accountsService.getAccounts(BigInt(user.sub), useYn, includeBalance);
  }

  @Post()
  createAccount(@CurrentUser() user: JwtPayload, @Body() dto: CreateAccountRequestDto) {
    return this.accountsService.createAccount({
      userId: BigInt(user.sub),
      accountName: dto.account_name,
      initialBalance: dto.initial_balance,
      iconId: BigInt(dto.icon_id),
      useYn: dto.use_yn
    });
  }

  @Put(":id")
  updateAccount(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: UpdateAccountRequestDto
  ) {
    return this.accountsService.updateAccount({
      accountId: BigInt(id),
      userId: BigInt(user.sub),
      accountName: dto.account_name,
      iconId: dto.icon_id === undefined ? undefined : BigInt(dto.icon_id),
      useYn: dto.use_yn
    });
  }
}
