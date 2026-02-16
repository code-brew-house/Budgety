export interface Family {
  id: string;
  name: string;
  currency: string;
  monthlyBudget: number | null;
  largeExpenseThreshold: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyMember {
  id: string;
  role: 'ADMIN' | 'MEMBER';
  joinedAt: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export interface FamilyDetail extends Family {
  members: FamilyMember[];
}

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  isDefault: boolean;
  familyId: string | null;
}

export interface Expense {
  id: string;
  amount: number;
  description: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  categoryId: string;
  familyId: string;
  createdById: string;
  category: { id: string; name: string; icon: string | null };
  createdBy: { id: string; name: string; displayName: string | null; avatarUrl: string | null };
}

export interface PaginatedExpenses {
  data: Expense[];
  total: number;
  page: number;
  limit: number;
}

export interface CategoryBudget {
  id: string;
  amount: number;
  month: string;
  categoryId: string;
  category: { id: string; name: string; icon: string | null };
}

export interface BudgetData {
  overallBudget: number | null;
  categoryBudgets: CategoryBudget[];
}

export interface MemberSpending {
  month: string;
  totalBudget: number;
  totalSpent: number;
  utilizationPercent: number;
  members: {
    userId: string;
    name: string;
    displayName: string | null;
    avatarUrl: string | null;
    totalSpent: number;
    percentOfTotal: number;
    topCategories: {
      categoryId: string;
      name: string;
      icon: string | null;
      amount: number;
    }[];
  }[];
}

export interface BudgetUtilization {
  month: string;
  categories: {
    categoryId: string;
    name: string;
    icon: string | null;
    budgeted: number;
    spent: number;
    utilizationPercent: number;
  }[];
}

export interface CategorySplit {
  month: string;
  categories: {
    categoryId: string;
    name: string;
    icon: string | null;
    amount: number;
    percent: number;
  }[];
}

export interface DailySpending {
  month: string;
  days: {
    date: string;
    amount: number;
  }[];
}

export interface MonthlyTrend {
  months: {
    month: string;
    amount: number;
  }[];
}

export interface TopExpenses {
  month: string;
  expenses: Expense[];
}

export interface RecurringExpense {
  id: string;
  amount: number;
  description: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  startDate: string;
  endDate: string | null;
  nextDueDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  categoryId: string;
  familyId: string;
  createdById: string;
  category: { id: string; name: string; icon: string | null };
  createdBy: { id: string; name: string; displayName: string | null; avatarUrl: string | null };
}

export interface PaginatedRecurringExpenses {
  data: RecurringExpense[];
  total: number;
  page: number;
  limit: number;
}

export interface Invite {
  code: string;
  expiresAt: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
  userId: string;
  familyId: string | null;
}

export interface PaginatedNotifications {
  data: Notification[];
  total: number;
}
