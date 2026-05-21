"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import debounce from 'lodash/debounce';
import { Plus, UploadCloud, Search } from 'lucide-react';
import { toast } from 'sonner';

import apiClient from '../../../../lib/apiClient';
import { DataTable } from '../../../../components/data-table/DataTable';
import { BulkActionBar } from '../../../../components/data-table/BulkActionBar';
import { BulkUploadModal } from '../../../../components/modals/BulkUploadModal';
import { DeleteConfirmModal } from '../../../../components/modals/DeleteConfirmModal';

export default function FacultyPage() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Table State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Modal State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchFaculty = useCallback(async (searchQuery: string, p: number, l: number) => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/faculty', {
        params: { page: p, limit: l, search: searchQuery }
      });
      setData(res.data.data);
      setTotal(res.data.pagination.total);
    } catch (error) {
      toast.error('Failed to load faculty');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const debouncedSearch = useMemo(
    () => debounce((q: string) => fetchFaculty(q, page, limit), 300),
    [page, limit, fetchFaculty]
  );

  useEffect(() => {
    fetchFaculty(search, page, limit);
  }, [page, limit, fetchFaculty]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // Reset to page 1
    debouncedSearch(e.target.value);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selectedIds.length === data.length && data.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(data.map(d => d._id));
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await apiClient.delete('/faculty/bulk', { data: { ids: selectedIds } });
      toast.success(`Deleted ${selectedIds.length} records.`, {
        action: { label: 'Undo', onClick: () => console.log('Undo clicked') },
        duration: 8000,
      });
      setSelectedIds([]);
      setIsDeleteOpen(false);
      fetchFaculty(search, page, limit);
    } catch (error) {
      toast.error('Failed to delete records');
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = [
    { key: 'employeeId', header: 'Emp ID' },
    { key: 'name', header: 'Name', render: (row: any) => <div className="font-extrabold text-blue-900">{row.name}</div> },
    { key: 'email', header: 'Email' },
    { key: 'department', header: 'Department', render: (row: any) => (
      <span className="inline-flex items-center px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-widest bg-blue-50 text-blue-700 border border-blue-100">
        {row.department}
      </span>
    )},
    { key: 'isActive', header: 'Status', render: (row: any) => (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${row.isActive ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-500'}`}>
        {row.isActive ? 'Active' : 'Inactive'}
      </span>
    )},
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-blue-950">Faculty Management</h1>
          <p className="text-sm font-medium text-slate-500">Registry of institutional academic staff and profiles.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold text-blue-600 bg-white border-2 border-blue-100 hover:bg-blue-50 transition-all shadow-sm active:scale-95"
          >
            <UploadCloud size={18} /> Import
          </button>
          <button className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-600/20 transition-all active:scale-95">
            <Plus size={18} /> Add Faculty
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-5 rounded-[24px] shadow-sm border border-blue-50">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" size={18} />
          <input 
            type="text" 
            placeholder="Search registry..." 
            value={search}
            onChange={handleSearchChange}
            className="w-full pl-12 pr-4 h-12 text-sm font-bold rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus:border-blue-200 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:outline-none transition-all placeholder:text-slate-400"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
        </div>
      </div>


      {/* Table Component */}
      <DataTable 
        columns={columns}
        data={data}
        isLoading={isLoading}
        total={total}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(newLimit) => { setLimit(newLimit); setPage(1); }}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleAll={toggleAll}
      />

      {/* Modals & Bars */}
      <BulkActionBar 
        selectedCount={selectedIds.length} 
        onClear={() => setSelectedIds([])} 
        onDelete={() => setIsDeleteOpen(true)} 
      />

      <BulkUploadModal 
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        entityName="Faculty"
        templateUrl="/faculty/template"
        uploadUrl="/faculty/bulk-upload"
        deleteUrl="/faculty/bulk-delete-file"
        exportUrl="/faculty/export"
        onSuccess={() => { fetchFaculty(search, page, limit); setIsUploadOpen(false); }}
      />

      <DeleteConfirmModal 
        isOpen={isDeleteOpen}
        count={selectedIds.length}
        isDeleting={isDeleting}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
      />

    </div>
  );
}
