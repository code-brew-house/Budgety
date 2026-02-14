# Family Coordination Features — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Family Activity Feed (Home tab) and Monthly Family Spending Review (Reports tab) to enable real-time expense visibility and accountability across family members.

**Architecture:** Backend adds a `largeExpenseThreshold` field to the Family model, enriches the expense list endpoint with `createdBy` user info and `sort` param, and adds a `member-spending` report endpoint with per-member aggregation. Mobile replaces the Home tab placeholder with a scrollable activity feed and adds a spending review screen to the Reports tab.

**Tech Stack:** NestJS v11, Prisma, PostgreSQL, Expo Router, React Native, TanStack Query, NativeWind

**Design Reference:** `docs/plans/2026-02-14-family-coordination-features-design.md`

**Prerequisites:** This plan assumes Phase 2 core modules exist — specifically:
- `FamilyModule` with CRUD (`FamilyService`, `FamilyController`, `FamilyGuard`, `@RequiredFamilyRole()`)
- `ExpenseModule` with CRUD (`ExpenseService`, `ExpenseController` with `GET /families/:familyId/expenses`)
- `CategoryModule` with default + custom categories
- `BudgetModule` with `CategoryBudget` and `Family.monthlyBudget` management

If these modules don't exist yet, build them first per `docs/plans/2026-02-08-family-budget-tracker-design.md` Phase 2.

---

## Task 1: Add `largeExpenseThreshold` to Family Schema

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

**Step 1: Add the field to the Family model**

In `apps/api/prisma/schema.prisma`, add `largeExpenseThreshold` to the `Family` model after `monthlyBudget`:

```prisma
model Family {
  id                    String   @id @default(cuid())
  name                  String
  currency              String   @default("INR")
  monthlyBudget         Float?
  largeExpenseThreshold Float?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  members           FamilyMember[]
  categories        Category[]
  expenses          Expense[]
  recurringExpenses RecurringExpense[]
  categoryBudgets   CategoryBudget[]
  invites           Invite[]
}
```

**Step 2: Run migration**

Run from `apps/api/`:
```bash
npx prisma migrate dev --name add-large-expense-threshold
```
Expected: Migration applied successfully, new column added to `Family` table.

**Step 3: Commit**

```bash
git add apps/api/prisma/
git commit -m "feat: add largeExpenseThreshold to Family schema"
```

---

## Task 2: Support `largeExpenseThreshold` in Family Update

**Prerequisite:** `FamilyModule` exists with `FamilyService.update()` and `UpdateFamilyDto`.

**Files:**
- Modify: `apps/api/src/family/dto/update-family.dto.ts`
- Modify: `apps/api/src/family/family.service.ts` (if family select needs updating)
- Modify: `apps/api/src/family/family.service.spec.ts`

**Step 1: Add field to UpdateFamilyDto**

In `apps/api/src/family/dto/update-family.dto.ts`, add:

```typescript
import { IsOptional, IsNumber, Min } from 'class-validator';
import { Transform } from 'class-transformer';

// Add to the existing UpdateFamilyDto class:

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => (value != null ? Math.trunc(value * 100) / 100 : value))
  largeExpenseThreshold?: number;
```

> The `@Transform` truncates to 2 decimal places per the money fields convention in the design doc.

**Step 2: Ensure the family select object includes `largeExpenseThreshold`**

In `apps/api/src/family/family.service.ts`, verify the family select constant includes the new field. If the service uses a `familySelect` object (following the `userSelect` pattern), add:

```typescript
const familySelect = {
  id: true,
  name: true,
  currency: true,
  monthlyBudget: true,
  largeExpenseThreshold: true, // ← add this
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.FamilySelect;
```

> If the service doesn't use a select constant and returns full objects, no change needed — Prisma will include the new field automatically.

**Step 3: Write test for updating largeExpenseThreshold**

Add to `apps/api/src/family/family.service.spec.ts`:

```typescript
it('should update largeExpenseThreshold', async () => {
  const mockFamily = {
    id: 'family-1',
    name: 'Test Family',
    currency: 'INR',
    monthlyBudget: 50000,
    largeExpenseThreshold: 1000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  mockPrismaService.family.update.mockResolvedValue(mockFamily);

  const result = await service.update('family-1', 'admin-user-id', {
    largeExpenseThreshold: 1000,
  });

  expect(result.largeExpenseThreshold).toBe(1000);
});
```

> Adapt the method signature to match the actual `FamilyService.update()` — it likely takes `(familyId, userId, dto)` or similar based on the FamilyGuard pattern.

**Step 4: Run test**

