import { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert } from 'react-native';
import { useFamilyStore } from '@/stores/familyStore';
import { useFamilyDetail, useCreateInvite, useUpdateMemberRole, useRemoveMember } from '@/hooks/useFamilies';
import type { FamilyMember } from '@/hooks/types';

export default function MembersScreen() {
  const activeFamilyId = useFamilyStore((s) => s.activeFamilyId);
  const { data: family } = useFamilyDetail(activeFamilyId);
  const createInvite = useCreateInvite(activeFamilyId!);
  const updateRole = useUpdateMemberRole(activeFamilyId!);
  const removeMember = useRemoveMember(activeFamilyId!);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  const handleInvite = () => {
    createInvite.mutate(undefined, {
      onSuccess: (data) => setInviteCode(data.code),
      onError: (error) => Alert.alert('Error', error.message),
    });
  };

  const handleToggleRole = (member: FamilyMember) => {
    const newRole = member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN';
    updateRole.mutate(
      { memberId: member.id, role: newRole },
      { onError: (error) => Alert.alert('Error', error.message) },
    );
  };

  const handleRemove = (member: FamilyMember) => {
    Alert.alert('Remove Member', `Remove ${member.user.name} from this family?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () =>
          removeMember.mutate(member.id, {
            onError: (error) => Alert.alert('Error', error.message),
          }),
      },
    ]);
  };

  const renderMember = ({ item }: { item: FamilyMember }) => (
    <View className="bg-white border border-gray-100 rounded-lg p-4 mb-2">
      <View className="flex-row justify-between items-center">
        <View>
          <Text className="font-medium">{item.user.displayName || item.user.name}</Text>
          <Text className="text-gray-500 text-sm">{item.user.email}</Text>
          <Text className="text-xs text-gray-400 mt-1">{item.role}</Text>
        </View>
        <View className="flex-row gap-2">
          <TouchableOpacity
            className="px-3 py-1 border border-gray-300 rounded"
            onPress={() => handleToggleRole(item)}
          >
            <Text className="text-xs">{item.role === 'ADMIN' ? 'Demote' : 'Promote'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="px-3 py-1 border border-red-300 rounded"
            onPress={() => handleRemove(item)}
          >
            <Text className="text-xs text-red-600">Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50 px-4 pt-4">
      <TouchableOpacity
        className="bg-black rounded-lg py-3 items-center mb-4"
        onPress={handleInvite}
        disabled={createInvite.isPending}
      >
        <Text className="text-white font-semibold">
          {createInvite.isPending ? 'Generating...' : 'Generate Invite Code'}
        </Text>
      </TouchableOpacity>

      {inviteCode && (
        <View className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 items-center">
          <Text className="text-sm text-blue-600 mb-1">Share this code:</Text>
          <Text className="text-2xl font-bold tracking-widest text-blue-800">{inviteCode}</Text>
          <Text className="text-xs text-blue-500 mt-1">Expires in 24 hours</Text>
        </View>
      )}

      <FlatList
        data={family?.members || []}
        keyExtractor={(item) => item.id}
        renderItem={renderMember}
        ListEmptyComponent={
          <Text className="text-gray-400 text-center py-8">No members</Text>
        }
      />
    </View>
  );
}
