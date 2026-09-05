import { validate } from 'class-validator';
import { TransactionListQueryDto } from '../src/modules/transactions/presentation/dto/request/transaction-list-query.dto';

// 거래내역 다중 선택 필터(#353): category_ids / wallet_ids는 쉼표 구분 문자열로 받는다.
describe('TransactionListQueryDto', () => {
  it('accepts comma-separated category ids and type:id wallet pairs', async () => {
    const dto = createDto({
      category_ids: '1,2,30',
      wallet_ids: 'ACCOUNT:1,CARD:2',
      exclude_installment: 'true',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('accepts a single value for each multi-select param', async () => {
    const dto = createDto({ category_ids: '7', wallet_ids: 'CARD:9' });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('still accepts the single-value params used by search and wallet transactions', async () => {
    const dto = createDto({ category_id: '3', wallet_type: 'ACCOUNT', wallet_id: '1' });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects malformed multi-select params', async () => {
    const dto = createDto({
      category_ids: '1,,2',
      wallet_ids: 'ACCOUNT:1,BANK:2',
      exclude_installment: 'yes',
    });

    const properties = (await validate(dto)).map((error) => error.property);

    expect(properties).toEqual(
      expect.arrayContaining(['category_ids', 'wallet_ids', 'exclude_installment']),
    );
  });

  it('rejects a wallet id list without the wallet type prefix', async () => {
    const dto = createDto({ wallet_ids: '1,2' });

    const properties = (await validate(dto)).map((error) => error.property);

    expect(properties).toContain('wallet_ids');
  });
});

function createDto(data: Partial<TransactionListQueryDto>): TransactionListQueryDto {
  const dto = new TransactionListQueryDto();
  Object.assign(dto, data);
  return dto;
}
