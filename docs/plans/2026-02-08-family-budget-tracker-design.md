# Budgety — Family Budget Tracker Design Document

## 1. Context

Indian households typically track expenses informally — mental math, WhatsApp messages, or scattered spreadsheets. When multiple family members spend from a shared budget, there is no single source of truth for what has been spent, by whom, and against which category.

Budgety solves this by providing a **family-oriented budget tracker** where family members pool expenses into a shared view. Every member can log expenses, the family admin sets monthly budgets (overall and per-category), and a reporting dashboard shows where money is going. Currency is **Indian Rupees (₹)** throughout. The app is mobile-first (Expo/React Native) backed by a NestJS API.

**Existing codebase** at `/Users/tushar/Workplace/Budgety` is a pnpm monorepo with Turborepo containing bare scaffolds — everything below needs to be built from scratch.

### Technology Stack

| Component | Choice |
|---|---|
| Backend | NestJS v11 (TypeScript) |
| Database | PostgreSQL + Prisma ORM |
| Auth | BetterAuth (email/password) |
| Mobile | Expo SDK 54, React Native 0.81, React 19 |
| Navigation | Expo Router (file-based) |
| UI Library | Gluestack UI v4 (NativeWind/Tailwind CSS) |
| State | TanStack Query (server) + Zustand (client) |
| Charts | Victory Native XL (D3 + Skia) |
| API Docs | Swagger/OpenAPI |

---

## 2. Data Model

### Prisma Schema (`apps/api/prisma/schema.prisma`)

BetterAuth auto-manages `user`, `session`, `account`, `verification` tables. We declare them in Prisma so the ORM is aware, but BetterAuth owns their lifecycle.

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

### Default Categories (seeded per-family creation)

| Name | Icon |
|---|---|
| Groceries/Kirana | shopping-cart |
| Rent | home |
| Utilities | zap |
| Transport | car |
| Medical/Health | heart-pulse |
| Education | graduation-cap |
| Dining Out | utensils |
| Entertainment | film |
| Shopping | shopping-bag |
| EMI/Loans | landmark |
| Household Help | hand-helping |
| Mobile/Internet | wifi |

Stored with `isDefault: true` and `familyId: null`. Queries return defaults + family-specific custom categories.

### Money Fields

All `Float` money fields (`amount`, `monthlyBudget`, `CategoryBudget.amount`) are truncated to **2 decimal places** at the API layer before saving. Truncation uses `Math.trunc(value * 100) / 100` (not rounding — ₹99.999 becomes ₹99.99, not ₹100.00). Applied in two places:

1. **DTOs** — `@Transform(({ value }) => Math.trunc(value * 100) / 100)` via `class-transformer`
2. **Service layer** — Safety-net truncation before any Prisma `create`/`update` call

---

## 3. API Architecture

### Module Structure

```
AppModule
  ├── ConfigModule          (global)
  ├── PrismaModule          (global)
  ├── AuthModule            (BetterAuth handler + session guard)
  ├── UserModule
  ├── FamilyModule
  ├── CategoryModule
  ├── ExpenseModule         (includes recurring expense scheduling)
  ├── BudgetModule
  └── ReportModule
```

### BetterAuth Integration

- **Instance** (`src/auth/auth.ts`): `betterAuth({ database: prismaAdapter(prisma, { provider: 'postgresql' }), emailAndPassword: { enabled: true } })`
- **Mount** (`main.ts`): `app.all('/api/auth/*splat', toNodeHandler(auth))` — BEFORE `express.json()`
- **Session retrieval**: `auth.api.getSession({ headers: fromNodeHeaders(req.headers) })`
- **NestJS guard**: Custom guard validates session on all protected routes

### Key Endpoints

