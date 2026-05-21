"use client";

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Search, 
  Filter, 
  Download, 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  User as UserIcon,
  Activity,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../../../lib/apiClient';
import { cn } from '../../../../lib/utils';

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/audit-logs', {
        params: { page, action: actionFilter, entity: entityFilter }
      });
      setLogs(res.data.data);
      setTotal(res.data.total);
    } catch (error) {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, entityFilter]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleExport = () => {
    const headers = ['Timestamp', 'Action', 'Entity', 'Performed By', 'IP Address'];
    const rows = logs.map(l => [
      new Date(l.timestamp).toLocaleString(),
      l.action,
      l.entity,
      l.performedBy?.name || 'System',
      l.ipAddress
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers, ...rows].map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `audit_log_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Shield className="text-blue-600" /> System Audit Log
          </h1>
          <p className="text-sm text-zinc-500">Traceability and security monitoring for all administrative actions.</p>
        </div>
        <button 
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shadow-sm"
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <select 
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-600"
          >
            <option value="">All Actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="EXPORT">Export</option>
            <option value="GENERATE">Generate</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <select 
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-600"
          >
            <option value="">All Entities</option>
            <option value="FACULTY">Faculty</option>
            <option value="SUBJECT">Subject</option>
            <option value="ROOM">Room</option>
            <option value="TIMETABLE">Timetable</option>
            <option value="CONSTRAINT">Constraint</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/50 text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Entity</th>
                <th className="px-6 py-4">Performed By</th>
                <th className="px-6 py-4">IP Address</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-4 h-16 bg-zinc-50/50 dark:bg-zinc-900/50" />
                  </tr>
                ))
              ) : logs.map((log) => (
                <React.Fragment key={log._id}>
                  <tr className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors text-sm">
                    <td className="px-6 py-4 whitespace-nowrap text-zinc-500 font-medium">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-md text-[10px] font-bold uppercase",
                        log.action === 'DELETE' ? "bg-red-50 text-red-600" :
                        log.action === 'CREATE' ? "bg-green-50 text-green-600" :
                        "bg-blue-50 text-blue-600"
                      )}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-zinc-700 dark:text-zinc-300">
                      {log.entity}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                          <UserIcon size={12} />
                        </div>
                        <span className="font-medium">{log.performedBy?.name || 'System'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-zinc-400">
                      {log.ipAddress}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => toggleExpand(log._id)}
                        className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors"
                      >
                        {expandedId === log._id ? <ChevronUp size={16} /> : <Eye size={16} />}
                      </button>
                    </td>
                  </tr>
                  {expandedId === log._id && (
                    <tr className="bg-zinc-50 dark:bg-zinc-900">
                      <td colSpan={6} className="px-6 py-6">
                        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 shadow-inner">
                          <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase mb-3">
                            <Activity size={14} /> Operation Details
                          </div>
                          <pre className="text-xs font-mono text-zinc-600 dark:text-zinc-400 overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <p className="text-xs text-zinc-500">Showing {logs.length} of {total} entries</p>
          <div className="flex gap-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-bold disabled:opacity-50"
            >
              Previous
            </button>
            <button 
              disabled={logs.length < 50}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-bold disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
