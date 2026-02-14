import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';

const expenseSelect = {
  id: true,
  amount: true,
  description: true,
  date: true,
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
} satisfies Prisma.ExpenseSelect;

@Injectable()
export class ExpenseService {
  constructor(private readonly prisma: PrismaService) {}

  async create(familyId: string, userId: string, dto: CreateExpenseDto) {
    return this.prisma.expense.create({
      data: {
        amount: Math.trunc(dto.amount * 100) / 100,
        description: dto.description,
        date: new Date(dto.date),
        categoryId: dto.categoryId,
        familyId,
        createdById: userId,
      },
      select: expenseSelect,
    });
  }

  async findAll(familyId: string, query: QueryExpensesDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const sort = query.sort || 'date';

    const where: Prisma.ExpenseWhereInput = { familyId };

    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) {
        where.date.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.date.lte = new Date(query.endDate);
      }
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.createdById) {
      where.createdById = query.createdById;
    }

    const [data, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        select: expenseSelect,
        orderBy: { [sort]: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.expense.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string, familyId: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      select: expenseSelect,
    });

    if (!expense || expense.familyId !== familyId) {
      throw new NotFoundException('Expense not found');
    }

    return expense;
  }

  async update(
    id: string,
    familyId: string,
    userId: string,
    userRole: string,
    dto: UpdateExpenseDto,
  ) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      select: expenseSelect,
    });

    if (!expense || expense.familyId !== familyId) {
      throw new NotFoundException('Expense not found');
    }

    if (expense.createdById !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('Only the creator or admin can edit');
    }

    const data: Prisma.ExpenseUpdateInput = {};
    if (dto.amount != null) {
      data.amount = Math.trunc(dto.amount * 100) / 100;
    }
    if (dto.description != null) {
      data.description = dto.description;
    }
    if (dto.date != null) {
      data.date = new Date(dto.date);
    }
    if (dto.categoryId != null) {
      data.category = { connect: { id: dto.categoryId } };
    }

    return this.prisma.expense.update({
      where: { id },
      data,
      select: expenseSelect,
    });
  }

  async remove(
    id: string,
    familyId: string,
    userId: string,
    userRole: string,
  ) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      select: expenseSelect,
    });

    if (!expense || expense.familyId !== familyId) {
      throw new NotFoundException('Expense not found');
    }

    if (expense.createdById !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('Only the creator or admin can edit');
    }

    return this.prisma.expense.delete({
      where: { id },
    });
  }
}
