import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ERROR_CODES } from '../constants/error-codes.constants';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'success' in exceptionResponse
      ) {
        response.status(status).json(exceptionResponse);
        return;
      }

      // Handle NestJS ValidationPipe errors
      if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'message' in exceptionResponse
      ) {
        const validationError = ERROR_CODES.VALIDATION_001;
        response.status(validationError.statusCode).json({
          success: false,
          data: null,
          error: {
            code: validationError.code,
            message: (exceptionResponse as { message: string | string[] }).message,
          },
        });
        return;
      }

      response.status(status).json({
        success: false,
        data: null,
        error: {
          code: 'UNKNOWN',
          message:
            typeof exceptionResponse === 'string'
              ? exceptionResponse
              : 'An error occurred',
        },
      });
    } else {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        data: null,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
        },
      });
    }
  }
}
