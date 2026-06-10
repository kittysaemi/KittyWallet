export class BalanceViolationError extends Error {
  constructor() {
    super('잔액이 부족하거나 마이너스 한도를 초과했습니다.');
    this.name = 'BalanceViolationError';
  }
}
