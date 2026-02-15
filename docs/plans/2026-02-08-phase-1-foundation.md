# Phase 1: Foundation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** PostgreSQL running via Docker, Prisma schema migrated and seeded, BetterAuth working (signup/login/session), Swagger docs live, input validation enabled, mobile has Expo Router with auth screens and tab placeholders.

**Architecture:** NestJS API with a custom Express v5 server — BetterAuth handler is mounted first (before body parser), then NestJS takes over. Prisma ORM connects to PostgreSQL via Docker Compose. Mobile uses Expo Router (file-based routing), Gluestack UI (NativeWind), and BetterAuth's Expo client for auth with SecureStore persistence.

**Tech Stack:** NestJS v11, PostgreSQL 16 (Docker), Prisma, BetterAuth, Swagger, Expo SDK 54, Expo Router, Gluestack UI, NativeWind, TanStack Query, Zustand

**Design Reference:** `docs/plans/2026-02-08-family-budget-tracker-design.md`

---

## Task 1: Docker Compose + Environment Files

**Files:**
- Create: `docker-compose.yml`
- Create: `apps/api/.env.example`
- Create: `apps/api/.env`

**Step 1: Create Docker Compose file**

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    container_name: budgety-postgres
    restart: unless-stopped
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: budgety
      POSTGRES_PASSWORD: budgety
      POSTGRES_DB: budgety
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

**Step 2: Create environment files**

`apps/api/.env.example`:
```
DATABASE_URL="postgresql://budgety:budgety@localhost:5432/budgety?schema=public"
BETTER_AUTH_SECRET="change-me-to-a-random-secret"
BETTER_AUTH_URL="http://localhost:3000"
PORT=3000
```

`apps/api/.env` — same content but with a real secret:
```
DATABASE_URL="postgresql://budgety:budgety@localhost:5432/budgety?schema=public"
BETTER_AUTH_SECRET="dev-secret-change-in-production-min-32-chars!!"
BETTER_AUTH_URL="http://localhost:3000"
PORT=3000
```

**Step 3: Start PostgreSQL**

Run: `docker compose up -d`
Expected: Container `budgety-postgres` running on port 5432

**Step 4: Commit**

```bash
git add docker-compose.yml apps/api/.env.example
git commit -m "feat: add Docker Compose for PostgreSQL and env template"
```

> Do NOT commit `apps/api/.env` — it is gitignored.

---

## Task 2: Install Prisma + Create Schema

**Files:**
- Modify: `apps/api/package.json` (new deps)
- Create: `apps/api/prisma/schema.prisma`

**Step 1: Install Prisma**

Run from `apps/api/`:
```bash
pnpm add @prisma/client
pnpm add -D prisma tsx
```

`tsx` is needed later for running the seed script.

**Step 2: Initialize Prisma**

Run from `apps/api/`:
```bash
npx prisma init
```

This creates `prisma/schema.prisma` with a default template. Replace its content entirely.

**Step 3: Write the full schema**

Replace `apps/api/prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── BetterAuth-managed tables ───────────────────────────────────

model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  emailVerified Boolean   @default(false)
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  displayName   String?
  avatarUrl     String?

  familyMemberships FamilyMember[]
  expenses          Expense[]
  recurringExpenses RecurringExpense[]
  sessions          Session[]
  accounts          Account[]

  @@map("user")
}

model Session {
  id        String   @id @default(cuid())
  expiresAt DateTime
  token     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  ipAddress String?
  userAgent String?
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("session")
}

model Account {
  id                    String    @id @default(cuid())
  accountId             String
  providerId            String
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@map("account")
}

model Verification {
  id         String    @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime? @default(now())
  updatedAt  DateTime? @updatedAt

  @@map("verification")
}

// ─── Application tables ──────────────────────────────────────────

enum FamilyRole {
  ADMIN
  MEMBER
}

enum Frequency {
  DAILY
  WEEKLY
  MONTHLY
  YEARLY
}

model Family {
  id            String   @id @default(cuid())
  name          String
  currency      String   @default("INR")
  monthlyBudget Float?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  members           FamilyMember[]
  categories        Category[]
  expenses          Expense[]
  recurringExpenses RecurringExpense[]
  categoryBudgets   CategoryBudget[]
  invites           Invite[]
}

model Invite {
  id        String    @id @default(cuid())
  code      String    @unique
  familyId  String
  family    Family    @relation(fields: [familyId], references: [id], onDelete: Cascade)
  createdBy String
  usedBy    String?
  usedAt    DateTime?
  expiresAt DateTime
  createdAt DateTime  @default(now())

  @@index([code])
}

model FamilyMember {
  id       String     @id @default(cuid())
  role     FamilyRole @default(MEMBER)
  joinedAt DateTime   @default(now())
  userId   String
  user     User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  familyId String
  family   Family     @relation(fields: [familyId], references: [id], onDelete: Cascade)

  @@unique([userId, familyId])
}

model Category {
  id        String  @id @default(cuid())
  name      String
  icon      String?
  isDefault Boolean @default(false)
  familyId  String?
  family    Family? @relation(fields: [familyId], references: [id], onDelete: Cascade)

  expenses          Expense[]
  recurringExpenses RecurringExpense[]
  categoryBudgets   CategoryBudget[]

  @@unique([name, familyId])
}

model CategoryBudget {
  id         String   @id @default(cuid())
  month      String   // "YYYY-MM"
  amount     Float
  familyId   String
  family     Family   @relation(fields: [familyId], references: [id], onDelete: Cascade)
  categoryId String
  category   Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@unique([familyId, categoryId, month])
}

model Expense {
  id          String   @id @default(cuid())
  amount      Float
  description String
  date        DateTime
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  categoryId  String
  category    Category @relation(fields: [categoryId], references: [id])
  familyId    String
  family      Family   @relation(fields: [familyId], references: [id], onDelete: Cascade)
  createdById String
  createdBy   User     @relation(fields: [createdById], references: [id])
}

model RecurringExpense {
  id          String    @id @default(cuid())
  amount      Float
  description String
  frequency   Frequency
  startDate   DateTime
  endDate     DateTime?
  nextDueDate DateTime
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  categoryId  String
  category    Category  @relation(fields: [categoryId], references: [id])
  familyId    String
  family      Family    @relation(fields: [familyId], references: [id], onDelete: Cascade)
  createdById String
  createdBy   User      @relation(fields: [createdById], references: [id])
}
```

