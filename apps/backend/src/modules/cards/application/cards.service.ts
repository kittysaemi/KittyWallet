import { HttpStatus, Injectable } from "@nestjs/common";
import { AppException } from "../../../common/exceptions/app.exception";
import { CardsRepository } from "../infrastructure/cards.repository";

export interface CardItem {
  card_id: number;
  card_name: string;
  icon_id: number;
  use_yn: boolean;
  created_at: string;
  updated_at: string;
}

interface CreateCardCommand {
  userId: bigint;
  cardName: string;
  iconId: bigint;
  useYn?: boolean;
}

interface UpdateCardCommand {
  cardId: bigint;
  userId: bigint;
  cardName?: string;
  iconId?: bigint;
  useYn?: boolean;
}

@Injectable()
export class CardsService {
  constructor(private readonly cardsRepository: CardsRepository) {}

  async getCards(userId: bigint, useYn?: boolean): Promise<{ items: CardItem[] }> {
    const cards = await this.cardsRepository.findMany(userId, useYn);
    return { items: cards.map((card) => this.toItem(card)) };
  }

  async createCard(command: CreateCardCommand): Promise<{ card_id: number }> {
    const cardName = this.normalizeName(command.cardName);
    await this.assertDuplicateName(cardName, command.userId);
    await this.assertIconExists(command.iconId, command.userId);

    const card = await this.cardsRepository.create({
      user: { connect: { userId: command.userId } },
      icon: { connect: { iconId: command.iconId } },
      cardName,
      useYn: command.useYn ?? true
    });

    return { card_id: Number(card.cardId) };
  }

  async archiveCard(command: {
    cardId: bigint;
    userId: bigint;
    deleteTransactions: boolean;
  }): Promise<void> {
    const card = await this.cardsRepository.findById(command.cardId, command.userId);
    if (!card || card.deletedYn) {
      throw new AppException("CARD_002", "카드를 찾을 수 없습니다.", HttpStatus.NOT_FOUND);
    }
    await this.cardsRepository.archive(command.cardId, command.userId, command.deleteTransactions);
  }

  async updateCard(command: UpdateCardCommand): Promise<{ card_id: number; use_yn: boolean }> {
    if (
      command.cardName === undefined &&
      command.iconId === undefined &&
      command.useYn === undefined
    ) {
      throw new AppException(
        "VALIDATION_001",
        "수정 가능한 필드가 없습니다.",
        HttpStatus.BAD_REQUEST
      );
    }

    const card = await this.cardsRepository.findById(command.cardId, command.userId);
    if (!card) {
      throw new AppException("CARD_002", "카드를 찾을 수 없습니다.", HttpStatus.NOT_FOUND);
    }

    const data: {
      cardName?: string;
      icon?: { connect: { iconId: bigint } };
      useYn?: boolean;
    } = {};

    if (command.cardName !== undefined) {
      const cardName = this.normalizeName(command.cardName);
      await this.assertDuplicateName(cardName, command.userId, card.cardId);
      data.cardName = cardName;
    }

    if (command.iconId !== undefined) {
      await this.assertIconExists(command.iconId, command.userId);
      data.icon = { connect: { iconId: command.iconId } };
    }

    if (command.useYn !== undefined) {
      data.useYn = command.useYn;
    }

    const updated = await this.cardsRepository.update(card.cardId, data);
    return { card_id: Number(updated.cardId), use_yn: updated.useYn };
  }

  private normalizeName(cardName: string): string {
    const normalized = cardName.trim();
    if (!normalized) {
      throw new AppException("VALIDATION_001", "카드명을 입력해주세요.", HttpStatus.BAD_REQUEST);
    }
    return normalized;
  }

  private async assertDuplicateName(
    cardName: string,
    userId: bigint,
    excludeId?: bigint
  ): Promise<void> {
    const duplicate = await this.cardsRepository.findDuplicateName(cardName, userId, excludeId);
    if (duplicate) {
      throw new AppException("CARD_003", "이미 사용 중인 카드명입니다.", HttpStatus.CONFLICT);
    }
  }

  private async assertIconExists(iconId: bigint, userId: bigint): Promise<void> {
    const icon = await this.cardsRepository.findAvailableIcon(iconId, userId);
    if (!icon) {
      throw new AppException("ICON_002", "아이콘을 찾을 수 없습니다.", HttpStatus.NOT_FOUND);
    }
  }

  private toItem(card: {
    cardId: bigint;
    cardName: string;
    iconId: bigint;
    useYn: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): CardItem {
    return {
      card_id: Number(card.cardId),
      card_name: card.cardName,
      icon_id: Number(card.iconId),
      use_yn: card.useYn,
      created_at: card.createdAt.toISOString(),
      updated_at: card.updatedAt.toISOString()
    };
  }
}
