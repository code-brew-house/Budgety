/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ExpenseService } from './expense.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

const expenseSelect = {
  id: true,
  amount: true,
  description: true,
  date: true,
  createdAt: true,
  updatedAt: true,
  categoryId: true,
  category: {
    select: { id: true, name: true, icon: true },
  },
  createdById: true,
  createdBy: {
    select: { id: true, name: true, displayName: true, avatarUrl: true },
  },
  familyId: true,
};

describe('ExpenseService', () => {
  let service: ExpenseService;
  let prisma: PrismaService;

  const mockPrismaService = {
    expense: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockNotificationService = {
    notifyFamilyMembers: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpenseService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    service = module.get<ExpenseService>(ExpenseService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create expense with truncated amount', async () => {
      const mockExpense = {
        id: 'expense-1',
        amount: 29.99,
        description: 'Groceries',
        date: new Date('2026-02-14'),
        createdAt: new Date(),
        updatedAt: new Date(),
        categoryId: 'cat-1',
        category: { id: 'cat-1', name: 'Food', icon: null },
        createdById: 'user-1',
        createdBy: {
          id: 'user-1',
          name: 'John',
          displayName: null,
          avatarUrl: null,
        },
        familyId: 'family-1',
      };

      mockPrismaService.expense.create.mockResolvedValue(mockExpense);

      const result = await service.create('family-1', 'user-1', {
        amount: 29.999,
        description: 'Groceries',
        date: '2026-02-14',
        categoryId: 'cat-1',
      });

      expect(result).toEqual(mockExpense);
      expect(prisma.expense.create).toHaveBeenCalledWith({
        data: {
          amount: 29.99,
          description: 'Groceries',
          date: new Date('2026-02-14'),
          categoryId: 'cat-1',
          familyId: 'family-1',
          createdById: 'user-1',
        },
        select: expenseSelect,
      });
    });
  });

  describe('findAll', () => {
    const mockExpenses = [
      {
        id: 'expense-1',
        amount: 29.99,
        description: 'Groceries',
        date: new Date('2026-02-14'),
        createdAt: new Date(),
        updatedAt: new Date(),
        categoryId: 'cat-1',
        category: { id: 'cat-1', name: 'Food', icon: null },
        createdById: 'user-1',
        createdBy: {
          id: 'user-1',
          name: 'John',
          displayName: null,
          avatarUrl: null,
        },
        familyId: 'family-1',
      },
    ];

    it('should return paginated results with total', async () => {
      mockPrismaService.expense.findMany.mockResolvedValue(mockExpenses);
      mockPrismaService.expense.count.mockResolvedValue(1);

      const result = await service.findAll('family-1', {});

      expect(result).toEqual({
        data: mockExpenses,
        total: 1,
        page: 1,
        limit: 20,
      });
      expect(prisma.expense.findMany).toHaveBeenCalledWith({
        where: { familyId: 'family-1' },
        select: expenseSelect,
        orderBy: { date: 'desc' },
        skip: 0,
        take: 20,
      });
      expect(prisma.expense.count).toHaveBeenCalledWith({
        where: { familyId: 'family-1' },
      });
    });

    it('should apply date filters', async () => {
      mockPrismaService.expense.findMany.mockResolvedValue(mockExpenses);
      mockPrismaService.expense.count.mockResolvedValue(1);

      await service.findAll('family-1', {
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      });

      expect(prisma.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            familyId: 'family-1',
            date: {
              gte: new Date('2026-02-01'),
              lte: new Date('2026-02-28'),
            },
          },
        }),
      );
    });

    it('should sort by createdAt when specified', async () => {
      mockPrismaService.expense.findMany.mockResolvedValue(mockExpenses);
      mockPrismaService.expense.count.mockResolvedValue(1);

      await service.findAll('family-1', { sort: 'createdAt' });

      expect(prisma.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should sort by date by default', async () => {
      mockPrismaService.expense.findMany.mockResolvedValue(mockExpenses);
      mockPrismaService.expense.count.mockResolvedValue(1);

      await service.findAll('family-1', {});

      expect(prisma.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { date: 'desc' },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return expense', async () => {
      const mockExpense = {
        id: 'expense-1',
        amount: 29.99,
        description: 'Groceries',
        date: new Date('2026-02-14'),
        createdAt: new Date(),
        updatedAt: new Date(),
        categoryId: 'cat-1',
        category: { id: 'cat-1', name: 'Food', icon: null },
        createdById: 'user-1',
        createdBy: {
          id: 'user-1',
          name: 'John',
          displayName: null,
          avatarUrl: null,
        },
        familyId: 'family-1',
      };

      mockPrismaService.expense.findUnique.mockResolvedValue(mockExpense);

      const result = await service.findOne('expense-1', 'family-1');

      expect(result).toEqual(mockExpense);
      expect(prisma.expense.findUnique).toHaveBeenCalledWith({
        where: { id: 'expense-1' },
        select: expenseSelect,
      });
    });

    it('should throw NotFoundException when expense not found', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent', 'family-1')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('nonexistent', 'family-1')).rejects.toThrow(
        'Expense not found',
      );
    });
  });

  describe('update', () => {
    const mockExpense = {
      id: 'expense-1',
      amount: 29.99,
      description: 'Groceries',
      date: new Date('2026-02-14'),
      createdAt: new Date(),
      updatedAt: new Date(),
      categoryId: 'cat-1',
      category: { id: 'cat-1', name: 'Food', icon: null },
      createdById: 'user-1',
      createdBy: {
        id: 'user-1',
        name: 'John',
        displayName: null,
        avatarUrl: null,
      },
      familyId: 'family-1',
    };

    it('should update own expense', async () => {
      const updatedExpense = { ...mockExpense, amount: 35.5 };

      mockPrismaService.expense.findUnique.mockResolvedValue(mockExpense);
      mockPrismaService.expense.update.mockResolvedValue(updatedExpense);

      const result = await service.update(
        'expense-1',
        'family-1',
        'user-1',
        'MEMBER',
        { amount: 35.555 },
      );

      expect(result).toEqual(updatedExpense);
      expect(prisma.expense.update).toHaveBeenCalledWith({
        where: { id: 'expense-1' },
        data: { amount: 35.55 },
        select: expenseSelect,
      });
    });

    it('should allow admin to update any expense', async () => {
      const updatedExpense = { ...mockExpense, description: 'Updated' };

      mockPrismaService.expense.findUnique.mockResolvedValue(mockExpense);
      mockPrismaService.expense.update.mockResolvedValue(updatedExpense);

      const result = await service.update(
        'expense-1',
        'family-1',
        'user-999',
        'ADMIN',
        { description: 'Updated' },
      );

      expect(result).toEqual(updatedExpense);
    });

    it('should throw ForbiddenException for non-owner non-admin', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(mockExpense);

      await expect(
        service.update('expense-1', 'family-1', 'user-999', 'MEMBER', {
          amount: 50,
        }),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.update('expense-1', 'family-1', 'user-999', 'MEMBER', {
          amount: 50,
        }),
      ).rejects.toThrow('Only the creator or admin can edit');
    });

    it('should throw NotFoundException when expense not found', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', 'family-1', 'user-1', 'MEMBER', {
          amount: 50,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    const mockExpense = {
      id: 'expense-1',
      amount: 29.99,
      description: 'Groceries',
      date: new Date('2026-02-14'),
      createdAt: new Date(),
      updatedAt: new Date(),
      categoryId: 'cat-1',
      category: { id: 'cat-1', name: 'Food', icon: null },
      createdById: 'user-1',
      createdBy: {
        id: 'user-1',
        name: 'John',
        displayName: null,
        avatarUrl: null,
      },
      familyId: 'family-1',
    };

    it('should remove own expense', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(mockExpense);
      mockPrismaService.expense.delete.mockResolvedValue(mockExpense);

      await service.remove('expense-1', 'family-1', 'user-1', 'MEMBER');

      expect(prisma.expense.delete).toHaveBeenCalledWith({
        where: { id: 'expense-1' },
      });
    });

    it('should throw ForbiddenException for non-owner non-admin', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(mockExpense);

      await expect(
        service.remove('expense-1', 'family-1', 'user-999', 'MEMBER'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when expense not found', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(null);

      await expect(
        service.remove('nonexistent', 'family-1', 'user-1', 'MEMBER'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
