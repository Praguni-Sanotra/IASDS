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
    <div className="bg-white border border-blue-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-[10px] font-black text-blue-900 uppercase bg-blue-50/50 border-b border-blue-100 tracking-widest">
            <tr>
              <th scope="col" className="p-5 w-4">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={onToggleAll}
                  className="w-4 h-4 rounded border-blue-200 text-blue-600 focus:ring-blue-600 cursor-pointer"
                />
              </th>
              {columns.map(col => (
                <th key={col.key} scope="col" className="px-6 py-4 font-black">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-blue-50 animate-pulse">
                  <td className="p-5"><div className="h-4 w-4 bg-blue-100 rounded"></div></td>
                  {columns.map(col => (
                    <td key={col.key} className="px-6 py-5"><div className="h-4 bg-blue-50 rounded w-3/4"></div></td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                      <Inbox className="h-8 w-8 text-blue-200" />
                    </div>
                    <p className="text-sm font-bold text-blue-900">No records found</p>
                    <p className="text-xs text-slate-400 mt-1">Start by adding your first academic item.</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map(row => (
                <tr key={row._id} className="border-b border-blue-50 hover:bg-blue-50/30 transition-colors group">
                  <td className="p-5">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(row._id)}
                      onChange={() => onToggleSelect(row._id)}
                      className="w-4 h-4 rounded border-blue-200 text-blue-600 focus:ring-blue-600 cursor-pointer"
                    />
                  </td>
                  {columns.map(col => (
                    <td key={col.key} className="px-6 py-5 text-slate-700">
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
        <div className="flex flex-col sm:flex-row items-center justify-between p-5 border-t border-blue-100 bg-blue-50/20">
          <span className="text-sm font-medium text-slate-500 mb-4 sm:mb-0">
            Showing <span className="font-black text-blue-900">{(page - 1) * limit + 1}</span> to <span className="font-black text-blue-900">{Math.min(page * limit, total)}</span> of <span className="font-black text-blue-900">{total}</span>
          </span>
          <div className="flex items-center gap-4">
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="bg-white border border-blue-100 text-xs font-bold text-blue-900 rounded-xl focus:ring-blue-500 focus:border-blue-500 p-2 outline-none"
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
            </select>
            <div className="flex gap-1">
              <button
                disabled={page === 1}
                onClick={() => onPageChange(page - 1)}
                className="p-2.5 bg-white border border-blue-100 rounded-xl disabled:opacity-30 hover:bg-blue-50 text-blue-600 transition-all shadow-sm"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                disabled={page * limit >= total}
                onClick={() => onPageChange(page + 1)}
                className="p-2.5 bg-white border border-blue-100 rounded-xl disabled:opacity-30 hover:bg-blue-50 text-blue-600 transition-all shadow-sm"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
