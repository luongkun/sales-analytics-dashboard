import { cn } from '../utils/cn';
import React, { ReactNode, ComponentType } from 'react';

interface EmptyStateProps {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  illustration?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
  illustration,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      {illustration ? (
        <div className="mb-4 text-gray-400 dark:text-gray-500">{illustration}</div>
      ) : icon ? (
        <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-400 dark:text-gray-500">
          {React.createElement(icon, { className: 'w-10 h-10' })}
        </div>
      ) : null}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      {description && (
        <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}

export function EmptyTableState({ columns = 5, className = '' }: { columns?: number; className?: string }) {
  return (
    <tbody className={cn(className)}>
      <tr>
        <td colSpan={columns} className="py-12">
          <EmptyState
            illustration={
              <svg className="w-10 h-10 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            title="Không có dữ liệu"
            description="Chưa có bản ghi nào được tìm thấy. Hãy thử điều chỉnh bộ lọc hoặc thêm dữ liệu mới."
          />
        </td>
      </tr>
    </tbody>
  );
}