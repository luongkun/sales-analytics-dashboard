import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Users, UserPlus, Heart } from 'lucide-react';
import { monthlyRevenue, formatCurrency, formatNumber } from '../data/salesData';
import AnimatedSection from '../components/AnimatedSection';

const acquisitionSource = [
  { source: 'Website', value: 3200 },
  { source: 'Mobile App', value: 2800 },
  { source: 'Social Media', value: 1500 },
  { source: 'Giới thiệu', value: 935 }
];

const topCustomers = [
  { rank: 1, name: 'Nguyễn Văn A', email: 'nguyenvana@email.com', totalSpent: 125000000, orders: 32, memberSince: '2022' },
  { rank: 2, name: 'Trần Thị B', email: 'tranthib@email.com', totalSpent: 98500000, orders: 28, memberSince: '2023' },
  { rank: 3, name: 'Lê Hoàng C', email: 'lehoangc@email.com', totalSpent: 87200000, orders: 45, memberSince: '2021' },
  { rank: 4, name: 'Phạm Minh D', email: 'phamminhd@email.com', totalSpent: 76400000, orders: 19, memberSince: '2024' },
  { rank: 5, name: 'Hoàng Thị E', email: 'hoangthie@email.com', totalSpent: 65900000, orders: 24, memberSince: '2023' },
  { rank: 6, name: 'Vũ Đức F', email: 'vuducf@email.com', totalSpent: 54300000, orders: 15, memberSince: '2024' },
  { rank: 7, name: 'Đỗ Thị G', email: 'dothig@email.com', totalSpent: 43800000, orders: 12, memberSince: '2025' },
  { rank: 8, name: 'Bùi Thanh H', email: 'buithanhh@email.com', totalSpent: 38500000, orders: 10, memberSince: '2025' }
];

const CustomersPage = () => {
  return (
    <div className="space-y-6">
      <AnimatedSection delay={0.1}>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Phân tích Khách hàng</h1>
      </AnimatedSection>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AnimatedSection delay={0.2} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Tổng khách hàng</p>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white">8,435</h3>
            </div>
          </div>
        </AnimatedSection>
        
        <AnimatedSection delay={0.3} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <UserPlus size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Khách hàng mới T12</p>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white">1,087</h3>
            </div>
          </div>
        </AnimatedSection>
        
        <AnimatedSection delay={0.4} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-lg">
              <Heart size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Tỷ lệ giữ chân</p>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white">78.5%</h3>
            </div>
          </div>
        </AnimatedSection>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Growth Chart */}
        <AnimatedSection delay={0.5} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Tăng trưởng khách hàng theo tháng</h2>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyRevenue} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="month" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                  formatter={(value) => [formatNumber(value), 'Khách hàng']}
                />
                <Legend />
                <Line type="monotone" dataKey="customers" name="Số lượng" stroke="#ec4899" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </AnimatedSection>

        {/* Acquisition Source Chart */}
        <AnimatedSection delay={0.6} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Nguồn khách hàng</h2>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={acquisitionSource} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                <XAxis type="number" stroke="#9ca3af" />
                <YAxis dataKey="source" type="category" stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                  formatter={(value) => [formatNumber(value), 'Khách hàng']}
                />
                <Bar dataKey="value" name="Khách hàng" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AnimatedSection>
      </div>

      {/* Top Customers Table */}
      <AnimatedSection delay={0.7} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 overflow-hidden">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Khách hàng chi tiêu cao nhất</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
                <th className="pb-3 font-medium">Rank</th>
                <th className="pb-3 font-medium">Tên khách hàng</th>
                <th className="pb-3 font-medium">Email</th>
                <th className="pb-3 font-medium text-right">Tổng chi tiêu</th>
                <th className="pb-3 font-medium text-center">Số đơn hàng</th>
                <th className="pb-3 font-medium text-center">Thành viên từ</th>
              </tr>
            </thead>
            <tbody>
              {topCustomers.map((row) => (
                <tr key={row.rank} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300">
                  <td className="py-3">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${row.rank <= 3 ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                      {row.rank}
                    </span>
                  </td>
                  <td className="py-3 font-medium">{row.name}</td>
                  <td className="py-3 text-sm text-gray-500 dark:text-gray-400">{row.email}</td>
                  <td className="py-3 font-medium text-blue-600 dark:text-blue-400 text-right">{formatCurrency(row.totalSpent)}</td>
                  <td className="py-3 text-center">{row.orders}</td>
                  <td className="py-3 text-center text-sm">{row.memberSince}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AnimatedSection>
    </div>
  );
};

export default CustomersPage;
