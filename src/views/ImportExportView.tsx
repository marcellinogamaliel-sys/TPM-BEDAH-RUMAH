import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Download,
  Upload,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { store } from '../services/store';

export const ImportExportView: React.FC = () => {
  const db = store.getState();

  // Selected template type
  const [importType, setImportType] = useState<
    'desa_kpb' | 'master_pb' | 'koordinat_pb' | 'status_pb' | 'pencairan'
  >('master_pb');

  // Mode: 'tambah_baru' | 'perbarui'
  const [mode, setMode] = useState<'tambah_baru' | 'perbarui'>('tambah_baru');
  const [isAtomic, setIsAtomic] = useState(false);

  // Parsed rows
  const [fileName, setFileName] = useState('');
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [validatedRows, setValidatedRows] = useState<
    Array<{ rowNum: number; data: any; status: 'valid' | 'warning' | 'error'; messages: string[] }>
  >([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{
    total: number;
    success: number;
    failed: number;
    skipped: number;
  } | null>(null);

  // Template generators
  const downloadTemplate = (type: typeof importType) => {
    const wb = XLSX.utils.book_new();

    if (type === 'desa_kpb') {
      const data = [
        { Desa: 'Parepei', 'Nama KPB': 'SUMESEGAH' },
        { Desa: 'Parepei', 'Nama KPB': 'EMBUNG KULO' },
        { Desa: 'Kauneran Satu', 'Nama KPB': "PA'ASUN" },
        { Desa: 'Kiawa Satu Barat', 'Nama KPB': 'BLESSING KISBAR' },
        { Desa: 'Kiawa Satu Utara', 'Nama KPB': 'KANAAN DAMAI' },
      ];
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Template Desa KPB');
      XLSX.writeFile(wb, 'Template_Desa_KPB.xlsx');
    } else if (type === 'master_pb') {
      const data = [
        {
          'ID PB': '',
          'Nama Lengkap': 'Yohanes Lumempouw',
          Desa: 'Parepei',
          KPB: 'SUMESEGAH',
          Alamat: 'Jaga 2 No 14',
          Telepon: '081234567890',
          'Status PB': 'SK PPK',
          Latitude: '1.254321',
          Longitude: '124.812345',
          Catatan: 'Kondisi atap rusak parah',
        },
      ];
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Template Master PB');
      XLSX.writeFile(wb, 'Template_Master_PB.xlsx');
    } else if (type === 'koordinat_pb') {
      const data = [
        {
          'ID PB': 'PB-0001',
          'Nama PB': 'Yohanes Lumempouw',
          Desa: 'Parepei',
          KPB: 'SUMESEGAH',
          Latitude: '1.254321',
          Longitude: '124.812345',
        },
      ];
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Template Koordinat');
      XLSX.writeFile(wb, 'Template_Koordinat_PB.xlsx');
    } else if (type === 'status_pb') {
      const data = [
        {
          'ID PB': 'PB-0001',
          'Status Baru': 'PENGGANTI',
          Alasan: 'Penerima lama mundur karena pindah domisili',
        },
      ];
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Template Status');
      XLSX.writeFile(wb, 'Template_Status_PB.xlsx');
    } else if (type === 'pencairan') {
      const data = [
        {
          'ID PB': 'PB-0001',
          'Toko I': 'SUDAH',
          'Upah I': 'SUDAH',
          'Toko II': 'BELUM',
          'Upah II': 'BELUM',
        },
      ];
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Template Pencairan');
      XLSX.writeFile(wb, 'Template_Pencairan.xlsx');
    }
  };

  // Upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        setRawRows(data);
        validateRows(data, importType, mode);
      } catch (err) {
        alert('Gagal membaca file Excel/CSV. Pastikan format file valid.');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Validation logic
  const validateRows = (rows: any[], type: typeof importType, currentMode: typeof mode) => {
    const validated: Array<{ rowNum: number; data: any; status: 'valid' | 'warning' | 'error'; messages: string[] }> = [];

    rows.forEach((row, i) => {
      const rowNum = i + 2; // header is 1
      const messages: string[] = [];
      let status: 'valid' | 'warning' | 'error' = 'valid';

      if (type === 'master_pb') {
        const name = row['Nama Lengkap'] || row['nama lengkap'] || row['Nama'];
        const village = row['Desa'] || row['desa'];
        const kpb = row['KPB'] || row['kpb'] || row['Nama KPB'];
        const statusPb = row['Status PB'] || row['status pb'];

        if (!name || String(name).trim().length < 3) {
          status = 'error';
          messages.push('Nama Lengkap wajib diisi (min 3 karakter)');
        }
        if (!village) {
          status = 'error';
          messages.push('Kolom Desa wajib ada');
        } else {
          const vExists = db.villages.find((v) => v.name.toLowerCase() === String(village).toLowerCase().trim());
          if (!vExists) {
            status = 'error';
            messages.push(`Desa "${village}" tidak ditemukan di database master`);
          }
        }

        if (!kpb) {
          status = 'error';
          messages.push('Kolom KPB wajib ada');
        }

        // Coordinate normalization check
        let latStr = row['Latitude'] || row['latitude'];
        let lngStr = row['Longitude'] || row['longitude'];
        if (latStr && lngStr) {
          latStr = String(latStr).replace(',', '.').trim();
          lngStr = String(lngStr).replace(',', '.').trim();
          const lat = parseFloat(latStr);
          const lng = parseFloat(lngStr);
          if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            status = 'error';
            messages.push('Format koordinat tidak valid');
          } else if (lat > 90 || lng < 90) {
            status = 'warning';
            messages.push('Kemungkinan koordinat Latitude dan Longitude tertukar');
          }
        }
      } else if (type === 'desa_kpb') {
        const v = row['Desa'];
        const k = row['Nama KPB'] || row['KPB'];
        if (!v || !k) {
          status = 'error';
          messages.push('Kolom Desa dan Nama KPB wajib diisi');
        }
      } else if (type === 'koordinat_pb' || type === 'status_pb' || type === 'pencairan') {
        const id = row['ID PB'] || row['id pb'];
        if (!id) {
          status = 'error';
          messages.push('ID PB wajib diisi');
        } else {
          const pbExists = db.beneficiaries.find((b) => b.pb_code === id);
          if (!pbExists) {
            status = 'error';
            messages.push(`PB dengan kode "${id}" tidak ditemukan`);
          }
        }
      }

      validated.push({ rowNum, data: row, status, messages });
    });

    setValidatedRows(validated);
  };

  // Commit Import
  const handleCommitImport = () => {
    const errorCount = validatedRows.filter((r) => r.status === 'error').length;
    if (isAtomic && errorCount > 0) {
      alert(`Mode Atomik aktif: Impor dibatalkan karena terdapat ${errorCount} baris bermasalah.`);
      return;
    }

    setIsProcessing(true);

    let success = 0;
    let failed = 0;
    let skipped = 0;

    validatedRows.forEach((row) => {
      if (row.status === 'error') {
        failed++;
        return;
      }

      if (importType === 'master_pb') {
        const name = String(row.data['Nama Lengkap'] || row.data['nama'] || '').trim();
        const vName = String(row.data['Desa'] || '').trim();
        const kName = String(row.data['KPB'] || '').trim();
        const addr = String(row.data['Alamat'] || '').trim();
        const phone = String(row.data['Telepon'] || '').trim();
        const statusLabel = String(row.data['Status PB'] || 'SK PPK').trim();

        let lat: number | undefined;
        let lng: number | undefined;
        if (row.data['Latitude'] && row.data['Longitude']) {
          lat = parseFloat(String(row.data['Latitude']).replace(',', '.'));
          lng = parseFloat(String(row.data['Longitude']).replace(',', '.'));
        }

        // Find or create village & KPB
        let vil = db.villages.find((v) => v.name.toLowerCase() === vName.toLowerCase());
        if (!vil) {
          const resV = store.addVillage(vName);
          vil = resV.village;
        }

        let kpb = db.kpbs.find((k) => k.village_id === vil?.id && k.name.toLowerCase() === kName.toLowerCase());
        if (!kpb && vil) {
          const resK = store.addKPB(vil.id, kName);
          kpb = resK.kpb;
        }

        const statusObj =
          db.pb_statuses.find((s) => s.label.toLowerCase() === statusLabel.toLowerCase()) || db.pb_statuses[0];

        if (vil && kpb) {
          const customCode = row.data['ID PB'] ? String(row.data['ID PB']).trim() : undefined;
          const addRes = store.addBeneficiary({
            pb_code: customCode,
            full_name: name,
            village_id: vil.id,
            kpb_id: kpb.id,
            address: addr,
            phone: phone || undefined,
            latitude: lat,
            longitude: lng,
            status_id: statusObj.id,
            notes: row.data['Catatan'] ? String(row.data['Catatan']).trim() : undefined,
          });

          if (addRes.success) {
            success++;
          } else {
            failed++;
          }
        } else {
          failed++;
        }
      } else if (importType === 'desa_kpb') {
        const vName = String(row.data['Desa'] || '').trim();
        const kName = String(row.data['Nama KPB'] || '').trim();
        let vil = db.villages.find((v) => v.name.toLowerCase() === vName.toLowerCase());
        if (!vil) {
          const resV = store.addVillage(vName);
          vil = resV.village;
        }
        if (vil) {
          const exists = db.kpbs.some((k) => k.village_id === vil!.id && k.name.toLowerCase() === kName.toLowerCase());
          if (!exists) {
            store.addKPB(vil.id, kName);
            success++;
          } else {
            skipped++;
          }
        }
      }
    });

    setIsProcessing(false);
    setImportResult({ total: validatedRows.length, success, failed, skipped });
  };

  // Download Error Report
  const handleDownloadErrorReport = () => {
    const errorRows = validatedRows
      .filter((r) => r.status === 'error' || r.status === 'warning')
      .map((r) => ({
        'Nomor Baris': r.rowNum,
        Status: r.status.toUpperCase(),
        'Keterangan Masalah': r.messages.join('; '),
        'Data Mentah': JSON.stringify(r.data),
      }));

    const ws = XLSX.utils.json_to_sheet(errorRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Kesalahan');
    XLSX.writeFile(wb, `Laporan_Kesalahan_${Date.now()}.xlsx`);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Title */}
      <div className="pb-4 border-b border-slate-200">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Import & Template Excel
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Unduh template resmi, validasi baris otomatis, dan simpan data secara massal dengan aman.
        </p>
      </div>

      {/* Step 1: Download Templates */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700">
          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[11px]">
            1
          </span>
          Unduh Template Resmi (.xlsx)
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <button
            onClick={() => downloadTemplate('master_pb')}
            className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl text-left transition flex flex-col justify-between"
          >
            <span className="text-xs font-bold text-slate-900">Master PB</span>
            <span className="text-[10px] text-blue-600 font-semibold mt-2 flex items-center gap-1">
              <Download className="w-3 h-3" /> Unduh
            </span>
          </button>

          <button
            onClick={() => downloadTemplate('desa_kpb')}
            className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl text-left transition flex flex-col justify-between"
          >
            <span className="text-xs font-bold text-slate-900">Desa & KPB</span>
            <span className="text-[10px] text-blue-600 font-semibold mt-2 flex items-center gap-1">
              <Download className="w-3 h-3" /> Unduh
            </span>
          </button>

          <button
            onClick={() => downloadTemplate('koordinat_pb')}
            className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl text-left transition flex flex-col justify-between"
          >
            <span className="text-xs font-bold text-slate-900">Koordinat PB</span>
            <span className="text-[10px] text-blue-600 font-semibold mt-2 flex items-center gap-1">
              <Download className="w-3 h-3" /> Unduh
            </span>
          </button>

          <button
            onClick={() => downloadTemplate('status_pb')}
            className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl text-left transition flex flex-col justify-between"
          >
            <span className="text-xs font-bold text-slate-900">Status PB</span>
            <span className="text-[10px] text-blue-600 font-semibold mt-2 flex items-center gap-1">
              <Download className="w-3 h-3" /> Unduh
            </span>
          </button>

          <button
            onClick={() => downloadTemplate('pencairan')}
            className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl text-left transition flex flex-col justify-between"
          >
            <span className="text-xs font-bold text-slate-900">Pencairan</span>
            <span className="text-[10px] text-blue-600 font-semibold mt-2 flex items-center gap-1">
              <Download className="w-3 h-3" /> Unduh
            </span>
          </button>
        </div>
      </div>

      {/* Step 2: Upload & Configure */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700">
          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[11px]">
            2
          </span>
          Pilih Jenis & Unggah Berkas
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Jenis Import</label>
            <select
              value={importType}
              onChange={(e) => setImportType(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
            >
              <option value="master_pb">Master Penerima Bantuan (PB)</option>
              <option value="desa_kpb">Desa & KPB</option>
              <option value="koordinat_pb">Koordinat Lapangan PB</option>
              <option value="status_pb">Pembaruan Status Administrasi PB</option>
              <option value="pencairan">Status Pencairan Toko & Upah</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Mode Import</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
            >
              <option value="tambah_baru">Tambah Baru (Generate ID otomatis bila kosong)</option>
              <option value="perbarui">Perbarui Berdasarkan ID PB</option>
            </select>
          </div>
        </div>

        {/* Upload box */}
        <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl cursor-pointer bg-slate-50 hover:bg-blue-50/20 transition">
          <Upload className="w-8 h-8 text-slate-400 mb-1" />
          <span className="text-xs font-bold text-slate-800">
            {fileName ? `File Terpilih: ${fileName}` : 'Klik untuk Unggah Berkas Excel (.xlsx) atau .csv'}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5">Maks. 5 MB / 5.000 baris</span>
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Step 3: Validation & Preview */}
      {validatedRows.length > 0 && (
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[11px]">
                3
              </span>
              Pratinjau Hasil Validasi ({validatedRows.length} Baris)
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="text-emerald-700 font-semibold">
                ✓ {validatedRows.filter((r) => r.status === 'valid').length} Valid
              </span>
              <span className="text-rose-700 font-semibold">
                ✕ {validatedRows.filter((r) => r.status === 'error').length} Error
              </span>
              {validatedRows.some((r) => r.status === 'error') && (
                <button
                  onClick={handleDownloadErrorReport}
                  className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-lg text-xs font-semibold"
                >
                  Unduh Laporan Error
                </button>
              )}
            </div>
          </div>

          {/* Validation Options */}
          <div className="flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              id="atomic"
              checked={isAtomic}
              onChange={(e) => setIsAtomic(e.target.checked)}
              className="rounded-sm text-blue-600"
            />
            <label htmlFor="atomic" className="cursor-pointer">
              <strong>Mode Atomik:</strong> Batalkan seluruh proses jika ada satu baris saja yang error.
            </label>
          </div>

          {/* Preview Table */}
          <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 text-xs">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 font-bold">
                <tr>
                  <th className="p-2 w-12 text-center">Baris</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Data Cuplikan</th>
                  <th className="p-2">Pesan Validasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {validatedRows.slice(0, 50).map((r) => (
                  <tr key={r.rowNum} className={r.status === 'error' ? 'bg-rose-50/50' : ''}>
                    <td className="p-2 text-center font-mono text-slate-500">{r.rowNum}</td>
                    <td className="p-2 whitespace-nowrap">
                      {r.status === 'valid' && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">
                          Valid
                        </span>
                      )}
                      {r.status === 'warning' && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold">
                          Peringatan
                        </span>
                      )}
                      {r.status === 'error' && (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded text-[10px] font-bold">
                          Error
                        </span>
                      )}
                    </td>
                    <td className="p-2 font-mono text-[11px] text-slate-700 truncate max-w-xs">
                      {JSON.stringify(r.data)}
                    </td>
                    <td className="p-2 text-slate-600">
                      {r.messages.length > 0 ? r.messages.join(', ') : 'Siap diproses'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Commit Button */}
          <div className="pt-2">
            <button
              onClick={handleCommitImport}
              disabled={isProcessing}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition disabled:opacity-50"
            >
              {isProcessing ? 'Memproses Data...' : 'Konfirmasi & Simpan ke Database'}
            </button>
          </div>
        </div>
      )}

      {/* Success Banner */}
      {importResult && (
        <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Proses Import Selesai!
          </div>
          <div className="grid grid-cols-4 gap-2 text-slate-700 pt-1">
            <div className="bg-white p-2 rounded-lg border border-emerald-100">
              <span className="text-[10px] text-slate-400 block">Total Baris</span>
              <strong className="text-slate-900 text-sm font-mono">{importResult.total}</strong>
            </div>
            <div className="bg-white p-2 rounded-lg border border-emerald-100">
              <span className="text-[10px] text-slate-400 block">Berhasil Disimpan</span>
              <strong className="text-emerald-700 text-sm font-mono">{importResult.success}</strong>
            </div>
            <div className="bg-white p-2 rounded-lg border border-emerald-100">
              <span className="text-[10px] text-slate-400 block">Gagal / Ditolak</span>
              <strong className="text-rose-700 text-sm font-mono">{importResult.failed}</strong>
            </div>
            <div className="bg-white p-2 rounded-lg border border-emerald-100">
              <span className="text-[10px] text-slate-400 block">Dilewati</span>
              <strong className="text-slate-700 text-sm font-mono">{importResult.skipped}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
