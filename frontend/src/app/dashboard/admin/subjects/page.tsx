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

export default function SubjectsPage() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSubjects = useCallback(async (searchQuery: string, p: number, l: number) => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/subjects', {
        params: { page: p, limit: l, search: searchQuery }
      });
      setData(res.data.data);
      setTotal(res.data.pagination.total);
    } catch (error) {
      toast.error('Failed to load subjects');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const debouncedSearch = useMemo(
    () => debounce((q: string) => fetchSubjects(q, page, limit), 300),
    [page, limit, fetchSubjects]
  );

  useEffect(() => {
    fetchSubjects(search, page, limit);
  }, [page, limit, fetchSubjects]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
    debouncedSearch(e.target.value);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selectedIds.length === data.length && data.length > 0) setSelectedIds([]);
    else setSelectedIds(data.map(d => d._id));
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await apiClient.delete('/subjects/bulk', { data: { ids: selectedIds } });
      toast.success(`Deleted ${selectedIds.length} records.`, {
        action: { label: 'Undo', onClick: () => console.log('Undo') },
        duration: 8000,
      });
      setSelectedIds([]);
      setIsDeleteOpen(false);
      fetchSubjects(search, page, limit);
    } catch (error) {
      toast.error('Failed to delete records');
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = [
    { key: 'code', header: 'Code', render: (row: any) => <div className="font-black text-blue-900 tracking-tight">{row.code}</div> },
    { key: 'name', header: 'Name', render: (row: any) => <div className="font-bold text-slate-700">{row.name}</div> },
    { key: 'type', header: 'Type', render: (row: any) => (
      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100">
        {row.type}
      </span>
    )},
    { key: 'credits', header: 'Credits/Hrs', render: (row: any) => <span className="font-medium text-slate-500">{row.credits} Cr / {row.hoursPerWeek} Hrs</span> },
    { key: 'department', header: 'Dept/Sem', render: (row: any) => <span className="font-medium text-slate-500">{row.department} - Sem {row.semester}</span> },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-blue-900">Subject Management</h1>
          <p className="text-sm font-medium text-slate-500">Manage academic subjects, credits, and requirements.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-blue-700 bg-white border border-blue-100 hover:bg-blue-50 transition-all shadow-sm active:scale-95"
          >
            <UploadCloud size={16} /> Import CSV
          </button>
          <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95">
            <Plus size={16} /> Add Subject
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-blue-50">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by code or name..." 
            value={search}
            onChange={handleSearchChange}
            className="w-full pl-11 pr-4 py-3 text-sm rounded-xl border border-blue-100 bg-blue-50/30 focus:ring-2 focus:ring-blue-600 focus:outline-none focus:bg-white transition-all text-blue-900 font-medium"
          />
        </div>
      </div>

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

      <BulkActionBar selectedCount={selectedIds.length} onClear={() => setSelectedIds([])} onDelete={() => setIsDeleteOpen(true)} />

      <BulkUploadModal 
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        entityName="Subjects"
        templateUrl="/subjects/template"
        uploadUrl="/subjects/bulk-upload"
        onSuccess={() => { fetchSubjects(search, page, limit); setIsUploadOpen(false); }}
      />

      <DeleteConfirmModal 
        isOpen={isDeleteOpen} count={selectedIds.length} isDeleting={isDeleting}
        onClose={() => setIsDeleteOpen(false)} onConfirm={handleDelete}
      />

    </div>
  );
}
