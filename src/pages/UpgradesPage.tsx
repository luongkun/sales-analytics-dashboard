import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Package,
  BarChart3,
  Brain,
  FileText,
  Plug,
  Headset,
  Crown,
  Rocket,
  Wallet,
  Check,
  X,
  AlertTriangle,
  LucideIcon,
} from 'lucide-react';
import { upgrades, Upgrade } from '../data/upgrades';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatNumber } from '../data/salesData';
import { useToast } from '../context/ToastContext';
import AnimatedSection from '../components/AnimatedSection';

const iconMap: Record<string, LucideIcon> = {
  rocket: Rocket,
  brain: Brain,
  file: FileText,
  plug: Plug,
  headset: Headset,
  crown: Crown,
  bar: BarChart3,
};

function UpgradeCard({
  upgrade,
  justBought,
  onBuy,
}: {
  upgrade: Upgrade;
  justBought: boolean;
  onBuy: (upgrade: Upgrade) => void;
}) {
  const { user } = useAuth();
  const Icon = iconMap[upgrade.icon] || Package;
  const owned = user?.purchasedUpgrades?.includes(upgrade.id) ?? false;
  const canAfford = (user?.balance ?? 0) >= upgrade.price;

  return (
    <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col group relative">
      <div className={`bg-gradient-to-br ${upgrade.gradient} p-5 relative overflow-hidden`}>
        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex items-start justify-between relative">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
            <Icon className="w-6 h-6 text-white" />
          </div>
          <span className="text-xs font-mono text-white/80 bg-white/15 backdrop-blur-sm px-2 py-1 rounded-lg">
            {upgrade.id}
          </span>
        </div>
        <h3 className="text-lg font-bold text-white mt-3 relative">{upgrade.name}</h3>
        <p className="text-sm text-white/80 mt-1 relative">{upgrade.description}</p>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <ul className="space-y-2 flex-1">
          {upgrade.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
              <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              {feature}
            </li>
          ))}
        </ul>

        <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500">Giá</p>
            <p className="text-xl font-bold text-gradient">{formatCurrency(upgrade.price)}</p>
          </div>
          <button
            onClick={() => onBuy(upgrade)}
            disabled={owned}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex-shrink-0 ${
              owned
                ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 cursor-default'
                : justBought
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                  : canAfford
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105 active:scale-95'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {owned ? (
              'Đã kích hoạt'
            ) : justBought ? (
              <>
                <Check className="w-4 h-4" /> Đã mua
              </>
            ) : canAfford ? (
              'Mua ngay'
            ) : (
              'Không đủ số dư'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function PurchaseConfirmModal({
  upgrade,
  onClose,
  onConfirm,
}: {
  upgrade: Upgrade;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { user } = useAuth();
  const Icon = iconMap[upgrade.icon] || Package;
  const balanceBefore = user?.balance ?? 0;
  const balanceAfter = balanceBefore - upgrade.price;

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Xác nhận mua nâng cấp"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-bold text-gray-800 dark:text-white">Xác nhận mua hàng</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          <div className={`flex items-center gap-3 rounded-xl bg-gradient-to-r ${upgrade.gradient} p-4`}>
            <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white truncate">{upgrade.name}</p>
              <p className="text-xs text-white/80 truncate">{upgrade.id}</p>
            </div>
            <p className="ml-auto text-lg font-bold text-white whitespace-nowrap">
              {formatCurrency(upgrade.price)}
            </p>
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Số dư hiện tại</span>
              <span className="font-semibold text-gray-800 dark:text-white">
                {formatNumber(balanceBefore)}đ
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Chi phí</span>
              <span className="font-semibold text-red-500">- {formatNumber(upgrade.price)}đ</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
              <span className="font-bold text-gray-800 dark:text-white">Số dư sau khi mua</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {formatNumber(balanceAfter)}đ
              </span>
            </div>
          </div>

          <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 mt-4">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            Giao dịch không thể hoàn tác sau khi xác nhận.
          </p>
        </div>

        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Xác nhận mua
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function UpgradesPage() {
  const { user, purchaseUpgrade } = useAuth();
  const { showToast } = useToast();
  const [pending, setPending] = useState<Upgrade | null>(null);
  const [justBoughtId, setJustBoughtId] = useState<string | null>(null);

  const handleBuy = (upgrade: Upgrade) => {
    if (!user) return;
    if (user.balance < upgrade.price) {
      showToast({
        type: 'warning',
        title: 'Số dư không đủ',
        message: `Bạn cần thêm ${formatNumber(upgrade.price - user.balance)}đ để mua gói này.`,
        duration: 3000,
      });
      return;
    }
    setPending(upgrade);
  };

  const handleConfirm = async () => {
    if (!pending) return;
    const ok = await purchaseUpgrade(pending.id, pending.price);
    if (ok) {
      setJustBoughtId(pending.id);
      setTimeout(() => setJustBoughtId(null), 1500);
      showToast({
        type: 'success',
        title: 'Nâng cấp thành công! 🎉',
        message: `${pending.name} đã được kích hoạt.`,
        duration: 3500,
      });
    } else {
      showToast({
        type: 'error',
        title: 'Mua gói thất bại',
        message: 'Số dư không đủ hoặc có lỗi từ máy chủ.',
        duration: 3500,
      });
    }
    setPending(null);
  };

  return (
    <div className="space-y-6">
      <AnimatedSection delay={0}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Nâng cấp</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Mở khóa tính năng cao cấp, thanh toán trực tiếp bằng số dư tài khoản
            </p>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-100 dark:border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 dark:from-emerald-400/10 dark:to-teal-400/5 px-4 py-3 self-start">
            <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Số dư khả dụng
              </p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 leading-tight">
                {formatNumber(user?.balance ?? 0)}đ
              </p>
            </div>
          </div>
        </div>
      </AnimatedSection>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {upgrades.map((upgrade, index) => (
          <AnimatedSection key={upgrade.id} delay={index * 60}>
            <UpgradeCard upgrade={upgrade} justBought={justBoughtId === upgrade.id} onBuy={handleBuy} />
          </AnimatedSection>
        ))}
      </div>

      {pending && (
        <PurchaseConfirmModal
          upgrade={pending}
          onClose={() => setPending(null)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}
