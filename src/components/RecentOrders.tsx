import { Package } from 'lucide-react';
import { formatCurrency, RecentOrder } from '../data/salesData';

interface RecentOrdersProps {
  data: RecentOrder[];
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'Hoàn thành':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'Đang xử lý':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'Đang giao':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'Đã hủy':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
  }
};

const RecentOrders = ({ data }: RecentOrdersProps) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Package className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Đơn Hàng Gần Đây</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">Mã ĐH</th>
              <th className="px-4 py-3 font-medium">Khách Hàng</th>
              <th className="px-4 py-3 font-medium">Sản Phẩm</th>
              <th className="px-4 py-3 font-medium text-center">Số Lượng</th>
              <th className="px-4 py-3 font-medium text-right">Tổng Tiền</th>
              <th className="px-4 py-3 font-medium">Ngày Đặt</th>
              <th className="px-4 py-3 font-medium text-center">Trạng Thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {data.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{order.id}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{order.customer}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{order.product}</td>
                <td className="px-4 py-3 text-center">
                  {order.quantity > 0 ? (
                    <span
                      className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-semibold ${
                        order.quantity > 1
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      ×{order.quantity}
                    </span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                  {formatCurrency(order.amount)}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{order.date}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecentOrders;