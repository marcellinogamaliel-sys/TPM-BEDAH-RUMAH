import React, { useState } from 'react';
import { UserCheck, Lock, Eye, EyeOff, ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';
import { store } from '../services/store';
import { AppRole } from '../types';

interface LoginViewProps {
  onLoginSuccess: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [selectedRole, setSelectedRole] = useState<AppRole>('tpm_pemberdayaan');
  const [email, setEmail] = useState('gamaliel.tumiwa@bedahrumah.id');
  const [password, setPassword] = useState('tpm2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const profiles = store.getState().profiles;
  const pemberdayaan = profiles.find((p) => p.role === 'tpm_pemberdayaan');
  const konstruksi = profiles.find((p) => p.role === 'tpm_konstruksi');

  const handleSelectRole = (role: AppRole) => {
    setSelectedRole(role);
    setError('');
    if (role === 'tpm_pemberdayaan') {
      setEmail('gamaliel.tumiwa@bedahrumah.id');
    } else {
      setEmail('valerian.poluan@bedahrumah.id');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    setTimeout(() => {
      const res = store.login(selectedRole, email, password);
      setIsLoading(false);
      if (res.success) {
        onLoginSuccess();
      } else {
        setError(res.message || 'Login gagal. Periksa kembali email dan kata sandi Anda.');
      }
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col justify-center items-center p-4 sm:p-6 text-slate-900">
      <div className="max-w-md w-full space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#0B1F3A] text-white shadow-md mb-2">
            <ShieldCheck className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0B1F3A]">
            SISTEM MONITORING BEDAH RUMAH 2026
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Portal Khusus Tenaga Pendamping Masyarakat (TPM)
          </p>
        </div>

        {/* Profile Selector Cards */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
              Pilih Profil Pengguna Resmi
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Profile Card 1 */}
              <button
                type="button"
                onClick={() => handleSelectRole('tpm_pemberdayaan')}
                className={`p-3.5 rounded-xl border text-left transition relative flex flex-col justify-between ${
                  selectedRole === 'tpm_pemberdayaan'
                    ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-sm">
                      PEMBERDAYAAN
                    </span>
                    {selectedRole === 'tpm_pemberdayaan' && (
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                    )}
                  </div>
                  <div className="font-bold text-slate-900 text-sm">
                    {pemberdayaan?.display_name || 'Gamaliel Tumiwa'}
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 mt-2 font-mono truncate">
                  {pemberdayaan?.email}
                </div>
              </button>

              {/* Profile Card 2 */}
              <button
                type="button"
                onClick={() => handleSelectRole('tpm_konstruksi')}
                className={`p-3.5 rounded-xl border text-left transition relative flex flex-col justify-between ${
                  selectedRole === 'tpm_konstruksi'
                    ? 'border-teal-600 bg-teal-50/60 ring-2 ring-teal-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded-sm">
                      KONSTRUKSI
                    </span>
                    {selectedRole === 'tpm_konstruksi' && (
                      <span className="w-2 h-2 rounded-full bg-teal-600" />
                    )}
                  </div>
                  <div className="font-bold text-slate-900 text-sm">
                    {konstruksi?.display_name || 'Valerian Poluan'}
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 mt-2 font-mono truncate">
                  {konstruksi?.email}
                </div>
              </button>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-slate-100">
            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Alamat Email Akun
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <UserCheck className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-100 focus:border-blue-600 transition"
                  placeholder="nama@bedahrumah.id"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">Kata Sandi</label>
                <button
                  type="button"
                  onClick={() => alert('Untuk reset kata sandi, hubungi administrator atau ubah melalui menu Profil setelah login.')}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-medium"
                >
                  Lupa password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs sm:text-sm pl-9 pr-10 py-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-100 focus:border-blue-600 transition"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#0B1F3A] hover:bg-[#12325C] text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-sm disabled:opacity-60"
            >
              {isLoading ? (
                <span>Memverifikasi Akun...</span>
              ) : (
                <>
                  <span>Masuk ke Dashboard Sistem</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security & Access Notice */}
        <div className="text-center text-[11px] text-slate-500 space-y-1">
          <p>Aplikasi ini dilindungi enkripsi dan hak akses ketat dua akun TPM resmi.</p>
          <p className="font-mono text-[10px] text-slate-400">
            Zona Waktu Server: Asia/Makassar (WITA)
          </p>
        </div>
      </div>
    </div>
  );
};