| Module | Method | Path | Role |
|--------|--------|------|------|
| **Auth** (BetterAuth) | POST | `/api/auth/sign-up/email` | Public |
| | POST | `/api/auth/sign-in/email` | Public |
| | POST | `/api/auth/sign-out` | Public |
| **User** | GET | `/users/me` | Auth |
| | PATCH | `/users/me` | Auth |
| **Family** | POST | `/families` | Auth |
| | GET | `/families` | Auth |
| | GET | `/families/:id` | MEMBER+ |
| | PATCH | `/families/:id` | ADMIN |
| | DELETE | `/families/:id` | ADMIN |
| | POST | `/families/:id/invites` | ADMIN |
| | POST | `/families/join` | Auth |
| | PATCH | `/families/:id/members/:memberId` | ADMIN |
| | DELETE | `/families/:id/members/:memberId` | ADMIN |
| **Category** | GET | `/families/:fid/categories` | MEMBER+ |
| | POST | `/families/:fid/categories` | ADMIN |
| | PATCH | `/families/:fid/categories/:id` | ADMIN |
| | DELETE | `/families/:fid/categories/:id` | ADMIN |
| **Expense** | POST | `/families/:fid/expenses` | MEMBER+ |
| | GET | `/families/:fid/expenses` | MEMBER+ |
| | GET | `/families/:fid/expenses/:id` | MEMBER+ |
| | PATCH | `/families/:fid/expenses/:id` | Own/ADMIN |
| | DELETE | `/families/:fid/expenses/:id` | Own/ADMIN |
| | POST | `/families/:fid/recurring-expenses` | MEMBER+ |
| | GET | `/families/:fid/recurring-expenses` | MEMBER+ |
| | PATCH | `/families/:fid/recurring-expenses/:id` | Own/ADMIN |
| | DELETE | `/families/:fid/recurring-expenses/:id` | Own/ADMIN |
| **Budget** | GET | `/families/:fid/budgets?month=YYYY-MM` | MEMBER+ |
| | PUT | `/families/:fid/budgets` | ADMIN |
| | PUT | `/families/:fid/budgets/categories` | ADMIN |
| **Report** | GET | `/families/:fid/reports/category-split?month=` | MEMBER+ |
| | GET | `/families/:fid/reports/daily-spending?month=` | MEMBER+ |
| | GET | `/families/:fid/reports/monthly-trend?months=6` | MEMBER+ |
| | GET | `/families/:fid/reports/budget-utilization?month=` | MEMBER+ |
| | GET | `/families/:fid/reports/member-spending?month=` | MEMBER+ |
| | GET | `/families/:fid/reports/top-expenses?month=&limit=5` | MEMBER+ |

### FamilyGuard Pattern

Applied via `@UseGuards(FamilyGuard)` + `@RequiredFamilyRole(FamilyRole.MEMBER)`. Reads `:familyId` from route params, queries `FamilyMember` for current user, verifies role.

### Invite Flow

1. Admin calls `POST /families/:id/invites` → generates 6-character alphanumeric code (e.g., `X7K9M2`), expires in 24 hours
2. Admin shares code via WhatsApp/text
3. Other user calls `POST /families/join` with `{ code }` → validates code is unused and not expired, creates `FamilyMember` with `MEMBER` role, marks invite as used (`usedBy`, `usedAt`)
4. One-time use: once used, the code is dead

### API File Structure

```
apps/api/src/
  main.ts
  app.module.ts
  auth/
    auth.ts, auth.module.ts
  prisma/
    prisma.module.ts, prisma.service.ts
  user/
    user.module.ts, user.controller.ts, user.service.ts, dto/
  family/
    family.module.ts, family.controller.ts, family.service.ts, dto/, guards/, decorators/
  category/
    category.module.ts, category.controller.ts, category.service.ts, dto/
  expense/
    expense.module.ts, expense.controller.ts, expense.service.ts,
    recurring-expense.controller.ts, recurring-expense.service.ts, dto/
  budget/
    budget.module.ts, budget.controller.ts, budget.service.ts, dto/
  report/
    report.module.ts, report.controller.ts, report.service.ts
```

---

## 4. Mobile Architecture

### Expo Router File Structure

