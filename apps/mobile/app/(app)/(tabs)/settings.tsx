import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { authClient } from '@/lib/auth';
import { useFamilies } from '@/hooks/useFamilies';
import { useFamilyStore } from '@/stores/familyStore';

export default function SettingsScreen() {
  const { data: session } = authClient.useSession();
  const { data: families } = useFamilies();
  const { activeFamilyId, setActiveFamilyId } = useFamilyStore();

  const handleLogout = async () => {
    await authClient.signOut();
    router.replace('/(auth)/login');
  };

  return (
    <ScrollView className="flex-1 bg-white px-6 pt-4">
      <View className="bg-gray-50 rounded-lg p-4 mb-6">
        <Text className="text-lg font-semibold">
          {session?.user?.name || 'User'}
        </Text>
        <Text className="text-gray-500">{session?.user?.email}</Text>
      </View>

      <Text className="text-base font-semibold mb-3">Families</Text>

      {families?.map((family) => (
        <TouchableOpacity
          key={family.id}
          className={`border rounded-lg p-4 mb-2 ${
            family.id === activeFamilyId
              ? 'border-black bg-gray-50'
              : 'border-gray-200'
          }`}
          onPress={() => setActiveFamilyId(family.id)}
        >
          <Text className="font-medium">{family.name}</Text>
          <Text className="text-gray-500 text-sm">
            {family.currency} {family.id === activeFamilyId ? '• Active' : ''}
          </Text>
        </TouchableOpacity>
      ))}

      {activeFamilyId && (
        <View className="flex-row gap-3 mb-3">
          <TouchableOpacity
            className="flex-1 border border-gray-300 rounded-lg py-3 items-center"
            onPress={() => router.push('/(app)/family/members')}
          >
            <Text className="font-medium text-sm">Members</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 border border-gray-300 rounded-lg py-3 items-center"
            onPress={() => router.push('/(app)/family/categories')}
          >
            <Text className="font-medium text-sm">Categories</Text>
          </TouchableOpacity>
        </View>
      )}

      <View className="flex-row gap-3 mt-3 mb-6">
        <TouchableOpacity
          className="flex-1 bg-black rounded-lg py-3 items-center"
          onPress={() => router.push('/(app)/family/create')}
        >
          <Text className="text-white font-semibold">Create Family</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 border border-black rounded-lg py-3 items-center"
          onPress={() => router.push('/(app)/family/join')}
        >
          <Text className="font-semibold">Join Family</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        className="bg-red-50 rounded-lg py-3 items-center mb-8"
        onPress={handleLogout}
      >
        <Text className="text-red-600 font-semibold">Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
