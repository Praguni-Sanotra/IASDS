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

export default function RoomsPage() {
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

  const fetchRooms = useCallback(async (searchQuery: string, p: number, l: number) => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/rooms', {
        params: { page: p, limit: l, search: searchQuery }
      });
      setData(res.data.data);
      setTotal(res.data.pagination.total);
    } catch (error) {
      toast.error('Failed to load rooms');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const debouncedSearch = useMemo(
    () => debounce((q: string) => fetchRooms(q, page, limit), 300),
    [page, limit, fetchRooms]
  );

  useEffect(() => {
    fetchRooms(search, page, limit);
  }, [page, limit, fetchRooms]);

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
      await apiClient.delete('/rooms/bulk', { data: { ids: selectedIds } });
      toast.success(`Deleted ${selectedIds.length} records.`, {
        action: { label: 'Undo', onClick: () => console.log('Undo') },
        duration: 8000,
      });
      setSelectedIds([]);
      setIsDeleteOpen(false);
      fetchRooms(search, page, limit);
    } catch (error) {
      toast.error('Failed to delete records');
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = [
    { key: 'roomNumber', header: 'Room No.', render: (row: any) => <div className="font-extrabold text-blue-900 tracking-tight">{row.roomNumber}</div> },
    { key: 'building', header: 'Location', render: (row: any) => <span className="font-bold text-slate-800">{row.building}, Floor {row.floor}</span> },
    { key: 'type', header: 'Type', render: (row: any) => (
      <span className="inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-700 border border-blue-100">
        {row.type}
      </span>
    )},
    { key: 'capacity', header: 'Capacity', render: (row: any) => <span className="font-bold text-slate-500">{row.capacity} Seats</span> },
    { key: 'facilities', header: 'Facilities', render: (row: any) => (
      <div className="flex flex-wrap gap-1.5">
        {row.facilities && row.facilities.map((f: string, i: number) => (
          <span key={i} className="text-[10px] font-black bg-blue-50 text-blue-800 px-2.5 py-1 rounded-lg border border-blue-100 uppercase tracking-tighter">{f}</span>
        ))}
      </div>
    )},
  ];


  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-blue-950">Rooms &amp; Infrastructure</h1>
          <p className="text-sm font-medium text-slate-500">Physical campus spaces, capacities, and available facilities.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold text-blue-600 bg-white border-2 border-blue-100 hover:bg-blue-50 transition-all shadow-sm active:scale-95"
          >
            <UploadCloud size={18} /> Import
          </button>
          <button className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-600/20 transition-all active:scale-95">
            <Plus size={18} /> Add Room
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-5 rounded-[24px] shadow-sm border border-blue-50">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by room or building..." 
            value={search}
            onChange={handleSearchChange}
            className="w-full pl-12 pr-4 h-12 text-sm font-bold rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus:border-blue-200 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:outline-none transition-all placeholder:text-slate-400"
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
        entityName="Rooms"
        templateUrl="/rooms/template"
        uploadUrl="/rooms/bulk-upload"
        deleteUrl="/rooms/bulk-delete-file"
        exportUrl="/rooms/export"
        onSuccess={() => { fetchRooms(search, page, limit); setIsUploadOpen(false); }}
      />

      <DeleteConfirmModal 
        isOpen={isDeleteOpen} count={selectedIds.length} isDeleting={isDeleting}
        onClose={() => setIsDeleteOpen(false)} onConfirm={handleDelete}
      />

    </div>
  );
}
