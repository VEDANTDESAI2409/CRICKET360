import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Inbox } from 'lucide-react';

export interface Column<T> {
  id: string;
  header: React.ReactNode;
  render?: (item: T) => React.ReactNode;
  accessor?: keyof T;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T, index: number) => string | number;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (columnId: string) => void;
  loading?: boolean;
  emptyTitle?: string;
  emptySubtitle?: string;
  emptyIcon?: React.ReactNode;
  onRowClick?: (item: T) => void;
  className?: string;
}

export function Table<T>({
  data,
  columns,
  keyExtractor,
  sortKey,
  sortDirection,
  onSort,
  loading = false,
  emptyTitle = 'No records found',
  emptySubtitle = 'There are no items to display at this time.',
  emptyIcon,
  onRowClick,
  className = '',
}: TableProps<T>): React.ReactElement {
  const getAlignmentClass = (align?: 'left' | 'center' | 'right') => {
    if (align === 'center') return 'text-center';
    if (align === 'right') return 'text-right';
    return 'text-left';
  };

  return (
    <div className={`w-full overflow-hidden rounded-xl border border-retail-border bg-white ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#FAFBFB] border-b border-retail-border text-[11px] font-semibold text-retail-muted uppercase tracking-wider select-none">
              {columns.map((col) => {
                const isSorted = sortKey === col.id;
                return (
                  <th
                    key={col.id}
                    className={`px-4 py-3 ${getAlignmentClass(col.align)} ${col.className || ''}`}
                  >
                    {col.sortable && onSort ? (
                      <button
                        onClick={() => onSort(col.id)}
                        className="inline-flex items-center gap-1.5 hover:text-retail-text transition-colors focus:outline-none"
                      >
                        <span>{col.header}</span>
                        {isSorted ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp size={12} className="text-brand-primary" />
                          ) : (
                            <ArrowDown size={12} className="text-brand-primary" />
                          )
                        ) : (
                          <ArrowUpDown size={12} className="text-retail-muted/50" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-retail-border text-xs">
            {loading ? (
              // Loading Skeleton
              Array.from({ length: 4 }).map((_, idx) => (
                <tr key={`skeleton-${idx}`} className="animate-pulse">
                  {columns.map((col) => (
                    <td key={`sk-${col.id}`} className="px-4 py-3.5">
                      <div className="h-3.5 bg-slate-100 rounded w-3/4"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              // Honest Empty State
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <div className="max-w-xs mx-auto space-y-2">
                    <div className="w-10 h-10 rounded-full bg-retail-bg mx-auto flex items-center justify-center text-retail-muted">
                      {emptyIcon || <Inbox size={20} />}
                    </div>
                    <div className="font-semibold text-retail-text text-sm">{emptyTitle}</div>
                    <p className="text-xs text-retail-muted leading-relaxed">{emptySubtitle}</p>
                  </div>
                </td>
              </tr>
            ) : (
              // Actual Data Rows
              data.map((item, index) => (
                <tr
                  key={keyExtractor(item, index)}
                  onClick={() => onRowClick?.(item)}
                  className={`
                    transition-colors duration-100
                    hover:bg-brand-light/30
                    ${onRowClick ? 'cursor-pointer' : ''}
                  `}
                >
                  {columns.map((col) => (
                    <td
                      key={col.id}
                      className={`px-4 py-3 text-retail-text ${getAlignmentClass(col.align)} ${col.className || ''}`}
                    >
                      {col.render
                        ? col.render(item)
                        : col.accessor
                        ? String(item[col.accessor] ?? '')
                        : null}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
