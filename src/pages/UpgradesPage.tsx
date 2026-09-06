import { Crown, Rocket, Wallet } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StaggeredFadeIn } from '../components/Skeleton';
import { UPGRADES } from '../data/static';
import { formatVND } from '../lib/formatters';
import { MiniCart } from '../components/MiniCart';

export function UpgradesPage() {
  const { user, purchaseUpgrade } = useAuth();
  const toast = useToast();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const balance = user?.balance ?? 0;

  const buy = async (id: string, price: number, name: string) => {
    if (processing) return;
    if (balance < price) {
      toast.showToast({ type: 'warning', title: 'Không đủ số dư', message: `Cần thêm ${formatVND(price - balance)}đ để mua ${name}` });
      return;
    }
    setProcessing(true);
    const res = await purchaseUpgrade(id, price);
    setProcessing(false);
    if (res.ok) {
      toast.showToast({ type: 'success', title: 'Mua gói thành công! 🎉', message: `${name} đã được kích hoạt trên tài khoản của bạn.`, duration: 5000 });
      setConfirming(null);
    } else {
      toast.showToast({ type: 'error', title: 'Mua gói thất bại', message: res.error });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Nâng cấp</h2>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Mở khóa tính năng cao cấp, thanh toán trực tiếp bằng số dư tài khoản</p>
      </div>

      <div className="card-lift bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-200/50 dark:border-indigo-500/20 rounded-2xl p-5 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <Wallet size={20} className="text-white" />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Số dư khả dụng</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatVND(balance)}đ</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {UPGRADES.map((u, i) => {
          const owned = user?.purchasedUpgrades?.includes(u.id);
          const enough = balance >= u.price;
          return (
            <StaggeredFadeIn key={u.id} delay={100 + i * 80}>
              <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col group">
                <div className={`bg-gradient-to-br ${u.gradient} p-5 relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-start justify-between relative">
                    <div className="w-12 h-12 rounded-xl bg-black shadow-lg shadow-black/40 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                      {u.icon === 'rocket' ? <Rocket size={22} className="text-white" /> : <Crown size={22} className="text-white" />}
                    </div>
                    <span className="text-xs font-mono text-white/80 bg-white/15 backdrop-blur-sm px-2 py-1 rounded-lg">{u.id}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-white">{u.name}</h3>
                  <p className="text-xs text-white/75 mt-0.5">{u.description}</p>
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <p className="text-2xl font-bold text-gradient">{formatVND(u.price)}đ</p>
                  <ul className="mt-4 space-y-2.5 flex-1">
                    {u.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-300">
                        <span className="w-4.5 h-4.5 mt-0.5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0 text-[10px]">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  {owned ? (
                    <button disabled className="mt-5 w-full py-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-bold cursor-not-allowed">
                      ✓ Đã mua
                    </button>
                  ) : !enough ? (
                    <button disabled className="mt-5 w-full py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-400 text-sm font-bold cursor-not-allowed">
                      Không đủ số dư
                    </button>
                  ) : confirming === u.id ? (
                    <div className="mt-5 space-y-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">Giao dịch không thể hoàn tác sau khi xác nhận.</p>
                      <button
                        onClick={() => buy(u.id, u.price, u.name)}
                        disabled={processing}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-bold shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {processing ? (
                          <>
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Đang xử lý...
                          </>
                        ) : (
                          `Xác nhận mua ${formatVND(u.price)}đ`
                        )}
                      </button>
                      <button onClick={() => setConfirming(null)} className="w-full text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        Hủy
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirming(u.id)}
                      className="mt-5 w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-bold shadow-lg shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98] transition-transform"
                    >
                      Mua ngay
                    </button>
                  )}
                </div>
              </div>
            </StaggeredFadeIn>
          );
        })}
      </div>

      <MiniCart />
    </div>
  );
}
