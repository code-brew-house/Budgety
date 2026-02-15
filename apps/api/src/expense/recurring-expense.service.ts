import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecurringExpenseDto } from './dto/create-recurring-expense.dto';
import { UpdateRecurringExpenseDto } from './dto/update-recurring-expense.dto';

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
} satisfies Prisma.RecurringExpenseSelect;

@Injectable()
export class RecurringExpenseService {
  private readonly logger = new Logger(RecurringExpenseService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(
    familyId: string,
    userId: string,
    dto: CreateRecurringExpenseDto,
  ) {
    return this.prisma.recurringExpense.create({
      data: {
        amount: Math.trunc(dto.amount * 100) / 100,
        description: dto.description,
        frequency: dto.frequency,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        nextDueDate: new Date(dto.startDate),
        categoryId: dto.categoryId,
        familyId,
        createdById: userId,
      },
      select: recurringExpenseSelect,
    });
  }

  async findAll(familyId: string, query: { page?: number; limit?: number }) {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const where: Prisma.RecurringExpenseWhereInput = { familyId };

    const [data, total] = await Promise.all([
      this.prisma.recurringExpense.findMany({
        where,
        select: recurringExpenseSelect,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.recurringExpense.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async update(
    id: string,
    familyId: string,
    userId: string,
    userRole: string,
    dto: UpdateRecurringExpenseDto,
  ) {
    const recurringExpense = await this.prisma.recurringExpense.findUnique({
      where: { id },
      select: recurringExpenseSelect,
    });

    if (!recurringExpense || recurringExpense.familyId !== familyId) {
      throw new NotFoundException('Recurring expense not found');
    }

    if (recurringExpense.createdById !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('Only the creator or admin can edit');
    }

    const data: Prisma.RecurringExpenseUpdateInput = {};
    if (dto.amount != null) {
      data.amount = Math.trunc(dto.amount * 100) / 100;
    }
    if (dto.description != null) {
      data.description = dto.description;
    }
    if (dto.frequency != null) {
      data.frequency = dto.frequency;
    }
    if (dto.endDate != null) {
      data.endDate = new Date(dto.endDate);
    }
    if (dto.categoryId != null) {
      data.category = { connect: { id: dto.categoryId } };
    }
    if (dto.isActive != null) {
      data.isActive = dto.isActive;
    }

    return this.prisma.recurringExpense.update({
      where: { id },
      data,
      select: recurringExpenseSelect,
    });
  }

  async remove(
    id: string,
    familyId: string,
    userId: string,
    userRole: string,
  ) {
    const recurringExpense = await this.prisma.recurringExpense.findUnique({
      where: { id },
      select: recurringExpenseSelect,
    });

    if (!recurringExpense || recurringExpense.familyId !== familyId) {
      throw new NotFoundException('Recurring expense not found');
    }

    if (recurringExpense.createdById !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('Only the creator or admin can edit');
    }

    return this.prisma.recurringExpense.delete({
      where: { id },
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async processRecurringExpenses() {
    const now = new Date();

    const dueExpenses = await this.prisma.recurringExpense.findMany({
      where: {
        isActive: true,
        nextDueDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
    });

    this.logger.log(
      `Processing ${dueExpenses.length} recurring expense(s)...`,
    );

    for (const re of dueExpenses) {
      try {
        await this.prisma.expense.create({
          data: {
            amount: re.amount,
            description: re.description,
            date: re.nextDueDate,
            categoryId: re.categoryId,
            familyId: re.familyId,
            createdById: re.createdById,
          },
        });

        const nextDueDate = this.advanceDate(re.nextDueDate, re.frequency);

        await this.prisma.recurringExpense.update({
          where: { id: re.id },
          data: { nextDueDate },
        });

        this.logger.log(
          `Created expense for recurring "${re.description}" (next: ${nextDueDate.toISOString()})`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to process recurring expense ${re.id}: ${error}`,
        );
      }
    }
  }

  private advanceDate(
    date: Date,
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY',
  ): Date {
    const next = new Date(date);
    switch (frequency) {
      case 'DAILY':
        next.setDate(next.getDate() + 1);
        break;
      case 'WEEKLY':
        next.setDate(next.getDate() + 7);
        break;
      case 'MONTHLY':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'YEARLY':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }
    return next;
  }
}
