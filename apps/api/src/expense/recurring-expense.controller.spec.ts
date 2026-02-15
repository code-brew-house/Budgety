/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { CreateRecurringExpenseDto } from './dto/create-recurring-expense.dto';
import { UpdateRecurringExpenseDto } from './dto/update-recurring-expense.dto';

jest.mock('better-auth', () => ({
  betterAuth: jest.fn(),
}));

jest.mock('better-auth/adapters/prisma', () => ({
  prismaAdapter: jest.fn(),
}));

jest.mock('better-auth/node', () => ({
  fromNodeHeaders: jest.fn(),
}));

import { RecurringExpenseController } from './recurring-expense.controller';
import { RecurringExpenseService } from './recurring-expense.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { FamilyGuard } from '../family/guards/family.guard';

describe('RecurringExpenseController', () => {
  let controller: RecurringExpenseController;
  let service: RecurringExpenseService;

  const mockRecurringExpenseService = {
    create: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockUser = { id: 'user-123' };
  const mockMember = { role: 'MEMBER' };
  const familyId = 'family-456';

  const mockRecurringExpense = {
    id: 'rec-789',
    amount: 15.0,
    description: 'Netflix',
    frequency: 'MONTHLY',
    startDate: new Date('2026-02-01'),
    endDate: null,
    nextDueDate: new Date('2026-03-01'),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    categoryId: 'cat-1',
    category: { id: 'cat-1', name: 'Entertainment', icon: 'tv' },
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
      controllers: [RecurringExpenseController],
      providers: [
        {
          provide: RecurringExpenseService,
          useValue: mockRecurringExpenseService,
        },
      ],
    })
      .overrideGuard(SessionGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(FamilyGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<RecurringExpenseController>(
      RecurringExpenseController,
    );
    service = module.get<RecurringExpenseService>(RecurringExpenseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a recurring expense and return it', async () => {
      const dto: CreateRecurringExpenseDto = {
        amount: 15.0,
        description: 'Netflix',
        frequency: 'MONTHLY' as any,
        startDate: '2026-02-01',
        categoryId: 'cat-1',
      };

      mockRecurringExpenseService.create.mockResolvedValue(
        mockRecurringExpense,
      );

      const result = await controller.create(familyId, mockUser, dto);

      expect(result).toEqual(mockRecurringExpense);
      expect(service.create).toHaveBeenCalledWith(familyId, 'user-123', dto);
    });
  });

  describe('findAll', () => {
    it('should return paginated recurring expenses', async () => {
      const paginatedResult = {
        data: [mockRecurringExpense],
        total: 1,
        page: 1,
        limit: 20,
      };

      mockRecurringExpenseService.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll(familyId, 1, 20);

      expect(result).toEqual(paginatedResult);
      expect(service.findAll).toHaveBeenCalledWith(familyId, {
        page: 1,
        limit: 20,
      });
    });

    it('should use default pagination when no params provided', async () => {
      const paginatedResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      };

      mockRecurringExpenseService.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll(familyId);

      expect(result).toEqual(paginatedResult);
      expect(service.findAll).toHaveBeenCalledWith(familyId, {
        page: undefined,
        limit: undefined,
      });
    });
  });

  describe('update', () => {
    it('should update a recurring expense with user id and member role', async () => {
      const dto: UpdateRecurringExpenseDto = { description: 'Disney+' };
      const updatedExpense = {
        ...mockRecurringExpense,
        description: 'Disney+',
      };

      mockRecurringExpenseService.update.mockResolvedValue(updatedExpense);

      const result = await controller.update(
        familyId,
        'rec-789',
        mockUser,
        mockMember,
        dto,
      );

      expect(result).toEqual(updatedExpense);
      expect(service.update).toHaveBeenCalledWith(
        'rec-789',
        familyId,
        'user-123',
        'MEMBER',
        dto,
      );
    });
  });

  describe('remove', () => {
    it('should remove a recurring expense with user id and member role', async () => {
      mockRecurringExpenseService.remove.mockResolvedValue(
        mockRecurringExpense,
      );

      const result = await controller.remove(
        familyId,
        'rec-789',
        mockUser,
        mockMember,
      );

      expect(result).toEqual(mockRecurringExpense);
      expect(service.remove).toHaveBeenCalledWith(
        'rec-789',
        familyId,
        'user-123',
        'MEMBER',
      );
    });
  });
});
