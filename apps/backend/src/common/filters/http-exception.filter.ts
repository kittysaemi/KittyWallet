import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { AppException } from '../exceptions/app.exception';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof AppException) {
      response.status(exception.statusCode).json({
        success: false,
        data: null,
        error: {
          code: exception.code,
          message: exception.message,
        },
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message =
        typeof body === 'object' && 'message' in body
          ? Array.isArray((body as Record<string, unknown>).message)
            ? ((body as Record<string, unknown>).message as string[])[0]
            : (body as Record<string, unknown>).message
          : exception.message;
      const code =
        typeof body === 'object' && body !== null && 'code' in body && typeof (body as Record<string, unknown>).code === 'string'
          ? (body as Record<string, string>).code
          : 'VALIDATION_001';

      response.status(status).json({
        success: false,
        data: null,
        error: {
          code,
          message,
        },
      });
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_001',
        message: '서버 오류가 발생했습니다.',
      },
    });
  }
}
