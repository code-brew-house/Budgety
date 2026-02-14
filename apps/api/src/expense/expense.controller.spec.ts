/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';

jest.mock('better-auth', () => ({
  betterAuth: jest.fn(),
}));

jest.mock('better-auth/adapters/prisma', () => ({
  prismaAdapter: jest.fn(),
}));

jest.mock('better-auth/node', () => ({
  fromNodeHeaders: jest.fn(),
}));

import { ExpenseController } from './expense.controller';
import { ExpenseService } from './expense.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { FamilyGuard } from '../family/guards/family.guard';

describe('ExpenseController', () => {
  let controller: ExpenseController;
  let service: ExpenseService;

  const mockExpenseService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockUser = { id: 'user-123' };
  const mockMember = { role: 'MEMBER' };
  const familyId = 'family-456';

  const mockExpense = {
    id: 'expense-789',
    amount: 42.5,
    description: 'Groceries',
    date: new Date('2026-02-14'),
    createdAt: new Date(),
    updatedAt: new Date(),
    categoryId: 'cat-1',
    category: { id: 'cat-1', name: 'Food', icon: 'utensils' },
    createdById: 'user-123',
    createdBy: {
      id: 'user-123',
      name: 'John',
      displayName: null,
      avatarUrl: null,
    },
    familyId: 'family-456',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExpenseController],
      providers: [
        {
          provide: ExpenseService,
          useValue: mockExpenseService,
        },
      ],
    })
      .overrideGuard(SessionGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(FamilyGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<ExpenseController>(ExpenseController);
    service = module.get<ExpenseService>(ExpenseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an expense and return it', async () => {
      const dto: CreateExpenseDto = {
        amount: 42.5,
        description: 'Groceries',
        date: '2026-02-14',
        categoryId: 'cat-1',
      };

      mockExpenseService.create.mockResolvedValue(mockExpense);

      const result = await controller.create(familyId, mockUser, dto);

      expect(result).toEqual(mockExpense);
      expect(service.create).toHaveBeenCalledWith(familyId, 'user-123', dto);
    });
  });

  describe('findAll', () => {
    it('should return paginated expenses', async () => {
      const query: QueryExpensesDto = { page: 1, limit: 20 };
      const paginatedResult = {
        data: [mockExpense],
        total: 1,
        page: 1,
        limit: 20,
      };

      mockExpenseService.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll(familyId, query);

      expect(result).toEqual(paginatedResult);
      expect(service.findAll).toHaveBeenCalledWith(familyId, query);
    });
  });

  describe('findOne', () => {
    it('should return a single expense', async () => {
      mockExpenseService.findOne.mockResolvedValue(mockExpense);

      const result = await controller.findOne(familyId, 'expense-789');

      expect(result).toEqual(mockExpense);
      expect(service.findOne).toHaveBeenCalledWith('expense-789', familyId);
    });
  });

  describe('update', () => {
    it('should update an expense with user id and member role', async () => {
      const dto: UpdateExpenseDto = { description: 'Updated groceries' };
      const updatedExpense = { ...mockExpense, description: 'Updated groceries' };

      mockExpenseService.update.mockResolvedValue(updatedExpense);

      const result = await controller.update(
        familyId,
        'expense-789',
        mockUser,
        mockMember,
        dto,
      );

      expect(result).toEqual(updatedExpense);
      expect(service.update).toHaveBeenCalledWith(
        'expense-789',
        familyId,
        'user-123',
        'MEMBER',
        dto,
      );
    });
  });

  describe('remove', () => {
    it('should remove an expense with user id and member role', async () => {
      mockExpenseService.remove.mockResolvedValue(mockExpense);

      const result = await controller.remove(
        familyId,
        'expense-789',
        mockUser,
        mockMember,
      );

      expect(result).toEqual(mockExpense);
      expect(service.remove).toHaveBeenCalledWith(
        'expense-789',
        familyId,
        'user-123',
        'MEMBER',
      );
    });
  });
});
