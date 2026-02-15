/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ReportService } from './report.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ReportService', () => {
  let service: ReportService;
  let prisma: PrismaService;

  const mockPrismaService = {
    family: { findUnique: jest.fn() },
    expense: { groupBy: jest.fn(), findMany: jest.fn() },
    user: { findMany: jest.fn() },
    category: { findMany: jest.fn() },
    categoryBudget: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ReportService>(ReportService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMemberSpending', () => {
    it('should return correct breakdown with members and top categories', async () => {
      mockPrismaService.family.findUnique.mockResolvedValue({
        monthlyBudget: 10000,
      });

      mockPrismaService.expense.groupBy
        // First call: member totals
        .mockResolvedValueOnce([
          { createdById: 'user-1', _sum: { amount: 6000 } },
        ])
        // Second call: top categories for user-1
        .mockResolvedValueOnce([
          { categoryId: 'cat-1', _sum: { amount: 3000 } },
          { categoryId: 'cat-2', _sum: { amount: 2000 } },
        ]);

      mockPrismaService.user.findMany.mockResolvedValue([
        {
          id: 'user-1',
          name: 'Alice',
          displayName: 'Ali',
          avatarUrl: 'https://example.com/avatar.png',
        },
      ]);

      mockPrismaService.category.findMany.mockResolvedValue([
        { id: 'cat-1', name: 'Food', icon: null },
        { id: 'cat-2', name: 'Transport', icon: null },
      ]);

      const result = await service.getMemberSpending('family-123', '2026-02');

      expect(result).toEqual({
        month: '2026-02',
        totalBudget: 10000,
        totalSpent: 6000,
        utilizationPercent: 60,
        members: [
          {
            userId: 'user-1',
            name: 'Alice',
            displayName: 'Ali',
            avatarUrl: 'https://example.com/avatar.png',
            totalSpent: 6000,
            percentOfTotal: 100,
            topCategories: [
              { categoryId: 'cat-1', name: 'Food', icon: null, amount: 3000 },
              {
                categoryId: 'cat-2',
                name: 'Transport',
                icon: null,
                amount: 2000,
              },
            ],
          },
        ],
      });

      expect(prisma.family.findUnique).toHaveBeenCalledWith({
        where: { id: 'family-123' },
        select: { monthlyBudget: true },
      });

      expect(prisma.expense.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          by: ['createdById'],
          _sum: { amount: true },
          where: {
            familyId: 'family-123',
            date: {
              gte: new Date(2026, 1, 1),
              lt: new Date(2026, 2, 1),
            },
          },
        }),
      );
    });

    it('should return empty members when no expenses', async () => {
      mockPrismaService.family.findUnique.mockResolvedValue({
        monthlyBudget: 5000,
      });
      mockPrismaService.expense.groupBy.mockResolvedValue([]);

      const result = await service.getMemberSpending('family-123', '2026-02');

      expect(result).toEqual({
        month: '2026-02',
        totalBudget: 5000,
        totalSpent: 0,
        utilizationPercent: 0,
        members: [],
      });
    });

    it('should handle null monthlyBudget with utilizationPercent 0', async () => {
      mockPrismaService.family.findUnique.mockResolvedValue({
        monthlyBudget: null,
      });

      mockPrismaService.expense.groupBy
        .mockResolvedValueOnce([
          { createdById: 'user-1', _sum: { amount: 1000 } },
        ])
        .mockResolvedValueOnce([]);

      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'user-1', name: 'Bob', displayName: null, avatarUrl: null },
      ]);

      mockPrismaService.category.findMany.mockResolvedValue([]);

      const result = await service.getMemberSpending('family-123', '2026-03');

      expect(result.totalBudget).toBe(0);
      expect(result.utilizationPercent).toBe(0);
      expect(result.totalSpent).toBe(1000);
      expect(result.members).toHaveLength(1);
      expect(result.members[0].percentOfTotal).toBe(100);
    });
  });

  describe('getBudgetUtilization', () => {
    it('should return per-category utilization', async () => {
      mockPrismaService.categoryBudget.findMany.mockResolvedValue([
        {
          id: 'cb-1',
          month: '2026-02',
          amount: 3000,
          categoryId: 'cat-1',
          familyId: 'family-123',
          category: { id: 'cat-1', name: 'Food', icon: null },
        },
        {
          id: 'cb-2',
          month: '2026-02',
          amount: 2000,
          categoryId: 'cat-2',
          familyId: 'family-123',
          category: { id: 'cat-2', name: 'Transport', icon: null },
        },
      ]);

      mockPrismaService.expense.groupBy.mockResolvedValue([
        { categoryId: 'cat-1', _sum: { amount: 2100 } },
        { categoryId: 'cat-2', _sum: { amount: 1800 } },
      ]);

      const result = await service.getBudgetUtilization(
        'family-123',
        '2026-02',
      );

      expect(result).toEqual({
        month: '2026-02',
        categories: [
          {
            categoryId: 'cat-2',
            name: 'Transport',
            icon: null,
            budgeted: 2000,
            spent: 1800,
            utilizationPercent: 90,
          },
          {
            categoryId: 'cat-1',
            name: 'Food',
            icon: null,
            budgeted: 3000,
            spent: 2100,
            utilizationPercent: 70,
          },
        ],
      });
    });

    it('should return empty when no budgets set', async () => {
      mockPrismaService.categoryBudget.findMany.mockResolvedValue([]);

      const result = await service.getBudgetUtilization(
        'family-123',
        '2026-02',
      );

      expect(result).toEqual({
        month: '2026-02',
        categories: [],
      });
    });
  });

  describe('getCategorySplit', () => {
    it('should return categories with correct percentages', async () => {
      mockPrismaService.expense.groupBy.mockResolvedValue([
        { categoryId: 'cat-1', _sum: { amount: 3000 } },
        { categoryId: 'cat-2', _sum: { amount: 2000 } },
      ]);

      mockPrismaService.category.findMany.mockResolvedValue([
        { id: 'cat-1', name: 'Food', icon: '🍔' },
        { id: 'cat-2', name: 'Transport', icon: '🚗' },
      ]);

      const result = await service.getCategorySplit('family-123', '2026-02');

      expect(result).toEqual({
        month: '2026-02',
        categories: [
          {
            categoryId: 'cat-1',
            name: 'Food',
            icon: '🍔',
            amount: 3000,
            percent: 60,
          },
          {
            categoryId: 'cat-2',
            name: 'Transport',
            icon: '🚗',
            amount: 2000,
            percent: 40,
          },
        ],
      });
    });

    it('should return empty categories when no expenses', async () => {
      mockPrismaService.expense.groupBy.mockResolvedValue([]);

      const result = await service.getCategorySplit('family-123', '2026-02');

      expect(result).toEqual({
        month: '2026-02',
        categories: [],
      });
    });
  });

  describe('getDailySpending', () => {
    it('should return daily spending with correct date format', async () => {
      mockPrismaService.expense.groupBy.mockResolvedValue([
        { date: new Date('2026-02-01T00:00:00.000Z'), _sum: { amount: 500 } },
        { date: new Date('2026-02-03T00:00:00.000Z'), _sum: { amount: 1200 } },
      ]);

      const result = await service.getDailySpending('family-123', '2026-02');

      expect(result).toEqual({
        month: '2026-02',
        days: [
          { date: '2026-02-01', amount: 500 },
          { date: '2026-02-03', amount: 1200 },
        ],
      });
    });
  });

  describe('getMonthlyTrend', () => {
    it('should return correct structure with zero-filled months', async () => {
      mockPrismaService.expense.findMany.mockResolvedValue([]);

      const result = await service.getMonthlyTrend('family-123', 3);

      expect(result.months).toHaveLength(3);
      expect(result.months[0]).toHaveProperty('month');
      expect(result.months[0]).toHaveProperty('amount');
      expect(result.months[0].amount).toBe(0);
    });
  });

  describe('getTopExpenses', () => {
    it('should return top expenses ordered by amount', async () => {
      mockPrismaService.expense.findMany.mockResolvedValue([
        {
          id: 'exp-1',
          amount: 5000,
          description: 'Dinner',
          date: new Date('2026-02-10'),
          categoryId: 'cat-1',
          category: { id: 'cat-1', name: 'Food', icon: null },
          createdById: 'user-1',
          createdBy: {
            id: 'user-1',
            name: 'Alice',
            displayName: 'Ali',
            avatarUrl: null,
          },
        },
      ]);

      const result = await service.getTopExpenses('family-123', '2026-02', 5);

      expect(result.month).toBe('2026-02');
      expect(result.expenses).toHaveLength(1);
      expect(result.expenses[0].amount).toBe(5000);
    });
  });
});
