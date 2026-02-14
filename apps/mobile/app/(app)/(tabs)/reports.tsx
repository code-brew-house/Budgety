import { useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { TouchableOpacity } from 'react-native';
import { useFamilyStore } from '@/stores/familyStore';
import { useMemberSpending, useBudgetUtilization } from '@/hooks/useReports';

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonth(month: string) {
  const [year, mon] = month.split('-');
  const date = new Date(Number(year), Number(mon) - 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function shiftMonth(month: string, delta: number) {
  const [year, mon] = month.split('-').map(Number);
  const date = new Date(year!, mon! - 1 + delta);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getColor(percent: number) {
  if (percent > 90) return { bg: 'bg-red-100', text: 'text-red-700', bar: 'bg-red-500' };
  if (percent > 75) return { bg: 'bg-amber-100', text: 'text-amber-700', bar: 'bg-amber-500' };
  return { bg: 'bg-green-100', text: 'text-green-700', bar: 'bg-green-500' };
}

export default function ReportsScreen() {
  const activeFamilyId = useFamilyStore((s) => s.activeFamilyId);
  const [month, setMonth] = useState(getCurrentMonth());

  const {
    data: spending,
    isPending: spendingLoading,
    refetch: refetchSpending,
  } = useMemberSpending(activeFamilyId, month);

  const {
    data: utilization,
    isPending: utilizationLoading,
    refetch: refetchUtilization,
  } = useBudgetUtilization(activeFamilyId, month);

  const refreshing = spendingLoading || utilizationLoading;

  const handleRefresh = () => {
    refetchSpending();
    refetchUtilization();
  };

  if (!activeFamilyId) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray-500">Select a family in Settings to view reports.</Text>
      </View>
    );
  }

  const budgetColor = spending ? getColor(spending.utilizationPercent) : getColor(0);

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ paddingBottom: 30 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Month Selector */}
      <View className="flex-row justify-between items-center px-4 pt-4 pb-2">
        <TouchableOpacity onPress={() => setMonth(shiftMonth(month, -1))}>
          <Text className="text-lg font-bold px-2">←</Text>
        </TouchableOpacity>
        <Text className="text-lg font-semibold">{formatMonth(month)}</Text>
        <TouchableOpacity onPress={() => setMonth(shiftMonth(month, 1))}>
          <Text className="text-lg font-bold px-2">→</Text>
        </TouchableOpacity>
      </View>

      {/* Budget Summary Card */}
      {spending && (
        <View className={`mx-4 mt-2 p-4 rounded-lg ${budgetColor.bg}`}>
          <Text className="text-sm text-gray-600 mb-1">Budget Summary</Text>
          <Text className="text-2xl font-bold">
            ₹{spending.totalSpent.toLocaleString('en-IN')}
          </Text>
          {spending.totalBudget > 0 && (
            <>
              <Text className="text-sm text-gray-500 mt-1">
                of ₹{spending.totalBudget.toLocaleString('en-IN')} budget
              </Text>
              <View className="h-3 bg-gray-200 rounded-full overflow-hidden mt-2">
                <View
                  className={`h-full rounded-full ${budgetColor.bar}`}
                  style={{ width: `${Math.min(spending.utilizationPercent, 100)}%` }}
                />
              </View>
              <Text className={`text-sm font-medium mt-1 ${budgetColor.text}`}>
                {spending.utilizationPercent}% used
              </Text>
            </>
          )}
        </View>
      )}

      {/* Per-Member Spending */}
      {spending && spending.members.length > 0 && (
        <View className="mt-4 px-4">
          <Text className="text-base font-semibold mb-2">Member Spending</Text>
          {spending.members.map((member) => (
            <View key={member.userId} className="bg-white border border-gray-100 rounded-lg p-4 mb-2">
              <View className="flex-row justify-between items-start">
                <View>
                  <Text className="font-medium">
                    {member.displayName || member.name}
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    {member.percentOfTotal}% of total
                  </Text>
                </View>
                <Text className="font-semibold">
                  ₹{member.totalSpent.toLocaleString('en-IN')}
                </Text>
              </View>
              {member.topCategories.length > 0 && (
                <View className="flex-row flex-wrap gap-2 mt-2">
                  {member.topCategories.map((cat) => (
                    <View key={cat.categoryId} className="bg-gray-50 px-2 py-1 rounded">
                      <Text className="text-xs text-gray-600">
                        {cat.icon ? `${cat.icon} ` : ''}{cat.name}: ₹{cat.amount.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Category Budget Utilization */}
      {utilization && utilization.categories.length > 0 && (
        <View className="mt-4 px-4">
          <Text className="text-base font-semibold mb-2">Category Breakdown</Text>
          {utilization.categories.map((cat) => {
            const catColor = getColor(cat.utilizationPercent);
            return (
              <View key={cat.categoryId} className="bg-white border border-gray-100 rounded-lg p-4 mb-2">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="font-medium">
                    {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                  </Text>
                  <Text className={`text-sm font-medium ${catColor.text}`}>
                    {cat.utilizationPercent}%
                  </Text>
                </View>
                <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <View
                    className={`h-full rounded-full ${catColor.bar}`}
                    style={{ width: `${Math.min(cat.utilizationPercent, 100)}%` }}
                  />
                </View>
                <Text className="text-xs text-gray-500 mt-1">
                  ₹{cat.spent.toLocaleString('en-IN')} / ₹{cat.budgeted.toLocaleString('en-IN')}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Empty state */}
      {spending && spending.members.length === 0 && (
        <View className="items-center py-20">
          <Text className="text-gray-400 text-base">No spending data for this month</Text>
        </View>
      )}
    </ScrollView>
  );
}
