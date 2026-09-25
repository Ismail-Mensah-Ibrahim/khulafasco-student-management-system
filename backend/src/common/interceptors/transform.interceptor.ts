import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { ApiResponse } from "@/common/types/api-response.type";

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const requestId = request.id || "N/A";

    return next.handle().pipe(
      map((res) => {
        // If the handler already returned an object with message and data
        if (
          res &&
          typeof res === "object" &&
          ("data" in res || "message" in res) &&
          !("items" in res && "total" in res) // allow pagination objects to be treated as raw data
        ) {
          const { message, data, ...rest } = res;
          return {
            success: true,
            data: data !== undefined ? data : rest,
            message: message || "Operation completed successfully",
            requestId,
            timestamp: new Date().toISOString(),
          };
        }

        return {
          success: true,
          data: res,
          message: "Operation completed successfully",
          requestId,
          timestamp: new Date().toISOString(),
        };
      })
    );
  }
}
