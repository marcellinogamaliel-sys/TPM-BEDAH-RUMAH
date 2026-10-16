import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Navigation,
  ClipboardCheck,
  Search,
  Filter,
  AlertCircle,
  Eye,
  CheckCircle,
} from 'lucide-react';
import { store } from '../services/store';
import { Beneficiary } from '../types';
import { getGoogleMapsDirUrl, formatDateID } from '../utils/wita';

interface MapViewProps {
  onNavigate: (view: string, params?: Record<string, string>) => void;
  onSelectPBForMonitoring?: (pbId: string) => void;
}

export const MapView: React.FC<MapViewProps> = ({ onNavigate, onSelectPBForMonitoring }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const db = store.getState();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVillageId, setSelectedVillageId] = useState('all');
  const [selectedKpbId, setSelectedKpbId] = useState('all');
  const [selectedVisitFilter, setSelectedVisitFilter] = useState<'all' | 'visited' | 'unvisited'>('all');
  const [selectedStatusId, setSelectedStatusId] = useState('all');
  const [showUnlocatedPanel, setShowUnlocatedPanel] = useState(false);

  // Active PBs
  const allActivePBs = useMemo(() => {
    return db.beneficiaries.filter((b) => !b.is_archived);
  }, [db.beneficiaries]);

  // PBs with valid coordinates
  const locatedPBs = useMemo(() => {
    return allActivePBs.filter(
      (b) =>
        b.latitude !== undefined &&
        b.longitude !== undefined &&
        b.latitude !== null &&
        b.longitude !== null &&
        !isNaN(b.latitude) &&
        !isNaN(b.longitude)
    );
  }, [allActivePBs]);

  // PBs without coordinates
  const unlocatedPBs = useMemo(() => {
    return allActivePBs.filter(
      (b) =>
        b.latitude === undefined ||
        b.longitude === undefined ||
        b.latitude === null ||
        b.longitude === null ||
        isNaN(b.latitude) ||
        isNaN(b.longitude)
    );
  }, [allActivePBs]);

  // Filtered located PBs
  const filteredPBs = useMemo(() => {
    return locatedPBs.filter((b) => {
      if (selectedVillageId !== 'all' && b.village_id !== selectedVillageId) return false;
      if (selectedKpbId !== 'all' && b.kpb_id !== selectedKpbId) return false;
      if (selectedStatusId !== 'all' && b.status_id !== selectedStatusId) return false;

      const weeklyStatus = store.getWeeklyMarkerStatus(b.id);
      if (selectedVisitFilter === 'visited' && weeklyStatus.visitsCount === 0) return false;
      if (selectedVisitFilter === 'unvisited' && weeklyStatus.visitsCount > 0) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = b.full_name.toLowerCase().includes(query);
        const matchesCode = b.pb_code.toLowerCase().includes(query);
        if (!matchesName && !matchesCode) return false;
      }

      return true;
    });
  }, [locatedPBs, selectedVillageId, selectedKpbId, selectedStatusId, selectedVisitFilter, searchQuery]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default center: Minahasa, North Sulawesi coordinates (~1.25, 124.8)
      const map = L.map(mapContainerRef.current, {
        center: [1.25, 124.8],
        zoom: 12,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      // Keep map alive or cleanup if unmounting
    };
  }, []);

  // Update Markers on filter change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    const bounds = L.latLngBounds([]);

    filteredPBs.forEach((pb) => {
      if (pb.latitude === undefined || pb.longitude === undefined) return;

      const lat = pb.latitude;
      const lng = pb.longitude;
      bounds.extend([lat, lng]);

      const weekly = store.getWeeklyMarkerStatus(pb.id);
      const village = db.villages.find((v) => v.id === pb.village_id);
      const kpb = db.kpbs.find((k) => k.id === pb.kpb_id);
      const status = db.pb_statuses.find((s) => s.id === pb.status_id);

      // Active issues for this PB
      const pbIssues = db.issues.filter((i) => i.beneficiary_id === pb.id && i.status !== 'selesai');

      // Create Custom HTML Pin with letter indicator
      // Colors:
      // Gray: #64748B, Blue: #2563EB, Teal: #0D9488, Purple: #7C3AED
      const colorHex =
        weekly.color === 'purple'
          ? '#7C3AED'
          : weekly.color === 'blue'
          ? '#2563EB'
          : weekly.color === 'teal'
          ? '#0D9488'
          : '#64748B';

      const customIcon = L.divIcon({
        className: 'custom-pin',
        html: `
          <div style="
            background-color: ${colorHex};
            width: 28px;
            height: 28px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 3px 6px rgba(0,0,0,0.3);
            border: 2px solid white;
          ">
            <span style="
              transform: rotate(45deg);
              color: white;
              font-weight: 700;
              font-size: 10px;
              font-family: sans-serif;
            ">${weekly.badge}</span>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -28],
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      // Popup Content
      const popupHtml = `
        <div style="font-family: system-ui, sans-serif; font-size: 12px; min-width: 210px; line-height: 1.4;">
          <div style="font-size: 10px; font-weight: 700; color: #64748b; letter-spacing: 0.5px;">${pb.pb_code} · ${village?.name || ''}</div>
          <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin: 2px 0 4px 0;">${pb.full_name}</div>
          
          <div style="display: flex; gap: 4px; margin-bottom: 6px;">
            <span style="background: #eff6ff; color: #1d4ed8; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">
              ${status?.label || 'PB'}
            </span>
            <span style="background: #f0fdf4; color: #15803d; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 700;">
              ${pb.current_progress}% Progres
            </span>
          </div>

          <div style="color: #475569; font-size: 11px; margin-bottom: 6px;">
            KPB: <strong>${kpb?.name || '-'}</strong><br/>
            Kunjungan Terakhir: <strong>${formatDateID(pb.last_visit_at)}</strong>
          </div>

          ${
            pbIssues.length > 0
              ? `<div style="background: #fff1f2; color: #be123c; padding: 4px; border-radius: 4px; font-size: 10px; margin-bottom: 6px; font-weight: 600;">
                  ⚠️ Ada ${pbIssues.length} kendala aktif!
                 </div>`
              : ''
          }

          <div style="display: flex; gap: 4px; margin-top: 8px; border-top: 1px solid #e2e8f0; padding-top: 8px;">
            <a href="${getGoogleMapsDirUrl(lat, lng)}" target="_blank" rel="noopener noreferrer" style="
              flex: 1;
              background: #0b1f3a;
              color: white;
              padding: 5px 8px;
              border-radius: 6px;
              text-align: center;
              text-decoration: none;
              font-size: 11px;
              font-weight: 600;
              display: inline-block;
            ">
              🚗 Navigasi Rute
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      layer.addLayer(marker);
    });

    if (filteredPBs.length > 0 && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [filteredPBs, db.villages, db.kpbs, db.pb_statuses, db.issues]);

  const handleFixCoordinate = (pb: Beneficiary) => {
    const latStr = prompt(`Masukkan Latitude baru untuk ${pb.full_name}:`, pb.latitude?.toString() || '1.2');
    if (!latStr) return;
    const lngStr = prompt(`Masukkan Longitude baru untuk ${pb.full_name}:`, pb.longitude?.toString() || '124.8');
    if (!lngStr) return;

    const lat = parseFloat(latStr.replace(',', '.'));
    const lng = parseFloat(lngStr.replace(',', '.'));

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      alert('Koordinat tidak valid! Latitude harus antara -90 dan 90, Longitude antara -180 dan 180.');
      return;
    }

    const res = store.updateBeneficiary(pb.id, { latitude: lat, longitude: lng });
    if (res.success) {
      alert(`Koordinat ${pb.full_name} berhasil diperbarui.`);
    } else {
      alert(res.message || 'Gagal memperbarui koordinat.');
    }
  };

  return (
    <div className="relative h-[calc(100vh-3.5rem)] flex flex-col md:flex-row overflow-hidden bg-slate-100">
      {/* Map Main Canvas */}
      <div className="flex-1 relative h-full">
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Floating Filter Bar on Map (Desktop & Tablet) */}
        <div className="absolute top-3 left-3 right-3 sm:right-auto z-20 bg-white/95 backdrop-blur-md p-3 rounded-xl shadow-lg border border-slate-200/80 flex flex-wrap items-center gap-2 max-w-2xl">
          {/* Search */}
          <div className="relative flex-1 min-w-[140px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari PB / ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Desa Filter */}
          <select
            value={selectedVillageId}
            onChange={(e) => {
              setSelectedVillageId(e.target.value);
              setSelectedKpbId('all');
            }}
            className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
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

          {/* Weekly Status Filter */}
          <select
            value={selectedVisitFilter}
            onChange={(e) => setSelectedVisitFilter(e.target.value as any)}
            className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
          >
            <option value="all">Semua Kunjungan</option>
            <option value="visited">Sudah Dikunjungi Minggu Ini</option>
            <option value="unvisited">Belum Dikunjungi Minggu Ini</option>
          </select>

          {/* Unlocated Counter Trigger */}
          {unlocatedPBs.length > 0 && (
            <button
              onClick={() => setShowUnlocatedPanel(!showUnlocatedPanel)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition"
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>{unlocatedPBs.length} Tanpa Koordinat</span>
            </button>
          )}
        </div>

        {/* Legend Box in Bottom Left */}
        <div className="absolute bottom-5 left-3 z-20 bg-white/95 backdrop-blur-md p-3 rounded-xl shadow-lg border border-slate-200 text-xs space-y-1.5 max-w-xs pointer-events-auto">
          <div className="font-bold text-slate-900 text-[11px] uppercase tracking-wider mb-1">
            Status Kunjungan Minggu Ini
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-[#64748B] text-white font-bold text-[9px] flex items-center justify-center shrink-0">
              –
            </span>
            <span className="text-slate-600">Belum dikunjungi</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-[#2563EB] text-white font-bold text-[9px] flex items-center justify-center shrink-0">
              P
            </span>
            <span className="text-slate-600">TPM Pemberdayaan</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-[#0D9488] text-white font-bold text-[9px] flex items-center justify-center shrink-0">
              K
            </span>
            <span className="text-slate-600">TPM Konstruksi</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-[#7C3AED] text-white font-bold text-[9px] flex items-center justify-center shrink-0">
              P+K
            </span>
            <span className="text-slate-600 font-semibold text-slate-800">Kedua TPM</span>
          </div>
        </div>
      </div>

      {/* Side Drawer: PB Tanpa Koordinat */}
      {showUnlocatedPanel && (
        <div className="w-full md:w-80 bg-white border-l border-slate-200 flex flex-col h-full z-30 shadow-xl animate-in slide-in-from-right duration-200">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-amber-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                PB Tanpa Koordinat GPS
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {unlocatedPBs.length} rumah belum memiliki titik di peta
              </p>
            </div>
            <button
              onClick={() => setShowUnlocatedPanel(false)}
              className="text-xs text-slate-500 hover:text-slate-800 font-bold px-2 py-1"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-2">
            {unlocatedPBs.map((pb) => {
              const vil = db.villages.find((v) => v.id === pb.village_id);
              const kpb = db.kpbs.find((k) => k.id === pb.kpb_id);
              return (
                <div key={pb.id} className="p-3 rounded-lg border border-slate-200 bg-white space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[10px] font-mono font-bold text-slate-500">{pb.pb_code}</div>
                      <div className="text-xs font-bold text-slate-900">{pb.full_name}</div>
                      <div className="text-[11px] text-slate-500">
                        {vil?.name} · {kpb?.name}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-700">{pb.current_progress}%</span>
                  </div>

                  <button
                    onClick={() => handleFixCoordinate(pb)}
                    className="w-full py-1.5 px-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    Tetapkan Koordinat
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
