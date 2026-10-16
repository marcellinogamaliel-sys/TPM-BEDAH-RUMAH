import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Upload,
  X,
  RefreshCw,
  Sliders,
  AlertTriangle,
} from 'lucide-react';
import { store } from '../services/store';
import { Beneficiary, IssuePriority } from '../types';
import { calculateDistanceMeters } from '../utils/wita';

interface MonitoringViewProps {
  initialBeneficiaryId?: string;
  onSuccess?: () => void;
  onNavigate: (view: string) => void;
}

export const MonitoringView: React.FC<MonitoringViewProps> = ({
  initialBeneficiaryId,
  onSuccess,
  onNavigate,
}) => {
  const db = store.getState();
  const currentUser = store.currentUser;

  // Selected cascade
  const [selectedVillageId, setSelectedVillageId] = useState('');
  const [selectedKpbId, setSelectedKpbId] = useState('');
  const [selectedPbId, setSelectedPbId] = useState(initialBeneficiaryId || '');

  // Form states
  const [visitedAt, setVisitedAt] = useState(() => {
    const now = new Date();
    // format as YYYY-MM-DDTHH:mm
    return now.toISOString().slice(0, 16);
  });
  const [progress, setProgress] = useState<number>(0);
  const [progressChangeReason, setProgressChangeReason] = useState('');
  const [conditionNotes, setConditionNotes] = useState('');
  const [recommendation, setRecommendation] = useState('');

  // GPS
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [gpsError, setGpsError] = useState('');
  const [gpsUnavailableReason, setGpsUnavailableReason] = useState('');

  // Camera Selfie (Direct getUserMedia)
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [selfieDataUrl, setSelfieDataUrl] = useState<string | null>(null);

  // Construction Photos
  const [constructionPhotos, setConstructionPhotos] = useState<string[]>([]);

  // Instant Issue
  const [hasIssue, setHasIssue] = useState(false);
  const [issueTitle, setIssueTitle] = useState('');
  const [issueCategory, setIssueCategory] = useState(db.issue_categories[0]?.id || '');
  const [issuePriority, setIssuePriority] = useState<IssuePriority>('sedang');
  const [issueDesc, setIssueDesc] = useState('');

  // Submitting
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Selected Beneficiary Object
  const selectedPb: Beneficiary | undefined = db.beneficiaries.find((b) => b.id === selectedPbId);

  // Pre-fill cascade if initialBeneficiaryId passed
  useEffect(() => {
    if (initialBeneficiaryId) {
      const b = db.beneficiaries.find((item) => item.id === initialBeneficiaryId);
      if (b) {
        setSelectedVillageId(b.village_id);
        setSelectedKpbId(b.kpb_id);
        setSelectedPbId(b.id);
        setProgress(b.current_progress);
      }
    }
  }, [initialBeneficiaryId, db.beneficiaries]);

  // When PB changes, update progress
  useEffect(() => {
    if (selectedPb) {
      setProgress(selectedPb.current_progress);
    }
  }, [selectedPbId]);

  // Request GPS
  const handleGetGPS = () => {
    if (!navigator.geolocation) {
      setGpsError('Browser tidak mendukung pendeteksi lokasi GPS.');
      return;
    }
    setGpsLoading(true);
    setGpsError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        setGpsCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        });
      },
      (err) => {
        setGpsLoading(false);
        setGpsError(`GPS gagal diperoleh (${err.message}). Tuliskan alasan di bawah.`);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Start Camera
  const startCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      setCameraError('Kamera tidak dapat diakses. Mohon izinkan izin kamera di browser untuk verifikasi selfie.');
      setCameraActive(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Take Snapshot
  const captureSelfie = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setSelfieDataUrl(dataUrl);
      stopCamera();
    }
  };

  // Retake
  const retakeSelfie = () => {
    setSelfieDataUrl(null);
    startCamera();
  };

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Upload Construction Photos (Client compressed data URL)
  const handleUploadConstructionPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (constructionPhotos.length >= 10) {
        alert('Maksimal 10 foto pembangunan per kunjungan.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setConstructionPhotos((prev) => [...prev, ev.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Submit Monitoring
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!selectedPb) {
      setSubmitError('Pilih Penerima Bantuan (PB) terlebih dahulu.');
      return;
    }

    if (!selfieDataUrl) {
      setSubmitError('Selfie kamera langsung wajib diambil sebelum formulir dapat dikirim.');
      return;
    }

    if (progress < selectedPb.current_progress && !progressChangeReason.trim()) {
      setSubmitError('Alasan penurunan progres wajib diisi.');
      return;
    }

    if (!gpsCoords && !gpsUnavailableReason.trim()) {
      setSubmitError('GPS tidak tersedia: mohon tuliskan alasan (mis. sinyal GPS lemah).');
      return;
    }

    if (conditionNotes.trim().length < 5) {
      setSubmitError('Catatan kondisi rumah minimal 5 karakter.');
      return;
    }

    setSubmitting(true);

    const clientOpId = 'op-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);

    const res = store.createVisit({
      client_op_id: clientOpId,
      beneficiary_id: selectedPb.id,
      visited_at: new Date(visitedAt).toISOString(),
      progress_after: progress,
      progress_change_reason: progressChangeReason,
      condition_notes: conditionNotes,
      recommendation,
      gps_lat: gpsCoords?.lat,
      gps_lng: gpsCoords?.lng,
      gps_accuracy_m: gpsCoords?.accuracy,
      gps_unavailable_reason: gpsUnavailableReason,
      selfie_data_url: selfieDataUrl,
      construction_photo_data_urls: constructionPhotos,
      instant_issue: hasIssue
        ? {
            title: issueTitle,
            category_id: issueCategory,
            priority: issuePriority,
            description: issueDesc,
          }
        : undefined,
    });

    setSubmitting(false);

    if (res.success) {
      setSubmitSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onNavigate('recap');
      }, 1500);
    } else {
      setSubmitError(res.message || 'Gagal menyimpan monitoring kunjungan.');
    }
  };

  // Available PBs
  const availablePbs = db.beneficiaries.filter(
    (b) => !b.is_archived && (!selectedKpbId || b.kpb_id === selectedKpbId)
  );

  // Distance warning calculation
  const distanceMeters =
    gpsCoords && selectedPb?.latitude && selectedPb?.longitude
      ? calculateDistanceMeters(gpsCoords.lat, gpsCoords.lng, selectedPb.latitude, selectedPb.longitude)
      : null;

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      {/* Title */}
      <div className="pb-4 border-b border-slate-200">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Form Monitoring Kunjungan Lapangan
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Catat verifikasi faktual progres fisik, verifikasi selfie langsung, koordinat GPS, dan dokumentasi foto.
        </p>
      </div>

      {submitSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <div className="font-bold">Monitoring Kunjungan Berhasil Disimpan!</div>
            <div className="text-xs text-emerald-700 mt-0.5">
              Progres PB diperbarui dan tercatat pada rekap mingguan berjalan. Mengalihkan...
            </div>
          </div>
        </div>
      )}

      {submitError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="font-medium">{submitError}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-5 sm:p-7 rounded-2xl border border-slate-200 shadow-xs">
        {/* Step 1: Desa, KPB & PB Selection */}
        <div className="space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[11px]">
              1
            </span>
            Penerima Bantuan & Lokasi
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Desa Dampingan <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={selectedVillageId}
                onChange={(e) => {
                  setSelectedVillageId(e.target.value);
                  setSelectedKpbId('');
                  setSelectedPbId('');
                }}
                className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-600"
              >
                <option value="">Pilih Desa...</option>
                {db.villages
                  .filter((v) => !v.is_archived)
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kelompok Penerima Bantuan (KPB) <span className="text-rose-500">*</span>
              </label>
              <select
                required
                disabled={!selectedVillageId}
                value={selectedKpbId}
                onChange={(e) => {
                  setSelectedKpbId(e.target.value);
                  setSelectedPbId('');
                }}
                className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-600 disabled:opacity-50"
              >
                <option value="">Pilih KPB...</option>
                {db.kpbs
                  .filter((k) => !k.is_archived && k.village_id === selectedVillageId)
                  .map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Penerima Bantuan (PB) <span className="text-rose-500">*</span>
            </label>
            <select
              required
              disabled={!selectedKpbId}
              value={selectedPbId}
              onChange={(e) => setSelectedPbId(e.target.value)}
              className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-600 disabled:opacity-50 font-medium"
            >
              <option value="">Pilih Penerima Bantuan...</option>
              {availablePbs.map((pb) => (
                <option key={pb.id} value={pb.id}>
                  {pb.pb_code} - {pb.full_name} (Progres saat ini: {pb.current_progress}%)
                </option>
              ))}
            </select>
          </div>

          {/* Quick info if PB selected */}
          {selectedPb && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-slate-500">Alamat:</span> <strong>{selectedPb.address || '-'}</strong>
              </div>
              <div>
                <span className="text-slate-500">Progres Tersimpan:</span>{' '}
                <strong className="text-blue-700">{selectedPb.current_progress}%</strong>
              </div>
              <div>
                <span className="text-slate-500">Titik GPS:</span>{' '}
                <strong>{selectedPb.coord_status === 'ada' ? 'Tersedia' : 'Belum Ada'}</strong>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Time & GPS */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[11px]">
              2
            </span>
            Waktu Kunjungan & Koordinat GPS
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Waktu Kunjungan (WITA) <span className="text-rose-500">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={visitedAt}
                onChange={(e) => setVisitedAt(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                TPM Petugas Monitoring
              </label>
              <input
                type="text"
                disabled
                value={`${currentUser?.display_name || '-'} (${currentUser?.title || '-'})`}
                className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-medium"
              />
            </div>
          </div>

          {/* GPS Button & Output */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleGetGPS}
                disabled={gpsLoading}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
              >
                <MapPin className="w-4 h-4" />
                {gpsLoading ? 'Mencari Titik GPS...' : 'Ambil Lokasi GPS Saya'}
              </button>

              {gpsCoords && (
                <div className="text-xs text-emerald-700 font-mono flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {gpsCoords.lat.toFixed(6)}, {gpsCoords.lng.toFixed(6)} (Akurasi: ±{gpsCoords.accuracy}m)
                </div>
              )}
            </div>

            {distanceMeters !== null && (
              <div
                className={`text-xs p-2 rounded-lg ${
                  distanceMeters > db.settings.far_from_pb_m
                    ? 'bg-amber-100/70 text-amber-900 border border-amber-300'
                    : 'bg-emerald-50 text-emerald-800'
                }`}
              >
                Jarak Anda ke titik PB tersimpan: <strong>{distanceMeters} meter</strong>.
                {distanceMeters > db.settings.far_from_pb_m && (
                  <span className="block font-semibold mt-0.5">
                    ⚠️ Peringatan: Jarak lebih dari {db.settings.far_from_pb_m}m. Kunjungan akan ditandai perlu tinjauan.
                  </span>
                )}
              </div>
            )}

            {gpsError && (
              <div className="text-xs text-rose-600 space-y-2">
                <div>{gpsError}</div>
                <input
                  type="text"
                  placeholder="Alasan GPS tidak tersedia (mis: sinyal lemah)..."
                  value={gpsUnavailableReason}
                  onChange={(e) => setGpsUnavailableReason(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 border border-rose-300 rounded-lg bg-white"
                />
              </div>
            )}
          </div>
        </div>

        {/* Step 3: Mandatory Camera Selfie */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[11px]">
                3
              </span>
              Selfie Verifikasi Kunjungan Lapangan <span className="text-rose-500">*</span>
            </div>
            <span className="text-[10px] text-slate-500 font-normal">Kamera langsung (Anti Galeri)</span>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center justify-center space-y-3">
            <canvas ref={canvasRef} className="hidden" />

            {!selfieDataUrl && !cameraActive && (
              <div className="text-center py-4 space-y-3">
                <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mx-auto shadow-inner">
                  <Camera className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Verifikasi Faktual Wajib Selfie</h4>
                  <p className="text-[11px] text-slate-500 max-w-sm mt-0.5">
                    Sesuai aturan sistem, selfie harus diambil langsung melalui kamera perangkat di lokasi pembangunan.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
                >
                  Buka Kamera Depan
                </button>
              </div>
            )}

            {cameraActive && (
              <div className="space-y-3 text-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-64 h-64 object-cover rounded-2xl border-2 border-blue-500 shadow-md bg-black"
                />
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={captureSelfie}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition"
                  >
                    📸 Jepret Foto Selfie
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-medium transition"
                  >
                    Tutup Kamera
                  </button>
                </div>
              </div>
            )}

            {selfieDataUrl && (
              <div className="space-y-2 text-center">
                <div className="relative inline-block">
                  <img
                    src={selfieDataUrl}
                    alt="Selfie"
                    className="w-48 h-48 object-cover rounded-2xl border-2 border-emerald-500 shadow-md"
                  />
                  <div className="absolute top-2 right-2 px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-md shadow-xs">
                    Terverifikasi
                  </div>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={retakeSelfie}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline"
                  >
                    Foto Ulang Selfie
                  </button>
                </div>
              </div>
            )}

            {cameraError && (
              <div className="text-xs text-rose-600 p-2 bg-rose-50 border border-rose-200 rounded-lg">
                {cameraError}
              </div>
            )}
          </div>
        </div>

        {/* Step 4: Progress Input & Quick Buttons */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[11px]">
                4
              </span>
              Progres Fisik Pembangunan (0–100%) <span className="text-rose-500">*</span>
            </div>
            <span className="text-base font-bold text-blue-700 font-mono tabular-nums">{progress}%</span>
          </div>

          <div className="space-y-3">
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={progress}
              onChange={(e) => setProgress(parseInt(e.target.value, 10))}
              className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />

            {/* Quick buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-slate-500 mr-1">Tombol Cepat:</span>
              {[0, 30, 50, 75, 100].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setProgress(val)}
                  className={`px-3 py-1 text-xs rounded-lg font-bold border transition ${
                    progress === val
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {val}%
                </button>
              ))}
            </div>

            {selectedPb && progress < selectedPb.current_progress && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-1.5 text-xs text-amber-900">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Progres menurun dari {selectedPb.current_progress}% menjadi {progress}%
                </div>
                <input
                  type="text"
                  required
                  placeholder="Wajib tuliskan alasan penurunan progres..."
                  value={progressChangeReason}
                  onChange={(e) => setProgressChangeReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs"
                />
              </div>
            )}
          </div>
        </div>

        {/* Step 5: Construction Photos */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[11px]">
                5
              </span>
              Foto Fisik Pembangunan (1–10 Foto)
            </div>
            <span className="text-xs font-mono text-slate-500">{constructionPhotos.length}/10</span>
          </div>

          <div className="space-y-3">
            <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl cursor-pointer bg-slate-50 hover:bg-blue-50/30 transition">
              <Upload className="w-6 h-6 text-slate-400 mb-1" />
              <span className="text-xs font-semibold text-slate-700">Pilih / Jepret Foto Bangunan</span>
              <span className="text-[10px] text-slate-500">Maks. 10 foto (otomatis dikompresi)</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleUploadConstructionPhoto}
                className="hidden"
              />
            </label>

            {constructionPhotos.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {constructionPhotos.map((url, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-square">
                    <img src={url} alt={`Foto ${idx}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setConstructionPhotos((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-rose-600 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Step 6: Notes & Recommendations */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[11px]">
              6
            </span>
            Catatan Kondisi & Rekomendasi
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Catatan Kondisi Rumah <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={2}
                value={conditionNotes}
                onChange={(e) => setConditionNotes(e.target.value)}
                placeholder="Deskripsikan kondisi fisik terkini, material yang terpasang, tukang..."
                className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rekomendasi Tindak Lanjut
              </label>
              <input
                type="text"
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
                placeholder="Misal: Perlu tambahan semen dari toko, percepat atap..."
                className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </div>

        {/* Step 7: Instant Issue Reporting (Optional Toggle) */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-[11px]">
                7
              </span>
              <label htmlFor="issue-toggle" className="text-xs font-bold text-slate-800 cursor-pointer">
                Temukan Kendala di Lapangan? (Laporkan Instan)
              </label>
            </div>
            <input
              id="issue-toggle"
              type="checkbox"
              checked={hasIssue}
              onChange={(e) => setHasIssue(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded-sm cursor-pointer"
            />
          </div>

          {hasIssue && (
            <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3 animate-in fade-in">
              <div>
                <label className="block text-xs font-semibold text-amber-900 mb-1">Judul Kendala *</label>
                <input
                  type="text"
                  value={issueTitle}
                  onChange={(e) => setIssueTitle(e.target.value)}
                  placeholder="Contoh: Pengiriman bata ringan tertunda..."
                  className="w-full text-xs px-3 py-2 bg-white border border-amber-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-amber-900 mb-1">Kategori</label>
                  <select
                    value={issueCategory}
                    onChange={(e) => setIssueCategory(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white border border-amber-300 rounded-lg"
                  >
                    {db.issue_categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-900 mb-1">Prioritas</label>
                  <select
                    value={issuePriority}
                    onChange={(e) => setIssuePriority(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 bg-white border border-amber-300 rounded-lg"
                  >
                    <option value="rendah">Rendah (Target 14 Hari)</option>
                    <option value="sedang">Sedang (Target 7 Hari)</option>
                    <option value="tinggi">Tinggi (Target 3 Hari)</option>
                    <option value="kritis">Kritis (Target 1 Hari)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-900 mb-1">Deskripsi Masalah</label>
                <textarea
                  rows={2}
                  value={issueDesc}
                  onChange={(e) => setIssueDesc(e.target.value)}
                  placeholder="Jelaskan kendala secara mendalam..."
                  className="w-full text-xs px-3 py-2 bg-white border border-amber-300 rounded-lg"
                />
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-slate-200">
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 bg-[#0B1F3A] hover:bg-[#12325C] text-white rounded-xl text-sm font-bold shadow-md transition disabled:opacity-50"
          >
            {submitting ? 'Menyimpan Kunjungan...' : 'Simpan Monitoring Kunjungan'}
          </button>
        </div>
      </form>
    </div>
  );
};
