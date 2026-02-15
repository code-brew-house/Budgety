import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useFamilyStore } from '@/stores/familyStore';
import {
  useRecurringExpenses,
  useUpdateRecurringExpense,
  useDeleteRecurringExpense,
} from '@/hooks/useRecurringExpenses';

const FREQ_LABELS: Record<string, string> = {
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  YEARLY: 'Yearly',
};

export default function RecurringExpensesScreen() {
  const activeFamilyId = useFamilyStore((s) => s.activeFamilyId);
  const { data, isPending } = useRecurringExpenses(activeFamilyId);
  const updateMutation = useUpdateRecurringExpense(activeFamilyId!);
  const deleteMutation = useDeleteRecurringExpense(activeFamilyId!);

  const handleToggleActive = (id: string, isActive: boolean) => {
    updateMutation.mutate({ id, isActive: !isActive });
  };

  const handleDelete = (id: string, description: string) => {
    Alert.alert('Delete', `Delete "${description}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  if (!activeFamilyId) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray-500">Select a family first.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={data?.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          !isPending ? (
            <View className="items-center py-20">
              <Text className="text-gray-400 text-base">No recurring expenses</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View className="bg-white border border-gray-100 rounded-lg p-4 mb-2">
            <View className="flex-row justify-between items-start">
              <View className="flex-1 mr-3">
                <Text className="font-medium">{item.description}</Text>
                <Text className="text-xs text-gray-500 mt-1">
                  {item.category.icon ? `${item.category.icon} ` : ''}{item.category.name}
                  {' · '}{FREQ_LABELS[item.frequency] ?? item.frequency}
                </Text>
                <Text className="text-xs text-gray-400 mt-1">
                  Next: {new Date(item.nextDueDate).toLocaleDateString('en-IN')}
                </Text>
              </View>
              <Text className="font-semibold">
                ₹{item.amount.toLocaleString('en-IN')}
              </Text>
            </View>
            <View className="flex-row gap-3 mt-3">
              <TouchableOpacity
                className={`flex-1 py-2 items-center rounded-lg ${item.isActive ? 'bg-green-50' : 'bg-gray-100'}`}
                onPress={() => handleToggleActive(item.id, item.isActive)}
              >
                <Text className={`text-sm font-medium ${item.isActive ? 'text-green-700' : 'text-gray-500'}`}>
                  {item.isActive ? 'Active' : 'Paused'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="py-2 px-4 items-center rounded-lg bg-red-50"
                onPress={() => handleDelete(item.id, item.description)}
              >
                <Text className="text-sm font-medium text-red-600">Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}
