import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BudgetService {
  constructor(private readonly prisma: PrismaService) {}

  async getBudgets(familyId: string, month: string) {
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
      select: { monthlyBudget: true },
    });

    const categoryBudgets = await this.prisma.categoryBudget.findMany({
      where: { familyId, month },
      select: {
        id: true,
        month: true,
        amount: true,
        categoryId: true,
        category: {
          select: { id: true, name: true, icon: true },
        },
      },
    });

    return {
      monthlyBudget: family?.monthlyBudget ?? null,
      categoryBudgets,
    };
  }

  async setOverallBudget(familyId: string, amount: number) {
    const truncated = Math.trunc(amount * 100) / 100;

    return this.prisma.family.update({
      where: { id: familyId },
      data: { monthlyBudget: truncated },
      select: {
        id: true,
        name: true,
        currency: true,
        monthlyBudget: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async upsertCategoryBudgets(
    familyId: string,
    month: string,
    budgets: Array<{ categoryId: string; amount: number }>,
  ) {
    const results = await Promise.all(
      budgets.map((budget) => {
        const truncatedAmount = Math.trunc(budget.amount * 100) / 100;

        return this.prisma.categoryBudget.upsert({
          where: {
            familyId_categoryId_month: {
              familyId,
              categoryId: budget.categoryId,
              month,
            },
          },
          update: { amount: truncatedAmount },
          create: {
            familyId,
            categoryId: budget.categoryId,
            month,
            amount: truncatedAmount,
          },
        });
      }),
    );

    return results;
  }
}
