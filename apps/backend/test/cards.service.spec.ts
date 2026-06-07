import { HttpStatus } from "@nestjs/common";
import type { AppException } from "../src/common/exceptions/app.exception";
import { CardsService } from "../src/modules/cards/application/cards.service";
import { CardsRepository } from "../src/modules/cards/infrastructure/cards.repository";

describe("CardsService", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");

  const makeCard = (overrides = {}) => ({
    cardId: BigInt(1),
    userId: BigInt(1),
    iconId: BigInt(10),
    cardName: "신한카드",
    useYn: true,
    createdAt: now,
    updatedAt: now,
    ...overrides
  });

  const cardsRepository = {
    findMany: jest.fn(),
    findById: jest.fn(),
    findDuplicateName: jest.fn(),
    findAvailableIcon: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    archive: jest.fn()
  } as unknown as jest.Mocked<CardsRepository>;

  const service = new CardsService(cardsRepository);

  beforeEach(() => jest.clearAllMocks());

  it("returns card list", async () => {
    cardsRepository.findMany.mockResolvedValue([makeCard() as any]);
    await expect(service.getCards(BigInt(1))).resolves.toEqual({
      items: [
        {
          card_id: 1,
          card_name: "신한카드",
          icon_id: 10,
          use_yn: true,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z"
        }
      ]
    });
  });

  it("rejects duplicate card name on create", async () => {
    cardsRepository.findDuplicateName.mockResolvedValue(makeCard() as any);
    await expect(
      service.createCard({ userId: BigInt(1), cardName: "신한카드", iconId: BigInt(10) })
    ).rejects.toMatchObject({
      code: "CARD_003",
      statusCode: HttpStatus.CONFLICT
    } satisfies Partial<AppException>);
  });

  it("returns 404 when updating non-existent card", async () => {
    cardsRepository.findById.mockResolvedValue(null);
    await expect(
      service.updateCard({ cardId: BigInt(99), userId: BigInt(1), useYn: false })
    ).rejects.toMatchObject({
      code: "CARD_002",
      statusCode: HttpStatus.NOT_FOUND
    } satisfies Partial<AppException>);
  });

  it("deactivates card with use_yn=false", async () => {
    cardsRepository.findById.mockResolvedValue(makeCard() as any);
    cardsRepository.update.mockResolvedValue(makeCard({ useYn: false }) as any);
    await expect(
      service.updateCard({ cardId: BigInt(1), userId: BigInt(1), useYn: false })
    ).resolves.toEqual({ card_id: 1, use_yn: false });
  });

  it("archives card successfully", async () => {
    cardsRepository.findById.mockResolvedValue(makeCard() as any);
    cardsRepository.archive.mockResolvedValue(undefined);

    await expect(
      service.archiveCard({ cardId: BigInt(1), userId: BigInt(1), deleteTransactions: false })
    ).resolves.toBeUndefined();

    expect(cardsRepository.archive).toHaveBeenCalledWith(BigInt(1), BigInt(1), false);
  });

  it("archives card and deletes transactions when delete_transactions=true", async () => {
    cardsRepository.findById.mockResolvedValue(makeCard() as any);
    cardsRepository.archive.mockResolvedValue(undefined);

    await service.archiveCard({ cardId: BigInt(1), userId: BigInt(1), deleteTransactions: true });

    expect(cardsRepository.archive).toHaveBeenCalledWith(BigInt(1), BigInt(1), true);
  });

  it("returns 404 when archiving non-existent card", async () => {
    cardsRepository.findById.mockResolvedValue(null);

    await expect(
      service.archiveCard({ cardId: BigInt(99), userId: BigInt(1), deleteTransactions: false })
    ).rejects.toMatchObject({
      code: "CARD_002",
      statusCode: HttpStatus.NOT_FOUND
    } satisfies Partial<AppException>);
  });

  it("returns 404 when archiving already-archived card", async () => {
    cardsRepository.findById.mockResolvedValue(makeCard({ deletedYn: true }) as any);

    await expect(
      service.archiveCard({ cardId: BigInt(1), userId: BigInt(1), deleteTransactions: false })
    ).rejects.toMatchObject({
      code: "CARD_002",
      statusCode: HttpStatus.NOT_FOUND
    } satisfies Partial<AppException>);
  });
});
