import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Settings,
  User,
  Phone,
  Shield,
  Clock,
  Database,
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  History,
  Copy,
  Terminal,
} from 'lucide-react';
import { store } from '../services/store';
import { normalizeWhatsAppNumber, formatDateTimeID } from '../utils/wita';

export const SettingsView: React.FC = () => {
  const db = store.getState();
  const currentUser = store.currentUser;

  // Active section tab
  const [section, setSection] = useState<'profiles' | 'statuses' | 'stages' | 'audit' | 'backup' | 'supabase'>('profiles');

  // Profile edit state
  const [pemberdayaanName, setPemberdayaanName] = useState(
    db.profiles.find((p) => p.role === 'tpm_pemberdayaan')?.display_name || ''
  );
  const [pemberdayaanPhone, setPemberdayaanPhone] = useState(
    db.profiles.find((p) => p.role === 'tpm_pemberdayaan')?.whatsapp_number || ''
  );
  const [konstruksiName, setKonstruksiName] = useState(
    db.profiles.find((p) => p.role === 'tpm_konstruksi')?.display_name || ''
  );
  const [konstruksiPhone, setKonstruksiPhone] = useState(
    db.profiles.find((p) => p.role === 'tpm_konstruksi')?.whatsapp_number || ''
  );
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  // Audit filter
  const [auditUserFilter, setAuditUserFilter] = useState('all');
  const [auditOpFilter, setAuditOpFilter] = useState('all');

  // Backup & restore
  const [restoreMessage, setRestoreMessage] = useState('');

  // Handle Save Profiles
  const handleSaveProfiles = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaveSuccess(false);

    const cleanP = normalizeWhatsAppNumber(pemberdayaanPhone);
    const cleanK = normalizeWhatsAppNumber(konstruksiPhone);

    if (!cleanP || !cleanK) {
      alert('Nomor WhatsApp harus valid format Indonesia (contoh: 08123456789 atau 628123456789).');
      return;
    }

    const pId = db.profiles.find((p) => p.role === 'tpm_pemberdayaan')?.id;
    const kId = db.profiles.find((p) => p.role === 'tpm_konstruksi')?.id;

    if (pId) store.updateProfile(pId, pemberdayaanName, cleanP);
    if (kId) store.updateProfile(kId, konstruksiName, cleanK);

    setProfileSaveSuccess(true);
    setTimeout(() => setProfileSaveSuccess(false), 2000);
  };

  // Export Audit Logs to Excel
  const handleExportAuditExcel = () => {
    const rows = db.audit_logs.map((log) => ({
      Waktu: formatDateTimeID(log.occurred_at),
      Pengguna: log.user_name,
      Operasi: log.operation,
      Tabel: log.table_name,
      'ID Data': log.record_id,
      Alasan: log.reason || '-',
      Sumber: log.source,
      'Data Sebelum': JSON.stringify(log.old_data || {}),
      'Data Sesudah': JSON.stringify(log.new_data || {}),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Log');
    XLSX.writeFile(wb, `Audit_Log_${Date.now()}.xlsx`);
  };

  // Download JSON Backup
  const handleDownloadBackup = () => {
    const backupData = {
      version: '2.0',
      exported_at: new Date().toISOString(),
      row_counts: {
        villages: db.villages.length,
        kpbs: db.kpbs.length,
        beneficiaries: db.beneficiaries.length,
        monitoring_visits: db.monitoring_visits.length,
        issues: db.issues.length,
        audit_logs: db.audit_logs.length,
      },
      data: db,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_bedah_rumah_2026_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Filtered Audit logs
  const filteredAudits = db.audit_logs.filter((log) => {
    if (auditUserFilter !== 'all' && log.user_id !== auditUserFilter) return false;
    if (auditOpFilter !== 'all' && log.operation !== auditOpFilter) return false;
    return true;
  });

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Title */}
      <div className="pb-4 border-b border-slate-200">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Pengaturan Sistem & Audit Log
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Konfigurasi profil TPM, aturan master, jejak audit append-only, dan cadangan data resmi.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl">
        <button
          onClick={() => setSection('profiles')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
            section === 'profiles' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Profil & WhatsApp TPM
        </button>
        <button
          onClick={() => setSection('statuses')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
            section === 'statuses' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Status & Tahap Progres
        </button>
        <button
          onClick={() => setSection('audit')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
            section === 'audit' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Audit Log ({db.audit_logs.length})
        </button>
        <button
          onClick={() => setSection('backup')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
            section === 'backup' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Backup & Pemulihan
        </button>
        <button
          onClick={() => setSection('supabase')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
            section === 'supabase' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Skema SQL Supabase (RLS)
        </button>
      </div>

      {/* SECTION 1: PROFILES & WHATSAPP */}
      {section === 'profiles' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            Pengaturan Profil Dua TPM & Nomor WhatsApp Lapangan
          </h3>
          <p className="text-xs text-slate-500">
            Nomor WhatsApp digunakan oleh tombol darurat lapangan untuk menghubungkan langsung antar-rekan TPM.
          </p>

          {profileSaveSuccess && (
            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Profil dan nomor WhatsApp berhasil diperbarui!
            </div>
          )}

          <form onSubmit={handleSaveProfiles} className="space-y-4 text-xs">
            {/* Profil 1: Pemberdayaan */}
            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200 space-y-3">
              <div className="font-bold text-blue-900 text-sm">TPM Pemberdayaan</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Tampilan</label>
                  <input
                    type="text"
                    required
                    value={pemberdayaanName}
                    onChange={(e) => setPemberdayaanName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nomor WhatsApp</label>
                  <input
                    type="text"
                    required
                    value={pemberdayaanPhone}
                    onChange={(e) => setPemberdayaanPhone(e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Profil 2: Konstruksi */}
            <div className="p-4 bg-teal-50/50 rounded-xl border border-teal-200 space-y-3">
              <div className="font-bold text-teal-900 text-sm">TPM Konstruksi</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Tampilan</label>
                  <input
                    type="text"
                    required
                    value={konstruksiName}
                    onChange={(e) => setKonstruksiName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nomor WhatsApp</label>
                  <input
                    type="text"
                    required
                    value={konstruksiPhone}
                    onChange={(e) => setKonstruksiPhone(e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition"
            >
              Simpan Pengaturan Profil
            </button>
          </form>
        </div>
      )}

      {/* SECTION 2: STATUSES & STAGES */}
      {section === 'statuses' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Master Status PB</h3>
            <div className="divide-y divide-slate-100 text-xs">
              {db.pb_statuses.map((status) => (
                <div key={status.id} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                    <span className="font-bold text-slate-800">{status.label}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500">
                    <span>{status.requires_visit ? 'Wajib Kunjungan' : 'Tidak Wajib'}</span>
                    <span>·</span>
                    <span>{status.counts_in_active_total ? 'Masuk Total Aktif' : 'Non-Aktif'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Kelompok Tahap Progres (Anti Tumpang-Tindih)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {db.progress_groups.map((group) => (
                <div key={group.code} className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="font-bold text-slate-900">{group.label}</div>
                  <div className="text-slate-500 mt-1 font-mono">
                    Rentang: {group.min_value}% – {group.max_value}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: AUDIT LOG (APPEND-ONLY) */}
      {section === 'audit' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" />
                Audit Log Sistem (Read-Only & Append-Only)
              </h3>
              <p className="text-xs text-slate-500">
                Setiap penambahan, pengubahan status, pembatalan kunjungan, dan resolusi kendala dicatat permanen.
              </p>
            </div>

            <button
              onClick={handleExportAuditExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-semibold"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Ekspor Audit ke Excel
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-2 text-xs">
            <select
              value={auditUserFilter}
              onChange={(e) => setAuditUserFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
            >
              <option value="all">Semua Pengguna</option>
              {db.profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name}
                </option>
              ))}
            </select>
          </div>

          {/* Audit Table */}
          <div className="max-h-96 overflow-y-auto rounded-xl border border-slate-200 text-xs">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 font-bold">
                <tr>
                  <th className="p-2.5">Waktu (WITA)</th>
                  <th className="p-2.5">Pengguna</th>
                  <th className="p-2.5">Operasi</th>
                  <th className="p-2.5">Tabel</th>
                  <th className="p-2.5">Keterangan / Alasan</th>
                  <th className="p-2.5">Sumber</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAudits.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400">
                      Belum ada audit log yang sesuai.
                    </td>
                  </tr>
                ) : (
                  filteredAudits.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70">
                      <td className="p-2.5 font-mono text-slate-500 whitespace-nowrap">
                        {formatDateTimeID(log.occurred_at)}
                      </td>
                      <td className="p-2.5 font-semibold text-slate-900 whitespace-nowrap">
                        {log.user_name}
                      </td>
                      <td className="p-2.5">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 rounded text-slate-700">
                          {log.operation}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono text-slate-600">{log.table_name}</td>
                      <td className="p-2.5 max-w-sm truncate text-slate-700">{log.reason || '-'}</td>
                      <td className="p-2.5 font-mono text-[10px] text-slate-400">{log.source}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 4: BACKUP & RESTORE */}
      {section === 'backup' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" />
            Cadangan & Pemulihan Data
          </h3>
          <p className="text-slate-500 leading-relaxed">
            Sistem menyediakan mekanisme ekspor cadangan logis (JSON) lengkap yang memuat seluruh tabel relasional, riwayat monitoring, kendala, pembayaran, dan audit logs.
          </p>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="font-bold text-slate-800">Ringkasan Data Saat Ini:</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-600 font-mono">
              <div>Desa: {db.villages.length}</div>
              <div>KPB: {db.kpbs.length}</div>
              <div>PB: {db.beneficiaries.length}</div>
              <div>Kunjungan: {db.monitoring_visits.length}</div>
              <div>Foto: {db.visit_photos.length}</div>
              <div>Kendala: {db.issues.length}</div>
              <div>Arsip Mingguan: {db.weekly_recap_snapshots.length}</div>
              <div>Audit Log: {db.audit_logs.length}</div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleDownloadBackup}
                className="flex items-center gap-2 px-4 py-2 bg-[#0B1F3A] hover:bg-[#12325C] text-white font-bold rounded-xl shadow-xs transition"
              >
                <Download className="w-4 h-4" />
                Unduh Cadangan Lengkap (.json)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: SUPABASE CLOUD SQL MIGRATION TOOLKIT */}
      {section === 'supabase' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-blue-600" />
            Supabase SQL Migration & RLS Security Script
          </h3>
          <p className="text-slate-500 leading-relaxed">
            Kode SQL siap pakai untuk dieksekusi di Supabase SQL Editor. Memuat seluruh tabel, enum, aturan RLS, fungsi RPC (`create_visit`, `resolve_issue`, `close_week`), dan guard status.
          </p>

          <div className="relative">
            <pre className="p-4 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] overflow-x-auto max-h-96 leading-relaxed">
{`-- SISTEM MONITORING BEDAH RUMAH 2026 — SUPABASE MIGRATION
-- Extensions
create extension if not exists pgcrypto;
create extension if not exists citext;

-- Enums
create type app_role as enum ('tpm_pemberdayaan', 'tpm_konstruksi');
create type issue_status as enum ('baru', 'dalam_penanganan', 'menunggu_tindak_lanjut', 'selesai');
create type issue_priority as enum ('rendah', 'sedang', 'tinggi', 'kritis');
create type payment_stage as enum ('toko_1', 'upah_1', 'toko_2', 'upah_2');
create type payment_state as enum ('belum_diverifikasi', 'belum_dibayar', 'sudah_dibayar');

-- Tables
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  role app_role unique not null,
  display_name text not null,
  title text not null,
  whatsapp_number text not null check (whatsapp_number ~ '^62[0-9]{8,13}$'),
  avatar_initials text not null,
  is_active boolean default true,
  version int default 1
);

create table if not exists villages (
  id uuid primary key default gen_random_uuid(),
  name citext unique not null,
  is_archived boolean default false,
  created_at timestamptz default now(),
  version int default 1
);

create table if not exists kpbs (
  id uuid primary key default gen_random_uuid(),
  village_id uuid references villages(id) on delete restrict,
  name citext not null,
  is_archived boolean default false,
  created_at timestamptz default now(),
  version int default 1,
  unique(village_id, name)
);

create table if not exists beneficiaries (
  id uuid primary key default gen_random_uuid(),
  pb_code text unique not null,
  full_name text not null,
  village_id uuid references villages(id),
  kpb_id uuid references kpbs(id),
  address text,
  phone text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  current_progress smallint default 0 check (current_progress between 0 and 100),
  is_archived boolean default false,
  created_at timestamptz default now(),
  version int default 1
);

-- RLS Enablement
alter table profiles enable row level security;
alter table villages enable row level security;
alter table kpbs enable row level security;
alter table beneficiaries enable row level security;

-- Only authenticated users can access
create policy "Authenticated access" on profiles for all to authenticated using (true);
create policy "Authenticated access" on villages for all to authenticated using (true);
create policy "Authenticated access" on kpbs for all to authenticated using (true);
create policy "Authenticated access" on beneficiaries for all to authenticated using (true);`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
