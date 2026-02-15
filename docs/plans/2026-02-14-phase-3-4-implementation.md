# Phase 3 & 4: Recurring Expenses, Reporting Charts, and Polish — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add recurring expense automation with cron, 4 remaining report endpoints, Victory Native XL chart visualizations, and full Phase 4 polish (optimistic updates, infinite scroll, error handling, offline support, haptics, swipe-to-delete, family switching, rate limiting).

**Architecture:** Backend adds `RecurringExpenseService` with `@Cron` scheduler inside existing `ExpenseModule`, plus 4 new report aggregation methods in `ReportService`. Mobile installs Victory Native XL (Skia-based) for chart components on the Reports tab, converts expense lists to `useInfiniteQuery`, and adds comprehensive error handling + UX polish. Backend hardens with `@nestjs/throttler`, CORS, and global exception filters.

**Tech Stack:** NestJS v11, Prisma, `@nestjs/schedule`, `@nestjs/throttler`, Victory Native XL, `@shopify/react-native-skia`, `expo-haptics`, `@react-native-community/netinfo`, `react-native-gesture-handler`, TanStack Query, Zustand

**Design Reference:** `docs/plans/2026-02-08-family-budget-tracker-design.md` (Phases 3-4), `docs/plans/2026-02-14-family-coordination-features-design.md`

**Prerequisites:** Phases 1-2 and Family Coordination features are complete. All 97 tests passing.

---

## Task 1: Recurring Expense DTOs

**Files:**
- Create: `apps/api/src/expense/dto/create-recurring-expense.dto.ts`
- Create: `apps/api/src/expense/dto/update-recurring-expense.dto.ts`

**Step 1: Create CreateRecurringExpenseDto**

`apps/api/src/expense/dto/create-recurring-expense.dto.ts`:
```typescript
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Frequency } from '@prisma/client';

export class CreateRecurringExpenseDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  @Transform(({ value }) =>
    value != null ? Math.trunc(value * 100) / 100 : value,
  )
  amount!: number;

  @IsNotEmpty()
  @IsString()
  description!: string;

  @IsNotEmpty()
  @IsEnum(Frequency)
  frequency!: Frequency;

  @IsNotEmpty()
  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsNotEmpty()
  @IsString()
  categoryId!: string;
}
```

**Step 2: Create UpdateRecurringExpenseDto**

`apps/api/src/expense/dto/update-recurring-expense.dto.ts`:
```typescript
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Frequency } from '@prisma/client';

export class UpdateRecurringExpenseDto {
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Transform(({ value }) =>
    value != null ? Math.trunc(value * 100) / 100 : value,
  )
  amount?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(Frequency)
  frequency?: Frequency;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
```

**Step 3: Run tests to ensure no regressions**

Run from `apps/api/`:
```bash
pnpm test
```
Expected: All 97 tests pass (no changes to existing code).

**Step 4: Commit**

```bash
git add apps/api/src/expense/dto/
git commit -m "feat: add recurring expense DTOs"
```

---

## Task 2: RecurringExpenseService — CRUD

**Files:**
- Create: `apps/api/src/expense/recurring-expense.service.ts`
- Create: `apps/api/src/expense/recurring-expense.service.spec.ts`

**Step 1: Write failing tests for RecurringExpenseService**

`apps/api/src/expense/recurring-expense.service.spec.ts`:
```typescript
/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { RecurringExpenseService } from './recurring-expense.service';
import { PrismaService } from '../prisma/prisma.service';

const recurringExpenseSelect = {
  id: true,
  amount: true,
  description: true,
  frequency: true,
  startDate: true,
  endDate: true,
  nextDueDate: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  categoryId: true,
  category: { select: { id: true, name: true, icon: true } },
  createdById: true,
  createdBy: {
    select: { id: true, name: true, displayName: true, avatarUrl: true },
  },
  familyId: true,
};

describe('RecurringExpenseService', () => {
  let service: RecurringExpenseService;
  let prisma: PrismaService;

  const mockPrismaService = {
    recurringExpense: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    expense: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecurringExpenseService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<RecurringExpenseService>(RecurringExpenseService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create recurring expense with nextDueDate = startDate', async () => {
      const mockResult = {
        id: 'rec-1',
        amount: 500,
        description: 'Netflix',
        frequency: 'MONTHLY',
        startDate: new Date('2026-03-01'),
        endDate: null,
        nextDueDate: new Date('2026-03-01'),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        categoryId: 'cat-1',
        category: { id: 'cat-1', name: 'Entertainment', icon: 'film' },
        createdById: 'user-1',
        createdBy: { id: 'user-1', name: 'Test', displayName: null, avatarUrl: null },
        familyId: 'family-1',
      };

      mockPrismaService.recurringExpense.create.mockResolvedValue(mockResult);

      const result = await service.create('family-1', 'user-1', {
        amount: 500,
        description: 'Netflix',
        frequency: 'MONTHLY' as any,
        startDate: '2026-03-01',
        categoryId: 'cat-1',
      });

      expect(result).toEqual(mockResult);
      expect(prisma.recurringExpense.create).toHaveBeenCalledWith({
        data: {
          amount: 500,
          description: 'Netflix',
          frequency: 'MONTHLY',
          startDate: new Date('2026-03-01'),
          nextDueDate: new Date('2026-03-01'),
          categoryId: 'cat-1',
          familyId: 'family-1',
          createdById: 'user-1',
        },
        select: recurringExpenseSelect,
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated results', async () => {
      const mockResults = [{ id: 'rec-1' }];
      mockPrismaService.recurringExpense.findMany.mockResolvedValue(mockResults);
      mockPrismaService.recurringExpense.count.mockResolvedValue(1);

      const result = await service.findAll('family-1', {});

      expect(result).toEqual({ data: mockResults, total: 1, page: 1, limit: 20 });
    });
  });

  describe('update', () => {
    const mockRecurring = {
      id: 'rec-1',
      createdById: 'user-1',
      familyId: 'family-1',
    };

    it('should update own recurring expense', async () => {
      mockPrismaService.recurringExpense.findUnique.mockResolvedValue(mockRecurring);
      mockPrismaService.recurringExpense.update.mockResolvedValue({ ...mockRecurring, amount: 600 });

      await service.update('rec-1', 'family-1', 'user-1', 'MEMBER', { amount: 600 });

      expect(prisma.recurringExpense.update).toHaveBeenCalled();
    });

    it('should throw ForbiddenException for non-owner non-admin', async () => {
      mockPrismaService.recurringExpense.findUnique.mockResolvedValue(mockRecurring);

      await expect(
        service.update('rec-1', 'family-1', 'user-999', 'MEMBER', { amount: 600 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrismaService.recurringExpense.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', 'family-1', 'user-1', 'MEMBER', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete own recurring expense', async () => {
      const mockRecurring = { id: 'rec-1', createdById: 'user-1', familyId: 'family-1' };
      mockPrismaService.recurringExpense.findUnique.mockResolvedValue(mockRecurring);
      mockPrismaService.recurringExpense.delete.mockResolvedValue(mockRecurring);

      await service.remove('rec-1', 'family-1', 'user-1', 'MEMBER');

      expect(prisma.recurringExpense.delete).toHaveBeenCalledWith({ where: { id: 'rec-1' } });
    });
  });

  describe('processRecurringExpenses', () => {
    it('should create expenses for due recurring items and advance nextDueDate', async () => {
      const now = new Date();
      const mockDue = [
        {
          id: 'rec-1',
          amount: 500,
          description: 'Netflix',
          frequency: 'MONTHLY',
          startDate: new Date('2026-01-01'),
          endDate: null,
          nextDueDate: new Date('2026-02-01'),
          isActive: true,
          categoryId: 'cat-1',
          familyId: 'family-1',
          createdById: 'user-1',
        },
      ];

      mockPrismaService.recurringExpense.findMany.mockResolvedValue(mockDue);
      mockPrismaService.expense.create.mockResolvedValue({});
      mockPrismaService.recurringExpense.update.mockResolvedValue({});

      await service.processRecurringExpenses();

      expect(prisma.expense.create).toHaveBeenCalledWith({
        data: {
          amount: 500,
          description: 'Netflix',
          date: new Date('2026-02-01'),
          categoryId: 'cat-1',
          familyId: 'family-1',
          createdById: 'user-1',
        },
      });

      expect(prisma.recurringExpense.update).toHaveBeenCalledWith({
        where: { id: 'rec-1' },
        data: { nextDueDate: new Date('2026-03-01') },
      });
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run from `apps/api/`:
```bash
pnpm test -- --testPathPattern=recurring-expense.service
```
Expected: FAIL — `Cannot find module './recurring-expense.service'`

**Step 3: Implement RecurringExpenseService**

`apps/api/src/expense/recurring-expense.service.ts`:
```typescript
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Frequency, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecurringExpenseDto } from './dto/create-recurring-expense.dto';
import { UpdateRecurringExpenseDto } from './dto/update-recurring-expense.dto';

