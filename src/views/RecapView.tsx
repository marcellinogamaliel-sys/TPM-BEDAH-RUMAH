import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Lock,
  Eye,
  RefreshCw,
  Search,
  Filter,
  AlertTriangle,
} from 'lucide-react';
import { store } from '../services/store';
import {
  getWeekStartWITA,
  getWeekEndWITA,
  getRecapLabel,
  formatDateID,
  formatDateTimeID,
} from '../utils/wita';
import { PhotoLightbox } from '../components/common/PhotoLightbox';

interface RecapViewProps {
  onNavigate: (view: string, params?: Record<string, string>) => void;
  filterPbId?: string;
}

export const RecapView: React.FC<RecapViewProps> = ({ onNavigate, filterPbId }) => {
  const db = store.getState();
  const currentWeekStart = getWeekStartWITA();

  // Tabs: 'current' | 'archive'
  const [activeTab, setActiveTab] = useState<'current' | 'archive'>('current');
  const [selectedArchivePeriodId, setSelectedArchivePeriodId] = useState<string>('');

  // Table filters
  const [selectedVillageId, setSelectedVillageId] = useState('all');
  const [selectedTpmRole, setSelectedTpmRole] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected visit for lightbox
  const [lightboxPhoto, setLightboxPhoto] = useState<{
    url: string;
    title: string;
    meta?: any;
  } | null>(null);

  // Close week simulation state
  const [closing, setClosing] = useState(false);

  // Active period
  const currentPeriod = useMemo(() => {
    return store.ensureCurrentPeriod();
  }, [db.weekly_recap_periods]);

  // Visits in current week
  const currentWeekVisits = useMemo(() => {
    return db.monitoring_visits
      .filter((v) => v.week_start === currentWeekStart && !v.is_voided)
      .sort((a, b) => new Date(b.visited_at).getTime() - new Date(a.visited_at).getTime());
  }, [db.monitoring_visits, currentWeekStart]);

  // Filtered visits
  const filteredVisits = useMemo(() => {
    return currentWeekVisits.filter((v) => {
      if (filterPbId && v.beneficiary_id !== filterPbId) return false;
      if (selectedVillageId !== 'all' && v.village_id !== selectedVillageId) return false;

      const tpm = db.profiles.find((p) => p.id === v.tpm_id);
      if (selectedTpmRole !== 'all' && tpm?.role !== selectedTpmRole) return false;

      if (searchQuery.trim()) {
        const pb = db.beneficiaries.find((b) => b.id === v.beneficiary_id);
        const q = searchQuery.toLowerCase();
        if (
          !pb?.full_name.toLowerCase().includes(q) &&
          !pb?.pb_code.toLowerCase().includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [currentWeekVisits, filterPbId, selectedVillageId, selectedTpmRole, searchQuery, db.profiles, db.beneficiaries]);

  // Statistics
  const uniquePbVisited = new Set(currentWeekVisits.map((v) => v.beneficiary_id)).size;
  const visitsPemberdayaan = currentWeekVisits.filter((v) => {
    const p = db.profiles.find((prof) => prof.id === v.tpm_id);
    return p?.role === 'tpm_pemberdayaan';
  }).length;
  const visitsKonstruksi = currentWeekVisits.filter((v) => {
    const p = db.profiles.find((prof) => prof.id === v.tpm_id);
    return p?.role === 'tpm_konstruksi';
  }).length;

  const totalActivePBs = db.beneficiaries.filter((b) => !b.is_archived).length;
  const unvisitedCount = Math.max(0, totalActivePBs - uniquePbVisited);

  // Close Week Action
  const handleCloseWeek = () => {
    if (!confirm(`Tutup periode rekap minggu ini (${currentWeekStart}) dan buat arsip snapshot? Indikator mingguan akan dihitung untuk periode berikutnya tanpa menghapus catatan historis.`)) {
      return;
    }
    setClosing(true);
    setTimeout(() => {
      const res = store.closeWeek(currentWeekStart, 'manual');
      setClosing(false);
      if (res.success) {
        alert('Periode berhasil ditutup dan arsip snapshot resmi telah dibekukan.');
        setActiveTab('archive');
      } else {
        alert(res.message || 'Gagal menutup periode.');
      }
    }, 400);
  };

  // Export to Excel
  const handleExportExcel = () => {
    const rows = filteredVisits.map((v, idx) => {
      const pb = db.beneficiaries.find((b) => b.id === v.beneficiary_id);
      const vil = db.villages.find((vil) => vil.id === v.village_id);
      const kpb = db.kpbs.find((k) => k.id === v.kpb_id);
      const tpm = db.profiles.find((p) => p.id === v.tpm_id);

      return {
        'No.': idx + 1,
        'Waktu Kunjungan (WITA)': formatDateTimeID(v.visited_at),
        'Kode PB': pb?.pb_code || '',
        'Nama Penerima': pb?.full_name || '',
        Desa: vil?.name || '',
        KPB: kpb?.name || '',
        'Petugas TPM': tpm?.display_name || '',
        'Progres Sebelum': `${v.progress_before}%`,
        'Progres Sesudah': `${v.progress_after}%`,
        'Catatan Lapangan': v.condition_notes,
        'Status Sinkron': v.sync_status === 'synced' ? 'Tepat Waktu' : 'Data Susulan',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Kunjungan');

    XLSX.writeFile(workbook, `Rekap_Kunjungan_${currentWeekStart}.xlsx`);
  };

  // Export to PDF
  const handleExportPDF = () => {
    const doc = new jsPDF('landscape');
    doc.setFontSize(14);
    doc.text('SISTEM MONITORING BEDAH RUMAH 2026 — TPM', 14, 15);
    doc.setFontSize(10);
    doc.text(`Laporan Rekap Kunjungan Mingguan: ${getRecapLabel(currentWeekStart)}`, 14, 22);
    doc.text(`Waktu Cetak: ${formatDateTimeID(new Date())}`, 14, 28);

    const tableRows = filteredVisits.map((v, i) => {
      const pb = db.beneficiaries.find((b) => b.id === v.beneficiary_id);
      const vil = db.villages.find((vil) => vil.id === v.village_id);
      const kpb = db.kpbs.find((k) => k.id === v.kpb_id);
      const tpm = db.profiles.find((p) => p.id === v.tpm_id);
      return [
        i + 1,
        formatDateID(v.visited_at),
        pb?.pb_code || '',
        pb?.full_name || '',
        vil?.name || '',
        kpb?.name || '',
        tpm?.display_name || '',
        `${v.progress_before}% -> ${v.progress_after}%`,
        v.condition_notes.slice(0, 40) + '...',
      ];
    });

    autoTable(doc, {
      startY: 32,
      head: [['No', 'Tanggal', 'ID PB', 'Nama PB', 'Desa', 'KPB', 'TPM', 'Progres', 'Catatan']],
      body: tableRows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [11, 31, 58] },
    });

    doc.save(`Rekap_Kunjungan_${currentWeekStart}.pdf`);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Rekap Kunjungan Mingguan
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {getRecapLabel(currentWeekStart)} · Zona Waktu Asia/Makassar (WITA)
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl">
          <button
            onClick={() => setActiveTab('current')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'current'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Minggu Berjalan
          </button>
          <button
            onClick={() => setActiveTab('archive')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'archive'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Arsip Periode ({db.weekly_recap_snapshots.length})
          </button>
        </div>
      </div>

      {activeTab === 'current' && (
        <div className="space-y-6">
          {/* Summary KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Total Kunjungan
              </span>
              <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                {currentWeekVisits.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {uniquePbVisited} PB unik dikunjungi
              </div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                TPM Pemberdayaan
              </span>
              <div className="text-2xl font-bold text-blue-700 mt-1 tabular-nums">
                {visitsPemberdayaan}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Gamaliel Tumiwa</div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                TPM Konstruksi
              </span>
              <div className="text-2xl font-bold text-teal-700 mt-1 tabular-nums">
                {visitsKonstruksi}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Valerian Poluan</div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Belum Dikunjungi
              </span>
              <div className="text-2xl font-bold text-amber-600 mt-1 tabular-nums">
                {unvisitedCount}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Penerima Bantuan aktif</div>
            </div>
          </div>

          {/* Table Actions & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari penerima bantuan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <select
                value={selectedVillageId}
                onChange={(e) => setSelectedVillageId(e.target.value)}
                className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="all">Semua Desa</option>
                {db.villages.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedTpmRole}
                onChange={(e) => setSelectedTpmRole(e.target.value)}
                className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="all">Semua Petugas TPM</option>
                <option value="tpm_pemberdayaan">TPM Pemberdayaan</option>
                <option value="tpm_konstruksi">TPM Konstruksi</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Excel</span>
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>PDF</span>
              </button>
              <button
                onClick={handleCloseWeek}
                disabled={closing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0B1F3A] hover:bg-[#12325C] rounded-lg transition shadow-xs"
                title="Tutup minggu dan buat arsip snapshot permanen"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Tutup Minggu</span>
              </button>
            </div>
          </div>

          {/* Visits Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="py-3 px-3 w-10 text-center">No</th>
                    <th className="py-3 px-3">Waktu (WITA)</th>
                    <th className="py-3 px-3">Penerima Bantuan</th>
                    <th className="py-3 px-3">Wilayah</th>
                    <th className="py-3 px-3">Petugas TPM</th>
                    <th className="py-3 px-3">Progres</th>
                    <th className="py-3 px-3 text-center">Selfie</th>
                    <th className="py-3 px-3 text-center">Foto</th>
                    <th className="py-3 px-3">Catatan Kondisi</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVisits.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        Belum ada catatan kunjungan pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    filteredVisits.map((v, idx) => {
                      const pb = db.beneficiaries.find((b) => b.id === v.beneficiary_id);
                      const vil = db.villages.find((vil) => vil.id === v.village_id);
                      const kpb = db.kpbs.find((k) => k.id === v.kpb_id);
                      const tpm = db.profiles.find((p) => p.id === v.tpm_id);
                      const selfie = db.visit_photos.find((p) => p.id === v.selfie_photo_id);

                      return (
                        <tr key={v.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="font-semibold text-slate-800">{formatDateID(v.visited_at)}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {new Date(v.visited_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WITA
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">{pb?.full_name || 'Tidak diketahui'}</div>
                            <div className="text-[10px] text-blue-600 font-mono">{pb?.pb_code}</div>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="text-slate-800 font-medium">{vil?.name}</div>
                            <div className="text-[10px] text-slate-500">{kpb?.name}</div>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                tpm?.role === 'tpm_pemberdayaan'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-teal-100 text-teal-800'
                              }`}
                            >
                              {tpm?.display_name || '-'}
                            </span>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap font-mono tabular-nums">
                            <span className="text-slate-400">{v.progress_before}%</span> →{' '}
                            <strong className="text-blue-700">{v.progress_after}%</strong>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {selfie ? (
                              <button
                                onClick={() =>
                                  setLightboxPhoto({
                                    url: selfie.storage_path,
                                    title: `Selfie Verifikasi: ${pb?.full_name}`,
                                    meta: {
                                      pbName: pb?.full_name,
                                      uploaderName: tpm?.display_name,
                                      date: v.visited_at,
                                      progress: v.progress_after,
                                    },
                                  })
                                }
                                className="w-8 h-8 rounded-lg overflow-hidden border border-slate-300 inline-block hover:opacity-80 transition"
                              >
                                <img src={selfie.storage_path} alt="Selfie" className="w-full h-full object-cover" />
                              </button>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="font-mono text-slate-600 text-xs">{v.photo_ids.length}</span>
                          </td>
                          <td className="py-3 px-3 max-w-xs truncate text-slate-600">
                            {v.condition_notes}
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {v.sync_status === 'synced' ? (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-sm text-[10px] font-semibold">
                                Tepat Waktu
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-sm text-[10px] font-semibold">
                                Susulan
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Archive Tab */}
      {activeTab === 'archive' && (
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Daftar Arsip Laporan Snapshot</h3>
            <p className="text-xs text-slate-500">
              Snapshot dibekukan permanen. Nama desa, KPB, dan PB pada saat penutupan minggu tetap terjaga meskipun data master berubah di masa depan.
            </p>
          </div>

          {db.weekly_recap_snapshots.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-400">
              Belum ada arsip mingguan yang ditutup. Klik tombol "Tutup Minggu" di tab Minggu Berjalan untuk membekukan arsip pertama.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {db.weekly_recap_snapshots.map((snap) => {
                const period = db.weekly_recap_periods.find((p) => p.id === snap.period_id);
                return (
                  <div key={snap.id} className="p-4 bg-white rounded-xl border border-slate-200 space-y-3 shadow-xs">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-sm">
                          Revisi {snap.revision}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm mt-1">
                          {period?.label || 'Rekap Kunjungan'}
                        </h4>
                        <div className="text-[11px] text-slate-400">
                          Dibekukan pada {formatDateTimeID(snap.generated_at)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-2 bg-slate-50 rounded-lg p-2 text-xs">
                      <div>
                        <div className="text-slate-500 text-[10px]">Total Kunjungan</div>
                        <div className="font-bold text-slate-900">{snap.summary.total_visits}</div>
                      </div>
                      <div>
                        <div className="text-slate-500 text-[10px]">PB Dikunjungi</div>
                        <div className="font-bold text-blue-700">{snap.summary.unique_pb_visited}</div>
                      </div>
                      <div>
                        <div className="text-slate-500 text-[10px]">Belum Dikunjungi</div>
                        <div className="font-bold text-amber-600">{snap.summary.pb_not_visited}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => {
                          const rows = snap.visits.map((v, i) => ({
                            'No': i + 1,
                            'Waktu': formatDateTimeID(v.visited_at),
                            'Nama PB': v.beneficiary_name,
                            'Kode PB': v.pb_code,
                            'Desa': v.village_name,
                            'KPB': v.kpb_name,
                            'Petugas': v.tpm_name,
                            'Progres': `${v.progress_before}% -> ${v.progress_after}%`,
                            'Catatan': v.condition_notes,
                          }));
                          const ws = XLSX.utils.json_to_sheet(rows);
                          const wb = XLSX.utils.book_new();
                          XLSX.utils.book_append_sheet(wb, ws, 'Arsip Snapshot');
                          XLSX.writeFile(wb, `Arsip_${period?.week_start}_rev${snap.revision}.xlsx`);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Unduh Arsip Excel
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxPhoto && (
        <PhotoLightbox
          isOpen={true}
          photoUrl={lightboxPhoto.url}
          title={lightboxPhoto.title}
          metadata={lightboxPhoto.meta}
          onClose={() => setLightboxPhoto(null)}
        />
      )}
    </div>
  );
};
