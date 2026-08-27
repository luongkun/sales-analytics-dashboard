import { FileSpreadsheet } from 'lucide-react';
import { useState } from 'react';
import { exportToCSV, formatDataForExport } from '../utils/export';

interface ExportColumn<T> {
  key: keyof T;
  label: string;
  format?: (value: T[keyof T]) => string;
}

interface ExportButtonProps<T> {
  data: T[];
  filename: string;
  columns: ExportColumn<T>[];
  className?: string;
  children?: React.ReactNode;
}

export function ExportButton<T>({
  data,
  filename,
  columns,
  className = '',
  children,
}: ExportButtonProps<T>) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    if (data.length === 0) return;
    setIsExporting(true);
    try {
      const formattedData = formatDataForExport(data, columns);
      exportToCSV(formattedData, { filename });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={data.length === 0 || isExporting}
      className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
    >
      {isExporting ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <FileSpreadsheet className="w-4 h-4" />
      )}
      {children || 'Xuất CSV'}
    </button>
  );
}