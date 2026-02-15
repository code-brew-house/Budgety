import { Tabs } from 'expo-router';
import { Text, TouchableOpacity, Alert } from 'react-native';
import { useFamilies } from '@/hooks/useFamilies';
import { useFamilyStore } from '@/stores/familyStore';
import { useQueryClient } from '@tanstack/react-query';

export default function TabsLayout() {
  const { data: families } = useFamilies();
  const { activeFamilyId, setActiveFamilyId } = useFamilyStore();
  const queryClient = useQueryClient();

  const activeFamily = families?.find((f) => f.id === activeFamilyId);

  const handleFamilySwitch = (familyId: string) => {
    setActiveFamilyId(familyId);
    queryClient.invalidateQueries();
  };

  const headerRight = () => (
    <TouchableOpacity
      onPress={() => {
        if (!families || families.length <= 1) return;
        Alert.alert(
          'Switch Family',
          'Select a family',
          families.map((f) => ({
            text: f.name + (f.id === activeFamilyId ? ' ✓' : ''),
            onPress: () => handleFamilySwitch(f.id),
          })),
        );
      }}
      className="mr-4"
    >
      <Text className="font-medium">{activeFamily?.name ?? 'Family'}</Text>
    </TouchableOpacity>
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#000',
        tabBarInactiveTintColor: '#999',
        headerShown: true,
        headerRight,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Expenses',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>💰</Text>,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📊</Text>,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>⚙️</Text>,
        }}
      />
    </Tabs>
  );
}
