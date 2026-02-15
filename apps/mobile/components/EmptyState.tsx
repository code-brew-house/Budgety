import { View, Text, TouchableOpacity } from 'react-native';

interface EmptyStateProps {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center py-20 px-6">
      <Text className="text-lg font-semibold text-gray-400 mb-2">{title}</Text>
      {message && (
        <Text className="text-gray-400 text-center mb-4">{message}</Text>
      )}
      {actionLabel && onAction && (
        <TouchableOpacity
          className="bg-black rounded-lg py-3 px-6"
          onPress={onAction}
        >
          <Text className="text-white font-semibold">{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
