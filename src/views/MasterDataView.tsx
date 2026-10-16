import React, { useState, useMemo } from 'react';
import {
  Database,
  Building,
  Users,
  Plus,
  Edit2,
  Archive,
  RotateCcw,
  Search,
  MoveRight,
  Eye,
  CheckCircle2,
  AlertTriangle,
  X,
  MapPin,
  Clock,
  Wallet,
  History,
} from 'lucide-react';
import { store } from '../services/store';
import { Village, KPB, Beneficiary } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { ReasonDialog } from '../components/common/ReasonDialog';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { formatDateID, formatDateTimeID } from '../utils/wita';

interface MasterDataViewProps {
  onNavigate: (view: string, params?: Record<string, string>) => void;
  initialTab?: 'villages' | 'kpbs' | 'pbs';
  selectedPbIdForDetail?: string;
}

export const MasterDataView: React.FC<MasterDataViewProps> = ({
  onNavigate,
  initialTab = 'pbs',
  selectedPbIdForDetail,
}) => {
  const db = store.getState();

  // Tabs: 'villages' | 'kpbs' | 'pbs'
  const [activeTab, setActiveTab] = useState<'villages' | 'kpbs' | 'pbs'>(initialTab);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVillageId, setFilterVillageId] = useState('all');
  const [filterKpbId, setFilterKpbId] = useState('all');
  const [filterStatusId, setFilterStatusId] = useState('all');
  const [showArchived, setShowArchived] = useState(false);

  // Modals
  const [villageModal, setVillageModal] = useState<{ isOpen: boolean; village?: Village }>({ isOpen: false });
  const [villageNameInput, setVillageNameInput] = useState('');

  const [kpbModal, setKpbModal] = useState<{ isOpen: boolean; kpb?: KPB }>({ isOpen: false });
  const [kpbNameInput, setKpbNameInput] = useState('');
  const [kpbVillageInput, setKpbVillageInput] = useState('');

  // Move KPB modal
  const [moveKpbTarget, setMoveKpbTarget] = useState<KPB | null>(null);
  const [targetVillageId, setTargetVillageId] = useState('');
  const [moveReason, setMoveReason] = useState('');

  // Add/Edit PB modal
  const [pbModal, setPbModal] = useState<{ isOpen: boolean; pb?: Beneficiary }>({ isOpen: false });
  const [pbFullName, setPbFullName] = useState('');
  const [pbVillageId, setPbVillageId] = useState('');
  const [pbKpbId, setPbKpbId] = useState('');
  const [pbAddress, setPbAddress] = useState('');
  const [pbPhone, setPbPhone] = useState('');
  const [pbLat, setPbLat] = useState<number | undefined>(undefined);
  const [pbLng, setPbLng] = useState<number | undefined>(undefined);
  const [pbStatusId, setPbStatusId] = useState(db.pb_statuses[0]?.id || '');
  const [pbNotes, setPbNotes] = useState('');
  const [pbFormError, setPbFormError] = useState('');

  // Detail PB modal
  const [detailPbId, setDetailPbId] = useState<string | null>(selectedPbIdForDetail || null);
  const [pbDetailTab, setPbDetailTab] = useState<'summary' | 'status_history' | 'visits' | 'payments'>('summary');

  // Reason dialog for Archive
  const [archiveTarget, setArchiveTarget] = useState<{
    type: 'village' | 'kpb' | 'pb';
    id: string;
    name: string;
  } | null>(null);

  // Status Change Dialog for PB
  const [statusChangeTarget, setStatusChangeTarget] = useState<{
    pb: Beneficiary;
    newStatusId: string;
  } | null>(null);

  // Village list
  const villages = useMemo(() => {
    return db.villages.filter((v) => showArchived || !v.is_archived);
  }, [db.villages, showArchived]);

  // KPB list
  const kpbs = useMemo(() => {
    return db.kpbs.filter((k) => {
      if (!showArchived && k.is_archived) return false;
      if (filterVillageId !== 'all' && k.village_id !== filterVillageId) return false;
      return true;
    });
  }, [db.kpbs, showArchived, filterVillageId]);

  // PB list
  const beneficiaries = useMemo(() => {
    return db.beneficiaries.filter((b) => {
      if (!showArchived && b.is_archived) return false;
      if (filterVillageId !== 'all' && b.village_id !== filterVillageId) return false;
      if (filterKpbId !== 'all' && b.kpb_id !== filterKpbId) return false;
      if (filterStatusId !== 'all' && b.status_id !== filterStatusId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!b.full_name.toLowerCase().includes(q) && !b.pb_code.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [db.beneficiaries, showArchived, filterVillageId, filterKpbId, filterStatusId, searchQuery]);

  // Selected PB for detail modal
  const detailPb = useMemo(() => {
    return db.beneficiaries.find((b) => b.id === detailPbId) || null;
  }, [db.beneficiaries, detailPbId]);

  // Village Handlers
  const handleSaveVillage = () => {
    if (!villageNameInput.trim()) return;
    if (villageModal.village) {
      store.updateVillage(villageModal.village.id, villageNameInput);
    } else {
      store.addVillage(villageNameInput);
    }
    setVillageModal({ isOpen: false });
    setVillageNameInput('');
  };

  // KPB Handlers
  const handleSaveKpb = () => {
    if (!kpbNameInput.trim() || !kpbVillageInput) return;
    if (kpbModal.kpb) {
      store.updateKPB(kpbModal.kpb.id, kpbNameInput);
    } else {
      store.addKPB(kpbVillageInput, kpbNameInput);
    }
    setKpbModal({ isOpen: false });
    setKpbNameInput('');
    setKpbVillageInput('');
  };

  // Move KPB Execution
  const handleConfirmMoveKpb = () => {
    if (!moveKpbTarget || !targetVillageId || !moveReason.trim()) return;
    const res = store.moveKPB(moveKpbTarget.id, targetVillageId, moveReason);
    if (res.success) {
      alert(`KPB ${moveKpbTarget.name} berhasil dipindahkan ke desa baru. ${res.affectedPBs} rumah PB diperbarui.`);
      setMoveKpbTarget(null);
      setTargetVillageId('');
      setMoveReason('');
    } else {
      alert(res.message || 'Gagal memindahkan KPB');
    }
  };

  // PB Handlers
  const handleOpenAddPb = () => {
    setPbModal({ isOpen: true });
    setPbFullName('');
    setPbVillageId(db.villages[0]?.id || '');
    setPbKpbId('');
    setPbAddress('');
    setPbPhone('');
    setPbLat(undefined);
    setPbLng(undefined);
    setPbStatusId(db.pb_statuses[0]?.id || '');
    setPbNotes('');
    setPbFormError('');
  };

  const handleOpenEditPb = (pb: Beneficiary) => {
    setPbModal({ isOpen: true, pb });
    setPbFullName(pb.full_name);
    setPbVillageId(pb.village_id);
    setPbKpbId(pb.kpb_id);
    setPbAddress(pb.address || '');
    setPbPhone(pb.phone || '');
    setPbLat(pb.latitude);
    setPbLng(pb.longitude);
    setPbStatusId(pb.status_id);
    setPbNotes(pb.notes || '');
    setPbFormError('');
  };

  const handleSavePb = (e: React.FormEvent) => {
    e.preventDefault();
    setPbFormError('');

    if (pbFullName.trim().length < 3) {
      setPbFormError('Nama lengkap minimal 3 karakter.');
      return;
    }
    if (!pbVillageId) {
      setPbFormError('Pilih Desa terkait.');
      return;
    }
    if (!pbKpbId) {
      setPbFormError('Pilih KPB terkait.');
      return;
    }

    if (pbModal.pb) {
      const res = store.updateBeneficiary(pbModal.pb.id, {
        full_name: pbFullName.trim(),
        village_id: pbVillageId,
        kpb_id: pbKpbId,
        address: pbAddress.trim(),
        phone: pbPhone.trim() || undefined,
        latitude: pbLat,
        longitude: pbLng,
        status_id: pbStatusId,
        notes: pbNotes.trim() || undefined,
      });
      if (res.success) {
        setPbModal({ isOpen: false });
      } else {
        setPbFormError(res.message || 'Gagal memperbarui PB.');
      }
    } else {
      const res = store.addBeneficiary({
        full_name: pbFullName.trim(),
        village_id: pbVillageId,
        kpb_id: pbKpbId,
        address: pbAddress.trim(),
        phone: pbPhone.trim() || undefined,
        latitude: pbLat,
        longitude: pbLng,
        status_id: pbStatusId,
        notes: pbNotes.trim() || undefined,
      });
      if (res.success) {
        setPbModal({ isOpen: false });
      } else {
        setPbFormError(res.message || 'Gagal menambahkan PB.');
      }
    }
  };

  // Archive Confirm
  const handleConfirmArchive = (reason: string) => {
    if (!archiveTarget) return;
    if (archiveTarget.type === 'village') {
      store.archiveVillage(archiveTarget.id, reason);
    } else if (archiveTarget.type === 'kpb') {
      store.archiveKPB(archiveTarget.id, reason);
    } else if (archiveTarget.type === 'pb') {
      store.archivePB(archiveTarget.id, reason);
    }
    setArchiveTarget(null);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Master Data Program
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pengelolaan hierarkis Desa Dampingan, Kelompok Penerima Bantuan (KPB), dan Penerima Bantuan (PB).
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('pbs')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'pbs' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Penerima Bantuan ({db.beneficiaries.filter((b) => !b.is_archived).length})
          </button>
          <button
            onClick={() => setActiveTab('kpbs')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'kpbs' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Master KPB ({db.kpbs.filter((k) => !k.is_archived).length})
          </button>
          <button
            onClick={() => setActiveTab('villages')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'villages' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Master Desa ({db.villages.filter((v) => !v.is_archived).length})
          </button>
        </div>
      </div>

      {/* TAB 1: MASTER PB */}
      {activeTab === 'pbs' && (
        <div className="space-y-4">
          {/* Controls Bar */}
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
                value={filterVillageId}
                onChange={(e) => {
                  setFilterVillageId(e.target.value);
                  setFilterKpbId('all');
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
                value={filterKpbId}
                onChange={(e) => setFilterKpbId(e.target.value)}
                className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="all">Semua KPB</option>
                {db.kpbs
                  .filter((k) => filterVillageId === 'all' || k.village_id === filterVillageId)
                  .map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name}
                    </option>
                  ))}
              </select>

              <select
                value={filterStatusId}
                onChange={(e) => setFilterStatusId(e.target.value)}
                className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="all">Semua Status PB</option>
                {db.pb_statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="rounded-sm text-blue-600"
                />
                Tampilkan Arsip
              </label>

              <button
                onClick={handleOpenAddPb}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                Tambah PB Baru
              </button>
            </div>
          </div>

          {/* PB Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="py-3 px-3">ID PB</th>
                    <th className="py-3 px-3">Nama Lengkap</th>
                    <th className="py-3 px-3">Desa / KPB</th>
                    <th className="py-3 px-3">Status Administrasi</th>
                    <th className="py-3 px-3">Progres</th>
                    <th className="py-3 px-3 text-center">GPS</th>
                    <th className="py-3 px-3 text-center">Pencairan</th>
                    <th className="py-3 px-3">Kunjungan Terakhir</th>
                    <th className="py-3 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {beneficiaries.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        Belum ada data Penerima Bantuan sesuai filter ini.
                      </td>
                    </tr>
                  ) : (
                    beneficiaries.map((pb) => {
                      const vil = db.villages.find((v) => v.id === pb.village_id);
                      const kpb = db.kpbs.find((k) => k.id === pb.kpb_id);
                      const status = db.pb_statuses.find((s) => s.id === pb.status_id);
                      const lastTpm = db.profiles.find((p) => p.id === pb.last_visit_by);

                      return (
                        <tr key={pb.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-3 font-mono font-bold text-blue-600 whitespace-nowrap">
                            {pb.pb_code}
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-900 whitespace-nowrap">
                            {pb.full_name}
                            {pb.is_archived && (
                              <span className="ml-1.5 px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px]">
                                Diarsipkan
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="text-slate-800">{vil?.name || '-'}</div>
                            <div className="text-[10px] text-slate-500">{kpb?.name || '-'}</div>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <StatusBadge label={status?.label || 'PB'} color={status?.color} />
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap font-mono tabular-nums">
                            <strong className="text-blue-700">{pb.current_progress}%</strong>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {pb.coord_status === 'ada' ? (
                              <span className="text-emerald-600 font-bold" title="Titik GPS Tersedia">✓</span>
                            ) : (
                              <span className="text-amber-500 text-[10px] font-bold" title="Belum Ada Titik">✕</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {(['toko_1', 'upah_1', 'toko_2', 'upah_2'] as const).map((stage) => {
                                const st = pb.payments[stage].state;
                                return (
                                  <span
                                    key={stage}
                                    title={`${stage}: ${st}`}
                                    className={`w-2 h-2 rounded-full ${
                                      st === 'sudah_dibayar'
                                        ? 'bg-emerald-500'
                                        : st === 'belum_dibayar'
                                        ? 'bg-rose-400'
                                        : 'bg-slate-300'
                                    }`}
                                  />
                                );
                              })}
                            </div>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            {pb.last_visit_at ? (
                              <div>
                                <div className="text-slate-800 font-medium">{formatDateID(pb.last_visit_at)}</div>
                                <div className="text-[10px] text-slate-400">{lastTpm?.display_name || 'TPM'}</div>
                              </div>
                            ) : (
                              <span className="text-slate-400">Belum ada</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setDetailPbId(pb.id)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="Lihat detail lengkap"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenEditPb(pb)}
                                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                                title="Edit Data PB"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              {!pb.is_archived ? (
                                <button
                                  onClick={() =>
                                    setArchiveTarget({
                                      type: 'pb',
                                      id: pb.id,
                                      name: pb.full_name,
                                    })
                                  }
                                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                  title="Arsipkan PB"
                                >
                                  <Archive className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => store.restorePB(pb.id)}
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                  title="Pulihkan PB dari Arsip"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              )}
                            </div>
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

      {/* TAB 2: MASTER KPB */}
      {activeTab === 'kpbs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500">
              Kelompok Penerima Bantuan terhubung ke Desa dan menaungi para penerima bantuan.
            </span>
            <button
              onClick={() => {
                setKpbModal({ isOpen: true });
                setKpbNameInput('');
                setKpbVillageInput(db.villages[0]?.id || '');
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              Tambah KPB Baru
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-3 px-3">Nama KPB</th>
                  <th className="py-3 px-3">Desa</th>
                  <th className="py-3 px-3 text-center">Jumlah PB</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {kpbs.map((kpb) => {
                  const vil = db.villages.find((v) => v.id === kpb.village_id);
                  const pbCount = db.beneficiaries.filter((b) => !b.is_archived && b.kpb_id === kpb.id).length;
                  return (
                    <tr key={kpb.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-3 font-bold text-slate-900">{kpb.name}</td>
                      <td className="py-3 px-3 text-slate-700">{vil?.name || '-'}</td>
                      <td className="py-3 px-3 text-center font-bold text-blue-700 font-mono">
                        {pbCount}
                      </td>
                      <td className="py-3 px-3">
                        {kpb.is_archived ? (
                          <span className="text-rose-600 font-semibold text-[10px]">Diarsipkan</span>
                        ) : (
                          <span className="text-emerald-600 font-semibold text-[10px]">Aktif</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setKpbModal({ isOpen: true, kpb });
                              setKpbNameInput(kpb.name);
                              setKpbVillageInput(kpb.village_id);
                            }}
                            className="p-1 text-slate-600 hover:text-blue-600"
                            title="Edit Nama KPB"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setMoveKpbTarget(kpb);
                              setTargetVillageId('');
                              setMoveReason('');
                            }}
                            className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-md font-semibold text-[11px] border border-amber-200"
                            title="Pindah KPB ke Desa Lain"
                          >
                            <MoveRight className="w-3.5 h-3.5" />
                            Pindah Desa
                          </button>
                          {!kpb.is_archived ? (
                            <button
                              onClick={() =>
                                setArchiveTarget({
                                  type: 'kpb',
                                  id: kpb.id,
                                  name: kpb.name,
                                })
                              }
                              className="p-1 text-rose-600 hover:text-rose-800"
                              title="Arsipkan KPB"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => store.restoreKPB(kpb.id)}
                              className="p-1 text-emerald-600 hover:text-emerald-800"
                              title="Pulihkan KPB"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: MASTER DESA */}
      {activeTab === 'villages' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500">
              Desa dampingan program Bedah Rumah 2026. Tidak dapat dihapus permanen untuk melindungi histori.
            </span>
            <button
              onClick={() => {
                setVillageModal({ isOpen: true });
                setVillageNameInput('');
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              Tambah Desa Baru
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-3 px-3">Nama Desa</th>
                  <th className="py-3 px-3 text-center">Jumlah KPB</th>
                  <th className="py-3 px-3 text-center">Jumlah PB</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {villages.map((vil) => {
                  const kpbCount = db.kpbs.filter((k) => !k.is_archived && k.village_id === vil.id).length;
                  const pbCount = db.beneficiaries.filter((b) => !b.is_archived && b.village_id === vil.id).length;
                  return (
                    <tr key={vil.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-3 font-bold text-slate-900">{vil.name}</td>
                      <td className="py-3 px-3 text-center font-bold text-slate-700 font-mono">{kpbCount}</td>
                      <td className="py-3 px-3 text-center font-bold text-blue-700 font-mono">{pbCount}</td>
                      <td className="py-3 px-3">
                        {vil.is_archived ? (
                          <span className="text-rose-600 font-semibold text-[10px]">Diarsipkan</span>
                        ) : (
                          <span className="text-emerald-600 font-semibold text-[10px]">Aktif</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setVillageModal({ isOpen: true, village: vil });
                              setVillageNameInput(vil.name);
                            }}
                            className="p-1 text-slate-600 hover:text-blue-600"
                            title="Edit Nama Desa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {!vil.is_archived ? (
                            <button
                              onClick={() =>
                                setArchiveTarget({
                                  type: 'village',
                                  id: vil.id,
                                  name: vil.name,
                                })
                              }
                              className="p-1 text-rose-600 hover:text-rose-800"
                              title="Arsipkan Desa"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => store.restoreVillage(vil.id)}
                              className="p-1 text-emerald-600 hover:text-emerald-800"
                              title="Pulihkan Desa"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Village Modal */}
      {villageModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <h4 className="text-sm font-bold text-slate-900">
              {villageModal.village ? 'Edit Nama Desa' : 'Tambah Desa Baru'}
            </h4>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Desa *</label>
              <input
                type="text"
                value={villageNameInput}
                onChange={(e) => setVillageNameInput(e.target.value)}
                placeholder="Contoh: Parepei..."
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setVillageModal({ isOpen: false })}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Batal
              </button>
              <button
                onClick={handleSaveVillage}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit KPB Modal */}
      {kpbModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <h4 className="text-sm font-bold text-slate-900">
              {kpbModal.kpb ? 'Edit Nama KPB' : 'Tambah KPB Baru'}
            </h4>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Desa Dampingan *</label>
                <select
                  disabled={!!kpbModal.kpb}
                  value={kpbVillageInput}
                  onChange={(e) => setKpbVillageInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">Pilih Desa...</option>
                  {db.villages.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama KPB *</label>
                <input
                  type="text"
                  value={kpbNameInput}
                  onChange={(e) => setKpbNameInput(e.target.value)}
                  placeholder="Contoh: SUMESEGAH..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setKpbModal({ isOpen: false })}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Batal
              </button>
              <button
                onClick={handleSaveKpb}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
              >
                Simpan KPB
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move KPB Transactional Modal */}
      {moveKpbTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MoveRight className="w-5 h-5 text-amber-600" />
              Pindahkan KPB {moveKpbTarget.name}
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tindakan ini akan memindahkan KPB ke desa baru serta memperbarui desa seluruh rumah PB di dalamnya dalam <strong>satu transaksi aman</strong>. Riwayat kunjungan lama tetap terjaga.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pilih Desa Tujuan *</label>
                <select
                  value={targetVillageId}
                  onChange={(e) => setTargetVillageId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">Pilih Desa Tujuan...</option>
                  {db.villages
                    .filter((v) => v.id !== moveKpbTarget.village_id && !v.is_archived)
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alasan Pemindahan *</label>
                <textarea
                  rows={2}
                  value={moveReason}
                  onChange={(e) => setMoveReason(e.target.value)}
                  placeholder="Tuliskan alasan pemindahan administratif..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setMoveKpbTarget(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmMoveKpb}
                disabled={!targetVillageId || !moveReason.trim()}
                className="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs disabled:opacity-50"
              >
                Konfirmasi Pindah KPB
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit PB Modal */}
      {pbModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900">
                {pbModal.pb ? `Edit Penerima Bantuan: ${pbModal.pb.pb_code}` : 'Tambah Penerima Bantuan (PB) Baru'}
              </h4>
              <button onClick={() => setPbModal({ isOpen: false })} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            {pbFormError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {pbFormError}
              </div>
            )}

            <form onSubmit={handleSavePb} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={pbFullName}
                  onChange={(e) => setPbFullName(e.target.value)}
                  placeholder="Nama sesuai KTP..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Desa *</label>
                  <select
                    required
                    value={pbVillageId}
                    onChange={(e) => {
                      setPbVillageId(e.target.value);
                      setPbKpbId('');
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">Pilih Desa...</option>
                    {db.villages.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">KPB *</label>
                  <select
                    required
                    value={pbKpbId}
                    onChange={(e) => setPbKpbId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">Pilih KPB...</option>
                    {db.kpbs
                      .filter((k) => k.village_id === pbVillageId)
                      .map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status Administrasi *</label>
                <select
                  value={pbStatusId}
                  onChange={(e) => setPbStatusId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
                >
                  {db.pb_statuses.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alamat / Lokasi Rumah</label>
                <input
                  type="text"
                  value={pbAddress}
                  onChange={(e) => setPbAddress(e.target.value)}
                  placeholder="Jaga / Lingkungan / RT RW..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={pbLat ?? ''}
                    onChange={(e) => setPbLat(e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="Contoh: 1.254321"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={pbLng ?? ''}
                    onChange={(e) => setPbLng(e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="Contoh: 124.812345"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan Tambahan</label>
                <textarea
                  rows={2}
                  value={pbNotes}
                  onChange={(e) => setPbNotes(e.target.value)}
                  placeholder="Keterangan khusus penerima..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPbModal({ isOpen: false })}
                  className="px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
                >
                  Simpan Penerima Bantuan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail PB Modal (7 Tabs) */}
      {detailPb && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-start justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-600">{detailPb.pb_code}</span>
                  <StatusBadge
                    label={db.pb_statuses.find((s) => s.id === detailPb.status_id)?.label || 'PB'}
                  />
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {detailPb.current_progress}% Progres
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">{detailPb.full_name}</h3>
              </div>
              <button onClick={() => setDetailPbId(null)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-tabs */}
            <div className="flex items-center gap-2 px-4 border-b border-slate-200 text-xs font-semibold bg-white">
              <button
                onClick={() => setPbDetailTab('summary')}
                className={`py-2.5 border-b-2 transition ${
                  pbDetailTab === 'summary' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
                }`}
              >
                Ringkasan
              </button>
              <button
                onClick={() => setPbDetailTab('status_history')}
                className={`py-2.5 border-b-2 transition ${
                  pbDetailTab === 'status_history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
                }`}
              >
                Riwayat Status
              </button>
              <button
                onClick={() => setPbDetailTab('visits')}
                className={`py-2.5 border-b-2 transition ${
                  pbDetailTab === 'visits' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
                }`}
              >
                Kunjungan ({db.monitoring_visits.filter((v) => v.beneficiary_id === detailPb.id).length})
              </button>
              <button
                onClick={() => setPbDetailTab('payments')}
                className={`py-2.5 border-b-2 transition ${
                  pbDetailTab === 'payments' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
                }`}
              >
                Pencairan
              </button>
            </div>

            {/* Sub-tab content */}
            <div className="flex-1 overflow-y-auto p-5 text-xs space-y-4">
              {pbDetailTab === 'summary' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Desa:</span>
                      <strong className="text-slate-800">
                        {db.villages.find((v) => v.id === detailPb.village_id)?.name}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">KPB:</span>
                      <strong className="text-slate-800">
                        {db.kpbs.find((k) => k.id === detailPb.kpb_id)?.name}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Alamat:</span>
                      <strong className="text-slate-800">{detailPb.address || '-'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Telepon:</span>
                      <strong className="text-slate-800">{detailPb.phone || '-'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Koordinat:</span>
                      <span className="font-mono text-slate-800">
                        {detailPb.latitude ? `${detailPb.latitude}, ${detailPb.longitude}` : 'Belum Ada'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Kunjungan Terakhir:</span>
                      <strong className="text-slate-800">{formatDateID(detailPb.last_visit_at)}</strong>
                    </div>
                  </div>

                  {/* Change Status Action */}
                  <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2">
                    <span className="font-bold text-blue-900 block">Ubah Status Administrasi PB:</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {db.pb_statuses
                        .filter((s) => s.id !== detailPb.status_id)
                        .map((s) => (
                          <button
                            key={s.id}
                            onClick={() =>
                              setStatusChangeTarget({
                                pb: detailPb,
                                newStatusId: s.id,
                              })
                            }
                            className="px-2.5 py-1 bg-white border border-blue-300 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold shadow-xs"
                          >
                            Ubah ke {s.label}
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {pbDetailTab === 'status_history' && (
                <div className="space-y-2">
                  <span className="font-bold text-slate-800 block">Riwayat Perubahan Status Administrasi:</span>
                  {db.beneficiary_status_history.filter((h) => h.beneficiary_id === detailPb.id).length === 0 ? (
                    <div className="text-slate-400 py-4 text-center">Belum ada riwayat perubahan status.</div>
                  ) : (
                    db.beneficiary_status_history
                      .filter((h) => h.beneficiary_id === detailPb.id)
                      .map((h) => {
                        const oldS = db.pb_statuses.find((s) => s.id === h.old_status_id)?.label || 'Awal';
                        const newS = db.pb_statuses.find((s) => s.id === h.new_status_id)?.label || '-';
                        const user = db.profiles.find((p) => p.id === h.changed_by);
                        return (
                          <div key={h.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                            <div className="flex justify-between text-slate-500">
                              <span className="font-bold text-slate-800">
                                {oldS} → <span className="text-blue-600">{newS}</span>
                              </span>
                              <span className="font-mono text-[10px]">{formatDateTimeID(h.changed_at)}</span>
                            </div>
                            <div className="text-slate-700">
                              <strong>Alasan:</strong> {h.reason}
                            </div>
                            <div className="text-slate-400 text-[10px]">Oleh: {user?.display_name || 'TPM'}</div>
                          </div>
                        );
                      })
                  )}
                </div>
              )}

              {pbDetailTab === 'visits' && (
                <div className="space-y-2">
                  {db.monitoring_visits
                    .filter((v) => v.beneficiary_id === detailPb.id)
                    .map((v) => (
                      <div key={v.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                        <div className="flex justify-between">
                          <span className="font-bold text-blue-700">{formatDateTimeID(v.visited_at)}</span>
                          <span className="font-mono font-bold text-slate-800">{v.progress_after}%</span>
                        </div>
                        <p className="text-slate-600 italic">"{v.condition_notes}"</p>
                      </div>
                    ))}
                </div>
              )}

              {pbDetailTab === 'payments' && (
                <div className="grid grid-cols-2 gap-3">
                  {(['toko_1', 'upah_1', 'toko_2', 'upah_2'] as const).map((stage) => {
                    const st = detailPb.payments[stage];
                    return (
                      <div key={stage} className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-slate-400 text-[10px] uppercase font-bold">{stage}</span>
                        <div className="text-sm font-bold text-slate-900 mt-1 capitalize">
                          {st.state.replace('_', ' ')}
                        </div>
                        {st.paid_date && (
                          <div className="text-[10px] text-slate-500 mt-0.5">Tanggal: {st.paid_date}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Archive Reason Dialog */}
      {archiveTarget && (
        <ReasonDialog
          isOpen={true}
          title={`Arsipkan ${archiveTarget.name}`}
          description="Data tidak akan dihapus permanen melainkan diarsipkan agar riwayat historis tetap utuh."
          minLength={5}
          isDestructive={true}
          confirmLabel="Arsipkan Sekarang"
          onConfirm={handleConfirmArchive}
          onCancel={() => setArchiveTarget(null)}
        />
      )}

      {/* Change PB Status Reason Dialog */}
      {statusChangeTarget && (
        <ReasonDialog
          isOpen={true}
          title={`Ubah Status PB: ${statusChangeTarget.pb.full_name}`}
          description={`Ubah status menjadi ${db.pb_statuses.find((s) => s.id === statusChangeTarget.newStatusId)?.label}. Alasan wajib dicatat ke riwayat audit.`}
          minLength={5}
          confirmLabel="Simpan Perubahan Status"
          onConfirm={(reason) => {
            store.changePBStatus(statusChangeTarget.pb.id, statusChangeTarget.newStatusId, reason);
            setStatusChangeTarget(null);
          }}
          onCancel={() => setStatusChangeTarget(null)}
        />
      )}
    </div>
  );
};
