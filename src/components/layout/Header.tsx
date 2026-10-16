import React, { useState, useEffect } from 'react';
import {
  Bell,
  Wifi,
  WifiOff,
  RefreshCw,
  LogOut,
  User,
  CheckCircle2,
} from 'lucide-react';
import { store } from '../../services/store';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { getPendingOutbox } from '../../services/offline';

interface HeaderProps {
  onNavigate: (view: string) => void;
  currentView: string;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const currentUser = store.currentUser;

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const checkOutbox = async () => {
      try {
        const items = await getPendingOutbox();
        setPendingCount(items.length);
      } catch {
        // ignore
      }
    };

    checkOutbox();
    const interval = setInterval(checkOutbox, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const items = await getPendingOutbox();
      setPendingCount(items.length);
    } finally {
      setTimeout(() => setIsSyncing(false), 800);
    }
  };

  const handleLogout = () => {
    store.logout();
    onNavigate('login');
  };

  return (
    <header className="sticky top-0 z-30 h-14 bg-white border-b border-slate-200 text-slate-900 px-4 lg:px-6 flex items-center justify-between shadow-sm">
      {/* Brand Zone */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onNavigate('dashboard')}
          className="text-left flex items-center gap-2.5 focus:outline-hidden"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-800 flex items-center justify-center font-bold text-white shadow-sm text-sm">
            BR
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold tracking-tight text-slate-900 leading-none">
              SISTEM MONITORING BEDAH RUMAH 2026
            </h1>
            <p className="text-[10px] text-slate-500 font-medium tracking-wide mt-0.5">
              TPM PEMBERDAYAAN & TPM KONSTRUKSI
            </p>
          </div>
          <div className="sm:hidden text-xs font-bold text-slate-900">
            BEDAH RUMAH 2026
          </div>
        </button>
      </div>

      {/* Actions & Profile Zone */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* PWA Install */}
        <PWAInstallButton />

        {/* Sync & Connectivity Indicator */}
        <div className="flex items-center">
          {isOnline ? (
            pendingCount > 0 ? (
              <button
                onClick={handleManualSync}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-amber-500/20 text-amber-300 border border-amber-400/30 hover:bg-amber-500/30 transition"
                title="Ada data antrean menunggu sinkronisasi"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="tabular-nums font-mono text-[11px] font-semibold">{pendingCount}</span>
                <span className="hidden md:inline text-[11px]">Kirim</span>
              </button>
            ) : (
              <div
                className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 rounded-md border border-emerald-500/20"
                title="Tersambung ke server"
              >
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden md:inline">Tersambung</span>
              </div>
            )
          ) : (
            <div
              className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-rose-300 bg-rose-500/20 rounded-md border border-rose-500/30"
              title="Mode offline — antrean disimpan lokal"
            >
              <WifiOff className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Offline</span>
              {pendingCount > 0 && <span className="tabular-nums font-mono">({pendingCount})</span>}
            </div>
          )}
        </div>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#12325C] transition relative"
            title="Pemberitahuan"
          >
            <Bell className="w-4 h-4" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 text-slate-800 p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-900">Pemberitahuan</span>
                <span className="text-[10px] text-slate-500">Sistem Aktif</span>
              </div>
              <div className="space-y-2 text-xs text-slate-600">
                <div className="p-2 rounded-lg bg-blue-50/70 border border-blue-100 text-[11px]">
                  <div className="font-semibold text-blue-900">Selamat Bertugas di Lapangan</div>
                  <div className="text-blue-700 mt-0.5">
                    Pastikan selfie kamera langsung diambil saat verifikasi monitoring.
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px]">
                  <div className="font-semibold text-slate-800">Siklus Mingguan WITA</div>
                  <div className="text-slate-600 mt-0.5">
                    Periode berganti otomatis setiap Senin 00.00 WITA tanpa menghapus histori.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Chip */}
        {currentUser && (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-lg bg-[#12325C]/80 hover:bg-[#12325C] border border-blue-500/20 text-left transition"
            >
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-xs">
                {currentUser.avatar_initials}
              </div>
              <div className="hidden lg:block text-left pr-1">
                <div className="text-xs font-semibold text-white leading-tight">
                  {currentUser.display_name}
                </div>
                <div className="text-[10px] text-blue-300 font-medium">
                  {currentUser.title}
                </div>
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 text-slate-800 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 border-b border-slate-100">
                  <div className="text-xs font-bold text-slate-900">{currentUser.display_name}</div>
                  <div className="text-[11px] text-blue-600 font-medium">{currentUser.title}</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">{currentUser.email}</div>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('profil');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 rounded-lg transition"
                  >
                    <User className="w-4 h-4 text-slate-500" />
                    Profil Pengguna
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('pengaturan');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 rounded-lg transition"
                  >
                    <CheckCircle2 className="w-4 h-4 text-slate-500" />
                    Pengaturan & Audit
                  </button>
                </div>

                <div className="pt-1 border-t border-slate-100">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-medium transition"
                  >
                    <LogOut className="w-4 h-4" />
                    Keluar Sesi
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
