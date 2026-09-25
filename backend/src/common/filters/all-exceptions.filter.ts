import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { ApiResponse } from "@/common/types/api-response.type";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("ExceptionFilter");

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { id?: string }>();

    const requestId = request.id || "N/A";
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = "INTERNAL_SERVER_ERROR";
    let message = "An unexpected error occurred. Please contact IT support.";
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === "string") {
        message = exceptionResponse;
        errorCode = exception.name || "HTTP_EXCEPTION";
      } else if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
        const resObj = exceptionResponse as any;
        message = resObj.message || exception.message;
        errorCode = resObj.error || exception.name || "HTTP_EXCEPTION";
        if (Array.isArray(resObj.message)) {
          // Class-validator validation pipe errors
          errorCode = "VALIDATION_FAILED";
          message = "Input validation failed";
          details = resObj.message;
        }
      }
    } else if (exception instanceof Error) {
      // Postgres error codes or unhandled application errors
      const err = exception as any;
      this.logger.error(
        `[${requestId}] Unhandled Exception: ${err.message}`,
        err.stack
      );

      // Handle common Postgres errors safely without leaking schema details
      if (err.code === "23505") {
        status = HttpStatus.CONFLICT;
        errorCode = "DUPLICATE_ENTRY";
        message = "A record with this identifier already exists.";
      } else if (err.code === "23503") {
        status = HttpStatus.BAD_REQUEST;
        errorCode = "FOREIGN_KEY_VIOLATION";
        message = "Operation referenced a non-existent dependent record.";
      } else if (err.code === "P0001") {
        // PL/pgSQL RAISE EXCEPTION
        status = HttpStatus.BAD_REQUEST;
        errorCode = "BUSINESS_RULE_VIOLATION";
        message = err.message || "Operation failed business rule validation.";
      }
    }

    const errorPayload: ApiResponse = {
      success: false,
      error: {
        code: errorCode,
        message,
        details,
      },
      requestId,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(errorPayload);
  }
}