**Step 4: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/package.json pnpm-lock.yaml
git commit -m "feat: add Prisma with full database schema"
```

---

## Task 3: Run Migration + Seed Default Categories

**Files:**
- Create: `apps/api/prisma/seed.ts`
- Modify: `apps/api/package.json` (add prisma.seed config)

**Step 1: Run initial migration**

Run from `apps/api/` (Docker must be running):
```bash
npx prisma migrate dev --name init
```
Expected: Migration applied, Prisma Client generated. Tables created in PostgreSQL.

**Step 2: Create seed script**

`apps/api/prisma/seed.ts`:
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultCategories = [
  { name: 'Groceries/Kirana', icon: 'shopping-cart', isDefault: true },
  { name: 'Rent', icon: 'home', isDefault: true },
  { name: 'Utilities', icon: 'zap', isDefault: true },
  { name: 'Transport', icon: 'car', isDefault: true },
  { name: 'Medical/Health', icon: 'heart-pulse', isDefault: true },
  { name: 'Education', icon: 'graduation-cap', isDefault: true },
  { name: 'Dining Out', icon: 'utensils', isDefault: true },
  { name: 'Entertainment', icon: 'film', isDefault: true },
  { name: 'Shopping', icon: 'shopping-bag', isDefault: true },
  { name: 'EMI/Loans', icon: 'landmark', isDefault: true },
  { name: 'Household Help', icon: 'hand-helping', isDefault: true },
  { name: 'Mobile/Internet', icon: 'wifi', isDefault: true },
];

async function main() {
  const existing = await prisma.category.count({
    where: { isDefault: true },
  });

  if (existing === 0) {
    await prisma.category.createMany({ data: defaultCategories });
    console.log(`Seeded ${defaultCategories.length} default categories`);
  } else {
    console.log(`Default categories already exist (${existing}), skipping`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Step 3: Configure seed command in package.json**

Add to `apps/api/package.json` at the top level:
```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

**Step 4: Run the seed**

Run from `apps/api/`:
```bash
npx prisma db seed
```
Expected: `Seeded 12 default categories`

**Step 5: Commit**

```bash
git add apps/api/prisma/ apps/api/package.json
git commit -m "feat: add Prisma migration and seed default categories"
```

---

## Task 4: PrismaModule (Global)

**Files:**
- Create: `apps/api/src/prisma/prisma.service.ts`
- Create: `apps/api/src/prisma/prisma.service.spec.ts`
- Create: `apps/api/src/prisma/prisma.module.ts`
- Modify: `apps/api/src/app.module.ts`

**Step 1: Write failing test for PrismaService**

`apps/api/src/prisma/prisma.service.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should extend PrismaClient', () => {
    expect(service).toHaveProperty('$connect');
    expect(service).toHaveProperty('$disconnect');
  });
});
```

**Step 2: Run test to verify it fails**

Run from `apps/api/`:
```bash
pnpm test -- --testPathPattern=prisma.service
```
Expected: FAIL — `Cannot find module './prisma.service'`

**Step 3: Implement PrismaService**

`apps/api/src/prisma/prisma.service.ts`:
```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

**Step 4: Run test to verify it passes**

Run from `apps/api/`:
```bash
pnpm test -- --testPathPattern=prisma.service
```
Expected: PASS

**Step 5: Create PrismaModule**

`apps/api/src/prisma/prisma.module.ts`:
```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

