import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '../data/salesData';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="text-sm font-semibold text-gray-700 mb-2">{label}</p>
        {payload.map((entry) => (
          <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function RegionChart({ data }) {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200">
      <div className="mb-6">
        <h3 className="text-base font-bold text-gray-800">Doanh thu theo khu vực</h3>
        <p className="text-sm text-gray-500 mt-0.5">So sánh doanh thu 4 quý theo vùng miền</p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="region"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#9ca3af' }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#9ca3af' }}
            tickFormatter={(value) => `${(value / 1000000).toFixed(0)}tr`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px' }}
            iconType="circle"
            iconSize={8}
          />
          <Bar dataKey="q1" name="Quý 1" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
          <Bar dataKey="q2" name="Quý 2" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={20} />
          <Bar dataKey="q3" name="Quý 3" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
          <Bar dataKey="q4" name="Quý 4" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
