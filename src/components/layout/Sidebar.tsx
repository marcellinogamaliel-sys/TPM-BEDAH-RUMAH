import React from 'react';
import {
  LayoutDashboard,
  MapPin,
  ClipboardCheck,
  Smartphone,
  Calendar,
  AlertTriangle,
  Wallet,
  Image,
  Database,
  FileSpreadsheet,
  Settings,
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'map', label: 'Peta Sebaran PB', icon: MapPin },
    { id: 'monitoring', label: 'Form Monitoring', icon: ClipboardCheck },
    { id: 'field', label: 'Mode Lapangan (HP)', icon: Smartphone, highlight: true },
    { id: 'recap', label: 'Rekap Kunjungan', icon: Calendar },
    { id: 'issues', label: 'Manajemen Kendala', icon: AlertTriangle },
    { id: 'payments', label: 'Pencairan Toko & Upah', icon: Wallet },
    { id: 'gallery', label: 'Galeri Foto', icon: Image },
    { id: 'master', label: 'Master Data (PB/Desa)', icon: Database },
    { id: 'import', label: 'Import Data Excel', icon: FileSpreadsheet },
    { id: 'settings', label: 'Pengaturan & Audit', icon: Settings },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 text-slate-600 select-none shrink-0">
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Menu Operasional
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all text-left ${
                isActive
                  ? 'bg-blue-50 text-blue-800 font-semibold border-l-4 border-blue-800'
                  : item.highlight
                  ? 'text-sky-800 hover:text-sky-900 hover:bg-sky-50 border border-sky-200'
                  : 'hover:text-blue-900 hover:bg-slate-100'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-800' : item.highlight ? 'text-sky-700' : 'text-slate-500'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="p-3 border-t border-[#12325C] text-[11px] text-slate-400 text-center">
        Sistem Bedah Rumah 2026 · WITA
      </div>
    </aside>
  );
};
