/**
 * Master Data Store & State Engine for Sistem Monitoring Bedah Rumah 2026
 * Implements strict transactional rules, audit logging, and weekly snapshot freezing.
 */

import {
  Profile,
  Village,
  KPB,
  PBStatus,
  ProgressStage,
  ProgressGroup,
  Beneficiary,
  BeneficiaryStatusHistory,
  MonitoringVisit,
  VisitPhoto,
  Issue,
  IssueCategory,
  IssueUpdate,
  IssueResolutionRecord,
  PaymentHistoryItem,
  WeeklyRecapPeriod,
  WeeklyRecapSnapshot,
  AuditLog,
  AppSettings,
  PaymentStage,
  PaymentState,
  IssuePriority,
  AppRole,
} from '../types';

import {
  INITIAL_PROFILES,
  INITIAL_VILLAGES,
  INITIAL_KPBS,
  INITIAL_PB_STATUSES,
  INITIAL_PROGRESS_STAGES,
  INITIAL_PROGRESS_GROUPS,
  INITIAL_ISSUE_CATEGORIES,
  INITIAL_APP_SETTINGS,
} from './initialData';

import {
  getWeekStartWITA,
  getWeekEndWITA,
  getRecapLabel,
  calculateDistanceMeters,
} from '../utils/wita';

const STORAGE_KEY = 'bedah_rumah_2026_data_v2';

export interface DatabaseState {
  profiles: Profile[];
  villages: Village[];
  kpbs: KPB[];
  pb_statuses: PBStatus[];
  progress_stages: ProgressStage[];
  progress_groups: ProgressGroup[];
  beneficiaries: Beneficiary[];
  beneficiary_status_history: BeneficiaryStatusHistory[];
  monitoring_visits: MonitoringVisit[];
  visit_photos: VisitPhoto[];
  issues: Issue[];
  issue_categories: IssueCategory[];
  issue_updates: IssueUpdate[];
  issue_resolution_records: IssueResolutionRecord[];
  payment_history: PaymentHistoryItem[];
  weekly_recap_periods: WeeklyRecapPeriod[];
  weekly_recap_snapshots: WeeklyRecapSnapshot[];
  audit_logs: AuditLog[];
  settings: AppSettings;
}

function getInitialState(): DatabaseState {
  return {
    profiles: INITIAL_PROFILES,
    villages: INITIAL_VILLAGES,
    kpbs: INITIAL_KPBS,
    pb_statuses: INITIAL_PB_STATUSES,
    progress_stages: INITIAL_PROGRESS_STAGES,
    progress_groups: INITIAL_PROGRESS_GROUPS,
    beneficiaries: [],
    beneficiary_status_history: [],
    monitoring_visits: [],
    visit_photos: [],
    issues: [],
    issue_categories: INITIAL_ISSUE_CATEGORIES,
    issue_updates: [],
    issue_resolution_records: [],
    payment_history: [],
    weekly_recap_periods: [],
    weekly_recap_snapshots: [],
    audit_logs: [],
    settings: INITIAL_APP_SETTINGS,
  };
}

class Store {
  private state: DatabaseState;
  private listeners: Set<() => void> = new Set();
  public currentUser: Profile | null = null;

