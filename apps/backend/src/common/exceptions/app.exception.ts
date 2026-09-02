import { HttpException, HttpStatus } from '@nestjs/common';

export class AppException extends HttpException {
  constructor(
    readonly code: string,
    readonly message: string,
    readonly statusCode: HttpStatus,
    readonly details?: Record<string, unknown>,
  ) {
    super({ code, message, statusCode, details }, statusCode);
  }
}
