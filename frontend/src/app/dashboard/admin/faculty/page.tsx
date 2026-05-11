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
    { key: 'name', header: 'Name', render: (row: any) => <div className="font-medium text-zinc-900 dark:text-white">{row.name}</div> },
    { key: 'email', header: 'Email' },
    { key: 'department', header: 'Department', render: (row: any) => (
      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
        {row.department}
      </span>
    )},
    { key: 'isActive', header: 'Status', render: (row: any) => (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${row.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
        {row.isActive ? 'Active' : 'Inactive'}
      </span>
    )},
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Faculty Management</h1>
          <p className="text-sm text-zinc-500">Manage all faculty members, their departments, and availability.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 dark:text-zinc-300 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800 transition-colors shadow-sm"
          >
            <UploadCloud size={16} /> Import CSV
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm">
            <Plus size={16} /> Add Faculty
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name, email, or ID..." 
            value={search}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {/* Add filter dropdowns here later */}
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
