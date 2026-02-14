/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { BudgetService } from './budget.service';
import { PrismaService } from '../prisma/prisma.service';

describe('BudgetService', () => {
  let service: BudgetService;
  let prisma: PrismaService;

  const mockPrismaService = {
    family: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    categoryBudget: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<BudgetService>(BudgetService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBudgets', () => {
    it('should return monthlyBudget and category budgets for the month', async () => {
      const mockFamily = { monthlyBudget: 5000 };
      const mockCategoryBudgets = [
        {
          id: 'cb-1',
          month: '2026-02',
          amount: 2000,
          categoryId: 'cat-1',
          category: { id: 'cat-1', name: 'Food', icon: null },
        },
        {
          id: 'cb-2',
          month: '2026-02',
          amount: 1000,
          categoryId: 'cat-2',
          category: { id: 'cat-2', name: 'Transport', icon: null },
        },
      ];

      mockPrismaService.family.findUnique.mockResolvedValue(mockFamily);
      mockPrismaService.categoryBudget.findMany.mockResolvedValue(
        mockCategoryBudgets,
      );

      const result = await service.getBudgets('family-123', '2026-02');

      expect(result).toEqual({
        monthlyBudget: 5000,
        categoryBudgets: mockCategoryBudgets,
      });
      expect(prisma.family.findUnique).toHaveBeenCalledWith({
        where: { id: 'family-123' },
        select: { monthlyBudget: true },
      });
      expect(prisma.categoryBudget.findMany).toHaveBeenCalledWith({
        where: { familyId: 'family-123', month: '2026-02' },
        select: {
          id: true,
          month: true,
          amount: true,
          categoryId: true,
          category: {
            select: { id: true, name: true, icon: true },
          },
        },
      });
    });

    it('should return null monthlyBudget when family has none set', async () => {
      mockPrismaService.family.findUnique.mockResolvedValue({
        monthlyBudget: null,
      });
      mockPrismaService.categoryBudget.findMany.mockResolvedValue([]);

      const result = await service.getBudgets('family-123', '2026-02');

      expect(result.monthlyBudget).toBeNull();
      expect(result.categoryBudgets).toEqual([]);
    });
  });

  describe('setOverallBudget', () => {
    it('should update family with truncated amount', async () => {
      const mockUpdatedFamily = {
        id: 'family-123',
        name: 'Test Family',
        currency: 'INR',
        monthlyBudget: 5000.12,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.family.update.mockResolvedValue(mockUpdatedFamily);

      const result = await service.setOverallBudget('family-123', 5000.129);

      expect(result).toEqual(mockUpdatedFamily);
      expect(prisma.family.update).toHaveBeenCalledWith({
        where: { id: 'family-123' },
        data: { monthlyBudget: 5000.12 },
        select: {
          id: true,
          name: true,
          currency: true,
          monthlyBudget: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });
  });

  describe('upsertCategoryBudgets', () => {
    it('should upsert each budget entry with truncation', async () => {
      const budgets = [
        { categoryId: 'cat-1', amount: 2000.999 },
        { categoryId: 'cat-2', amount: 1000.555 },
      ];

      const mockUpserted1 = {
        id: 'cb-1',
        month: '2026-02',
        amount: 2000.99,
        familyId: 'family-123',
        categoryId: 'cat-1',
      };

      const mockUpserted2 = {
        id: 'cb-2',
        month: '2026-02',
        amount: 1000.55,
        familyId: 'family-123',
        categoryId: 'cat-2',
      };

      mockPrismaService.categoryBudget.upsert
        .mockResolvedValueOnce(mockUpserted1)
        .mockResolvedValueOnce(mockUpserted2);

      const result = await service.upsertCategoryBudgets(
        'family-123',
        '2026-02',
        budgets,
      );

      expect(result).toEqual([mockUpserted1, mockUpserted2]);
      expect(prisma.categoryBudget.upsert).toHaveBeenCalledTimes(2);
      expect(prisma.categoryBudget.upsert).toHaveBeenCalledWith({
        where: {
          familyId_categoryId_month: {
            familyId: 'family-123',
            categoryId: 'cat-1',
            month: '2026-02',
          },
        },
        update: { amount: 2000.99 },
        create: {
          familyId: 'family-123',
          categoryId: 'cat-1',
          month: '2026-02',
          amount: 2000.99,
        },
      });
      expect(prisma.categoryBudget.upsert).toHaveBeenCalledWith({
        where: {
          familyId_categoryId_month: {
            familyId: 'family-123',
            categoryId: 'cat-2',
            month: '2026-02',
          },
        },
        update: { amount: 1000.55 },
        create: {
          familyId: 'family-123',
          categoryId: 'cat-2',
          month: '2026-02',
          amount: 1000.55,
        },
      });
    });
  });
});
