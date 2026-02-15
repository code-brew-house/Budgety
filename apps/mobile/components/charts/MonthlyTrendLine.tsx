import { View } from 'react-native';
import { CartesianChart, Line } from 'victory-native';

interface MonthData {
  month: string;
  amount: number;
  [key: string]: unknown;
}

export function MonthlyTrendLine({ data }: { data: { month: string; amount: number }[] }) {
  if (data.length === 0) return null;

  const chartData: MonthData[] = data;

  return (
    <View style={{ height: 200 }}>
      <CartesianChart
        data={chartData}
        xKey="month"
        yKeys={['amount']}
        domainPadding={{ left: 10, right: 10 }}
      >
        {({ points }) => (
          <Line
            points={points.amount}
            color="#10b981"
            strokeWidth={2}
            curveType="natural"
          />
        )}
      </CartesianChart>
    </View>
  );
}
