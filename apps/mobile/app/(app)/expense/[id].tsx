import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useFamilyStore } from '@/stores/familyStore';
import { useExpense, useUpdateExpense, useDeleteExpense } from '@/hooks/useExpenses';
import { useCategories } from '@/hooks/useCategories';
import { successHaptic } from '@/lib/haptics';

export default function ExpenseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const activeFamilyId = useFamilyStore((s) => s.activeFamilyId);
  const { data: expense, isPending } = useExpense(activeFamilyId, id ?? null);
  const updateExpense = useUpdateExpense(activeFamilyId!);
  const deleteExpense = useDeleteExpense(activeFamilyId!);
  const { data: categories } = useCategories(activeFamilyId);

  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const startEditing = () => {
    if (!expense) return;
    setAmount(String(expense.amount));
    setDescription(expense.description);
    setCategoryId(expense.categoryId);
    setEditing(true);
  };

  const handleSave = () => {
    if (!expense || !id) return;
    updateExpense.mutate(
      {
        id,
        amount: Number(amount),
        description: description.trim(),
        categoryId: categoryId ?? undefined,
      },
      {
        onSuccess: () => {
          successHaptic();
          setEditing(false);
        },
        onError: (error) => Alert.alert('Error', error.message),
      },
    );
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert('Delete Expense', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteExpense.mutate(id, {
            onSuccess: () => router.back(),
          });
        },
      },
    ]);
  };

  if (isPending || !expense) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray-400">Loading...</Text>
      </View>
    );
  }

  if (editing) {
    return (
      <ScrollView className="flex-1 bg-white px-6 pt-6">
        <Text className="text-sm font-medium text-gray-700 mb-1">Amount</Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
        />

        <Text className="text-sm font-medium text-gray-700 mb-1">Description</Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base"
          value={description}
          onChangeText={setDescription}
        />

        <Text className="text-sm font-medium text-gray-700 mb-2">Category</Text>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {categories?.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              className={`px-4 py-2 rounded-full border ${
                categoryId === cat.id ? 'bg-black border-black' : 'bg-white border-gray-300'
              }`}
              onPress={() => setCategoryId(cat.id)}
            >
              <Text className={`text-sm ${categoryId === cat.id ? 'text-white' : 'text-gray-700'}`}>
                {cat.icon ? `${cat.icon} ` : ''}{cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View className="flex-row gap-3 mb-8">
          <TouchableOpacity
            className="flex-1 bg-black rounded-lg py-4 items-center"
            onPress={handleSave}
            disabled={updateExpense.isPending}
          >
            <Text className="text-white font-semibold">
              {updateExpense.isPending ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 border border-gray-300 rounded-lg py-4 items-center"
            onPress={() => setEditing(false)}
          >
            <Text className="font-semibold">Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  const date = new Date(expense.date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <ScrollView className="flex-1 bg-white px-6 pt-6">
      <Text className="text-3xl font-bold mb-1">
        ₹{expense.amount.toLocaleString('en-IN')}
      </Text>
      <Text className="text-gray-500 text-base mb-6">{expense.description}</Text>

      <View className="bg-gray-50 rounded-lg p-4 mb-4">
        <DetailRow label="Date" value={date} />
        <DetailRow
          label="Category"
          value={`${expense.category?.icon ? expense.category.icon + ' ' : ''}${expense.category?.name || 'Uncategorized'}`}
        />
        <DetailRow
          label="Added by"
          value={expense.createdBy?.displayName || expense.createdBy?.name || 'Unknown'}
        />
        <DetailRow
          label="Created"
          value={new Date(expense.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        />
      </View>

      <View className="flex-row gap-3 mb-8">
        <TouchableOpacity
          className="flex-1 bg-black rounded-lg py-4 items-center"
          onPress={startEditing}
        >
          <Text className="text-white font-semibold">Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 bg-red-50 rounded-lg py-4 items-center"
          onPress={handleDelete}
        >
          <Text className="text-red-600 font-semibold">Delete</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-2">
      <Text className="text-gray-500">{label}</Text>
      <Text className="font-medium">{value}</Text>
    </View>
  );
}
