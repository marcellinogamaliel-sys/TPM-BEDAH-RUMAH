import {
  Profile,
  Village,
  KPB,
  PBStatus,
  ProgressStage,
  ProgressGroup,
  IssueCategory,
  AppSettings,
} from '../types';

export const INITIAL_PROFILES: Profile[] = [
  {
    id: 'user-tpm-pemberdayaan',
    role: 'tpm_pemberdayaan',
    display_name: 'Gamaliel Tumiwa',
    title: 'TPM Pemberdayaan',
    whatsapp_number: '6281234567890',
    avatar_initials: 'GT',
    is_active: true,
    email: 'gamaliel.tumiwa@bedahrumah.id',
    version: 1,
  },
  {
    id: 'user-tpm-konstruksi',
    role: 'tpm_konstruksi',
    display_name: 'Valerian Poluan',
    title: 'TPM Konstruksi',
    whatsapp_number: '6289876543210',
    avatar_initials: 'VP',
    is_active: true,
    email: 'valerian.poluan@bedahrumah.id',
    version: 1,
  },
];

export const INITIAL_VILLAGES: Village[] = [
  {
    id: 'vil-parepei',
    name: 'Parepei',
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
  },
  {
    id: 'vil-kauneran-satu',
    name: 'Kauneran Satu',
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
  },
  {
    id: 'vil-kiawa-satu-barat',
    name: 'Kiawa Satu Barat',
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
  },
  {
    id: 'vil-kiawa-satu-utara',
    name: 'Kiawa Satu Utara',
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
  },
];

export const INITIAL_KPBS: KPB[] = [
  {
    id: 'kpb-sumesegah',
    village_id: 'vil-parepei',
    name: 'SUMESEGAH',
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
  },
  {
    id: 'kpb-embung-kulo',
    village_id: 'vil-parepei',
    name: 'EMBUNG KULO',
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
  },
  {
    id: 'kpb-paasun',
    village_id: 'vil-kauneran-satu',
    name: "PA'ASUN",
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
  },
  {
    id: 'kpb-blessing-kisbar',
    village_id: 'vil-kiawa-satu-barat',
    name: 'BLESSING KISBAR',
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
  },
  {
    id: 'kpb-kanaan-damai',
    village_id: 'vil-kiawa-satu-utara',
    name: 'KANAAN DAMAI',
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
  },
];

export const INITIAL_PB_STATUSES: PBStatus[] = [
  {
    id: 'status-sk-ppk',
    code: 'SK_PPK',
    label: 'SK PPK',
    color: '#2563EB',
    sort_order: 1,
    is_active: true,
    requires_visit: true,
    counts_in_active_total: true,
  },
  {
    id: 'status-pengganti',
    code: 'PENGGANTI',
    label: 'PENGGANTI',
    color: '#0D9488',
    sort_order: 2,
    is_active: true,
    requires_visit: true,
    counts_in_active_total: true,
  },
  {
    id: 'status-mundur',
    code: 'MUNDUR',
    label: 'MUNDUR',
    color: '#DC2626',
    sort_order: 3,
    is_active: true,
    requires_visit: false,
    counts_in_active_total: false,
  },
  {
    id: 'status-tidak-lolos',
    code: 'TIDAK_LOLOS',
    label: 'TIDAK LOLOS VERIFIKASI',
    color: '#64748B',
    sort_order: 4,
    is_active: true,
    requires_visit: false,
    counts_in_active_total: false,
  },
  {
    id: 'status-mundur-sk-ppk',
    code: 'MUNDUR_SK_PPK',
    label: 'MUNDUR SK PPK',
    color: '#D97706',
    sort_order: 5,
    is_active: true,
    requires_visit: false,
    counts_in_active_total: false,
  },
];

export const INITIAL_PROGRESS_STAGES: ProgressStage[] = [
  { value: 0, label: '0% Belum Mulai', group_code: '0', sort_order: 1, is_quick_button: true },
  { value: 30, label: '30% Tahap Awal', group_code: '1-30', sort_order: 2, is_quick_button: true },
  { value: 50, label: '50% Dinding & Kusen', group_code: '31-99', sort_order: 3, is_quick_button: true },
  { value: 75, label: '75% Atap & Plesteran', group_code: '31-99', sort_order: 4, is_quick_button: true },
  { value: 100, label: '100% Selesai Penuh', group_code: '100', sort_order: 5, is_quick_button: true },
];

export const INITIAL_PROGRESS_GROUPS: ProgressGroup[] = [
  { code: '0', label: '0% Belum Mulai', min_value: 0, max_value: 0, sort_order: 1 },
  { code: '1-30', label: '1–30% Tahap Awal', min_value: 1, max_value: 30, sort_order: 2 },
  { code: '31-99', label: '31–99% Dalam Pembangunan', min_value: 31, max_value: 99, sort_order: 3 },
  { code: '100', label: '100% Selesai', min_value: 100, max_value: 100, sort_order: 4 },
];

export const INITIAL_ISSUE_CATEGORIES: IssueCategory[] = [
  { id: 'cat-1', name: 'Keterlambatan bahan bangunan', is_active: true, sort_order: 1 },
  { id: 'cat-2', name: 'Kendala distribusi dari toko', is_active: true, sort_order: 2 },
  { id: 'cat-3', name: 'Masalah tukang atau tenaga kerja', is_active: true, sort_order: 3 },
  { id: 'cat-4', name: 'Hambatan progres pembangunan', is_active: true, sort_order: 4 },
  { id: 'cat-5', name: 'Masalah administrasi penerima', is_active: true, sort_order: 5 },
  { id: 'cat-6', name: 'Kesulitan koordinasi dengan PB atau KPB', is_active: true, sort_order: 6 },
  { id: 'cat-7', name: 'Ketidaksesuaian data lapangan', is_active: true, sort_order: 7 },
  { id: 'cat-8', name: 'Kendala koordinat atau dokumentasi', is_active: true, sort_order: 8 },
  { id: 'cat-9', name: 'Lainnya', is_active: true, sort_order: 9 },
];

export const INITIAL_APP_SETTINGS: AppSettings = {
  timezone: 'Asia/Makassar',
  gps_required: true,
  far_from_pb_m: 500,
  followup_days: {
    kritis: 1,
    tinggi: 3,
    sedang: 7,
    rendah: 14,
  },
  poll_interval_min: 10,
  max_backdate_days: 14,
  recap_week_start: 'monday',
};
