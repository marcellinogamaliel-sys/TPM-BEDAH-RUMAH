import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Wallet,
  Check,
  X,
  Search,
  Filter,
  FileSpreadsheet,
  FileText,
  Printer,
  AlertTriangle,
} from 'lucide-react';
import { store } from '../services/store';
import { Beneficiary, PaymentStage, PaymentState } from '../types';
import { ReasonDialog } from '../components/common/ReasonDialog';
import { formatDateTimeID } from '../utils/wita';

interface PaymentsViewProps {
  onNavigate: (view: string) => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = () => {
  const db = store.getState();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVillageId, setSelectedVillageId] = useState('all');
  const [selectedKpbId, setSelectedKpbId] = useState('all');
  const [selectedStageFilter, setSelectedStageFilter] = useState<'all' | PaymentStage>('all');
  const [selectedStateFilter, setSelectedStateFilter] = useState<'all' | 'sudah' | 'belum'>('all');

  // Unmark modal
  const [unmarkTarget, setUnmarkTarget] = useState<{
    pb: Beneficiary;
    stage: PaymentStage;
  } | null>(null);

  // Active PBs
  const allActivePBs = useMemo(() => {
    return db.beneficiaries.filter((b) => !b.is_archived);
  }, [db.beneficiaries]);

  // Filtered list
  const filteredPBs = useMemo(() => {
    return allActivePBs.filter((b) => {
      if (selectedVillageId !== 'all' && b.village_id !== selectedVillageId) return false;
      if (selectedKpbId !== 'all' && b.kpb_id !== selectedKpbId) return false;

      if (selectedStageFilter !== 'all') {
        const state = b.payments[selectedStageFilter].state;
        if (selectedStateFilter === 'sudah' && state !== 'sudah_dibayar') return false;
        if (selectedStateFilter === 'belum' && state === 'sudah_dibayar') return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!b.full_name.toLowerCase().includes(q) && !b.pb_code.toLowerCase().includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [allActivePBs, selectedVillageId, selectedKpbId, selectedStageFilter, selectedStateFilter, searchQuery]);

  // Totals
  const countPaid = (stage: PaymentStage) =>
    allActivePBs.filter((b) => b.payments[stage].state === 'sudah_dibayar').length;

  const handleCellClick = (pb: Beneficiary, stage: PaymentStage) => {
    const currentState = pb.payments[stage].state;
    if (currentState === 'sudah_dibayar') {
      // Uncheck requires reason dialog
      setUnmarkTarget({ pb, stage });
    } else {
      // Mark as paid directly
      store.setPaymentState(pb.id, stage, 'sudah_dibayar');
    }
  };

  const handleConfirmUnmark = (reason: string) => {
    if (!unmarkTarget) return;
    store.setPaymentState(unmarkTarget.pb.id, stageDisplayName(unmarkTarget.stage), 'belum_dibayar', reason);
    setUnmarkTarget(null);
  };

  const stageDisplayName = (stage: PaymentStage) => stage;

  // Render cell
  const renderPaymentCell = (pb: Beneficiary, stage: PaymentStage) => {
    const record = pb.payments[stage];
    const isPaid = record.state === 'sudah_dibayar';
    const isVerifiedUnpaid = record.state === 'belum_dibayar';

    return (
      <div className="flex items-center justify-center">
        <button
          type="button"
          onClick={() => handleCellClick(pb, stage)}
          title={
            isPaid
              ? `Sudah Dibayar (${record.paid_date || 'tercatat'}). Klik untuk membatalkan.`
              : isVerifiedUnpaid
              ? 'Terverifikasi Belum Dibayar. Klik untuk tandai Sudah Dibayar.'
              : 'Belum Diverifikasi. Klik untuk tandai Sudah Dibayar.'
          }
          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
            isPaid
              ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700'
              : isVerifiedUnpaid
              ? 'bg-rose-50 border-2 border-rose-400 text-rose-600 hover:bg-rose-100'
              : 'bg-slate-50 border-2 border-dashed border-slate-300 hover:border-slate-400 text-transparent'
          }`}
        >
          {isPaid && <Check className="w-4 h-4 stroke-[3]" />}
          {isVerifiedUnpaid && <span className="text-[10px] font-bold">X</span>}
        </button>
      </div>
    );
  };

  // Export to Excel
  const handleExportExcel = () => {
    const rows = filteredPBs.map((pb, idx) => {
      const vil = db.villages.find((v) => v.id === pb.village_id);
      const kpb = db.kpbs.find((k) => k.id === pb.kpb_id);
      return {
        'No.': idx + 1,
        'Kode PB': pb.pb_code,
        'Nama Lengkap': pb.full_name,
        Desa: vil?.name || '',
        KPB: kpb?.name || '',
        'Toko I': pb.payments.toko_1.state === 'sudah_dibayar' ? 'SUDAH' : 'BELUM',
        'Upah I': pb.payments.upah_1.state === 'sudah_dibayar' ? 'SUDAH' : 'BELUM',
        'Toko II': pb.payments.toko_2.state === 'sudah_dibayar' ? 'SUDAH' : 'BELUM',
        'Upah II': pb.payments.upah_2.state === 'sudah_dibayar' ? 'SUDAH' : 'BELUM',
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pencairan');
    XLSX.writeFile(wb, `Pencairan_Toko_Upah_${Date.now()}.xlsx`);
  };

  // Export to PDF
  const handleExportPDF = () => {
    const doc = new jsPDF('landscape');
    doc.setFontSize(14);
    doc.text('SISTEM MONITORING BEDAH RUMAH 2026 — TPM', 14, 15);
    doc.setFontSize(10);
    doc.text('Laporan Rekapitulasi Status Pencairan Toko & Upah', 14, 22);
    doc.text(`Waktu Cetak: ${formatDateTimeID(new Date())}`, 14, 28);

    const tableRows = filteredPBs.map((pb, i) => {
      const vil = db.villages.find((v) => v.id === pb.village_id);
      const kpb = db.kpbs.find((k) => k.id === pb.kpb_id);
      return [
        i + 1,
        pb.pb_code,
        pb.full_name,
        vil?.name || '',
        kpb?.name || '',
        pb.payments.toko_1.state === 'sudah_dibayar' ? 'SUDAH' : 'BELUM',
        pb.payments.upah_1.state === 'sudah_dibayar' ? 'SUDAH' : 'BELUM',
        pb.payments.toko_2.state === 'sudah_dibayar' ? 'SUDAH' : 'BELUM',
        pb.payments.upah_2.state === 'sudah_dibayar' ? 'SUDAH' : 'BELUM',
      ];
    });

    autoTable(doc, {
      startY: 32,
      head: [['No', 'ID PB', 'Nama Lengkap', 'Desa', 'KPB', 'Toko I', 'Upah I', 'Toko II', 'Upah II']],
      body: tableRows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [11, 31, 58] },
    });

    doc.save(`Laporan_Pencairan_Toko_Upah_${Date.now()}.pdf`);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Pencairan Toko & Upah
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Matriks status penyaluran bahan bangunan Toko I & II serta upah tukang I & II.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cetak</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Toko I (Bahan Awal)
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
            {countPaid('toko_1')}{' '}
            <span className="text-xs font-normal text-slate-400">/ {allActivePBs.length}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {allActivePBs.length > 0 ? Math.round((countPaid('toko_1') / allActivePBs.length) * 100) : 0}% terealisasi
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Upah I (Tahap 1)
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
            {countPaid('upah_1')}{' '}
            <span className="text-xs font-normal text-slate-400">/ {allActivePBs.length}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {allActivePBs.length > 0 ? Math.round((countPaid('upah_1') / allActivePBs.length) * 100) : 0}% terealisasi
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Toko II (Bahan Finishing)
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
            {countPaid('toko_2')}{' '}
            <span className="text-xs font-normal text-slate-400">/ {allActivePBs.length}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {allActivePBs.length > 0 ? Math.round((countPaid('toko_2') / allActivePBs.length) * 100) : 0}% terealisasi
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Upah II (Pelunasan)
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
            {countPaid('upah_2')}{' '}
            <span className="text-xs font-normal text-slate-400">/ {allActivePBs.length}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {allActivePBs.length > 0 ? Math.round((countPaid('upah_2') / allActivePBs.length) * 100) : 0}% terealisasi
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari PB / ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          <select
            value={selectedVillageId}
            onChange={(e) => {
              setSelectedVillageId(e.target.value);
              setSelectedKpbId('all');
            }}
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
            value={selectedKpbId}
            onChange={(e) => setSelectedKpbId(e.target.value)}
            className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
          >
            <option value="all">Semua KPB</option>
            {db.kpbs
              .filter((k) => selectedVillageId === 'all' || k.village_id === selectedVillageId)
              .map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
          </select>

          <select
            value={selectedStageFilter}
            onChange={(e) => setSelectedStageFilter(e.target.value as any)}
            className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
          >
            <option value="all">Semua Tahap</option>
            <option value="toko_1">Toko I</option>
            <option value="upah_1">Upah I</option>
            <option value="toko_2">Toko II</option>
            <option value="upah_2">Upah II</option>
          </select>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-emerald-600 text-white flex items-center justify-center text-[10px]">
              ✓
            </span>
            <span>Sudah</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-rose-50 border border-rose-300 text-rose-600 flex items-center justify-center text-[10px]">
              ✕
            </span>
            <span>Belum</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded border border-dashed border-slate-300"></span>
            <span>Belum Verifikasi</span>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <th className="py-3 px-3 w-10 text-center">No</th>
                <th className="py-3 px-3">Nama Lengkap</th>
                <th className="py-3 px-3">Desa</th>
                <th className="py-3 px-3">KPB</th>
                <th className="py-3 px-3 text-center">Toko I</th>
                <th className="py-3 px-3 text-center">Upah I</th>
                <th className="py-3 px-3 text-center">Toko II</th>
                <th className="py-3 px-3 text-center">Upah II</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPBs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Belum ada data penerima bantuan.
                  </td>
                </tr>
              ) : (
                filteredPBs.map((pb, idx) => {
                  const vil = db.villages.find((v) => v.id === pb.village_id);
                  const kpb = db.kpbs.find((k) => k.id === pb.kpb_id);
                  return (
                    <tr key={pb.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{pb.full_name}</div>
                        <div className="text-[10px] text-blue-600 font-mono">{pb.pb_code}</div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-slate-800">{vil?.name}</td>
                      <td className="py-3 px-3 whitespace-nowrap text-slate-600">{kpb?.name}</td>
                      <td className="py-3 px-3 text-center">{renderPaymentCell(pb, 'toko_1')}</td>
                      <td className="py-3 px-3 text-center">{renderPaymentCell(pb, 'upah_1')}</td>
                      <td className="py-3 px-3 text-center">{renderPaymentCell(pb, 'toko_2')}</td>
                      <td className="py-3 px-3 text-center">{renderPaymentCell(pb, 'upah_2')}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unmark Reason Dialog */}
      {unmarkTarget && (
        <ReasonDialog
          isOpen={true}
          title={`Batalkan Status Sudah Dibayar: ${unmarkTarget.pb.full_name}`}
          description={`Anda akan membatalkan status sudah dibayar untuk tahap ${unmarkTarget.stage.toUpperCase()}. Tindakan ini akan dicatat ke audit log.`}
          placeholder="Tuliskan alasan pembatalan centang pembayaran..."
          minLength={5}
          confirmLabel="Konfirmasi Pembatalan"
          isDestructive={true}
          onConfirm={handleConfirmUnmark}
          onCancel={() => setUnmarkTarget(null)}
        />
      )}
    </div>
  );
};
