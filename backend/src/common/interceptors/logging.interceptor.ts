import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { randomUUID } from "crypto";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Assign correlation ID
    const requestId = request.headers["x-request-id"] || randomUUID();
    request.id = requestId;
    response.setHeader("x-request-id", requestId);

    const { method, originalUrl, ip } = request;
    const user = request.user?.email || "anonymous";
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;
          this.logger.log(
            `[${requestId}] ${method} ${originalUrl} ${statusCode} +${duration}ms - IP: ${ip} User: ${user}`
          );
        },
        error: (err) => {
          const duration = Date.now() - startTime;
          const statusCode = err.status || 500;
          this.logger.error(
            `[${requestId}] ${method} ${originalUrl} ${statusCode} +${duration}ms - IP: ${ip} User: ${user} - Error: ${err.message}`
          );
        },
      })
    );
  }
}
