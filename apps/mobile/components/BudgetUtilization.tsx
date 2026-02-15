import { View, Text } from 'react-native';

function getColor(percent: number) {
  if (percent > 90) return { bg: 'bg-red-100', text: 'text-red-700', bar: 'bg-red-500' };
  if (percent > 75) return { bg: 'bg-amber-100', text: 'text-amber-700', bar: 'bg-amber-500' };
  return { bg: 'bg-green-100', text: 'text-green-700', bar: 'bg-green-500' };
}

interface CategoryUtilization {
  categoryId: string;
  name: string;
  icon: string | null;
  budgeted: number;
  spent: number;
  utilizationPercent: number;
}

interface BudgetUtilizationProps {
  categories: CategoryUtilization[];
}

export function BudgetUtilization({ categories }: BudgetUtilizationProps) {
  return (
    <View className="mt-4 px-4">
      <Text className="text-base font-semibold mb-2">Category Budget</Text>
      {categories.map((cat) => {
        const catColor = getColor(cat.utilizationPercent);
        return (
          <View key={cat.categoryId} className="bg-white border border-gray-100 rounded-lg p-4 mb-2">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="font-medium">
                {cat.icon ? `${cat.icon} ` : ''}{cat.name}
              </Text>
              <Text className={`text-sm font-medium ${catColor.text}`}>
                {cat.utilizationPercent}%
              </Text>
            </View>
            <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <View
                className={`h-full rounded-full ${catColor.bar}`}
                style={{ width: `${Math.min(cat.utilizationPercent, 100)}%` }}
              />
            </View>
            <Text className="text-xs text-gray-500 mt-1">
              ₹{cat.spent.toLocaleString('en-IN')} / ₹{cat.budgeted.toLocaleString('en-IN')}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