**Step 6: Add PrismaModule to AppModule**

Update `apps/api/src/app.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

**Step 7: Run all tests**

Run from `apps/api/`:
```bash
pnpm test
```
Expected: All tests pass (existing `app.controller.spec.ts` + new `prisma.service.spec.ts`)

**Step 8: Commit**

```bash
git add apps/api/src/prisma/ apps/api/src/app.module.ts
git commit -m "feat: add global PrismaModule with PrismaService"
```

---

## Task 5: ConfigModule + Validation

**Files:**
- Modify: `apps/api/package.json` (new deps)
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/main.ts`

**Step 1: Install dependencies**

Run from `apps/api/`:
```bash
pnpm add @nestjs/config class-validator class-transformer
```

**Step 2: Add ConfigModule to AppModule**

Update `apps/api/src/app.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

**Step 3: Add global ValidationPipe to main.ts**

Update `apps/api/src/main.ts` to add the pipe after NestFactory.create:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

> `whitelist: true` strips unknown properties from DTOs. `transform: true` enables `class-transformer` decorators (e.g., `@Transform` for money truncation).

**Step 4: Run tests**

Run from `apps/api/`:
```bash
pnpm test
```
Expected: All tests pass

**Step 5: Commit**

```bash
git add apps/api/package.json apps/api/src/app.module.ts apps/api/src/main.ts pnpm-lock.yaml
git commit -m "feat: add ConfigModule and global ValidationPipe"
```

---

## Task 6: BetterAuth Instance + AuthService

**Files:**
- Modify: `apps/api/package.json` (new dep)
- Create: `apps/api/src/auth/auth.ts`
- Create: `apps/api/src/auth/auth.service.ts`
- Create: `apps/api/src/auth/auth.service.spec.ts`
- Create: `apps/api/src/auth/auth.module.ts`

**Step 1: Install better-auth**

Run from `apps/api/`:
```bash
pnpm add better-auth
```

**Step 2: Create BetterAuth instance**

`apps/api/src/auth/auth.ts`:
```typescript
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
  },
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
```

> Note: This creates a standalone PrismaClient separate from the NestJS-managed PrismaService. This is intentional — `auth.ts` is used in `main.ts` before NestJS DI bootstraps.

**Step 3: Write failing test for AuthService**

`apps/api/src/auth/auth.service.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';

// Mock the auth module
jest.mock('./auth', () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
}));

import { auth } from './auth';

const mockGetSession = auth.api.getSession as jest.Mock;

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return session when valid', async () => {
    const mockSession = {
      session: { id: 's1', userId: 'u1' },
      user: { id: 'u1', name: 'Test', email: 'test@example.com' },
    };
    mockGetSession.mockResolvedValue(mockSession);

    const result = await service.getSession({});
    expect(result).toEqual(mockSession);
  });

  it('should return null when no session', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await service.getSession({});
    expect(result).toBeNull();
  });
});
```

**Step 4: Run test to verify it fails**

Run from `apps/api/`:
```bash
pnpm test -- --testPathPattern=auth.service
```
Expected: FAIL — `Cannot find module './auth.service'`

**Step 5: Implement AuthService**

`apps/api/src/auth/auth.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { auth } from './auth';
import { fromNodeHeaders } from 'better-auth/node';
import { IncomingHttpHeaders } from 'http';

@Injectable()
export class AuthService {
  async getSession(headers: IncomingHttpHeaders) {
    return auth.api.getSession({
      headers: fromNodeHeaders(headers),
    });
  }
}
```

**Step 6: Run test to verify it passes**

Run from `apps/api/`:
```bash
pnpm test -- --testPathPattern=auth.service
```
Expected: PASS

**Step 7: Create AuthModule**

`apps/api/src/auth/auth.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';

