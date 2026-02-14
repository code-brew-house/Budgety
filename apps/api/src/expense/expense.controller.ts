import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FamilyRole } from '@prisma/client';
import { ExpenseService } from './expense.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';
import { SessionGuard } from '../auth/guards/session.guard';
import { FamilyGuard } from '../family/guards/family.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequiredFamilyRole } from '../family/decorators/required-family-role.decorator';
import { CurrentFamilyMember } from '../family/decorators/current-family-member.decorator';

@ApiTags('Expense')
@ApiBearerAuth()
@Controller('families/:familyId/expenses')
@UseGuards(SessionGuard)
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Post()
  @UseGuards(FamilyGuard)
  @RequiredFamilyRole(FamilyRole.MEMBER)
  async create(
    @Param('familyId') familyId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateExpenseDto,
  ) {
    return this.expenseService.create(familyId, user.id, dto);
  }

  @Get()
  @UseGuards(FamilyGuard)
  @RequiredFamilyRole(FamilyRole.MEMBER)
  async findAll(
    @Param('familyId') familyId: string,
    @Query() query: QueryExpensesDto,
  ) {
    return this.expenseService.findAll(familyId, query);
  }

  @Get(':id')
  @UseGuards(FamilyGuard)
  @RequiredFamilyRole(FamilyRole.MEMBER)
  async findOne(
    @Param('familyId') familyId: string,
    @Param('id') id: string,
  ) {
    return this.expenseService.findOne(id, familyId);
  }

  @Patch(':id')
  @UseGuards(FamilyGuard)
  @RequiredFamilyRole(FamilyRole.MEMBER)
  async update(
    @Param('familyId') familyId: string,
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @CurrentFamilyMember() member: { role: string },
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expenseService.update(id, familyId, user.id, member.role, dto);
  }

  @Delete(':id')
  @UseGuards(FamilyGuard)
  @RequiredFamilyRole(FamilyRole.MEMBER)
  async remove(
    @Param('familyId') familyId: string,
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @CurrentFamilyMember() member: { role: string },
  ) {
    return this.expenseService.remove(id, familyId, user.id, member.role);
  }
}
