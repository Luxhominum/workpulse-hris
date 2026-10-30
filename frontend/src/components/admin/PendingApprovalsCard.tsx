'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LeaveRequest, LeaveType, OvertimeRequest, Employee } from '../../types';
import { resolveMediaUrl, ApiClient } from '../../lib/api';
import {
  Check,
  X,
  Clock,
  FileText,
  RefreshCw,
  Paperclip,
  ExternalLink,
  Palmtree,
  Stethoscope,
  Briefcase,
  UserCheck,
  Eye,
  AlertCircle,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock3,
  Plus,
  Search,
  Filter,
  Upload,
  User,
} from 'lucide-react';

interface PendingApprovalsProps {
  requests: LeaveRequest[];
  isLoading: boolean;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason?: string) => Promise<void>;
  onRefresh: () => void;
}

export function PendingApprovalsCard({
  requests: initialRequests,
  isLoading: isParentLoading,
  onApprove,
  onReject,
  onRefresh,
}: PendingApprovalsProps) {
  const [activeApprovalTab, setActiveApprovalTab] = useState<'leaves' | 'overtimes'>('leaves');

  // Leave State & Filter
  const [leavesList, setLeavesList] = useState<LeaveRequest[]>([]);
  const [isLeavesLoading, setIsLeavesLoading] = useState<boolean>(false);
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Leave Rejection Modal State
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  // Document Lightbox Preview
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);

  // Admin Bypass: Create Leave Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isEmployeesLoading, setIsEmployeesLoading] = useState<boolean>(false);

  // Form Fields for Admin Bypass
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [leaveType, setLeaveType] = useState<LeaveType>('SICK');
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [reason, setReason] = useState<string>('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Overtime Management State
  const [overtimes, setOvertimes] = useState<OvertimeRequest[]>([]);
  const [isOvertimesLoading, setIsOvertimesLoading] = useState<boolean>(false);
  const [overtimeFilter, setOvertimeFilter] = useState<string>('PENDING');
  const [rejectingOvertimeId, setRejectingOvertimeId] = useState<string | null>(null);
  const [rejectOvertimeReason, setRejectOvertimeReason] = useState<string>('');

  // Fetch Leaves by Filter
  const loadLeaves = useCallback(async () => {
    try {
      setIsLeavesLoading(true);
      const data = await ApiClient.getAllLeaves(
        leaveStatusFilter === 'ALL' ? undefined : leaveStatusFilter
      );
      setLeavesList(data);
    } catch (err) {
      console.error('Failed to load leaves:', err);
      // Fallback to parent requests if API fails
      setLeavesList(initialRequests);
    } finally {
      setIsLeavesLoading(false);
    }
  }, [leaveStatusFilter, initialRequests]);

  useEffect(() => {
    loadLeaves();
  }, [loadLeaves]);

  // Load Employees for the Admin Bypass Modal Dropdown
  const loadEmployees = useCallback(async () => {
    try {
      setIsEmployeesLoading(true);
      const emps = await ApiClient.getEmployees();
      setEmployees(emps);
      if (emps.length > 0 && !selectedEmpId) {
        setSelectedEmpId(emps[0].id);
      }
    } catch (err) {
      console.error('Failed to load employees for leave modal:', err);
    } finally {
      setIsEmployeesLoading(false);
    }
  }, [selectedEmpId]);

  useEffect(() => {
    if (isCreateModalOpen && employees.length === 0) {
      loadEmployees();
    }
  }, [isCreateModalOpen, employees.length, loadEmployees]);

  // Load Overtimes
  const loadOvertimes = useCallback(async () => {
    try {
      setIsOvertimesLoading(true);
      const data = await ApiClient.getAllOvertimes(
        overtimeFilter === 'ALL' ? undefined : overtimeFilter
      );
      setOvertimes(data);
    } catch (err) {
      console.error('Failed to load overtimes:', err);
    } finally {
      setIsOvertimesLoading(false);
    }
  }, [overtimeFilter]);

  useEffect(() => {
    loadOvertimes();
  }, [loadOvertimes]);

  // Handle Approve Leave
  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await onApprove(id);
      await loadLeaves();
      onRefresh();
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Reject Leave
  const handleConfirmReject = async (id: string) => {
    setActionLoading(id);
    try {
      await onReject(id, rejectReason);
      setRejectingId(null);
      setRejectReason('');
      await loadLeaves();
      onRefresh();
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Approve Overtime
  const handleApproveOvertime = async (id: string) => {
    setActionLoading(id);
    try {
      await ApiClient.approveOvertime(id, 'Disetujui oleh HRD/Manajer');
      await loadOvertimes();
    } catch (err: any) {
      alert(err.message || 'Gagal menyetujui lembur.');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Reject Overtime
  const handleConfirmRejectOvertime = async (id: string) => {
    setActionLoading(id);
    try {
      await ApiClient.rejectOvertime(id, rejectOvertimeReason);
      setRejectingOvertimeId(null);
      setRejectOvertimeReason('');
      await loadOvertimes();
    } catch (err: any) {
      alert(err.message || 'Gagal menolak lembur.');
    } finally {
      setActionLoading(null);
    }
  };

  // Admin Bypass: Submit Leave on behalf of employee
  const handleAdminCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) {
      setFormError('Silakan pilih karyawan terlebih dahulu.');
      return;
    }
    if (!reason.trim()) {
      setFormError('Alasan izin / cuti wajib diisi.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      const formData = new FormData();
      formData.append('employee_id', selectedEmpId);
      formData.append('type', leaveType);
      formData.append('start_date', startDate);
      formData.append('end_date', endDate);
      formData.append('reason', reason.trim());

      if (attachmentFile) {
        formData.append('attachment', attachmentFile);
      }

      await ApiClient.adminCreateLeave(formData);

      setFormSuccess('Permohonan izin berhasil diterbitkan dan langsung disetujui (Approved)!');
      setTimeout(() => {
        setIsCreateModalOpen(false);
        setFormSuccess(null);
        setReason('');
        setAttachmentFile(null);
        loadLeaves();
        onRefresh(); // Trigger Daily Live Board update
      }, 1000);
    } catch (err: any) {
      setFormError(err.message || 'Gagal menerbitkan permohonan izin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate working days count between startDate and endDate
  const workingDaysCount = useMemo(() => {
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) return 0;

    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
      // PGE operating rule: Sunday is off (0)
      if (cur.getDay() !== 0) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return Math.max(1, count);
  }, [startDate, endDate]);

  const selectedEmployeeData = useMemo(() => {
    return employees.find((e) => e.id === selectedEmpId);
  }, [employees, selectedEmpId]);

  // Leave Type Configuration UI
  const getLeaveTypeConfig = (type: LeaveType) => {
    switch (type) {
      case 'ANNUAL':
        return {
          label: 'Cuti Tahunan',
          badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: Palmtree,
        };
      case 'SICK':
        return {
          label: 'Izin Sakit (SKD)',
          badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
          icon: Stethoscope,
        };
      case 'PERSONAL':
      case 'UNPAID':
        return {
          label: type === 'UNPAID' ? 'Cuti Tanpa Gaji' : 'Izin Pribadi',
          badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: UserCheck,
        };
      case 'DUTY':
        return {
          label: 'Izin Dinas / Tugas Luar',
          badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
          icon: Briefcase,
        };
      case 'CORRECTION':
        return {
          label: 'Koreksi Absensi',
          badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
          icon: Clock,
        };
      default:
        return {
          label: type,
          badgeClass: 'bg-stone-100 text-stone-700 border-stone-200',
          icon: FileText,
        };
    }
  };

  // Filtered Leaves List by Search Query
  const filteredLeaves = useMemo(() => {
    if (!searchQuery.trim()) return leavesList;
    const q = searchQuery.toLowerCase().trim();
    return leavesList.filter(
      (l) =>
        l.employee?.full_name?.toLowerCase().includes(q) ||
        l.employee?.department?.toLowerCase().includes(q) ||
        l.reason?.toLowerCase().includes(q)
    );
  }, [leavesList, searchQuery]);

  const pendingLeavesCount = leavesList.filter((l) => l.status === 'PENDING').length;
  const pendingOvertimesCount = overtimes.filter((o) => o.status === 'PENDING').length;

  return (
    <div className="bg-white border border-[#E8DFD0] rounded-3xl p-6 shadow-sm space-y-6">
      {/* Top Header: Sub-Tab Switcher + Action Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E8DFD0] pb-5">
        <div className="space-y-1.5">
          {/* Executive Capsule Switcher */}
          <div className="inline-flex p-1 bg-[#FAF8F5] border border-[#E8DFD0] rounded-2xl gap-1">
            {/* Tab 1: Leaves */}
            <button
              onClick={() => setActiveApprovalTab('leaves')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeApprovalTab === 'leaves'
                  ? 'bg-[#161B26] text-white shadow-xs'
                  : 'text-[#78716C] hover:text-[#161B26] hover:bg-[#F2ECE1]/60'
              }`}
            >
              <Palmtree className={`w-3.5 h-3.5 ${activeApprovalTab === 'leaves' ? 'text-[#D97706]' : 'text-[#78716C]'}`} />
              <span>Pengajuan Cuti & Izin</span>
              {pendingLeavesCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#D97706] text-white">
                  {pendingLeavesCount}
                </span>
              )}
            </button>

            {/* Tab 2: Overtimes (SPL) */}
            <button
              onClick={() => setActiveApprovalTab('overtimes')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeApprovalTab === 'overtimes'
                  ? 'bg-[#161B26] text-white shadow-xs'
                  : 'text-[#78716C] hover:text-[#161B26] hover:bg-[#F2ECE1]/60'
              }`}
            >
              <Clock3 className={`w-3.5 h-3.5 ${activeApprovalTab === 'overtimes' ? 'text-[#D97706]' : 'text-[#78716C]'}`} />
              <span>Surat Perintah Lembur (SPL)</span>
              {pendingOvertimesCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-600 text-white">
                  {pendingOvertimesCount}
                </span>
              )}
            </button>
          </div>
          <p className="text-xs text-[#78716C] font-medium pl-0.5">
            {activeApprovalTab === 'leaves'
              ? 'Verifikasi cuti tahunan, surat sakit (SKD), tugas luar kantor, serta penerbitan izin langsung oleh HRD.'
              : 'Verifikasi surat perintah lembur karyawan (SPL). Jam yang disetujui otomatis masuk rekapan payroll.'}
          </p>
        </div>

        {/* Action Controls Cluster */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Admin Bypass Create Button (Morning Luxury Dark Charcoal & Gold) */}
          {activeApprovalTab === 'leaves' && (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#161B26] hover:bg-[#222938] active:scale-95 text-xs font-bold text-white shadow-xs flex items-center gap-1.5 cursor-pointer transition-all border border-[#161B26]"
            >
              <Plus className="w-4 h-4 text-[#D97706]" />
              <span>+ Terbitkan Izin Manual</span>
            </button>
          )}

          {/* Status Filter for Leaves */}
          {activeApprovalTab === 'leaves' && (
            <div className="flex items-center space-x-1.5 bg-[#FAF8F5] border border-[#E8DFD0] px-3 py-2 rounded-xl shadow-2xs">
              <Filter className="w-3.5 h-3.5 text-[#D97706]" />
              <select
                value={leaveStatusFilter}
                onChange={(e) => setLeaveStatusFilter(e.target.value)}
                className="bg-transparent text-xs text-[#161B26] font-bold focus:outline-none cursor-pointer"
              >
                <option value="ALL">Semua Riwayat Cuti</option>
                <option value="PENDING">Menunggu Persetujuan</option>
                <option value="APPROVED">Disetujui (Approved)</option>
                <option value="REJECTED">Ditolak (Rejected)</option>
              </select>
            </div>
          )}

          {/* Status Filter for Overtimes */}
          {activeApprovalTab === 'overtimes' && (
            <div className="flex items-center space-x-1.5 bg-[#FAF8F5] border border-[#E8DFD0] px-3 py-2 rounded-xl shadow-2xs">
              <Filter className="w-3.5 h-3.5 text-[#D97706]" />
              <select
                value={overtimeFilter}
                onChange={(e) => setOvertimeFilter(e.target.value)}
                className="bg-transparent text-xs text-[#161B26] font-bold focus:outline-none cursor-pointer"
              >
                <option value="PENDING">Menunggu Persetujuan</option>
                <option value="APPROVED">Disetujui (Approved)</option>
                <option value="REJECTED">Ditolak (Rejected)</option>
                <option value="ALL">Semua Riwayat Lembur</option>
              </select>
            </div>
          )}

          {/* Refresh Button */}
          <button
            onClick={() => {
              if (activeApprovalTab === 'leaves') {
                loadLeaves();
                onRefresh();
              } else {
                loadOvertimes();
              }
            }}
            disabled={isParentLoading || isLeavesLoading || isOvertimesLoading}
            className="p-2.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F2ECE1] text-[#57534E] hover:text-[#161B26] border border-[#E8DFD0] shadow-2xs transition-colors cursor-pointer"
            title="Segarkan Data"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                isParentLoading || isLeavesLoading || isOvertimesLoading
                  ? 'animate-spin text-[#D97706]'
                  : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Search Input for Leaves */}
      {activeApprovalTab === 'leaves' && (
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-[#78716C] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama karyawan / departemen / alasan izin..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#FAF8F5] border border-[#E8DFD0] rounded-xl text-xs font-medium text-[#161B26] focus:outline-none focus:border-[#D97706] transition-all placeholder:text-[#A8A29E]"
          />
        </div>
      )}

      {/* TAB 1: LEAVE & PERMIT APPROVALS LIST */}
      {activeApprovalTab === 'leaves' && (
        <div className="space-y-3.5">
          {isLeavesLoading ? (
            <div className="text-center py-12 text-[#78716C] space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#D97706]" />
              <p className="text-xs font-bold">Memuat daftar permohonan cuti & izin...</p>
            </div>
          ) : filteredLeaves.length === 0 ? (
            <div className="text-center py-12 text-[#78716C] text-xs border border-dashed border-[#E8DFD0] rounded-2xl bg-[#FAF8F5]/60 space-y-2">
              <Palmtree className="w-8 h-8 text-[#A8A29E] mx-auto opacity-40" />
              <p className="font-bold text-[#161B26]">Tidak Ada Permohonan Cuti atau Izin</p>
              <p className="text-[11px] max-w-md mx-auto text-[#78716C]">
                Belum ada data permohonan yang sesuai dengan filter ini. Anda dapat menerbitkan izin langsung dengan tombol &quot;+ Terbitkan Izin Manual&quot; di atas.
              </p>
            </div>
          ) : (
            filteredLeaves.map((req) => {
              const config = getLeaveTypeConfig(req.type);
              const Icon = config.icon;

              const startDateStr = new Date(req.start_date).toLocaleDateString('id-ID', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
              const endDateStr = new Date(req.end_date).toLocaleDateString('id-ID', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              return (
                <div
                  key={req.id}
                  className="p-5 bg-[#FAF8F5]/70 hover:bg-[#FAF8F5] rounded-2xl border border-[#E8DFD0] hover:border-[#D97706]/40 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all shadow-2xs"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar Initials */}
                    <div className="w-11 h-11 rounded-2xl bg-white border border-[#E8DFD0] flex items-center justify-center font-black text-[#161B26] text-xs shadow-2xs shrink-0">
                      {req.employee?.full_name
                        ? req.employee.full_name
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()
                        : 'EMP'}
                    </div>

                    <div className="space-y-1.5 flex-1">
                      {/* Name + Dept + Type Badge */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[#161B26] text-xs tracking-tight">
                          {req.employee?.full_name}
                        </span>
                        <span className="text-[10px] font-bold text-[#57534E] bg-[#F2ECE1] px-2 py-0.5 rounded-md border border-[#E8DFD0]">
                          {req.employee?.department}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${config.badgeClass}`}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{config.label}</span>
                        </span>
                      </div>

                      {/* Date Range */}
                      <div className="flex items-center gap-1.5 text-xs text-[#161B26] font-bold">
                        <Calendar className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
                        <span>
                          {startDateStr} {startDateStr !== endDateStr ? `s.d. ${endDateStr}` : ''}
                        </span>
                      </div>

                      {/* Reason Quote */}
                      <p className="text-xs text-[#44403C] italic bg-white px-3 py-1.5 rounded-xl border border-[#E8DFD0]/80 max-w-xl">
                        &quot;{req.reason}&quot;
                      </p>

                      {/* Attachment Button */}
                      {req.attachment_url && (
                        <div className="pt-0.5">
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewDoc({
                                url: resolveMediaUrl(req.attachment_url),
                                title: `Lampiran Bukti - ${req.employee?.full_name}`,
                              })
                            }
                            className="inline-flex items-center gap-1.5 text-xs text-[#D97706] hover:text-[#B45309] font-bold cursor-pointer"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                            <span>Lihat Lampiran Dokumen</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions / Status Indicators */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    {req.status === 'PENDING' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setRejectingId(req.id)}
                          disabled={actionLoading === req.id}
                          className="px-3.5 py-1.5 rounded-xl border border-[#E8DFD0] bg-white text-[#78716C] hover:text-rose-700 hover:bg-rose-50/50 hover:border-rose-200 active:scale-95 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Tolak</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleApprove(req.id)}
                          disabled={actionLoading === req.id}
                          className="px-4 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-100" />
                          <span>Setujui</span>
                        </button>
                      </>
                    ) : req.status === 'APPROVED' ? (
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Disetujui</span>
                      </span>
                    ) : (
                      <div className="text-right">
                        <span className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Ditolak</span>
                        </span>
                        {req.rejection_reason && (
                          <p className="text-[10px] text-rose-700 italic mt-1 max-w-[150px] truncate" title={req.rejection_reason}>
                            Alasan: {req.rejection_reason}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: OVERTIME / SPL APPROVALS LIST */}
      {activeApprovalTab === 'overtimes' && (
        <div className="space-y-3.5">
          {isOvertimesLoading ? (
            <div className="text-center py-12 text-[#78716C] space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-amber-600" />
              <p className="text-xs font-bold">Memuat daftar surat perintah lembur (SPL)...</p>
            </div>
          ) : overtimes.length === 0 ? (
            <div className="text-center py-12 text-[#78716C] text-xs border border-dashed border-[#E6DFD3] rounded-2xl bg-[#FAF8F5]/60 space-y-2">
              <Clock3 className="w-8 h-8 text-[#A8A29E] mx-auto opacity-40" />
              <p className="font-bold text-[#161B26]">Tidak Ada Pengajuan Lembur</p>
              <p className="text-[11px] max-w-md mx-auto text-[#78716C]">
                Tidak ada data surat perintah lembur (SPL) yang sesuai dengan filter ini.
              </p>
            </div>
          ) : (
            overtimes.map((ot) => {
              const otDateStr = new Date(ot.date).toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              });

              return (
                <div
                  key={ot.id}
                  className="p-5 bg-[#FAF8F5]/70 hover:bg-[#FAF8F5] rounded-2xl border border-[#E8DFD0] hover:border-[#D97706]/40 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all shadow-2xs"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-white border border-[#E8DFD0] flex items-center justify-center font-black text-[#161B26] text-xs shadow-2xs shrink-0">
                      SPL
                    </div>

                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[#161B26] text-xs tracking-tight">
                          {ot.employee?.full_name}
                        </span>
                        <span className="text-[10px] font-bold text-[#57534E] bg-[#F2ECE1] px-2 py-0.5 rounded-md border border-[#E8DFD0]">
                          {ot.employee?.department}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border bg-amber-50 text-amber-800 border-amber-200">
                          {ot.duration_hours} Jam Lembur
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-[#161B26] font-bold">
                        <Calendar className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
                        <span>{otDateStr}</span>
                      </div>

                      <p className="text-xs text-[#44403C] italic bg-white px-3 py-1.5 rounded-xl border border-[#E8DFD0]/80 max-w-xl">
                        &quot;{ot.reason}&quot;
                      </p>
                    </div>
                  </div>

                  {/* Actions for Overtime */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    {ot.status === 'PENDING' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setRejectingOvertimeId(ot.id)}
                          disabled={actionLoading === ot.id}
                          className="px-3.5 py-1.5 rounded-xl border border-[#E8DFD0] bg-white text-[#78716C] hover:text-rose-700 hover:bg-rose-50/50 hover:border-rose-200 active:scale-95 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Tolak</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleApproveOvertime(ot.id)}
                          disabled={actionLoading === ot.id}
                          className="px-4 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-100" />
                          <span>Setujui Lembur</span>
                        </button>
                      </>
                    ) : ot.status === 'APPROVED' ? (
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Disetujui ({ot.duration_hours} jam)</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Ditolak</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: ADMIN BYPASS - TAMBAHKAN PERMOHONAN IZIN MANUAL */}
      {/* ======================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            className="bg-[#FAF8F5] rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#E6DFD3] space-y-4 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-150 font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E6DFD3] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black uppercase tracking-wider">
                    Admin Bypass
                  </span>
                  <h3 className="text-sm font-black text-[#161B26] tracking-tight">
                    Terbitkan Permohonan Izin / Cuti
                  </h3>
                </div>
                <p className="text-[11px] text-[#78716C] font-medium mt-0.5">
                  Izin ini langsung disetujui (Approved) & otomatis tercatat di Daily Live Board.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-xl text-[#78716C] hover:text-[#161B26] hover:bg-[#EFE9DF] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAdminCreateLeave} className="space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* 1. Pilih Karyawan */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#161B26] flex items-center justify-between">
                  <span>Pilih Karyawan *</span>
                  {selectedEmployeeData && (
                    <span className="text-[10px] text-amber-700 font-mono font-bold">
                      Sisa Cuti: {selectedEmployeeData.annual_leave_quota - selectedEmployeeData.annual_leave_used} Hari
                    </span>
                  )}
                </label>
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  disabled={isEmployeesLoading}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E6DFD3] rounded-xl text-xs font-bold text-[#161B26] focus:outline-none focus:border-amber-500 shadow-2xs cursor-pointer"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} — {emp.department} ({emp.position || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Jenis Izin */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#161B26]">Jenis Izin / Cuti *</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'SICK', label: 'Izin Sakit (SKD)', icon: Stethoscope },
                    { id: 'ANNUAL', label: 'Cuti Tahunan', icon: Palmtree },
                    { id: 'DUTY', label: 'Izin Dinas / Tugas Luar', icon: Briefcase },
                    { id: 'PERSONAL', label: 'Izin Pribadi', icon: UserCheck },
                    { id: 'CORRECTION', label: 'Koreksi Absensi', icon: Clock },
                    { id: 'UNPAID', label: 'Cuti Tanpa Gaji', icon: FileText },
                  ].map((item) => {
                    const ItemIcon = item.icon;
                    const isSelected = leaveType === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setLeaveType(item.id as any)}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-50 border-amber-400 text-amber-900 font-black shadow-2xs'
                            : 'bg-white border-[#E6DFD3] text-[#57534E] hover:bg-[#FAF8F5]'
                        }`}
                      >
                        <ItemIcon className="w-3.5 h-3.5 shrink-0 text-amber-700" />
                        <span className="text-xs">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Rentang Tanggal */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#161B26]">Tanggal Mulai *</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E6DFD3] rounded-xl text-xs font-bold text-[#161B26] focus:outline-none focus:border-amber-500 shadow-2xs cursor-pointer"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#161B26]">Tanggal Selesai *</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E6DFD3] rounded-xl text-xs font-bold text-[#161B26] focus:outline-none focus:border-amber-500 shadow-2xs cursor-pointer"
                  />
                </div>
              </div>

              {/* Duration Notice Pill */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#E6DFD3] text-xs">
                <span className="text-[#78716C] font-semibold">Total Durasi Izin:</span>
                <span className="font-black text-[#161B26] bg-[#FAF8F5] px-2 py-0.5 rounded-md border border-[#E6DFD3]">
                  {workingDaysCount} Hari Kerja (Minggu Libur)
                </span>
              </div>

              {/* 4. Alasan / Catatan Disposisi */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#161B26]">Alasan / Keterangan Disposisi *</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Contoh: Karyawan sakit flu berat per telepon / Surat dokter fisik menyusul..."
                  className="w-full p-3 bg-white border border-[#E6DFD3] rounded-xl text-xs text-[#161B26] focus:outline-none focus:border-amber-500 shadow-2xs font-medium"
                  rows={3}
                />
              </div>

              {/* 5. Upload Dokumen / Foto Bukti (Opsional) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#161B26]">Upload Surat / Bukti Fisik (Opsional)</label>
                <label className="flex items-center gap-2 p-3 bg-white border border-dashed border-[#E6DFD3] hover:border-amber-400 rounded-xl cursor-pointer transition-colors">
                  <Upload className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-xs text-[#78716C] truncate font-medium">
                    {attachmentFile ? attachmentFile.name : 'Pilih file surat dokter / PDF / foto formulir...'}
                  </span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8DFD0]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#78716C] hover:text-[#161B26] hover:bg-[#F2ECE1] transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#161B26] hover:bg-[#222938] active:scale-95 text-xs font-bold text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4 text-[#D97706]" />
                  <span>{isSubmitting ? 'Menerbitkan...' : 'Terbitkan & Setujui Sekarang'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: TOLAK PERMOHONAN CUTI DENGAN ALASAN */}
      {/* ======================================================== */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF8F5] rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-[#E6DFD3] space-y-3 font-sans">
            <h3 className="text-sm font-black text-[#161B26]">Alasan Penolakan Izin / Cuti</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Contoh: Kuota cuti tidak mencukupi / Diperlukan untuk jadwal produksi..."
              className="w-full text-xs p-3 bg-white border border-[#E6DFD3] rounded-xl focus:outline-none focus:border-amber-500 shadow-2xs"
              rows={3}
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRejectingId(null)}
                className="px-3.5 py-1.5 text-xs font-bold text-[#78716C] hover:text-[#161B26] rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleConfirmReject(rejectingId)}
                className="px-4 py-1.5 text-xs font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-700 active:scale-95 shadow-2xs"
              >
                Konfirmasi Tolak
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: TOLAK LEMBUR (SPL) */}
      {/* ======================================================== */}
      {rejectingOvertimeId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF8F5] rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-[#E6DFD3] space-y-3 font-sans">
            <h3 className="text-sm font-black text-[#161B26]">Alasan Penolakan Lembur (SPL)</h3>
            <textarea
              value={rejectOvertimeReason}
              onChange={(e) => setRejectOvertimeReason(e.target.value)}
              placeholder="Contoh: Belum ada urgensi produksi / shift malam mencukupi..."
              className="w-full text-xs p-3 bg-white border border-[#E6DFD3] rounded-xl focus:outline-none focus:border-amber-500 shadow-2xs"
              rows={3}
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRejectingOvertimeId(null)}
                className="px-3.5 py-1.5 text-xs font-bold text-[#78716C] hover:text-[#161B26] rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleConfirmRejectOvertime(rejectingOvertimeId)}
                className="px-4 py-1.5 text-xs font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-700 active:scale-95 shadow-2xs"
              >
                Konfirmasi Tolak
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: DOCUMENT LIGHTBOX PREVIEW */}
      {/* ======================================================== */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 shadow-2xl border border-[#E6DFD3] space-y-4 max-h-[90vh] flex flex-col font-sans">
            <div className="flex items-center justify-between border-b border-[#E6DFD3] pb-3">
              <h3 className="text-sm font-bold text-[#161B26]">{previewDoc.title}</h3>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="p-1 rounded-xl hover:bg-[#FAF8F5] text-[#78716C] hover:text-[#161B26]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center bg-[#FAF8F5] rounded-2xl p-3 min-h-[300px]">
              {previewDoc.url.endsWith('.pdf') ? (
                <iframe src={previewDoc.url} className="w-full h-[500px] rounded-xl" />
              ) : (
                <img
                  src={previewDoc.url}
                  alt="Preview Dokumen"
                  className="max-h-[500px] object-contain rounded-xl shadow-sm"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