```
apps/mobile/
  app/
    _layout.tsx                    Root: QueryClientProvider + GluestackUIProvider + AuthProvider
    (auth)/
      _layout.tsx                  Auth stack
      login.tsx                    Email/password login
      signup.tsx                   Registration
    (app)/
      _layout.tsx                  Auth guard + redirect
      (tabs)/
        _layout.tsx                Bottom tabs: Home, Expenses, Reports, Settings
        index.tsx                  Dashboard (budget summary, recent expenses)
        expenses.tsx               Expense list + FAB
        reports.tsx                Full chart dashboard
        settings.tsx               Profile, family, categories
      family/
        create.tsx                 Create family
        [id]/members.tsx           Manage members
        [id]/categories.tsx        Manage categories
      expense/
        add.tsx                    Add/edit expense form
        [id].tsx                   Expense detail
      budget/
        manage.tsx                 Overall + per-category budgets
  components/
    ui/                            Gluestack components (via CLI)
    ExpenseCard.tsx
    CategoryPicker.tsx
    FamilySelector.tsx
    BudgetBar.tsx
    charts/
      CategoryDonut.tsx            Victory PolarChart + Pie
      DailySpendingBar.tsx         Victory CartesianChart + Bar
      MonthlyTrendLine.tsx         Victory CartesianChart + Line
      BudgetUtilization.tsx        Horizontal progress bars
  lib/
    api.ts                         Fetch wrapper with auth
    auth.ts                        BetterAuth client
    queryClient.ts                 TanStack Query config
  hooks/
    useAuth.ts, useFamilies.ts, useExpenses.ts, useBudgets.ts, useReports.ts, useCategories.ts
  stores/
    authStore.ts                   Zustand: session, user
    familyStore.ts                 Zustand: active family ID
  constants/
    colors.ts, icons.ts
  global.css, tailwind.config.ts, babel.config.js, metro.config.js
```

### State Management

| Layer | Tool | Manages |
|---|---|---|
| Server state | TanStack Query | All API data (families, expenses, budgets, reports, categories) |
| Client state | Zustand | Auth session, active family ID, UI preferences |
| Navigation | Expo Router | Automatic |

### Auth Flow

Mobile uses `@better-auth/react` → `createAuthClient({ baseURL })`. Root layout checks session; unauthenticated users see `(auth)` group, authenticated see `(app)` group via Expo Router redirect.

---

## 5. Phase 1: Foundation

**Goal:** PostgreSQL running, Prisma migrated, BetterAuth working (signup/login/session), Swagger docs live, input validation enabled, mobile has Expo Router with auth screens.

### Backend
1. **Docker Compose** — `docker-compose.yml` at repo root (PostgreSQL 16, local dev only)
2. **Prisma** — Install `prisma` + `@prisma/client`, create full schema, seed default categories, run initial migration
3. **PrismaModule** — Global module with `PrismaService` extending `PrismaClient`
4. **ConfigModule** — `@nestjs/config`, `.env` + `.env.example` (DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, PORT)
5. **Validation** — Install `class-validator` + `class-transformer`, global `ValidationPipe` in `main.ts` with `whitelist: true` and `transform: true`
6. **BetterAuth** — Install `better-auth`, create `auth.ts` instance, mount handler in `main.ts` before body parser
7. **Swagger** — Install `@nestjs/swagger`, setup in `main.ts`
8. **UserModule** — `GET /users/me`, `PATCH /users/me`

### Mobile
1. **Expo Router** — Delete `App.js`/`index.js`, set entry to `expo-router/entry`, create `app/` structure
2. **Gluestack UI** — `npx gluestack-ui init`, configure NativeWind, add core components
3. **Auth client** — Install `@better-auth/react`, `@tanstack/react-query`, `zustand`, create stores
4. **Auth screens** — Login + signup forms calling BetterAuth client
5. **Tab placeholders** — 4 placeholder tab screens (Home, Expenses, Reports, Settings)

### Verify
- `docker compose up` → PostgreSQL running
- `prisma migrate dev` → schema applied, categories seeded
- Swagger at `localhost:3000/docs`
- Sign up/in via API and mobile app
- Session persists across app restart

---

## 6. Phase 2: Core Features

**Goal:** Full CRUD for families, categories, expenses, budgets. All mobile screens functional.

