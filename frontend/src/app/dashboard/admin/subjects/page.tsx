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
    { key: 'code', header: 'Code', render: (row: any) => <div className="font-bold text-zinc-900 dark:text-zinc-100">{row.code}</div> },
    { key: 'name', header: 'Name', render: (row: any) => <div className="font-medium text-zinc-700 dark:text-zinc-300">{row.name}</div> },
    { key: 'type', header: 'Type', render: (row: any) => (
      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50">
        {row.type}
      </span>
    )},
    { key: 'credits', header: 'Credits/Hrs', render: (row: any) => `${row.credits} Cr / ${row.hoursPerWeek} Hrs` },
    { key: 'department', header: 'Dept/Sem', render: (row: any) => `${row.department} - Sem ${row.semester}` },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Subject Management</h1>
          <p className="text-sm text-zinc-500">Manage academic subjects, credits, and requirements.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 dark:text-zinc-300 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800 transition-colors shadow-sm"
          >
            <UploadCloud size={16} /> Import CSV
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm">
            <Plus size={16} /> Add Subject
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by code or name..." 
            value={search}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
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
