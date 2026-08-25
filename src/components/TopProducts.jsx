import { formatCurrency, formatNumber } from '../data/salesData';
import { Trophy, Medal } from 'lucide-react';

const categoryColors = {
  'Điện tử': 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  'Thời trang': 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
  'Thực phẩm': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  'Gia dụng': 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
};

export default function TopProducts({ data }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-bold text-gray-800 dark:text-white">Sản phẩm bán chạy</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Top 8 sản phẩm doanh thu cao nhất</p>
        </div>
        <Trophy className="w-5 h-5 text-amber-500" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700">
              <th className="text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider pb-3 pr-2">
                #
              </th>
              <th className="text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider pb-3 pr-4">
                Sản phẩm
              </th>
              <th className="text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider pb-3 pr-4 hidden sm:table-cell">
                Danh mục
              </th>
              <th className="text-right text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider pb-3 pr-4 hidden md:table-cell">
                Đã bán
              </th>
              <th className="text-right text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider pb-3">
                Doanh thu
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((product) => (
              <tr
                key={product.rank}
                className="border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <td className="py-3 pr-2">
                  {product.rank <= 3 ? (
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        product.rank === 1
                          ? 'bg-amber-400'
                          : product.rank === 2
                          ? 'bg-gray-400'
                          : 'bg-orange-400'
                      }`}
                    >
                      {product.rank}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400 dark:text-gray-500 ml-1.5">{product.rank}</span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{product.name}</p>
                </td>
                <td className="py-3 pr-4 hidden sm:table-cell">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      categoryColors[product.category] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {product.category}
                  </span>
                </td>
                <td className="py-3 pr-4 text-right hidden md:table-cell">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{formatNumber(product.sold)}</span>
                </td>
                <td className="py-3 text-right">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {formatCurrency(product.revenue)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
