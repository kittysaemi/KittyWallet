import { HttpException } from '@nestjs/common';
import { ERROR_CODES, ErrorCodeKey } from '../constants/error-codes.constants';

export class BusinessException extends HttpException {
  public readonly errorCode: string;
  public readonly errorMessage: string;

  constructor(errorKey: ErrorCodeKey) {
    const errorInfo = ERROR_CODES[errorKey];
    super(
      {
        success: false,
        data: null,
        error: {
          code: errorInfo.code,
          message: errorInfo.message,
        },
      },
      errorInfo.statusCode,
    );
    this.errorCode = errorInfo.code;
    this.errorMessage = errorInfo.message;
  }
}
