export class BalanceViolationError extends Error {
  constructor() {
    super('잔액이 부족하거나 마이너스 한도를 초과했습니다.');
    this.name = 'BalanceViolationError';
  }
}

export class TransferBalanceViolationError extends Error {
  constructor(readonly projectedBalance: number) {
    super('잔액이 부족하거나 마이너스 한도를 초과했습니다.');
    this.name = 'TransferBalanceViolationError';
  }
}

export class TransferPairNotFoundError extends Error {
  constructor() {
    super('계좌이동 내역을 찾을 수 없습니다.');
    this.name = 'TransferPairNotFoundError';
  }
}

export class TransferPairCorruptedError extends Error {
  constructor() {
    super('계좌이동 데이터의 정합성이 깨져 처리할 수 없습니다.');
    this.name = 'TransferPairCorruptedError';
  }
}
