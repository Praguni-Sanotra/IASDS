"use client";

import React, { useState } from 'react';
import { 
  Users, BookOpen, DoorOpen, UploadCloud, 
  Download, CheckCircle2, AlertCircle, FileSpreadsheet 
} from 'lucide-react';
import { BulkUploadModal } from '../../../../components/modals/BulkUploadModal';

export default function BulkImportPage() {
  const [activeEntity, setActiveEntity] = useState<any>(null);

  const importOptions = [
    {
      id: 'faculty',
      name: 'Faculty',
      description: 'Import all faculty members, departments, and contact info.',
      icon: <Users className="text-blue-600" />,
      templateUrl: '/faculty/template',
      uploadUrl: '/faculty/bulk-upload',
      color: 'blue'
    },
    {
      id: 'subjects',
      name: 'Subjects',
      description: 'Import subject codes, names, types, and credits.',
      icon: <BookOpen className="text-purple-600" />,
      templateUrl: '/subjects/template',
      uploadUrl: '/subjects/bulk-upload',
      color: 'purple'
    },
    {
      id: 'rooms',
      name: 'Rooms',
      description: 'Import classroom numbers, capacities, and types.',
      icon: <DoorOpen className="text-teal-600" />,
      templateUrl: '/rooms/template',
      uploadUrl: '/rooms/bulk-upload',
      color: 'teal'
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Bulk Data Import</h1>
          <p className="text-sm text-zinc-500">Initialize your institutional data using Excel or CSV templates.</p>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-[10px] font-bold rounded-full border border-green-200 dark:border-green-800/50 uppercase tracking-wider">
            Supports: .xlsx, .csv
          </span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {importOptions.map((option) => (
          <div 
            key={option.id}
            className="group relative rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm hover:shadow-xl hover:border-blue-500/50 transition-all duration-300 overflow-hidden"
          >
            <div className={`p-3 rounded-xl bg-${option.color}-50 dark:bg-${option.color}-900/20 w-fit mb-4 group-hover:scale-110 transition-transform`}>
              {option.icon}
            </div>
            
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">{option.name}</h3>
            <p className="text-sm text-zinc-500 mb-6 min-h-[40px]">{option.description}</p>
            
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => setActiveEntity(option)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
              >
                <UploadCloud size={16} /> Start Import
              </button>
              <a 
                href={`${process.env.NEXT_PUBLIC_API_URL}${option.templateUrl}`}
                target="_blank"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-sm font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                <Download size={14} /> Download Excel Template
              </a>
            </div>

            {/* Background Icon */}
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <FileSpreadsheet size={120} />
            </div>
          </div>
        ))}
      </div>

      {/* Guide Card */}
      <div className="rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 p-6 border border-zinc-200 dark:border-zinc-700">
        <h4 className="font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
          <AlertCircle size={18} className="text-blue-600" /> Instructions for Bulk Import
        </h4>
        <div className="grid sm:grid-cols-2 gap-8 text-sm text-zinc-600 dark:text-zinc-400">
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">1</div>
              <p>Download the official template for the entity you wish to import.</p>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">2</div>
              <p>Fill in the data following the column headers exactly. Do not rename or remove headers.</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">3</div>
              <p>Save your file as <span className="font-bold text-zinc-900 dark:text-zinc-100">.xlsx</span> or <span className="font-bold text-zinc-900 dark:text-zinc-100">.csv</span>.</p>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">4</div>
              <p>Upload the file and review the summary report for any row-level errors.</p>
            </div>
          </div>
        </div>
      </div>

      {activeEntity && (
        <BulkUploadModal 
          isOpen={true}
          onClose={() => setActiveEntity(null)}
          entityName={activeEntity.name}
          templateUrl={activeEntity.templateUrl}
          uploadUrl={activeEntity.uploadUrl}
          onSuccess={() => setActiveEntity(null)}
        />
      )}
    </div>
  );
}
