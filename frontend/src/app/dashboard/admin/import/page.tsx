"use client";

import React, { useState } from 'react';
import { 
  Users, BookOpen, DoorOpen, UploadCloud, 
  Download, CheckCircle2, AlertCircle, FileSpreadsheet, Layers
} from 'lucide-react';

import { BulkUploadModal } from '../../../../components/modals/BulkUploadModal';

export default function BulkImportPage() {
  const [activeEntity, setActiveEntity] = useState<any>(null);
  const [modalMode, setModalMode] = useState<'import' | 'delete'>('import');

  const importOptions = [
    {
      id: 'faculty',
      name: 'Faculty',
      description: 'Import all faculty members, departments, and contact info.',
      icon: <Users className="text-blue-600" size={24} />,
      templateUrl: '/faculty/template',
      uploadUrl: '/faculty/bulk-upload',
      deleteUrl: '/faculty/bulk-delete-file',
      exportUrl: '/faculty/export',
      color: 'blue'
    },
    {
      id: 'subjects',
      name: 'Subjects',
      description: 'Import subject codes, names, types, and credits.',
      icon: <BookOpen className="text-blue-600" size={24} />,
      templateUrl: '/subjects/template',
      uploadUrl: '/subjects/bulk-upload',
      deleteUrl: '/subjects/bulk-delete-file',
      exportUrl: '/subjects/export',
      color: 'blue'
    },
    {
      id: 'rooms',
      name: 'Rooms',
      description: 'Import classroom numbers, capacities, and types.',
      icon: <DoorOpen className="text-blue-600" size={24} />,
      templateUrl: '/rooms/template',
      uploadUrl: '/rooms/bulk-upload',
      deleteUrl: '/rooms/bulk-delete-file',
      exportUrl: '/rooms/export',
      color: 'blue'
    },
    {
      id: 'mappings',
      name: 'Subject-Faculty Mapping',
      description: 'Import mappings to assign subjects to eligible faculty members.',
      icon: <Layers className="text-blue-600" size={24} />,
      templateUrl: '/subjects/mapping-template',
      uploadUrl: '/subjects/mapping-upload',
      color: 'blue'
    }
  ];


  const openModal = (option: typeof importOptions[0], mode: 'import' | 'delete') => {
    setModalMode(mode);
    setActiveEntity(option);
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-blue-950">Bulk Data Import</h1>
          <p className="text-sm font-medium text-slate-500">Initialize your institutional data using Excel or CSV templates.</p>
        </div>
        <span className="inline-flex items-center gap-2 px-5 py-2 bg-blue-50 text-blue-700 text-xs font-black rounded-2xl border border-blue-100 uppercase tracking-widest w-fit">
          <FileSpreadsheet size={14} /> Supports .xlsx &amp; .csv
        </span>
      </div>

      {/* Import Cards */}
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {importOptions.map((option) => (
          <div 
            key={option.id}
            className="group relative bg-white rounded-[28px] border border-blue-50 shadow-sm hover:shadow-2xl hover:shadow-blue-600/10 hover:-translate-y-1 transition-all duration-500 overflow-hidden p-8"
          >
            {/* Icon Badge */}
            <div className="p-4 rounded-2xl bg-blue-50 w-fit mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
              <div className="text-blue-600 group-hover:text-white transition-colors">
                {option.icon}
              </div>
            </div>
            
            <h3 className="text-xl font-black text-blue-950 mb-2 tracking-tight">{option.name}</h3>
            <p className="text-sm font-medium text-slate-500 mb-8 min-h-[40px] leading-relaxed">{option.description}</p>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => openModal(option, 'import')}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
              >
                <UploadCloud size={18} /> Import Data
              </button>
              {'deleteUrl' in option && option.deleteUrl && (
                <button
                  onClick={() => openModal(option, 'delete')}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-white border-2 border-blue-100 text-blue-600 rounded-2xl text-sm font-bold hover:bg-blue-50 transition-all active:scale-[0.98]"
                >
                  Bulk Delete via File
                </button>
              )}
            </div>

            {/* Background watermark */}
            <div className="absolute -right-4 -bottom-4 opacity-[0.04] group-hover:opacity-[0.07] transition-opacity">
              <FileSpreadsheet size={128} />
            </div>
          </div>
        ))}
      </div>

      {/* Guide Card */}
      <div className="bg-blue-600 rounded-[28px] p-10 text-white shadow-2xl shadow-blue-600/20 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
              <Download size={24} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-100 mb-1">Import Guide</p>
              <h4 className="text-xl font-black">How to Import Institutional Data</h4>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-8">
            <div className="space-y-5">
              {[
                "Download the official template for the entity you wish to import.",
                "Fill in the data following the column headers exactly. Do not rename or remove headers."
              ].map((text, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-white/15 text-white flex items-center justify-center text-sm font-black backdrop-blur-md">{i + 1}</div>
                  <p className="text-sm font-medium text-blue-100 leading-relaxed pt-1">{text}</p>
                </div>
              ))}
            </div>
            <div className="space-y-5">
              {[
                <>Save your file as <span className="font-black text-white">.xlsx</span> or <span className="font-black text-white">.csv</span>.</>,
                "Upload the file and review the summary report for any row-level errors."
              ].map((text, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-white/15 text-white flex items-center justify-center text-sm font-black backdrop-blur-md">{i + 3}</div>
                  <p className="text-sm font-medium text-blue-100 leading-relaxed pt-1">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl" />
        <div className="absolute bottom-0 left-20 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
      </div>

      {activeEntity && (
        <BulkUploadModal 
          isOpen={true}
          onClose={() => setActiveEntity(null)}
          entityName={activeEntity.name}
          templateUrl={activeEntity.templateUrl}
          uploadUrl={activeEntity.uploadUrl}
          deleteUrl={activeEntity.deleteUrl}
          exportUrl={activeEntity.exportUrl}
          mode={modalMode}
          onSuccess={() => setActiveEntity(null)}
        />
      )}
    </div>
  );
}

