'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PayrollSummaryData, AttendanceMatrixData, PayrollRow } from '../../types';
import { ApiClient } from '../../lib/api';
import {
  FileSpreadsheet,
  Download,
  RefreshCw,
  CalendarDays,
  TableProperties,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building,
  Info,
  ShieldCheck,
  Check,
  Copy,
  MessageCircle,
  X,
  CreditCard,
  Printer,
  ChevronRight,
  TrendingUp,
  UserX,
  Sparkles
} from 'lucide-react';

interface PayrollTableProps {
  data: PayrollSummaryData | null;
  year: number;
  month: number;
  isLoading: boolean;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  onRefresh: () => void;
}

export function PayrollTable({
  data,
  year,
  month,
  isLoading,
  onYearChange,
  onMonthChange,
  onRefresh,
}: PayrollTableProps) {
  const [activeSubView, setActiveSubView] = useState<'matrix' | 'payroll'>('matrix');
  const [matrixData, setMatrixData] = useState<AttendanceMatrixData | null>(null);
  const [isMatrixLoading, setIsMatrixLoading] = useState<boolean>(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Selected employee for breakdown slip modal
  const [selectedEmployeeSlip, setSelectedEmployeeSlip] = useState<PayrollRow | null>(null);
  const [copiedSlip, setCopiedSlip] = useState(false);

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  // Load Matrix Data whenever year, month, or department changes
  const loadMatrix = useCallback(async () => {
    try {
      setIsMatrixLoading(true);
      const res = await ApiClient.getAttendanceMatrixData(
        year,
        month,
        selectedDepartment === 'all' ? undefined : selectedDepartment
      );
      setMatrixData(res);
    } catch (err) {
      console.error('Failed to load attendance matrix:', err);
    } finally {
      setIsMatrixLoading(false);
    }
  }, [year, month, selectedDepartment]);

  useEffect(() => {
    if (activeSubView === 'matrix') {
      loadMatrix();
    }
  }, [activeSubView, loadMatrix]);

  // Unique departments for filter
  const departments = useMemo(() => {
    const depts = new Set<string>();
    if (matrixData?.rows) {
      matrixData.rows.forEach((r) => {
        if (r.department) depts.add(r.department);
      });
    }
    if (data?.summary) {
      data.summary.forEach((r) => {
        if (r.department) depts.add(r.department);
      });
    }
    return Array.from(depts);
  }, [matrixData, data]);

  // Filtered rows for Matrix
  const filteredMatrixRows = useMemo(() => {
    if (!matrixData || !matrixData.rows) return [];
    return matrixData.rows.filter((row) => {
      const matchDept = selectedDepartment === 'all' || row.department === selectedDepartment;
      const matchSearch =
        searchFilter === '' ||
        row.full_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        row.employee_id_number?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (row.nickname && row.nickname.toLowerCase().includes(searchFilter.toLowerCase()));
      return matchDept && matchSearch;
    });
  }, [matrixData, selectedDepartment, searchFilter]);

  // Filtered rows for Payroll Summary
  const filteredPayrollRows = useMemo(() => {
    if (!data || !data.summary) return [];
    return data.summary.filter((row) => {
      const matchDept = selectedDepartment === 'all' || row.department === selectedDepartment;
      const matchSearch =
        searchFilter === '' ||
        row.full_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        row.employee_id_number?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        row.email.toLowerCase().includes(searchFilter.toLowerCase());
      return matchDept && matchSearch;
    });
  }, [data, selectedDepartment, searchFilter]);

  const handleExportPayroll = (format: 'csv' | 'xlsx') => {
    const url = ApiClient.getExportPayrollUrl(year, month, format);
    window.open(url, '_blank');
  };

  const handleExportMatrix = () => {
    const url = ApiClient.getExportAttendanceMatrixUrl(
      year,
      month,
      selectedDepartment === 'all' ? undefined : selectedDepartment
    );
    window.open(url, '_blank');
  };

  // Generate Bank Batch Transfer CSV (UOB / BCA Format)
  const handleExportBankTransfer = () => {
    if (!data || !data.summary) return;
    const headers = [
      'Nomor Rekening',
      'Nama Pemilik Rekening',
      'Bank Penerima',
      'Email Karyawan',
      'Berita Transfer',
      'Keterangan Hadir'
    ];
    const rows = data.summary.map((emp) => [
      emp.bank_uob || emp.bank_other || '—',
      emp.full_name,
      emp.bank_uob ? 'Bank UOB' : (emp.bank_other ? 'Bank Lain' : 'Belum Terdaftar'),
      emp.email,
      `Payroll ${months[month - 1]} ${year}`,
      `${emp.total_days_present} hari hadir (${emp.total_late_instances}x telat)`
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers, ...rows].map((e) => e.map((val) => `"${val.replace(/"/g, '""')}"`).join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Batch_Transfer_Bank_PGE_${year}_${String(month).padStart(2, '0')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // WhatsApp Slip Sender
  const handleSendSlipWA = (emp: PayrollRow) => {
    const message = `*SLIP REKAPITULASI PRESENSI & PAYROLL PGE*\nPeriode: ${months[month - 1]} ${year}\n----------------------------------\nNama: ${emp.full_name}\nNIK: ${emp.employee_id_number || '—'}\nDivisi: ${emp.department} (${emp.position || 'Staff'})\nRekening Payroll: ${emp.bank_uob || emp.bank_other || 'Belum Terdaftar'}\n\n*RINGKASAN KEHADIRAN:*\n• Hari Kerja Wajib: ${emp.total_days_expected} Hari\n• Kehadiran Aktual: ${emp.total_days_present} Hari\n• Terlambat: ${emp.total_late_instances}x (${emp.total_late_minutes} Menit)\n• Jam Lembur: ${emp.total_overtime_hours} Jam\n• Cuti Sakit: ${emp.total_sick_leaves} Hari\n• Cuti Tahunan: ${emp.total_annual_leaves} Hari\n• Unpaid / Mangkir: ${emp.total_unpaid_leaves} Hari\n\n_Catatan: Harap segera konfirmasi ke tim HRD jika terdapat ketidaksesuaian rekapitulasi data._`;

    if (emp.phone) {
      let cleanPhone = emp.phone.replace(/[^0-9]/g, '');
      if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
      const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    } else {
      navigator.clipboard.writeText(message);
      setCopiedSlip(true);
      setTimeout(() => setCopiedSlip(false), 3000);
    }
  };

  // Render cell badge according to Indonesian HR attendance code
  const renderCellBadge = (cell?: { code: string; label: string; detail?: string }) => {
    if (!cell || !cell.code) {
      return <span className="text-stone-300 font-mono text-[10px]">—</span>;
    }

    switch (cell.code) {
      case 'H':
        return (
          <span
            title="Hadir Tepat Waktu"
            className="inline-block px-1 py-0.5 min-w-[20px] text-center rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300"
          >
            H
          </span>
        );
      case 'T':
        return (
          <span
            title={`Terlambat: ${cell.detail || ''}`}
            className="inline-block px-1 py-0.5 min-w-[20px] text-center rounded text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs"
          >
            T
          </span>
        );
      case 'S':
        return (
          <span
            title="Sakit (SKD)"
            className="inline-block px-1 py-0.5 min-w-[20px] text-center rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200"
          >
            S
          </span>
        );
      case 'I':
        return (
          <span
            title="Izin Pribadi"
            className="inline-block px-1 py-0.5 min-w-[20px] text-center rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200"
          >
            I
          </span>
        );
      case 'C':
        return (
          <span
            title="Cuti Tahunan"
            className="inline-block px-1 py-0.5 min-w-[20px] text-center rounded text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200"
          >
            C
          </span>
        );
      case 'A':
        return (
          <span
            title="Alpa / Tanpa Keterangan"
            className="inline-block px-1 py-0.5 min-w-[20px] text-center rounded text-[10px] font-black bg-rose-200 text-rose-900 border border-rose-400"
          >
            A
          </span>
        );
      case 'OFF':
        return (
          <span
            title="Libur Shift Roster"
            className="inline-block px-0.5 py-0.5 min-w-[20px] text-center rounded text-[9px] font-semibold bg-stone-200 text-stone-700"
          >
            OFF
          </span>
        );
      case 'LIBUR':
        return (
          <span
            title="Akhir Pekan"
            className="inline-block px-1 py-0.5 text-center text-[10px] text-stone-300 font-normal"
          >
            -
          </span>
        );
      case 'WFH':
        return (
          <span
            title="Bekerja Remote (WFH)"
            className="inline-block px-1 py-0.5 min-w-[20px] text-center rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200"
          >
            W
          </span>
        );
      default:
        return <span className="text-stone-400 font-mono text-[10px]">{cell.code}</span>;
    }
  };

  const readiness = data?.readiness;
  const totals = data?.totals;

  return (
    <div className="space-y-5 font-sans">
      {/* 1. Executive Toolbar & Period Selectors */}
      <div className="bg-white border border-[#E6DFD3] rounded-2xl p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Subview Tabs & Description */}
        <div className="space-y-1">
          <div className="inline-flex rounded-xl bg-stone-100 p-0.5 border border-[#E6DFD3]">
            <button
              onClick={() => setActiveSubView('matrix')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                activeSubView === 'matrix'
                  ? 'bg-white text-[#161B26] shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5 text-amber-700" />
              <span>Matriks Presensi 1–31</span>
            </button>

            <button
              onClick={() => setActiveSubView('payroll')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                activeSubView === 'payroll'
                  ? 'bg-white text-[#161B26] shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <TableProperties className="w-3.5 h-3.5 text-emerald-700" />
              <span>Rekapitulasi Akumulasi Payroll</span>
            </button>
          </div>
          <p className="text-[11px] text-stone-500 pt-0.5">
            {activeSubView === 'matrix'
              ? 'Format matriks presensi harian standar HRD siap cetak dengan kode H/T/S/I/C/A dan persentase.'
              : 'Rekapitulasi komparasi hari kerja wajib, potongan denda keterlambatan, lembur, dan rekening bank penggajian.'}
          </p>
        </div>

        {/* Right: Period controls, Export CTA, and Refresh */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Month Selector */}
          <select
            value={month}
            onChange={(e) => onMonthChange(parseInt(e.target.value, 10))}
            className="px-3 py-1.5 bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl text-xs text-[#161B26] font-bold focus:outline-hidden cursor-pointer shadow-2xs"
          >
            {months.map((m, idx) => (
              <option key={m} value={idx + 1}>
                {m}
              </option>
            ))}
          </select>

          {/* Year Selector */}
          <select
            value={year}
            onChange={(e) => onYearChange(parseInt(e.target.value, 10))}
            className="px-3 py-1.5 bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl text-xs text-[#161B26] font-bold focus:outline-hidden cursor-pointer shadow-2xs"
          >
            {[2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          {/* Export CTAs */}
          {activeSubView === 'matrix' ? (
            <button
              onClick={handleExportMatrix}
              title="Download Matriks Presensi Resmi PGE Multi-Sheet Excel"
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-all"
            >
              <Download className="w-3.5 h-3.5 text-emerald-100" />
              <span>Export Matriks Excel</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleExportPayroll('xlsx')}
                title="Download formatted Excel (.xlsx)"
                className="px-3 py-1.5 bg-[#161B26] hover:bg-[#232B3E] active:scale-95 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Excel (.xlsx)</span>
              </button>

              <button
                onClick={handleExportBankTransfer}
                title="Download Format Batch Transfer Bank (BCA / UOB)"
                className="px-3 py-1.5 bg-[#FAF8F5] hover:bg-stone-100 text-stone-800 rounded-xl text-xs font-bold border border-[#E6DFD3] flex items-center space-x-1.5 transition-all shadow-2xs"
              >
                <CreditCard className="w-3.5 h-3.5 text-amber-700" />
                <span>Format Bank CSV</span>
              </button>
            </div>
          )}

          <button
            onClick={() => {
              if (activeSubView === 'matrix') loadMatrix();
              onRefresh();
            }}
            title="Refresh Data"
            className="p-1.5 text-stone-500 hover:text-stone-900 bg-[#FAF8F5] hover:bg-stone-100 border border-[#E6DFD3] rounded-xl transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isMatrixLoading || isLoading ? 'animate-spin text-amber-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Payroll Readiness Gatekeeper Alert Banner */}
      {readiness && (
        <div
          className={`p-3.5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs ${
            readiness.is_ready
              ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
              : 'bg-amber-50/70 border-amber-300 text-amber-950'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                readiness.is_ready ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
              }`}
            >
              {readiness.is_ready ? <ShieldCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            </div>
            <div>
              <span className="font-extrabold block text-xs tracking-tight">
                {readiness.is_ready
                  ? 'Audit Pra-Payroll: SIAP TUTUP BUKU (Zero Error)'
                  : `Audit Pra-Payroll: Ditemukan ${readiness.total_anomalies} Anomali Sebelum Tutup Buku`}
              </span>
              <span className="text-[11px] text-stone-600">
                {readiness.is_ready
                  ? 'Seluruh absensi lengkap, tidak ada pengajuan izin menggantung atau presensi tanpa jam pulang.'
                  : 'Harap selesaikan anomali berikut agar perhitungan denda keterlambatan & lembur tidak keliru:'}
              </span>
            </div>
          </div>

          {!readiness.is_ready && (
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
              {readiness.missing_clock_outs > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-950 border border-amber-300">
                  ⚠️ {readiness.missing_clock_outs} Belum Clock-Out
                </span>
              )}
              {readiness.pending_leaves > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-200">
                  📋 {readiness.pending_leaves} Cuti/Izin Pending
                </span>
              )}
              {readiness.pending_overtimes > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 border border-blue-200">
                  ⏰ {readiness.pending_overtimes} Lembur Pending
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. Executive Payroll KPI Ribbon (4 Metric Cards) */}
      {totals && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Man-Days Hadir */}
          <div className="bg-white rounded-2xl border border-[#E6DFD3] p-4 shadow-xs space-y-1 hover:border-emerald-300 transition-colors">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Man-Days Hadir</span>
              <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-extrabold text-[#161B26]">
                {totals.total_man_days_present}
              </span>
              <span className="text-xs text-stone-400 font-bold">/ {totals.total_man_days_expected} hari</span>
            </div>
            <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full"
                style={{
                  width: `${Math.min(100, Math.round((totals.total_man_days_present / Math.max(1, totals.total_man_days_expected)) * 100))}%`,
                }}
              />
            </div>
          </div>

          {/* Card 2: Total Overtime Hours */}
          <div className="bg-white rounded-2xl border border-[#E6DFD3] p-4 shadow-xs space-y-1 hover:border-blue-300 transition-colors">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Lembur Terverifikasi</span>
              <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-extrabold text-blue-900 font-mono">
                {totals.total_overtime_hours}
              </span>
              <span className="text-xs text-stone-400 font-bold">jam total</span>
            </div>
            <p className="text-[10px] text-stone-500 font-medium">Berdasarkan SPL & Clock-Out</p>
          </div>

          {/* Card 3: Late Incidents & Minutes */}
          <div className="bg-white rounded-2xl border border-[#E6DFD3] p-4 shadow-xs space-y-1 hover:border-amber-300 transition-colors">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Akumulasi Terlambat</span>
              <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-extrabold text-amber-800">
                {totals.total_late_instances}x
              </span>
              <span className="text-xs text-stone-400 font-bold">({totals.total_late_minutes} menit)</span>
            </div>
            <p className="text-[10px] text-amber-900 font-medium">Dasar potongan disiplin</p>
          </div>

          {/* Card 4: Leaves Taken */}
          <div className="bg-white rounded-2xl border border-[#E6DFD3] p-4 shadow-xs space-y-1 hover:border-purple-300 transition-colors">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Cuti & Izin Resmi</span>
              <div className="w-6 h-6 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                <FileSpreadsheet className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-extrabold text-purple-900">
                {totals.total_leaves_taken}
              </span>
              <span className="text-xs text-stone-400 font-bold">hari total</span>
            </div>
            <p className="text-[10px] text-stone-500 font-medium">Sakit, tahunan, & dinas</p>
          </div>
        </div>
      )}

      {/* 4. Filter Bar: Quick Division Chips & Employee Search */}
      <div className="bg-white border border-[#E6DFD3] p-3.5 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Quick Chips */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedDepartment('all')}
            className={`px-3 py-1 rounded-full font-bold transition-all whitespace-nowrap text-xs ${
              selectedDepartment === 'all'
                ? 'bg-[#161B26] text-white shadow-2xs'
                : 'bg-[#FAF8F5] border border-[#E6DFD3] text-stone-600 hover:bg-stone-100'
            }`}
          >
            Semua Divisi ({data?.summary.length || 0})
          </button>
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDepartment(dept)}
              className={`px-3 py-1 rounded-full font-bold transition-all whitespace-nowrap text-xs ${
                selectedDepartment === dept
                  ? 'bg-[#161B26] text-white shadow-2xs'
                  : 'bg-[#FAF8F5] border border-[#E6DFD3] text-stone-600 hover:bg-stone-100'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari NIK atau Nama..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl text-xs text-[#161B26] placeholder-stone-400 focus:outline-hidden focus:border-stone-800 shadow-2xs"
          />
        </div>
      </div>

      {/* 5. SUBVIEW 1: ATTENDANCE MATRIX TABLE (1–31) */}
      {activeSubView === 'matrix' && (
        <div className="bg-white rounded-2xl border border-[#E6DFD3] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <div>
              <h3 className="font-extrabold text-sm text-[#161B26] tracking-tight">
                Grid Matriks Presensi 1–31 (Resmi PGE)
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Klik baris karyawan untuk membuka slip rincian payroll dan potongan kehadiran
              </p>
            </div>
            <div className="text-[11px] text-stone-500 font-bold bg-[#FAF8F5] px-2.5 py-1 rounded-lg border border-[#E6DFD3]">
              Target: <strong>{matrixData?.period.expected_working_days || 22} Hari Kerja</strong>
            </div>
          </div>

          {/* Matrix Grid Table */}
          <div className="overflow-x-auto rounded-xl border border-[#E6DFD3] max-h-[580px] relative shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#FAF8F5] text-stone-700 font-extrabold sticky top-0 z-20 border-b border-[#E6DFD3]">
                <tr>
                  <th className="py-2.5 px-3 sticky left-0 z-30 bg-[#FAF8F5] border-r border-[#E6DFD3] min-w-[40px] text-center">
                    No
                  </th>
                  <th className="py-2.5 px-3 sticky left-[40px] z-30 bg-[#FAF8F5] border-r border-[#E6DFD3] min-w-[80px]">
                    NIK
                  </th>
                  <th className="py-2.5 px-3 sticky left-[120px] z-30 bg-[#FAF8F5] border-r border-[#E6DFD3] min-w-[200px]">
                    Nama Karyawan
                  </th>
                  <th className="py-2.5 px-3 border-r border-[#E6DFD3] min-w-[130px]">
                    Divisi
                  </th>

                  {/* Day Columns 1..N */}
                  {matrixData?.days.map((d) => (
                    <th
                      key={d.dayNumber}
                      className={`py-1 px-1 text-center border-r border-stone-200 min-w-[32px] ${
                        d.isWeekend ? 'bg-stone-200/60 text-rose-600' : 'bg-[#FAF8F5]'
                      }`}
                    >
                      <div className="text-[11px] font-extrabold">{d.dayNumber}</div>
                      <div className="text-[8px] font-normal text-stone-400">{d.dayName}</div>
                    </th>
                  ))}

                  {/* Summary Columns */}
                  <th className="py-2.5 px-2 text-center border-r border-[#E6DFD3] bg-emerald-50 text-emerald-900 min-w-[36px]" title="Total Hadir (H)">
                    H
                  </th>
                  <th className="py-2.5 px-2 text-center border-r border-[#E6DFD3] bg-amber-50 text-amber-900 min-w-[36px]" title="Total Terlambat (T)">
                    T
                  </th>
                  <th className="py-2.5 px-2 text-center border-r border-[#E6DFD3] bg-purple-50 text-purple-900 min-w-[36px]" title="Total Sakit (S)">
                    S
                  </th>
                  <th className="py-2.5 px-2 text-center border-r border-[#E6DFD3] bg-sky-50 text-sky-900 min-w-[36px]" title="Total Izin (I)">
                    I
                  </th>
                  <th className="py-2.5 px-2 text-center border-r border-[#E6DFD3] bg-teal-50 text-teal-900 min-w-[36px]" title="Total Cuti (C)">
                    C
                  </th>
                  <th className="py-2.5 px-2 text-center border-r border-[#E6DFD3] bg-rose-50 text-rose-900 min-w-[36px]" title="Total Alpa (A)">
                    A
                  </th>
                  <th className="py-2.5 px-2 text-center border-r border-[#E6DFD3] bg-stone-100 min-w-[48px]" title="Total Jam Kerja">
                    Jam
                  </th>
                  <th className="py-2.5 px-2 text-center bg-[#161B26] text-white min-w-[48px]" title="Persentase Kehadiran">
                    %
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-stone-100 font-sans">
                {isMatrixLoading ? (
                  <tr>
                    <td colSpan={(matrixData?.days.length || 31) + 12} className="py-14 text-center text-stone-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />
                      <span>Menyiapkan Matriks Presensi 1–31 Periode {months[month - 1]} {year}...</span>
                    </td>
                  </tr>
                ) : filteredMatrixRows.length === 0 ? (
                  <tr>
                    <td colSpan={(matrixData?.days.length || 31) + 12} className="py-10 text-center text-stone-400">
                      Tidak ada data karyawan yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredMatrixRows.map((row, idx) => {
                    const payrollRow = data?.summary.find((p) => p.employee_id === row.employee_id);

                    return (
                      <tr
                        key={row.employee_id}
                        onClick={() => payrollRow && setSelectedEmployeeSlip(payrollRow)}
                        className="hover:bg-amber-50/30 transition-colors group cursor-pointer"
                      >
                        {/* No */}
                        <td className="py-1.5 px-3 sticky left-0 z-10 bg-white group-hover:bg-[#FAF8F5] border-r border-[#E6DFD3] text-center text-stone-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>

                        {/* NIK */}
                        <td className="py-1.5 px-3 sticky left-[40px] z-10 bg-white group-hover:bg-[#FAF8F5] border-r border-[#E6DFD3] font-mono text-[11px] text-stone-700 whitespace-nowrap">
                          {row.employee_id_number}
                        </td>

                        {/* Nama Lengkap */}
                        <td className="py-1.5 px-3 sticky left-[120px] z-10 bg-white group-hover:bg-[#FAF8F5] border-r border-[#E6DFD3] whitespace-nowrap">
                          <div className="font-extrabold text-[#161B26] text-xs flex items-center space-x-1.5">
                            <span>{row.full_name}</span>
                            <ChevronRight className="w-3 h-3 text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="text-[10px] text-stone-400">{row.position}</div>
                        </td>

                        {/* Departemen & Shift */}
                        <td className="py-1.5 px-3 border-r border-[#E6DFD3] whitespace-nowrap text-stone-600 text-[11px]">
                          <span className="font-bold text-[#161B26]">{row.department}</span>
                          <span className="text-[10px] text-stone-400 block truncate max-w-[120px]">{row.shift_name}</span>
                        </td>

                        {/* Day Cells 1..N */}
                        {matrixData?.days.map((d) => (
                          <td
                            key={d.dayNumber}
                            className={`py-1 px-0.5 text-center border-r border-stone-100 ${
                              d.isWeekend ? 'bg-stone-50' : ''
                            }`}
                          >
                            {renderCellBadge(row.days[d.dayNumber])}
                          </td>
                        ))}

                        {/* Summaries */}
                        <td className="py-1.5 px-1 text-center font-bold text-emerald-800 bg-emerald-50/40 border-r border-[#E6DFD3] font-mono">
                          {row.summary.present_count}
                        </td>
                        <td className="py-1.5 px-1 text-center font-bold text-amber-800 bg-amber-50/40 border-r border-[#E6DFD3] font-mono">
                          {row.summary.late_count > 0 ? (
                            <span title={`${row.summary.late_minutes} menit`}>{row.summary.late_count}</span>
                          ) : (
                            <span className="text-stone-300 font-normal">0</span>
                          )}
                        </td>
                        <td className="py-1.5 px-1 text-center font-medium text-purple-800 bg-purple-50/40 border-r border-[#E6DFD3] font-mono">
                          {row.summary.sick_count > 0 ? row.summary.sick_count : <span className="text-stone-300">0</span>}
                        </td>
                        <td className="py-1.5 px-1 text-center font-medium text-sky-800 bg-sky-50/40 border-r border-[#E6DFD3] font-mono">
                          {row.summary.izin_count > 0 ? row.summary.izin_count : <span className="text-stone-300">0</span>}
                        </td>
                        <td className="py-1.5 px-1 text-center font-medium text-teal-800 bg-teal-50/40 border-r border-[#E6DFD3] font-mono">
                          {row.summary.cuti_count > 0 ? row.summary.cuti_count : <span className="text-stone-300">0</span>}
                        </td>
                        <td className="py-1.5 px-1 text-center font-bold text-rose-800 bg-rose-50/40 border-r border-[#E6DFD3] font-mono">
                          {row.summary.alpa_count > 0 ? row.summary.alpa_count : <span className="text-stone-300 font-normal">0</span>}
                        </td>
                        <td className="py-1.5 px-1 text-center font-mono text-stone-700 border-r border-[#E6DFD3] text-[11px]">
                          {row.summary.total_work_hours}h
                        </td>
                        <td className="py-1.5 px-1 text-center font-bold font-mono text-[11px] bg-stone-50 text-[#161B26]">
                          {row.summary.attendance_percentage}%
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Legend and Official Notes */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#FAF8F5] rounded-xl border border-[#E6DFD3] text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold text-stone-700 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-amber-700" />
                Legenda Kode Presensi:
              </span>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  H
                </span>
                <span className="text-stone-600">Hadir Tepat Waktu</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  T
                </span>
                <span className="text-stone-600">Terlambat</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                  S
                </span>
                <span className="text-stone-600">Sakit (SKD)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                  I
                </span>
                <span className="text-stone-600">Izin</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                  C
                </span>
                <span className="text-stone-600">Cuti Tahunan</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-200 text-rose-900 border border-rose-400">
                  A
                </span>
                <span className="text-stone-600">Alpa</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-stone-200 text-stone-700">
                  OFF
                </span>
                <span className="text-stone-600">Off Shift</span>
              </div>
            </div>

            <div className="text-[11px] text-stone-500 italic">
              *Matriks resmi diekspor langsung dalam format spreadsheet resmi PT dengan kolom tanda tangan Direktur & HRD.
            </div>
          </div>
        </div>
      )}

      {/* 6. SUBVIEW 2: ACCUMULATED PAYROLL SUMMARY TABLE */}
      {activeSubView === 'payroll' && (
        <div className="bg-white rounded-2xl border border-[#E6DFD3] p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-stone-100">
            <div>
              <h3 className="font-extrabold text-sm text-[#161B26] tracking-tight">
                Rekapitulasi Akumulasi Payroll & Kompensasi Kehadiran
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Perhitungan jam lembur, potongan keterlambatan, hak cuti, dan verifikasi rekening payroll
              </p>
            </div>
            <div className="text-xs text-stone-600 font-medium">
              Menampilkan <strong className="text-[#161B26]">{filteredPayrollRows.length}</strong> Karyawan
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#E6DFD3]">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-[#FAF8F5] text-stone-600 uppercase text-[10px] tracking-wider font-extrabold border-b border-[#E6DFD3]">
                <tr>
                  <th className="py-3 px-4">Nama & NIK</th>
                  <th className="py-3 px-4">Divisi & Jabatan</th>
                  <th className="py-3 px-4">Rekening Payroll</th>
                  <th className="py-3 px-4 text-center">Hari Hadir</th>
                  <th className="py-3 px-4 text-center">Terlambat (Kali / Menit)</th>
                  <th className="py-3 px-4 text-center">Cuti Sakit</th>
                  <th className="py-3 px-4 text-center">Cuti Tahunan</th>
                  <th className="py-3 px-4 text-center">Unpaid / Izin</th>
                  <th className="py-3 px-4 text-center">Jam Lembur</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-sans">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="py-14 text-center text-stone-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />
                      <span>Menghitung rekapitulasi payroll periode {months[month - 1]} {year}...</span>
                    </td>
                  </tr>
                ) : filteredPayrollRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-stone-400">
                      Tidak ada data karyawan yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredPayrollRows.map((row) => (
                    <tr
                      key={row.employee_id}
                      onClick={() => setSelectedEmployeeSlip(row)}
                      className="hover:bg-stone-50/80 transition-colors group cursor-pointer"
                    >
                      <td className="py-3 px-4 font-medium text-[#161B26]">
                        <div className="font-extrabold text-xs flex items-center space-x-1">
                          <span>{row.full_name}</span>
                          <ChevronRight className="w-3 h-3 text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="text-[10px] text-stone-400 font-mono">
                          NIK: {row.employee_id_number || row.email}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-stone-600">
                        <div className="font-bold text-[#161B26]">{row.department}</div>
                        <div className="text-[10px] text-stone-400">{row.position || 'Staff'}</div>
                      </td>
                      <td className="py-3 px-4 text-xs font-mono">
                        {row.bank_uob ? (
                          <div className="text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
                            UOB: {row.bank_uob}
                          </div>
                        ) : row.bank_other ? (
                          <div className="text-stone-700 bg-stone-100 px-2 py-0.5 rounded-md inline-block">
                            {row.bank_other}
                          </div>
                        ) : (
                          <span className="text-stone-300 italic text-[11px]">Belum terdaftar</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-extrabold text-[#161B26] font-mono">
                        {row.total_days_present} / {row.total_days_expected}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {row.total_late_instances > 0 ? (
                          <span className="text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-md text-[11px] font-bold border border-amber-200 font-mono">
                            {row.total_late_instances}x ({row.total_late_minutes}m)
                          </span>
                        ) : (
                          <span className="text-stone-300 font-mono">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-stone-700">{row.total_sick_leaves}</td>
                      <td className="py-3 px-4 text-center font-mono text-stone-700">
                        <span className="font-bold">{row.total_annual_leaves}</span>
                        {row.annual_leave_quota !== undefined && (
                          <span className="text-[10px] text-stone-400 block font-normal">
                            (Sisa: {(row.annual_leave_quota || 12) - (row.annual_leave_used || 0)})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {row.total_unpaid_leaves > 0 ? (
                          <span className="text-rose-700 font-extrabold font-mono">{row.total_unpaid_leaves}</span>
                        ) : (
                          <span className="text-stone-300 font-mono">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center text-blue-900 font-extrabold font-mono">
                        {row.total_overtime_hours > 0 ? `+${row.total_overtime_hours}h` : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEmployeeSlip(row);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-[#161B26] hover:text-white text-stone-700 text-[11px] font-bold transition-all shadow-2xs"
                        >
                          Rincian Slip
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. FINANCIAL BREAKDOWN SLIP MODAL */}
      {selectedEmployeeSlip && (
        <div className="fixed inset-0 bg-[#161B26]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-[#E6DFD3] max-w-xl w-full p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-center font-extrabold text-sm shadow-2xs">
                  {selectedEmployeeSlip.full_name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#161B26] tracking-tight">
                    {selectedEmployeeSlip.full_name}
                  </h3>
                  <p className="text-xs text-stone-500">
                    NIK: {selectedEmployeeSlip.employee_id_number || '—'} • {selectedEmployeeSlip.department} ({selectedEmployeeSlip.position || 'Staff'})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmployeeSlip(null)}
                className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Rekening Payroll Card */}
            <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E6DFD3] flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <CreditCard className="w-4 h-4 text-amber-700" />
                <div>
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                    Rekening Penggajian
                  </span>
                  <span className="font-extrabold text-xs text-[#161B26]">
                    {selectedEmployeeSlip.bank_uob
                      ? `Bank UOB (PGE Payroll): ${selectedEmployeeSlip.bank_uob}`
                      : selectedEmployeeSlip.bank_other
                      ? `Bank Lain: ${selectedEmployeeSlip.bank_other}`
                      : 'Belum Terdaftar'}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                Terverifikasi HR
              </span>
            </div>

            {/* Attendance & Salary Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-stone-100 bg-stone-50/50 space-y-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                  Hari Kerja & Kehadiran
                </span>
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-xl font-extrabold text-[#161B26]">
                    {selectedEmployeeSlip.total_days_present}
                  </span>
                  <span className="text-stone-400 font-bold">/ {selectedEmployeeSlip.total_days_expected} Hari</span>
                </div>
                <p className="text-[10px] text-stone-500">
                  Rasio: {Math.round((selectedEmployeeSlip.total_days_present / Math.max(1, selectedEmployeeSlip.total_days_expected)) * 100)}%
                </p>
              </div>

              <div className="p-3 rounded-xl border border-stone-100 bg-stone-50/50 space-y-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                  Kompensasi Lembur
                </span>
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-xl font-extrabold text-blue-900 font-mono">
                    +{selectedEmployeeSlip.total_overtime_hours}
                  </span>
                  <span className="text-stone-400 font-bold">Jam</span>
                </div>
                <p className="text-[10px] text-blue-700 font-semibold">Tercatat resmi dalam SPL</p>
              </div>

              <div className="p-3 rounded-xl border border-amber-100 bg-amber-50/30 space-y-1">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                  Keterlambatan (Denda Disiplin)
                </span>
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-xl font-extrabold text-amber-900 font-mono">
                    {selectedEmployeeSlip.total_late_instances}x
                  </span>
                  <span className="text-stone-500 font-bold">(-{selectedEmployeeSlip.total_late_minutes}m)</span>
                </div>
                <p className="text-[10px] text-amber-800">
                  {selectedEmployeeSlip.total_late_minutes > 0
                    ? 'Dikenakan potongan kehadiran proporsional'
                    : 'Nihil potongan keterlambatan'}
                </p>
              </div>

              <div className="p-3 rounded-xl border border-rose-100 bg-rose-50/30 space-y-1">
                <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
                  Potongan Mangkir / Unpaid
                </span>
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-xl font-extrabold text-rose-700 font-mono">
                    {selectedEmployeeSlip.total_unpaid_leaves}
                  </span>
                  <span className="text-stone-500 font-bold">Hari</span>
                </div>
                <p className="text-[10px] text-rose-700 font-semibold">
                  Potongan gaji pokok per hari alpa
                </p>
              </div>
            </div>

            {/* Leave Balances */}
            <div className="p-3 rounded-xl border border-stone-100 bg-stone-50/50 flex items-center justify-between text-xs">
              <span className="text-stone-500">Status Hak Cuti Tahunan:</span>
              <span className="font-extrabold text-[#161B26]">
                Sisa {(selectedEmployeeSlip.annual_leave_quota || 12) - (selectedEmployeeSlip.annual_leave_used || 0)} dari kuota {selectedEmployeeSlip.annual_leave_quota || 12} hari
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-stone-100">
              <button
                onClick={() => handleSendSlipWA(selectedEmployeeSlip)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>{selectedEmployeeSlip.phone ? 'Kirim via WhatsApp' : 'Salin Ringkasan Slip'}</span>
              </button>

              {copiedSlip && (
                <span className="text-xs text-emerald-600 font-bold animate-pulse">
                  Tersalin ke Clipboard!
                </span>
              )}

              <button
                onClick={() => setSelectedEmployeeSlip(null)}
                className="px-4 py-2 rounded-xl border border-[#E6DFD3] text-stone-700 text-xs font-bold hover:bg-stone-50 transition-colors cursor-pointer"
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
