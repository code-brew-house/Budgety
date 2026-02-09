import { View, Text } from 'react-native';
import { authClient } from '@/lib/auth';

export default function HomeScreen() {
  const { data: session } = authClient.useSession();

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-xl font-bold mb-2">Welcome to Budgety</Text>
      <Text className="text-gray-500">
        {session?.user?.name ? `Hello, ${session.user.name}!` : 'Loading...'}
      </Text>
    </View>
  );
}
