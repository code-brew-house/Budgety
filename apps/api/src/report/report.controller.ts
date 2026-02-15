import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FamilyRole } from '@prisma/client';
import { ReportService } from './report.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { FamilyGuard } from '../family/guards/family.guard';
import { RequiredFamilyRole } from '../family/decorators/required-family-role.decorator';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('families/:familyId/reports')
@UseGuards(SessionGuard)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('member-spending')
  @UseGuards(FamilyGuard)
  @RequiredFamilyRole(FamilyRole.MEMBER)
  async getMemberSpending(
    @Param('familyId') familyId: string,
    @Query('month') month: string,
  ) {
    return this.reportService.getMemberSpending(familyId, month);
  }

  @Get('budget-utilization')
  @UseGuards(FamilyGuard)
  @RequiredFamilyRole(FamilyRole.MEMBER)
  async getBudgetUtilization(
    @Param('familyId') familyId: string,
    @Query('month') month: string,
  ) {
    return this.reportService.getBudgetUtilization(familyId, month);
  }

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
    return this.reportService.getMonthlyTrend(familyId, Number(months) || 6);
  }

  @Get('top-expenses')
  @UseGuards(FamilyGuard)
  @RequiredFamilyRole(FamilyRole.MEMBER)
  async getTopExpenses(
    @Param('familyId') familyId: string,
    @Query('month') month: string,
    @Query('limit') limit: string,
  ) {
    return this.reportService.getTopExpenses(
      familyId,
      month,
      Number(limit) || 5,
    );
  }
}
