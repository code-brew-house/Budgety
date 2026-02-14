import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { useJoinFamily } from '@/hooks/useFamilies';
import { useFamilyStore } from '@/stores/familyStore';

export default function JoinFamilyScreen() {
  const [code, setCode] = useState('');
  const joinFamily = useJoinFamily();
  const setActiveFamilyId = useFamilyStore((s) => s.setActiveFamilyId);

  const handleJoin = () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      Alert.alert('Error', 'Invite code must be 6 characters');
      return;
    }
    joinFamily.mutate(trimmed, {
      onSuccess: (family) => {
        setActiveFamilyId(family.id);
        router.back();
      },
      onError: (error) => {
        Alert.alert('Error', error.message);
      },
    });
  };

  return (
    <View className="flex-1 bg-white px-6 pt-6">
      <Text className="text-2xl font-bold mb-2">Join Family</Text>
      <Text className="text-gray-500 mb-6">Enter the 6-character invite code shared by a family admin.</Text>

      <Text className="text-sm font-medium text-gray-700 mb-1">Invite Code</Text>
      <TextInput
        className="border border-gray-300 rounded-lg px-4 py-3 mb-6 text-base text-center tracking-widest"
        placeholder="ABC123"
        value={code}
        onChangeText={setCode}
        maxLength={6}
        autoCapitalize="characters"
      />

      <TouchableOpacity
        className="bg-black rounded-lg py-4 items-center"
        onPress={handleJoin}
        disabled={joinFamily.isPending}
      >
        <Text className="text-white font-semibold text-base">
          {joinFamily.isPending ? 'Joining...' : 'Join Family'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
