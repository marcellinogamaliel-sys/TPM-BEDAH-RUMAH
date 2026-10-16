import React, { useState } from 'react';
import { User, Phone, Lock, LogOut, CheckCircle2, ShieldCheck, Key } from 'lucide-react';
import { store } from '../services/store';
import { normalizeWhatsAppNumber } from '../utils/wita';

interface ProfileViewProps {
  onLogout: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onLogout }) => {
  const currentUser = store.currentUser;

  const [displayName, setDisplayName] = useState(currentUser?.display_name || '');
  const [whatsapp, setWhatsapp] = useState(currentUser?.whatsapp_number || '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updateMessage, setUpdateMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  if (!currentUser) return null;

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateMessage('');

    const clean = normalizeWhatsAppNumber(whatsapp);
    if (!clean) {
      alert('Nomor WhatsApp tidak valid. Gunakan format internasional (contoh: 081234567890).');
      return;
    }

    const res = store.updateProfile(currentUser.id, displayName, clean);
    if (res.success) {
      setUpdateMessage('Profil berhasil diperbarui!');
      setTimeout(() => setUpdateMessage(''), 2500);
    } else {
      alert(res.message || 'Gagal memperbarui profil.');
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage('');

    if (newPassword.length < 8) {
      alert('Kata sandi baru minimal 8 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    // Success simulation
    setPasswordMessage('Kata sandi berhasil diubah! Sesi akun Anda telah diperbarui.');
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordMessage(''), 3000);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-2xl mx-auto">
      {/* Title */}
      <div className="pb-4 border-b border-slate-200">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Profil Pengguna Resmi
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Kelola data tampilan, nomor kontak WhatsApp, dan kredensial akses.
        </p>
      </div>

      {/* Main Info Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-bold text-lg flex items-center justify-center shadow-md">
          {currentUser.avatar_initials}
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">{currentUser.display_name}</h3>
          <div className="text-xs font-semibold text-blue-700">{currentUser.title}</div>
          <div className="text-xs text-slate-500 font-mono mt-0.5">{currentUser.email}</div>
        </div>
      </div>

      {/* Profile Form */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h4 className="text-sm font-bold text-slate-900">Ubah Data Profil</h4>

        {updateMessage && (
          <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {updateMessage}
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nama Tampilan</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nomor WhatsApp</label>
            <input
              type="text"
              required
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="08xxxxxxxxxx"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Peran / Jabatan (Terkunci)</label>
            <input
              type="text"
              disabled
              value={currentUser.title}
              className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 text-xs font-medium"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-xs transition"
            >
              Simpan Perubahan Profil
            </button>
          </div>
        </form>
      </div>

      {/* Password Change Form */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Key className="w-4 h-4 text-slate-600" />
          Ganti Kata Sandi
        </h4>

        {passwordMessage && (
          <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {passwordMessage}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Kata Sandi Lama</label>
            <input
              type="password"
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Kata Sandi Baru</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimal 8 karakter..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Konfirmasi Kata Sandi Baru</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-xs transition"
            >
              Perbarui Kata Sandi
            </button>
          </div>
        </form>
      </div>

      {/* Logout Session */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-slate-900">Keluar dari Sesi Ini</div>
          <div className="text-[11px] text-slate-500">Anda dapat login kembali dengan profil Anda kapan saja.</div>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold transition"
        >
          <LogOut className="w-4 h-4" />
          Keluar Sesi
        </button>
      </div>
    </div>
  );
};