const recurringExpenseSelect = {
  id: true,
  amount: true,
  description: true,
  frequency: true,
  startDate: true,
  endDate: true,
  nextDueDate: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  categoryId: true,
  category: { select: { id: true, name: true, icon: true } },
  createdById: true,
  createdBy: {
    select: { id: true, name: true, displayName: true, avatarUrl: true },
  },
  familyId: true,
} satisfies Prisma.RecurringExpenseSelect;

@Injectable()
export class RecurringExpenseService {
  private readonly logger = new Logger(RecurringExpenseService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(familyId: string, userId: string, dto: CreateRecurringExpenseDto) {
    return this.prisma.recurringExpense.create({
      data: {
        amount: Math.trunc(dto.amount * 100) / 100,
        description: dto.description,
        frequency: dto.frequency,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        nextDueDate: new Date(dto.startDate),
        categoryId: dto.categoryId,
        familyId,
        createdById: userId,
      },
      select: recurringExpenseSelect,
    });
  }

  async findAll(familyId: string, query: { page?: number; limit?: number }) {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const where: Prisma.RecurringExpenseWhereInput = { familyId };

    const [data, total] = await Promise.all([
      this.prisma.recurringExpense.findMany({
        where,
        select: recurringExpenseSelect,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.recurringExpense.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async update(
    id: string,
    familyId: string,
    userId: string,
    userRole: string,
    dto: UpdateRecurringExpenseDto,
  ) {
    const existing = await this.prisma.recurringExpense.findUnique({
      where: { id },
      select: { id: true, createdById: true, familyId: true },
    });

    if (!existing || existing.familyId !== familyId) {
      throw new NotFoundException('Recurring expense not found');
    }

    if (existing.createdById !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('Only the creator or admin can edit');
    }

    const data: Prisma.RecurringExpenseUpdateInput = {};
    if (dto.amount != null) data.amount = Math.trunc(dto.amount * 100) / 100;
    if (dto.description != null) data.description = dto.description;
    if (dto.frequency != null) data.frequency = dto.frequency;
    if (dto.endDate != null) data.endDate = new Date(dto.endDate);
    if (dto.categoryId != null) data.category = { connect: { id: dto.categoryId } };
    if (dto.isActive != null) data.isActive = dto.isActive;

    return this.prisma.recurringExpense.update({
      where: { id },
      data,
      select: recurringExpenseSelect,
    });
  }

  async remove(id: string, familyId: string, userId: string, userRole: string) {
    const existing = await this.prisma.recurringExpense.findUnique({
      where: { id },
      select: { id: true, createdById: true, familyId: true },
    });

    if (!existing || existing.familyId !== familyId) {
      throw new NotFoundException('Recurring expense not found');
    }

    if (existing.createdById !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('Only the creator or admin can delete');
    }

    return this.prisma.recurringExpense.delete({ where: { id } });
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async processRecurringExpenses() {
    const now = new Date();
    this.logger.log('Processing recurring expenses...');

    const dueExpenses = await this.prisma.recurringExpense.findMany({
      where: {
        isActive: true,
        nextDueDate: { lte: now },
        OR: [
          { endDate: null },
          { endDate: { gte: now } },
        ],
      },
    });

    for (const rec of dueExpenses) {
      await this.prisma.expense.create({
        data: {
          amount: rec.amount,
          description: rec.description,
          date: rec.nextDueDate,
          categoryId: rec.categoryId,
          familyId: rec.familyId,
          createdById: rec.createdById,
        },
      });

      const nextDate = this.advanceDate(rec.nextDueDate, rec.frequency);

      await this.prisma.recurringExpense.update({
        where: { id: rec.id },
        data: { nextDueDate: nextDate },
      });

      this.logger.log(`Generated expense from recurring ${rec.id}, next due: ${nextDate.toISOString()}`);
    }

    this.logger.log(`Processed ${dueExpenses.length} recurring expenses`);
  }

  private advanceDate(date: Date, frequency: Frequency): Date {
    const next = new Date(date);
    switch (frequency) {
      case 'DAILY':
        next.setDate(next.getDate() + 1);
        break;
      case 'WEEKLY':
        next.setDate(next.getDate() + 7);
        break;
      case 'MONTHLY':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'YEARLY':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }
    return next;
  }
}
```

**Step 4: Run test to verify it passes**

Run from `apps/api/`:
```bash
pnpm test -- --testPathPattern=recurring-expense.service
```
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/expense/recurring-expense.service.ts apps/api/src/expense/recurring-expense.service.spec.ts
git commit -m "feat: add RecurringExpenseService with CRUD and cron processing"
```

---

## Task 3: RecurringExpenseController + Module Registration

**Files:**
- Create: `apps/api/src/expense/recurring-expense.controller.ts`
- Create: `apps/api/src/expense/recurring-expense.controller.spec.ts`
- Modify: `apps/api/src/expense/expense.module.ts`

**Step 1: Write failing tests for RecurringExpenseController**

`apps/api/src/expense/recurring-expense.controller.spec.ts`:
```typescript
/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';

jest.mock('better-auth', () => ({ betterAuth: jest.fn() }));
jest.mock('better-auth/adapters/prisma', () => ({ prismaAdapter: jest.fn() }));
jest.mock('better-auth/node', () => ({ fromNodeHeaders: jest.fn() }));

import { RecurringExpenseController } from './recurring-expense.controller';
import { RecurringExpenseService } from './recurring-expense.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { FamilyGuard } from '../family/guards/family.guard';

describe('RecurringExpenseController', () => {
  let controller: RecurringExpenseController;
  let service: RecurringExpenseService;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecurringExpenseController],
      providers: [{ provide: RecurringExpenseService, useValue: mockService }],
    })
      .overrideGuard(SessionGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(FamilyGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<RecurringExpenseController>(RecurringExpenseController);
    service = module.get<RecurringExpenseService>(RecurringExpenseService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should create recurring expense', async () => {
    const dto = { amount: 500, description: 'Netflix', frequency: 'MONTHLY' as any, startDate: '2026-03-01', categoryId: 'cat-1' };
    mockService.create.mockResolvedValue({ id: 'rec-1', ...dto });

    const result = await controller.create('family-1', { id: 'user-1' } as any, dto);

    expect(result).toBeDefined();
    expect(service.create).toHaveBeenCalledWith('family-1', 'user-1', dto);
  });

  it('should list recurring expenses', async () => {
    mockService.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });

    const result = await controller.findAll('family-1', {});

    expect(service.findAll).toHaveBeenCalledWith('family-1', {});
  });

  it('should update recurring expense', async () => {
    mockService.update.mockResolvedValue({ id: 'rec-1' });

    await controller.update('family-1', 'rec-1', { id: 'user-1' } as any, { role: 'MEMBER' } as any, { amount: 600 });

    expect(service.update).toHaveBeenCalledWith('rec-1', 'family-1', 'user-1', 'MEMBER', { amount: 600 });
  });

  it('should delete recurring expense', async () => {
    mockService.remove.mockResolvedValue({ id: 'rec-1' });

    await controller.remove('family-1', 'rec-1', { id: 'user-1' } as any, { role: 'ADMIN' } as any);

    expect(service.remove).toHaveBeenCalledWith('rec-1', 'family-1', 'user-1', 'ADMIN');
  });
});
```

**Step 2: Run test to verify it fails**

Run from `apps/api/`:
```bash
pnpm test -- --testPathPattern=recurring-expense.controller
```
Expected: FAIL

**Step 3: Implement RecurringExpenseController**

`apps/api/src/expense/recurring-expense.controller.ts`:
```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FamilyRole } from '@prisma/client';
import { RecurringExpenseService } from './recurring-expense.service';
import { CreateRecurringExpenseDto } from './dto/create-recurring-expense.dto';
import { UpdateRecurringExpenseDto } from './dto/update-recurring-expense.dto';
import { SessionGuard } from '../auth/guards/session.guard';
import { FamilyGuard } from '../family/guards/family.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequiredFamilyRole } from '../family/decorators/required-family-role.decorator';
import { CurrentFamilyMember } from '../family/decorators/current-family-member.decorator';

@ApiTags('Recurring Expenses')
@ApiBearerAuth()
@Controller('families/:familyId/recurring-expenses')
@UseGuards(SessionGuard)
export class RecurringExpenseController {
  constructor(private readonly recurringExpenseService: RecurringExpenseService) {}

  @Post()
  @UseGuards(FamilyGuard)
  @RequiredFamilyRole(FamilyRole.MEMBER)
  async create(
    @Param('familyId') familyId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateRecurringExpenseDto,
  ) {
    return this.recurringExpenseService.create(familyId, user.id, dto);
  }

  @Get()
  @UseGuards(FamilyGuard)
  @RequiredFamilyRole(FamilyRole.MEMBER)
  async findAll(
    @Param('familyId') familyId: string,
    @Query() query: { page?: number; limit?: number },
  ) {
    return this.recurringExpenseService.findAll(familyId, query);
  }

  @Patch(':id')
  @UseGuards(FamilyGuard)
  @RequiredFamilyRole(FamilyRole.MEMBER)
  async update(
    @Param('familyId') familyId: string,
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @CurrentFamilyMember() member: { role: string },
    @Body() dto: UpdateRecurringExpenseDto,
  ) {
    return this.recurringExpenseService.update(id, familyId, user.id, member.role, dto);
  }

  @Delete(':id')
  @UseGuards(FamilyGuard)
  @RequiredFamilyRole(FamilyRole.MEMBER)
  async remove(
    @Param('familyId') familyId: string,
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @CurrentFamilyMember() member: { role: string },
  ) {
    return this.recurringExpenseService.remove(id, familyId, user.id, member.role);
  }
}
```

**Step 4: Register in ExpenseModule**

Update `apps/api/src/expense/expense.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ExpenseController } from './expense.controller';
import { ExpenseService } from './expense.service';
import { RecurringExpenseController } from './recurring-expense.controller';
import { RecurringExpenseService } from './recurring-expense.service';
import { AuthModule } from '../auth/auth.module';
import { FamilyModule } from '../family/family.module';

@Module({
  imports: [AuthModule, FamilyModule, ScheduleModule.forRoot()],
  controllers: [ExpenseController, RecurringExpenseController],
  providers: [ExpenseService, RecurringExpenseService],
  exports: [ExpenseService],
})
export class ExpenseModule {}
```

> Install `@nestjs/schedule` first: `cd apps/api && pnpm add @nestjs/schedule`

**Step 5: Run all tests**

Run from `apps/api/`:
```bash
pnpm test
```
Expected: All tests pass (existing 97 + new recurring expense tests).

**Step 6: Commit**

```bash
git add apps/api/src/expense/ apps/api/package.json pnpm-lock.yaml
git commit -m "feat: add RecurringExpenseController with CRUD endpoints and cron scheduling"
```

---

## Task 4: Four Remaining Report Endpoints — Service

**Files:**
- Modify: `apps/api/src/report/report.service.ts`
- Modify: `apps/api/src/report/report.service.spec.ts`

**Step 1: Add tests for the 4 new report methods**

Append to `apps/api/src/report/report.service.spec.ts` (inside the outer `describe`):

```typescript
describe('getCategorySplit', () => {
  it('should return spending per category with percentages', async () => {
    mockPrismaService.expense.groupBy.mockResolvedValue([
      { categoryId: 'cat-1', _sum: { amount: 3000 } },
      { categoryId: 'cat-2', _sum: { amount: 2000 } },
    ]);
    mockPrismaService.category.findMany.mockResolvedValue([
      { id: 'cat-1', name: 'Food', icon: 'utensils' },
      { id: 'cat-2', name: 'Transport', icon: 'car' },
    ]);

    const result = await service.getCategorySplit('family-1', '2026-02');

    expect(result.categories).toHaveLength(2);
    expect(result.categories[0].amount).toBe(3000);
    expect(result.categories[0].percent).toBe(60);
    expect(result.categories[1].percent).toBe(40);
  });

  it('should return empty when no expenses', async () => {
    mockPrismaService.expense.groupBy.mockResolvedValue([]);

    const result = await service.getCategorySplit('family-1', '2026-02');

    expect(result.categories).toHaveLength(0);
  });
});

describe('getDailySpending', () => {
  it('should return per-day totals', async () => {
    mockPrismaService.expense.groupBy.mockResolvedValue([
      { date: new Date('2026-02-01'), _sum: { amount: 1000 } },
      { date: new Date('2026-02-03'), _sum: { amount: 500 } },
    ]);

    const result = await service.getDailySpending('family-1', '2026-02');

    expect(result.days).toHaveLength(2);
    expect(result.days[0].amount).toBe(1000);
  });
});

describe('getMonthlyTrend', () => {
  it('should return totals for last N months', async () => {
    mockPrismaService.expense.groupBy.mockResolvedValue([]);

    const result = await service.getMonthlyTrend('family-1', 6);

    expect(result.months).toBeDefined();
  });
});

describe('getTopExpenses', () => {
  it('should return top expenses by amount', async () => {
    mockPrismaService.expense.findMany.mockResolvedValue([
      {
        id: 'exp-1',
        amount: 5000,
        description: 'Big purchase',
        date: new Date('2026-02-10'),
        categoryId: 'cat-1',
        category: { id: 'cat-1', name: 'Shopping', icon: 'shopping-bag' },
        createdById: 'user-1',
        createdBy: { id: 'user-1', name: 'Test', displayName: null, avatarUrl: null },
      },
    ]);

    const result = await service.getTopExpenses('family-1', '2026-02', 5);

    expect(result.expenses).toHaveLength(1);
    expect(result.expenses[0].amount).toBe(5000);
  });
});
```

**Step 2: Run tests to verify they fail**

Run from `apps/api/`:
```bash
pnpm test -- --testPathPattern=report.service
```
Expected: FAIL — methods don't exist yet.

**Step 3: Implement the 4 methods**

Add to `apps/api/src/report/report.service.ts` (after `getBudgetUtilization`):

```typescript
async getCategorySplit(familyId: string, month: string) {
  const [year, mon] = parseMonth(month);
  const startDate = new Date(year, mon - 1, 1);
  const endDate = new Date(year, mon, 1);

  const groups = await this.prisma.expense.groupBy({
    by: ['categoryId'],
    _sum: { amount: true },
    where: {
      familyId,
      date: { gte: startDate, lt: endDate },
    },
    orderBy: { _sum: { amount: 'desc' } },
  });

  if (groups.length === 0) return { month, categories: [] };

  const total = groups.reduce((sum, g) => sum + (g._sum.amount ?? 0), 0);

  const catIds = groups.map((g) => g.categoryId);
  const cats = await this.prisma.category.findMany({
    where: { id: { in: catIds } },
    select: { id: true, name: true, icon: true },
  });
  const catMap = new Map(cats.map((c) => [c.id, c]));

  const categories = groups.map((g) => {
    const cat = catMap.get(g.categoryId);
    const amount = g._sum.amount ?? 0;
    return {
      categoryId: g.categoryId,
      name: cat?.name ?? '',
      icon: cat?.icon ?? null,
      amount,
      percent: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0,
    };
  });

  return { month, categories };
}

async getDailySpending(familyId: string, month: string) {
  const [year, mon] = parseMonth(month);
  const startDate = new Date(year, mon - 1, 1);
  const endDate = new Date(year, mon, 1);

  const groups = await this.prisma.expense.groupBy({
    by: ['date'],
    _sum: { amount: true },
    where: {
      familyId,
      date: { gte: startDate, lt: endDate },
    },
    orderBy: { date: 'asc' },
  });

  const days = groups.map((g) => ({
    date: g.date.toISOString().split('T')[0],
    amount: g._sum.amount ?? 0,
  }));

  return { month, days };
}

async getMonthlyTrend(familyId: string, months: number) {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

  const expenses = await this.prisma.expense.findMany({
    where: {
      familyId,
      date: { gte: startDate },
    },
    select: { date: true, amount: true },
  });

  const monthMap = new Map<string, number>();
  for (const exp of expenses) {
    const key = `${exp.date.getFullYear()}-${String(exp.date.getMonth() + 1).padStart(2, '0')}`;
    monthMap.set(key, (monthMap.get(key) ?? 0) + exp.amount);
  }

  const result: { month: string; amount: number }[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    result.push({ month: key, amount: monthMap.get(key) ?? 0 });
  }

  return { months: result };
}

async getTopExpenses(familyId: string, month: string, limit: number) {
  const [year, mon] = parseMonth(month);
  const startDate = new Date(year, mon - 1, 1);
  const endDate = new Date(year, mon, 1);

  const expenses = await this.prisma.expense.findMany({
    where: {
      familyId,
      date: { gte: startDate, lt: endDate },
    },
    select: {
      id: true,
      amount: true,
      description: true,
      date: true,
      categoryId: true,
      category: { select: { id: true, name: true, icon: true } },
      createdById: true,
      createdBy: {
        select: { id: true, name: true, displayName: true, avatarUrl: true },
      },
    },
    orderBy: { amount: 'desc' },
    take: limit,
  });

  return { month, expenses };
}
```

**Step 4: Run tests to verify they pass**

Run from `apps/api/`:
```bash
pnpm test -- --testPathPattern=report.service
```
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/report/report.service.ts apps/api/src/report/report.service.spec.ts
git commit -m "feat: add category-split, daily-spending, monthly-trend, top-expenses report methods"
```

---

## Task 5: Report Controller — Wire Up New Endpoints

**Files:**
- Modify: `apps/api/src/report/report.controller.ts`
- Modify: `apps/api/src/report/report.controller.spec.ts`

**Step 1: Add controller tests**

Append to `apps/api/src/report/report.controller.spec.ts` (inside the outer `describe`). Also add the new methods to `mockReportService`:

Update the `mockReportService` declaration:
```typescript
const mockReportService = {
  getMemberSpending: jest.fn(),
  getBudgetUtilization: jest.fn(),
  getCategorySplit: jest.fn(),
  getDailySpending: jest.fn(),
  getMonthlyTrend: jest.fn(),
  getTopExpenses: jest.fn(),
};
```

Add tests:
```typescript
describe('GET /families/:familyId/reports/category-split', () => {
  it('should call getCategorySplit', async () => {
    const mockResult = { month: '2026-02', categories: [] };
    mockReportService.getCategorySplit.mockResolvedValue(mockResult);

    const result = await controller.getCategorySplit('family-1', '2026-02');
    expect(result).toEqual(mockResult);
    expect(service.getCategorySplit).toHaveBeenCalledWith('family-1', '2026-02');
  });
});

describe('GET /families/:familyId/reports/daily-spending', () => {
  it('should call getDailySpending', async () => {
    const mockResult = { month: '2026-02', days: [] };
    mockReportService.getDailySpending.mockResolvedValue(mockResult);

    const result = await controller.getDailySpending('family-1', '2026-02');
    expect(result).toEqual(mockResult);
  });
});

describe('GET /families/:familyId/reports/monthly-trend', () => {
  it('should call getMonthlyTrend', async () => {
    const mockResult = { months: [] };
    mockReportService.getMonthlyTrend.mockResolvedValue(mockResult);

    const result = await controller.getMonthlyTrend('family-1', '6');
    expect(result).toEqual(mockResult);
    expect(service.getMonthlyTrend).toHaveBeenCalledWith('family-1', 6);
  });
});

describe('GET /families/:familyId/reports/top-expenses', () => {
  it('should call getTopExpenses', async () => {
    const mockResult = { month: '2026-02', expenses: [] };
    mockReportService.getTopExpenses.mockResolvedValue(mockResult);

    const result = await controller.getTopExpenses('family-1', '2026-02', '5');
    expect(result).toEqual(mockResult);
    expect(service.getTopExpenses).toHaveBeenCalledWith('family-1', '2026-02', 5);
  });
});
```

**Step 2: Add controller endpoints**

Add to `apps/api/src/report/report.controller.ts`:
```typescript
@Get('category-split')
@UseGuards(FamilyGuard)
@RequiredFamilyRole(FamilyRole.MEMBER)
async getCategorySplit(
  @Param('familyId') familyId: string,
  @Query('month') month: string,
) {
  return this.reportService.getCategorySplit(familyId, month);
}

@Get('daily-spending')
@UseGuards(FamilyGuard)
@RequiredFamilyRole(FamilyRole.MEMBER)
async getDailySpending(
  @Param('familyId') familyId: string,
  @Query('month') month: string,
) {
  return this.reportService.getDailySpending(familyId, month);
}

@Get('monthly-trend')
@UseGuards(FamilyGuard)
@RequiredFamilyRole(FamilyRole.MEMBER)
async getMonthlyTrend(
  @Param('familyId') familyId: string,
  @Query('months') months: string,
) {
  return this.reportService.getMonthlyTrend(familyId, parseInt(months) || 6);
}

@Get('top-expenses')
@UseGuards(FamilyGuard)
@RequiredFamilyRole(FamilyRole.MEMBER)
async getTopExpenses(
  @Param('familyId') familyId: string,
  @Query('month') month: string,
  @Query('limit') limit: string,
) {
  return this.reportService.getTopExpenses(familyId, month, parseInt(limit) || 5);
}
```

**Step 3: Run all tests**

Run from `apps/api/`:
```bash
pnpm test
```
Expected: All pass.

**Step 4: Commit**

```bash
git add apps/api/src/report/
git commit -m "feat: add category-split, daily-spending, monthly-trend, top-expenses endpoints"
```

---

## Task 6: Backend Hardening — Rate Limiting, CORS, Exception Filter

**Files:**
- Modify: `apps/api/src/main.ts`
- Modify: `apps/api/src/app.module.ts`
- Create: `apps/api/src/common/http-exception.filter.ts`

**Step 1: Install throttler**

Run from `apps/api/`:
```bash
pnpm add @nestjs/throttler
```

**Step 2: Add ThrottlerModule to AppModule**

Update `apps/api/src/app.module.ts` — add the import:
```typescript
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
```

Add to the `imports` array:
```typescript
ThrottlerModule.forRoot([{
  ttl: 60000,
  limit: 60,
}]),
```

Add to the `providers` array:
```typescript
{ provide: APP_GUARD, useClass: ThrottlerGuard },
```

**Step 3: Create global exception filter**

`apps/api/src/common/http-exception.filter.ts`:
```typescript
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        message = (res as any).message || message;
        error = (res as any).error || error;
      }
    } else {
      this.logger.error('Unhandled exception', exception);
    }

    response.status(statusCode).json({ statusCode, message, error });
  }
}
```

**Step 4: Update main.ts with CORS and exception filter**

Add to `apps/api/src/main.ts` (after creating the NestJS app, before `app.listen`):

```typescript
import { GlobalExceptionFilter } from './common/http-exception.filter';

// After NestFactory.create line:
app.enableCors({
  origin: true,
  credentials: true,
});

app.useGlobalFilters(new GlobalExceptionFilter());
```

**Step 5: Run all tests**

Run from `apps/api/`:
```bash
pnpm test
```
Expected: All pass.

**Step 6: Commit**

```bash
git add apps/api/src/main.ts apps/api/src/app.module.ts apps/api/src/common/ apps/api/package.json pnpm-lock.yaml
git commit -m "feat: add rate limiting, CORS, and global exception filter"
```

---

## Task 7: Mobile — Install Victory Native XL + Chart Dependencies

**Files:**
- Modify: `apps/mobile/package.json`

**Step 1: Install chart packages**

Run from `apps/mobile/`:
```bash
npx expo install @shopify/react-native-skia
pnpm add victory-native
```

> `react-native-reanimated` is already installed from Phase 1.

**Step 2: Install additional UX packages for Phase 4**

Run from `apps/mobile/`:
```bash
npx expo install expo-haptics @react-native-community/netinfo
pnpm add react-native-toast-message
```

> `react-native-gesture-handler` is already installed via Expo Router.

**Step 3: Rebuild native modules**

If testing on iOS simulator:
```bash
cd apps/mobile && npx expo prebuild --clean && npx pod-install
```

Or simply restart the Expo dev server with `--clear`:
```bash
pnpm dev -- --clear
```

**Step 4: Commit**

```bash
git add apps/mobile/package.json pnpm-lock.yaml
git commit -m "feat: install Victory Native XL, expo-haptics, netinfo, and toast"
```

---

## Task 8: Mobile — Chart Components

**Files:**
- Create: `apps/mobile/components/charts/CategoryDonut.tsx`
- Create: `apps/mobile/components/charts/DailySpendingBar.tsx`
- Create: `apps/mobile/components/charts/MonthlyTrendLine.tsx`

**Step 1: Create CategoryDonut**

`apps/mobile/components/charts/CategoryDonut.tsx`:
```tsx
import { View, Text } from 'react-native';
import { Pie, PolarChart } from 'victory-native';

interface CategoryData {
  name: string;
  amount: number;
  percent: number;
  color: string;
}

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16', '#06b6d4', '#e11d48'];

export function CategoryDonut({ data }: { data: { name: string; amount: number; percent: number }[] }) {
  if (data.length === 0) return null;

  const coloredData: CategoryData[] = data.map((d, i) => ({
    ...d,
    color: COLORS[i % COLORS.length]!,
  }));

  return (
    <View className="items-center">
      <View style={{ height: 200, width: 200 }}>
        <PolarChart
          data={coloredData}
          labelKey="name"
          valueKey="amount"
          colorKey="color"
        >
          <Pie.Chart />
        </PolarChart>
      </View>
      <View className="flex-row flex-wrap justify-center gap-2 mt-3">
        {coloredData.map((d) => (
          <View key={d.name} className="flex-row items-center">
            <View
              className="w-3 h-3 rounded-full mr-1"
              style={{ backgroundColor: d.color }}
            />
            <Text className="text-xs text-gray-600">
              {d.name} ({d.percent}%)
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
```

**Step 2: Create DailySpendingBar**

`apps/mobile/components/charts/DailySpendingBar.tsx`:
```tsx
import { View } from 'react-native';
import { CartesianChart, Bar } from 'victory-native';

interface DayData {
  date: string;
  amount: number;
}

export function DailySpendingBar({ data }: { data: DayData[] }) {
  if (data.length === 0) return null;

  return (
    <View style={{ height: 200 }}>
      <CartesianChart
        data={data}
        xKey="date"
        yKeys={['amount']}
        domainPadding={{ left: 10, right: 10 }}
      >
        {({ points, chartBounds }) => (
          <Bar
            points={points.amount}
            chartBounds={chartBounds}
            color="#3b82f6"
            roundedCorners={{ topLeft: 4, topRight: 4 }}
          />
        )}
      </CartesianChart>
    </View>
  );
}
```

**Step 3: Create MonthlyTrendLine**

`apps/mobile/components/charts/MonthlyTrendLine.tsx`:
```tsx
import { View } from 'react-native';
import { CartesianChart, Line } from 'victory-native';

interface MonthData {
  month: string;
  amount: number;
}

export function MonthlyTrendLine({ data }: { data: MonthData[] }) {
  if (data.length === 0) return null;

  return (
    <View style={{ height: 200 }}>
      <CartesianChart
        data={data}
        xKey="month"
        yKeys={['amount']}
        domainPadding={{ left: 10, right: 10 }}
      >
        {({ points }) => (
          <Line
            points={points.amount}
            color="#10b981"
            strokeWidth={2}
            curveType="natural"
          />
        )}
      </CartesianChart>
    </View>
  );
}
```

**Step 4: Commit**

```bash
git add apps/mobile/components/charts/
git commit -m "feat: add Victory Native XL chart components"
```

---

## Task 9: Mobile — Report Hooks for New Endpoints

**Files:**
- Modify: `apps/mobile/hooks/useReports.ts`
- Modify: `apps/mobile/hooks/types.ts`

**Step 1: Add types for new reports**

Append to `apps/mobile/hooks/types.ts`:
```typescript
export interface CategorySplit {
  month: string;
  categories: {
    categoryId: string;
    name: string;
    icon: string | null;
    amount: number;
    percent: number;
  }[];
}

export interface DailySpending {
  month: string;
  days: {
    date: string;
    amount: number;
  }[];
}

export interface MonthlyTrend {
  months: {
    month: string;
    amount: number;
  }[];
}

export interface TopExpenses {
  month: string;
  expenses: Expense[];
}
```

**Step 2: Add hooks for new reports**

Append to `apps/mobile/hooks/useReports.ts`:
```typescript
import type { MemberSpending, BudgetUtilization, CategorySplit, DailySpending, MonthlyTrend, TopExpenses } from './types';

export function useCategorySplit(familyId: string | null, month: string) {
  return useQuery({
    queryKey: ['reports', familyId, 'category-split', month],
    queryFn: () => apiFetch<CategorySplit>(`/families/${familyId}/reports/category-split?month=${month}`),
    enabled: !!familyId,
  });
}

export function useDailySpending(familyId: string | null, month: string) {
  return useQuery({
    queryKey: ['reports', familyId, 'daily-spending', month],
    queryFn: () => apiFetch<DailySpending>(`/families/${familyId}/reports/daily-spending?month=${month}`),
    enabled: !!familyId,
  });
}

export function useMonthlyTrend(familyId: string | null, months = 6) {
  return useQuery({
    queryKey: ['reports', familyId, 'monthly-trend', months],
    queryFn: () => apiFetch<MonthlyTrend>(`/families/${familyId}/reports/monthly-trend?months=${months}`),
    enabled: !!familyId,
  });
}

export function useTopExpenses(familyId: string | null, month: string, limit = 5) {
  return useQuery({
    queryKey: ['reports', familyId, 'top-expenses', month, limit],
    queryFn: () => apiFetch<TopExpenses>(`/families/${familyId}/reports/top-expenses?month=${month}&limit=${limit}`),
    enabled: !!familyId,
  });
}
```

**Step 3: Commit**

```bash
git add apps/mobile/hooks/
git commit -m "feat: add hooks for category-split, daily-spending, monthly-trend, top-expenses"
```

---

## Task 10: Mobile — Full Reports Tab with Charts

**Files:**
- Modify: `apps/mobile/app/(app)/(tabs)/reports.tsx`

**Step 1: Replace the Reports tab with the full chart dashboard**

Replace `apps/mobile/app/(app)/(tabs)/reports.tsx` entirely with a version that includes all 6 report sections: budget summary, member spending, category split donut chart, daily spending bar chart, monthly trend line chart, and top expenses list.

The screen should:
- Keep the existing month selector pattern (left/right arrows)
- Keep the existing budget summary card and member spending sections
- Add a CategoryDonut chart section from `useCategorySplit`
- Add a DailySpendingBar chart section from `useDailySpending`
- Add a MonthlyTrendLine chart section from `useMonthlyTrend` (uses `months` param, not `month`)
- Add a "Top Expenses" section from `useTopExpenses`
- Each section wrapped in a white card with a section header
- Keep the existing empty state
- Keep RefreshControl — refetch all queries

> Use the existing report components as a base. Import chart components from `@/components/charts/`. Each chart section should be a separate card with a title. Wrap chart imports in try/catch or conditional rendering in case Skia isn't available (dev environment without native build).

**Step 2: Verify in simulator**

Run from `apps/mobile/`:
```bash
pnpm dev
```

Expected: Reports tab shows all 6 sections with charts.

**Step 3: Commit**

```bash
git add apps/mobile/app/\(app\)/\(tabs\)/reports.tsx
git commit -m "feat: add full reports dashboard with Victory Native XL charts"
```

---

## Task 11: Mobile — Recurring Expense Hooks + Types

**Files:**
- Modify: `apps/mobile/hooks/types.ts`
- Create: `apps/mobile/hooks/useRecurringExpenses.ts`

**Step 1: Add RecurringExpense type**

Append to `apps/mobile/hooks/types.ts`:
```typescript
export interface RecurringExpense {
  id: string;
  amount: number;
  description: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  startDate: string;
  endDate: string | null;
  nextDueDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  categoryId: string;
  familyId: string;
  createdById: string;
  category: { id: string; name: string; icon: string | null };
  createdBy: { id: string; name: string; displayName: string | null; avatarUrl: string | null };
}

export interface PaginatedRecurringExpenses {
  data: RecurringExpense[];
  total: number;
  page: number;
  limit: number;
}
```

**Step 2: Create useRecurringExpenses hook**

`apps/mobile/hooks/useRecurringExpenses.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { RecurringExpense, PaginatedRecurringExpenses } from './types';

export function useRecurringExpenses(familyId: string | null) {
  return useQuery({
    queryKey: ['recurring-expenses', familyId],
    queryFn: () => apiFetch<PaginatedRecurringExpenses>(`/families/${familyId}/recurring-expenses`),
    enabled: !!familyId,
  });
}

export function useCreateRecurringExpense(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      amount: number;
      description: string;
      frequency: string;
      startDate: string;
      endDate?: string;
      categoryId: string;
    }) =>
      apiFetch<RecurringExpense>(`/families/${familyId}/recurring-expenses`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses', familyId] });
    },
  });
}

export function useUpdateRecurringExpense(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; amount?: number; description?: string; frequency?: string; endDate?: string; categoryId?: string; isActive?: boolean }) =>
      apiFetch<RecurringExpense>(`/families/${familyId}/recurring-expenses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses', familyId] });
    },
  });
}

export function useDeleteRecurringExpense(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/families/${familyId}/recurring-expenses/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses', familyId] });
    },
  });
}
```

**Step 3: Commit**

```bash
git add apps/mobile/hooks/
git commit -m "feat: add recurring expense hooks and types"
```

---

## Task 12: Mobile — Recurring Expense UI (Settings Section + Add Form Toggle)

**Files:**
- Create: `apps/mobile/app/(app)/recurring-expenses/index.tsx`
- Modify: `apps/mobile/app/(app)/(tabs)/settings.tsx` — add "Recurring Expenses" button
- Modify: `apps/mobile/app/(app)/expense/add.tsx` — add "Make Recurring" toggle
- Modify: `apps/mobile/app/(app)/_layout.tsx` — add screen for recurring-expenses

**Step 1: Create recurring expenses list screen**

`apps/mobile/app/(app)/recurring-expenses/index.tsx`:

Screen that lists all recurring expenses for the active family, each showing:
- Description, amount, frequency, next due date, active/inactive status
- Tap to toggle isActive via `useUpdateRecurringExpense`
- Swipe to delete via `useDeleteRecurringExpense`

**Step 2: Add "Recurring Expenses" button in Settings tab**

In `apps/mobile/app/(app)/(tabs)/settings.tsx`, add a button between the budget manage button and the create/join family buttons:
```tsx
<TouchableOpacity
  className="border border-gray-300 rounded-lg py-3 items-center mb-3"
  onPress={() => router.push('/(app)/recurring-expenses')}
>
  <Text className="font-medium text-sm">Recurring Expenses</Text>
</TouchableOpacity>
```

**Step 3: Add "Make Recurring" toggle to Add Expense form**

In `apps/mobile/app/(app)/expense/add.tsx`, add a toggle section below the category picker:
- Switch/checkbox: "Make this recurring"
- When toggled on, show: Frequency picker (DAILY / WEEKLY / MONTHLY / YEARLY), optional end date
- On submit: if recurring is toggled on, call `useCreateRecurringExpense` instead of `useCreateExpense`
- If not recurring, use existing `useCreateExpense`

**Step 4: Register the screen in app layout**

Add to `apps/mobile/app/(app)/_layout.tsx`:
```tsx
<Stack.Screen
  name="recurring-expenses/index"
  options={{ headerShown: true, title: 'Recurring Expenses', presentation: 'modal' }}
/>
```

**Step 5: Verify in simulator**

Run from `apps/mobile/`:
```bash
pnpm dev
```

**Step 6: Commit**

```bash
git add apps/mobile/app/ apps/mobile/hooks/
git commit -m "feat: add recurring expense UI with list screen and add form toggle"
```

---

## Task 13: Mobile — Reusable LoadingScreen and EmptyState Components

**Files:**
- Create: `apps/mobile/components/LoadingScreen.tsx`
- Create: `apps/mobile/components/EmptyState.tsx`

**Step 1: Create LoadingScreen**

`apps/mobile/components/LoadingScreen.tsx`:
```tsx
import { View, ActivityIndicator } from 'react-native';

export function LoadingScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" color="#000" />
    </View>
  );
}
```

**Step 2: Create EmptyState**

`apps/mobile/components/EmptyState.tsx`:
```tsx
import { View, Text, TouchableOpacity } from 'react-native';

interface EmptyStateProps {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center py-20 px-6">
      <Text className="text-lg font-semibold text-gray-400 mb-2">{title}</Text>
      {message && (
        <Text className="text-gray-400 text-center mb-4">{message}</Text>
      )}
      {actionLabel && onAction && (
        <TouchableOpacity
          className="bg-black rounded-lg py-3 px-6"
          onPress={onAction}
        >
          <Text className="text-white font-semibold">{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
```

**Step 3: Adopt components across screens**

Update the following screens to use `LoadingScreen` and `EmptyState` instead of inline implementations:
- `apps/mobile/app/(app)/(tabs)/index.tsx` — replace inline empty state
- `apps/mobile/app/(app)/(tabs)/expenses.tsx` — replace inline empty state
- `apps/mobile/app/(app)/(tabs)/reports.tsx` — replace inline empty state

**Step 4: Commit**

```bash
git add apps/mobile/components/ apps/mobile/app/
git commit -m "feat: add reusable LoadingScreen and EmptyState components"
```

---

## Task 14: Mobile — ErrorBoundary + Toast + 401 Redirect

**Files:**
- Create: `apps/mobile/components/ErrorBoundary.tsx`
- Modify: `apps/mobile/app/_layout.tsx` — wrap with ErrorBoundary + Toast
- Modify: `apps/mobile/lib/api.ts` — add 401 handling

**Step 1: Create ErrorBoundary**

`apps/mobile/components/ErrorBoundary.tsx`:
```tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center bg-white px-6">
          <Text className="text-xl font-bold mb-2">Something went wrong</Text>
          <Text className="text-gray-500 text-center mb-6">
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <TouchableOpacity
            className="bg-black rounded-lg py-3 px-6"
            onPress={this.handleReset}
          >
            <Text className="text-white font-semibold">Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}
```

**Step 2: Add Toast to root layout**

Update `apps/mobile/app/_layout.tsx` to wrap with ErrorBoundary and add Toast:
```tsx
import Toast from 'react-native-toast-message';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Wrap the return:
return (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <GluestackUIProvider>
        <Slot />
        <Toast />
      </GluestackUIProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);
```

**Step 3: Add 401 handling to API wrapper**

Update `apps/mobile/lib/api.ts`:
```typescript
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';

// Inside apiFetch, after the !res.ok check:
if (res.status === 401) {
  router.replace('/(auth)/login');
  throw new Error('Session expired');
}
```

**Step 4: Add toast on mutation errors**

Update `apps/mobile/lib/queryClient.ts`:
```typescript
import Toast from 'react-native-toast-message';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
    },
    mutations: {
      onError: (error: Error) => {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: error.message,
        });
      },
    },
  },
});
```

**Step 5: Commit**

```bash
git add apps/mobile/components/ErrorBoundary.tsx apps/mobile/app/_layout.tsx apps/mobile/lib/
git commit -m "feat: add ErrorBoundary, toast notifications, and 401 redirect"
```

---

## Task 15: Mobile — Offline Banner

**Files:**
- Create: `apps/mobile/components/OfflineBanner.tsx`
- Modify: `apps/mobile/app/_layout.tsx`

**Step 1: Create OfflineBanner**

`apps/mobile/components/OfflineBanner.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected);
    });
    return unsubscribe;
  }, []);

  if (!isOffline) return null;

  return (
    <View className="bg-red-500 px-4 py-2">
      <Text className="text-white text-center text-sm font-medium">
        No internet connection
      </Text>
    </View>
  );
}
```

**Step 2: Add to root layout**

In `apps/mobile/app/_layout.tsx`, add `<OfflineBanner />` right after the `<Slot />`:
```tsx
import { OfflineBanner } from '@/components/OfflineBanner';

// Inside the return:
<Slot />
<OfflineBanner />
<Toast />
```

**Step 3: Commit**

```bash
git add apps/mobile/components/OfflineBanner.tsx apps/mobile/app/_layout.tsx
git commit -m "feat: add offline banner with NetInfo"
```

---

## Task 16: Mobile — Infinite Scroll for Expense List

**Files:**
- Modify: `apps/mobile/hooks/useExpenses.ts` — add `useInfiniteExpenses`
- Modify: `apps/mobile/app/(app)/(tabs)/expenses.tsx` — use `useInfiniteQuery`
- Modify: `apps/mobile/app/(app)/(tabs)/index.tsx` — use `useInfiniteQuery` for activity feed

**Step 1: Add useInfiniteExpenses hook**

Add to `apps/mobile/hooks/useExpenses.ts`:
```typescript
import { useInfiniteQuery } from '@tanstack/react-query';

export function useInfiniteExpenses(familyId: string | null, filters: Omit<ExpenseFilters, 'page'> = {}) {
  const buildParams = (page: number) => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);
    if (filters.categoryId) params.set('categoryId', filters.categoryId);
    if (filters.createdById) params.set('createdById', filters.createdById);
    if (filters.sort) params.set('sort', filters.sort);
    return params.toString();
  };

  return useInfiniteQuery({
    queryKey: ['expenses-infinite', familyId, filters],
    queryFn: ({ pageParam = 1 }) =>
      apiFetch<PaginatedExpenses>(`/families/${familyId}/expenses?${buildParams(pageParam)}`),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((sum, p) => sum + p.data.length, 0);
      return totalFetched < lastPage.total ? allPages.length + 1 : undefined;
    },
    enabled: !!familyId,
  });
}
```

**Step 2: Update expenses tab to use infinite scroll**

Update `apps/mobile/app/(app)/(tabs)/expenses.tsx`:
- Replace `useExpenses` with `useInfiniteExpenses`
- Flatten pages: `data.pages.flatMap(p => p.data)`
- Add `onEndReached={fetchNextPage}` and `onEndReachedThreshold={0.5}` to FlatList
- Show a loading spinner at the bottom when `isFetchingNextPage`

**Step 3: Update home tab activity feed to use infinite scroll**

Update `apps/mobile/app/(app)/(tabs)/index.tsx`:
- Replace `useExpenses` with `useInfiniteExpenses` (sort: 'createdAt')
- Same infinite scroll pattern

**Step 4: Commit**

```bash
git add apps/mobile/hooks/useExpenses.ts apps/mobile/app/\(app\)/\(tabs\)/expenses.tsx apps/mobile/app/\(app\)/\(tabs\)/index.tsx
git commit -m "feat: add infinite scroll for expense list and activity feed"
```

---

## Task 17: Mobile — Optimistic Updates for Expense Mutations

**Files:**
- Modify: `apps/mobile/hooks/useExpenses.ts`

**Step 1: Add optimistic create**

Update `useCreateExpense` in `apps/mobile/hooks/useExpenses.ts`:
```typescript
export function useCreateExpense(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { amount: number; description: string; date: string; categoryId: string }) =>
      apiFetch<Expense>(`/families/${familyId}/expenses`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onMutate: async (newExpense) => {
      await queryClient.cancelQueries({ queryKey: ['expenses-infinite', familyId] });
      await queryClient.cancelQueries({ queryKey: ['expenses', familyId] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses-infinite', familyId] });
      queryClient.invalidateQueries({ queryKey: ['expenses', familyId] });
      queryClient.invalidateQueries({ queryKey: ['reports', familyId] });
    },
  });
}
```

**Step 2: Add optimistic delete**

Update `useDeleteExpense`:
```typescript
export function useDeleteExpense(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/families/${familyId}/expenses/${id}`, { method: 'DELETE' }),
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['expenses-infinite', familyId] });
      const previousData = queryClient.getQueriesData({ queryKey: ['expenses-infinite', familyId] });
      queryClient.setQueriesData(
        { queryKey: ['expenses-infinite', familyId] },
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              data: page.data.filter((e: Expense) => e.id !== deletedId),
              total: page.total - 1,
            })),
          };
        },
      );
      return { previousData };
    },
    onError: (_err, _id, context) => {
      if (context?.previousData) {
        for (const [queryKey, data] of context.previousData) {
          queryClient.setQueryData(queryKey, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses-infinite', familyId] });
      queryClient.invalidateQueries({ queryKey: ['expenses', familyId] });
      queryClient.invalidateQueries({ queryKey: ['reports', familyId] });
    },
  });
}
```

**Step 3: Commit**

```bash
git add apps/mobile/hooks/useExpenses.ts
git commit -m "feat: add optimistic updates for expense create and delete"
```

---

## Task 18: Mobile — Swipe-to-Delete on Expense Cards

**Files:**
- Modify: `apps/mobile/app/(app)/(tabs)/expenses.tsx`

**Step 1: Add swipeable wrapper to ExpenseCard**

Update the expenses screen to wrap each `ExpenseCard` in a `Swipeable` component from `react-native-gesture-handler`:

```tsx
import { Swipeable } from 'react-native-gesture-handler';
import { Alert } from 'react-native';

