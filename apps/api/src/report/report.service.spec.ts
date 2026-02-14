/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ReportService } from './report.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ReportService', () => {
  let service: ReportService;
  let prisma: PrismaService;

  const mockPrismaService = {
    family: { findUnique: jest.fn() },
    expense: { groupBy: jest.fn() },
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
});