@Module({
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
```

**Step 8: Commit**

```bash
git add apps/api/src/auth/ apps/api/package.json pnpm-lock.yaml
git commit -m "feat: add BetterAuth instance and AuthService"
```

---

## Task 7: Session Guard + CurrentUser Decorator

**Files:**
- Create: `apps/api/src/auth/guards/session.guard.ts`
- Create: `apps/api/src/auth/guards/session.guard.spec.ts`
- Create: `apps/api/src/auth/decorators/current-user.decorator.ts`
- Modify: `apps/api/src/auth/auth.module.ts`

**Step 1: Write failing test for SessionGuard**

`apps/api/src/auth/guards/session.guard.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SessionGuard } from './session.guard';
import { AuthService } from '../auth.service';

function createMockExecutionContext(
  headers: Record<string, string> = {},
): ExecutionContext {
  const mockRequest = { headers };
  return {
    switchToHttp: () => ({
      getRequest: () => mockRequest,
    }),
  } as unknown as ExecutionContext;
}

describe('SessionGuard', () => {
  let guard: SessionGuard;
  let authService: { getSession: jest.Mock };

  beforeEach(async () => {
    authService = { getSession: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionGuard,
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    guard = module.get<SessionGuard>(SessionGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow authenticated requests and attach user', async () => {
    const mockSession = {
      session: { id: 's1', userId: 'u1' },
      user: { id: 'u1', name: 'Test', email: 'test@example.com' },
    };
    authService.getSession.mockResolvedValue(mockSession);

    const context = createMockExecutionContext({
      authorization: 'Bearer token',
    });
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    const request = context.switchToHttp().getRequest();
    expect(request['user']).toEqual(mockSession.user);
    expect(request['session']).toEqual(mockSession.session);
  });

  it('should throw UnauthorizedException when no session', async () => {
    authService.getSession.mockResolvedValue(null);

    const context = createMockExecutionContext();

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException when session has no user', async () => {
    authService.getSession.mockResolvedValue({ session: {}, user: null });

    const context = createMockExecutionContext();

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run from `apps/api/`:
```bash
pnpm test -- --testPathPattern=session.guard
```
Expected: FAIL — `Cannot find module './session.guard'`

**Step 3: Implement SessionGuard**

`apps/api/src/auth/guards/session.guard.ts`:
```typescript
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../auth.service';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const session = await this.authService.getSession(request.headers);

    if (!session?.user) {
      throw new UnauthorizedException();
    }

    request['user'] = session.user;
    request['session'] = session.session;

    return true;
  }
}
```

**Step 4: Run test to verify it passes**

Run from `apps/api/`:
```bash
pnpm test -- --testPathPattern=session.guard
```
Expected: PASS

**Step 5: Create CurrentUser decorator**

`apps/api/src/auth/decorators/current-user.decorator.ts`:
```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

**Step 6: Update AuthModule to export guard**

`apps/api/src/auth/auth.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SessionGuard } from './guards/session.guard';

@Module({
  providers: [AuthService, SessionGuard],
  exports: [AuthService, SessionGuard],
})
export class AuthModule {}
```

**Step 7: Run all tests**

Run from `apps/api/`:
```bash
pnpm test
```
Expected: All tests pass

**Step 8: Commit**

```bash
git add apps/api/src/auth/
git commit -m "feat: add SessionGuard and CurrentUser decorator"
```

---

## Task 8: Update main.ts — Mount BetterAuth + Swagger

**Files:**
- Modify: `apps/api/package.json` (new dep)
- Modify: `apps/api/src/main.ts`
- Modify: `apps/api/src/app.module.ts`

**Step 1: Install Swagger**

Run from `apps/api/`:
```bash
pnpm add @nestjs/swagger
```

> Note: `@types/express` is already a devDependency — no need to install it.

**Step 2: Update main.ts**

Replace `apps/api/src/main.ts` with:

```typescript
import express from 'express';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth/auth';
import { AppModule } from './app.module';

async function bootstrap() {
  const server = express();

  // Mount BetterAuth BEFORE body parser — it needs the raw request body
  // Express v5 uses {*any} wildcard syntax (not * like v4)
  server.all('/api/auth/{*any}', toNodeHandler(auth));

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Budgety API')
    .setDescription('Family Budget Tracker API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

> **Important:** This project uses Express v5.2.1 which requires `{*any}` wildcard syntax. Express v4 used `*` instead.

**Step 3: Update AppModule with AuthModule**

`apps/api/src/app.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

**Step 4: Verify API starts and Swagger loads**

Run from `apps/api/`:
```bash
pnpm dev
```

Then verify:
- `http://localhost:3000/` → "Hello World!" (existing endpoint)
- `http://localhost:3000/docs` → Swagger UI loads
- `http://localhost:3000/api/auth/ok` → BetterAuth health check (returns `{ status: "ok" }`)

**Step 5: Run all tests**

Run from `apps/api/`:
```bash
pnpm test
```
Expected: All tests pass

> Note: The existing `app.controller.spec.ts` may need updating if `AppModule` changes break it. If the test fails because of ConfigModule/PrismaModule, update the test to mock or import them.

**Step 6: Commit**

```bash
git add apps/api/src/main.ts apps/api/src/app.module.ts apps/api/package.json pnpm-lock.yaml
git commit -m "feat: mount BetterAuth handler and Swagger docs"
```

---

## Task 9: UserModule

**Files:**
- Create: `apps/api/src/user/user.service.ts`
- Create: `apps/api/src/user/user.service.spec.ts`
- Create: `apps/api/src/user/user.controller.ts`
- Create: `apps/api/src/user/user.controller.spec.ts`
- Create: `apps/api/src/user/dto/update-user.dto.ts`
- Create: `apps/api/src/user/user.module.ts`
- Modify: `apps/api/src/app.module.ts`

**Step 1: Write failing test for UserService**

`apps/api/src/user/user.service.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return a user', async () => {
      const user = {
        id: 'u1',
        name: 'Test',
        email: 'test@example.com',
        displayName: null,
        avatarUrl: null,
      };
      mockPrisma.user.findUnique.mockResolvedValue(user);

      const result = await service.findById('u1');
      expect(result).toEqual(user);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'u1' },
        select: {
          id: true,
          name: true,
          email: true,
          displayName: true,
          avatarUrl: true,
          createdAt: true,
        },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update and return the user', async () => {
      const updated = {
        id: 'u1',
        name: 'Test',
        email: 'test@example.com',
        displayName: 'Tester',
        avatarUrl: null,
      };
      mockPrisma.user.update.mockResolvedValue(updated);

      const result = await service.update('u1', { displayName: 'Tester' });
      expect(result).toEqual(updated);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { displayName: 'Tester' },
        select: {
          id: true,
          name: true,
          email: true,
          displayName: true,
          avatarUrl: true,
          createdAt: true,
        },
      });
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run from `apps/api/`:
```bash
pnpm test -- --testPathPattern=user.service
```
Expected: FAIL — `Cannot find module './user.service'`

**Step 3: Create DTO**

`apps/api/src/user/dto/update-user.dto.ts`:
```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
```

**Step 4: Implement UserService**

`apps/api/src/user/user.service.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

const userSelect = {
  id: true,
  name: true,
  email: true,
  displayName: true,
  avatarUrl: true,
  createdAt: true,
} as const;

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: userSelect,
    });
  }
}
```

**Step 5: Run UserService tests**

Run from `apps/api/`:
```bash
pnpm test -- --testPathPattern=user.service
```
Expected: PASS

**Step 6: Write failing test for UserController**

`apps/api/src/user/user.controller.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';

const mockUserService = {
  findById: jest.fn(),
  update: jest.fn(),
};

describe('UserController', () => {
  let controller: UserController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: mockUserService }],
    }).compile();

    controller = module.get<UserController>(UserController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMe', () => {
    it('should return the current user', async () => {
      const user = { id: 'u1', name: 'Test', email: 'test@example.com' };
      mockUserService.findById.mockResolvedValue(user);

      const result = await controller.getMe({ id: 'u1' } as any);
      expect(result).toEqual(user);
      expect(mockUserService.findById).toHaveBeenCalledWith('u1');
    });
  });

  describe('updateMe', () => {
    it('should update and return the current user', async () => {
      const updated = {
        id: 'u1',
        name: 'Test',
        email: 'test@example.com',
        displayName: 'Tester',
      };
      mockUserService.update.mockResolvedValue(updated);

      const result = await controller.updateMe(
        { id: 'u1' } as any,
        { displayName: 'Tester' },
      );
      expect(result).toEqual(updated);
      expect(mockUserService.update).toHaveBeenCalledWith('u1', {
        displayName: 'Tester',
      });
    });
  });
});
```

**Step 7: Run test to verify it fails**

Run from `apps/api/`:
```bash
pnpm test -- --testPathPattern=user.controller.spec
```
Expected: FAIL — `Cannot find module './user.controller'`

**Step 8: Implement UserController**

`apps/api/src/user/user.controller.ts`:
```typescript
import {
  Body,
  Controller,
  Get,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('User')
@ApiBearerAuth()
@Controller('users')
@UseGuards(SessionGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  async getMe(@CurrentUser() user: { id: string }) {
    return this.userService.findById(user.id);
  }

  @Patch('me')
  async updateMe(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateUserDto,
  ) {
    return this.userService.update(user.id, dto);
  }
}
```

**Step 9: Run UserController tests**

Run from `apps/api/`:
```bash
pnpm test -- --testPathPattern=user.controller.spec
```
Expected: PASS

**Step 10: Create UserModule and register in AppModule**

`apps/api/src/user/user.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
```

Update `apps/api/src/app.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

**Step 11: Run all tests**

Run from `apps/api/`:
```bash
pnpm test
```
Expected: All tests pass

**Step 12: Commit**

```bash
git add apps/api/src/user/ apps/api/src/app.module.ts
git commit -m "feat: add UserModule with GET/PATCH /users/me"
```

---

## Task 10: Mobile — Expo Router + Core Dependencies

**Files:**
- Delete: `apps/mobile/App.js`
- Delete: `apps/mobile/index.js`
- Modify: `apps/mobile/package.json`
- Modify: `apps/mobile/app.json`
- Create: `apps/mobile/app/_layout.tsx`
- Create: `apps/mobile/app/index.tsx`

**Step 1: Install Expo Router and peer dependencies**

Run from `apps/mobile/`:
```bash
npx expo install expo-router expo-linking expo-constants expo-splash-screen react-native-safe-area-context react-native-screens react-native-reanimated
```

**Step 2: Delete old entry files**

Delete `apps/mobile/App.js` and `apps/mobile/index.js`.

**Step 3: Update package.json**

In `apps/mobile/package.json`, set the `main` field:
```json
{
  "main": "expo-router/entry"
}
```

**Step 4: Update app.json**

Update `apps/mobile/app.json` — change name/slug and add scheme + plugins:
```json
{
  "expo": {
    "name": "Budgety",
    "slug": "budgety",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "budgety",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "edgeToEdgeEnabled": true
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-router",
      "expo-secure-store"
    ]
  }
}
```

> Note: Changed `"name": "mobile"` → `"name": "Budgety"` and `"slug": "mobile"` → `"slug": "budgety"` to match the app identity.

**Step 5: Create minimal root layout**

`apps/mobile/app/_layout.tsx`:
```tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

**Step 6: Create placeholder index**

`apps/mobile/app/index.tsx`:
```tsx
import { View, Text, StyleSheet } from 'react-native';

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Budgety</Text>
      <Text>Family Budget Tracker</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
});
```

**Step 7: Verify the app starts**

Run from `apps/mobile/`:
```bash
pnpm dev
```
Expected: Expo dev server starts. App loads showing "Budgety — Family Budget Tracker".

**Step 8: Commit**

```bash
git add apps/mobile/app/ apps/mobile/package.json apps/mobile/app.json
git rm apps/mobile/App.js apps/mobile/index.js
git commit -m "feat: setup Expo Router with root layout"
```

---

## Task 11: Mobile — NativeWind + Gluestack UI

**Files:**
- Create: `apps/mobile/tailwind.config.ts`
- Create: `apps/mobile/global.css`
- Create: `apps/mobile/babel.config.js`
- Create: `apps/mobile/metro.config.js`
- Create: `apps/mobile/nativewind-env.d.ts`

**Step 1: Install NativeWind and Tailwind CSS**

Run from `apps/mobile/`:
```bash
npx expo install nativewind tailwindcss
```

**Step 2: Create Tailwind config**

`apps/mobile/tailwind.config.ts`:
```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
```

**Step 3: Create global CSS**

`apps/mobile/global.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 4: Create babel config**

