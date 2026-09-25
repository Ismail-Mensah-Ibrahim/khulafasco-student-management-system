# Khulafasco Dedicated Backend (NestJS)

Production-grade, modular NestJS backend for **Al-Khulafau Ar-Rashiduun Islamic Senior High School (Khulafasco)**.

---

## Architecture Overview

- **Framework**: NestJS 11 (Express, TypeScript)
- **Database**: Supabase PostgreSQL 15 (Direct Connection Pool + Supabase Service Client)
- **Authentication**: Supabase Auth (GoTrue) + Server-side JWT validation & Profile RBAC
- **Validation**: `class-validator`, `class-transformer`
- **Documentation**: OpenAPI 3.0 / Swagger UI (`/api/docs`)
- **Observability**: Request correlation IDs (`x-request-id`), structured logging, health checks (`/health`, `/health/ready`)
- **Security**: Rate limiting via `@nestjs/throttler`, CORS whitelist, strict DTO validation pipes, error sanitization

---

## Local Development

### 1. Prerequisites
- Node.js >= 20.x
- npm >= 10.x

### 2. Setup Environment
```bash
cp .env.example .env
```
Fill in your Supabase project credentials.

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Development Server
```bash
npm run start:dev
```
- API Base: `http://localhost:4000/api/v1`
- Swagger UI: `http://localhost:4000/api/docs`
- Health Endpoint: `http://localhost:4000/health`
- Readiness Endpoint: `http://localhost:4000/health/ready`

### 5. Run Tests & Build
```bash
npm test          # Run unit tests
npm run build     # Compile TypeScript to dist/
```

---

## Standard API Response Format

### Success:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "requestId": "9c123456-789a-bcde-f012-3456789abcde",
  "timestamp": "2026-09-25T12:00:00.000Z"
}
```

### Error:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Input validation failed",
    "details": ["email must be an email"]
  },
  "requestId": "9c123456-789a-bcde-f012-3456789abcde",
  "timestamp": "2026-09-25T12:00:00.000Z"
}
```
