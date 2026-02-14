import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert } from 'react-native';
import { useFamilyStore } from '@/stores/familyStore';
import { useCategories, useCreateCategory, useDeleteCategory } from '@/hooks/useCategories';
import type { Category } from '@/hooks/types';

export default function CategoriesScreen() {
  const activeFamilyId = useFamilyStore((s) => s.activeFamilyId);
  const { data: categories } = useCategories(activeFamilyId);
  const createCategory = useCreateCategory(activeFamilyId!);
  const deleteCategory = useDeleteCategory(activeFamilyId!);
  const [newName, setNewName] = useState('');

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    createCategory.mutate(
      { name },
      {
        onSuccess: () => setNewName(''),
        onError: (error) => Alert.alert('Error', error.message),
      },
    );
  };

  const handleDelete = (cat: Category) => {
    if (cat.isDefault) {
      Alert.alert('Cannot Delete', 'Default categories cannot be deleted.');
      return;
    }
    Alert.alert('Delete Category', `Delete "${cat.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          deleteCategory.mutate(cat.id, {
            onError: (error) => Alert.alert('Error', error.message),
          }),
      },
    ]);
  };

  const renderCategory = ({ item }: { item: Category }) => (
    <View className="bg-white border border-gray-100 rounded-lg p-4 mb-2 flex-row justify-between items-center">
      <View>
        <Text className="font-medium">
          {item.icon ? `${item.icon} ` : ''}{item.name}
        </Text>
        {item.isDefault && (
          <Text className="text-xs text-gray-400">Default</Text>
        )}
      </View>
      {!item.isDefault && (
        <TouchableOpacity
          className="px-3 py-1 border border-red-300 rounded"
          onPress={() => handleDelete(item)}
        >
          <Text className="text-xs text-red-600">Delete</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50 px-4 pt-4">
      <View className="flex-row gap-2 mb-4">
        <TextInput
          className="flex-1 border border-gray-300 rounded-lg px-4 py-3 bg-white text-base"
          placeholder="New category name"
          value={newName}
          onChangeText={setNewName}
        />
        <TouchableOpacity
          className="bg-black rounded-lg px-5 justify-center"
          onPress={handleAdd}
          disabled={createCategory.isPending}
        >
          <Text className="text-white font-semibold">Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={categories || []}
        keyExtractor={(item) => item.id}
        renderItem={renderCategory}
        ListEmptyComponent={
          <Text className="text-gray-400 text-center py-8">No categories</Text>
        }
      />
    </View>
  );
}