`apps/mobile/babel.config.js`:
```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
```

**Step 5: Create metro config**

`apps/mobile/metro.config.js`:
```javascript
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
```

**Step 6: Add NativeWind type reference**

`apps/mobile/nativewind-env.d.ts`:
```typescript
/// <reference types="nativewind/types" />
```

**Step 7: Update root layout to import global CSS**

Update `apps/mobile/app/_layout.tsx`:
```tsx
import '@/global.css';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

**Step 8: Initialize Gluestack UI**

Run from `apps/mobile/`:
```bash
npx gluestack-ui init
```

Follow the interactive prompts. This will:
- Create a `components/ui/` directory with base components
- Set up the `GluestackUIProvider` component
- Add any needed peer dependencies

> If the CLI asks questions, accept defaults. It auto-detects Expo and NativeWind.

**Step 9: Verify NativeWind works**

Update `apps/mobile/app/index.tsx` to use Tailwind classes:
```tsx
import { View, Text } from 'react-native';

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-2xl font-bold mb-2">Budgety</Text>
      <Text className="text-gray-600">Family Budget Tracker</Text>
    </View>
  );
}
```

Run `pnpm dev` and verify the app renders with Tailwind styles.

**Step 10: Commit**

```bash
git add apps/mobile/tailwind.config.ts apps/mobile/global.css apps/mobile/babel.config.js apps/mobile/metro.config.js apps/mobile/nativewind-env.d.ts apps/mobile/app/ apps/mobile/components/ apps/mobile/package.json pnpm-lock.yaml
git commit -m "feat: configure NativeWind and Gluestack UI"
```

---

## Task 12: Mobile — Auth Client + State Stores

**Files:**
- Create: `apps/mobile/lib/auth.ts`
- Create: `apps/mobile/lib/api.ts`
- Create: `apps/mobile/lib/queryClient.ts`
- Create: `apps/mobile/stores/authStore.ts`
- Create: `apps/mobile/stores/familyStore.ts`

**Step 1: Install auth, state, and data fetching packages**

Run from `apps/mobile/`:
```bash
npx expo install expo-secure-store
pnpm add better-auth @better-auth/expo @tanstack/react-query zustand
```

**Step 2: Create BetterAuth client**

`apps/mobile/lib/auth.ts`:
```typescript
import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
  plugins: [
    expoClient({
      scheme: 'budgety',
      storagePrefix: 'budgety',
      storage: SecureStore,
    }),
  ],
});
```

**Step 3: Create API fetch wrapper**

`apps/mobile/lib/api.ts`:
```typescript
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || 'API request failed');
  }

  return res.json();
}
```

**Step 4: Create TanStack Query client**

`apps/mobile/lib/queryClient.ts`:
```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});
```

**Step 5: Create auth store (Zustand)**

`apps/mobile/stores/authStore.ts`:
```typescript
import { create } from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  setAuthenticated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  setAuthenticated: (value) => set({ isAuthenticated: value }),
}));
```

**Step 6: Create family store (Zustand)**

`apps/mobile/stores/familyStore.ts`:
```typescript
import { create } from 'zustand';

