import { AVATAR_GRADIENTS } from '../../data/static';
import { initialsOf } from '../../lib/formatters';
import type { VipTier } from '../../lib/types';
import { Crown } from 'lucide-react';

export function Avatar({ name, avatar, size = 'md', vip }: { name: string; avatar?: string | null; size?: 'sm' | 'md' | 'lg' | 'xl'; vip?: VipTier | null }) {
  const gradient = avatar?.startsWith('gradient:') ? AVATAR_GRADIENTS[avatar.slice(9)] || AVATAR_GRADIENTS.default : AVATAR_GRADIENTS.default;
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-16 h-16 text-xl',
    xl: 'w-20 h-20 text-2xl',
  };
  const badgeSize = size === 'lg' ? 'w-6 h-6' : size === 'xl' ? 'w-8 h-8' : 'w-[15px] h-[15px]';
  return (
    <div className="relative inline-flex flex-shrink-0">
      <div
        className={`${sizes[size]} rounded-full bg-gradient-to-br ${gradient} ring-2 ring-white dark:ring-gray-800 flex items-center justify-center font-bold text-white select-none`}
      >
        {initialsOf(name)}
      </div>
      {vip && vip.level > 0 && (
        <div
          title={`VIP ${vip.level} · ${vip.name}`}
          className={`absolute -bottom-0.5 -right-0.5 ${badgeSize} bg-gradient-to-br ${
            vip.level === 4 ? 'from-purple-500 to-fuchsia-500' : vip.level === 3 ? 'from-yellow-500 to-amber-500' : vip.level === 2 ? 'from-slate-400 to-gray-300' : 'from-[#8c6239] to-[#5c3a1d]'
          } ring-2 ring-white dark:ring-gray-800 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/40`}
        >
          <Crown size={badgeSize === 'w-[15px] h-[15px]' ? 9 : 14} className="text-white" />
        </div>
      )}
    </div>
  );
}

export function VipBadge({ vip }: { vip: VipTier | null }) {
  if (!vip) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gradient-to-r ${
        vip.level === 4 ? 'from-purple-500/15 to-fuchsia-500/15 text-purple-600 dark:text-purple-300' : 'from-yellow-500/15 to-amber-500/15 text-amber-600 dark:text-amber-300'
      }`}
    >
      <Crown size={11} />
      Huy hiệu VIP {vip.level} · {vip.name}
    </span>
  );
}
