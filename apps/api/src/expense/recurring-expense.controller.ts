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
import { RecurringExpenseService } from './recurring-expense.service';
import { CreateRecurringExpenseDto } from './dto/create-recurring-expense.dto';
import { UpdateRecurringExpenseDto } from './dto/update-recurring-expense.dto';
import { SessionGuard } from '../auth/guards/session.guard';
import { FamilyGuard } from '../family/guards/family.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequiredFamilyRole } from '../family/decorators/required-family-role.decorator';
import { CurrentFamilyMember } from '../family/decorators/current-family-member.decorator';

@ApiTags('Recurring Expenses')
@ApiBearerAuth()
@Controller('families/:familyId/recurring-expenses')
@UseGuards(SessionGuard)
export class RecurringExpenseController {
  constructor(
    private readonly recurringExpenseService: RecurringExpenseService,
  ) {}

  @Post()
  @UseGuards(FamilyGuard)
  @RequiredFamilyRole(FamilyRole.MEMBER)
  async create(
    @Param('familyId') familyId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateRecurringExpenseDto,
  ) {
    return this.recurringExpenseService.create(familyId, user.id, dto);
  }

  @Get()
  @UseGuards(FamilyGuard)
  @RequiredFamilyRole(FamilyRole.MEMBER)
  async findAll(
    @Param('familyId') familyId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.recurringExpenseService.findAll(familyId, { page, limit });
  }

  @Patch(':id')
  @UseGuards(FamilyGuard)
  @RequiredFamilyRole(FamilyRole.MEMBER)
  async update(
    @Param('familyId') familyId: string,
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @CurrentFamilyMember() member: { role: string },
    @Body() dto: UpdateRecurringExpenseDto,
  ) {
    return this.recurringExpenseService.update(
      id,
      familyId,
      user.id,
      member.role,
      dto,
    );
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
    return this.recurringExpenseService.remove(
      id,
      familyId,
      user.id,
      member.role,
    );
  }
}