interface FamilyState {
  activeFamilyId: string | null;
  setActiveFamilyId: (id: string | null) => void;
}

export const useFamilyStore = create<FamilyState>((set) => ({
  activeFamilyId: null,
  setActiveFamilyId: (id) => set({ activeFamilyId: id }),
}));
```

**Step 7: Commit**

```bash
git add apps/mobile/lib/ apps/mobile/stores/ apps/mobile/package.json pnpm-lock.yaml
git commit -m "feat: add auth client, API wrapper, and state stores"
```

---

## Task 13: Mobile — Auth Screens

**Files:**
- Create: `apps/mobile/app/(auth)/_layout.tsx`
- Create: `apps/mobile/app/(auth)/login.tsx`
- Create: `apps/mobile/app/(auth)/signup.tsx`

**Step 1: Create auth group layout**

`apps/mobile/app/(auth)/_layout.tsx`:
```tsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
```

**Step 2: Create login screen**

`apps/mobile/app/(auth)/login.tsx`:
```tsx
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Link, router } from 'expo-router';
import { authClient } from '@/lib/auth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = await authClient.signIn.email({
        email,
        password,
      });

      if (error) {
        Alert.alert('Error', error.message || 'Login failed');
        return;
      }

      router.replace('/(app)/(tabs)');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <View className="flex-1 justify-center px-6 bg-white">
        <Text className="text-3xl font-bold text-center mb-2">Budgety</Text>
        <Text className="text-gray-500 text-center mb-8">
          Sign in to your account
        </Text>

        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base"
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-3 mb-6 text-base"
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          className={`rounded-lg py-3 items-center ${loading ? 'bg-gray-400' : 'bg-black'}`}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text className="text-white font-semibold text-base">
            {loading ? 'Signing in...' : 'Sign In'}
          </Text>
        </TouchableOpacity>

        <View className="flex-row justify-center mt-6">
          <Text className="text-gray-500">Don't have an account? </Text>
          <Link href="/(auth)/signup" asChild>
            <TouchableOpacity>
              <Text className="font-semibold">Sign Up</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
