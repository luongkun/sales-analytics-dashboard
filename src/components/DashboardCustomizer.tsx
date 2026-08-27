import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, LayoutDashboard, BarChart3, ShoppingCart, TrendingUp, X, Save, RotateCcw } from 'lucide-react';
import { cn } from '../utils/cn';

interface DashboardWidget {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
  order: number;
}

const availableWidgets: Omit<DashboardWidget, 'order'>[] = [
  { id: 'stats', title: 'Chỉ số tổng quan', icon: LayoutDashboard, enabled: true },
  { id: 'revenue', title: 'Biểu đồ doanh thu', icon: BarChart3, enabled: true },
  { id: 'category', title: 'Doanh thu danh mục', icon: BarChart3, enabled: true },
  { id: 'region', title: 'Doanh thu khu vực', icon: BarChart3, enabled: true },
  { id: 'topProducts', title: 'Sản phẩm bán chạy', icon: ShoppingCart, enabled: true },
  { id: 'orders', title: 'Đơn hàng gần đây', icon: ShoppingCart, enabled: true },
  { id: 'orderTrend', title: 'Xu hướng đơn hàng', icon: TrendingUp, enabled: true },
];

interface SortableWidgetProps {
  widget: DashboardWidget;
  index: number;
  onRemove: (id: string) => void;
  onToggle: (id: string) => void;
}

function SortableWidget({ widget, onRemove, onToggle }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700',
        isDragging && 'shadow-lg ring-2 ring-blue-500'
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing rounded transition-colors"
        aria-label={`Kéo để sắp xếp ${widget.title}`}
      >
        <GripVertical className="w-5 h-5" />
      </button>
      
      <widget.icon className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />
      
      <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
        {widget.title}
      </span>
      
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle(widget.id);
        }}
        className={cn(
          'flex-shrink-0 w-5 h-5 rounded transition-colors',
          widget.enabled
            ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30'
            : 'text-gray-400 bg-gray-100 dark:bg-gray-800'
        )}
        aria-label={widget.enabled ? 'Ẩn widget' : 'Hiện widget'}
        aria-pressed={widget.enabled}
      >
        {widget.enabled ? (
          <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )}
      </button>
      
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(widget.id);
        }}
        className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 rounded transition-colors opacity-0 group-hover:opacity-100"
        aria-label={`Xóa ${widget.title}`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function DashboardCustomizer() {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(() => {
    const saved = localStorage.getItem('dashboard-widgets');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return availableWidgets.map((w, i) => ({ ...w, order: i }));
      }
    }
    return availableWidgets.map((w, i) => ({ ...w, order: i }));
  });

  const [isOpen, setIsOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((w) => w.id === active.id);
        const newIndex = items.findIndex((w) => w.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        return newItems.map((w, i) => ({ ...w, order: i }));
      });
    }
  }, []);

  const handleRemove = useCallback((id: string) => {
    setWidgets((prev) => {
      const newWidgets = prev.filter((w) => w.id !== id);
      const enabledCount = newWidgets.filter((w) => w.enabled).length;
      if (enabledCount === 0 && newWidgets.length > 0) {
        return newWidgets.map((w, i) => ({ ...w, enabled: i === 0, order: i }));
      }
      return newWidgets.map((w, i) => ({ ...w, order: i }));
    });
  }, []);

  const handleToggle = useCallback((id: string) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w))
    );
  }, []);

  const handleSave = useCallback(() => {
    localStorage.setItem('dashboard-widgets', JSON.stringify(widgets));
    setIsOpen(false);
  }, [widgets]);

  const handleReset = useCallback(() => {
    const defaultWidgets = availableWidgets.map((w, i) => ({ ...w, order: i }));
    setWidgets(defaultWidgets);
    localStorage.setItem('dashboard-widgets', JSON.stringify(defaultWidgets));
  }, []);

  const enabledWidgets = widgets.filter((w) => w.enabled).sort((a, b) => a.order - b.order);
  const disabledWidgets = widgets.filter((w) => !w.enabled).sort((a, b) => a.order - b.order);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-40 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        aria-label="Tùy chỉnh dashboard"
      >
        <LayoutDashboard className="w-6 h-6" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-2xl max-h-[80vh] bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">Tùy chỉnh Dashboard</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Mặc định</span>
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Widgets đang hiển thị (kéo để sắp xếp)
                </h3>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={enabledWidgets.map((w) => w.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2" role="list" aria-label="Widgets đang hiển thị">
                      {enabledWidgets.map((widget, index) => (
                        <SortableWidget
                          key={widget.id}
                          widget={widget}
                          index={index}
                          onRemove={handleRemove}
                          onToggle={handleToggle}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>

              {disabledWidgets.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Widgets ẩn (bật để hiển thị)
                  </h3>
                  <div className="space-y-2">
                    {disabledWidgets.map((widget) => (
                      <div
                        key={widget.id}
                        className="group flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 opacity-60"
                      >
                        <widget.icon className="w-5 h-5 text-gray-500 dark:text-gray-500 flex-shrink-0" />
                        <span className="flex-1 text-sm text-gray-600 dark:text-gray-400 truncate">
                          {widget.title}
                        </span>
                        <button
                          onClick={() => handleToggle(widget.id)}
                          className="flex-shrink-0 w-5 h-5 rounded text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          aria-label={`Hiện ${widget.title}`}
                        >
                          <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu thay đổi</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default DashboardCustomizer;