function renderRightActions() {
  return (
    <View className="bg-red-500 justify-center items-center px-6 mb-2 mx-4 rounded-r-lg">
      <Text className="text-white font-semibold">Delete</Text>
    </View>
  );
}
```

On swipe open, show `Alert.alert` confirmation dialog:
```typescript
Alert.alert(
  'Delete Expense',
  'Are you sure you want to delete this expense?',
  [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Delete',
      style: 'destructive',
      onPress: () => deleteExpense.mutate(expense.id),
    },
  ],
);
```

**Step 2: Commit**

```bash
git add apps/mobile/app/\(app\)/\(tabs\)/expenses.tsx
git commit -m "feat: add swipe-to-delete on expense cards with confirmation dialog"
```

---

## Task 19: Mobile — Family Switching in Header

**Files:**
- Modify: `apps/mobile/app/(app)/(tabs)/_layout.tsx`

**Step 1: Add family selector to tab bar header**

Update the tabs layout to include a family name/selector in the header:

```tsx
import { useFamilies } from '@/hooks/useFamilies';
import { useFamilyStore } from '@/stores/familyStore';
import { useQueryClient } from '@tanstack/react-query';

// Inside the component:
const { data: families } = useFamilies();
const { activeFamilyId, setActiveFamilyId } = useFamilyStore();
const queryClient = useQueryClient();

