import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../responses/api-response';

@Injectable()
export class ResponseTransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // If already formatted as ApiResponse, return as-is
        if (
          data !== null &&
          typeof data === 'object' &&
          'success' in data &&
          'data' in data &&
          'error' in data
        ) {
          return data as unknown as ApiResponse<T>;
        }
        return {
          success: true,
          data: data ?? null,
          error: null,
        };
      }),
    );
  }
}