### Backend
1. **FamilyModule** — CRUD + member management + `FamilyGuard` + `@RequiredFamilyRole()`
2. **CategoryModule** — Defaults + custom CRUD scoped to family
3. **ExpenseModule** — CRUD with pagination + filtering (date/category/member)
4. **BudgetModule** — Overall budget + per-category upsert
5. **Update AppModule** — Import all new modules

### Mobile
1. **API hooks** — `useFamilies`, `useCategories`, `useExpenses`, `useBudgets`
2. **Dashboard** — Budget summary, recent expenses, family name
3. **Expenses screen** — FlatList grouped by date, category filter, FAB → add form
4. **Settings** — Profile, family list, switch family, logout, manage members/categories
5. **Budget management** — Overall + per-category limits

### Verify
- Create family → add member → both see it
- Add expenses → dashboard updates
- ADMIN-only actions rejected for MEMBER
- Set budget → progress shown on dashboard
- Switch families → data changes

---

## 7. Phase 3: Recurring Expenses + Reporting

**Goal:** Recurring templates auto-generate expenses via cron. Full reporting dashboard with 6 visualizations.

### Backend
1. **Recurring expenses** — Install `@nestjs/schedule`, add `RecurringExpenseController` + `RecurringExpenseService` with `@Cron(EVERY_DAY_AT_MIDNIGHT)` inside `ExpenseModule`
2. **ReportModule** — 6 aggregation endpoints using Prisma `groupBy` and raw queries

### Mobile
1. **Chart components** — `CategoryDonut` (PolarChart), `DailySpendingBar` (CartesianChart+Bar), `MonthlyTrendLine` (CartesianChart+Line), `BudgetUtilization` (custom bars)
2. **Reports screen** — Scrollable dashboard with month selector, all 6 sections
3. **Recurring UI** — Toggle in add-expense form, list in settings

### Verify
- Create recurring expense → cron generates actual expenses
- Deactivate → stops generating
- Charts render with correct data proportions
- Month selector changes all report data

---

## 8. Phase 4: Polish

**Goal:** Production-quality UX — optimistic updates, loading/empty/error states, family switching.

### Mobile
1. **Optimistic updates** — `onMutate` cache manipulation for expense add/edit/delete
2. **Pull-to-refresh + infinite scroll** — `useInfiniteQuery` for expense list
3. **Loading/empty states** — `LoadingScreen`, `EmptyState` components for all screens
4. **Error handling** — `ErrorBoundary`, toast on mutation errors, offline banner, 401 → login redirect
5. **Family switching** — Dropdown in header, invalidates all queries
6. **UX** — Haptic feedback, INR input formatting, swipe-to-delete, confirmation dialogs

### Backend
1. **Rate limiting** — `@nestjs/throttler`
2. **CORS** — Configure for mobile origins
3. **Consistent error format** — Exception filters

### Verify
- Optimistic add → instant, syncs after
- Network kill → offline banner, cached data visible
- Empty states on all screens
- Session expiry → login redirect
- Family switch → all data updates

---

## 9. Deployment (Dokploy + Nixpacks)

The API is deployed on **Dokploy** using **Nixpacks** (no Dockerfile needed). PostgreSQL is an existing instance on Dokploy. Docker Compose (`docker-compose.yml`) is for **local development only**.

### Build & Start Commands

| Setting | Value |
|---------|-------|
| Build Command | `pnpm install --frozen-lockfile && cd apps/api && npx prisma generate && cd ../.. && pnpm --filter api build` |
| Start Command | `cd apps/api && npx prisma migrate deploy && node dist/main.js` |

The start command runs `prisma migrate deploy` on every deploy — applies pending migrations to production before the server starts.

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Dokploy Postgres connection string | `postgresql://user:pass@host:5432/budgety` |
| `BETTER_AUTH_SECRET` | Secret key for session signing (min 32 chars) | Random string |
| `BETTER_AUTH_URL` | Public URL of the deployed API | `https://api.budgety.example.com` |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `production` |

### Notes
- Nixpacks auto-detects pnpm from `pnpm-lock.yaml`
- `DATABASE_URL` points to the existing Dokploy Postgres instance (not Docker Compose)
- Docker Compose remains for local development only