const activeFamily = families?.find(f => f.id === activeFamilyId);

const handleFamilySwitch = (familyId: string) => {
  setActiveFamilyId(familyId);
  queryClient.invalidateQueries();
};
```

Add `headerRight` to the tabs `screenOptions` that shows the active family name as a tappable element. When tapped, show an ActionSheet or modal picker with all families.

For simplicity, use an `Alert.alert` with buttons for each family:
```typescript
headerRight: () => (
  <TouchableOpacity
    onPress={() => {
      if (!families || families.length <= 1) return;
      Alert.alert(
        'Switch Family',
        'Select a family',
        families.map(f => ({
          text: f.name + (f.id === activeFamilyId ? ' ✓' : ''),
          onPress: () => handleFamilySwitch(f.id),
        })),
      );
    }}
    className="mr-4"
  >
    <Text className="font-medium">{activeFamily?.name ?? 'Family'}</Text>
  </TouchableOpacity>
),
```

**Step 2: Commit**

```bash
git add apps/mobile/app/\(app\)/\(tabs\)/_layout.tsx
git commit -m "feat: add family switching in tab header"
```

---

## Task 20: Mobile — Haptic Feedback

**Files:**
- Create: `apps/mobile/lib/haptics.ts`
- Modify: `apps/mobile/app/(app)/expense/add.tsx`
- Modify: `apps/mobile/app/(app)/(tabs)/expenses.tsx`

**Step 1: Create haptics utility**

`apps/mobile/lib/haptics.ts`:
```typescript
import * as Haptics from 'expo-haptics';

