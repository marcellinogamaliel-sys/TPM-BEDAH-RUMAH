import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  MessageSquare,
  Search,
  Filter,
  User,
  Calendar,
  X,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import { store } from '../services/store';
import { Issue, IssuePriority, IssueStatus } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { formatDateID, formatDateTimeID } from '../utils/wita';

interface IssuesViewProps {
  onNavigate: (view: string, params?: Record<string, string>) => void;
  filterPbId?: string;
}

export const IssuesView: React.FC<IssuesViewProps> = ({ onNavigate, filterPbId }) => {
  const db = store.getState();
  const currentUser = store.currentUser;

  // Selected issue for detail modal
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  // New Issue Form modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState(db.issue_categories[0]?.id || '');
  const [newPriority, setNewPriority] = useState<IssuePriority>('sedang');
  const [newVillageId, setNewVillageId] = useState('');
  const [newKpbId, setNewKpbId] = useState('');
  const [newPbId, setNewPbId] = useState(filterPbId || '');
  const [newDesc, setNewDesc] = useState('');
  const [newImpact, setNewImpact] = useState('');
  const [newSolution, setNewSolution] = useState('');
  const [formError, setFormError] = useState('');

  // Mandatory Resolution Modal
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveReason, setResolveReason] = useState('');
  const [resolveActions, setResolveActions] = useState('');
  const [resolveResults, setResolveResults] = useState('');
  const [resolveError, setResolveError] = useState('');

  // Reopen Modal
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [reopenError, setReopenError] = useState('');

  // Comment input
  const [commentText, setCommentText] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | IssueStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | IssuePriority>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Issue Object
  const selectedIssue = useMemo(() => {
    return db.issues.find((i) => i.id === selectedIssueId) || null;
  }, [db.issues, selectedIssueId]);

  // Filtered issues
  const filteredIssues = useMemo(() => {
    return db.issues.filter((i) => {
      if (filterPbId && i.beneficiary_id !== filterPbId) return false;
      if (statusFilter !== 'all' && i.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && i.priority !== priorityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !i.title.toLowerCase().includes(q) &&
          !i.issue_code.toLowerCase().includes(q) &&
          !i.description.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [db.issues, filterPbId, statusFilter, priorityFilter, searchQuery]);

  // Counts
  const countBaru = db.issues.filter((i) => i.status === 'baru').length;
  const countOngoing = db.issues.filter((i) => i.status === 'dalam_penanganan').length;
  const countWaiting = db.issues.filter((i) => i.status === 'menunggu_tindak_lanjut').length;
  const countSelesai = db.issues.filter((i) => i.status === 'selesai').length;
  const countHighOrCritical = db.issues.filter((i) => i.status !== 'selesai' && (i.priority === 'tinggi' || i.priority === 'kritis')).length;

  // Handle Add Issue
  const handleCreateIssue = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (newTitle.trim().length < 5) {
      setFormError('Judul kendala minimal 5 karakter');
      return;
    }
    if (!newVillageId) {
      setFormError('Pilih Desa terkait');
      return;
    }
    if (newDesc.trim().length < 10) {
      setFormError('Deskripsi masalah minimal 10 karakter');
      return;
    }

    const res = store.createIssue({
      title: newTitle,
      category_id: newCategory,
      priority: newPriority,
      village_id: newVillageId,
      kpb_id: newKpbId || undefined,
      beneficiary_id: newPbId || undefined,
      description: newDesc,
      impact_on_progress: newImpact || undefined,
      proposed_solution: newSolution || undefined,
    });

    if (res.success) {
      setShowAddModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewImpact('');
      setNewSolution('');
    } else {
      setFormError(res.message || 'Gagal menyimpan kendala');
    }
  };

  // Handle Resolve Issue (Strict Validation)
  const handleConfirmResolve = () => {
    setResolveError('');
    if (!selectedIssue) return;

    if (resolveReason.trim().length < 10) {
      setResolveError('Alasan penyelesaian wajib diisi (minimal 10 karakter).');
      return;
    }
    if (resolveActions.trim().length < 5) {
      setResolveError('Tindakan yang sudah dilakukan wajib diisi (minimal 5 karakter).');
      return;
    }
    if (resolveResults.trim().length < 10) {
      setResolveError('Catatan hasil penyelesaian wajib diisi (minimal 10 karakter).');
      return;
    }

    const res = store.resolveIssue(selectedIssue.id, {
      reason: resolveReason,
      actions_taken: resolveActions,
      result_notes: resolveResults,
    });

    if (res.success) {
      setShowResolveModal(false);
      setResolveReason('');
      setResolveActions('');
      setResolveResults('');
    } else {
      setResolveError(res.message || 'Gagal menyelesaikan kendala.');
    }
  };

  // Handle Reopen
  const handleConfirmReopen = () => {
    setReopenError('');
    if (!selectedIssue) return;

    if (reopenReason.trim().length < 10) {
      setReopenError('Alasan pembukaan kembali wajib diisi (minimal 10 karakter).');
      return;
    }

    const res = store.reopenIssue(selectedIssue.id, reopenReason);
    if (res.success) {
      setShowReopenModal(false);
      setReopenReason('');
    } else {
      setReopenError(res.message || 'Gagal membuka kembali kendala.');
    }
  };

  // Handle Add Comment
  const handleAddComment = () => {
    if (!selectedIssue || !commentText.trim()) return;
    const res = store.addIssueComment(selectedIssue.id, commentText);
    if (res.success) {
      setCommentText('');
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Manajemen Kendala Lapangan
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pencatatan hambatan bahan, tukang, distribusi, administrasi, dan koordinasi dengan penyelesaian wajib beralasan.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Laporkan Kendala Baru</span>
        </button>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => setStatusFilter('baru')}
          className={`p-3.5 rounded-xl border text-left transition ${
            statusFilter === 'baru' ? 'border-blue-600 bg-blue-50/50' : 'bg-white border-slate-200'
          }`}
        >
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Baru</span>
          <div className="text-xl font-bold text-slate-900 mt-1 tabular-nums">{countBaru}</div>
        </button>

        <button
          onClick={() => setStatusFilter('dalam_penanganan')}
          className={`p-3.5 rounded-xl border text-left transition ${
            statusFilter === 'dalam_penanganan' ? 'border-teal-600 bg-teal-50/50' : 'bg-white border-slate-200'
          }`}
        >
          <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider">Dalam Penanganan</span>
          <div className="text-xl font-bold text-teal-800 mt-1 tabular-nums">{countOngoing}</div>
        </button>

        <button
          onClick={() => setStatusFilter('menunggu_tindak_lanjut')}
          className={`p-3.5 rounded-xl border text-left transition ${
            statusFilter === 'menunggu_tindak_lanjut' ? 'border-amber-600 bg-amber-50/50' : 'bg-white border-slate-200'
          }`}
        >
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Menunggu Lanjut</span>
          <div className="text-xl font-bold text-amber-800 mt-1 tabular-nums">{countWaiting}</div>
        </button>

        <button
          onClick={() => setStatusFilter('selesai')}
          className={`p-3.5 rounded-xl border text-left transition ${
            statusFilter === 'selesai' ? 'border-emerald-600 bg-emerald-50/50' : 'bg-white border-slate-200'
          }`}
        >
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Selesai</span>
          <div className="text-xl font-bold text-emerald-800 mt-1 tabular-nums">{countSelesai}</div>
        </button>

        <button
          onClick={() => setPriorityFilter('kritis')}
          className="p-3.5 rounded-xl border bg-white border-slate-200 text-left hover:border-rose-300 transition"
        >
          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Prioritas Kritis</span>
          <div className="text-xl font-bold text-rose-700 mt-1 tabular-nums">{countHighOrCritical}</div>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari judul / kode kendala..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
          >
            <option value="all">Semua Status</option>
            <option value="baru">Baru</option>
            <option value="dalam_penanganan">Dalam Penanganan</option>
            <option value="menunggu_tindak_lanjut">Menunggu Tindak Lanjut</option>
            <option value="selesai">Selesai</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
          >
            <option value="all">Semua Prioritas</option>
            <option value="kritis">Kritis</option>
            <option value="tinggi">Tinggi</option>
            <option value="sedang">Sedang</option>
            <option value="rendah">Rendah</option>
          </select>
        </div>

        {(statusFilter !== 'all' || priorityFilter !== 'all' || searchQuery) && (
          <button
            onClick={() => {
              setStatusFilter('all');
              setPriorityFilter('all');
              setSearchQuery('');
            }}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
          >
            Reset Filter
          </button>
        )}
      </div>

      {/* Issues Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <th className="py-3 px-3">Kode</th>
                <th className="py-3 px-3">Judul Kendala</th>
                <th className="py-3 px-3">Kategori</th>
                <th className="py-3 px-3">Prioritas</th>
                <th className="py-3 px-3">Wilayah / PB</th>
                <th className="py-3 px-3">Pelapor</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Target</th>
                <th className="py-3 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Tidak ada kendala yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredIssues.map((issue) => {
                  const cat = db.issue_categories.find((c) => c.id === issue.category_id);
                  const vil = db.villages.find((v) => v.id === issue.village_id);
                  const pb = db.beneficiaries.find((b) => b.id === issue.beneficiary_id);
                  const reporter = db.profiles.find((p) => p.id === issue.reported_by);

                  return (
                    <tr key={issue.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 font-mono font-bold text-blue-600 whitespace-nowrap">
                        {issue.issue_code}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900 max-w-xs truncate">
                        {issue.title}
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {cat?.name || 'Lainnya'}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <StatusBadge label={issue.priority} variant="priority" />
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-slate-800">{vil?.name}</div>
                        {pb && <div className="text-[10px] text-blue-600 font-mono truncate">{pb.full_name}</div>}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-slate-600">
                        {reporter?.display_name || '-'}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <StatusBadge label={issue.status} variant="status" />
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-slate-500 font-mono">
                        {issue.target_followup_date || '-'}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => setSelectedIssueId(issue.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition"
                        >
                          Buka Detail
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issue Detail & Timeline Modal */}
      {selectedIssue && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex items-start justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-600">{selectedIssue.issue_code}</span>
                  <StatusBadge label={selectedIssue.priority} variant="priority" />
                  <StatusBadge label={selectedIssue.status} variant="status" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">{selectedIssue.title}</h3>
              </div>
              <button
                onClick={() => setSelectedIssueId(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px]">Wilayah:</span>
                  <span className="font-semibold text-slate-800">
                    {db.villages.find((v) => v.id === selectedIssue.village_id)?.name || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Penerima Bantuan:</span>
                  <span className="font-semibold text-slate-800">
                    {db.beneficiaries.find((b) => b.id === selectedIssue.beneficiary_id)?.full_name || 'Kendala Umum'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Pelapor:</span>
                  <span className="font-semibold text-slate-800">
                    {db.profiles.find((p) => p.id === selectedIssue.reported_by)?.display_name || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Target Tindak Lanjut:</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {selectedIssue.target_followup_date || '-'}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <span className="font-bold text-slate-700 block mb-1">Deskripsi Masalah:</span>
                <p className="p-3 bg-slate-50 rounded-lg text-slate-700 leading-relaxed border border-slate-200">
                  {selectedIssue.description}
                </p>
              </div>

              {selectedIssue.proposed_solution && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1">Usulan Penyelesaian:</span>
                  <p className="p-3 bg-blue-50/50 rounded-lg text-blue-900 leading-relaxed border border-blue-100">
                    {selectedIssue.proposed_solution}
                  </p>
                </div>
              )}

              {/* Status Action Buttons */}
              <div className="p-3 bg-slate-100 rounded-xl space-y-2">
                <span className="font-bold text-slate-700 block">Tindakan Status:</span>
                <div className="flex flex-wrap gap-2">
                  {selectedIssue.status !== 'selesai' && (
                    <>
                      {selectedIssue.status !== 'dalam_penanganan' && (
                        <button
                          onClick={() => store.changeIssueStatus(selectedIssue.id, 'dalam_penanganan')}
                          className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                        >
                          Tandai Dalam Penanganan
                        </button>
                      )}
                      {selectedIssue.status !== 'menunggu_tindak_lanjut' && (
                        <button
                          onClick={() => store.changeIssueStatus(selectedIssue.id, 'menunggu_tindak_lanjut')}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                        >
                          Menunggu Tindak Lanjut
                        </button>
                      )}
                      <button
                        onClick={() => setShowResolveModal(true)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Selesaikan Kendala (Wajib Beralasan)
                      </button>
                    </>
                  )}

                  {selectedIssue.status === 'selesai' && (
                    <button
                      onClick={() => setShowReopenModal(true)}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Buka Kembali Kendala (Wajib Alasan)
                    </button>
                  )}
                </div>
              </div>

              {/* Resolution Records (Never deleted) */}
              {db.issue_resolution_records.filter((r) => r.issue_id === selectedIssue.id).length > 0 && (
                <div className="space-y-2">
                  <span className="font-bold text-slate-700 block">Riwayat Penyelesaian Resmi:</span>
                  {db.issue_resolution_records
                    .filter((r) => r.issue_id === selectedIssue.id)
                    .map((rec) => {
                      const resBy = db.profiles.find((p) => p.id === rec.resolved_by);
                      return (
                        <div key={rec.id} className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between text-emerald-800">
                            <strong>Diselesaikan oleh {resBy?.display_name || 'TPM'}</strong>
                            <span className="font-mono text-[10px]">{formatDateTimeID(rec.resolved_at)}</span>
                          </div>
                          <div className="text-emerald-950">
                            <div><strong>Alasan:</strong> {rec.reason}</div>
                            <div><strong>Tindakan:</strong> {rec.actions_taken}</div>
                            <div><strong>Catatan Hasil:</strong> {rec.result_notes}</div>
                          </div>
                          {rec.reopened_at && (
                            <div className="mt-2 pt-2 border-t border-emerald-200 text-rose-700">
                              <strong>Dibuka kembali:</strong> {rec.reopen_reason} ({formatDateTimeID(rec.reopened_at)})
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Timeline of Updates */}
              <div className="space-y-2">
                <span className="font-bold text-slate-700 block">Timeline Aktivitas & Catatan:</span>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {db.issue_updates
                    .filter((u) => u.issue_id === selectedIssue.id)
                    .map((update) => {
                      const user = db.profiles.find((p) => p.id === update.created_by);
                      return (
                        <div key={update.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] flex items-start justify-between gap-3">
                          <div>
                            <span className="font-bold text-slate-900">{user?.display_name || 'TPM'}:</span>{' '}
                            <span className="text-slate-700">{update.note}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            {formatDateTimeID(update.created_at)}
                          </span>
                        </div>
                      );
                    })}
                </div>

                {/* Comment box */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Tambah catatan komunikasi / tindak lanjut..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                    className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                  <button
                    onClick={handleAddComment}
                    className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
                  >
                    Kirim Catatan
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory Resolution Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Form Wajib Penyelesaian Kendala
              </h4>
              <button onClick={() => setShowResolveModal(false)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Kendala tidak dapat ditutup tanpa alasan dan bukti tindakan konkret. Kedua TPM berwenang menyelesaikan kendala.
            </p>

            {resolveError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {resolveError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Alasan Penyelesaian * (Min. 10 karakter)
                </label>
                <textarea
                  rows={2}
                  value={resolveReason}
                  onChange={(e) => setResolveReason(e.target.value)}
                  placeholder="Contoh: Tambahan 50 sak semen telah dikirim toko dan diterima..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tindakan yang Sudah Dilakukan * (Min. 5 karakter)
                </label>
                <input
                  type="text"
                  value={resolveActions}
                  onChange={(e) => setResolveActions(e.target.value)}
                  placeholder="Contoh: Berkoordinasi dengan pemilik toko dan ketua KPB..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Catatan Hasil Penyelesaian * (Min. 10 karakter)
                </label>
                <textarea
                  rows={2}
                  value={resolveResults}
                  onChange={(e) => setResolveResults(e.target.value)}
                  placeholder="Contoh: Tukang sudah kembali bekerja dan plesteran dinding dilanjutkan..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowResolveModal(false)}
                className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmResolve}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
              >
                Konfirmasi Selesaikan Kendala
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reopen Modal */}
      {showReopenModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-rose-600" />
                Buka Kembali Kendala
              </h4>
              <button onClick={() => setShowReopenModal(false)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            {reopenError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {reopenError}
              </div>
            )}

            <div className="text-xs space-y-2">
              <label className="block font-semibold text-slate-700">
                Alasan Pembukaan Kembali * (Min. 10 karakter)
              </label>
              <textarea
                rows={3}
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="Tuliskan mengapa masalah ini muncul kembali..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowReopenModal(false)}
                className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmReopen}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs"
              >
                Buka Kembali
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Issue Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900">Laporkan Kendala Lapangan Baru</h4>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateIssue} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Judul Kendala *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Contoh: Pasokan semen terlambat dari toko..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kategori Kendala</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    {db.issue_categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Prioritas</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="rendah">Rendah (14 hari)</option>
                    <option value="sedang">Sedang (7 hari)</option>
                    <option value="tinggi">Tinggi (3 hari)</option>
                    <option value="kritis">Kritis (1 hari)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Desa *</label>
                  <select
                    required
                    value={newVillageId}
                    onChange={(e) => {
                      setNewVillageId(e.target.value);
                      setNewKpbId('');
                      setNewPbId('');
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
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
                  <label className="block font-semibold text-slate-700 mb-1">KPB (Opsional)</label>
                  <select
                    value={newKpbId}
                    onChange={(e) => setNewKpbId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="">Semua KPB di desa</option>
                    {db.kpbs
                      .filter((k) => k.village_id === newVillageId)
                      .map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Penerima Bantuan (Opsional)</label>
                <select
                  value={newPbId}
                  onChange={(e) => setNewPbId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  <option value="">Kendala Umum Desa / KPB</option>
                  {db.beneficiaries
                    .filter((b) => (!newVillageId || b.village_id === newVillageId) && (!newKpbId || b.kpb_id === newKpbId))
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.pb_code} - {b.full_name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Deskripsi Masalah *</label>
                <textarea
                  required
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Jelaskan kondisi faktual di lapangan..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Dampak Terhadap Progres</label>
                <input
                  type="text"
                  value={newImpact}
                  onChange={(e) => setNewImpact(e.target.value)}
                  placeholder="Misal: Tukang terhenti 2 hari, target atap tertunda..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Usulan Solusi</label>
                <input
                  type="text"
                  value={newSolution}
                  onChange={(e) => setNewSolution(e.target.value)}
                  placeholder="Langkah antisipasi yang disarankan..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
                >
                  Kirim Laporan Kendala
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
