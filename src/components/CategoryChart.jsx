import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '../data/salesData';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{payload[0].name}</p>
        <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mt-1">
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={13}
      fontWeight={600}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function CategoryChart({ data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
      <div className="mb-6">
        <h3 className="text-base font-bold text-gray-800 dark:text-white">Doanh thu theo danh mục</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Phân bổ doanh thu theo loại sản phẩm</p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={95}
              paddingAngle={3}
              dataKey="value"
              labelLine={false}
              label={renderCustomizedLabel}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        <div className="flex flex-col gap-3 min-w-[160px]">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-3">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              ></span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {formatCurrency(item.value)} · {((item.value / total) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
