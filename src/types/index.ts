export type AppRole = 'tpm_pemberdayaan' | 'tpm_konstruksi';

export interface Profile {
  id: string;
  role: AppRole;
  display_name: string;
  title: string;
  whatsapp_number: string;
  avatar_initials: string;
  is_active: boolean;
  email: string;
  last_seen_at?: string;
  version: number;
}

export interface Village {
  id: string;
  name: string;
  is_archived: boolean;
  archived_at?: string;
  archived_by?: string;
  archive_reason?: string;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface KPB {
  id: string;
  village_id: string;
  name: string;
  is_archived: boolean;
  archived_at?: string;
  archived_by?: string;
  archive_reason?: string;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface PBStatus {
  id: string;
  code: string;
  label: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  requires_visit: boolean;
  counts_in_active_total: boolean;
}

export interface ProgressStage {
  value: number; // 0..100
  label: string;
  group_code: string;
  sort_order: number;
  is_quick_button: boolean;
}

export interface ProgressGroup {
  code: string;
  label: string;
  min_value: number;
  max_value: number;
  sort_order: number;
}

export type PaymentStage = 'toko_1' | 'upah_1' | 'toko_2' | 'upah_2';
export type PaymentState = 'belum_diverifikasi' | 'belum_dibayar' | 'sudah_dibayar';

export interface PaymentRecords {
  toko_1: { state: PaymentState; paid_date?: string; note?: string; updated_by?: string; updated_at?: string };
  upah_1: { state: PaymentState; paid_date?: string; note?: string; updated_by?: string; updated_at?: string };
  toko_2: { state: PaymentState; paid_date?: string; note?: string; updated_by?: string; updated_at?: string };
  upah_2: { state: PaymentState; paid_date?: string; note?: string; updated_by?: string; updated_at?: string };
}

export interface Beneficiary {
  id: string;
  pb_code: string; // e.g. PB-0001
  full_name: string;
  village_id: string;
  kpb_id: string;
  address: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  coord_status: 'ada' | 'belum_ada' | 'perlu_dicek';
  status_id: string;
  notes?: string;
  current_progress: number; // 0..100
  last_visit_at?: string;
  last_visit_by?: string; // profile id
  doc_status: 'belum_ada' | 'sebagian' | 'lengkap';
  payments: PaymentRecords;
  is_archived: boolean;
  archived_at?: string;
  archived_by?: string;
  archive_reason?: string;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface BeneficiaryStatusHistory {
  id: string;
  beneficiary_id: string;
  old_status_id: string;
  new_status_id: string;
  reason: string;
  changed_by: string;
  changed_at: string;
}

export type PhotoType = 'selfie' | 'construction' | 'issue' | 'resolution';

export interface VisitPhoto {
  id: string;
  visit_id?: string;
  issue_id?: string;
  issue_update_id?: string;
  photo_type: PhotoType;
  storage_path: string; // Data URL or storage path
  thumb_path?: string;
  width?: number;
  height?: number;
  size_bytes?: number;
  captured_via: 'camera' | 'upload';
  uploaded_by: string;
  created_at: string;
}

export interface MonitoringVisit {
  id: string;
  client_op_id: string;
  beneficiary_id: string;
  village_id: string;
  kpb_id: string;
  tpm_id: string;
  visited_at: string; // WITA local timestamp
  received_at: string; // server UTC timestamp
  week_start: string; // YYYY-MM-DD of Monday
  progress_before: number;
  progress_after: number;
  progress_change_reason?: string;
  condition_notes: string;
  recommendation?: string;
  gps_lat?: number;
  gps_lng?: number;
  gps_accuracy_m?: number;
  gps_unavailable_reason?: string;
  distance_to_pb_m?: number;
  far_from_pb?: boolean;
  selfie_photo_id?: string;
  photo_ids: string[];
  sync_status: 'synced' | 'late_synced';
  is_late_entry: boolean;
  needs_review: boolean;
  is_voided: boolean;
  void_reason?: string;
  voided_by?: string;
  voided_at?: string;
  created_at: string;
}

export type IssuePriority = 'rendah' | 'sedang' | 'tinggi' | 'kritis';
export type IssueStatus = 'baru' | 'dalam_penanganan' | 'menunggu_tindak_lanjut' | 'selesai';
export type IssueUpdateType =
  | 'created'
  | 'description_changed'
  | 'priority_changed'
  | 'comment'
  | 'status_changed'
  | 'resolved'
  | 'reopened'
  | 'attachment_added';

export interface IssueUpdate {
  id: string;
  issue_id: string;
  update_type: IssueUpdateType;
  from_status?: IssueStatus;
  to_status?: IssueStatus;
  old_value?: unknown;
  new_value?: unknown;
  note: string;
  created_by: string;
  created_at: string;
}

export interface IssueResolutionRecord {
  id: string;
  issue_id: string;
  resolved_by: string;
  resolved_at: string;
  reason: string;
  actions_taken: string;
  result_notes: string;
  evidence_photo_ids: string[];
  previous_status: IssueStatus;
  reopened_at?: string;
  reopened_by?: string;
  reopen_reason?: string;
}

export interface Issue {
  id: string;
  issue_code: string; // e.g. KND-2026-0001
  title: string;
  category_id: string;
  priority: IssuePriority;
  village_id: string;
  kpb_id?: string;
  beneficiary_id?: string;
  reported_by: string;
  reported_at: string;
  description: string;
  impact_on_progress?: string;
  proposed_solution?: string;
  status: IssueStatus;
  target_followup_date?: string;
  resolved_at?: string;
  resolved_by?: string;
  reopened_count: number;
  photo_ids: string[];
  version: number;
  created_at: string;
  updated_at: string;
}

export interface IssueCategory {
  id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
}

export interface PaymentHistoryItem {
  id: string;
  beneficiary_id: string;
  stage: PaymentStage;
  old_state: PaymentState;
  new_state: PaymentState;
  reason?: string;
  changed_by: string;
  changed_at: string;
}

export interface WeeklyRecapPeriod {
  id: string;
  week_start: string; // YYYY-MM-DD
  week_end: string;   // YYYY-MM-DD
  label: string;      // e.g. "Rekap Kunjungan 12–18 Oktober 2026"
  status: 'open' | 'closed';
  closed_at?: string;
  closed_source?: 'cron' | 'catchup' | 'manual';
  current_revision: number;
  late_entry_count: number;
  created_at: string;
}

export interface WeeklyRecapSnapshot {
  id: string;
  period_id: string;
  revision: number;
  generated_at: string;
  reason: 'close' | 'late_data' | 'manual_refresh';
  summary: {
    total_visits: number;
    unique_pb_visited: number;
    visits_tpm_pemberdayaan: number;
    visits_tpm_konstruksi: number;
    pb_not_visited: number;
    visits_by_village: Record<string, number>;
    visits_by_kpb: Record<string, number>;
    progress_changes_count: number;
    total_photos: number;
    issues_found_count: number;
  };
  visits: Array<{
    id: string;
    visited_at: string;
    beneficiary_name: string;
    pb_code: string;
    village_name: string;
    kpb_name: string;
    tpm_name: string;
    tpm_role: AppRole;
    progress_before: number;
    progress_after: number;
    condition_notes: string;
    selfie_thumb?: string;
    photos_count: number;
    sync_status: 'synced' | 'late_synced';
  }>;
  unvisited_pb: Array<{
    id: string;
    pb_code: string;
    full_name: string;
    village_name: string;
    kpb_name: string;
    status_label: string;
    current_progress: number;
  }>;
}

export interface AuditLog {
  id: string;
  occurred_at: string;
  user_id: string;
  user_name: string;
  operation: string; // INSERT, UPDATE, ARCHIVE, VOID, RESOLVE, etc.
  table_name: string;
  record_id: string;
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  reason?: string;
  source: 'form' | 'import' | 'issue_resolution' | 'cron' | 'system';
}

export interface AppNotification {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  body: string;
  ref_table?: string;
  ref_id?: string;
  created_at: string;
  read_at?: string;
}

export interface AppSettings {
  timezone: string;
  gps_required: boolean;
  far_from_pb_m: number;
  followup_days: {
    kritis: number;
    tinggi: number;
    sedang: number;
    rendah: number;
  };
  poll_interval_min: number;
  max_backdate_days: number;
  recap_week_start: string;
  supabase_url?: string;
  supabase_anon_key?: string;
}

export interface OutboxItem {
  id: string;
  op_id: string;
  type: 'visit' | 'issue' | 'issue_resolution' | 'payment';
  payload: unknown;
  status: 'pending' | 'sending' | 'failed' | 'conflict' | 'done';
  attempts: number;
  error_message?: string;
  created_at: string;
}
