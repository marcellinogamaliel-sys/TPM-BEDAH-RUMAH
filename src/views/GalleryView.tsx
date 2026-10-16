import React, { useState, useMemo } from 'react';
import {
  Image,
  Filter,
  Search,
  Calendar,
  User,
  MapPin,
  Eye,
  Camera,
  Layers,
} from 'lucide-react';
import { store } from '../services/store';
import { PhotoType } from '../types';
import { PhotoLightbox } from '../components/common/PhotoLightbox';
import { formatDateID } from '../utils/wita';

interface GalleryViewProps {
  onNavigate: (view: string) => void;
  filterPbId?: string;
}

export const GalleryView: React.FC<GalleryViewProps> = ({ onNavigate, filterPbId }) => {
  const db = store.getState();

  // Filters
  const [selectedVillageId, setSelectedVillageId] = useState('all');
  const [selectedKpbId, setSelectedKpbId] = useState('all');
  const [selectedType, setSelectedType] = useState<'all' | PhotoType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected photo for Lightbox
  const [activePhoto, setActivePhoto] = useState<{
    url: string;
    title: string;
    type: string;
    metadata?: any;
  } | null>(null);

  // Filtered Photos
  const photosWithMeta = useMemo(() => {
    return db.visit_photos.map((photo) => {
      // Find related visit or issue
      const visit = db.monitoring_visits.find((v) => v.id === photo.visit_id);
      const issue = db.issues.find((i) => i.id === photo.issue_id);

      const pbId = visit?.beneficiary_id || issue?.beneficiary_id;
      const pb = db.beneficiaries.find((b) => b.id === pbId);
      const vil = db.villages.find((v) => v.id === (visit?.village_id || issue?.village_id || pb?.village_id));
      const kpb = db.kpbs.find((k) => k.id === (visit?.kpb_id || issue?.kpb_id || pb?.kpb_id));
      const uploader = db.profiles.find((p) => p.id === photo.uploaded_by);

      return {
        ...photo,
        pb,
        village: vil,
        kpb,
        uploader,
        visit,
        issue,
      };
    });
  }, [db.visit_photos, db.monitoring_visits, db.issues, db.beneficiaries, db.villages, db.kpbs, db.profiles]);

  const filteredPhotos = useMemo(() => {
    return photosWithMeta.filter((p) => {
      if (filterPbId && p.pb?.id !== filterPbId) return false;
      if (selectedVillageId !== 'all' && p.village?.id !== selectedVillageId) return false;
      if (selectedKpbId !== 'all' && p.kpb?.id !== selectedKpbId) return false;
      if (selectedType !== 'all' && p.photo_type !== selectedType) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesPb = p.pb?.full_name.toLowerCase().includes(q) || p.pb?.pb_code.toLowerCase().includes(q);
        if (!matchesPb) return false;
      }

      return true;
    });
  }, [photosWithMeta, filterPbId, selectedVillageId, selectedKpbId, selectedType, searchQuery]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Galeri Foto Dokumentasi Lapangan
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Arsip foto terverifikasi: selfie kunjungan, fisik pembangunan, kendala, dan bukti penyelesaian.
          </p>
        </div>

        <div className="text-xs font-mono font-bold text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
          Total {filteredPhotos.length} Foto Tersimpan
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
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
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
          >
            <option value="all">Semua Jenis Foto</option>
            <option value="selfie">Selfie Petugas TPM</option>
            <option value="construction">Fisik Pembangunan</option>
            <option value="issue">Hambatan / Kendala</option>
            <option value="resolution">Bukti Penyelesaian</option>
          </select>

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
        </div>

        {(selectedType !== 'all' || selectedVillageId !== 'all' || searchQuery) && (
          <button
            onClick={() => {
              setSelectedType('all');
              setSelectedVillageId('all');
              setSelectedKpbId('all');
              setSearchQuery('');
            }}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
          >
            Reset Filter
          </button>
        )}
      </div>

      {/* Grid of Photos */}
      {filteredPhotos.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-400 space-y-2">
          <Image className="w-10 h-10 text-slate-300 mx-auto" />
          <p>Belum ada dokumentasi foto yang sesuai filter.</p>
          <p className="text-[11px] text-slate-400">
            Foto otomatis diarsipkan saat melakukan monitoring kunjungan atau melaporkan kendala.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredPhotos.map((photo) => {
            const isSelfie = photo.photo_type === 'selfie';
            const isResolution = photo.photo_type === 'resolution';
            const isIssue = photo.photo_type === 'issue';

            const typeLabel = isSelfie
              ? 'Selfie TPM'
              : isResolution
              ? 'Penyelesaian'
              : isIssue
              ? 'Kendala'
              : 'Pembangunan';

            return (
              <button
                key={photo.id}
                onClick={() =>
                  setActivePhoto({
                    url: photo.storage_path,
                    title: photo.pb?.full_name || 'Dokumentasi Lapangan',
                    type: typeLabel,
                    metadata: {
                      pbName: photo.pb?.full_name,
                      villageName: photo.village?.name,
                      kpbName: photo.kpb?.name,
                      uploaderName: photo.uploader?.display_name,
                      date: photo.visit?.visited_at || photo.created_at,
                      progress: photo.visit?.progress_after,
                      notes: photo.visit?.condition_notes,
                      gps: photo.visit?.gps_lat
                        ? { lat: photo.visit.gps_lat, lng: photo.visit.gps_lng! }
                        : undefined,
                    },
                  })
                }
                className="group relative bg-slate-900 rounded-xl overflow-hidden aspect-square border border-slate-200 shadow-xs focus:outline-hidden text-left"
              >
                <img
                  src={photo.storage_path}
                  alt={typeLabel}
                  loading="lazy"
                  className="w-full h-full object-cover transition duration-200 group-hover:scale-105"
                />

                {/* Type Badge */}
                <div className="absolute top-2 left-2 z-10">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold shadow-xs ${
                      isSelfie
                        ? 'bg-blue-600 text-white'
                        : isResolution
                        ? 'bg-emerald-600 text-white'
                        : isIssue
                        ? 'bg-rose-600 text-white'
                        : 'bg-black/60 text-white'
                    }`}
                  >
                    {typeLabel}
                  </span>
                </div>

                {/* Bottom Overlay Info */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 text-white">
                  <div className="text-[11px] font-bold truncate">
                    {photo.pb?.full_name || 'Dokumentasi'}
                  </div>
                  <div className="text-[9px] text-slate-300 truncate">
                    {photo.village?.name || '-'} · {formatDateID(photo.created_at)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal */}
      {activePhoto && (
        <PhotoLightbox
          isOpen={true}
          photoUrl={activePhoto.url}
          title={activePhoto.title}
          type={activePhoto.type}
          metadata={activePhoto.metadata}
          onClose={() => setActivePhoto(null)}
        />
      )}
    </div>
  );
};
