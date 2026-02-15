import { useState, useMemo } from 'react';
import { View, Text, SectionList, TouchableOpacity, RefreshControl, ActivityIndicator, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useFamilyStore } from '@/stores/familyStore';
import { useInfiniteExpenses, useDeleteExpense } from '@/hooks/useExpenses';
import { useCategories } from '@/hooks/useCategories';
import { ExpenseCard } from '@/components/ExpenseCard';
import { EmptyState } from '@/components/EmptyState';
import type { Expense } from '@/hooks/types';

export default function ExpensesScreen() {
  const activeFamilyId = useFamilyStore((s) => s.activeFamilyId);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const { data: categories } = useCategories(activeFamilyId);

  const {
    data,
    isPending,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteExpenses(activeFamilyId, {
    limit: 20,
    sort: 'date',
    ...(selectedCategoryId ? { categoryId: selectedCategoryId } : {}),
  });
  const deleteExpense = useDeleteExpense(activeFamilyId!);

  const expenses = data?.pages.flatMap((p) => p.data) ?? [];

  const sections = useMemo(() => {
    const grouped = new Map<string, Expense[]>();
    for (const expense of expenses) {
      const dateKey = expense.date.split('T')[0]!;
      const existing = grouped.get(dateKey);
      if (existing) {
        existing.push(expense);
      } else {
        grouped.set(dateKey, [expense]);
      }
    }
    return Array.from(grouped.entries()).map(([dateKey, data]) => ({
      title: new Date(dateKey + 'T00:00:00').toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      }),
      data,
    }));
  }, [expenses]);

  if (!activeFamilyId) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray-500">Select a family in Settings to view expenses.</Text>
      </View>
    );
  }

  const categoryFilterHeader = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}
    >
      <TouchableOpacity
        className={`px-4 py-2 rounded-full border ${
          selectedCategoryId === null ? 'bg-black border-black' : 'bg-white border-gray-300'
        }`}
        onPress={() => setSelectedCategoryId(null)}
      >
        <Text className={`text-sm ${selectedCategoryId === null ? 'text-white' : 'text-gray-700'}`}>
          All
        </Text>
      </TouchableOpacity>
      {categories?.map((cat) => (
        <TouchableOpacity
          key={cat.id}
          className={`px-4 py-2 rounded-full border ${
            selectedCategoryId === cat.id ? 'bg-black border-black' : 'bg-white border-gray-300'
          }`}
          onPress={() => setSelectedCategoryId(cat.id)}
        >
          <Text className={`text-sm ${selectedCategoryId === cat.id ? 'text-white' : 'text-gray-700'}`}>
            {cat.icon ? `${cat.icon} ` : ''}{cat.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section: { title } }) => (
          <Text className="text-sm font-semibold text-gray-500 px-4 pt-4 pb-1">{title}</Text>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/(app)/expense/${item.id}`)}>
            <ExpenseCard expense={item} onDelete={(id) => deleteExpense.mutate(id)} />
          </TouchableOpacity>
        )}
        ListHeaderComponent={categoryFilterHeader}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: 12 }}
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
            <EmptyState title="No expenses yet" message="Tap + to add your first expense" />
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
