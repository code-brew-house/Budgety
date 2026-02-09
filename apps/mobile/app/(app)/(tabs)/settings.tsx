import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { authClient } from '@/lib/auth';

export default function SettingsScreen() {
  const { data: session } = authClient.useSession();

  const handleLogout = async () => {
    await authClient.signOut();
    router.replace('/(auth)/login');
  };

  return (
    <View className="flex-1 bg-white px-6 pt-4">
      <View className="bg-gray-50 rounded-lg p-4 mb-6">
        <Text className="text-lg font-semibold">
          {session?.user?.name || 'User'}
        </Text>
        <Text className="text-gray-500">{session?.user?.email}</Text>
      </View>

      <TouchableOpacity
        className="bg-red-50 rounded-lg py-3 items-center"
        onPress={handleLogout}
      >
        <Text className="text-red-600 font-semibold">Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}
