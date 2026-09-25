import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

import configuration from "./config/configuration";
import { validate } from "./config/env.validation";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./health/health.module";
import { StudentsModule } from "./modules/students/students.module";
import { StaffModule } from "./modules/staff/staff.module";
import { HousesModule } from "./modules/houses/houses.module";
import { FinanceModule } from "./modules/finance/finance.module";
import { TimetableModule } from "./modules/timetable/timetable.module";
import { TransfersModule } from "./modules/transfers/transfers.module";
import { AuditModule } from "./modules/audit/audit.module";

import { AuthGuard } from "./common/guards/auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
      envFilePath: [".env", ".env.local", "../.env.local"],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    DatabaseModule,
    HealthModule,
    StudentsModule,
    StaffModule,
    HousesModule,
    FinanceModule,
    TimetableModule,
    TransfersModule,
    AuditModule,
  ],
  providers: [
    // Global Exception Filter
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    // Global Interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    // Global Rate Limiting Guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Global Authentication Guard (checks @Public())
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    // Global Roles Guard (checks @Roles())
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
