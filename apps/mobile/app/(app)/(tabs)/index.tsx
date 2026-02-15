import { View, Text, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { useFamilyStore } from '@/stores/familyStore';
import { useInfiniteExpenses } from '@/hooks/useExpenses';
import { useFamilyDetail } from '@/hooks/useFamilies';
import { useMemberSpending } from '@/hooks/useReports';
import type { Expense } from '@/hooks/types';

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getUtilizationColor(percent: number) {
  if (percent > 90) return 'bg-red-500';
  if (percent > 75) return 'bg-amber-500';
  return 'bg-green-500';
}

function BudgetProgressBar({
  totalSpent,
  totalBudget,
  utilizationPercent,
  currency,
}: {
  totalSpent: number;
  totalBudget: number;
  utilizationPercent: number;
  currency: string;
}) {
  const barWidth = Math.min(utilizationPercent, 100);
  const colorClass = getUtilizationColor(utilizationPercent);

  return (
    <View className="bg-white mx-4 mt-3 mb-2 p-4 rounded-lg border border-gray-100">
      <View className="flex-row justify-between mb-2">
        <Text className="text-sm text-gray-500">Monthly Budget</Text>
        <Text className="text-sm font-medium">
          {currency} {totalSpent.toLocaleString('en-IN')} / {totalBudget.toLocaleString('en-IN')}
        </Text>
      </View>
      <View className="h-3 bg-gray-200 rounded-full overflow-hidden">
        <View className={`h-full rounded-full ${colorClass}`} style={{ width: `${barWidth}%` }} />
      </View>
      <Text className="text-xs text-gray-400 mt-1">{utilizationPercent}% used</Text>
    </View>
  );
}

function FeedItem({
  expense,
  largeThreshold,
}: {
  expense: Expense;
  largeThreshold: number | null;
}) {
  const isLarge = largeThreshold != null && expense.amount >= largeThreshold;
  const timeAgo = getTimeAgo(new Date(expense.createdAt));
  const displayName =
    expense.createdBy?.displayName || expense.createdBy?.name || 'Someone';

  return (
    <View
      className={`bg-white mx-4 mb-2 p-4 rounded-lg border ${
        isLarge ? 'border-amber-300 bg-amber-50' : 'border-gray-100'
      }`}
    >
      {isLarge && (
        <Text className="text-xs font-semibold text-amber-600 mb-1">
          Large Expense
        </Text>
      )}
      <View className="flex-row justify-between items-start">
        <View className="flex-1 mr-3">
          <Text className="font-medium text-base">{expense.description}</Text>
          <Text className="text-gray-500 text-sm mt-1">
            {displayName} • {expense.category?.name || 'Uncategorized'}
          </Text>
          <Text className="text-gray-400 text-xs mt-1">{timeAgo}</Text>
        </View>
        <Text className={`font-semibold text-base ${isLarge ? 'text-amber-700' : ''}`}>
          ₹{expense.amount.toLocaleString('en-IN')}
        </Text>
      </View>
    </View>
  );
}

function getTimeAgo(date: Date) {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function HomeScreen() {
  const activeFamilyId = useFamilyStore((s) => s.activeFamilyId);
  const month = getCurrentMonth();
  const { data: family } = useFamilyDetail(activeFamilyId);
  const { data: spending } = useMemberSpending(activeFamilyId, month);
  const {
    data: expenseData,
    isPending,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteExpenses(activeFamilyId, {
    limit: 20,
    sort: 'createdAt',
  });

  if (!activeFamilyId) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-lg font-semibold mb-2">Welcome to Budgety</Text>
        <Text className="text-gray-500">
          Create or join a family in Settings to get started.
        </Text>
      </View>
    );
  }

  const hasBudget = (family?.monthlyBudget ?? 0) > 0;

  const expenses = expenseData?.pages.flatMap((p) => p.data) ?? [];

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FeedItem
            expense={item}
            largeThreshold={family?.largeExpenseThreshold ?? null}
          />
        )}
        ListHeaderComponent={
          hasBudget && spending ? (
            <BudgetProgressBar
              totalSpent={spending.totalSpent}
              totalBudget={spending.totalBudget}
              utilizationPercent={spending.utilizationPercent}
              currency={family?.currency || 'INR'}
            />
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 20, paddingTop: 4 }}
        refreshControl={
          <RefreshControl refreshing={isPending} onRefresh={refetch} />
        }
        onEndReached={() => { if (hasNextPage) fetchNextPage(); }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator size="small" style={{ paddingVertical: 16 }} />
          ) : null
        }
        ListEmptyComponent={
          !isPending ? (
            <View className="items-center justify-center py-20">
              <Text className="text-gray-400 text-base">No activity yet</Text>
              <Text className="text-gray-400 text-sm mt-1">
                Expenses will appear here as they're added
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}
