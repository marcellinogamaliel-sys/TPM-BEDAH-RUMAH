import React, { useState, useMemo } from 'react';
import {
  Users,
  Home,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MapPin,
  Calendar,
  Wallet,
  Activity,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { store } from '../services/store';
import { getWeekStartWITA, formatDateTimeID } from '../utils/wita';

interface DashboardViewProps {
  onNavigate: (view: string, filterParams?: Record<string, string>) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const db = store.getState();
  const currentWeekStart = getWeekStartWITA();

  // Filter state
  const [selectedVillageId, setSelectedVillageId] = useState<string>('all');
  const [selectedKpbId, setSelectedKpbId] = useState<string>('all');

  // Filtered beneficiaries
  const activePBs = useMemo(() => {
    return db.beneficiaries.filter((b) => {
      if (b.is_archived) return false;
      if (selectedVillageId !== 'all' && b.village_id !== selectedVillageId) return false;
      if (selectedKpbId !== 'all' && b.kpb_id !== selectedKpbId) return false;
      return true;
    });
  }, [db.beneficiaries, selectedVillageId, selectedKpbId]);

  // Status map
  const statusMap = useMemo(() => {
    const map = new Map<string, string>();
    db.pb_statuses.forEach((s) => map.set(s.id, s.label));
    return map;
  }, [db.pb_statuses]);

  // Counts
  const totalPB = activePBs.length;
  const pbSkPpk = activePBs.filter((b) => statusMap.get(b.status_id) === 'SK PPK').length;
  const pbPengganti = activePBs.filter((b) => statusMap.get(b.status_id) === 'PENGGANTI').length;
  const pbMundur = activePBs.filter((b) => statusMap.get(b.status_id) === 'MUNDUR').length;
  const pbTidakLolos = activePBs.filter((b) => statusMap.get(b.status_id) === 'TIDAK LOLOS VERIFIKASI').length;

  const progress0 = activePBs.filter((b) => b.current_progress === 0).length;
  const progressOngoing = activePBs.filter((b) => b.current_progress > 0 && b.current_progress < 100).length;
  const progress100 = activePBs.filter((b) => b.current_progress === 100).length;

  // Weekly visits count
  const visitsThisWeek = db.monitoring_visits.filter(
    (v) => v.week_start === currentWeekStart && !v.is_voided
  );
  const visitedPbIdsThisWeek = new Set(visitsThisWeek.map((v) => v.beneficiary_id));

  const pbVisitedThisWeek = activePBs.filter((b) => visitedPbIdsThisWeek.has(b.id)).length;
  // Require visit statuses
  const reqVisitStatusIds = new Set(
    db.pb_statuses.filter((s) => s.requires_visit).map((s) => s.id)
  );
  const pbUnvisitedThisWeek = activePBs.filter(
    (b) => reqVisitStatusIds.has(b.status_id) && !visitedPbIdsThisWeek.has(b.id)
  ).length;

  // Visits by TPM
  const visitsPemberdayaan = visitsThisWeek.filter((v) => {
    const p = db.profiles.find((prof) => prof.id === v.tpm_id);
    return p?.role === 'tpm_pemberdayaan';
  }).length;

  const visitsKonstruksi = visitsThisWeek.filter((v) => {
    const p = db.profiles.find((prof) => prof.id === v.tpm_id);
    return p?.role === 'tpm_konstruksi';
  }).length;

  // Issues count
  const activeIssues = db.issues.filter((i) => i.status !== 'selesai').length;

  // Coordinates missing
  const pbMissingCoords = activePBs.filter((b) => b.coord_status === 'belum_ada').length;

  // Payments summary
  const paidToko1 = activePBs.filter((b) => b.payments.toko_1.state === 'sudah_dibayar').length;
  const paidUpah1 = activePBs.filter((b) => b.payments.upah_1.state === 'sudah_dibayar').length;
  const paidToko2 = activePBs.filter((b) => b.payments.toko_2.state === 'sudah_dibayar').length;
  const paidUpah2 = activePBs.filter((b) => b.payments.upah_2.state === 'sudah_dibayar').length;

  // KPBs filtered by selected village
  const availableKpbs = db.kpbs.filter(
    (k) => !k.is_archived && (selectedVillageId === 'all' || k.village_id === selectedVillageId)
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Welcome & Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Dashboard Monitoring Operasional
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
            <span>Minggu Berjalan: <strong>{currentWeekStart}</strong></span>
            <span>·</span>
            <span>Zona Waktu Asia/Makassar (WITA)</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedVillageId}
            onChange={(e) => {
              setSelectedVillageId(e.target.value);
              setSelectedKpbId('all');
            }}
            className="text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">Semua Desa</option>
            {db.villages
              .filter((v) => !v.is_archived)
              .map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
          </select>

          <select
            value={selectedKpbId}
            onChange={(e) => setSelectedKpbId(e.target.value)}
            className="text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">Semua KPB</option>
            {availableKpbs.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>

          {(selectedVillageId !== 'all' || selectedKpbId !== 'all') && (
            <button
              onClick={() => {
                setSelectedVillageId('all');
                setSelectedKpbId('all');
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Empty State Banner if no PB exists */}
      {totalPB === 0 && (
        <div className="p-6 bg-blue-50 border border-blue-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-base font-bold text-blue-950">Belum Ada Data Penerima Bantuan (PB)</h3>
            <p className="text-xs text-blue-800 leading-relaxed max-w-xl">
              Sistem ini mematuhi standar produksi: <strong>tidak membuat data fiktif</strong>. Mulai dengan mengimpor daftar resmi PB melalui berkas Excel atau tambah PB manual di Master Data.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigate('import')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              Import Data Excel
            </button>
            <button
              onClick={() => onNavigate('master')}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-semibold rounded-lg transition"
            >
              Tambah PB Manual
            </button>
          </div>
        </div>
      )}

      {/* Primary KPI Grid (Clickable) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total PB */}
        <button
          onClick={() => onNavigate('master')}
          className="p-4 bg-slate-900 rounded-xl border border-slate-700 text-left hover:border-blue-700 hover:shadow-xs transition group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total PB Aktif</span>
            <Users className="w-4 h-4 text-blue-500 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
            {totalPB}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>{db.kpbs.filter((k) => !k.is_archived).length} KPB · {db.villages.filter((v) => !v.is_archived).length} Desa</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-500 group-hover:translate-x-0.5 transition" />
          </div>
        </button>

        {/* Card 2: Kunjungan Minggu Ini */}
        <button
          onClick={() => onNavigate('recap')}
          className="p-4 bg-slate-900 rounded-xl border border-slate-700 text-left hover:border-teal-700 hover:shadow-xs transition group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dikunjungi Minggu Ini</span>
            <Calendar className="w-4 h-4 text-teal-500 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-teal-400 tabular-nums">
            {pbVisitedThisWeek}
            <span className="text-xs font-normal text-slate-500 ml-1.5">/ {totalPB} PB</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>{visitsThisWeek.length} kunjungan tercatat</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-teal-500 group-hover:translate-x-0.5 transition" />
          </div>
        </button>

        {/* Card 3: Belum Dikunjungi Minggu Ini */}
        <button
          onClick={() => onNavigate('map')}
          className="p-4 bg-slate-900 rounded-xl border border-slate-700 text-left hover:border-amber-700 hover:shadow-xs transition group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Belum Dikunjungi</span>
            <Clock className="w-4 h-4 text-amber-500 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-amber-400 tabular-nums">
            {pbUnvisitedThisWeek}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Status wajib kunjungan</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-500 group-hover:translate-x-0.5 transition" />
          </div>
        </button>

        {/* Card 4: Kendala Aktif */}
        <button
          onClick={() => onNavigate('issues')}
          className="p-4 bg-slate-900 rounded-xl border border-slate-700 text-left hover:border-rose-700 hover:shadow-xs transition group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Kendala Belum Selesai</span>
            <AlertTriangle className="w-4 h-4 text-rose-500 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-rose-400 tabular-nums">
            {activeIssues}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Perlu tindak lanjut lapangan</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-rose-500 group-hover:translate-x-0.5 transition" />
          </div>
        </button>
      </div>

      {/* Progress & TPM Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progress Breakdown Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Distribusi Progres Fisik
            </h3>
            <span className="text-xs text-slate-400">Total {totalPB} PB</span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-slate-600">0% Belum Mulai</span>
                <span className="font-mono tabular-nums text-slate-900">{progress0} PB ({totalPB > 0 ? Math.round((progress0 / totalPB) * 100) : 0}%)</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-slate-400 rounded-full"
                  style={{ width: `${totalPB > 0 ? (progress0 / totalPB) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-slate-600">1–99% Dalam Pembangunan</span>
                <span className="font-mono tabular-nums text-blue-700 font-semibold">{progressOngoing} PB ({totalPB > 0 ? Math.round((progressOngoing / totalPB) * 100) : 0}%)</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full"
                  style={{ width: `${totalPB > 0 ? (progressOngoing / totalPB) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-slate-600">100% Selesai Penuh</span>
                <span className="font-mono tabular-nums text-emerald-700 font-semibold">{progress100} PB ({totalPB > 0 ? Math.round((progress100 / totalPB) * 100) : 0}%)</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full"
                  style={{ width: `${totalPB > 0 ? (progress100 / totalPB) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick status counters */}
          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-blue-50/60 border border-blue-100">
              <div className="text-[11px] text-blue-700 font-medium">SK PPK</div>
              <div className="text-base font-bold text-blue-900 tabular-nums">{pbSkPpk}</div>
            </div>
            <div className="p-2 rounded-lg bg-teal-50/60 border border-teal-100">
              <div className="text-[11px] text-teal-700 font-medium">Pengganti</div>
              <div className="text-base font-bold text-teal-900 tabular-nums">{pbPengganti}</div>
            </div>
            <div className="p-2 rounded-lg bg-rose-50/60 border border-rose-100">
              <div className="text-[11px] text-rose-700 font-medium">Mundur</div>
              <div className="text-base font-bold text-rose-900 tabular-nums">{pbMundur}</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-100 border border-slate-200">
              <div className="text-[11px] text-slate-600 font-medium">Tidak Lolos</div>
              <div className="text-base font-bold text-slate-800 tabular-nums">{pbTidakLolos}</div>
            </div>
          </div>
        </div>

        {/* TPM Activity & Coordinates */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            Aktivitas Kunjungan Dua TPM
          </h3>

          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-blue-900">Gamaliel Tumiwa</div>
                <div className="text-[11px] text-blue-700">TPM Pemberdayaan</div>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold text-blue-900 tabular-nums">{visitsPemberdayaan}</span>
                <span className="text-[11px] text-blue-600 block">kunjungan minggu ini</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-100 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-teal-900">Valerian Poluan</div>
                <div className="text-[11px] text-teal-700">TPM Konstruksi</div>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold text-teal-900 tabular-nums">{visitsKonstruksi}</span>
                <span className="text-[11px] text-teal-600 block">kunjungan minggu ini</span>
              </div>
            </div>
          </div>

          {/* Missing Coords Alert */}
          <div className="pt-3 border-t border-slate-100">
            <button
              onClick={() => onNavigate('map')}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 text-left transition"
            >
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-amber-600" />
                <div>
                  <div className="text-xs font-semibold text-slate-900">Kelengkapan Koordinat</div>
                  <div className="text-[11px] text-slate-500">
                    {pbMissingCoords > 0 ? `${pbMissingCoords} PB belum memiliki titik GPS` : 'Semua titik PB lengkap'}
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold text-amber-600">{pbMissingCoords > 0 ? 'Perbaiki' : 'OK'}</span>
            </button>
          </div>
        </div>

        {/* Payments Status Strip */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-600" />
              Pencairan Toko & Upah
            </h3>
            <button
              onClick={() => onNavigate('payments')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
            >
              Lihat Matriks →
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-slate-500 text-[11px] font-medium">Toko I</div>
              <div className="text-lg font-bold text-slate-900 mt-1 tabular-nums">
                {paidToko1} <span className="text-xs font-normal text-slate-400">/ {totalPB}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-slate-500 text-[11px] font-medium">Upah I</div>
              <div className="text-lg font-bold text-slate-900 mt-1 tabular-nums">
                {paidUpah1} <span className="text-xs font-normal text-slate-400">/ {totalPB}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-slate-500 text-[11px] font-medium">Toko II</div>
              <div className="text-lg font-bold text-slate-900 mt-1 tabular-nums">
                {paidToko2} <span className="text-xs font-normal text-slate-400">/ {totalPB}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-slate-500 text-[11px] font-medium">Upah II</div>
              <div className="text-lg font-bold text-slate-900 mt-1 tabular-nums">
                {paidUpah2} <span className="text-xs font-normal text-slate-400">/ {totalPB}</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            Setiap pencairan diverifikasi terpisah dan pembatalan centang wajib menyertakan alasan resmi.
          </div>
        </div>
      </div>

      {/* Recent Activities Section (Audit Logs) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            Aktivitas Terkini (Audit Log)
          </h3>
          <button
            onClick={() => onNavigate('settings')}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
          >
            Lihat Semua Log →
          </button>
        </div>

        {db.audit_logs.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">
            Belum ada aktivitas tercatat. Setiap tindakan kedua TPM akan dicatat di sini.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {db.audit_logs.slice(0, 8).map((log) => (
              <div key={log.id} className="py-2.5 flex items-start justify-between gap-4">
                <div>
                  <span className="font-semibold text-slate-900">{log.user_name}</span>{' '}
                  <span className="text-slate-600">
                    {log.reason || `melakukan operasi ${log.operation} pada ${log.table_name}`}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono shrink-0 whitespace-nowrap">
                  {formatDateTimeID(log.occurred_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
