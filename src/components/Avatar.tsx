import { User } from '../context/AuthContext';
import { Crown } from 'lucide-react';
import { getVipInfo } from '../utils/vip';

export const AVATAR_GRADIENTS: Record<string, string> = {
  default: 'from-blue-500 to-indigo-600',
  purple: 'from-purple-500 to-fuchsia-600',
  emerald: 'from-emerald-500 to-teal-600',
  orange: 'from-orange-500 to-amber-600',
  rose: 'from-rose-500 to-pink-600',
  slate: 'from-slate-600 to-gray-800',
};

export function getAvatarGradient(avatar?: string): string {
  if (avatar?.startsWith('gradient:')) {
    return AVATAR_GRADIENTS[avatar.slice(9)] ?? AVATAR_GRADIENTS.default;
  }
  return AVATAR_GRADIENTS.default;
}

export function initialsOf(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(-2)
    .join('')
    .toUpperCase();
}

interface AvatarProps {
  user: User;
  size: 'sm' | 'md' | 'lg' | 'xl';
}

/** Huy hiệu vương miện VIP ở góc avatar (chỉ hiện từ VIP 1 trở lên) */
function VipCrown({ level, size }: { level: number; size: 'sm' | 'md' | 'lg' | 'xl' }) {
  const box =
    size === 'sm' ? 'w-[15px] h-[15px] -bottom-0.5 -right-0.5' :
    size === 'md' ? 'w-[17px] h-[17px] -bottom-0.5 -right-0.5' :
    size === 'lg' ? 'w-8 h-8 -bottom-1 -right-1' :
    'w-10 h-10 -bottom-1 -right-1';
  const icon =
    size === 'sm' || size === 'md' ? 'w-2.5 h-2.5' :
    size === 'lg' ? 'w-4 h-4' : 'w-5 h-5';
  return (
    <span
      className={`absolute ${box} rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center ring-2 ring-white dark:ring-gray-800 shadow-md shadow-amber-500/40`}
      title={`VIP ${level}`}
      aria-label={`Huy hiệu VIP cấp ${level}`}
    >
      <Crown className={`${icon} text-white`} strokeWidth={2.5} />
    </span>
  );
}

export default function Avatar({ user, size }: AvatarProps) {
  const sizeCls =
    size === 'sm'
      ? 'w-9 h-9'
      : size === 'md'
        ? 'w-10 h-10'
        : size === 'lg'
          ? 'w-24 h-24'
          : 'w-32 h-32';
  const vip = getVipInfo(user.totalTopup ?? 0);
  const showCrown = !!vip.tier;

  if (user.avatar && !user.avatar.startsWith('gradient:')) {
    return (
      <span className={`relative inline-flex flex-shrink-0 ${size === 'lg' || size === 'xl' ? 'block' : ''}`}>
        <img
          src={user.avatar}
          alt={user.name}
          className={`${sizeCls} rounded-full object-cover flex-shrink-0 shadow-md ring-2 ring-white dark:ring-gray-800`}
        />
        {showCrown && <VipCrown level={vip.tier!.level} size={size} />}
      </span>
    );
  }
  const initials = initialsOf(user.name);
  return (
    <span className={`relative inline-flex flex-shrink-0 ${size === 'lg' || size === 'xl' ? 'block' : ''}`}>
      <div
        className={`${sizeCls} bg-gradient-to-br ${getAvatarGradient(user.avatar)} rounded-full flex items-center justify-center shadow-md shadow-blue-500/30 ring-2 ring-white dark:ring-gray-800 flex-shrink-0`}
      >
        <span
          className={`${size === 'lg' ? 'text-3xl' : size === 'xl' ? 'text-4xl' : 'text-sm'} font-bold text-white`}
        >
          {initials}
        </span>
      </div>
      {showCrown && <VipCrown level={vip.tier!.level} size={size} />}
    </span>
  );
}
