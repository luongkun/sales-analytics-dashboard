import { User } from '../context/AuthContext';

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

export default function Avatar({ user, size }: AvatarProps) {
  const sizeCls =
    size === 'sm'
      ? 'w-9 h-9'
      : size === 'md'
        ? 'w-10 h-10'
        : size === 'lg'
          ? 'w-24 h-24'
          : 'w-32 h-32';
  if (user.avatar && !user.avatar.startsWith('gradient:')) {
    return (
      <img
        src={user.avatar}
        alt={user.name}
        className={`${sizeCls} rounded-full object-cover flex-shrink-0 shadow-md ring-2 ring-white dark:ring-gray-800`}
      />
    );
  }
  const initials = initialsOf(user.name);
  return (
    <div
      className={`${sizeCls} bg-gradient-to-br ${getAvatarGradient(user.avatar)} rounded-full flex items-center justify-center shadow-md shadow-blue-500/30 ring-2 ring-white dark:ring-gray-800 flex-shrink-0`}
    >
      <span
        className={`${size === 'lg' ? 'text-3xl' : size === 'xl' ? 'text-4xl' : 'text-sm'} font-bold text-white`}
      >
        {initials}
      </span>
    </div>
  );
}
