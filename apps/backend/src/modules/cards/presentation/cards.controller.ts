import { Body, Controller, Get, Param, Post, Put, Query } from "@nestjs/common";
import { CurrentUser, JwtPayload } from "../../../common/decorators/current-user.decorator";
import { CardsService } from "../application/cards.service";
import { CardListQueryDto } from "./dto/request/card-list-query.dto";
import { CreateCardRequestDto } from "./dto/request/create-card-request.dto";
import { UpdateCardRequestDto } from "./dto/request/update-card-request.dto";

@Controller("cards")
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Get()
  getCards(@CurrentUser() user: JwtPayload, @Query() query: CardListQueryDto) {
    const useYn = query.use_yn === undefined ? undefined : query.use_yn === "true";
    return this.cardsService.getCards(BigInt(user.sub), useYn);
  }

  @Post()
  createCard(@CurrentUser() user: JwtPayload, @Body() dto: CreateCardRequestDto) {
    return this.cardsService.createCard({
      userId: BigInt(user.sub),
      cardName: dto.card_name,
      iconId: BigInt(dto.icon_id),
      useYn: dto.use_yn
    });
  }

  @Put(":id")
  updateCard(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: UpdateCardRequestDto
  ) {
    return this.cardsService.updateCard({
      cardId: BigInt(id),
      userId: BigInt(user.sub),
      cardName: dto.card_name,
      iconId: dto.icon_id === undefined ? undefined : BigInt(dto.icon_id),
      useYn: dto.use_yn
    });
  }
}
