import React, { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ReasonDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  placeholder?: string;
  minLength?: number;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export const ReasonDialog: React.FC<ReasonDialogProps> = ({
  isOpen,
  title,
  description,
  placeholder = 'Tuliskan alasan lengkap...',
  minLength = 5,
  confirmLabel = 'Simpan & Lanjutkan',
  cancelLabel = 'Batal',
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    const trimmed = reason.trim();
    if (trimmed.length < minLength) {
      setError(`Alasan wajib diisi minimal ${minLength} karakter.`);
      return;
    }
    setError('');
    onConfirm(trimmed);
    setReason('');
  };

  const handleCancel = () => {
    setReason('');
    setError('');
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <AlertCircle className={`w-5 h-5 ${isDestructive ? 'text-rose-600' : 'text-blue-600'}`} />
            {title}
          </h3>
          <button
            onClick={handleCancel}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {description && <p className="text-sm text-slate-600">{description}</p>}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Alasan Tindakan <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              placeholder={placeholder}
              className={`w-full text-sm rounded-lg border px-3 py-2 outline-hidden transition focus:ring-2 ${
                error
                  ? 'border-rose-400 focus:ring-rose-200'
                  : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
              }`}
            />
            <div className="flex justify-between items-center mt-1 text-xs text-slate-500">
              {error ? (
                <span className="text-rose-600 font-medium">{error}</span>
              ) : (
                <span>Minimal {minLength} karakter</span>
              )}
              <span className="tabular-nums font-mono">{reason.trim().length}/{minLength}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-3.5 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={reason.trim().length < minLength}
            className={`px-4 py-2 text-xs font-medium text-white rounded-lg transition-colors shadow-xs ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700 disabled:opacity-50'
                : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-50'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
