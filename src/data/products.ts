export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  totalSlots: number;
  bookedSlots: number;
  gradient: string;
  icon: string;
}

export const products: Product[] = [
  {
    id: 'PRD-NETFLIX',
    name: 'Netflix Trial 30 days',
    description: 'Dùng thử Netflix Premium trọn 30 ngày — 4K Ultra HD, xem trên 4 thiết bị, hủy bất cứ lúc nào.',
    price: 20_000,
    totalSlots: 100,
    bookedSlots: 0,
    gradient: 'from-red-600 to-red-800',
    icon: 'netflix',
  },
];

export const remainingSlots = (p: Product): number => p.totalSlots - p.bookedSlots;

export const VIETQR = {
  bank: 'VCB',
  accountName: 'LUONG VAN KUN',
  accountNumber: '0123456789',
};
