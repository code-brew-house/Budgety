/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
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
  category: {
    select: { id: true, name: true, icon: true },
  },
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
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RecurringExpenseService>(RecurringExpenseService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should set nextDueDate = startDate and truncate amount', async () => {
      const mockResult = {
        id: 're-1',
        amount: 49.99,
        description: 'Netflix',
        frequency: 'MONTHLY',
        startDate: new Date('2026-03-01'),
        endDate: null,
        nextDueDate: new Date('2026-03-01'),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        categoryId: 'cat-1',
        category: { id: 'cat-1', name: 'Entertainment', icon: null },
        createdById: 'user-1',
        createdBy: {
          id: 'user-1',
          name: 'John',
          displayName: null,
          avatarUrl: null,
        },
        familyId: 'family-1',
      };

      mockPrismaService.recurringExpense.create.mockResolvedValue(mockResult);

      const result = await service.create('family-1', 'user-1', {
        amount: 49.999,
        description: 'Netflix',
        frequency: 'MONTHLY' as any,
        startDate: '2026-03-01',
        categoryId: 'cat-1',
      });

      expect(result).toEqual(mockResult);
      expect(prisma.recurringExpense.create).toHaveBeenCalledWith({
        data: {
          amount: 49.99,
          description: 'Netflix',
          frequency: 'MONTHLY',
          startDate: new Date('2026-03-01'),
          endDate: undefined,
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
      const mockData = [
        {
          id: 're-1',
          amount: 49.99,
          description: 'Netflix',
          frequency: 'MONTHLY',
          startDate: new Date('2026-03-01'),
          endDate: null,
          nextDueDate: new Date('2026-03-01'),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          categoryId: 'cat-1',
          category: { id: 'cat-1', name: 'Entertainment', icon: null },
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

      mockPrismaService.recurringExpense.findMany.mockResolvedValue(mockData);
      mockPrismaService.recurringExpense.count.mockResolvedValue(1);

      const result = await service.findAll('family-1', {});

      expect(result).toEqual({
        data: mockData,
        total: 1,
        page: 1,
        limit: 20,
      });
      expect(prisma.recurringExpense.findMany).toHaveBeenCalledWith({
        where: { familyId: 'family-1' },
        select: recurringExpenseSelect,
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
      expect(prisma.recurringExpense.count).toHaveBeenCalledWith({
        where: { familyId: 'family-1' },
      });
    });
  });

  describe('update', () => {
    const mockRecurring = {
      id: 're-1',
      amount: 49.99,
      description: 'Netflix',
      frequency: 'MONTHLY',
      startDate: new Date('2026-03-01'),
      endDate: null,
      nextDueDate: new Date('2026-03-01'),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      categoryId: 'cat-1',
      category: { id: 'cat-1', name: 'Entertainment', icon: null },
      createdById: 'user-1',
      createdBy: {
        id: 'user-1',
        name: 'John',
        displayName: null,
        avatarUrl: null,
      },
      familyId: 'family-1',
    };

    it('should update own recurring expense', async () => {
      const updated = { ...mockRecurring, amount: 59.99 };

      mockPrismaService.recurringExpense.findUnique.mockResolvedValue(
        mockRecurring,
      );
      mockPrismaService.recurringExpense.update.mockResolvedValue(updated);

      const result = await service.update(
        're-1',
        'family-1',
        'user-1',
        'MEMBER',
        { amount: 59.999 },
      );

      expect(result).toEqual(updated);
      expect(prisma.recurringExpense.update).toHaveBeenCalledWith({
        where: { id: 're-1' },
        data: { amount: 59.99 },
        select: recurringExpenseSelect,
      });
    });

    it('should throw ForbiddenException for non-owner non-admin', async () => {
      mockPrismaService.recurringExpense.findUnique.mockResolvedValue(
        mockRecurring,
      );

      await expect(
        service.update('re-1', 'family-1', 'user-999', 'MEMBER', {
          amount: 50,
        }),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.update('re-1', 'family-1', 'user-999', 'MEMBER', {
          amount: 50,
        }),
      ).rejects.toThrow('Only the creator or admin can edit');
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrismaService.recurringExpense.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', 'family-1', 'user-1', 'MEMBER', {
          amount: 50,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    const mockRecurring = {
      id: 're-1',
      amount: 49.99,
      description: 'Netflix',
      frequency: 'MONTHLY',
      startDate: new Date('2026-03-01'),
      endDate: null,
      nextDueDate: new Date('2026-03-01'),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      categoryId: 'cat-1',
      category: { id: 'cat-1', name: 'Entertainment', icon: null },
      createdById: 'user-1',
      createdBy: {
        id: 'user-1',
        name: 'John',
        displayName: null,
        avatarUrl: null,
      },
      familyId: 'family-1',
    };

    it('should delete own recurring expense', async () => {
      mockPrismaService.recurringExpense.findUnique.mockResolvedValue(
        mockRecurring,
      );
      mockPrismaService.recurringExpense.delete.mockResolvedValue(
        mockRecurring,
      );

      await service.remove('re-1', 'family-1', 'user-1', 'MEMBER');

      expect(prisma.recurringExpense.delete).toHaveBeenCalledWith({
        where: { id: 're-1' },
      });
    });

    it('should throw ForbiddenException for non-owner non-admin', async () => {
      mockPrismaService.recurringExpense.findUnique.mockResolvedValue(
        mockRecurring,
      );

      await expect(
        service.remove('re-1', 'family-1', 'user-999', 'MEMBER'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrismaService.recurringExpense.findUnique.mockResolvedValue(null);

      await expect(
        service.remove('nonexistent', 'family-1', 'user-1', 'MEMBER'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('processRecurringExpenses', () => {
    it('should create expenses for due items and advance nextDueDate', async () => {
      const dueItem = {
        id: 're-1',
        amount: 15.99,
        description: 'Spotify',
        frequency: 'MONTHLY',
        startDate: new Date('2026-01-01'),
        endDate: null,
        nextDueDate: new Date('2026-02-01'),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        categoryId: 'cat-1',
        familyId: 'family-1',
        createdById: 'user-1',
      };

      mockPrismaService.recurringExpense.findMany.mockResolvedValue([dueItem]);
      mockPrismaService.expense.create.mockResolvedValue({});
      mockPrismaService.recurringExpense.update.mockResolvedValue({});

      await service.processRecurringExpenses();

      expect(prisma.expense.create).toHaveBeenCalledWith({
        data: {
          amount: 15.99,
          description: 'Spotify',
          date: new Date('2026-02-01'),
          categoryId: 'cat-1',
          familyId: 'family-1',
          createdById: 'user-1',
        },
      });

      expect(prisma.recurringExpense.update).toHaveBeenCalledWith({
        where: { id: 're-1' },
        data: { nextDueDate: new Date('2026-03-01') },
      });
    });
  });
});