  constructor() {
    this.state = this.loadState();
    // Default currentUser to null (requires login)
    const storedUser = localStorage.getItem('bedah_rumah_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        const matched = this.state.profiles.find((p) => p.id === parsed.id && p.is_active);
        this.currentUser = matched || null;
      } catch {
        this.currentUser = null;
      }
    }
  }

  private loadState(): DatabaseState {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialState();
      this.saveState(initial);
      return initial;
    }
    try {
      const parsed = JSON.parse(raw);
      // Ensure all arrays exist
      return {
        ...getInitialState(),
        ...parsed,
      };
    } catch {
      return getInitialState();
    }
  }

  private saveState(newState: DatabaseState) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } catch (err) {
      console.warn('Storage quota warning or error:', err);
    }
  }

  private mutate(fn: (s: DatabaseState) => void) {
    fn(this.state);
    this.saveState(this.state);
    this.notify();
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public getState(): DatabaseState {
    return this.state;
  }

  // --- AUDIT LOGGER ---
  public writeAudit(
    operation: string,
    tableName: string,
    recordId: string,
    oldData?: unknown,
    newData?: unknown,
    reason?: string,
    source: AuditLog['source'] = 'form'
  ) {
    const user = this.currentUser;
    const log: AuditLog = {
      id: 'aud-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      occurred_at: new Date().toISOString(),
      user_id: user?.id || 'system',
      user_name: user?.display_name || 'Sistem',
      operation,
      table_name: tableName,
      record_id: recordId,
      old_data: oldData as Record<string, unknown> | undefined,
      new_data: newData as Record<string, unknown> | undefined,
      reason,
      source,
    };
    this.state.audit_logs.unshift(log);
  }

  // --- AUTHENTICATION ---
  public login(role: AppRole, email: string, password: string): { success: boolean; message?: string } {
    const profile = this.state.profiles.find((p) => p.role === role);
    if (!profile || !profile.is_active) {
      return { success: false, message: 'Profil tidak ditemukan atau tidak aktif.' };
    }

    if (email.toLowerCase().trim() !== profile.email.toLowerCase().trim()) {
      return { success: false, message: 'Email tidak sesuai dengan kartu profil yang dipilih.' };
    }

    if (!password || password.length < 6) {
      return { success: false, message: 'Kata sandi minimal 6 karakter.' };
    }

    this.currentUser = profile;
    localStorage.setItem('bedah_rumah_user', JSON.stringify(profile));
    this.writeAudit('LOGIN', 'profiles', profile.id, undefined, undefined, 'Login berhasil', 'system');
    this.notify();
    return { success: true };
  }

  public logout() {
    if (this.currentUser) {
      this.writeAudit('LOGOUT', 'profiles', this.currentUser.id, undefined, undefined, 'Logout pengguna', 'system');
    }
    this.currentUser = null;
    localStorage.removeItem('bedah_rumah_user');
    this.notify();
  }

  public updateProfile(id: string, displayName: string, whatsappNumber: string): { success: boolean; message?: string } {
    let result: { success: boolean; message?: string } = { success: false, message: '' };
    this.mutate((s) => {
      const idx = s.profiles.findIndex((p) => p.id === id);
      if (idx === -1) {
        result = { success: false, message: 'Profil tidak ditemukan' };
        return;
      }
      const old = { ...s.profiles[idx] };
      s.profiles[idx].display_name = displayName;
      s.profiles[idx].whatsapp_number = whatsappNumber;
      s.profiles[idx].version += 1;
      this.writeAudit('UPDATE', 'profiles', id, old, s.profiles[idx], 'Pembaruan profil');
      if (this.currentUser && this.currentUser.id === id) {
        this.currentUser = s.profiles[idx];
        localStorage.setItem('bedah_rumah_user', JSON.stringify(this.currentUser));
      }
      result = { success: true };
    });
    return result;
  }

  // --- MASTER VILLAGES & KPBS ---
  public addVillage(name: string): { success: boolean; message?: string; village?: Village } {
    const trimmed = name.trim();
    if (!trimmed) return { success: false, message: 'Nama desa wajib diisi' };
    const exists = this.state.villages.find((v) => v.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) return { success: false, message: 'Desa dengan nama ini sudah ada' };

    let created: Village | undefined;
    this.mutate((s) => {
      created = {
        id: 'vil-' + Date.now(),
        name: trimmed,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
      };
      s.villages.push(created);
      this.writeAudit('INSERT', 'villages', created.id, undefined, created, 'Penambahan desa baru');
    });
    return { success: true, village: created };
  }

  public updateVillage(id: string, name: string): { success: boolean; message?: string } {
    const trimmed = name.trim();
    if (!trimmed) return { success: false, message: 'Nama desa wajib diisi' };
    let result: { success: boolean; message?: string } = { success: false, message: '' };
    this.mutate((s) => {
      const v = s.villages.find((item) => item.id === id);
      if (!v) {
        result = { success: false, message: 'Desa tidak ditemukan' };
        return;
      }
      const old = { ...v };
      v.name = trimmed;
      v.updated_at = new Date().toISOString();
      v.version += 1;
      this.writeAudit('UPDATE', 'villages', id, old, v, 'Ubah nama desa');
      result = { success: true };
    });
    return result;
  }

  public archiveVillage(id: string, reason: string): { success: boolean; message?: string } {
    if (!reason || reason.trim().length < 5) {
      return { success: false, message: 'Alasan arsip wajib diisi (minimal 5 karakter)' };
    }
    let result: { success: boolean; message?: string } = { success: false, message: '' };
    this.mutate((s) => {
      const v = s.villages.find((item) => item.id === id);
      if (!v) {
        result = { success: false, message: 'Desa tidak ditemukan' };
        return;
      }
      const old = { ...v };
      v.is_archived = true;
      v.archived_at = new Date().toISOString();
      v.archived_by = this.currentUser?.id;
      v.archive_reason = reason;
      v.updated_at = new Date().toISOString();
      v.version += 1;
      this.writeAudit('ARCHIVE', 'villages', id, old, v, reason);
      result = { success: true };
    });
    return result;
  }

  public restoreVillage(id: string): { success: boolean; message?: string } {
    let result: { success: boolean; message?: string } = { success: false, message: '' };
    this.mutate((s) => {
      const v = s.villages.find((item) => item.id === id);
      if (!v) {
        result = { success: false, message: 'Desa tidak ditemukan' };
        return;
      }
      const old = { ...v };
      v.is_archived = false;
      v.archived_at = undefined;
      v.archived_by = undefined;
      v.archive_reason = undefined;
      v.updated_at = new Date().toISOString();
      v.version += 1;
      this.writeAudit('RESTORE', 'villages', id, old, v, 'Pemulihan desa dari arsip');
      result = { success: true };
    });
    return result;
  }

  public addKPB(villageId: string, name: string): { success: boolean; message?: string; kpb?: KPB } {
    const trimmed = name.trim();
    if (!trimmed) return { success: false, message: 'Nama KPB wajib diisi' };
    const exists = this.state.kpbs.find(
      (k) => k.village_id === villageId && k.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) return { success: false, message: 'KPB dengan nama ini sudah ada di desa tersebut' };

    let created: KPB | undefined;
    this.mutate((s) => {
      created = {
        id: 'kpb-' + Date.now(),
        village_id: villageId,
        name: trimmed,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
      };
      s.kpbs.push(created);
      this.writeAudit('INSERT', 'kpbs', created.id, undefined, created, 'Penambahan KPB baru');
    });
    return { success: true, kpb: created };
  }

  public updateKPB(id: string, name: string): { success: boolean; message?: string } {
    const trimmed = name.trim();
    if (!trimmed) return { success: false, message: 'Nama KPB wajib diisi' };
    let result: { success: boolean; message?: string } = { success: false, message: '' };
    this.mutate((s) => {
      const k = s.kpbs.find((item) => item.id === id);
      if (!k) {
        result = { success: false, message: 'KPB tidak ditemukan' };
        return;
      }
      const old = { ...k };
      k.name = trimmed;
      k.updated_at = new Date().toISOString();
      k.version += 1;
      this.writeAudit('UPDATE', 'kpbs', id, old, k, 'Ubah nama KPB');
      result = { success: true };
    });
    return result;
  }

  public archiveKPB(id: string, reason: string): { success: boolean; message?: string } {
    if (!reason || reason.trim().length < 5) {
      return { success: false, message: 'Alasan arsip wajib diisi (minimal 5 karakter)' };
    }
    let result: { success: boolean; message?: string } = { success: false, message: '' };
    this.mutate((s) => {
      const k = s.kpbs.find((item) => item.id === id);
      if (!k) {
        result = { success: false, message: 'KPB tidak ditemukan' };
        return;
      }
      const old = { ...k };
      k.is_archived = true;
      k.archived_at = new Date().toISOString();
      k.archived_by = this.currentUser?.id;
      k.archive_reason = reason;
      k.updated_at = new Date().toISOString();
      k.version += 1;
      this.writeAudit('ARCHIVE', 'kpbs', id, old, k, reason);
      result = { success: true };
    });
    return result;
  }

  public restoreKPB(id: string): { success: boolean; message?: string } {
    let result: { success: boolean; message?: string } = { success: false, message: '' };
    this.mutate((s) => {
      const k = s.kpbs.find((item) => item.id === id);
      if (!k) {
        result = { success: false, message: 'KPB tidak ditemukan' };
        return;
      }
      const old = { ...k };
      k.is_archived = false;
      k.archived_at = undefined;
      k.archived_by = undefined;
      k.archive_reason = undefined;
      k.updated_at = new Date().toISOString();
      k.version += 1;
      this.writeAudit('RESTORE', 'kpbs', id, old, k, 'Pemulihan KPB dari arsip');
      result = { success: true };
    });
    return result;
  }

  /**
   * Move KPB to another village in a single transaction (as mandated in Phase 2.3)
   * Updates kpb.village_id and all beneficiaries.village_id in that KPB.
   * Does NOT alter old visits.
   */
  public moveKPB(kpbId: string, newVillageId: string, reason: string): { success: boolean; message?: string; affectedPBs?: number } {
    if (!reason || reason.trim().length < 5) {
      return { success: false, message: 'Alasan pemindahan KPB wajib diisi' };
    }
    let affected = 0;
    let result: { success: boolean; message?: string; affectedPBs?: number } = { success: false, message: '', affectedPBs: 0 };

    this.mutate((s) => {
      const kpb = s.kpbs.find((k) => k.id === kpbId);
      const targetVillage = s.villages.find((v) => v.id === newVillageId);
      if (!kpb || !targetVillage) {
        result = { success: false, message: 'KPB atau Desa tujuan tidak ditemukan' };
        return;
      }
      const oldVillageId = kpb.village_id;
      const oldKpb = { ...kpb };

      kpb.village_id = newVillageId;
      kpb.updated_at = new Date().toISOString();
      kpb.version += 1;

      // Update all beneficiaries in this KPB
      s.beneficiaries.forEach((pb) => {
        if (pb.kpb_id === kpbId) {
          pb.village_id = newVillageId;
          pb.updated_at = new Date().toISOString();
          pb.version += 1;
          affected++;
        }
      });

      this.writeAudit(
        'MOVE_KPB',
        'kpbs',
        kpbId,
        oldKpb,
        kpb,
        `Pindah dari desa ${oldVillageId} ke ${newVillageId}. ${affected} PB terdampak. Alasan: ${reason}`
      );
      result = { success: true, affectedPBs: affected };
    });
    return result;
  }

  // --- BENEFICIARIES (PB) ---
  public getNextPBCode(): string {
    const existing = this.state.beneficiaries.map((b) => {
      const match = b.pb_code.match(/PB-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    });
    const max = existing.length > 0 ? Math.max(...existing) : 0;
    return `PB-${String(max + 1).padStart(4, '0')}`;
  }

  public addBeneficiary(data: Omit<Beneficiary, 'id' | 'pb_code' | 'created_at' | 'updated_at' | 'version' | 'current_progress' | 'doc_status' | 'payments' | 'coord_status' | 'is_archived'> & { pb_code?: string; is_archived?: boolean }): { success: boolean; message?: string; beneficiary?: Beneficiary } {
    if (!data.full_name || data.full_name.trim().length < 3) {
      return { success: false, message: 'Nama lengkap minimal 3 karakter' };
    }
    if (!data.village_id) return { success: false, message: 'Desa wajib dipilih' };
    if (!data.kpb_id) return { success: false, message: 'KPB wajib dipilih' };
    if (!data.status_id) return { success: false, message: 'Status PB wajib dipilih' };

    const pbCode = data.pb_code && data.pb_code.trim() ? data.pb_code.trim() : this.getNextPBCode();

    // Check duplicate code
    if (this.state.beneficiaries.some((b) => b.pb_code.toLowerCase() === pbCode.toLowerCase())) {
      return { success: false, message: `ID PB ${pbCode} sudah digunakan` };
    }

    const coordStatus: Beneficiary['coord_status'] =
      data.latitude !== undefined && data.longitude !== undefined && data.latitude !== null && data.longitude !== null
        ? 'ada'
        : 'belum_ada';

    let created: Beneficiary | undefined;
    this.mutate((s) => {
      created = {
        ...data,
        id: 'pb-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        pb_code: pbCode,
        current_progress: 0,
        doc_status: 'belum_ada',
        coord_status: coordStatus,
        payments: {
          toko_1: { state: 'belum_diverifikasi' },
          upah_1: { state: 'belum_diverifikasi' },
          toko_2: { state: 'belum_diverifikasi' },
          upah_2: { state: 'belum_diverifikasi' },
        },
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
      };
      s.beneficiaries.push(created);
      this.writeAudit('INSERT', 'beneficiaries', created.id, undefined, created, 'Penambahan PB baru');
    });
    return { success: true, beneficiary: created };
  }

  public updateBeneficiary(id: string, updates: Partial<Beneficiary>, expectedVersion?: number): { success: boolean; message?: string; conflict?: boolean } {
    let result: { success: boolean; message?: string; conflict?: boolean } = { success: false, message: '', conflict: false };
    this.mutate((s) => {
      const b = s.beneficiaries.find((item) => item.id === id);
      if (!b) {
        result = { success: false, message: 'PB tidak ditemukan' };
        return;
      }
      if (expectedVersion !== undefined && b.version !== expectedVersion) {
        result = { success: false, message: 'Konflik versi: data telah diubah oleh pengguna lain.', conflict: true };
        return;
      }
      const old = { ...b };
      Object.assign(b, updates);

      // Re-evaluate coord_status if coordinates change
      if (updates.latitude !== undefined || updates.longitude !== undefined) {
        b.coord_status =
          b.latitude !== undefined && b.longitude !== undefined && b.latitude !== null && b.longitude !== null
            ? 'ada'
            : 'belum_ada';
      }

      b.updated_at = new Date().toISOString();
      b.version += 1;
      this.writeAudit('UPDATE', 'beneficiaries', id, old, b, 'Pembaruan data PB');
      result = { success: true };
    });
    return result;
  }

  /**
   * Change PB status with mandatory reason and history recording (Phase 2.4)
   */
  public changePBStatus(id: string, newStatusId: string, reason: string): { success: boolean; message?: string } {
    if (!reason || reason.trim().length < 5) {
      return { success: false, message: 'Alasan perubahan status wajib diisi (minimal 5 karakter)' };
    }
    let result: { success: boolean; message?: string } = { success: false, message: '' };
    this.mutate((s) => {
      const b = s.beneficiaries.find((item) => item.id === id);
      if (!b) {
        result = { success: false, message: 'PB tidak ditemukan' };
        return;
      }
      const oldStatusId = b.status_id;
      if (oldStatusId === newStatusId) {
        result = { success: false, message: 'Status baru sama dengan status saat ini' };
        return;
      }
      const old = { ...b };
      b.status_id = newStatusId;
      b.updated_at = new Date().toISOString();
      b.version += 1;

      const history: BeneficiaryStatusHistory = {
        id: 'bsh-' + Date.now(),
        beneficiary_id: id,
        old_status_id: oldStatusId,
        new_status_id: newStatusId,
        reason: reason.trim(),
        changed_by: this.currentUser?.id || 'system',
        changed_at: new Date().toISOString(),
      };
      s.beneficiary_status_history.push(history);

      this.writeAudit(
        'CHANGE_STATUS',
        'beneficiaries',
        id,
        { status_id: oldStatusId },
        { status_id: newStatusId },
        reason
      );
      result = { success: true };
    });
    return result;
  }

  public archivePB(id: string, reason: string): { success: boolean; message?: string } {
    if (!reason || reason.trim().length < 5) {
      return { success: false, message: 'Alasan arsip wajib diisi (minimal 5 karakter)' };
    }
    let result: { success: boolean; message?: string } = { success: false, message: '' };
    this.mutate((s) => {
      const b = s.beneficiaries.find((item) => item.id === id);
      if (!b) {
        result = { success: false, message: 'PB tidak ditemukan' };
        return;
      }
      const old = { ...b };
      b.is_archived = true;
      b.archived_at = new Date().toISOString();
      b.archived_by = this.currentUser?.id;
      b.archive_reason = reason;
      b.updated_at = new Date().toISOString();
      b.version += 1;
      this.writeAudit('ARCHIVE', 'beneficiaries', id, old, b, reason);
      result = { success: true };
    });
    return result;
  }

  public restorePB(id: string): { success: boolean; message?: string } {
    let result: { success: boolean; message?: string } = { success: false, message: '' };
    this.mutate((s) => {
      const b = s.beneficiaries.find((item) => item.id === id);
      if (!b) {
        result = { success: false, message: 'PB tidak ditemukan' };
        return;
      }
      const old = { ...b };
      b.is_archived = false;
      b.archived_at = undefined;
      b.archived_by = undefined;
      b.archive_reason = undefined;
      b.updated_at = new Date().toISOString();
      b.version += 1;
      this.writeAudit('RESTORE', 'beneficiaries', id, old, b, 'Pemulihan PB dari arsip');
      result = { success: true };
    });
    return result;
  }

  // --- MONITORING VISITS ---
  /**
   * Creates a monitoring visit with all transaction checks:
   * 1. Idempotency via client_op_id
   * 2. Mandatory camera selfie
   * 3. Reason if progress decreases
   * 4. Haversine distance calculation and warning flag
   * 5. Beneficiary progress update if visit is newest
   */
  public createVisit(payload: {
    client_op_id: string;
    beneficiary_id: string;
    visited_at: string;
    progress_after: number;
    progress_change_reason?: string;
    condition_notes: string;
    recommendation?: string;
    gps_lat?: number;
    gps_lng?: number;
    gps_accuracy_m?: number;
    gps_unavailable_reason?: string;
    selfie_data_url: string;
    construction_photo_data_urls: string[];
    instant_issue?: {
      title: string;
      category_id: string;
      priority: IssuePriority;
      description: string;
    };
  }): { success: boolean; message?: string; visit?: MonitoringVisit } {
    // 1. Idempotency check
    const existing = this.state.monitoring_visits.find((v) => v.client_op_id === payload.client_op_id);
    if (existing) {
      return { success: true, visit: existing };
    }

    // 2. Beneficiary check
    const pb = this.state.beneficiaries.find((b) => b.id === payload.beneficiary_id);
    if (!pb) {
      return { success: false, message: 'Penerima bantuan tidak ditemukan' };
    }

    // 3. Mandatory selfie check
    if (!payload.selfie_data_url) {
      return { success: false, message: 'Selfie kamera wajib diambil untuk verifikasi kunjungan lapangan.' };
    }

    // 4. Progress decrease check
    if (payload.progress_after < pb.current_progress) {
      if (!payload.progress_change_reason || payload.progress_change_reason.trim().length < 5) {
        return {
          success: false,
          message: 'Penurunan progres wajib disertai alasan yang jelas (minimal 5 karakter).',
        };
      }
    }

    const tpm = this.currentUser;
    if (!tpm) {
      return { success: false, message: 'Sesi pengguna tidak valid. Silakan login kembali.' };
    }

    // GPS & Distance
    let distanceMeters: number | undefined;
    let farFromPb = false;
    if (payload.gps_lat && payload.gps_lng && pb.latitude && pb.longitude) {
      distanceMeters = calculateDistanceMeters(payload.gps_lat, payload.gps_lng, pb.latitude, pb.longitude);
      if (distanceMeters > this.state.settings.far_from_pb_m) {
        farFromPb = true;
      }
    }

    const weekStart = getWeekStartWITA(payload.visited_at);
    const visitId = 'vis-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);

    let createdVisit: MonitoringVisit | undefined;

    this.mutate((s) => {
      // Create photos
      const selfiePhotoId = 'pho-' + Date.now() + '-selfie';
      s.visit_photos.push({
        id: selfiePhotoId,
        visit_id: visitId,
        photo_type: 'selfie',
        storage_path: payload.selfie_data_url,
        thumb_path: payload.selfie_data_url,
        captured_via: 'camera',
        uploaded_by: tpm.id,
        created_at: new Date().toISOString(),
      });

      const photoIds: string[] = [];
      payload.construction_photo_data_urls.forEach((url, i) => {
        const pid = 'pho-' + Date.now() + '-c-' + i;
        photoIds.push(pid);
        s.visit_photos.push({
          id: pid,
          visit_id: visitId,
          photo_type: 'construction',
          storage_path: url,
          thumb_path: url,
          captured_via: 'upload',
          uploaded_by: tpm.id,
          created_at: new Date().toISOString(),
        });
      });

      // Check if current week is closed (late entry check)
      const isPeriodClosed = s.weekly_recap_periods.some((p) => p.week_start === weekStart && p.status === 'closed');

      createdVisit = {
        id: visitId,
        client_op_id: payload.client_op_id,
        beneficiary_id: pb.id,
        village_id: pb.village_id,
        kpb_id: pb.kpb_id,
        tpm_id: tpm.id,
        visited_at: payload.visited_at,
        received_at: new Date().toISOString(),
        week_start: weekStart,
        progress_before: pb.current_progress,
        progress_after: payload.progress_after,
        progress_change_reason: payload.progress_change_reason,
        condition_notes: payload.condition_notes,
        recommendation: payload.recommendation,
        gps_lat: payload.gps_lat,
        gps_lng: payload.gps_lng,
        gps_accuracy_m: payload.gps_accuracy_m,
        gps_unavailable_reason: payload.gps_unavailable_reason,
        distance_to_pb_m: distanceMeters,
        far_from_pb: farFromPb,
        selfie_photo_id: selfiePhotoId,
        photo_ids: photoIds,
        sync_status: isPeriodClosed ? 'late_synced' : 'synced',
        is_late_entry: isPeriodClosed,
        needs_review: farFromPb || isPeriodClosed,
        is_voided: false,
        created_at: new Date().toISOString(),
      };
      s.monitoring_visits.unshift(createdVisit);

      // Update beneficiary's progress & last visit
      const targetPb = s.beneficiaries.find((b) => b.id === pb.id);
      if (targetPb) {
        targetPb.current_progress = payload.progress_after;
        targetPb.last_visit_at = payload.visited_at;
        targetPb.last_visit_by = tpm.id;
        targetPb.doc_status = photoIds.length > 0 ? 'lengkap' : 'sebagian';
        targetPb.updated_at = new Date().toISOString();
        targetPb.version += 1;
      }

      // Instant issue creation if toggled
      if (payload.instant_issue && payload.instant_issue.title.trim()) {
        const issueId = 'iss-' + Date.now();
        const codeNum = s.issues.length + 1;
        const issueCode = `KND-2026-${String(codeNum).padStart(4, '0')}`;
        s.issues.unshift({
          id: issueId,
          issue_code: issueCode,
          title: payload.instant_issue.title.trim(),
          category_id: payload.instant_issue.category_id,
          priority: payload.instant_issue.priority,
          village_id: pb.village_id,
          kpb_id: pb.kpb_id,
          beneficiary_id: pb.id,
          reported_by: tpm.id,
          reported_at: payload.visited_at,
          description: payload.instant_issue.description.trim(),
          status: 'baru',
          reopened_count: 0,
          photo_ids: photoIds,
          version: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        s.issue_updates.push({
          id: 'iu-' + Date.now(),
          issue_id: issueId,
          update_type: 'created',
          note: 'Dilaporkan saat monitoring kunjungan',
          created_by: tpm.id,
          created_at: new Date().toISOString(),
        });
      }

      this.writeAudit(
        'CREATE_VISIT',
        'monitoring_visits',
        visitId,
        undefined,
        createdVisit as unknown as Record<string, unknown>,
        `Kunjungan ke ${pb.full_name} (${pb.pb_code}) dengan progres ${payload.progress_after}%`
      );
    });

    return { success: true, visit: createdVisit };
  }

  public voidVisit(visitId: string, reason: string): { success: boolean; message?: string } {
    if (!reason || reason.trim().length < 5) {
      return { success: false, message: 'Alasan pembatalan kunjungan wajib diisi' };
    }
    let result: { success: boolean; message?: string } = { success: false, message: '' };
    this.mutate((s) => {
      const visit = s.monitoring_visits.find((v) => v.id === visitId);
      if (!visit) {
        result = { success: false, message: 'Kunjungan tidak ditemukan' };
        return;
      }
      if (visit.is_voided) {
        result = { success: false, message: 'Kunjungan sudah dibatalkan sebelumnya' };
        return;
      }
      visit.is_voided = true;
      visit.void_reason = reason;
      visit.voided_by = this.currentUser?.id;
      visit.voided_at = new Date().toISOString();

      // Recalculate beneficiary current progress from last valid visit
      const pb = s.beneficiaries.find((b) => b.id === visit.beneficiary_id);
      if (pb) {
        const validVisits = s.monitoring_visits
          .filter((v) => v.beneficiary_id === pb.id && !v.is_voided)
          .sort((a, b) => new Date(b.visited_at).getTime() - new Date(a.visited_at).getTime());

        if (validVisits.length > 0) {
          pb.current_progress = validVisits[0].progress_after;
          pb.last_visit_at = validVisits[0].visited_at;
          pb.last_visit_by = validVisits[0].tpm_id;
        } else {
          pb.current_progress = 0;
          pb.last_visit_at = undefined;
          pb.last_visit_by = undefined;
        }
        pb.updated_at = new Date().toISOString();
        pb.version += 1;
      }

      this.writeAudit('VOID_VISIT', 'monitoring_visits', visitId, undefined, undefined, reason);
      result = { success: true };
    });
    return result;
  }

  // --- ISSUES MANAGEMENT ---
  public createIssue(payload: {
    title: string;
    category_id: string;
    priority: IssuePriority;
    village_id: string;
    kpb_id?: string;
    beneficiary_id?: string;
    description: string;
    impact_on_progress?: string;
    proposed_solution?: string;
    photo_urls?: string[];
  }): { success: boolean; message?: string; issue?: Issue } {
    if (!payload.title || payload.title.trim().length < 5) {
      return { success: false, message: 'Judul kendala minimal 5 karakter' };
    }
    if (!payload.village_id) return { success: false, message: 'Desa wajib dipilih' };
    if (!payload.description || payload.description.trim().length < 10) {
      return { success: false, message: 'Deskripsi kendala minimal 10 karakter' };
    }

    const tpm = this.currentUser;
    if (!tpm) return { success: false, message: 'Pengguna tidak valid' };

    let created: Issue | undefined;
    this.mutate((s) => {
      const issueId = 'iss-' + Date.now();
      const codeNum = s.issues.length + 1;
      const issueCode = `KND-2026-${String(codeNum).padStart(4, '0')}`;

      // Target followup date based on priority
      const days = s.settings.followup_days[payload.priority] || 7;
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      const targetDateStr = targetDate.toISOString().split('T')[0];

      const photoIds: string[] = [];
      if (payload.photo_urls) {
        payload.photo_urls.forEach((url, i) => {
          const pid = 'pho-iss-' + Date.now() + '-' + i;
          photoIds.push(pid);
          s.visit_photos.push({
            id: pid,
            issue_id: issueId,
            photo_type: 'issue',
            storage_path: url,
            thumb_path: url,
            captured_via: 'upload',
            uploaded_by: tpm.id,
            created_at: new Date().toISOString(),
          });
        });
      }

      created = {
        id: issueId,
        issue_code: issueCode,
        title: payload.title.trim(),
        category_id: payload.category_id,
        priority: payload.priority,
        village_id: payload.village_id,
        kpb_id: payload.kpb_id,
        beneficiary_id: payload.beneficiary_id,
        reported_by: tpm.id,
        reported_at: new Date().toISOString(),
        description: payload.description.trim(),
        impact_on_progress: payload.impact_on_progress?.trim(),
        proposed_solution: payload.proposed_solution?.trim(),
        status: 'baru',
        target_followup_date: targetDateStr,
        reopened_count: 0,
        photo_ids: photoIds,
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      s.issues.unshift(created);

      s.issue_updates.push({
        id: 'iu-' + Date.now(),
        issue_id: issueId,
        update_type: 'created',
        note: 'Kendala baru dilaporkan',
        created_by: tpm.id,
        created_at: new Date().toISOString(),
      });

      this.writeAudit('CREATE_ISSUE', 'issues', issueId, undefined, created as unknown as Record<string, unknown>, payload.title);
    });
    return { success: true, issue: created };
  }

  public addIssueComment(issueId: string, comment: string): { success: boolean; message?: string } {
    if (!comment || comment.trim().length < 3) {
      return { success: false, message: 'Komentar tindak lanjut tidak boleh kosong' };
    }
    const tpm = this.currentUser;
    if (!tpm) return { success: false, message: 'Pengguna tidak valid' };

    let result: { success: boolean; message?: string } = { success: false, message: '' };
    this.mutate((s) => {
      const issue = s.issues.find((i) => i.id === issueId);
      if (!issue) {
        result = { success: false, message: 'Kendala tidak ditemukan' };
        return;
      }
      s.issue_updates.push({
        id: 'iu-' + Date.now(),
        issue_id: issueId,
        update_type: 'comment',
        note: comment.trim(),
        created_by: tpm.id,
        created_at: new Date().toISOString(),
      });
      issue.updated_at = new Date().toISOString();
      issue.version += 1;
      result = { success: true };
    });
    return result;
  }

  public changeIssueStatus(
    issueId: string,
    newStatus: 'dalam_penanganan' | 'menunggu_tindak_lanjut',
    note?: string
  ): { success: boolean; message?: string } {
    const tpm = this.currentUser;
    if (!tpm) return { success: false, message: 'Pengguna tidak valid' };

    let result: { success: boolean; message?: string } = { success: false, message: '' };
    this.mutate((s) => {
      const issue = s.issues.find((i) => i.id === issueId);
      if (!issue) {
        result = { success: false, message: 'Kendala tidak ditemukan' };
        return;
      }
      if (issue.status === 'selesai') {
        result = { success: false, message: 'Kendala yang sudah selesai harus dibuka kembali terlebih dahulu' };
        return;
      }
      const oldStatus = issue.status;
      issue.status = newStatus;
      issue.updated_at = new Date().toISOString();
      issue.version += 1;

      s.issue_updates.push({
        id: 'iu-' + Date.now(),
        issue_id: issueId,
        update_type: 'status_changed',
        from_status: oldStatus,
        to_status: newStatus,
        note: note || `Status diubah menjadi ${newStatus}`,
        created_by: tpm.id,
        created_at: new Date().toISOString(),
      });
      result = { success: true };
    });
    return result;
  }

  /**
   * Mandatory Resolution Rule (Phase 1.3 / 6.3 / 9.C):
   * An issue CANNOT be closed or marked 'selesai' without:
   * - reason (min 10 chars)
   * - actions_taken (min 5 chars)
   * - result_notes (min 10 chars)
   * Any TPM may resolve it.
   */
  public resolveIssue(
    issueId: string,
    payload: {
      reason: string;
      actions_taken: string;
      result_notes: string;
      evidence_photo_urls?: string[];
    }
  ): { success: boolean; message?: string } {
    if (!payload.reason || payload.reason.trim().length < 10) {
      return { success: false, message: 'Alasan penyelesaian wajib diisi (minimal 10 karakter)' };
    }
    if (!payload.actions_taken || payload.actions_taken.trim().length < 5) {
      return { success: false, message: 'Tindakan yang sudah dilakukan wajib diisi (minimal 5 karakter)' };
    }
    if (!payload.result_notes || payload.result_notes.trim().length < 10) {
      return { success: false, message: 'Catatan hasil penyelesaian wajib diisi (minimal 10 karakter)' };
    }

    const tpm = this.currentUser;
    if (!tpm) return { success: false, message: 'Pengguna tidak valid' };

    let result: { success: boolean; message?: string } = { success: false, message: '' };
    this.mutate((s) => {
      const issue = s.issues.find((i) => i.id === issueId);
      if (!issue) {
        result = { success: false, message: 'Kendala tidak ditemukan' };
        return;
      }
      if (issue.status === 'selesai') {
        result = { success: false, message: 'Kendala sudah diselesaikan sebelumnya' };
        return;
      }

      const prevStatus = issue.status;
      const photoIds: string[] = [];
      if (payload.evidence_photo_urls) {
        payload.evidence_photo_urls.forEach((url, i) => {
          const pid = 'pho-res-' + Date.now() + '-' + i;
          photoIds.push(pid);
          s.visit_photos.push({
            id: pid,
            issue_id: issueId,
            photo_type: 'resolution',
            storage_path: url,
            thumb_path: url,
            captured_via: 'upload',
            uploaded_by: tpm.id,
            created_at: new Date().toISOString(),
          });
        });
      }

      // Record resolution history (never overwritten)
      const resolutionRecord: IssueResolutionRecord = {
        id: 'irr-' + Date.now(),
        issue_id: issueId,
        resolved_by: tpm.id,
        resolved_at: new Date().toISOString(),
        reason: payload.reason.trim(),
        actions_taken: payload.actions_taken.trim(),
        result_notes: payload.result_notes.trim(),
        evidence_photo_ids: photoIds,
        previous_status: prevStatus,
      };
      s.issue_resolution_records.push(resolutionRecord);

      // Append update
      s.issue_updates.push({
        id: 'iu-' + Date.now(),
        issue_id: issueId,
        update_type: 'resolved',
        from_status: prevStatus,
        to_status: 'selesai',
        note: `Diselesaikan oleh ${tpm.display_name}. Alasan: ${payload.reason}`,
        created_by: tpm.id,
        created_at: new Date().toISOString(),
      });

      // Update issue state
      issue.status = 'selesai';
      issue.resolved_at = new Date().toISOString();
      issue.resolved_by = tpm.id;
      issue.updated_at = new Date().toISOString();
      issue.version += 1;

      this.writeAudit(
        'RESOLVE_ISSUE',
        'issues',
        issueId,
        { status: prevStatus },
        { status: 'selesai' },
        payload.reason,
        'issue_resolution'
      );

      result = { success: true };
    });
    return result;
  }

  /**
   * Reopen an issue:
   * Requires mandatory reason (min 10 chars).
   * Status becomes 'dalam_penanganan'.
   * Increments reopened_count, preserves old resolution record.
   */
  public reopenIssue(issueId: string, reason: string): { success: boolean; message?: string } {
    if (!reason || reason.trim().length < 10) {
      return { success: false, message: 'Alasan pembukaan kembali wajib diisi (minimal 10 karakter)' };
    }
    const tpm = this.currentUser;
    if (!tpm) return { success: false, message: 'Pengguna tidak valid' };

    let result: { success: boolean; message?: string } = { success: false, message: '' };
    this.mutate((s) => {
      const issue = s.issues.find((i) => i.id === issueId);
      if (!issue) {
        result = { success: false, message: 'Kendala tidak ditemukan' };
        return;
      }
      if (issue.status !== 'selesai') {
        result = { success: false, message: 'Hanya kendala selesai yang dapat dibuka kembali' };
        return;
      }

      // Mark the latest resolution record with reopen metadata
      const lastRes = s.issue_resolution_records
        .filter((r) => r.issue_id === issueId)
        .sort((a, b) => new Date(b.resolved_at).getTime() - new Date(a.resolved_at).getTime())[0];
      if (lastRes) {
        lastRes.reopened_at = new Date().toISOString();
        lastRes.reopened_by = tpm.id;
        lastRes.reopen_reason = reason.trim();
      }

      s.issue_updates.push({
        id: 'iu-' + Date.now(),
        issue_id: issueId,
        update_type: 'reopened',
        from_status: 'selesai',
        to_status: 'dalam_penanganan',
        note: `Dibuka kembali oleh ${tpm.display_name}. Alasan: ${reason}`,
        created_by: tpm.id,
        created_at: new Date().toISOString(),
      });

      issue.status = 'dalam_penanganan';
      issue.reopened_count += 1;
      issue.resolved_at = undefined;
      issue.resolved_by = undefined;
      issue.updated_at = new Date().toISOString();
      issue.version += 1;

      this.writeAudit(
        'REOPEN_ISSUE',
        'issues',
        issueId,
        { status: 'selesai' },
        { status: 'dalam_penanganan' },
        reason
      );
      result = { success: true };
    });
    return result;
  }

  // --- PAYMENTS (TOKO & UPAH) ---
  public setPaymentState(
    beneficiaryId: string,
    stage: PaymentStage,
    newState: PaymentState,
    reason?: string
  ): { success: boolean; message?: string } {
    const tpm = this.currentUser;
    if (!tpm) return { success: false, message: 'Pengguna tidak valid' };

    let result: { success: boolean; message?: string } = { success: false, message: '' };
    this.mutate((s) => {
      const pb = s.beneficiaries.find((b) => b.id === beneficiaryId);
      if (!pb) {
        result = { success: false, message: 'PB tidak ditemukan' };
        return;
      }
      const current = pb.payments[stage];
      const oldState = current.state;

      // Rule: Unchecking from 'sudah_dibayar' strictly requires a reason
      if (oldState === 'sudah_dibayar' && newState !== 'sudah_dibayar') {
        if (!reason || reason.trim().length < 5) {
          result = { success: false, message: 'Pembatalan status sudah dibayar wajib menyertakan alasan' };
          return;
        }
      }

      pb.payments[stage] = {
        state: newState,
        paid_date: newState === 'sudah_dibayar' ? new Date().toISOString().split('T')[0] : undefined,
        note: reason,
        updated_by: tpm.id,
        updated_at: new Date().toISOString(),
      };
      pb.updated_at = new Date().toISOString();
      pb.version += 1;

      s.payment_history.push({
        id: 'ph-' + Date.now(),
        beneficiary_id: beneficiaryId,
        stage,
        old_state: oldState,
        new_state: newState,
        reason,
        changed_by: tpm.id,
        changed_at: new Date().toISOString(),
      });

      this.writeAudit(
        'PAYMENT_CHANGE',
        'beneficiaries',
        beneficiaryId,
        { [stage]: oldState },
        { [stage]: newState },
        reason || `Ubah tahap ${stage} menjadi ${newState}`
      );
      result = { success: true };
    });
    return result;
  }

  // --- WEEKLY RECAP & CRON SNAPSHOTS ---
  public ensureCurrentPeriod(): WeeklyRecapPeriod {
    const currentWeekStart = getWeekStartWITA();
    let period = this.state.weekly_recap_periods.find((p) => p.week_start === currentWeekStart);
    if (!period) {
      const weekEnd = getWeekEndWITA(currentWeekStart);
      const label = getRecapLabel(currentWeekStart);
      period = {
        id: 'per-' + currentWeekStart,
        week_start: currentWeekStart,
        week_end: weekEnd,
        label,
        status: 'open',
        current_revision: 0,
        late_entry_count: 0,
        created_at: new Date().toISOString(),
      };
      this.mutate((s) => {
        s.weekly_recap_periods.push(period!);
      });
    }
    return period;
  }

  public closeWeek(weekStart: string, source: 'cron' | 'manual' = 'manual'): { success: boolean; message?: string } {
    let result: { success: boolean; message?: string } = { success: false, message: '' };
    this.mutate((s) => {
      let period = s.weekly_recap_periods.find((p) => p.week_start === weekStart);
      if (!period) {
        const weekEnd = getWeekEndWITA(weekStart);
        period = {
          id: 'per-' + weekStart,
          week_start: weekStart,
          week_end: weekEnd,
          label: getRecapLabel(weekStart),
          status: 'open',
          current_revision: 0,
          late_entry_count: 0,
          created_at: new Date().toISOString(),
        };
        s.weekly_recap_periods.push(period);
      }

      if (period.status === 'closed') {
        result = { success: true, message: 'Periode sudah ditutup sebelumnya' };
        return;
      }

      // Build frozen snapshot
      const snapshot = this.buildSnapshot(period.id, 1, 'close', weekStart);
      s.weekly_recap_snapshots.push(snapshot);

      period.status = 'closed';
      period.closed_at = new Date().toISOString();
      period.closed_source = source;
      period.current_revision = 1;

      this.writeAudit('CLOSE_WEEK', 'weekly_recap_periods', period.id, undefined, undefined, `Penutupan periode ${weekStart}`);
      result = { success: true };
    });
    return result;
  }

  private buildSnapshot(
    periodId: string,
    revision: number,
    reason: WeeklyRecapSnapshot['reason'],
    weekStart: string
  ): WeeklyRecapSnapshot {
    const s = this.state;
    const visitsInWeek = s.monitoring_visits.filter((v) => v.week_start === weekStart && !v.is_voided);
    const uniquePbIds = new Set(visitsInWeek.map((v) => v.beneficiary_id));

    const visitsTpmPemberdayaan = visitsInWeek.filter((v) => {
      const p = s.profiles.find((prof) => prof.id === v.tpm_id);
      return p?.role === 'tpm_pemberdayaan';
    }).length;

    const visitsTpmKonstruksi = visitsInWeek.filter((v) => {
      const p = s.profiles.find((prof) => prof.id === v.tpm_id);
      return p?.role === 'tpm_konstruksi';
    }).length;

    const visitsByVillage: Record<string, number> = {};
    const visitsByKpb: Record<string, number> = {};
    visitsInWeek.forEach((v) => {
      visitsByVillage[v.village_id] = (visitsByVillage[v.village_id] || 0) + 1;
      visitsByKpb[v.kpb_id] = (visitsByKpb[v.kpb_id] || 0) + 1;
    });

    // Unvisited PBs with requires_visit = true
    const activeRequireVisitStatusIds = new Set(
      s.pb_statuses.filter((st) => st.requires_visit && st.is_active).map((st) => st.id)
    );
    const unvisitedList = s.beneficiaries
      .filter((b) => !b.is_archived && activeRequireVisitStatusIds.has(b.status_id) && !uniquePbIds.has(b.id))
      .map((b) => {
        const v = s.villages.find((vil) => vil.id === b.village_id);
        const k = s.kpbs.find((kpb) => kpb.id === b.kpb_id);
        const st = s.pb_statuses.find((sta) => sta.id === b.status_id);
        return {
          id: b.id,
          pb_code: b.pb_code,
          full_name: b.full_name,
          village_name: v?.name || '',
          kpb_name: k?.name || '',
          status_label: st?.label || '',
          current_progress: b.current_progress,
        };
      });

    const frozenVisits = visitsInWeek.map((v) => {
      const b = s.beneficiaries.find((item) => item.id === v.beneficiary_id);
      const vil = s.villages.find((item) => item.id === v.village_id);
      const kpb = s.kpbs.find((item) => item.id === v.kpb_id);
      const tpm = s.profiles.find((item) => item.id === v.tpm_id);
      const selfie = s.visit_photos.find((p) => p.id === v.selfie_photo_id);
      return {
        id: v.id,
        visited_at: v.visited_at,
        beneficiary_name: b?.full_name || 'Tidak diketahui',
        pb_code: b?.pb_code || '',
        village_name: vil?.name || '',
        kpb_name: kpb?.name || '',
        tpm_name: tpm?.display_name || '',
        tpm_role: tpm?.role || 'tpm_pemberdayaan',
        progress_before: v.progress_before,
        progress_after: v.progress_after,
        condition_notes: v.condition_notes,
        selfie_thumb: selfie?.thumb_path || selfie?.storage_path,
        photos_count: v.photo_ids.length,
        sync_status: v.sync_status,
      };
    });

    return {
      id: 'snp-' + periodId + '-r' + revision,
      period_id: periodId,
      revision,
      generated_at: new Date().toISOString(),
      reason,
      summary: {
        total_visits: visitsInWeek.length,
        unique_pb_visited: uniquePbIds.size,
        visits_tpm_pemberdayaan: visitsTpmPemberdayaan,
        visits_tpm_konstruksi: visitsTpmKonstruksi,
        pb_not_visited: unvisitedList.length,
        visits_by_village: visitsByVillage,
        visits_by_kpb: visitsByKpb,
        progress_changes_count: visitsInWeek.filter((v) => v.progress_after !== v.progress_before).length,
        total_photos: visitsInWeek.reduce((acc, v) => acc + 1 + v.photo_ids.length, 0),
        issues_found_count: 0,
      },
      visits: frozenVisits,
      unvisited_pb: unvisitedList,
    };
  }

  // --- STATS & AGGREGATIONS ---
  public getWeeklyMarkerStatus(beneficiaryId: string, weekStart?: string): {
    color: 'gray' | 'blue' | 'teal' | 'purple';
    badge: '–' | 'P' | 'K' | 'P+K';
    visitsCount: number;
    hasP: boolean;
    hasK: boolean;
  } {
    const ws = weekStart || getWeekStartWITA();
    const visits = this.state.monitoring_visits.filter(
      (v) => v.beneficiary_id === beneficiaryId && v.week_start === ws && !v.is_voided
    );
    let hasP = false;
    let hasK = false;

    visits.forEach((v) => {
      const p = this.state.profiles.find((prof) => prof.id === v.tpm_id);
      if (p?.role === 'tpm_pemberdayaan') hasP = true;
      if (p?.role === 'tpm_konstruksi') hasK = true;
    });

    if (hasP && hasK) {
      return { color: 'purple', badge: 'P+K', visitsCount: visits.length, hasP, hasK };
    }
    if (hasP) {
      return { color: 'blue', badge: 'P', visitsCount: visits.length, hasP, hasK };
    }
    if (hasK) {
      return { color: 'teal', badge: 'K', visitsCount: visits.length, hasP, hasK };
    }
    return { color: 'gray', badge: '–', visitsCount: 0, hasP, hasK };
  }
}

export const store = new Store();
