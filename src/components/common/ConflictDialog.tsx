import React from 'react';
import { RefreshCw, X } from 'lucide-react';

interface ConflictDialogProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  onUseMine: () => void;
  onUseLatest: () => void;
  onCancel: () => void;
}

export const ConflictDialog: React.FC<ConflictDialogProps> = ({
  isOpen,
  title = 'Terjadi Konflik Versi Data',
  message = 'Data ini telah diperbarui oleh pengguna lain saat Anda sedang melakukan pengeditan.',
  onUseMine,
  onUseLatest,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-amber-600" />
            {title}
          </h3>
          <button
            onClick={onCancel}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
          <p className="text-xs text-slate-500">
            Pilih tindakan yang ingin Anda ambil untuk menjaga integritas data bersama:
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-2 px-5 py-3.5 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onUseLatest}
            className="w-full sm:w-auto px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
          >
            Muat Versi Terbaru
          </button>
          <button
            type="button"
            onClick={onUseMine}
            className="w-full sm:w-auto px-3 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-xs"
          >
            Timpa dengan Milik Saya
          </button>
        </div>
      </div>
    </div>
  );
};
