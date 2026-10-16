import React from 'react';

interface StatusBadgeProps {
  label: string;
  color?: string;
  variant?: 'status' | 'priority' | 'payment' | 'progress';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  color,
  variant = 'status',
  className = '',
}) => {
  // Respecting anti-slop guidelines: Clean, legible indicator with accessible contrast and shape
  const getStyles = () => {
    switch (label.toLowerCase()) {
      case 'sk ppk':
      case 'sudah_dibayar':
      case 'selesai':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'pengganti':
      case 'dalam_penanganan':
        return 'bg-teal-50 text-teal-700 border border-teal-200';
      case 'menunggu_tindak_lanjut':
      case 'belum_dibayar':
      case 'sedang':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'mundur':
      case 'mundur sk ppk':
      case 'kritis':
      case 'tinggi':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      case 'tidak lolos verifikasi':
      case 'belum_diverifikasi':
      case 'rendah':
      case 'baru':
      default:
        return 'bg-slate-100 text-slate-600 border border-slate-200';
    }
  };

  const styleClass = color ? '' : getStyles();
  const customStyle = color ? { backgroundColor: `${color}15`, color: color, borderColor: `${color}40` } : {};

  return (
    <span
      style={customStyle}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium tracking-tight ${styleClass} ${className}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: color || 'currentColor' }}
        aria-hidden="true"
      />
      <span>{label}</span>
    </span>
  );
};
