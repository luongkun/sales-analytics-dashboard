export interface Upgrade {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: string;
  gradient: string;
  features: string[];
}

export const upgrades: Upgrade[] = [
  {
    id: 'UP-01',
    name: 'Gói Pro',
    description: 'Mở khóa toàn bộ sức mạnh dashboard cho cá nhân.',
    price: 199000,
    icon: 'rocket',
    gradient: 'from-blue-500 to-indigo-600',
    features: [
      'Không giới hạn số trang & biểu đồ',
      'Chế độ tối ưu hiệu năng',
      'Lưu cấu hình dashboard đám mây',
    ],
  },
  {
    id: 'UP-06',
    name: 'Gói Doanh nghiệp',
    description: 'Giải pháp toàn diện cho đội ngũ lớn.',
    price: 999000,
    icon: 'crown',
    gradient: 'from-slate-600 to-gray-800',
    features: [
      'Tất cả tính năng các gói',
      'Không giới hạn thành viên',
      'Quản trị phân quyền nâng cao',
    ],
  },
];
