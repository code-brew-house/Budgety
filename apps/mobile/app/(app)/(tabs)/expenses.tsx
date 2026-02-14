import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useFamilyStore } from '@/stores/familyStore';
import { useExpenses } from '@/hooks/useExpenses';
import type { Expense } from '@/hooks/types';

function ExpenseCard({ expense }: { expense: Expense }) {
  const date = new Date(expense.date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <View className="bg-white border border-gray-100 rounded-lg p-4 mb-2 mx-4">
      <View className="flex-row justify-between items-start">
        <View className="flex-1 mr-3">
          <Text className="font-medium text-base">{expense.description}</Text>
          <Text className="text-gray-500 text-sm mt-1">
            {expense.category?.name || 'Uncategorized'} • {date}
          </Text>
          <Text className="text-gray-400 text-xs mt-1">
            by {expense.createdBy?.displayName || expense.createdBy?.name || 'Unknown'}
          </Text>
        </View>
        <Text className="font-semibold text-base">
          ₹{expense.amount.toLocaleString('en-IN')}
        </Text>
      </View>
    </View>
  );
}

export default function ExpensesScreen() {
  const activeFamilyId = useFamilyStore((s) => s.activeFamilyId);
  const { data, isPending, refetch } = useExpenses(activeFamilyId, { limit: 50, sort: 'date' });

  if (!activeFamilyId) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray-500">Select a family in Settings to view expenses.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={data?.data || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ExpenseCard expense={item} />}
        contentContainerStyle={{ paddingVertical: 12 }}
        refreshControl={
          <RefreshControl refreshing={isPending} onRefresh={refetch} />
        }
        ListEmptyComponent={
          !isPending ? (
            <View className="items-center justify-center py-20">
              <Text className="text-gray-400 text-base">No expenses yet</Text>
              <Text className="text-gray-400 text-sm mt-1">
                Tap + to add your first expense
              </Text>
            </View>
          ) : null
        }
      />
      <TouchableOpacity
        className="absolute bottom-6 right-6 w-14 h-14 bg-black rounded-full items-center justify-center shadow-lg"
        onPress={() => router.push('/(app)/expense/add')}
      >
        <Text className="text-white text-2xl font-light">+</Text>
      </TouchableOpacity>
    </View>
  );
}
