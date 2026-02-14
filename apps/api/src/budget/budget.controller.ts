import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FamilyRole } from '@prisma/client';
import { BudgetService } from './budget.service';
import { SetOverallBudgetDto } from './dto/set-overall-budget.dto';
import { UpsertCategoryBudgetsDto } from './dto/upsert-category-budgets.dto';
import { SessionGuard } from '../auth/guards/session.guard';
import { FamilyGuard } from '../family/guards/family.guard';
import { RequiredFamilyRole } from '../family/decorators/required-family-role.decorator';

@ApiTags('Budget')
@ApiBearerAuth()
@Controller('families/:familyId/budgets')
@UseGuards(SessionGuard)
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Get()
  @UseGuards(FamilyGuard)
  @RequiredFamilyRole(FamilyRole.MEMBER)
  async getBudgets(
    @Param('familyId') familyId: string,
    @Query('month') month: string,
  ) {
    return this.budgetService.getBudgets(familyId, month);
  }

  @Put()
  @UseGuards(FamilyGuard)
  @RequiredFamilyRole(FamilyRole.ADMIN)
  async setOverallBudget(
    @Param('familyId') familyId: string,
    @Body() dto: SetOverallBudgetDto,
  ) {
    return this.budgetService.setOverallBudget(familyId, dto.monthlyBudget);
  }

  @Put('categories')
  @UseGuards(FamilyGuard)
  @RequiredFamilyRole(FamilyRole.ADMIN)
  async upsertCategoryBudgets(
    @Param('familyId') familyId: string,
    @Body() dto: UpsertCategoryBudgetsDto,
  ) {
    return this.budgetService.upsertCategoryBudgets(
      familyId,
      dto.month,
      dto.budgets,
    );
  }
}
