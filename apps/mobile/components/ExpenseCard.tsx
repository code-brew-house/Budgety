import { useRef } from 'react';
import { View, Text, Alert } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { mediumHaptic } from '@/lib/haptics';
import type { Expense } from '@/hooks/types';

function renderRightActions() {
  return (
    <View className="bg-red-500 justify-center items-center px-6 mb-2 mx-4 rounded-r-lg">
      <Text className="text-white font-semibold">Delete</Text>
    </View>
  );
}

export function ExpenseCard({
  expense,
  onDelete,
}: {
  expense: Expense;
  onDelete: (id: string) => void;
}) {
  const swipeableRef = useRef<SwipeableMethods>(null);
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
    <ReanimatedSwipeable
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
    </ReanimatedSwipeable>
  );
}
