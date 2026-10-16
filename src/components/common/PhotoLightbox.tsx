import React from 'react';
import { X, Download, MapPin, User, Calendar, Home } from 'lucide-react';
import { formatDateID } from '../../utils/wita';

interface PhotoLightboxProps {
  isOpen: boolean;
  photoUrl: string;
  title?: string;
  type?: string;
  metadata?: {
    pbName?: string;
    villageName?: string;
    kpbName?: string;
    uploaderName?: string;
    date?: string;
    progress?: number;
    notes?: string;
    gps?: { lat: number; lng: number };
  };
  onClose: () => void;
}

export const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
  isOpen,
  photoUrl,
  title = 'Dokumentasi Lapangan',
  type,
  metadata,
  onClose,
}) => {
  if (!isOpen) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = photoUrl;
    a.download = `foto-${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex flex-col lg:flex-row bg-slate-900 border border-slate-800 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 p-2 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Main Photo View */}
        <div className="flex-1 flex items-center justify-center bg-black/60 p-4 min-h-[300px] overflow-hidden">
          <img
            src={photoUrl}
            alt={title}
            className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-md"
          />
        </div>

        {/* Metadata Sidebar */}
        <div className="w-full lg:w-80 bg-slate-900 p-5 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-slate-800 text-slate-200">
          <div className="space-y-4">
            <div>
              <div className="inline-block px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase bg-blue-500/20 text-blue-400 rounded-sm mb-1.5">
                {type || 'Foto Monitoring'}
              </div>
              <h3 className="text-base font-semibold text-white leading-snug">{title}</h3>
            </div>

            <div className="space-y-3 text-xs divide-y divide-slate-800/80">
              {metadata?.pbName && (
                <div className="pt-2 flex items-start gap-2.5">
                  <Home className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-slate-400">Penerima Bantuan:</div>
                    <div className="font-medium text-white">{metadata.pbName}</div>
                    {(metadata.villageName || metadata.kpbName) && (
                      <div className="text-slate-400 text-[11px]">
                        {metadata.villageName} · {metadata.kpbName}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {metadata?.uploaderName && (
                <div className="pt-2 flex items-start gap-2.5">
                  <User className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-slate-400">Diambil oleh:</div>
                    <div className="font-medium text-white">{metadata.uploaderName}</div>
                  </div>
                </div>
              )}

              {metadata?.date && (
                <div className="pt-2 flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-slate-400">Waktu Kunjungan:</div>
                    <div className="font-medium text-white">{formatDateID(metadata.date)}</div>
                  </div>
                </div>
              )}

              {metadata?.progress !== undefined && (
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-slate-400">Progres Bangunan:</span>
                  <span className="font-bold text-emerald-400 text-sm tabular-nums">
                    {metadata.progress}%
                  </span>
                </div>
              )}

              {metadata?.gps && (
                <div className="pt-2 flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-slate-400">Koordinat Lapangan:</div>
                    <div className="font-mono text-white text-[11px] tabular-nums">
                      {metadata.gps.lat.toFixed(6)}, {metadata.gps.lng.toFixed(6)}
                    </div>
                  </div>
                </div>
              )}

              {metadata?.notes && (
                <div className="pt-2">
                  <div className="text-slate-400 mb-1">Catatan Kondisi:</div>
                  <div className="text-slate-300 text-xs italic bg-slate-800/50 p-2 rounded-md border border-slate-700/50">
                    "{metadata.notes}"
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800">
            <button
              onClick={handleDownload}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition shadow-sm"
            >
              <Download className="w-4 h-4" />
              Unduh Foto Asli
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
