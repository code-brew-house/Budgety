/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';

jest.mock('better-auth', () => ({
  betterAuth: jest.fn(),
}));

jest.mock('better-auth/adapters/prisma', () => ({
  prismaAdapter: jest.fn(),
}));

jest.mock('better-auth/node', () => ({
  fromNodeHeaders: jest.fn(),
}));

import { BudgetController } from './budget.controller';
import { BudgetService } from './budget.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { FamilyGuard } from '../family/guards/family.guard';
import { SetOverallBudgetDto } from './dto/set-overall-budget.dto';
import { UpsertCategoryBudgetsDto } from './dto/upsert-category-budgets.dto';

describe('BudgetController', () => {
  let controller: BudgetController;
  let service: BudgetService;

  const mockBudgetService = {
    getBudgets: jest.fn(),
    setOverallBudget: jest.fn(),
    upsertCategoryBudgets: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BudgetController],
      providers: [
        {
          provide: BudgetService,
          useValue: mockBudgetService,
        },
      ],
    })
      .overrideGuard(SessionGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(FamilyGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<BudgetController>(BudgetController);
    service = module.get<BudgetService>(BudgetService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /families/:familyId/budgets', () => {
    it('should return budgets for the given month', async () => {
      const mockResult = {
        monthlyBudget: 5000,
        categoryBudgets: [
          {
            id: 'cb-1',
            month: '2026-02',
            amount: 2000,
            categoryId: 'cat-1',
            category: { id: 'cat-1', name: 'Food', icon: null },
          },
        ],
      };

      mockBudgetService.getBudgets.mockResolvedValue(mockResult);

      const result = await controller.getBudgets('family-123', '2026-02');

      expect(result).toEqual(mockResult);
      expect(service.getBudgets).toHaveBeenCalledWith('family-123', '2026-02');
    });
  });

  describe('PUT /families/:familyId/budgets', () => {
    it('should set the overall budget', async () => {
      const dto: SetOverallBudgetDto = { monthlyBudget: 5000 };
      const mockFamily = {
        id: 'family-123',
        name: 'Test Family',
        currency: 'INR',
        monthlyBudget: 5000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockBudgetService.setOverallBudget.mockResolvedValue(mockFamily);

      const result = await controller.setOverallBudget('family-123', dto);

      expect(result).toEqual(mockFamily);
      expect(service.setOverallBudget).toHaveBeenCalledWith('family-123', 5000);
    });
  });

  describe('PUT /families/:familyId/budgets/categories', () => {
    it('should upsert category budgets', async () => {
      const dto: UpsertCategoryBudgetsDto = {
        month: '2026-02',
        budgets: [
          { categoryId: 'cat-1', amount: 2000 },
          { categoryId: 'cat-2', amount: 1000 },
        ],
      };

      const mockUpserted = [
        {
          id: 'cb-1',
          month: '2026-02',
          amount: 2000,
          familyId: 'family-123',
          categoryId: 'cat-1',
        },
        {
          id: 'cb-2',
          month: '2026-02',
          amount: 1000,
          familyId: 'family-123',
          categoryId: 'cat-2',
        },
      ];

      mockBudgetService.upsertCategoryBudgets.mockResolvedValue(mockUpserted);

      const result = await controller.upsertCategoryBudgets('family-123', dto);

      expect(result).toEqual(mockUpserted);
      expect(service.upsertCategoryBudgets).toHaveBeenCalledWith(
        'family-123',
        '2026-02',
        dto.budgets,
      );
    });
  });
});