export function lightHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export function mediumHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

export function successHaptic() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export function errorHaptic() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}
```

**Step 2: Add haptics to key interactions**

Add haptic feedback to:
- `expense/add.tsx`: `successHaptic()` in `onSuccess` callback after creating expense
- `expenses.tsx`: `mediumHaptic()` when swipe-to-delete opens, `errorHaptic()` on delete confirmation
- FAB button press: `lightHaptic()`

**Step 3: Commit**

```bash
git add apps/mobile/lib/haptics.ts apps/mobile/app/
git commit -m "feat: add haptic feedback on key interactions"
```

---

## Task 21: Mobile — Expense Detail/Edit Screen

**Files:**
- Create: `apps/mobile/app/(app)/expense/[id].tsx`
- Modify: `apps/mobile/app/(app)/_layout.tsx`

**Step 1: Create expense detail screen**

`apps/mobile/app/(app)/expense/[id].tsx`:

Screen that:
- Fetches the expense via `useExpense(familyId, id)` from `useExpenses.ts`
- Shows: amount, description, date, category, created by, created at
- If user is the creator or ADMIN: "Edit" button (inline editing or navigate to edit form), "Delete" button with confirmation
- Uses `useUpdateExpense` and `useDeleteExpense`

**Step 2: Register screen in layout**

Add to `apps/mobile/app/(app)/_layout.tsx`:
```tsx
<Stack.Screen
  name="expense/[id]"
  options={{ headerShown: true, title: 'Expense Detail', presentation: 'modal' }}
