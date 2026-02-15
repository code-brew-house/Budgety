import { View } from 'react-native';
import { CartesianChart, Bar } from 'victory-native';

interface DayData {
  date: string;
  amount: number;
  [key: string]: unknown;
}

export function DailySpendingBar({ data }: { data: { date: string; amount: number }[] }) {
  if (data.length === 0) return null;

  const chartData: DayData[] = data;

  return (
    <View style={{ height: 200 }}>
      <CartesianChart
        data={chartData}
        xKey="date"
        yKeys={['amount']}
        domainPadding={{ left: 10, right: 10 }}
      >
        {({ points, chartBounds }) => (
          <Bar
            points={points.amount}
            chartBounds={chartBounds}
            color="#3b82f6"
            roundedCorners={{ topLeft: 4, topRight: 4 }}
          />
        )}
      </CartesianChart>
    </View>
  );
}
