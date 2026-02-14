import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { useCreateFamily } from '@/hooks/useFamilies';
import { useFamilyStore } from '@/stores/familyStore';

export default function CreateFamilyScreen() {
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [budget, setBudget] = useState('');
  const createFamily = useCreateFamily();
  const setActiveFamilyId = useFamilyStore((s) => s.setActiveFamilyId);

  const handleCreate = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Family name is required');
      return;
    }
    createFamily.mutate(
      {
        name: name.trim(),
        currency: currency.trim() || 'INR',
        monthlyBudget: budget ? Number(budget) : undefined,
      },
      {
        onSuccess: (family) => {
          setActiveFamilyId(family.id);
          router.back();
        },
        onError: (error) => {
          Alert.alert('Error', error.message);
        },
      },
    );
  };

  return (
    <View className="flex-1 bg-white px-6 pt-6">
      <Text className="text-2xl font-bold mb-6">Create Family</Text>

      <Text className="text-sm font-medium text-gray-700 mb-1">Family Name</Text>
      <TextInput
        className="border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base"
        placeholder="e.g. Smith Family"
        value={name}
        onChangeText={setName}
      />

      <Text className="text-sm font-medium text-gray-700 mb-1">Currency</Text>
      <TextInput
        className="border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base"
        placeholder="INR"
        value={currency}
        onChangeText={setCurrency}
      />

      <Text className="text-sm font-medium text-gray-700 mb-1">Monthly Budget (optional)</Text>
      <TextInput
        className="border border-gray-300 rounded-lg px-4 py-3 mb-6 text-base"
        placeholder="e.g. 50000"
        value={budget}
        onChangeText={setBudget}
        keyboardType="numeric"
      />

      <TouchableOpacity
        className="bg-black rounded-lg py-4 items-center"
        onPress={handleCreate}
        disabled={createFamily.isPending}
      >
        <Text className="text-white font-semibold text-base">
          {createFamily.isPending ? 'Creating...' : 'Create Family'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
