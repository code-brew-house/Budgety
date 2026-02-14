import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useFamilyStore } from '@/stores/familyStore';
import { useCreateExpense } from '@/hooks/useExpenses';
import { useCategories } from '@/hooks/useCategories';

export default function AddExpenseScreen() {
  const activeFamilyId = useFamilyStore((s) => s.activeFamilyId);
  const createExpense = useCreateExpense(activeFamilyId!);
  const { data: categories } = useCategories(activeFamilyId);

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]!);

  const handleSubmit = () => {
    if (!amount || Number(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }
    if (!categoryId) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    createExpense.mutate(
      {
        amount: Number(amount),
        description: description.trim(),
        date,
        categoryId,
      },
      {
        onSuccess: () => router.back(),
        onError: (error) => Alert.alert('Error', error.message),
      },
    );
  };

  return (
    <ScrollView className="flex-1 bg-white px-6 pt-6">
      <Text className="text-2xl font-bold mb-6">Add Expense</Text>

      <Text className="text-sm font-medium text-gray-700 mb-1">Amount</Text>
      <TextInput
        className="border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base"
        placeholder="0.00"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
      />

      <Text className="text-sm font-medium text-gray-700 mb-1">Description</Text>
      <TextInput
        className="border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base"
        placeholder="What was this expense for?"
        value={description}
        onChangeText={setDescription}
      />

      <Text className="text-sm font-medium text-gray-700 mb-1">Date</Text>
      <TextInput
        className="border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base"
        placeholder="YYYY-MM-DD"
        value={date}
        onChangeText={setDate}
      />

      <Text className="text-sm font-medium text-gray-700 mb-2">Category</Text>
      <View className="flex-row flex-wrap gap-2 mb-6">
        {categories?.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            className={`px-4 py-2 rounded-full border ${
              categoryId === cat.id
                ? 'bg-black border-black'
                : 'bg-white border-gray-300'
            }`}
            onPress={() => setCategoryId(cat.id)}
          >
            <Text
              className={`text-sm ${
                categoryId === cat.id ? 'text-white' : 'text-gray-700'
              }`}
            >
              {cat.icon ? `${cat.icon} ` : ''}{cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        className="bg-black rounded-lg py-4 items-center mb-8"
        onPress={handleSubmit}
        disabled={createExpense.isPending}
      >
        <Text className="text-white font-semibold text-base">
          {createExpense.isPending ? 'Saving...' : 'Add Expense'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
