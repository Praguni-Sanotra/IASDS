import React from 'react';
import { ChevronLeft, ChevronRight, Loader2, Inbox } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Column {
  key: string;
  header: string;
  render?: (row: any) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  isLoading: boolean;
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleAll: () => void;
}

export function DataTable({
  columns,
  data,
  isLoading,
  total,
  page,
  limit,
  onPageChange,
  onLimitChange,
  selectedIds,
  onToggleSelect,
  onToggleAll
}: DataTableProps) {
  const isAllSelected = data.length > 0 && selectedIds.length === data.length;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 dark:bg-zinc-800/50 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th scope="col" className="p-4 w-4">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={onToggleAll}
                  className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                />
              </th>
              {columns.map(col => (
                <th key={col.key} scope="col" className="px-6 py-3 font-medium">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800/50 animate-pulse">
                  <td className="p-4"><div className="h-4 w-4 bg-zinc-200 dark:bg-zinc-700 rounded"></div></td>
                  {columns.map(col => (
                    <td key={col.key} className="px-6 py-4"><div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4"></div></td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-6 py-12 text-center text-zinc-500">
                  <div className="flex flex-col items-center justify-center">
                    <Inbox className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mb-3" />
                    <p className="text-sm font-medium">No data yet. Add your first record.</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map(row => (
                <tr key={row._id} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(row._id)}
                      onChange={() => onToggleSelect(row._id)}
                      className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                    />
                  </td>
                  {columns.map(col => (
                    <td key={col.key} className="px-6 py-4 text-zinc-700 dark:text-zinc-300">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!isLoading && data.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <span className="text-sm text-zinc-500 mb-4 sm:mb-0">
            Showing <span className="font-semibold text-zinc-900 dark:text-zinc-100">{(page - 1) * limit + 1}</span> to <span className="font-semibold text-zinc-900 dark:text-zinc-100">{Math.min(page * limit, total)}</span> of <span className="font-semibold text-zinc-900 dark:text-zinc-100">{total}</span>
          </span>
          <div className="flex items-center gap-4">
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2"
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
            </select>
            <div className="flex gap-1">
              <button
                disabled={page === 1}
                onClick={() => onPageChange(page - 1)}
                className="p-2 border border-zinc-300 dark:border-zinc-700 rounded-lg disabled:opacity-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={page * limit >= total}
                onClick={() => onPageChange(page + 1)}
                className="p-2 border border-zinc-300 dark:border-zinc-700 rounded-lg disabled:opacity-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