Run from `apps/api/`:
```bash
pnpm test -- --testPathPattern=family.service
```
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/family/
git commit -m "feat: support largeExpenseThreshold in family update"
```

---

## Task 3: Enrich Expense List with `createdBy` Info

**Prerequisite:** `ExpenseModule` exists with `ExpenseService.findAll()` and `GET /families/:familyId/expenses`.

**Files:**
- Modify: `apps/api/src/expense/expense.service.ts`
- Modify: `apps/api/src/expense/expense.service.spec.ts`

**Step 1: Write failing test for createdBy inclusion**

Add to `apps/api/src/expense/expense.service.spec.ts`:

```typescript
describe('findAll', () => {
  it('should include createdBy user info in results', async () => {
    const mockExpenses = [
      {
        id: 'exp-1',
        amount: 500,
        description: 'Groceries',
        date: new Date('2026-02-14'),
        createdAt: new Date(),
        categoryId: 'cat-1',
        category: { id: 'cat-1', name: 'Groceries/Kirana', icon: 'shopping-cart' },
        createdById: 'user-1',
        createdBy: { id: 'user-1', name: 'Tushar', displayName: null, avatarUrl: null },
      },
    ];
    mockPrismaService.expense.findMany.mockResolvedValue(mockExpenses);
    mockPrismaService.expense.count.mockResolvedValue(1);

    const result = await service.findAll('family-1', {});

    expect(result.data[0].createdBy).toEqual({
      id: 'user-1',
      name: 'Tushar',
      displayName: null,
      avatarUrl: null,
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run from `apps/api/`:
```bash
pnpm test -- --testPathPattern=expense.service
```
Expected: FAIL — `createdBy` not included in response (or test structure mismatch).

**Step 3: Update the expense select/include in the service**

In `apps/api/src/expense/expense.service.ts`, update the Prisma query in `findAll` to include `createdBy`:

```typescript
const expenseSelect = {
  id: true,
  amount: true,
  description: true,
  date: true,
  createdAt: true,
  categoryId: true,
  category: {
    select: { id: true, name: true, icon: true },
  },
  createdById: true,
  createdBy: {
    select: { id: true, name: true, displayName: true, avatarUrl: true },
  },
  familyId: true,
} satisfies Prisma.ExpenseSelect;
```

Apply this select to the `findMany` call in the `findAll` method.

**Step 4: Run test to verify it passes**

Run from `apps/api/`:
```bash
pnpm test -- --testPathPattern=expense.service
```
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/expense/
git commit -m "feat: include createdBy user info in expense list response"
```

---

## Task 4: Add `sort` Query Param to Expense List

**Prerequisite:** Task 3 complete.

**Files:**
- Modify: `apps/api/src/expense/dto/query-expenses.dto.ts` (or create if not exists)
- Modify: `apps/api/src/expense/expense.service.ts`
- Modify: `apps/api/src/expense/expense.service.spec.ts`
- Modify: `apps/api/src/expense/expense.controller.ts`

**Step 1: Create or update the query DTO**

In `apps/api/src/expense/dto/query-expenses.dto.ts`, add the `sort` field:

```typescript
import { IsOptional, IsIn } from 'class-validator';

// Add to the existing QueryExpensesDto class (or create it):

  @IsOptional()
  @IsIn(['date', 'createdAt'])
  sort?: 'date' | 'createdAt';
```

Default: `'date'` (handled in the service, not the DTO).

**Step 2: Write failing test for sort=createdAt**

Add to `apps/api/src/expense/expense.service.spec.ts`:

```typescript
it('should sort by createdAt when sort=createdAt', async () => {
  mockPrismaService.expense.findMany.mockResolvedValue([]);
  mockPrismaService.expense.count.mockResolvedValue(0);

  await service.findAll('family-1', { sort: 'createdAt' });

  expect(mockPrismaService.expense.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      orderBy: { createdAt: 'desc' },
    }),
  );
});

it('should sort by date by default', async () => {
  mockPrismaService.expense.findMany.mockResolvedValue([]);
  mockPrismaService.expense.count.mockResolvedValue(0);

  await service.findAll('family-1', {});

  expect(mockPrismaService.expense.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      orderBy: { date: 'desc' },
    }),
  );
});
```

**Step 3: Run test to verify it fails**

Run from `apps/api/`:
```bash
pnpm test -- --testPathPattern=expense.service
```
Expected: FAIL

**Step 4: Implement sort logic in the service**

In `apps/api/src/expense/expense.service.ts`, update `findAll`:

```typescript
async findAll(familyId: string, query: QueryExpensesDto) {
  const { sort = 'date', ...filters } = query;

  const orderBy = sort === 'createdAt'
    ? { createdAt: 'desc' as const }
    : { date: 'desc' as const };

  const expenses = await this.prisma.expense.findMany({
    where: { familyId, ...this.buildWhere(filters) },
    select: expenseSelect,
    orderBy,
    // ... pagination
  });

  // ... return paginated result
}
```

> Adapt to match the actual `findAll` method signature and pagination pattern.

**Step 5: Run test to verify it passes**

Run from `apps/api/`:
```bash
pnpm test -- --testPathPattern=expense.service
```
Expected: PASS

**Step 6: Update the controller to accept the sort param**

In `apps/api/src/expense/expense.controller.ts`, ensure the `GET /families/:familyId/expenses` endpoint passes `sort` from the query:

```typescript
@Get()
async findAll(
  @Param('familyId') familyId: string,
  @Query() query: QueryExpensesDto,
) {
  return this.expenseService.findAll(familyId, query);
}
```

> The `QueryExpensesDto` validation pipe handles the `sort` param automatically.

**Step 7: Run all tests**

Run from `apps/api/`:
```bash
pnpm test
```
Expected: All pass

**Step 8: Commit**

```bash
git add apps/api/src/expense/
git commit -m "feat: add sort query param to expense list endpoint"
```

---

## Task 5: Member Spending Report Endpoint

**Prerequisite:** `ReportModule` exists (at least as a skeleton with `ReportController` and `ReportService`).

**Files:**
- Modify: `apps/api/src/report/report.service.ts`
- Modify: `apps/api/src/report/report.service.spec.ts`
- Modify: `apps/api/src/report/report.controller.ts`

**Step 1: Write failing test for getMemberSpending**

Create or add to `apps/api/src/report/report.service.spec.ts`:

```typescript
/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ReportService } from './report.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrismaService = {
  expense: {
    groupBy: jest.fn(),
    findMany: jest.fn(),
  },
  family: {
    findUnique: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
};

describe('ReportService', () => {
  let service: ReportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ReportService>(ReportService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMemberSpending', () => {
    it('should return per-member spending breakdown', async () => {
      mockPrismaService.family.findUnique.mockResolvedValue({
        id: 'family-1',
        monthlyBudget: 50000,
      });

      mockPrismaService.expense.groupBy.mockResolvedValue([
        { createdById: 'user-1', _sum: { amount: 28000 } },
        { createdById: 'user-2', _sum: { amount: 14300 } },
      ]);

      mockPrismaService.expense.findMany.mockResolvedValue([
        {
          createdById: 'user-1',
          categoryId: 'cat-1',
          category: { id: 'cat-1', name: 'Groceries/Kirana', icon: 'shopping-cart' },
          _sum: { amount: 12000 },
        },
      ]);

      // Mock user lookup
      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'user-1', name: 'Tushar', displayName: null, avatarUrl: null },
        { id: 'user-2', name: 'Spouse', displayName: null, avatarUrl: null },
      ]);

      const result = await service.getMemberSpending('family-1', '2026-02');

      expect(result.month).toBe('2026-02');
      expect(result.totalBudget).toBe(50000);
      expect(result.totalSpent).toBe(42300);
      expect(result.members).toHaveLength(2);
      expect(result.members[0].totalSpent).toBe(28000);
    });

    it('should return empty members array when no expenses', async () => {
      mockPrismaService.family.findUnique.mockResolvedValue({
        id: 'family-1',
        monthlyBudget: 50000,
      });
      mockPrismaService.expense.groupBy.mockResolvedValue([]);
      mockPrismaService.user.findMany.mockResolvedValue([]);

      const result = await service.getMemberSpending('family-1', '2026-02');

      expect(result.totalSpent).toBe(0);
      expect(result.members).toHaveLength(0);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run from `apps/api/`:
```bash
pnpm test -- --testPathPattern=report.service
```
Expected: FAIL — `getMemberSpending` not defined

**Step 3: Implement getMemberSpending**

In `apps/api/src/report/report.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  async getMemberSpending(familyId: string, month: string) {
    const [year, mon] = month.split('-').map(Number);
    const startDate = new Date(year, mon - 1, 1);
    const endDate = new Date(year, mon, 1);

    // Get family budget
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
      select: { monthlyBudget: true },
    });
    const totalBudget = family?.monthlyBudget ?? 0;

    // Aggregate spending per member
    const memberTotals = await this.prisma.expense.groupBy({
      by: ['createdById'],
      where: {
        familyId,
        date: { gte: startDate, lt: endDate },
      },
      _sum: { amount: true },
    });

    const totalSpent = memberTotals.reduce(
      (sum, m) => sum + (m._sum.amount ?? 0),
      0,
    );

    // Get user details for each member
    const userIds = memberTotals.map((m) => m.createdById);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, displayName: true, avatarUrl: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    // Get top 3 categories per member
    const members = await Promise.all(
      memberTotals.map(async (mt) => {
        const user = userMap.get(mt.createdById);
        const memberSpent = mt._sum.amount ?? 0;

        const topCategories = await this.prisma.expense.groupBy({
          by: ['categoryId'],
          where: {
            familyId,
            createdById: mt.createdById,
            date: { gte: startDate, lt: endDate },
          },
          _sum: { amount: true },
          orderBy: { _sum: { amount: 'desc' } },
          take: 3,
        });

        // Fetch category details
        const catIds = topCategories.map((c) => c.categoryId);
        const categories = await this.prisma.category.findMany({
          where: { id: { in: catIds } },
          select: { id: true, name: true, icon: true },
        });
        const catMap = new Map(categories.map((c) => [c.id, c]));

        return {
          userId: mt.createdById,
          name: user?.name ?? 'Unknown',
          displayName: user?.displayName ?? null,
          avatarUrl: user?.avatarUrl ?? null,
          totalSpent: memberSpent,
          percentOfTotal: totalSpent > 0
            ? Math.round((memberSpent / totalSpent) * 1000) / 10
            : 0,
          topCategories: topCategories.map((tc) => {
            const cat = catMap.get(tc.categoryId);
            return {
              categoryId: tc.categoryId,
              name: cat?.name ?? 'Unknown',
              icon: cat?.icon ?? null,
              amount: tc._sum.amount ?? 0,
            };
          }),
        };
      }),
    );

    // Sort members by totalSpent descending
    members.sort((a, b) => b.totalSpent - a.totalSpent);

    return {
      month,
      totalBudget,
      totalSpent,
      utilizationPercent: totalBudget > 0
        ? Math.round((totalSpent / totalBudget) * 1000) / 10
        : 0,
      members,
    };
  }
}
```

**Step 4: Run test to verify it passes**

Run from `apps/api/`:
```bash
pnpm test -- --testPathPattern=report.service
```
Expected: PASS

**Step 5: Add controller endpoint**

In `apps/api/src/report/report.controller.ts`:

```typescript
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { ReportService } from './report.service';
import { SessionGuard } from '../auth/guards/session.guard';
// Import FamilyGuard and RequiredFamilyRole if they exist

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('families/:familyId/reports')
@UseGuards(SessionGuard)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('member-spending')
  @ApiQuery({ name: 'month', required: true, example: '2026-02' })
  async getMemberSpending(
    @Param('familyId') familyId: string,
    @Query('month') month: string,
  ) {
    return this.reportService.getMemberSpending(familyId, month);
  }
}
```

> If `FamilyGuard` and `@RequiredFamilyRole(FamilyRole.MEMBER)` exist from Phase 2, add them to restrict access to family members only.

**Step 6: Write controller test**

Create or add to `apps/api/src/report/report.controller.spec.ts`:

```typescript
/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { SessionGuard } from '../auth/guards/session.guard';

const mockReportService = {
  getMemberSpending: jest.fn(),
};

describe('ReportController', () => {
  let controller: ReportController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportController],
      providers: [{ provide: ReportService, useValue: mockReportService }],
    })
      .overrideGuard(SessionGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<ReportController>(ReportController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMemberSpending', () => {
    it('should return member spending report', async () => {
      const mockReport = {
        month: '2026-02',
        totalBudget: 50000,
        totalSpent: 42300,
        utilizationPercent: 84.6,
        members: [],
      };
      mockReportService.getMemberSpending.mockResolvedValue(mockReport);

      const result = await controller.getMemberSpending('family-1', '2026-02');

      expect(result).toEqual(mockReport);
      expect(mockReportService.getMemberSpending).toHaveBeenCalledWith(
        'family-1',
        '2026-02',
      );
    });
  });
});
```

**Step 7: Run all tests**

Run from `apps/api/`:
```bash
pnpm test
```
Expected: All pass

**Step 8: Commit**

```bash
git add apps/api/src/report/
git commit -m "feat: add member-spending report endpoint"
```

---

## Task 6: Budget Utilization Report Endpoint

**Prerequisite:** Task 5 complete. `BudgetModule` exists with `CategoryBudget` data.

**Files:**
- Modify: `apps/api/src/report/report.service.ts`
- Modify: `apps/api/src/report/report.service.spec.ts`
- Modify: `apps/api/src/report/report.controller.ts`
- Modify: `apps/api/src/report/report.controller.spec.ts`

**Step 1: Write failing test for getBudgetUtilization**

Add to `apps/api/src/report/report.service.spec.ts`:

```typescript
describe('getBudgetUtilization', () => {
  it('should return per-category budget vs spent', async () => {
    mockPrismaService.categoryBudget = {
      findMany: jest.fn(),
    };

    mockPrismaService.categoryBudget.findMany.mockResolvedValue([
      {
        categoryId: 'cat-1',
        amount: 15000,
        category: { id: 'cat-1', name: 'Groceries/Kirana', icon: 'shopping-cart' },
      },
    ]);

    mockPrismaService.expense.groupBy.mockResolvedValue([
      { categoryId: 'cat-1', _sum: { amount: 12000 } },
    ]);

    const result = await service.getBudgetUtilization('family-1', '2026-02');

    expect(result.categories).toHaveLength(1);
    expect(result.categories[0].budgeted).toBe(15000);
    expect(result.categories[0].spent).toBe(12000);
    expect(result.categories[0].utilizationPercent).toBe(80);
  });
});
```

**Step 2: Run test to verify it fails**

Run from `apps/api/`:
```bash
pnpm test -- --testPathPattern=report.service
```
Expected: FAIL — `getBudgetUtilization` not defined

**Step 3: Implement getBudgetUtilization**

Add to `apps/api/src/report/report.service.ts`:

```typescript
async getBudgetUtilization(familyId: string, month: string) {
  const [year, mon] = month.split('-').map(Number);
  const startDate = new Date(year, mon - 1, 1);
  const endDate = new Date(year, mon, 1);

  // Get category budgets for this month
  const categoryBudgets = await this.prisma.categoryBudget.findMany({
    where: { familyId, month },
    include: {
      category: { select: { id: true, name: true, icon: true } },
    },
  });

  // Get actual spending per category
  const spending = await this.prisma.expense.groupBy({
    by: ['categoryId'],
    where: {
      familyId,
      date: { gte: startDate, lt: endDate },
    },
    _sum: { amount: true },
  });
  const spendingMap = new Map(
    spending.map((s) => [s.categoryId, s._sum.amount ?? 0]),
  );

  const categories = categoryBudgets.map((cb) => {
    const spent = spendingMap.get(cb.categoryId) ?? 0;
    return {
      categoryId: cb.categoryId,
      name: cb.category.name,
      icon: cb.category.icon,
      budgeted: cb.amount,
      spent,
      utilizationPercent: cb.amount > 0
        ? Math.round((spent / cb.amount) * 1000) / 10
        : 0,
    };
  });

  // Sort by utilization descending (most over-budget first)
  categories.sort((a, b) => b.utilizationPercent - a.utilizationPercent);

  return { month, categories };
}
```

**Step 4: Run test to verify it passes**

Run from `apps/api/`:
```bash
pnpm test -- --testPathPattern=report.service
```
Expected: PASS

**Step 5: Add controller endpoint**

Add to `apps/api/src/report/report.controller.ts`:

```typescript
@Get('budget-utilization')
@ApiQuery({ name: 'month', required: true, example: '2026-02' })
async getBudgetUtilization(
  @Param('familyId') familyId: string,
  @Query('month') month: string,
) {
  return this.reportService.getBudgetUtilization(familyId, month);
}
```

**Step 6: Add controller test**

Add to `apps/api/src/report/report.controller.spec.ts`:

```typescript
describe('getBudgetUtilization', () => {
  it('should return budget utilization report', async () => {
    const mockReport = {
      month: '2026-02',
      categories: [
        {
          categoryId: 'cat-1',
          name: 'Groceries/Kirana',
          icon: 'shopping-cart',
          budgeted: 15000,
          spent: 12000,
          utilizationPercent: 80,
        },
      ],
    };
    mockReportService.getBudgetUtilization = jest.fn().mockResolvedValue(mockReport);

    const result = await controller.getBudgetUtilization('family-1', '2026-02');
    expect(result).toEqual(mockReport);
  });
});
```

**Step 7: Run all tests**

Run from `apps/api/`:
```bash
pnpm test
```
Expected: All pass

**Step 8: Commit**

```bash
git add apps/api/src/report/
git commit -m "feat: add budget-utilization report endpoint"
```

---

## Task 7: Mobile — Create Expense and Report Hooks

**Prerequisite:** Backend tasks 1-6 complete. Mobile has `lib/api.ts` with `apiFetch`.

**Files:**
- Create: `apps/mobile/hooks/useExpenses.ts`
- Create: `apps/mobile/hooks/useFamilyDetail.ts`
- Create: `apps/mobile/hooks/useMemberSpending.ts`
- Create: `apps/mobile/hooks/useBudgetUtilization.ts`

**Step 1: Create useExpenses hook**

`apps/mobile/hooks/useExpenses.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

interface ExpenseCreatedBy {
  id: string;
  name: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface ExpenseCategory {
  id: string;
  name: string;
  icon: string | null;
}

export interface Expense {
  id: string;
  amount: number;
  description: string;
  date: string;
  createdAt: string;
  categoryId: string;
  category: ExpenseCategory;
  createdById: string;
  createdBy: ExpenseCreatedBy;
  familyId: string;
}

interface ExpenseListResponse {
  data: Expense[];
  total: number;
  page: number;
  limit: number;
}

interface UseExpensesOptions {
  sort?: 'date' | 'createdAt';
  limit?: number;
  page?: number;
  categoryId?: string;
}

export function useExpenses(
  familyId: string | null,
  options: UseExpensesOptions = {},
) {
  const { sort = 'date', limit = 20, page = 1, categoryId } = options;

  const params = new URLSearchParams({
    sort,
    limit: String(limit),
    page: String(page),
  });
  if (categoryId) params.set('categoryId', categoryId);

  return useQuery<ExpenseListResponse>({
    queryKey: ['expenses', familyId, sort, limit, page, categoryId],
    queryFn: () =>
      apiFetch<ExpenseListResponse>(
        `/families/${familyId}/expenses?${params.toString()}`,
      ),
    enabled: !!familyId,
  });
}
```

**Step 2: Create useFamilyDetail hook**

`apps/mobile/hooks/useFamilyDetail.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export interface FamilyDetail {
  id: string;
  name: string;
  currency: string;
  monthlyBudget: number | null;
  largeExpenseThreshold: number | null;
  createdAt: string;
  updatedAt: string;
}

export function useFamilyDetail(familyId: string | null) {
  return useQuery<FamilyDetail>({
    queryKey: ['family', familyId],
    queryFn: () => apiFetch<FamilyDetail>(`/families/${familyId}`),
    enabled: !!familyId,
  });
}
```

**Step 3: Create useMemberSpending hook**

`apps/mobile/hooks/useMemberSpending.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

interface MemberCategory {
  categoryId: string;
  name: string;
  icon: string | null;
  amount: number;
}

export interface MemberSpending {
  userId: string;
  name: string;
  displayName: string | null;
  avatarUrl: string | null;
  totalSpent: number;
  percentOfTotal: number;
  topCategories: MemberCategory[];
}

export interface MemberSpendingReport {
  month: string;
  totalBudget: number;
  totalSpent: number;
  utilizationPercent: number;
  members: MemberSpending[];
}

export function useMemberSpending(familyId: string | null, month: string) {
  return useQuery<MemberSpendingReport>({
    queryKey: ['member-spending', familyId, month],
    queryFn: () =>
      apiFetch<MemberSpendingReport>(
        `/families/${familyId}/reports/member-spending?month=${month}`,
      ),
    enabled: !!familyId,
  });
}
```

**Step 4: Create useBudgetUtilization hook**

`apps/mobile/hooks/useBudgetUtilization.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export interface CategoryUtilization {
  categoryId: string;
  name: string;
  icon: string | null;
  budgeted: number;
  spent: number;
  utilizationPercent: number;
}

export interface BudgetUtilizationReport {
  month: string;
  categories: CategoryUtilization[];
}

export function useBudgetUtilization(familyId: string | null, month: string) {
  return useQuery<BudgetUtilizationReport>({
    queryKey: ['budget-utilization', familyId, month],
    queryFn: () =>
      apiFetch<BudgetUtilizationReport>(
        `/families/${familyId}/reports/budget-utilization?month=${month}`,
      ),
    enabled: !!familyId,
  });
}
```

**Step 5: Commit**

```bash
git add apps/mobile/hooks/
git commit -m "feat: add expense and report data hooks"
```

---

## Task 8: Mobile — Home Tab Activity Feed

**Prerequisite:** Task 7 complete. `useFamilyStore` provides `activeFamilyId`.

**Files:**
- Modify: `apps/mobile/app/(app)/(tabs)/index.tsx`

**Step 1: Replace the Home tab placeholder**

Replace `apps/mobile/app/(app)/(tabs)/index.tsx` with:

```tsx
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { authClient } from '@/lib/auth';
import { useExpenses, Expense } from '@/hooks/useExpenses';
import { useFamilyDetail } from '@/hooks/useFamilyDetail';
import { useFamilyStore } from '@/stores/familyStore';

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

function formatCurrency(amount: number): string {
  return `\u20B9${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function BudgetProgressBar({
  spent,
  budget,
}: {
  spent: number;
  budget: number;
}) {
  const percent = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const color =
    percent >= 100 ? 'bg-red-500' : percent >= 80 ? 'bg-amber-500' : 'bg-green-500';

  return (
    <View className="mt-2">
      <View className="flex-row justify-between mb-1">
        <Text className="text-sm text-gray-600">
          {formatCurrency(spent)} spent
        </Text>
        <Text className="text-sm text-gray-600">
          {formatCurrency(budget)} budget
        </Text>
      </View>
      <View className="h-2 bg-gray-200 rounded-full">
        <View
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${percent}%` }}
        />
      </View>
    </View>
  );
}

function ExpenseCard({
  expense,
  isLarge,
}: {
  expense: Expense;
  isLarge: boolean;
}) {
  return (
    <View
      className={`mx-4 mb-3 p-4 bg-white rounded-xl shadow-sm ${
        isLarge ? 'border-l-4 border-amber-500 bg-amber-50' : 'border border-gray-100'
      }`}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          {/* Avatar */}
          <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center mr-3">
            <Text className="text-sm font-semibold text-gray-600">
              {getInitials(expense.createdBy.displayName ?? expense.createdBy.name)}
            </Text>
          </View>

          {/* Details */}
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-900">
              {expense.createdBy.displayName ?? expense.createdBy.name}
            </Text>
            <Text className="text-sm text-gray-500" numberOfLines={1}>
              {expense.category.name} — {expense.description}
            </Text>
          </View>
        </View>

        {/* Amount + time */}
        <View className="items-end ml-2">
          <Text className={`text-base font-bold ${isLarge ? 'text-amber-700' : 'text-gray-900'}`}>
            {formatCurrency(expense.amount)}
          </Text>
          <Text className="text-xs text-gray-400">
            {formatRelativeTime(expense.createdAt)}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { data: session } = authClient.useSession();
  const activeFamilyId = useFamilyStore((s) => s.activeFamilyId);

  const {
    data: expenses,
    isLoading: expensesLoading,
    refetch: refetchExpenses,
  } = useExpenses(activeFamilyId, { sort: 'createdAt', limit: 20 });

  const { data: family } = useFamilyDetail(activeFamilyId);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchExpenses();
    setRefreshing(false);
  }, [refetchExpenses]);

  // No active family selected
  if (!activeFamilyId) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6">
        <Text className="text-xl font-bold mb-2">Welcome to Budgety</Text>
        <Text className="text-gray-500 text-center mb-6">
          {session?.user?.name
            ? `Hello, ${session.user.name}! Create or join a family to get started.`
            : 'Loading...'}
        </Text>
        <TouchableOpacity
          className="bg-black rounded-lg py-3 px-6"
          onPress={() => router.push('/family/create')}
        >
          <Text className="text-white font-semibold">Create Family</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const threshold = family?.largeExpenseThreshold ?? null;

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={expenses?.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ExpenseCard
            expense={item}
            isLarge={threshold != null && item.amount >= threshold}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View className="px-4 pt-4 pb-2">
            <Text className="text-2xl font-bold mb-1">
              {family?.name ?? 'Family'}
            </Text>
            {family?.monthlyBudget != null && family.monthlyBudget > 0 && (
              <BudgetProgressBar
                spent={
                  expenses?.data?.reduce((sum, e) => sum + e.amount, 0) ?? 0
                }
                budget={family.monthlyBudget}
              />
            )}
          </View>
        }
        ListEmptyComponent={
          !expensesLoading ? (
            <View className="items-center justify-center py-20 px-6">
              <Text className="text-lg font-semibold text-gray-400 mb-2">
                No expenses yet
              </Text>
              <Text className="text-gray-400 text-center">
                Tap + to add the first one.
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}
```

**Step 2: Verify in simulator**

Run from `apps/mobile/`:
```bash
pnpm dev
```
Expected: Home tab shows family name, budget progress bar (if budget set), and expense activity feed sorted by `createdAt`. Large expenses have amber highlight. Pull-to-refresh works. Empty state shows when no expenses.

**Step 3: Commit**

```bash
git add apps/mobile/app/\(app\)/\(tabs\)/index.tsx
git commit -m "feat: replace Home tab with family activity feed"
```

---

## Task 9: Mobile — Monthly Spending Review Screen

**Prerequisite:** Tasks 7 and 8 complete.

**Files:**
- Modify: `apps/mobile/app/(app)/(tabs)/reports.tsx`

**Step 1: Replace the Reports tab placeholder**

Replace `apps/mobile/app/(app)/(tabs)/reports.tsx` with:

```tsx
import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useFamilyStore } from '@/stores/familyStore';
import { useMemberSpending, MemberSpending } from '@/hooks/useMemberSpending';
import {
  useBudgetUtilization,
  CategoryUtilization,
} from '@/hooks/useBudgetUtilization';

function formatCurrency(amount: number): string {
  return `\u20B9${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getMonthString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function formatMonthLabel(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(year, month - 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function MonthSelector({
  month,
  onPrev,
  onNext,
}: {
  month: string;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <View className="flex-row items-center justify-between px-4 py-3">
      <TouchableOpacity onPress={onPrev} className="p-2">
        <Text className="text-xl font-bold text-gray-600">{'<'}</Text>
      </TouchableOpacity>
      <Text className="text-lg font-semibold">{formatMonthLabel(month)}</Text>
      <TouchableOpacity onPress={onNext} className="p-2">
        <Text className="text-xl font-bold text-gray-600">{'>'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function BudgetSummaryCard({
  totalSpent,
  totalBudget,
  utilizationPercent,
}: {
  totalSpent: number;
  totalBudget: number;
  utilizationPercent: number;
}) {
  const color =
    utilizationPercent >= 100
      ? 'bg-red-500'
      : utilizationPercent >= 80
        ? 'bg-amber-500'
        : 'bg-green-500';
  const textColor =
    utilizationPercent >= 100
      ? 'text-red-700'
      : utilizationPercent >= 80
        ? 'text-amber-700'
        : 'text-green-700';
  const percent = Math.min(utilizationPercent, 100);

  return (
    <View className="mx-4 mb-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
      <Text className="text-sm font-medium text-gray-500 mb-1">
        Family Budget
      </Text>
      <View className="flex-row items-baseline justify-between mb-2">
        <Text className="text-2xl font-bold">
          {formatCurrency(totalSpent)}
        </Text>
        <Text className="text-sm text-gray-500">
          of {formatCurrency(totalBudget)}
        </Text>
      </View>
      <View className="h-3 bg-gray-200 rounded-full mb-1">
        <View
          className={`h-3 rounded-full ${color}`}
          style={{ width: `${percent}%` }}
        />
      </View>
      <Text className={`text-sm font-medium ${textColor}`}>
        {utilizationPercent.toFixed(1)}% utilized
      </Text>
    </View>
  );
}

function MemberCard({ member }: { member: MemberSpending }) {
  return (
    <View className="mx-4 mb-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
      <View className="flex-row items-center mb-3">
        {/* Avatar */}
        <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center mr-3">
          <Text className="text-sm font-semibold text-gray-600">
            {getInitials(member.displayName ?? member.name)}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold">
            {member.displayName ?? member.name}
          </Text>
          <Text className="text-sm text-gray-500">
            {member.percentOfTotal.toFixed(1)}% of family spending
          </Text>
        </View>
        <Text className="text-lg font-bold">
          {formatCurrency(member.totalSpent)}
        </Text>
      </View>

      {/* Top categories */}
      {member.topCategories.length > 0 && (
        <View className="space-y-2">
          {member.topCategories.map((cat) => (
            <View key={cat.categoryId} className="flex-row items-center justify-between">
              <Text className="text-sm text-gray-600">{cat.name}</Text>
              <Text className="text-sm font-medium">
                {formatCurrency(cat.amount)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function CategoryRow({ category }: { category: CategoryUtilization }) {
  const percent = Math.min(category.utilizationPercent, 100);
  const color =
    category.utilizationPercent >= 100
      ? 'bg-red-500'
      : category.utilizationPercent >= 80
        ? 'bg-amber-500'
        : 'bg-green-500';

  return (
    <View className="flex-row items-center py-3 border-b border-gray-50">
      <View className="flex-1">
        <Text className="text-sm font-medium text-gray-900">
          {category.name}
        </Text>
        <View className="flex-row items-center mt-1">
          <Text className="text-xs text-gray-500">
            {formatCurrency(category.spent)} / {formatCurrency(category.budgeted)}
          </Text>
        </View>
        <View className="h-1.5 bg-gray-200 rounded-full mt-1">
          <View
            className={`h-1.5 rounded-full ${color}`}
            style={{ width: `${percent}%` }}
          />
        </View>
      </View>
      <Text className="text-sm font-medium text-gray-600 ml-3">
        {category.utilizationPercent.toFixed(0)}%
      </Text>
    </View>
  );
}

export default function ReportsScreen() {
  const activeFamilyId = useFamilyStore((s) => s.activeFamilyId);
  const [month, setMonth] = useState(() => getMonthString(new Date()));

  const { data: memberReport, isLoading: memberLoading } = useMemberSpending(
    activeFamilyId,
    month,
  );
  const { data: budgetReport, isLoading: budgetLoading } =
    useBudgetUtilization(activeFamilyId, month);

  const navigateMonth = (direction: number) => {
    const [year, mon] = month.split('-').map(Number);
    const date = new Date(year, mon - 1 + direction);
    setMonth(getMonthString(date));
  };

  if (!activeFamilyId) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-lg font-semibold text-gray-400">
          Select a family to view reports
        </Text>
      </View>
    );
  }

  const isLoading = memberLoading || budgetLoading;

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <MonthSelector
        month={month}
        onPrev={() => navigateMonth(-1)}
        onNext={() => navigateMonth(1)}
      />

      {/* Budget Summary */}
      {memberReport && memberReport.totalBudget > 0 && (
        <BudgetSummaryCard
          totalSpent={memberReport.totalSpent}
          totalBudget={memberReport.totalBudget}
          utilizationPercent={memberReport.utilizationPercent}
        />
      )}

      {/* Per-Member Spending */}
      {memberReport && memberReport.members.length > 0 && (
        <View className="mb-4">
          <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-4 mb-2">
            Spending by Member
          </Text>
          {memberReport.members.map((member) => (
            <MemberCard key={member.userId} member={member} />
          ))}
        </View>
      )}

      {/* Category Budget Breakdown */}
      {budgetReport && budgetReport.categories.length > 0 && (
        <View className="mx-4 mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
          <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Category Budgets
          </Text>
          {budgetReport.categories.map((cat) => (
            <CategoryRow key={cat.categoryId} category={cat} />
          ))}
        </View>
      )}

      {/* Empty state */}
      {!isLoading &&
        memberReport?.members.length === 0 &&
        (!budgetReport || budgetReport.categories.length === 0) && (
          <View className="items-center justify-center py-20 px-6">
            <Text className="text-lg font-semibold text-gray-400 mb-2">
              No data for {formatMonthLabel(month)}
            </Text>
            <Text className="text-gray-400 text-center">
              No expenses recorded for this month.
            </Text>
          </View>
        )}

      <View className="h-6" />
    </ScrollView>
  );
}
```

**Step 2: Verify in simulator**

Run from `apps/mobile/`:
```bash
pnpm dev
```
Expected: Reports tab shows month selector, budget summary card with progress bar (green/amber/red), per-member spending cards with top categories, and category budget breakdown with utilization bars. Month navigation works. Empty state shows for months with no data.

**Step 3: Commit**

```bash
git add apps/mobile/app/\(app\)/\(tabs\)/reports.tsx
git commit -m "feat: add monthly spending review to Reports tab"
```

---

## Task 10: Run All Tests + Final Verification

**Step 1: Run backend tests**

Run from `apps/api/`:
```bash
pnpm test
```
Expected: All tests pass.

**Step 2: Run lint**

Run from repo root:
```bash
pnpm lint
```
Expected: No errors.

**Step 3: Manual verification checklist**

- [ ] Home tab shows activity feed with expenses sorted by creation time
- [ ] Large expenses (above threshold) have amber highlight
- [ ] Pull-to-refresh reloads the feed
- [ ] Empty state shows when no expenses exist
- [ ] Budget progress bar shows on Home tab when budget is set
- [ ] Reports tab has month selector with prev/next navigation
- [ ] Budget summary card shows correct spent/budget with color-coded bar
- [ ] Per-member cards show name, total spent, percentage, and top 3 categories
- [ ] Category breakdown shows budget vs spent with utilization bars
- [ ] Empty state shows for months with no data
- [ ] `GET /families/:fid/reports/member-spending?month=YYYY-MM` returns correct data
- [ ] `GET /families/:fid/reports/budget-utilization?month=YYYY-MM` returns correct data
- [ ] Expense list endpoint supports `?sort=createdAt` param
- [ ] Family update accepts `largeExpenseThreshold` field

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: family coordination feature integration fixes"
```
