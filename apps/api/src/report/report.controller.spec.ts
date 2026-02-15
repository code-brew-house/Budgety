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

import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { FamilyGuard } from '../family/guards/family.guard';

describe('ReportController', () => {
  let controller: ReportController;
  let service: ReportService;

  const mockReportService = {
    getMemberSpending: jest.fn(),
    getBudgetUtilization: jest.fn(),
    getCategorySplit: jest.fn(),
    getDailySpending: jest.fn(),
    getMonthlyTrend: jest.fn(),
    getTopExpenses: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportController],
      providers: [
        {
          provide: ReportService,
          useValue: mockReportService,
        },
      ],
    })
      .overrideGuard(SessionGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(FamilyGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<ReportController>(ReportController);
    service = module.get<ReportService>(ReportService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /families/:familyId/reports/member-spending', () => {
    it('should call getMemberSpending with correct params', async () => {
      const mockResult = {
        month: '2026-02',
        totalBudget: 10000,
        totalSpent: 6000,
        utilizationPercent: 60,
        members: [],
      };

      mockReportService.getMemberSpending.mockResolvedValue(mockResult);

      const result = await controller.getMemberSpending(
        'family-123',
        '2026-02',
      );

      expect(result).toEqual(mockResult);
      expect(service.getMemberSpending).toHaveBeenCalledWith(
        'family-123',
        '2026-02',
      );
    });
  });

  describe('GET /families/:familyId/reports/budget-utilization', () => {
    it('should call getBudgetUtilization with correct params', async () => {
      const mockResult = {
        month: '2026-02',
        categories: [],
      };

      mockReportService.getBudgetUtilization.mockResolvedValue(mockResult);

      const result = await controller.getBudgetUtilization(
        'family-123',
        '2026-02',
      );

      expect(result).toEqual(mockResult);
      expect(service.getBudgetUtilization).toHaveBeenCalledWith(
        'family-123',
        '2026-02',
      );
    });
  });

  describe('GET /families/:familyId/reports/category-split', () => {
    it('should call getCategorySplit with correct params', async () => {
      const mockResult = { month: '2026-02', categories: [] };
      mockReportService.getCategorySplit.mockResolvedValue(mockResult);

      const result = await controller.getCategorySplit('family-123', '2026-02');

      expect(result).toEqual(mockResult);
      expect(service.getCategorySplit).toHaveBeenCalledWith(
        'family-123',
        '2026-02',
      );
    });
  });

  describe('GET /families/:familyId/reports/daily-spending', () => {
    it('should call getDailySpending with correct params', async () => {
      const mockResult = { month: '2026-02', days: [] };
      mockReportService.getDailySpending.mockResolvedValue(mockResult);

      const result = await controller.getDailySpending('family-123', '2026-02');

      expect(result).toEqual(mockResult);
      expect(service.getDailySpending).toHaveBeenCalledWith(
        'family-123',
        '2026-02',
      );
    });
  });

  describe('GET /families/:familyId/reports/monthly-trend', () => {
    it('should call getMonthlyTrend with correct params', async () => {
      const mockResult = { months: [] };
      mockReportService.getMonthlyTrend.mockResolvedValue(mockResult);

      const result = await controller.getMonthlyTrend('family-123', '6');

      expect(result).toEqual(mockResult);
      expect(service.getMonthlyTrend).toHaveBeenCalledWith('family-123', 6);
    });

    it('should default to 6 months when not provided', async () => {
      const mockResult = { months: [] };
      mockReportService.getMonthlyTrend.mockResolvedValue(mockResult);

      await controller.getMonthlyTrend('family-123', '');

      expect(service.getMonthlyTrend).toHaveBeenCalledWith('family-123', 6);
    });
  });

  describe('GET /families/:familyId/reports/top-expenses', () => {
    it('should call getTopExpenses with correct params', async () => {
      const mockResult = { month: '2026-02', expenses: [] };
      mockReportService.getTopExpenses.mockResolvedValue(mockResult);

      const result = await controller.getTopExpenses(
        'family-123',
        '2026-02',
        '5',
      );

      expect(result).toEqual(mockResult);
      expect(service.getTopExpenses).toHaveBeenCalledWith(
        'family-123',
        '2026-02',
        5,
      );
    });

    it('should default to 10 when limit not provided', async () => {
      const mockResult = { month: '2026-02', expenses: [] };
      mockReportService.getTopExpenses.mockResolvedValue(mockResult);

      await controller.getTopExpenses('family-123', '2026-02', '');

      expect(service.getTopExpenses).toHaveBeenCalledWith(
        'family-123',
        '2026-02',
        10,
      );
    });
  });
});
