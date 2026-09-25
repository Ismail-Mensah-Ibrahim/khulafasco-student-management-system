import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>("port") || 4000;
  const corsOrigin = configService.get<string>("cors.origin");

  // Global URL prefix
  app.setGlobalPrefix("api/v1", {
    exclude: ["health", "health/ready"],
  });

  // Enable CORS
  app.enableCors({
    origin: corsOrigin.includes(",")
      ? corsOrigin.split(",").map((s) => s.trim())
      : corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-request-id"],
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // OpenAPI / Swagger Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle("Khulafasco Student Management System API")
    .setDescription(
      "Authoritative production backend REST API for Al-Khulafau Ar-Rashiduun Islamic Senior High School"
    )
    .setVersion("1.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter Supabase Auth JWT access token",
      },
      "JWT-auth"
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  await app.listen(port);
  logger.log(`====================================================`);
  logger.log(`Khulafasco Backend running on: http://localhost:${port}/api/v1`);
  logger.log(`OpenAPI Swagger documentation: http://localhost:${port}/api/docs`);
  logger.log(`Health Check endpoint:         http://localhost:${port}/health`);
  logger.log(`Environment:                   ${configService.get("env")}`);
  logger.log(`====================================================`);
}

bootstrap();
