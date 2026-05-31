import { HttpException, HttpStatus } from '@nestjs/common';

export class AppException extends HttpException {
  constructor(
    readonly code: string,
    readonly message: string,
    readonly statusCode: HttpStatus,
  ) {
    super({ code, message, statusCode }, statusCode);
  }
}
