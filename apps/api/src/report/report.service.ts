import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  async getMemberSpending(familyId: string, month: string) {
    const [year, mon] = month.split('-').map(Number);
    const startDate = new Date(year, mon - 1, 1);
    const endDate = new Date(year, mon, 1);

    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
      select: { monthlyBudget: true },
    });

    const totalBudget = family?.monthlyBudget ?? 0;

    const memberTotals = await this.prisma.expense.groupBy({
      by: ['createdById'],
      _sum: { amount: true },
      where: {
        familyId,
        date: { gte: startDate, lt: endDate },
      },
    });

    const totalSpent = memberTotals.reduce(
      (sum, m) => sum + (m._sum.amount ?? 0),
      0,
    );

    if (memberTotals.length === 0) {
      return {
        month,
        totalBudget,
        totalSpent: 0,
        utilizationPercent: 0,
        members: [],
      };
    }

    const userIds = memberTotals.map((m) => m.createdById);

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, displayName: true, avatarUrl: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    const memberCategoryResults = await Promise.all(
      userIds.map((userId) =>
        this.prisma.expense.groupBy({
          by: ['categoryId'],
          _sum: { amount: true },
          where: {
            familyId,
            createdById: userId,
            date: { gte: startDate, lt: endDate },
          },
          orderBy: { _sum: { amount: 'desc' } },
          take: 3,
        }),
      ),
    );

    const allCategoryIds = [
      ...new Set(
        memberCategoryResults.flatMap((groups) =>
          groups.map((g) => g.categoryId),
        ),
      ),
    ];

    const categories = await this.prisma.category.findMany({
      where: { id: { in: allCategoryIds } },
      select: { id: true, name: true, icon: true },
    });

    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    const members = memberTotals
      .map((m, index) => {
        const user = userMap.get(m.createdById);
        const memberSpent = m._sum.amount ?? 0;
        const categoryGroups = memberCategoryResults[index];

        return {
          userId: m.createdById,
          name: user?.name ?? '',
          displayName: user?.displayName ?? null,
          avatarUrl: user?.avatarUrl ?? null,
          totalSpent: memberSpent,
          percentOfTotal:
            totalSpent > 0
              ? Math.round((memberSpent / totalSpent) * 1000) / 10
              : 0,
          topCategories: categoryGroups.map((g) => {
            const cat = categoryMap.get(g.categoryId);
            return {
              categoryId: g.categoryId,
              name: cat?.name ?? '',
              icon: cat?.icon ?? null,
              amount: g._sum.amount ?? 0,
            };
          }),
        };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent);

    return {
      month,
      totalBudget,
      totalSpent,
      utilizationPercent:
        totalBudget > 0
          ? Math.round((totalSpent / totalBudget) * 1000) / 10
          : 0,
      members,
    };
  }

  async getBudgetUtilization(familyId: string, month: string) {
    const [year, mon] = month.split('-').map(Number);
    const startDate = new Date(year, mon - 1, 1);
    const endDate = new Date(year, mon, 1);

    const categoryBudgets = await this.prisma.categoryBudget.findMany({
      where: { familyId, month },
      include: {
        category: { select: { id: true, name: true, icon: true } },
      },
    });

    if (categoryBudgets.length === 0) {
      return { month, categories: [] };
    }

    const categoryIds = categoryBudgets.map((cb) => cb.categoryId);

    const expenseGroups = await this.prisma.expense.groupBy({
      by: ['categoryId'],
      _sum: { amount: true },
      where: {
        familyId,
        categoryId: { in: categoryIds },
        date: { gte: startDate, lt: endDate },
      },
    });

    const spentMap = new Map(
      expenseGroups.map((g) => [g.categoryId, g._sum.amount ?? 0]),
    );

    const categories = categoryBudgets
      .map((cb) => {
        const spent = spentMap.get(cb.categoryId) ?? 0;
        return {
          categoryId: cb.categoryId,
          name: cb.category.name,
          icon: cb.category.icon,
          budgeted: cb.amount,
          spent,
          utilizationPercent:
            cb.amount > 0
              ? Math.round((spent / cb.amount) * 1000) / 10
              : 0,
        };
      })
      .sort((a, b) => b.utilizationPercent - a.utilizationPercent);

    return { month, categories };
  }
}
