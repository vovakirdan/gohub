import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MetricMessage, MetricType } from '@/types/metrics';
import { formatTimestamp, getMetricColor, getMetricLabel } from '@/utils/formatters';

interface MetricsChartProps {
  history: MetricMessage[];
  metricType: MetricType;
  height?: number;
}

const MetricsChart: React.FC<MetricsChartProps> = ({ 
  history, 
  metricType,
  height = 200
}) => {
  // Format data for the chart
  const data = React.useMemo(() => {
    return history.map(metric => ({
      timestamp: metric.timestamp,
      formattedTime: formatTimestamp(metric.timestamp),
      [metricType]: metric[metricType]
    }));
  }, [history, metricType]);
  
  // If no data, show a message
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 bg-muted/30 rounded-lg animate-pulse-subtle">
        <p className="text-muted-foreground text-sm">No metrics data available</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white/50 rounded-lg p-4 shadow-sm border transition-all duration-300 ease-in-out mb-3">
      <div className="text-xs font-medium mb-2 text-muted-foreground">{getMetricLabel(metricType)}</div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="formattedTime" 
            tick={{ fontSize: 10 }} 
            stroke="#94a3b8"
            tickMargin={8}
          />
          <YAxis 
            domain={[0, 100]} 
            tick={{ fontSize: 10 }} 
            stroke="#94a3b8"
            tickMargin={8}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
              border: '1px solid rgba(0, 0, 0, 0.05)',
              padding: '8px 12px',
              fontSize: '12px',
            }}
            labelFormatter={(value) => `Time: ${value}`}
            formatter={(value: any, name: any) => {
              // Handle the value being a number or string
              const formattedValue = typeof value === 'number' 
                ? `${value.toFixed(1)}%` 
                : value;
              return [formattedValue, getMetricLabel(String(name))];
            }}
          />
          <Line
            type="monotone"
            dataKey={metricType}
            stroke={getMetricColor(metricType)}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            animationDuration={500}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MetricsChart;