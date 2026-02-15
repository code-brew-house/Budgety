import { useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import { useFamilyStore } from '@/stores/familyStore';
import { useInfiniteExpenses, useDeleteExpense } from '@/hooks/useExpenses';
import { mediumHaptic } from '@/lib/haptics';
import type { Expense } from '@/hooks/types';

function renderRightActions() {
  return (
    <View className="bg-red-500 justify-center items-center px-6 mb-2 mx-4 rounded-r-lg">
      <Text className="text-white font-semibold">Delete</Text>
    </View>
  );
}

function ExpenseCard({
  expense,
  onDelete,
}: {
  expense: Expense;
  onDelete: (id: string) => void;
}) {
  const swipeableRef = useRef<Swipeable>(null);
  const date = new Date(expense.date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });

  const handleSwipeOpen = () => {
    mediumHaptic();
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => swipeableRef.current?.close(),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(expense.id),
        },
      ],
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      onSwipeableOpen={handleSwipeOpen}
    >
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
    </Swipeable>
  );
}

export default function ExpensesScreen() {
  const activeFamilyId = useFamilyStore((s) => s.activeFamilyId);
  const {
    data,
    isPending,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteExpenses(activeFamilyId, { limit: 20, sort: 'date' });
  const deleteExpense = useDeleteExpense(activeFamilyId!);

  const expenses = data?.pages.flatMap((p) => p.data) ?? [];

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
        data={expenses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ExpenseCard expense={item} onDelete={(id) => deleteExpense.mutate(id)} />
        )}
        contentContainerStyle={{ paddingVertical: 12 }}
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
