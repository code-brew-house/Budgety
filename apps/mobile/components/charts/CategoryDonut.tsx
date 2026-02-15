import { View, Text } from 'react-native';
import { Pie, PolarChart } from 'victory-native';

const COLORS = [
  '#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899',
  '#14b8a6', '#f97316', '#6366f1', '#84cc16', '#06b6d4', '#e11d48',
];

export function CategoryDonut({ data }: { data: { name: string; amount: number; percent: number }[] }) {
  if (data.length === 0) return null;

  const coloredData = data.map((d, i) => ({
    ...d,
    color: COLORS[i % COLORS.length]!,
  }));

  return (
    <View className="items-center">
      <View style={{ height: 200, width: 200 }}>
        <PolarChart
          data={coloredData}
          labelKey="name"
          valueKey="amount"
          colorKey="color"
        >
          <Pie.Chart />
        </PolarChart>
      </View>
      <View className="flex-row flex-wrap justify-center gap-2 mt-3">
        {coloredData.map((d) => (
          <View key={d.name} className="flex-row items-center">
            <View
              className="w-3 h-3 rounded-full mr-1"
              style={{ backgroundColor: d.color }}
            />
            <Text className="text-xs text-gray-600">
              {d.name} ({d.percent}%)
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
