import React, { useState } from 'react';
import {
  LayoutDashboard,
  MapPin,
  Smartphone,
  AlertTriangle,
  Menu,
  X,
  ClipboardCheck,
  Calendar,
  Wallet,
  Image,
  Database,
  FileSpreadsheet,
  Settings,
  User,
} from 'lucide-react';

interface BottomNavProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, onNavigate }) => {
  const [showDrawer, setShowDrawer] = useState(false);

  const mainTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'map', label: 'Peta', icon: MapPin },
    { id: 'field', label: 'Lapangan', icon: Smartphone, highlight: true },
    { id: 'issues', label: 'Kendala', icon: AlertTriangle },
  ];

  const drawerItems = [
    { id: 'monitoring', label: 'Form Monitoring (Selfie)', icon: ClipboardCheck },
    { id: 'recap', label: 'Rekap Kunjungan Mingguan', icon: Calendar },
    { id: 'payments', label: 'Pencairan Toko & Upah', icon: Wallet },
    { id: 'gallery', label: 'Galeri Foto Dokumentasi', icon: Image },
    { id: 'master', label: 'Master Data (PB, Desa, KPB)', icon: Database },
    { id: 'import', label: 'Import Data Excel', icon: FileSpreadsheet },
    { id: 'settings', label: 'Pengaturan & Audit Log', icon: Settings },
    { id: 'profil', label: 'Profil Saya', icon: User },
  ];

  return (
    <>
      {/* Mobile Drawer Menu Modal */}
      {showDrawer && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-150">
          <div className="bg-white rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto shadow-2xl border-t border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-sm font-bold text-slate-900">Semua Menu Operasional</span>
              <button
                onClick={() => setShowDrawer(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 py-4">
              {drawerItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setShowDrawer(false);
                      onNavigate(item.id);
                    }}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition ${
                      isActive
                        ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0 text-slate-600" />
                    <span className="text-xs truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 text-slate-600 h-16 flex items-center justify-around px-2 shadow-sm">
        {mainTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
                isActive
                  ? 'text-blue-800'
                  : tab.highlight
                  ? 'text-sky-800 font-semibold'
                  : 'text-slate-500 hover:text-blue-800'
              }`}
            >
              <div
                className={`p-1 rounded-md ${
                  isActive ? 'bg-blue-50 text-blue-800' : tab.highlight ? 'bg-sky-50 text-sky-800' : ''
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className={`text-[10px] tracking-tight mt-0.5 ${isActive ? 'font-bold' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* Menu Drawer Button */}
        <button
          onClick={() => setShowDrawer(true)}
          className="flex flex-col items-center justify-center flex-1 py-1 text-slate-400 hover:text-slate-200"
        >
          <div className="p-1">
            <Menu className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-medium tracking-tight mt-0.5">Menu</span>
        </button>
      </nav>
    </>
  );
};
