import { useState, useEffect } from 'react';
import { Users, Edit, Trash2, Shield, X, RefreshCw, Search, Package } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatNumber } from '../data/salesData';
import AnimatedSection from '../components/AnimatedSection';

interface UserData {
  email: string;
  name: string;
  role: string;
  balance: number;
  avatar: string | null;
  googleOnly: boolean;
  createdAt: number;
  purchases: string[];
  orderCount: number;
  transactions: number;
}

export default function AdminPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [editBalance, setEditBalance] = useState('');
  const [editRole, setEditRole] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api<{ users: UserData[] }>('/admin/users');
      setUsers(res.users);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi không xác định';
      showToast({ type: 'error', title: 'Không thể tải danh sách người dùng', message: msg });
      console.error('Admin fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (u: UserData) => {
    setEditingUser(u);
    setEditBalance(String(u.balance));
    setEditRole(u.role);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      await api('/admin/users/' + editingUser.email, {
        method: 'PUT',
        body: { balance: parseInt(editBalance) || 0, role: editRole },
      });
      showToast({ type: 'success', title: 'Cập nhật thành công' });
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi không xác định';
      showToast({ type: 'error', title: 'Cập nhật thất bại', message: msg });
      setEditingUser(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (email: string) => {
    if (!confirm(`Xóa người dùng ${email}?`)) return;
    try {
      await api('/admin/users/' + email, { method: 'DELETE' });
      showToast({ type: 'success', title: 'Đã xóa người dùng' });
      fetchUsers();
    } catch {
      showToast({ type: 'error', title: 'Xóa thất bại' });
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 dark:text-gray-400">Bạn cần quyền quản trị viên để xem trang này.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnimatedSection delay={0}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Quản lý người dùng</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Quản lý tài khoản, số dư và quyền hạn
            </p>
          </div>
          <button
            onClick={fetchUsers}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Làm mới
          </button>
        </div>
      </AnimatedSection>

      <AnimatedSection delay={100}>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm theo email hoặc tên..."
              className="flex-1 bg-transparent border-0 outline-none text-gray-800 dark:text-white placeholder-gray-400"
            />
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-gray-500 dark:text-gray-400">
                <Users className="w-12 h-12 mb-3 opacity-50" />
                <p>Không tìm thấy người dùng</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 uppercase text-xs font-semibold tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Tên</th>
                    <th className="px-4 py-3 text-left">Vai trò</th>
                    <th className="px-4 py-3 text-right">Số dư</th>
                    <th className="px-4 py-3 text-center">Gói</th>
                    <th className="px-4 py-3 text-center">Đơn</th>
                    <th className="px-4 py-3 text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredUsers.map((u) => (
                    <tr key={u.email} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-white">
                        {u.email}
                        {u.googleOnly && (
                          <span className="ml-2 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
                            Google
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{u.name}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-bold uppercase px-2 py-1 rounded-full ${
                            u.role === 'admin'
                              ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400'
                              : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          {u.role === 'admin' && <Shield className="w-3 h-3" />}
                          {u.role === 'admin' ? 'Admin' : 'Thành viên'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatNumber(u.balance)}đ
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full">
                          <Package className="w-3 h-3" />
                          {u.purchases.length}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">{u.orderCount}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(u)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {u.email !== 'admin@luongkun.io' && (
                            <button
                              onClick={() => handleDelete(u.email)}
                              className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"
                              title="Xóa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
            {filteredUsers.length} người dùng
          </div>
        </div>
      </AnimatedSection>

      {/* Edit modal */}
      {editingUser && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setEditingUser(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl w-full max-w-md overflow-hidden animate-pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-bold text-gray-800 dark:text-white">Chỉnh sửa người dùng</h2>
              <button
                onClick={() => setEditingUser(null)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">
                  Email
                </label>
                <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-gray-600 dark:text-gray-300 text-sm">
                  {editingUser.email}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">
                  Số dư
                </label>
                <input
                  type="number"
                  value={editBalance}
                  onChange={(e) => setEditBalance(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">
                  Vai trò
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="member">Thành viên</option>
                  <option value="admin">Quản trị viên</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setEditingUser(null)}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex-1 py-2.5 font-bold rounded-xl transition-all bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}