/>
```

**Step 3: Make expense cards tappable**

In `apps/mobile/app/(app)/(tabs)/expenses.tsx`, wrap `ExpenseCard` in a `TouchableOpacity` that navigates:
```tsx
onPress={() => router.push(`/(app)/expense/${expense.id}`)}
```

**Step 4: Commit**

```bash
git add apps/mobile/app/
git commit -m "feat: add expense detail/edit screen"
```

---

## Task 22: Run All Tests + Final Verification

**Step 1: Run backend tests**

Run from `apps/api/`:
```bash
pnpm test
```
Expected: All tests pass (original 97 + new recurring expense tests + new report tests).

**Step 2: Run lint**

Run from repo root:
```bash
pnpm lint
```
Expected: No errors.

**Step 3: Manual verification checklist**

Backend:
- [ ] `POST /families/:fid/recurring-expenses` creates recurring expense
- [ ] `GET /families/:fid/recurring-expenses` lists recurring expenses
- [ ] `PATCH /families/:fid/recurring-expenses/:id` updates (owner/admin only)
- [ ] `DELETE /families/:fid/recurring-expenses/:id` deletes (owner/admin only)
- [ ] `GET /families/:fid/reports/category-split?month=` returns data
- [ ] `GET /families/:fid/reports/daily-spending?month=` returns data
- [ ] `GET /families/:fid/reports/monthly-trend?months=6` returns data
- [ ] `GET /families/:fid/reports/top-expenses?month=&limit=5` returns data
- [ ] Rate limiting returns 429 after threshold
- [ ] CORS headers present

Mobile:
- [ ] Reports tab shows all 6 chart sections
- [ ] Charts render correctly with data
- [ ] Month selector changes all report data
- [ ] Recurring expenses can be created via add expense form toggle
- [ ] Recurring expenses list accessible from Settings
- [ ] Infinite scroll loads more expenses
- [ ] Swipe-to-delete works with confirmation
- [ ] Haptic feedback on button presses
- [ ] Offline banner appears when network disconnected
- [ ] Toast shows on mutation errors
- [ ] 401 redirects to login
- [ ] ErrorBoundary catches render errors
- [ ] Family switching invalidates all data
- [ ] Expense detail screen shows full info
- [ ] Optimistic delete removes card immediately

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: phase 3-4 integration fixes"
```
