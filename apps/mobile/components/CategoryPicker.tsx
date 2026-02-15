import { View, Text, TouchableOpacity } from 'react-native';
import type { Category } from '@/hooks/types';

interface CategoryPickerProps {
  categories: Category[] | undefined;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function CategoryPicker({ categories, selectedId, onSelect }: CategoryPickerProps) {
  return (
    <View className="flex-row flex-wrap gap-2 mb-6">
      {categories?.map((cat) => (
        <TouchableOpacity
          key={cat.id}
          className={`px-4 py-2 rounded-full border ${
            selectedId === cat.id
              ? 'bg-black border-black'
              : 'bg-white border-gray-300'
          }`}
          onPress={() => onSelect(cat.id)}
        >
          <Text
            className={`text-sm ${
              selectedId === cat.id ? 'text-white' : 'text-gray-700'
            }`}
          >
            {cat.icon ? `${cat.icon} ` : ''}{cat.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
