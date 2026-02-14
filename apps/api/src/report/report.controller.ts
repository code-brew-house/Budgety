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
}