```

**Step 3: Create signup screen**

`apps/mobile/app/(auth)/signup.tsx`:
```tsx
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Link, router } from 'expo-router';
import { authClient } from '@/lib/auth';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = await authClient.signUp.email({
        name,
        email,
        password,
      });

      if (error) {
        Alert.alert('Error', error.message || 'Signup failed');
        return;
      }

      router.replace('/(app)/(tabs)');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <View className="flex-1 justify-center px-6 bg-white">
        <Text className="text-3xl font-bold text-center mb-2">Budgety</Text>
        <Text className="text-gray-500 text-center mb-8">
          Create your account
        </Text>

        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base"
          placeholder="Full Name"
          value={name}
          onChangeText={setName}
        />

        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base"
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-3 mb-6 text-base"
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          className={`rounded-lg py-3 items-center ${loading ? 'bg-gray-400' : 'bg-black'}`}
          onPress={handleSignup}
          disabled={loading}
        >
          <Text className="text-white font-semibold text-base">
            {loading ? 'Creating account...' : 'Sign Up'}
          </Text>
        </TouchableOpacity>

        <View className="flex-row justify-center mt-6">
          <Text className="text-gray-500">Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text className="font-semibold">Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
```

**Step 4: Commit**

```bash
git add apps/mobile/app/\(auth\)/
git commit -m "feat: add login and signup auth screens"
```

---

## Task 14: Mobile — Tab Shell + Auth Guard Layout

**Files:**
- Create: `apps/mobile/app/(app)/_layout.tsx`
- Create: `apps/mobile/app/(app)/(tabs)/_layout.tsx`
- Create: `apps/mobile/app/(app)/(tabs)/index.tsx`
- Create: `apps/mobile/app/(app)/(tabs)/expenses.tsx`
- Create: `apps/mobile/app/(app)/(tabs)/reports.tsx`
- Create: `apps/mobile/app/(app)/(tabs)/settings.tsx`
- Modify: `apps/mobile/app/_layout.tsx`
- Modify: `apps/mobile/app/index.tsx` (becomes redirect)

**Step 1: Create app group layout with auth guard**

`apps/mobile/app/(app)/_layout.tsx`:
```tsx
import { Redirect, Stack } from 'expo-router';
import { authClient } from '@/lib/auth';
import { View, ActivityIndicator } from 'react-native';

export default function AppLayout() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
```

**Step 2: Create tabs layout**

`apps/mobile/app/(app)/(tabs)/_layout.tsx`:
```tsx
import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#000',
        tabBarInactiveTintColor: '#999',
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Expenses',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>💰</Text>,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📊</Text>,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>⚙️</Text>,
        }}
      />
    </Tabs>
  );
}
```

> Note: Emoji icons are temporary placeholders. Phase 2+ will replace them with proper icon components (e.g., Lucide icons from Gluestack).

**Step 3: Create placeholder tab screens**

`apps/mobile/app/(app)/(tabs)/index.tsx`:
```tsx
import { View, Text } from 'react-native';
import { authClient } from '@/lib/auth';

