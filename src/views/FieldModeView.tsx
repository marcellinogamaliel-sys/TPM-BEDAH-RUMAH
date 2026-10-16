import React, { useState, useMemo, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  MapPin,
  MessageCircle,
  Navigation,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  X,
  Search,
  ClipboardCheck,
  Wallet,
  Image,
  ArrowLeft,
  Smartphone,
} from 'lucide-react';
import { store } from '../services/store';
import { Beneficiary } from '../types';
import { normalizeWhatsAppNumber, getGoogleMapsDirUrl, formatDateID } from '../utils/wita';

interface FieldModeViewProps {
  onNavigate: (view: string, params?: Record<string, string>) => void;
  onOpenMonitoringForPB: (pbId: string) => void;
}

export const FieldModeView: React.FC<FieldModeViewProps> = ({
  onNavigate,
  onOpenMonitoringForPB,
}) => {
  const db = store.getState();
  const currentUser = store.currentUser;

  // Wizard state: 1: Select Village, 2: Select KPB, 3: Field Workspace (Map + List)
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedVillageId, setSelectedVillageId] = useState<string>('');
  const [selectedKpbId, setSelectedKpbId] = useState<string>('');

  // Selected PB for bottom sheet
  const [activePb, setActivePb] = useState<Beneficiary | null>(null);

  // Filter chips
  const [filterChip, setFilterChip] = useState<'all' | 'unvisited' | 'issues' | 'ongoing'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Mini Map ref
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerGroupRef = useRef<L.LayerGroup | null>(null);

  // Partner TPM for WhatsApp
  const partnerProfile = useMemo(() => {
    if (!currentUser) return null;
    return db.profiles.find((p) => p.role !== currentUser.role && p.is_active) || null;
  }, [currentUser, db.profiles]);

  // Village data
  const selectedVillage = db.villages.find((v) => v.id === selectedVillageId);
  const selectedKpb = db.kpbs.find((k) => k.id === selectedKpbId);

  // Available KPBs
  const kpbsInVillage = useMemo(() => {
    return db.kpbs.filter((k) => !k.is_archived && k.village_id === selectedVillageId);
  }, [db.kpbs, selectedVillageId]);

  // PBs in selected KPB
  const pbsInKpb = useMemo(() => {
    return db.beneficiaries.filter((b) => !b.is_archived && b.kpb_id === selectedKpbId);
  }, [db.beneficiaries, selectedKpbId]);

  // Filtered PB list
  const filteredPBs = useMemo(() => {
    return pbsInKpb.filter((b) => {
      const weekly = store.getWeeklyMarkerStatus(b.id);

      if (filterChip === 'unvisited' && weekly.visitsCount > 0) return false;
      if (filterChip === 'ongoing' && b.current_progress === 100) return false;
      if (filterChip === 'issues') {
        const hasIssue = db.issues.some((i) => i.beneficiary_id === b.id && i.status !== 'selesai');
        if (!hasIssue) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!b.full_name.toLowerCase().includes(q) && !b.pb_code.toLowerCase().includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [pbsInKpb, filterChip, searchQuery, db.issues]);

  // Initialize or update Mini Map when entering Step 3
  useEffect(() => {
    if (step !== 3 || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [1.25, 124.8],
        zoom: 13,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OSM',
        maxZoom: 18,
      }).addTo(map);

      markerGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const group = markerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();
    const bounds = L.latLngBounds([]);

    filteredPBs.forEach((pb) => {
      if (pb.latitude === undefined || pb.longitude === undefined) return;
      bounds.extend([pb.latitude, pb.longitude]);

      const weekly = store.getWeeklyMarkerStatus(pb.id);
      const colorHex =
        weekly.color === 'purple'
          ? '#7C3AED'
          : weekly.color === 'blue'
          ? '#2563EB'
          : weekly.color === 'teal'
          ? '#0D9488'
          : '#64748B';

      const icon = L.divIcon({
        className: 'field-pin',
        html: `
          <div style="
            background-color: ${colorHex};
            width: 22px;
            height: 22px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          ">
            <span style="transform: rotate(45deg); color: white; font-weight: 700; font-size: 8px;">
              ${weekly.badge}
            </span>
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 22],
      });

      const m = L.marker([pb.latitude, pb.longitude], { icon });
      m.on('click', () => {
        setActivePb(pb);
      });
      group.addLayer(m);
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 15 });
    }
  }, [step, filteredPBs]);

  // Handle WhatsApp Call to Partner TPM
  const handleOpenWhatsApp = () => {
    if (!partnerProfile) {
      alert('Profil rekan TPM tidak ditemukan.');
      return;
    }
    const cleanNumber = normalizeWhatsAppNumber(partnerProfile.whatsapp_number);
    if (!cleanNumber) {
      alert(`Nomor WhatsApp untuk ${partnerProfile.display_name} belum disetel atau tidak valid. Silakan atur di menu Pengaturan.`);
      return;
    }
    const url = `https://wa.me/${cleanNumber}?text=Halo%20${encodeURIComponent(partnerProfile.display_name)},%20saya%20sedang%20monitoring%20di%20lapangan.`;
    window.open(url, '_blank');
  };

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] bg-slate-100 flex flex-col">
      {/* Step 1: Select Village */}
      {step === 1 && (
        <div className="p-4 sm:p-6 max-w-xl mx-auto w-full space-y-4 animate-in fade-in duration-200">
          <div className="text-center space-y-1 mb-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 text-teal-800 rounded-full text-xs font-bold border border-teal-200">
              <Smartphone className="w-3.5 h-3.5" />
              MODE LAPANGAN
            </div>
            <h2 className="text-xl font-bold text-slate-900">Pilih Desa Dampingan</h2>
            <p className="text-xs text-slate-500">Pilih desa untuk memulai monitoring satu tangan</p>
          </div>

          <div className="space-y-3">
            {db.villages
              .filter((v) => !v.is_archived)
              .map((vil) => {
                const pbsInVil = db.beneficiaries.filter((b) => !b.is_archived && b.village_id === vil.id);
                const unvisitedCount = pbsInVil.filter(
                  (b) => store.getWeeklyMarkerStatus(b.id).visitsCount === 0
                ).length;

                return (
                  <button
                    key={vil.id}
                    onClick={() => {
                      setSelectedVillageId(vil.id);
                      setStep(2);
                    }}
                    className="w-full p-4 bg-white rounded-2xl border border-slate-200 hover:border-blue-500 shadow-xs flex items-center justify-between text-left transition active:scale-[0.99]"
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-base">{vil.name}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {pbsInVil.length} Penerima Bantuan
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {unvisitedCount > 0 ? (
                        <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
                          {unvisitedCount} Belum
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                          Lengkap
                        </span>
                      )}
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Step 2: Select KPB */}
      {step === 2 && (
        <div className="p-4 sm:p-6 max-w-xl mx-auto w-full space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Desa
            </button>
            <span className="text-xs font-bold text-slate-900">{selectedVillage?.name}</span>
          </div>

          <div className="text-center space-y-1 my-2">
            <h2 className="text-xl font-bold text-slate-900">Pilih Kelompok (KPB)</h2>
            <p className="text-xs text-slate-500">Pilih KPB untuk menampilkan peta dan daftar PB</p>
          </div>

          <div className="space-y-3">
            {kpbsInVillage.map((kpb) => {
              const pbs = db.beneficiaries.filter((b) => !b.is_archived && b.kpb_id === kpb.id);
              const unvisited = pbs.filter(
                (b) => store.getWeeklyMarkerStatus(b.id).visitsCount === 0
              ).length;

              return (
                <button
                  key={kpb.id}
                  onClick={() => {
                    setSelectedKpbId(kpb.id);
                    setStep(3);
                  }}
                  className="w-full p-4 bg-white rounded-2xl border border-slate-200 hover:border-teal-500 shadow-xs flex items-center justify-between text-left transition active:scale-[0.99]"
                >
                  <div>
                    <div className="font-bold text-slate-900 text-base">{kpb.name}</div>
                    <div className="text-xs text-slate-500 mt-1">{pbs.length} Rumah PB</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                      {unvisited} Belum
                    </span>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 3: Field Workspace (Mini Map 40% + PB List 60%) */}
      {step === 3 && (
        <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] relative overflow-hidden">
          {/* Top Info Bar */}
          <div className="h-11 bg-white border-b border-slate-200 px-3 flex items-center justify-between text-xs shrink-0 z-20">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{selectedVillage?.name} · {selectedKpb?.name}</span>
            </button>
            <span className="font-mono tabular-nums text-slate-500">
              {filteredPBs.length} PB
            </span>
          </div>

          {/* Mini Map (Height 40%) */}
          <div className="h-[38vh] w-full relative z-10 shrink-0 border-b border-slate-200">
            <div ref={mapContainerRef} className="w-full h-full" />
            <div className="absolute bottom-2 right-2 z-20 bg-white/90 backdrop-blur-xs px-2 py-1 rounded-md text-[10px] text-slate-600 font-medium border border-slate-200">
              Ketuk titik marker untuk menu tindakan
            </div>
          </div>

          {/* Bottom Feed (Height ~60%) */}
          <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
            {/* Filter Chips & Quick Search */}
            <div className="p-2.5 bg-white border-b border-slate-200 space-y-2 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama / kode PB..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                <button
                  onClick={() => setFilterChip('all')}
                  className={`px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition ${
                    filterChip === 'all'
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Semua ({pbsInKpb.length})
                </button>
                <button
                  onClick={() => setFilterChip('unvisited')}
                  className={`px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition ${
                    filterChip === 'unvisited'
                      ? 'bg-amber-600 text-white font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Belum Dikunjungi
                </button>
                <button
                  onClick={() => setFilterChip('ongoing')}
                  className={`px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition ${
                    filterChip === 'ongoing'
                      ? 'bg-teal-600 text-white font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Progres &lt; 100%
                </button>
                <button
                  onClick={() => setFilterChip('issues')}
                  className={`px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition ${
                    filterChip === 'issues'
                      ? 'bg-rose-600 text-white font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Ada Kendala
                </button>
              </div>
            </div>

            {/* PB List Cards */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 pb-24">
              {filteredPBs.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  Tidak ada Penerima Bantuan sesuai filter ini.
                </div>
              ) : (
                filteredPBs.map((pb) => {
                  const weekly = store.getWeeklyMarkerStatus(pb.id);
                  const hasIssue = db.issues.some((i) => i.beneficiary_id === pb.id && i.status !== 'selesai');

                  return (
                    <button
                      key={pb.id}
                      onClick={() => setActivePb(pb)}
                      className="w-full p-3.5 bg-white rounded-xl border border-slate-200 hover:border-blue-400 shadow-xs flex items-center justify-between text-left transition active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-3">
                        {/* Weekly Status Indicator */}
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-xs shrink-0 ${
                            weekly.color === 'purple'
                              ? 'bg-purple-600'
                              : weekly.color === 'blue'
                              ? 'bg-blue-600'
                              : weekly.color === 'teal'
                              ? 'bg-teal-600'
                              : 'bg-slate-400'
                          }`}
                        >
                          {weekly.badge}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900">{pb.full_name}</span>
                            {hasIssue && (
                              <span title="Ada kendala aktif">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {pb.pb_code} · {pb.address || 'Alamat belum ada'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-bold text-blue-700 tabular-nums">
                          {pb.current_progress}%
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {weekly.visitsCount > 0 ? `${weekly.visitsCount}x minggu ini` : 'Belum'}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Floating WhatsApp Partner Button */}
          {partnerProfile && (
            <button
              onClick={handleOpenWhatsApp}
              className="fixed bottom-20 md:bottom-6 right-5 z-40 flex items-center gap-2 px-4 py-3 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-full shadow-2xl transition-transform active:scale-95 text-xs font-bold"
              title={`Hubungi ${partnerProfile.display_name} via WhatsApp`}
            >
              <MessageCircle className="w-5 h-5 fill-current" />
              <span>WA {partnerProfile.role === 'tpm_pemberdayaan' ? 'Pemberdayaan' : 'Konstruksi'}</span>
            </button>
          )}

          {/* Bottom Sheet 7 Actions */}
          {activePb && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-150">
              <div className="bg-white rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto shadow-2xl space-y-4">
                {/* Drag handle */}
                <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto" />

                {/* PB Header */}
                <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                  <div>
                    <div className="text-[10px] font-mono font-bold text-blue-600">{activePb.pb_code}</div>
                    <h3 className="text-base font-bold text-slate-900">{activePb.full_name}</h3>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Progres: <strong className="text-blue-700">{activePb.current_progress}%</strong> · Kunjungan terakhir: {formatDateID(activePb.last_visit_at)}
                    </div>
                  </div>
                  <button
                    onClick={() => setActivePb(null)}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* 7 Actions Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Action 1: Update Progres */}
                  <button
                    onClick={() => {
                      const id = activePb.id;
                      setActivePb(null);
                      onOpenMonitoringForPB(id);
                    }}
                    className="flex items-center gap-3 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                  >
                    <ClipboardCheck className="w-4 h-4 shrink-0" />
                    <span>1. Update Progres (Monitoring)</span>
                  </button>

                  {/* Action 2: Cek Rute */}
                  {activePb.latitude && activePb.longitude ? (
                    <a
                      href={getGoogleMapsDirUrl(activePb.latitude, activePb.longitude)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition text-center justify-start"
                    >
                      <Navigation className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>2. Cek Rute (Google Maps)</span>
                    </a>
                  ) : (
                    <button
                      onClick={() => alert('Koordinat GPS untuk PB ini belum ditetapkan.')}
                      className="flex items-center gap-3 p-3 bg-slate-100 text-slate-400 rounded-xl text-xs font-medium cursor-not-allowed"
                    >
                      <Navigation className="w-4 h-4 shrink-0" />
                      <span>2. Cek Rute (GPS Belum Ada)</span>
                    </button>
                  )}

                  {/* Action 3: Cek Status PB */}
                  <button
                    onClick={() => {
                      alert(`Status Administrasi: ${db.pb_statuses.find((s) => s.id === activePb.status_id)?.label || '-'}\nAlamat: ${activePb.address}\nTelepon: ${activePb.phone || '-'}\nCatatan: ${activePb.notes || '-'}`);
                    }}
                    className="flex items-center gap-3 p-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-600" />
                    <span>3. Cek Status PB</span>
                  </button>

                  {/* Action 4: Cek Status Pembayaran */}
                  <button
                    onClick={() => {
                      alert(`Status 4 Tahap Pembayaran ${activePb.full_name}:\n- Toko I: ${activePb.payments.toko_1.state}\n- Upah I: ${activePb.payments.upah_1.state}\n- Toko II: ${activePb.payments.toko_2.state}\n- Upah II: ${activePb.payments.upah_2.state}`);
                    }}
                    className="flex items-center gap-3 p-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition"
                  >
                    <Wallet className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>4. Cek Status Pembayaran</span>
                  </button>

                  {/* Action 5: Riwayat Kunjungan */}
                  <button
                    onClick={() => {
                      setActivePb(null);
                      onNavigate('recap', { pbId: activePb.id });
                    }}
                    className="flex items-center gap-3 p-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition"
                  >
                    <Clock className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>5. Riwayat Kunjungan</span>
                  </button>

                  {/* Action 6: Lihat Foto */}
                  <button
                    onClick={() => {
                      setActivePb(null);
                      onNavigate('gallery', { pbId: activePb.id });
                    }}
                    className="flex items-center gap-3 p-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition"
                  >
                    <Image className="w-4 h-4 shrink-0 text-teal-600" />
                    <span>6. Lihat Foto Dokumentasi</span>
                  </button>

                  {/* Action 7: Lihat Kendala */}
                  <button
                    onClick={() => {
                      setActivePb(null);
                      onNavigate('issues', { pbId: activePb.id });
                    }}
                    className="flex items-center gap-3 p-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition sm:col-span-2"
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>7. Lihat Kendala Terkait</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
