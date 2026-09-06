/**
 * PageStub — placeholder cho các trang dữ liệu (phase 2/3 sẽ thay bằng
 * implementation thật). Hiển thị tiêu đề trang + "Đang được dựng lại...".
 */

import { Wrench } from 'lucide-react';

export default function PageStub({ title }: { title: string }) {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 animate-fade-up">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h2>
      </div>
      <div className="card-lift bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-10 flex flex-col items-center text-center gap-4 animate-fade-up">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 flex items-center justify-center">
          <Wrench className="w-7 h-7 text-blue-500" aria-hidden />
        </div>
        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">Đang được dựng lại...</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
          Trang này sẽ được hoàn thiện ở giai đoạn tiếp theo — khung giao diện, điều hướng và hạ tầng đã sẵn sàng.
        </p>
      </div>
    </div>
  );
}