export default function HomeScreen() {
  const { data: session } = authClient.useSession();

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-xl font-bold mb-2">Welcome to Budgety</Text>
      <Text className="text-gray-500">
        {session?.user?.name ? `Hello, ${session.user.name}!` : 'Loading...'}
      </Text>
    </View>
  );
}
```

`apps/mobile/app/(app)/(tabs)/expenses.tsx`:
```tsx
import { View, Text } from 'react-native';

export default function ExpensesScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-xl font-bold mb-2">Expenses</Text>
      <Text className="text-gray-500">Coming in Phase 2</Text>
    </View>
  );
}
```

`apps/mobile/app/(app)/(tabs)/reports.tsx`:
```tsx
import { View, Text } from 'react-native';

export default function ReportsScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-xl font-bold mb-2">Reports</Text>
      <Text className="text-gray-500">Coming in Phase 3</Text>
    </View>
  );
}
```

`apps/mobile/app/(app)/(tabs)/settings.tsx`:
```tsx
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { authClient } from '@/lib/auth';

export default function SettingsScreen() {
  const { data: session } = authClient.useSession();

  const handleLogout = async () => {
    await authClient.signOut();
    router.replace('/(auth)/login');
  };

  return (
    <View className="flex-1 bg-white px-6 pt-4">
      <View className="bg-gray-50 rounded-lg p-4 mb-6">
        <Text className="text-lg font-semibold">
          {session?.user?.name || 'User'}
        </Text>
        <Text className="text-gray-500">{session?.user?.email}</Text>
      </View>

      <TouchableOpacity
        className="bg-red-50 rounded-lg py-3 items-center"
        onPress={handleLogout}
      >
        <Text className="text-red-600 font-semibold">Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}
```

**Step 4: Update root layout with providers**

Replace `apps/mobile/app/_layout.tsx`:
```tsx
import '@/global.css';
import { Slot } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <GluestackUIProvider>
        <Slot />
      </GluestackUIProvider>
    </QueryClientProvider>
  );
}
```

> Note: Using `<Slot />` instead of `<Stack />` because child group layouts `(auth)` and `(app)` handle their own navigation. `GluestackUIProvider` wraps everything for themed component access.

**Step 5: Update root index as redirect**

Replace `apps/mobile/app/index.tsx`:
```tsx
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/(app)/(tabs)" />;
}
```

**Step 6: Verify the full navigation flow**

Run from `apps/mobile/`:
```bash
pnpm dev
```

Expected flow:
1. App opens → root index redirects to `/(app)/(tabs)`
2. `(app)/_layout.tsx` checks session → no session → redirects to `/(auth)/login`
3. Login screen renders
4. After successful login → redirects to `/(app)/(tabs)` → Home tab shows

**Step 7: Commit**

```bash
git add apps/mobile/app/
git commit -m "feat: add tab shell with auth guard and placeholder screens"
```

---

## Task 15: Integration Verification

Run through this checklist to verify everything works end-to-end:

### Backend Checklist

- [ ] `docker compose up -d` → PostgreSQL container running
- [ ] `cd apps/api && pnpm dev` → API starts on port 3000
- [ ] `GET http://localhost:3000/` → `"Hello World!"`
- [ ] `GET http://localhost:3000/docs` → Swagger UI loads with Budgety API docs
- [ ] `GET http://localhost:3000/api/auth/ok` → BetterAuth responds `{ "status": "ok" }`
- [ ] `POST http://localhost:3000/api/auth/sign-up/email` with `{ "name": "Test", "email": "test@example.com", "password": "test1234" }` → User created
- [ ] `POST http://localhost:3000/api/auth/sign-in/email` with `{ "email": "test@example.com", "password": "test1234" }` → Session returned
- [ ] `GET http://localhost:3000/users/me` with session cookie/token → Returns user profile
- [ ] `PATCH http://localhost:3000/users/me` with `{ "displayName": "Tester" }` → Updates profile
- [ ] `GET http://localhost:3000/users/me` without auth → 401 Unauthorized
- [ ] `cd apps/api && pnpm test` → All unit tests pass

### Mobile Checklist

- [ ] `cd apps/mobile && pnpm dev` → Expo dev server starts
- [ ] App opens → redirects to login screen (no session)
- [ ] Signup form works → creates account → redirects to home tab
- [ ] Home tab shows "Welcome to Budgety" with user's name
- [ ] All 4 tabs render (Home, Expenses, Reports, Settings)
- [ ] Settings screen shows user info
- [ ] Sign Out button works → redirects to login screen
- [ ] Login form works → signs in → redirects to home tab
- [ ] Session persists across app restart (SecureStore)

### Final Commit (if any fixes were needed)

```bash
git add -A
git commit -m "fix: Phase 1 integration fixes"
```
