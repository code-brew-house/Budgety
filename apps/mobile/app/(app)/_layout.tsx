import { useEffect } from 'react';
import { Redirect, Stack } from 'expo-router';
import { authClient } from '@/lib/auth';
import { View, ActivityIndicator } from 'react-native';
import { useFamilies } from '@/hooks/useFamilies';
import { useFamilyStore } from '@/stores/familyStore';

export default function AppLayout() {
  const { data: session, isPending } = authClient.useSession();
  const { data: families } = useFamilies();
  const { activeFamilyId, setActiveFamilyId } = useFamilyStore();

  useEffect(() => {
    if (families && families.length > 0 && !activeFamilyId) {
      setActiveFamilyId(families[0]!.id);
    }
  }, [families, activeFamilyId, setActiveFamilyId]);

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="family/create"
        options={{ headerShown: true, title: 'Create Family', presentation: 'modal' }}
      />
      <Stack.Screen
        name="family/join"
        options={{ headerShown: true, title: 'Join Family', presentation: 'modal' }}
      />
      <Stack.Screen
        name="expense/add"
        options={{ headerShown: true, title: 'Add Expense', presentation: 'modal' }}
      />
      <Stack.Screen
        name="family/members"
        options={{ headerShown: true, title: 'Members', presentation: 'modal' }}
      />
      <Stack.Screen
        name="family/categories"
        options={{ headerShown: true, title: 'Categories', presentation: 'modal' }}
      />
      <Stack.Screen
        name="budget/manage"
        options={{ headerShown: true, title: 'Budget', presentation: 'modal' }}
      />
      <Stack.Screen
        name="recurring-expenses/index"
        options={{ headerShown: true, title: 'Recurring Expenses', presentation: 'modal' }}
      />
    </Stack>
  );
}
