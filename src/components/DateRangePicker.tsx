import { useState, useEffect } from 'react';
import { Calendar, X } from 'lucide-react';
import { DayPicker, DateRange } from 'react-day-picker';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { vi } from 'date-fns/locale';

interface DateRangePickerProps {
  onChange: (range: DateRange | undefined) => void;
  initialRange?: DateRange;
  placeholder?: string;
}

export function DateRangePicker({ onChange, initialRange, placeholder = 'Chọn khoảng thời gian' }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(initialRange);

  useEffect(() => {
    if (initialRange) {
      setSelectedRange(initialRange);
    }
  }, [initialRange]);

  const handleSelect = (range: DateRange | undefined) => {
    setSelectedRange(range);
    onChange(range);
    if (range?.to) {
      setOpen(false);
    }
  };

  const formatRange = (range: DateRange | undefined): string => {
    if (!range?.from) return placeholder;
    if (!range.to) return format(range.from, 'dd/MM/yyyy', { locale: vi });
    return `${format(range.from, 'dd/MM/yyyy', { locale: vi })} - ${format(range.to, 'dd/MM/yyyy', { locale: vi })}`;
  };

  const presets = [
    { label: 'Tháng này', range: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) } },
    { label: 'Tháng trước', range: { from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) } },
    { label: 'Quý này', range: { from: startOfMonth(subMonths(new Date(), (new Date().getMonth()) % 3)), to: endOfMonth(new Date()) } },
    { label: 'Năm nay', range: { from: new Date(new Date().getFullYear(), 0, 1), to: new Date(new Date().getFullYear(), 11, 31) } },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Calendar className="w-4 h-4 text-gray-500" />
        <span className="truncate max-w-[180px]">{formatRange(selectedRange)}</span>
        {selectedRange?.from && (
          <button
            type="button"
            className="ml-1 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedRange(undefined);
              onChange(undefined);
            }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </button>

      {open && (
        <div className="fixed z-50 mt-1 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 animate-fade-in">
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Nhanh</p>
            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className="px-3 py-1 text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                  onClick={() => handleSelect(preset.range as DateRange)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <DayPicker
            mode="range"
            selected={selectedRange}
            onSelect={handleSelect}
            locale={vi}
          />

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              onClick={() => setOpen(false)}
            >
              Đóng
            </button>
            <button
              type="button"
              className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
              onClick={() => setOpen(false)}
              disabled={!selectedRange?.to}
            >
              Áp dụng
            </button>
          </div>
        </div>
      )}

      <style>{`
        .animate-fade-in {
          animation: fadeIn 150ms ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}