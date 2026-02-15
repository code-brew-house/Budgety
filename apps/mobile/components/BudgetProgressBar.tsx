import { View, Text } from 'react-native';

function getUtilizationColor(percent: number) {
  if (percent > 90) return 'bg-red-500';
  if (percent > 75) return 'bg-amber-500';
  return 'bg-green-500';
}

interface BudgetProgressBarProps {
  totalSpent: number;
  totalBudget: number;
  utilizationPercent: number;
  currency: string;
}

export function BudgetProgressBar({
  totalSpent,
  totalBudget,
  utilizationPercent,
  currency,
}: BudgetProgressBarProps) {
  const barWidth = Math.min(utilizationPercent, 100);
  const colorClass = getUtilizationColor(utilizationPercent);

  return (
    <View className="bg-white mx-4 mt-3 mb-2 p-4 rounded-lg border border-gray-100">
      <View className="flex-row justify-between mb-2">
        <Text className="text-sm text-gray-500">Monthly Budget</Text>
        <Text className="text-sm font-medium">
          {currency} {totalSpent.toLocaleString('en-IN')} / {totalBudget.toLocaleString('en-IN')}
        </Text>
      </View>
      <View className="h-3 bg-gray-200 rounded-full overflow-hidden">
        <View className={`h-full rounded-full ${colorClass}`} style={{ width: `${barWidth}%` }} />
      </View>
      <Text className="text-xs text-gray-400 mt-1">{utilizationPercent}% used</Text>
    </View>
  );
}
