'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ApiClient, resolveMediaUrl } from '../lib/api';
import { LeaveRequest, LeaveBalance, LeaveType, LeaveStatus, OvertimeRequest } from '../types';
import { HapticFeedback } from '../lib/haptics';
import {
  CalendarDays,
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Plus,
  RefreshCw,
  Paperclip,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Stethoscope,
  Briefcase,
  UserCheck,
  Palmtree,
  HelpCircle,
  X,
  FileCheck,
  Clock3,
} from 'lucide-react';

interface LeaveTabProps {
  employeeId?: string;
}

export function LeaveTab({ employeeId }: LeaveTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'leaves' | 'overtimes'>('leaves');
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | LeaveStatus>('ALL');

  // Overtime / SPL State
  const [overtimes, setOvertimes] = useState<OvertimeRequest[]>([]);
  const [isOvertimeLoading, setIsOvertimeLoading] = useState(false);
  const [isOvertimeFormOpen, setIsOvertimeFormOpen] = useState(false);
  const [otDate, setOtDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [otStartTime, setOtStartTime] = useState<string>('17:00');
  const [otEndTime, setOtEndTime] = useState<string>('21:00');
  const [otReason, setOtReason] = useState<string>('');

  // Preview attachment modal
  const [previewAttachment, setPreviewAttachment] = useState<{ url: string; title: string } | null>(null);

  // Form State
  const [leaveType, setLeaveType] = useState<LeaveType>('ANNUAL');
  const [startDate, setStartDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [reason, setReason] = useState<string>('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  const loadOvertimes = useCallback(async () => {
    try {
      setIsOvertimeLoading(true);
      const list = await ApiClient.getMyOvertimes();
      setOvertimes(list);
    } catch (err: any) {
      console.warn('Load overtimes error:', err);
    } finally {
      setIsOvertimeLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [bal, list] = await Promise.all([
        ApiClient.getMyLeaveBalance().catch(() => null),
        ApiClient.getMyLeaves().catch(() => []),
      ]);
      setBalance(bal);
      setLeaves(list);
      loadOvertimes();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memuat data cuti & perizinan.');
    } finally {
      setIsLoading(false);
    }
  }, [loadOvertimes]);

  const otDuration = useMemo(() => {
    const [sH, sM] = otStartTime.split(':').map(Number);
    const [eH, eM] = otEndTime.split(':').map(Number);
    let sTot = sH * 60 + sM;
    let eTot = eH * 60 + eM;
    if (eTot <= sTot) eTot += 24 * 60;
    return Math.round(((eTot - sTot) / 60) * 10) / 10;
  }, [otStartTime, otEndTime]);

  const totalApprovedOvertimeHours = useMemo(() => {
    return overtimes
      .filter((o) => o.status === 'APPROVED')
      .reduce((sum, o) => sum + o.duration_hours, 0);
  }, [overtimes]);

  const handleOvertimeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await ApiClient.createOvertimeRequest({
        date: otDate,
        start_time: otStartTime,
        end_time: otEndTime,
        reason: otReason,
      });
      setSuccessMsg(res.message);
      setIsOvertimeFormOpen(false);
      setOtReason('');
      loadOvertimes();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengajukan lembur.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelOvertime = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin membatalkan pengajuan lembur ini?')) return;
    try {
      await ApiClient.cancelOvertime(id);
      loadOvertimes();
    } catch (err: any) {
      alert(err.message || 'Gagal membatalkan pengajuan.');
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate working days duration
  const requestedWorkingDays = useMemo(() => {
    if (!startDate || !endDate) return 1;
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) return 0;

    let count = 0;
    const cur = new Date(s);
    while (cur <= e) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) {
        count++;
      }
      cur.setDate(cur.getDate() + 1);
    }
    return Math.max(count, 1);
  }, [startDate, endDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!reason.trim() || reason.trim().length < 3) {
      setErrorMsg('Harap berikan alasan permohonan minimal 3 karakter.');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setErrorMsg('Tanggal mulai tidak boleh lebih lambat dari tanggal selesai.');
      return;
    }

    if (leaveType === 'ANNUAL' && balance) {
      if (requestedWorkingDays > balance.annual_leave_remaining) {
        setErrorMsg(
          `Sisa kuota cuti Anda (${balance.annual_leave_remaining} hari) tidak mencukupi untuk pengajuan ${requestedWorkingDays} hari kerja.`
        );
        return;
      }
    }

    if (leaveType === 'SICK' && !attachmentFile) {
      // Warning if sick leave without doctor note
      const confirmNoDoc = confirm(
        'Anda belum melampirkan Surat Keterangan Dokter. Apakah ingin tetap mengajukan tanpa lampiran?'
      );
      if (!confirmNoDoc) return;
    }

    setIsSubmitting(true);
    try {
      await ApiClient.createLeave({
        type: leaveType,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        reason: reason.trim(),
        attachment: attachmentFile,
      });

      setSuccessMsg('Pengajuan perizinan / cuti berhasil dikirim ke manajer!');
      setReason('');
      setAttachmentFile(null);
      setIsFormOpen(false);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengajukan izin kerja.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredLeaves = useMemo(() => {
    if (statusFilter === 'ALL') return leaves;
    return leaves.filter((l) => l.status === statusFilter);
  }, [leaves, statusFilter]);

  const getLeaveTypeBadge = (type: LeaveType) => {
    switch (type) {
      case 'ANNUAL':
        return {
          label: 'Cuti Tahunan',
          badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: Palmtree,
        };
      case 'SICK':
        return {
          label: 'Izin Sakit',
          badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
          icon: Stethoscope,
        };
      case 'PERSONAL':
      case 'UNPAID':
        return {
          label: 'Izin Pribadi',
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
          badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: FileText,
        };
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub-Tab Switcher: Cuti & Izin vs Lembur Mandiri */}
      <div className="bg-[#EFE9DD]/80 p-1 rounded-full flex items-center gap-1 border border-[#E0D8C8]">
        <button
          type="button"
          onClick={() => {
            HapticFeedback.tick();
            setActiveSubTab('leaves');
          }}
          className={`flex-1 py-2 px-3 rounded-full text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
            activeSubTab === 'leaves'
              ? 'bg-[#161B26] text-white shadow-sm'
              : 'text-[#6E6454] hover:text-[#161B26]'
          }`}
        >
          <Palmtree className="w-3.5 h-3.5 text-[#FDE68A]" />
          <span>Cuti & Izin Kerja</span>
        </button>

        <button
          type="button"
          onClick={() => {
            HapticFeedback.tick();
            setActiveSubTab('overtimes');
          }}
          className={`flex-1 py-2 px-3 rounded-full text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
            activeSubTab === 'overtimes'
              ? 'bg-[#161B26] text-white shadow-sm'
              : 'text-[#6E6454] hover:text-[#161B26]'
          }`}
        >
          <Clock3 className="w-3.5 h-3.5 text-[#FDE68A]" />
          <span>Lembur Mandiri (SPL)</span>
          {overtimes.some((o) => o.status === 'PENDING') && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </button>
      </div>

      {/* Global Alerts */}
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* SUBVIEW 1: CUTI & IZIN KERJA */}
      {activeSubTab === 'leaves' && (
        <div className="space-y-4">
          {/* 1. Leave Quota & Metrics Bar */}
          <div className="bg-white/85 backdrop-blur-sm border border-[#E8DFD0] rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#FEF3C7] border border-[#FDE68A] flex items-center justify-center text-[#D97706] shadow-2xs">
                  <Palmtree className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-[#161B26] uppercase tracking-wider">
                    Ringkasan Kuota Cuti Tahunan
                  </h3>
                  <p className="text-[11px] text-[#8C7E6A]">Tahun Periode 2026</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  HapticFeedback.tick();
                  loadData();
                }}
                disabled={isLoading}
                className="p-1.5 text-[#8C7E6A] hover:text-[#161B26] hover:bg-[#FAF8F5] rounded-xl border border-transparent hover:border-[#E8DFD0] transition-all cursor-pointer"
                title="Refresh Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#E8DFD0] text-center">
                <span className="text-[10px] text-[#8C7E6A] font-semibold block uppercase tracking-wider">Total Kuota</span>
                <span className="text-base font-extrabold text-[#161B26] font-mono mt-0.5 block">
                  {balance ? balance.annual_leave_quota : 12}{' '}
                  <span className="text-[10px] font-normal text-[#8C7E6A]">Hari</span>
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#E8DFD0] text-center">
                <span className="text-[10px] text-[#8C7E6A] font-semibold block uppercase tracking-wider">Terpakai</span>
                <span className="text-base font-extrabold text-[#161B26] font-mono mt-0.5 block">
                  {balance ? balance.annual_leave_used : 0}{' '}
                  <span className="text-[10px] font-normal text-[#8C7E6A]">Hari</span>
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-center">
                <span className="text-[10px] text-emerald-700 font-bold block uppercase tracking-wider">Sisa Cuti</span>
                <span className="text-base font-extrabold text-emerald-800 font-mono mt-0.5 block">
                  {balance ? balance.annual_leave_remaining : 12}{' '}
                  <span className="text-[10px] font-normal text-emerald-700">Hari</span>
                </span>
              </div>
            </div>

            {/* Action Toggle Button */}
            <div className="pt-3 border-t border-[#E8DFD0] flex items-center justify-between">
              <span className="text-[11px] text-[#8C7E6A]">Perlu izin tidak hadir atau koreksi absen?</span>
              <button
                type="button"
                onClick={() => {
                  HapticFeedback.tap();
                  setIsFormOpen(!isFormOpen);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isFormOpen
                    ? 'bg-[#FAF8F5] border border-[#E8DFD0] text-[#161B26] hover:bg-[#F2ECE1]'
                    : 'bg-[#161B26] text-white hover:bg-[#232B3E] shadow-2xs active:scale-95'
                }`}
              >
                {isFormOpen ? (
                  <>
                    <X className="w-3.5 h-3.5" />
                    <span>Tutup Form</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajukan Izin / Cuti</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 3. New Leave Application Form */}
          {isFormOpen && (
            <form
              onSubmit={handleSubmit}
              className="bg-white/95 backdrop-blur-sm border border-[#E8DFD0] rounded-3xl p-5 shadow-sm space-y-4 animate-in fade-in duration-200"
            >
              <div className="border-b border-[#E8DFD0] pb-3">
                <h4 className="text-sm font-extrabold text-[#161B26]">Formulir Pengajuan Izin & Cuti</h4>
                <p className="text-[11px] text-[#8C7E6A] mt-0.5">
                  Lengkapi jenis izin, tanggal pelaksanaan, alasan, serta dokumen pendukung jika diperlukan.
                </p>
              </div>

              {/* Type Selector (Pill grid) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#161B26] block">Jenis Permohonan</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { type: 'ANNUAL' as LeaveType, label: 'Cuti Tahunan', icon: Palmtree, hint: 'Potong kuota' },
                    { type: 'SICK' as LeaveType, label: 'Izin Sakit', icon: Stethoscope, hint: 'Surat dokter' },
                    { type: 'PERSONAL' as LeaveType, label: 'Izin Pribadi', icon: UserCheck, hint: 'Keperluan penting' },
                    { type: 'DUTY' as LeaveType, label: 'Izin Dinas', icon: Briefcase, hint: 'Tugas luar/kantor' },
                    { type: 'CORRECTION' as LeaveType, label: 'Koreksi Absen', icon: Clock, hint: 'Lupa clock in/out' },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = leaveType === item.type;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => {
                          HapticFeedback.tick();
                          setLeaveType(item.type);
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? 'border-[#161B26] bg-[#161B26] text-white shadow-sm'
                            : 'border-[#E8DFD0] bg-[#FAF8F5] hover:bg-white text-[#161B26]'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5 mb-1">
                          <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#FDE68A]' : 'text-[#D97706]'}`} />
                          <span className="text-xs font-bold">{item.label}</span>
                        </div>
                        <span className={`text-[10px] ${isSelected ? 'text-amber-200/80' : 'text-[#8C7E6A]'}`}>
                          {item.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date Range Selection */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-[#161B26] block mb-1">Tanggal Mulai</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E8DFD0] bg-[#FAF8F5] text-[#161B26] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#161B26] block mb-1">Tanggal Selesai</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E8DFD0] bg-[#FAF8F5] text-[#161B26] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* Duration Summary Pill */}
              <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200/60 flex items-center justify-between text-xs">
                <span className="text-[#92400E] font-medium text-[11px]">Durasi Permohonan:</span>
                <span className="font-bold text-[#92400E]">
                  {requestedWorkingDays} Hari Kerja{' '}
                  {leaveType === 'ANNUAL' && balance && (
                    <span className="text-[11px] font-normal text-[#92400E]/80">
                      (Sisa setelahnya: {balance.annual_leave_remaining - requestedWorkingDays} hari)
                    </span>
                  )}
                </span>
              </div>

              {/* Reason TextArea */}
              <div>
                <label className="text-[11px] font-bold text-[#161B26] block mb-1">
                  Alasan Permohonan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    leaveType === 'SICK'
                      ? 'Contoh: Sakit demam tinggi, rawat jalan per diagnosa dokter...'
                      : leaveType === 'CORRECTION'
                      ? 'Contoh: Lupa clock out karena langsung bergegas ke meeting client...'
                      : leaveType === 'DUTY'
                      ? 'Contoh: Kunjungan presentasi on-site ke kantor client di Sudirman...'
                      : 'Jelaskan keperluan dan detail permohonan izin/cuti...'
                  }
                  className="w-full px-3 py-2.5 text-xs rounded-2xl border border-[#E8DFD0] bg-[#FAF8F5] text-[#161B26] placeholder:text-[#8C7E6A]/60 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Document / Doctor Certificate Upload */}
              <div>
                <label className="text-[11px] font-bold text-[#161B26] flex items-center justify-between mb-1">
                  <span>
                    Lampiran / Surat Dokter{' '}
                    {leaveType === 'SICK' ? (
                  <span className="text-rose-600 font-medium">(Disarankan untuk izin sakit)</span>
                ) : (
                  <span className="text-[#8C7E6A] font-normal">(Opsional)</span>
                )}
                  </span>
                </label>

                <div className="relative border border-dashed border-[#D3CDBC] rounded-2xl p-4 hover:bg-[#FAF8F5] transition-colors text-center">
                  {attachmentFile ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-left truncate">
                        <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div className="truncate">
                          <p className="text-xs font-semibold text-[#161B26] truncate">{attachmentFile.name}</p>
                          <p className="text-[10px] text-[#8C7E6A] font-mono">
                            {Math.round(attachmentFile.size / 1024)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttachmentFile(null)}
                        className="p-1.5 text-[#8C7E6A] hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <Upload className="w-5 h-5 text-[#8C7E6A] mx-auto mb-1" />
                      <span className="text-xs font-semibold text-[#161B26] block">
                        Unggah Surat Dokter atau Bukti Dokumen
                      </span>
                      <span className="block text-[10px] text-[#8C7E6A] mt-0.5">
                        Mendukung Gambar (JPG, PNG) atau PDF (Maks. 10MB)
                      </span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setAttachmentFile(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-[#E8DFD0]">
                <button
                  type="button"
                  onClick={() => {
                    HapticFeedback.tick();
                    setIsFormOpen(false);
                    setErrorMsg(null);
                  }}
                  className="px-4 py-2 rounded-2xl border border-[#E8DFD0] text-xs font-bold text-[#5C6479] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-2xl bg-[#161B26] hover:bg-[#232B3E] text-white text-xs font-bold shadow-2xs flex items-center space-x-1.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengirim...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#FDE68A]" />
                      <span>Kirim Permohonan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* 4. History of Leave Applications */}
          <div className="bg-white/90 backdrop-blur-sm border border-[#E8DFD0] rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h4 className="text-xs font-extrabold text-[#161B26] tracking-tight">Riwayat Pengajuan Izin & Cuti</h4>
                <p className="text-[11px] text-[#8C7E6A]">
                  Daftar status verifikasi permohonan izin kerja Anda oleh manajer
                </p>
              </div>

              {/* Filter pills */}
              <div className="flex items-center space-x-1 text-[10px] font-semibold">
                {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      HapticFeedback.tick();
                      setStatusFilter(st);
                    }}
                    className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                      statusFilter === st
                        ? 'bg-[#161B26] text-white shadow-2xs'
                        : 'bg-[#FAF8F5] border border-[#E8DFD0] text-[#5C6479] hover:bg-white'
                    }`}
                  >
                    {st === 'ALL'
                      ? 'Semua'
                      : st === 'PENDING'
                      ? 'Menunggu'
                      : st === 'APPROVED'
                      ? 'Disetujui'
                      : 'Ditolak'}
                  </button>
                ))}
              </div>
            </div>

            {/* Requests List */}
            {isLoading ? (
              <div className="text-center py-8 text-[#8C7E6A] text-xs">
                <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-[#8C7E6A]" />
                <span>Memuat riwayat pengajuan...</span>
              </div>
            ) : filteredLeaves.length === 0 ? (
              <div className="text-center py-8 text-[#8C7E6A] text-xs bg-[#FAF8F5] border border-dashed border-[#E8DFD0] rounded-2xl">
                Tidak ada data permohonan izin / cuti pada filter ini.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLeaves.map((req) => {
                  const badge = getLeaveTypeBadge(req.type);
                  const BadgeIcon = badge.icon;
                  const startFmt = new Date(req.start_date).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });
                  const endFmt = new Date(req.end_date).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });

                  return (
                    <div
                      key={req.id}
                      className="p-4 bg-[#FAF8F5] border border-[#E8DFD0] rounded-2xl space-y-2.5 transition-all hover:bg-white hover:shadow-2xs"
                    >
                      {/* Top Bar: Type & Status */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badge.badgeClass}`}
                          >
                            <BadgeIcon className="w-3 h-3" />
                            <span>{badge.label}</span>
                          </span>
                          <span className="text-[11px] font-semibold text-[#161B26]">
                            {startFmt} {startFmt !== endFmt ? `– ${endFmt}` : ''}
                          </span>
                        </div>

                        {/* Status badge */}
                        {req.status === 'PENDING' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            <span>Menunggu Review</span>
                          </span>
                        ) : req.status === 'APPROVED' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Disetujui</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                            <XCircle className="w-3 h-3" />
                            <span>Ditolak</span>
                          </span>
                        )}
                      </div>

                      {/* Reason quote */}
                      <div className="text-xs text-[#161B26] bg-white p-3 rounded-xl border border-[#E8DFD0]">
                        &ldquo;{req.reason}&rdquo;
                      </div>

                      {/* Rejection reason if any */}
                      {req.rejection_reason && (
                        <div className="p-2.5 rounded-xl bg-rose-50/80 border border-rose-200 text-[11px] text-rose-800 flex items-start gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600 mt-0.5" />
                          <div>
                            <span className="font-bold">Catatan Penolakan Manajer:</span>{' '}
                            <span>{req.rejection_reason}</span>
                          </div>
                        </div>
                      )}

                      {/* Footer: Attachment link & timestamp */}
                      <div className="flex items-center justify-between text-[10px] text-[#8C7E6A] pt-1">
                        <span>
                          Diajukan:{' '}
                          {new Date(req.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>

                        {req.attachment_url && (
                          <button
                            type="button"
                            onClick={() => {
                              HapticFeedback.tap();
                              setPreviewAttachment({
                                url: resolveMediaUrl(req.attachment_url),
                                title: `Lampiran ${badge.label} - ${startFmt}`,
                              });
                            }}
                            className="inline-flex items-center gap-1 font-semibold text-[#161B26] hover:text-[#D97706] bg-white px-2.5 py-1 rounded-xl border border-[#E8DFD0] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                          >
                            <Paperclip className="w-3 h-3 text-[#D97706]" />
                            <span>Lihat Dokumen / Surat Dokter</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBVIEW 2: LEMBUR MANDIRI (SPL) */}
      {activeSubTab === 'overtimes' && (
        <div className="space-y-4">
          {/* Overtime Metric & Action Header */}
          <div className="bg-white/85 backdrop-blur-sm border border-[#E8DFD0] rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#FEF3C7] border border-[#FDE68A] flex items-center justify-center text-[#D97706] shadow-2xs">
                  <Clock3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-[#161B26] uppercase tracking-wider">
                    Surat Perintah Lembur (SPL)
                  </h3>
                  <p className="text-[11px] text-[#8C7E6A]">Pengajuan lembur mandiri & persetujuan manajemen</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  HapticFeedback.tick();
                  loadOvertimes();
                }}
                disabled={isOvertimeLoading}
                className="p-1.5 text-[#8C7E6A] hover:text-[#161B26] hover:bg-[#FAF8F5] rounded-xl border border-transparent hover:border-[#E8DFD0] transition-all cursor-pointer"
                title="Refresh Lembur"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isOvertimeLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#E8DFD0] text-center">
                <span className="text-[10px] text-[#8C7E6A] font-semibold block uppercase tracking-wider">Total SPL Diajukan</span>
                <span className="text-base font-extrabold text-[#161B26] font-mono mt-0.5 block">
                  {overtimes.length} <span className="text-[10px] font-normal text-[#8C7E6A]">Pengajuan</span>
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-center">
                <span className="text-[10px] text-amber-800 font-bold block uppercase tracking-wider">Jam Lembur Disetujui</span>
                <span className="text-base font-extrabold text-amber-900 font-mono mt-0.5 block">
                  +{totalApprovedOvertimeHours}{' '}
                  <span className="text-[10px] font-normal text-amber-700">Jam</span>
                </span>
              </div>
            </div>

            {/* Action Toggle Button */}
            <div className="pt-3 border-t border-[#E8DFD0] flex items-center justify-between">
              <span className="text-[11px] text-[#8C7E6A]">Ada penugasan lembur di luar jam kerja?</span>
              <button
                type="button"
                onClick={() => {
                  HapticFeedback.tap();
                  setIsOvertimeFormOpen(!isOvertimeFormOpen);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isOvertimeFormOpen
                    ? 'bg-[#FAF8F5] border border-[#E8DFD0] text-[#161B26] hover:bg-[#F2ECE1]'
                    : 'bg-[#161B26] text-white hover:bg-[#232B3E] shadow-2xs active:scale-95'
                }`}
              >
                {isOvertimeFormOpen ? (
                  <>
                    <X className="w-3.5 h-3.5" />
                    <span>Tutup Form</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajukan Lembur (SPL)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Overtime Form */}
          {isOvertimeFormOpen && (
            <form
              onSubmit={handleOvertimeSubmit}
              className="bg-white/95 backdrop-blur-sm border border-[#E8DFD0] rounded-3xl p-5 shadow-sm space-y-4 animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between border-b border-[#E8DFD0] pb-3">
                <h4 className="text-sm font-extrabold text-[#161B26] flex items-center gap-1.5">
                  <Clock3 className="w-4 h-4 text-[#D97706]" />
                  <span>Formulir Pengajuan Surat Perintah Lembur</span>
                </h4>
                <span className="text-[10px] text-[#8C7E6A] font-mono">Wajib diisi lengkap</span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#161B26] block mb-1">Tanggal Lembur</label>
                <input
                  type="date"
                  required
                  value={otDate}
                  onChange={(e) => setOtDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E8DFD0] bg-[#FAF8F5] text-[#161B26] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[#161B26] block mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    required
                    value={otStartTime}
                    onChange={(e) => setOtStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E8DFD0] bg-[#FAF8F5] text-[#161B26] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#161B26] block mb-1">Jam Selesai</label>
                  <input
                    type="time"
                    required
                    value={otEndTime}
                    onChange={(e) => setOtEndTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E8DFD0] bg-[#FAF8F5] text-[#161B26] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* Duration Preview */}
              <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200/60 flex items-center justify-between text-xs">
                <span className="text-[#92400E] font-medium text-[11px]">Estimasi Total Jam Lembur:</span>
                <span className="font-extrabold text-[#92400E] font-mono">+{otDuration} Jam</span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#161B26] block mb-1">
                  Uraian Tugas / Alasan Lembur <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={otReason}
                  onChange={(e) => setOtReason(e.target.value)}
                  placeholder="Contoh: Menyelesaikan pengepakan dan quality check pesanan seragam gelombang 2..."
                  className="w-full px-3 py-2.5 text-xs rounded-2xl border border-[#E8DFD0] bg-[#FAF8F5] text-[#161B26] placeholder:text-[#8C7E6A]/60 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E8DFD0]">
                <button
                  type="button"
                  onClick={() => {
                    HapticFeedback.tick();
                    setIsOvertimeFormOpen(false);
                  }}
                  className="px-4 py-2 rounded-2xl border border-[#E8DFD0] text-xs font-bold text-[#5C6479] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-2xl bg-[#161B26] hover:bg-[#232B3E] text-white text-xs font-bold shadow-2xs flex items-center space-x-1.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Mengirim...' : 'Kirim Pengajuan SPL'}
                </button>
              </div>
            </form>
          )}

          {/* Overtime History List */}
          <div className="bg-white/90 backdrop-blur-sm border border-[#E8DFD0] rounded-3xl p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-extrabold text-[#161B26] uppercase tracking-wider">
              Riwayat Pengajuan Lembur
            </h4>

            {isOvertimeLoading ? (
              <div className="text-center py-8 text-[#8C7E6A] text-xs">
                <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-[#8C7E6A]" />
                <span>Memuat riwayat lembur...</span>
              </div>
            ) : overtimes.length === 0 ? (
              <div className="text-center py-8 text-[#8C7E6A] text-xs bg-[#FAF8F5] border border-dashed border-[#E8DFD0] rounded-2xl">
                Belum ada pengajuan lembur yang tercatat.
              </div>
            ) : (
              <div className="space-y-3">
                {overtimes.map((ot) => {
                  const dateFmt = new Date(ot.date).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });

                  return (
                    <div
                      key={ot.id}
                      className="p-4 bg-[#FAF8F5] border border-[#E8DFD0] rounded-2xl space-y-2 text-xs transition-all hover:bg-white hover:shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-[#161B26]">{dateFmt}</span>
                          <span className="font-mono text-[11px] font-bold bg-[#FEF3C7] text-[#D97706] px-2 py-0.5 rounded-md border border-[#FDE68A]">
                            {ot.start_time} - {ot.end_time} (+{ot.duration_hours}h)
                          </span>
                        </div>

                        {ot.status === 'APPROVED' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Disetujui
                          </span>
                        ) : ot.status === 'REJECTED' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            Ditolak
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Menunggu HRD
                          </span>
                        )}
                      </div>

                      <p className="text-[#161B26] text-xs italic bg-white p-3 rounded-xl border border-[#E8DFD0]">
                        &quot;{ot.reason}&quot;
                      </p>

                      {ot.approval_note && (
                        <p className="text-[11px] text-[#8C7E6A] px-1">
                          Catatan: <strong className="text-[#161B26]">{ot.approval_note}</strong>
                        </p>
                      )}

                      {ot.status === 'PENDING' && (
                        <div className="pt-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              HapticFeedback.warning();
                              handleCancelOvertime(ot.id);
                            }}
                            className="text-[11px] text-rose-600 hover:text-rose-800 font-bold hover:underline cursor-pointer"
                          >
                            Batalkan Pengajuan
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Attachment Preview Modal */}
      {previewAttachment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#FAF7F2] rounded-3xl max-w-lg w-full border border-[#E8DFD0] shadow-2xl overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DFD0]">
              <div className="flex items-center space-x-2">
                <Paperclip className="w-4 h-4 text-[#D97706]" />
                <h4 className="text-xs font-extrabold text-[#161B26]">{previewAttachment.title}</h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="p-1.5 rounded-full text-[#8C7E6A] hover:text-[#161B26] hover:bg-slate-200/50 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto rounded-2xl bg-white p-3 border border-[#E8DFD0] flex items-center justify-center">
              {previewAttachment.url.endsWith('.pdf') ? (
                <div className="p-8 text-center space-y-3">
                  <FileText className="w-12 h-12 text-rose-500 mx-auto" />
                  <p className="text-xs text-slate-700 font-medium">Dokumen PDF Terlampir</p>
                  <a
                    href={previewAttachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#161B26] text-white text-xs font-bold hover:bg-[#232B3E] transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka / Unduh PDF</span>
                  </a>
                </div>
              ) : (
                <img
                  src={previewAttachment.url}
                  alt={previewAttachment.title}
                  className="max-h-[55vh] max-w-full rounded-xl object-contain border border-[#E8DFD0]"
                />
              )}
            </div>

            <div className="pt-1 flex items-center justify-between">
              <a
                href={previewAttachment.url}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-amber-700 hover:text-amber-900 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Buka di Tab Baru</span>
              </a>
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="px-4 py-2 bg-[#161B26] hover:bg-[#232B3E] text-white rounded-2xl text-xs font-bold transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
