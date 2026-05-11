import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { Download, UploadCloud, X, Loader2, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import apiClient from '../../lib/apiClient';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityName: string;
  templateUrl: string;
  uploadUrl: string;
  onSuccess: () => void;
}

export function BulkUploadModal({ isOpen, onClose, entityName, templateUrl, uploadUrl, onSuccess }: BulkUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState<{ success: number; failed: number; errors: any[] } | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const f = acceptedFiles[0];
    if (f) {
      setFile(f);
      setResults(null);
      // Parse for preview
      Papa.parse(f, {
        header: true,
        preview: 5,
        complete: (results) => {
          if (results.meta.fields) setHeaders(results.meta.fields);
          setPreview(results.data);
        }
      });
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1 
  });

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiClient.post(uploadUrl, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResults(res.data);
      if (res.data.success > 0) onSuccess();
    } catch (error: any) {
      setResults({
        success: 0,
        failed: 1,
        errors: [{ row: 0, reason: error.response?.data?.message || 'Network error' }]
      });
    } finally {
      setIsUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview([]);
    setHeaders([]);
    setResults(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await apiClient.get(templateUrl, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${entityName.toLowerCase()}_template.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Download failed', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Import {entityName} (Excel/CSV)</h2>
            <p className="text-sm text-zinc-500 mt-1">Upload multiple records via spreadsheet.</p>
          </div>
          <button onClick={handleClose} className="text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Results State */}
          {results ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800/50 flex flex-col items-center justify-center text-center">
                  <CheckCircle2 className="text-green-600 dark:text-green-500 mb-2 h-8 w-8" />
                  <span className="text-2xl font-bold text-green-700 dark:text-green-400">{results.success}</span>
                  <span className="text-sm text-green-600 dark:text-green-500 font-medium">Successfully Imported</span>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800/50 flex flex-col items-center justify-center text-center">
                  <AlertCircle className="text-red-600 dark:text-red-500 mb-2 h-8 w-8" />
                  <span className="text-2xl font-bold text-red-700 dark:text-red-400">{results.failed}</span>
                  <span className="text-sm text-red-600 dark:text-red-500 font-medium">Failed</span>
                </div>
              </div>

              {results.errors.length > 0 && (
                <div className="rounded-lg border border-red-200 dark:border-red-900/30 overflow-hidden">
                  <div className="bg-red-50 dark:bg-red-900/20 px-4 py-2 border-b border-red-200 dark:border-red-900/30 font-medium text-red-800 dark:text-red-300 text-sm flex items-center gap-2">
                    <AlertCircle size={16} /> Error Details
                  </div>
                  <ul className="divide-y divide-red-100 dark:divide-red-900/30 max-h-48 overflow-y-auto">
                    {results.errors.map((e, i) => (
                      <li key={i} className="px-4 py-2 text-sm text-red-600 dark:text-red-400 bg-white dark:bg-zinc-900 flex">
                        <span className="font-semibold w-20">Row {e.row}:</span> 
                        <span>{e.reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Step 1: Dropzone */}
              {!file && (
                <div 
                  {...getRootProps()} 
                  className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-zinc-300 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <UploadCloud className="mx-auto h-12 w-12 text-zinc-400 mb-4" />
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                    Drag & drop your CSV file here
                  </p>
                  <p className="text-xs text-zinc-500 mb-6">or click to browse files</p>
                  
                  <button onClick={(e) => { e.stopPropagation(); handleDownloadTemplate(); }} className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                    <Download size={16} /> Download Template
                  </button>
                </div>
              )}

              {/* Step 2: Preview */}
              {file && !results && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <div className="flex items-center gap-3">
                      <FileText className="text-blue-600 dark:text-blue-400" />
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{file.name}</p>
                        <p className="text-xs text-zinc-500">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button onClick={reset} className="text-xs text-red-600 hover:text-red-700 font-medium">Remove</button>
                  </div>

                  {preview.length > 0 && (
                    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                      <div className="bg-zinc-50 dark:bg-zinc-800/50 px-4 py-2 border-b border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-500 uppercase">
                        Preview (First 5 rows)
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-zinc-50 dark:bg-zinc-800/30 text-zinc-500 border-b border-zinc-200 dark:border-zinc-700">
                            <tr>
                              {headers.map(h => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {preview.map((row, i) => (
                              <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                                {headers.map(h => <td key={h} className="px-4 py-2 text-zinc-700 dark:text-zinc-300">{String(row[h] || '')}</td>)}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3 bg-zinc-50/50 dark:bg-zinc-900/50">
          <button
            onClick={results ? handleClose : onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 dark:text-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors"
          >
            {results ? 'Close' : 'Cancel'}
          </button>
          
          {!results && (
            <button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isUploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
              Upload & Import
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
