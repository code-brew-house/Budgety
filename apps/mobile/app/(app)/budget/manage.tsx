import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useFamilyStore } from '@/stores/familyStore';
import { useBudgets, useSetOverallBudget, useUpsertCategoryBudgets } from '@/hooks/useBudgets';
import { useCategories } from '@/hooks/useCategories';

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

export default function BudgetManageScreen() {
  const activeFamilyId = useFamilyStore((s) => s.activeFamilyId);
  const [month, setMonth] = useState(getCurrentMonth());
  const { data: budgetData } = useBudgets(activeFamilyId, month);
  const { data: categories } = useCategories(activeFamilyId);
  const setOverallBudget = useSetOverallBudget(activeFamilyId!);
  const upsertCategoryBudgets = useUpsertCategoryBudgets(activeFamilyId!);

  const [overallAmount, setOverallAmount] = useState('');
  const [categoryAmounts, setCategoryAmounts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (budgetData) {
      setOverallAmount(budgetData.overallBudget?.toString() || '');
      const amounts: Record<string, string> = {};
      budgetData.categoryBudgets.forEach((cb) => {
        amounts[cb.categoryId] = cb.amount.toString();
      });
      setCategoryAmounts(amounts);
    }
  }, [budgetData]);

  const handleSaveOverall = () => {
    const val = Number(overallAmount);
    if (isNaN(val) || val < 0) {
      Alert.alert('Error', 'Enter a valid budget amount');
      return;
    }
    setOverallBudget.mutate(
      { monthlyBudget: val },
      { onError: (e) => Alert.alert('Error', e.message) },
    );
  };

  const handleSaveCategories = () => {
    const budgets = Object.entries(categoryAmounts)
      .filter(([, val]) => val && Number(val) > 0)
      .map(([categoryId, val]) => ({ categoryId, amount: Number(val) }));

    if (budgets.length === 0) return;

    upsertCategoryBudgets.mutate(
      { month, budgets },
      { onError: (e) => Alert.alert('Error', e.message) },
    );
  };

  return (
    <ScrollView className="flex-1 bg-white px-6 pt-4">
      <View className="flex-row justify-between items-center mb-6">
        <TouchableOpacity onPress={() => setMonth(shiftMonth(month, -1))}>
          <Text className="text-lg font-bold px-2">←</Text>
        </TouchableOpacity>
        <Text className="text-lg font-semibold">{formatMonth(month)}</Text>
        <TouchableOpacity onPress={() => setMonth(shiftMonth(month, 1))}>
          <Text className="text-lg font-bold px-2">→</Text>
        </TouchableOpacity>
      </View>

      <Text className="text-base font-semibold mb-2">Overall Monthly Budget</Text>
      <View className="flex-row gap-2 mb-6">
        <TextInput
          className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-base"
          placeholder="0"
          value={overallAmount}
          onChangeText={setOverallAmount}
          keyboardType="numeric"
        />
        <TouchableOpacity
          className="bg-black rounded-lg px-5 justify-center"
          onPress={handleSaveOverall}
          disabled={setOverallBudget.isPending}
        >
          <Text className="text-white font-semibold">
            {setOverallBudget.isPending ? '...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text className="text-base font-semibold mb-3">Category Budgets</Text>
      {categories?.map((cat) => (
        <View key={cat.id} className="flex-row items-center gap-3 mb-3">
          <Text className="flex-1 text-sm">
            {cat.icon ? `${cat.icon} ` : ''}{cat.name}
          </Text>
          <TextInput
            className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-base text-right"
            placeholder="0"
            value={categoryAmounts[cat.id] || ''}
            onChangeText={(val) =>
              setCategoryAmounts((prev) => ({ ...prev, [cat.id]: val }))
            }
            keyboardType="numeric"
          />
        </View>
      ))}

      <TouchableOpacity
        className="bg-black rounded-lg py-4 items-center mt-4 mb-8"
        onPress={handleSaveCategories}
        disabled={upsertCategoryBudgets.isPending}
      >
        <Text className="text-white font-semibold text-base">
          {upsertCategoryBudgets.isPending ? 'Saving...' : 'Save Category Budgets'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
