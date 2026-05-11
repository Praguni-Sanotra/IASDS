import React from 'react';
import { Loader2, AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  count: number;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmModal({ isOpen, count, isDeleting, onClose, onConfirm }: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200">
        
        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="text-red-600 dark:text-red-500" size={24} />
        </div>

        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          Delete {count} record{count > 1 ? 's' : ''}?
        </h2>
        
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
          This action will permanently disable {count === 1 ? 'this record' : 'these records'}. This action cannot be undone immediately.
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 dark:text-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
          >
            {isDeleting ? <Loader2 size={16} className="animate-spin" /> : null}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
