'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ApiClient } from '../../lib/api';
import { MonthlyAnalyticsData, AttendanceMatrixData } from '../../types';
import {
  TrendingUp,
  Calendar,
  Users,
  Clock,
  AlertTriangle,
  Laptop,
  Award,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  Filter,
  CheckCircle2,
  FileText,
  BarChart3,
  Building2,
  RefreshCw,
  LogOut,
  HelpCircle,
  MessageCircle,
  Table as TableIcon,
  LayoutDashboard,
  Check,
  Copy,
  Activity,
  UserX,
  ExternalLink,
  Sparkles,
  PieChart as PieIcon,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export function AnalyticsTab() {
  const [viewMode, setViewMode] = useState<'dashboard' | 'matrix'>('dashboard');
  const [analytics, setAnalytics] = useState<MonthlyAnalyticsData | null>(null);
  const [matrixData, setMatrixData] = useState<AttendanceMatrixData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMatrix, setIsLoadingMatrix] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedCounselingId, setCopiedCounselingId] = useState<string | null>(null);

  // Department display controls
  const [deptFilterTab, setDeptFilterTab] = useState<'attention' | 'top' | 'all'>('attention');
  const [showAllDepts, setShowAllDepts] = useState(false);

  // Period filters
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(10);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');

  useEffect(() => {
    const d = new Date();
    setSelectedYear(d.getUTCFullYear());
    setSelectedMonth(d.getUTCMonth() + 1);
  }, []);

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await ApiClient.getMonthlyAnalytics(
        selectedYear,
        selectedMonth,
        selectedDepartment
      );
      setAnalytics(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memuat visual analytics kehadiran.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear, selectedMonth, selectedDepartment]);

  const loadMatrix = useCallback(async () => {
    setIsLoadingMatrix(true);
    try {
      const data = await ApiClient.getAttendanceMatrixData(
        selectedYear,
        selectedMonth,
        selectedDepartment
      );
      setMatrixData(data);
    } catch (err: any) {
      console.error('Failed to load matrix data:', err);
    } finally {
      setIsLoadingMatrix(false);
    }
  }, [selectedYear, selectedMonth, selectedDepartment]);

  useEffect(() => {
    loadAnalytics();
    if (viewMode === 'matrix') {
      loadMatrix();
    }
  }, [loadAnalytics, loadMatrix, viewMode]);

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  // Unique departments for filter
  const departments = useMemo(() => {
    if (!analytics) return [];
    return analytics.department_breakdown.map((d) => d.department);
  }, [analytics]);

  // Export CSV summary
  const handleExportCSV = () => {
    if (!analytics) return;
    const { summary } = analytics;
    const rows = [
      ['WORKPULSE HRIS - LAPORAN REKAPITULASI PRESENSI & ANALYTICS EKSEKUTIF'],
      [`Periode: ${monthNames[selectedMonth - 1]} ${selectedYear}`],
      [`Departemen: ${selectedDepartment}`],
      [],
      ['RINGKASAN EKSEKUTIF (BALANCED HR SUITE)'],
      ['Total Karyawan Aktif', String(summary.total_employees)],
      ['Tingkat Kehadiran (%)', `${summary.attendance_rate}%`],
      ['Tingkat Tepat Waktu (%)', `${summary.on_time_rate}%`],
      ['Total Kehadiran (Hari)', String(summary.total_present_days)],
      ['Tingkat Alpha / Mangkir (%)', `${summary.alpha_rate || 0}%`],
      ['Total Hari Alpha (Man-Days)', String(summary.total_alpha_days || 0)],
      ['Total Insiden Terlambat', String(summary.total_late_days)],
      ['Total Menit Terlambat', `${summary.total_late_minutes} menit`],
      ['Rata-rata Terlambat/Kejadian', `${summary.avg_late_minutes || 0} menit`],
      ['Insiden Pulang Cepat (Early Out)', String(summary.total_early_departure_days || 0)],
      ['Menit Pulang Cepat', `${summary.total_early_departure_minutes || 0} menit`],
      ['Hari Paling Rawan Terlambat', summary.peak_late_day || '—'],
      ['Total Hari Remote WFH', String(summary.total_wfh_days)],
      ['Total Jam Kerja', `${summary.total_work_hours} jam`],
      ['Total Cuti/Izin Disetujui', String(summary.total_approved_leaves)],
      [],
      ['BREAKDOWN PER DEPARTEMEN & HEALTH SCORE'],
      ['Departemen', 'Karyawan', 'Health Score', 'Status', 'Kehadiran (%)', 'Total Hadir', 'Terlambat (Kali)', 'Terlambat (Menit)', 'WFH'],
      ...analytics.department_breakdown.map((d) => [
        d.department,
        String(d.total_employees),
        `${d.health_score ?? 100}/100`,
        d.health_status || 'GOOD',
        `${d.attendance_rate}%`,
        String(d.total_present),
        String(d.total_late_count),
        String(d.total_late_minutes),
        String(d.wfh_count),
      ]),
      [],
      ['TREN KEHADIRAN HARIAN'],
      ['Tanggal', 'Hari', 'Tipe Hari', 'Total Hadir', 'Tepat Waktu', 'Terlambat', 'WFH', 'Alpha/Tidak Hadir'],
      ...analytics.daily_trends.map((t) => [
        t.date,
        t.day_name,
        t.is_workday ? 'Hari Kerja' : 'Libur/Weekend',
        String(t.present),
        String(t.on_time),
        String(t.late),
        String(t.wfh),
        String(t.absent),
      ]),
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      rows.map((e) => e.map((val) => `"${val.replace(/"/g, '""')}"`).join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Rekap_Analytics_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCounselingWA = (emp: { id: string; name: string; phone?: string | null; late_count: number; late_minutes: number }) => {
    const greeting = `Halo ${emp.name},\n\nKami dari People & Culture WorkPulse ingin menyapa dan mengonfirmasi terkait catatan kehadiran bulan ${monthNames[selectedMonth - 1]} ${selectedYear}.\n\nTercatat ada ${emp.late_count}x keterlambatan (akumulasi ${emp.late_minutes} menit). Apakah ada kendala operasional, perjalanan, atau hal yang bisa kami bantu fasilitasi?\n\nTerima kasih atas kerja samanya.`;
    
    if (emp.phone) {
      let cleanPhone = emp.phone.replace(/[^0-9]/g, '');
      if (cleanPhone.startsWith('0')) {
        cleanPhone = '62' + cleanPhone.slice(1);
      }
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(greeting)}`;
      window.open(waUrl, '_blank');
    } else {
      navigator.clipboard.writeText(greeting);
      setCopiedCounselingId(emp.id);
      setTimeout(() => setCopiedCounselingId(null), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-[#E6DFD3] p-16 text-center shadow-xs">
        <RefreshCw className="w-8 h-8 text-amber-600 animate-spin mx-auto mb-3" />
        <p className="text-xs font-semibold text-stone-600">
          Memuat visual analytics & intelijen kehadiran eksekutif...
        </p>
      </div>
    );
  }

  if (errorMsg || !analytics) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-800">
        <AlertTriangle className="w-6 h-6 text-rose-600 mx-auto mb-2" />
        <p className="text-xs font-semibold">{errorMsg || 'Data tidak tersedia'}</p>
        <button
          onClick={loadAnalytics}
          className="mt-3 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  const { summary, daily_trends, department_breakdown, top_punctual, top_late } = analytics;
  const maxDailyPresent = Math.max(1, summary.total_employees);

  const todayStr = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  })();

  // 1. Calculate Donut Chart Segments
  const onTimeCount = Math.max(0, summary.total_present_days - summary.total_late_days);
  const lateCount = summary.total_late_days;
  const wfhCount = summary.total_wfh_days;
  const leaveCount = summary.total_approved_leaves;
  const alphaCount = summary.total_alpha_days || 0;

  const rawPieSegments = [
    { key: 'on_time', label: 'Tepat Waktu', value: onTimeCount, color: '#10B981', ringColor: 'ring-emerald-500' },
    { key: 'late', label: 'Terlambat', value: lateCount, color: '#F59E0B', ringColor: 'ring-amber-500' },
    { key: 'wfh', label: 'Remote / WFH', value: wfhCount, color: '#0EA5E9', ringColor: 'ring-sky-500' },
    { key: 'leave', label: 'Izin / Cuti', value: leaveCount, color: '#8B5CF6', ringColor: 'ring-purple-500' },
    { key: 'alpha', label: 'Alpha / Mangkir', value: alphaCount, color: '#F43F5E', ringColor: 'ring-rose-500' },
  ];

  const totalPieVolume = rawPieSegments.reduce((sum, s) => sum + s.value, 0) || 1;
  const circumference = 2 * Math.PI * 38; // Radius = 38 => ~238.76

  let accumulatedPercent = 0;
  const donutSegments = rawPieSegments.map((seg) => {
    const pct = (seg.value / totalPieVolume) * 100;
    const strokeDasharray = `${(pct / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += pct;
    return {
      ...seg,
      percentage: Math.round(pct * 10) / 10,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  // 2. Filter Curated Departments (Avoid listing all at once)
  const filteredDepartments = department_breakdown.filter((dept) => {
    if (selectedDepartment !== 'ALL') return dept.department === selectedDepartment;
    return true;
  });

  const sortedForAttention = [...filteredDepartments].sort(
    (a, b) => (a.health_score ?? 100) - (b.health_score ?? 100) || b.total_late_count - a.total_late_count
  );

  const sortedForTop = [...filteredDepartments].sort(
    (a, b) => (b.health_score ?? 100) - (a.health_score ?? 100) || b.attendance_rate - a.attendance_rate
  );

  let activeDeptList =
    deptFilterTab === 'attention'
      ? sortedForAttention
      : deptFilterTab === 'top'
      ? sortedForTop
      : filteredDepartments;

  const displayedDepts = showAllDepts ? activeDeptList : activeDeptList.slice(0, 3);

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Executive Toolbar & Controls */}
      <div className="bg-white rounded-2xl border border-[#E6DFD3] p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Month & Year Navigation + Period badge */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-xl border border-[#E6DFD3] bg-[#FAF8F5] hover:bg-stone-100 text-stone-700 transition-colors"
            title="Bulan Lalu"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center space-x-2 px-2">
            <Calendar className="w-4 h-4 text-amber-700" />
            <span className="text-sm font-extrabold text-[#161B26] tracking-tight">
              {monthNames[selectedMonth - 1]} {selectedYear}
            </span>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
              {analytics.period.expected_working_days} Hari Kerja
            </span>
          </div>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-xl border border-[#E6DFD3] bg-[#FAF8F5] hover:bg-stone-100 text-stone-700 transition-colors"
            title="Bulan Depan"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* View Mode Toggle & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="inline-flex rounded-xl bg-stone-100 p-0.5 border border-[#E6DFD3]">
            <button
              onClick={() => setViewMode('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                viewMode === 'dashboard'
                  ? 'bg-white text-[#161B26] shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => {
                setViewMode('matrix');
                if (!matrixData) loadMatrix();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                viewMode === 'matrix'
                  ? 'bg-white text-[#161B26] shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Grid Matriks 31-Hari</span>
            </button>
          </div>

          {/* Department Filter Dropdown */}
          <div className="flex items-center space-x-1.5 bg-[#FAF8F5] px-2.5 py-1.5 rounded-xl border border-[#E6DFD3] text-xs">
            <Filter className="w-3.5 h-3.5 text-stone-500" />
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="bg-transparent font-bold text-stone-700 focus:outline-hidden text-xs cursor-pointer"
            >
              <option value="ALL">Semua Departemen ({departments.length})</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-xl border border-[#E6DFD3] bg-white hover:bg-[#FAF8F5] text-stone-700 text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-stone-500" />
            <span>Export CSV</span>
          </button>

          {/* Cetak */}
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-xl bg-[#161B26] hover:bg-[#232B3E] text-white text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>Cetak PDF</span>
          </button>
        </div>
      </div>

      {viewMode === 'dashboard' ? (
        <>
          {/* 2. Hero Interactive Donut Chart + Core Metrics Grid (Non-Monotonous Layout) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Hero Card: Attendance Composition Donut Chart (5 Cols) */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E6DFD3] p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                      <PieIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-[#161B26] tracking-tight">
                        Komposisi Absensi & Man-Days
                      </h3>
                      <p className="text-[11px] text-stone-400">
                        Total {totalPieVolume} catatan presensi & izin periode ini
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Live Status
                  </span>
                </div>

                {/* SVG Donut Chart with Center Information */}
                <div className="relative flex items-center justify-center py-5">
                  <svg className="w-44 h-44 transform -rotate-90" viewBox="0 0 100 100">
                    {/* Background Track */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      stroke="#F4EFE6"
                      strokeWidth="11"
                      fill="transparent"
                    />
                    {/* Dynamic Segments */}
                    {donutSegments.map((seg) => (
                      <circle
                        key={seg.key}
                        cx="50"
                        cy="50"
                        r="38"
                        stroke={seg.color}
                        strokeWidth="11"
                        strokeDasharray={seg.strokeDasharray}
                        strokeDashoffset={seg.strokeDashoffset}
                        fill="transparent"
                        className="transition-all duration-700 hover:opacity-80 cursor-pointer"
                      />
                    ))}
                  </svg>

                  {/* Donut Center Display */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                      Kehadiran
                    </span>
                    <span className="text-3xl font-extrabold text-[#161B26] tracking-tight">
                      {summary.attendance_rate}%
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-0.5">
                      {summary.total_present_days} Hadir
                    </span>
                  </div>
                </div>
              </div>

              {/* Legend with interactive values & percentages */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3 border-t border-stone-100">
                {donutSegments.map((seg) => (
                  <div key={seg.key} className="p-2 rounded-xl bg-[#FAF8F5] border border-[#E6DFD3] text-xs space-y-0.5">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                      <span className="text-[10px] font-bold text-stone-600 truncate">{seg.label}</span>
                    </div>
                    <div className="flex items-baseline justify-between pl-4">
                      <span className="font-extrabold text-stone-900 text-xs">{seg.value}</span>
                      <span className="text-[10px] font-bold text-stone-400">{seg.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Side: 4 Differentiated High-Impact Metric Cards (7 Cols) */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card 1: Punctuality & Discipline */}
              <div className="bg-white rounded-2xl border border-[#E6DFD3] p-4.5 shadow-xs flex flex-col justify-between hover:border-amber-400 transition-colors">
                <div>
                  <div className="flex items-center justify-between text-stone-500 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                      Kedisiplinan Waktu
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-3xl font-extrabold text-[#161B26]">
                      {summary.on_time_rate}%
                    </span>
                    <span className="text-xs font-bold text-stone-400">On-Time Ratio</span>
                  </div>
                  <div className="w-full bg-stone-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-amber-600 h-1.5 rounded-full"
                      style={{ width: `${Math.min(100, summary.on_time_rate)}%` }}
                    />
                  </div>
                </div>
                <div className="pt-3 mt-3 border-t border-stone-100 text-[11px] text-stone-500 flex items-center justify-between">
                  <span>Telat: <strong className="text-amber-800">{summary.total_late_days}x</strong> (-{summary.total_late_minutes}m)</span>
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md">
                    Rata-rata {summary.avg_late_minutes || 0}m
                  </span>
                </div>
              </div>

              {/* Card 2: Alpha & Pulang Cepat Risk */}
              <div className="bg-white rounded-2xl border border-[#E6DFD3] p-4.5 shadow-xs flex flex-col justify-between hover:border-rose-400 transition-colors">
                <div>
                  <div className="flex items-center justify-between text-stone-500 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
                      Kebocoran Waktu Kerja
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
                      <UserX className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-3xl font-extrabold text-rose-600">
                      {summary.total_alpha_days || 0}
                    </span>
                    <span className="text-xs font-bold text-stone-400">hari alpha (mangkir)</span>
                  </div>
                  <div className="w-full bg-stone-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
                    <div
                      className="bg-rose-500 h-1.5 rounded-full"
                      style={{ width: `${Math.min(100, summary.alpha_rate || 0)}%` }}
                    />
                  </div>
                </div>
                <div className="pt-3 mt-3 border-t border-stone-100 text-[11px] text-stone-500 flex items-center justify-between">
                  <span>Pulang Cepat: <strong className="text-purple-700">{summary.total_early_departure_days || 0}x</strong></span>
                  <span className="text-[10px] font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-md">
                    -{summary.total_early_departure_minutes || 0}m sebelum shift
                  </span>
                </div>
              </div>

              {/* Card 3: Total Work Output & Remote WFH */}
              <div className="bg-white rounded-2xl border border-[#E6DFD3] p-4.5 shadow-xs flex flex-col justify-between hover:border-sky-400 transition-colors">
                <div>
                  <div className="flex items-center justify-between text-stone-500 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-sky-800">
                      Total Jam Kerja
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-3xl font-extrabold text-[#161B26] font-mono">
                      {summary.total_work_hours}
                    </span>
                    <span className="text-xs font-bold text-stone-400">jam total</span>
                  </div>
                  <div className="w-full bg-stone-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
                    <div
                      className="bg-sky-500 h-1.5 rounded-full"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
                <div className="pt-3 mt-3 border-t border-stone-100 text-[11px] text-stone-500 flex items-center justify-between">
                  <span>Remote WFH: <strong className="text-sky-700">{summary.total_wfh_days} hari</strong></span>
                  <span className="text-[10px] font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md">
                    {summary.total_approved_leaves} cuti resmi
                  </span>
                </div>
              </div>

              {/* Card 4: Peak Tardiness Pattern */}
              <div className="bg-white rounded-2xl border border-[#E6DFD3] p-4.5 shadow-xs flex flex-col justify-between hover:border-stone-400 transition-colors">
                <div>
                  <div className="flex items-center justify-between text-stone-500 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600">
                      Pola Hari Rawan Telat
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                    </div>
                  </div>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-2xl font-extrabold text-[#161B26]">
                      {summary.peak_late_day || 'Nihil'}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 mt-1">
                    Hari penyumbang frekuensi terlambat terbesar
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-stone-100 text-[10px] font-bold flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-700">
                    &le;15m: {summary.late_minor_count || 0}x
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900">
                    16-45m: {summary.late_moderate_count || 0}x
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-900">
                    &gt;45m: {summary.late_severe_count || 0}x
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Daily Attendance Trend Chart */}
          <div className="bg-white rounded-2xl border border-[#E6DFD3] p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
              <div>
                <h3 className="font-extrabold text-sm text-[#161B26] tracking-tight flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-amber-700" />
                  <span>Grafik Tren Kehadiran & Ketepatan Waktu Harian</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Distribusi kehadiran per hari kerja sepanjang bulan {monthNames[selectedMonth - 1]} {selectedYear}
                </p>
              </div>

              {/* Color legend */}
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-600 font-semibold">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
                  <span>Tepat Waktu</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-400" />
                  <span>Terlambat</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-sky-400" />
                  <span>WFH</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-stone-200" />
                  <span>Libur/Weekend</span>
                </div>
              </div>
            </div>

            {/* Visual Bar Columns */}
            <div className="pt-2 overflow-x-auto pb-2">
              <div className="min-w-[680px] flex items-end justify-between h-48 gap-1.5 px-2">
                {daily_trends.map((day) => {
                  const isToday = day.date === todayStr;
                  const totalBarHeight = maxDailyPresent > 0 ? (day.present / maxDailyPresent) * 100 : 0;
                  const onTimePct = day.present > 0 ? (day.on_time / day.present) * 100 : 0;
                  const latePct = day.present > 0 ? (day.late / day.present) * 100 : 0;
                  const wfhPct = day.present > 0 ? (day.wfh / day.present) * 100 : 0;

                  return (
                    <div
                      key={day.date}
                      className="flex-1 flex flex-col items-center justify-end h-full group relative"
                    >
                      {/* Hover Tooltip Card */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col bg-[#161B26] text-white rounded-xl p-3 text-[10px] shadow-xl z-30 pointer-events-none whitespace-nowrap min-w-[140px] border border-stone-700">
                        <div className="font-bold border-b border-stone-700 pb-1 mb-1.5 flex items-center justify-between">
                          <span>{day.date}</span>
                          <span className="text-amber-400 font-extrabold">{day.day_name}</span>
                        </div>
                        <div className="text-stone-300">Total Hadir: <strong className="text-white">{day.present}</strong> karyawan</div>
                        <div className="text-emerald-400 font-semibold">Tepat Waktu: {day.on_time}</div>
                        <div className="text-amber-400 font-semibold">Terlambat: {day.late}</div>
                        <div className="text-sky-400 font-semibold">Remote / WFH: {day.wfh}</div>
                        {day.is_workday && (
                          <div className="text-rose-400 font-semibold border-t border-stone-800 pt-1 mt-1">
                            Alpha/Tidak Hadir: {day.absent}
                          </div>
                        )}
                        {isToday && (
                          <div className="text-amber-300 font-extrabold text-[9px] pt-0.5">
                            ★ HARI INI
                          </div>
                        )}
                      </div>

                      {/* Stacked Bar Container */}
                      <div
                        className={`w-full rounded-t-sm overflow-hidden flex flex-col-reverse transition-all duration-300 ${
                          !day.is_workday
                            ? 'bg-stone-100 opacity-60'
                            : 'bg-stone-100 hover:brightness-95'
                        } ${isToday ? 'ring-2 ring-amber-500 shadow-md' : ''}`}
                        style={{
                          height: day.present > 0 ? `${Math.max(12, totalBarHeight)}%` : '6px',
                        }}
                      >
                        {/* On Time Block */}
                        <div
                          className="bg-emerald-500 w-full"
                          style={{ height: `${onTimePct}%` }}
                        />
                        {/* Late Block */}
                        <div
                          className="bg-amber-400 w-full"
                          style={{ height: `${latePct}%` }}
                        />
                        {/* WFH Block */}
                        <div
                          className="bg-sky-400 w-full"
                          style={{ height: `${wfhPct}%` }}
                        />
                      </div>

                      {/* Day Label at Bottom */}
                      <div className="pt-2 text-center">
                        <span
                          className={`text-[10px] block font-extrabold ${
                            isToday
                              ? 'text-amber-700 bg-amber-100 rounded-sm px-1'
                              : !day.is_workday
                              ? 'text-rose-400'
                              : 'text-stone-700'
                          }`}
                        >
                          {day.day}
                        </span>
                        <span className="text-[8px] text-stone-400 block -mt-0.5 font-medium">
                          {day.day_name}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 4. Curated Department Health Section & Actionable HR Coaching (Not Showing All at Once) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Curated Department Breakdown Card */}
            <div className="bg-white rounded-2xl border border-[#E6DFD3] p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-stone-100">
                <div>
                  <h4 className="font-extrabold text-sm text-[#161B26] tracking-tight flex items-center space-x-2">
                    <Building2 className="w-4 h-4 text-stone-700" />
                    <span>Statistik & Health Score Divisi</span>
                  </h4>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Menampilkan divisi prioritas tanpa membebani ruang tampilan
                  </p>
                </div>

                {/* Filter Tabs for Department Curation */}
                <div className="inline-flex rounded-lg bg-stone-100 p-0.5 border border-stone-200 text-[11px] font-bold self-start sm:self-auto">
                  <button
                    onClick={() => {
                      setDeptFilterTab('attention');
                      setShowAllDepts(false);
                    }}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      deptFilterTab === 'attention'
                        ? 'bg-white text-rose-800 shadow-2xs font-extrabold'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    ⚠️ Butuh Perhatian
                  </button>
                  <button
                    onClick={() => {
                      setDeptFilterTab('top');
                      setShowAllDepts(false);
                    }}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      deptFilterTab === 'top'
                        ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    🏆 Paling Disiplin
                  </button>
                  <button
                    onClick={() => {
                      setDeptFilterTab('all');
                      setShowAllDepts(true);
                    }}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      deptFilterTab === 'all'
                        ? 'bg-white text-[#161B26] shadow-2xs font-extrabold'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Semua ({filteredDepartments.length})
                  </button>
                </div>
              </div>

              {/* Department List (Curated Top 3 by default) */}
              <div className="space-y-3">
                {displayedDepts.length === 0 ? (
                  <div className="text-center py-6 text-stone-400 text-xs">
                    Tidak ada divisi dalam kategori ini.
                  </div>
                ) : (
                  displayedDepts.map((dept) => {
                    const healthScore = dept.health_score ?? 100;
                    const isSelected = selectedDepartment === dept.department;

                    return (
                      <div
                        key={dept.department}
                        onClick={() => setSelectedDepartment(isSelected ? 'ALL' : dept.department)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#161B26] bg-stone-50/80 shadow-2xs ring-1 ring-[#161B26]'
                            : 'border-stone-100 bg-[#FAF8F5]/60 hover:bg-white hover:border-[#E6DFD3]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-xs text-[#161B26]">{dept.department}</span>
                            <span className="text-[10px] text-stone-400">
                              ({dept.total_employees} org)
                            </span>
                          </div>

                          {/* Health Score Pill */}
                          <div className="flex items-center space-x-1.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                healthScore >= 85
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : healthScore >= 70
                                  ? 'bg-sky-50 text-sky-800 border-sky-200'
                                  : healthScore >= 50
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-rose-50 text-rose-800 border-rose-200'
                              }`}
                            >
                              Health: {healthScore}/100
                            </span>
                            <span className="text-xs font-extrabold text-[#161B26]">
                              {dept.attendance_rate}%
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden flex">
                          <div
                            className="bg-emerald-500 h-1.5"
                            style={{ width: `${Math.min(100, dept.attendance_rate)}%` }}
                            title={`Hadir: ${dept.attendance_rate}%`}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-stone-500 font-medium pt-1.5">
                          <span>Hadir: <strong className="text-stone-800">{dept.total_present}</strong></span>
                          <span>
                            Terlambat: <strong className="text-amber-700">{dept.total_late_count}x</strong> ({dept.total_late_minutes}m)
                          </span>
                          <span>WFH: <strong className="text-sky-700">{dept.wfh_count}</strong></span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Collapsible toggle for more divisions */}
              {activeDeptList.length > 3 && deptFilterTab !== 'all' && (
                <button
                  onClick={() => setShowAllDepts(!showAllDepts)}
                  className="w-full py-2 rounded-xl border border-dashed border-[#E6DFD3] hover:border-stone-400 text-stone-600 text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <span>
                    {showAllDepts
                      ? 'Sembunyikan Divisi Lainnya'
                      : `Lihat ${activeDeptList.length - 3} Divisi Lainnya`}
                  </span>
                  {showAllDepts ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            {/* Right Column: Champions & HR Coaching */}
            <div className="space-y-4">
              {/* Top 5 Punctual (Champions) */}
              <div className="bg-white rounded-2xl border border-[#E6DFD3] p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                  <div>
                    <h4 className="font-extrabold text-sm text-[#161B26] tracking-tight flex items-center space-x-2">
                      <Award className="w-4 h-4 text-emerald-600" />
                      <span>Karyawan Paling Tepat Waktu</span>
                    </h4>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Teladan ketepatan waktu dan komitmen kerja bulan ini
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {top_punctual.length === 0 ? (
                    <div className="text-center py-4 text-stone-400 text-xs">
                      Belum ada catatan kehadiran on-time.
                    </div>
                  ) : (
                    top_punctual.map((emp, idx) => (
                      <div
                        key={emp.id}
                        className="p-2.5 rounded-xl border border-stone-100 bg-[#FAF8F5]/60 flex items-center justify-between text-xs hover:border-[#E6DFD3] transition-colors"
                      >
                        <div className="flex items-center space-x-2.5">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-extrabold text-[11px] ${
                              idx === 0
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : idx === 1
                                ? 'bg-stone-200 text-stone-800 border border-stone-300'
                                : 'bg-orange-100 text-orange-900 border border-orange-300'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <div>
                            <span className="font-extrabold text-[#161B26] block">{emp.name}</span>
                            <span className="text-[10px] text-stone-400">
                              {emp.department} • {emp.position}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-extrabold text-emerald-700 text-xs block">
                            {emp.on_time_count} Hari On-Time
                          </span>
                          <span className="text-[10px] text-stone-400">
                            {emp.late_count === 0 ? '0 Keterlambatan' : `${emp.late_count}x Terlambat`}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Top 5 Late for HR Coaching with 1-Click WhatsApp */}
              <div className="bg-white rounded-2xl border border-[#E6DFD3] p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                  <div>
                    <h4 className="font-extrabold text-sm text-[#161B26] tracking-tight flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Pendampingan Disiplin & Coaching HR</span>
                    </h4>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Karyawan butuh bimbingan disiplin dengan aksi konseling WhatsApp langsung
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {top_late.length === 0 ? (
                    <div className="text-center py-4 text-emerald-700 text-xs font-bold">
                      Hebat! Tidak ada catatan keterlambatan bulan ini.
                    </div>
                  ) : (
                    top_late.map((emp) => (
                      <div
                        key={emp.id}
                        className="p-3 rounded-xl border border-amber-200/60 bg-amber-50/30 flex items-center justify-between text-xs hover:border-amber-300 transition-colors"
                      >
                        <div>
                          <span className="font-extrabold text-[#161B26] block">{emp.name}</span>
                          <span className="text-[10px] text-stone-500">
                            {emp.department} • {emp.position}
                          </span>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md">
                              {emp.late_count}x Terlambat (+{emp.late_minutes}m)
                            </span>
                          </div>
                        </div>

                        {/* WhatsApp / Coaching Action */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleCounselingWA(emp)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center space-x-1.5 shadow-2xs transition-transform active:scale-95"
                            title={emp.phone ? `Chat WhatsApp ${emp.phone}` : 'Salin Pesan Konseling ke Clipboard'}
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>{emp.phone ? 'WA HR' : 'Salin Pesan'}</span>
                          </button>
                          {copiedCounselingId === emp.id && (
                            <span className="text-[10px] text-emerald-600 font-bold animate-pulse">
                              Tersalin!
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* 5. Mode Grid Matriks Presensi 31-Hari */
        <div className="bg-white rounded-2xl border border-[#E6DFD3] p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
            <div>
              <h3 className="font-extrabold text-sm text-[#161B26] tracking-tight flex items-center space-x-2">
                <TableIcon className="w-4 h-4 text-amber-700" />
                <span>Grid Matriks Presensi Karyawan (1–31 {monthNames[selectedMonth - 1]} {selectedYear})</span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Pemetaan harian kehadiran, izin/cuti, keterlambatan, dan alpha seluruh karyawan
              </p>
            </div>

            {/* Quick Export URL */}
            <a
              href={ApiClient.getExportAttendanceMatrixUrl(selectedYear, selectedMonth, selectedDepartment)}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl bg-[#161B26] text-white hover:bg-[#232B3E] text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-2xs self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Download Excel Matriks</span>
            </a>
          </div>

          {/* Color Code Legend */}
          <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6DFD3] text-[11px] font-bold">
            <span className="text-stone-400 uppercase tracking-wider text-[10px] mr-1">Legenda Kode:</span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">H: Hadir On-Time</span>
            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">T: Terlambat</span>
            <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800">WFH: Remote</span>
            <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">C/S/I: Cuti/Sakit/Izin</span>
            <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800">A: Alpha / Mangkir</span>
            <span className="px-2 py-0.5 rounded-md bg-stone-200 text-stone-700">OFF: Libur</span>
          </div>

          {isLoadingMatrix ? (
            <div className="py-16 text-center">
              <RefreshCw className="w-7 h-7 text-amber-600 animate-spin mx-auto mb-2" />
              <p className="text-xs font-semibold text-stone-500">Memuat matriks 31-hari...</p>
            </div>
          ) : !matrixData || matrixData.rows.length === 0 ? (
            <div className="py-12 text-center text-stone-400 text-xs">
              Belum ada data matriks untuk filter departemen ini.
            </div>
          ) : (
            <div className="overflow-x-auto border border-[#E6DFD3] rounded-xl max-h-[550px] relative">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-[#FAF8F5] text-stone-700 sticky top-0 z-20 border-b border-[#E6DFD3]">
                  <tr>
                    <th className="py-3 px-3 font-extrabold sticky left-0 bg-[#FAF8F5] z-30 min-w-[180px] border-r border-[#E6DFD3]">
                      Nama Karyawan
                    </th>
                    <th className="py-3 px-2 font-bold min-w-[90px] border-r border-[#E6DFD3]">
                      Divisi
                    </th>
                    {matrixData.days.map((d) => (
                      <th
                        key={d.dayNumber}
                        className={`py-2 px-1 text-center font-bold min-w-[32px] border-r border-stone-200 ${
                          d.isWeekend ? 'bg-stone-200/60 text-rose-600' : ''
                        }`}
                      >
                        <span className="block text-[10px]">{d.dayNumber}</span>
                        <span className="block text-[8px] text-stone-400 -mt-0.5">{d.dayName}</span>
                      </th>
                    ))}
                    <th className="py-3 px-2 text-center font-extrabold bg-stone-100 min-w-[50px] border-l border-[#E6DFD3]">
                      Hadir
                    </th>
                    <th className="py-3 px-2 text-center font-extrabold bg-amber-50 text-amber-900 min-w-[50px]">
                      Telat
                    </th>
                    <th className="py-3 px-2 text-center font-extrabold bg-rose-50 text-rose-900 min-w-[50px]">
                      Alpha
                    </th>
                    <th className="py-3 px-2 text-center font-extrabold bg-emerald-50 text-emerald-900 min-w-[55px]">
                      %
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {matrixData.rows.map((row) => (
                    <tr key={row.employee_id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-2 px-3 sticky left-0 bg-white z-10 font-extrabold text-[#161B26] border-r border-[#E6DFD3] whitespace-nowrap">
                        <div>{row.full_name}</div>
                        <div className="text-[10px] text-stone-400 font-normal">{row.position}</div>
                      </td>
                      <td className="py-2 px-2 text-stone-600 border-r border-[#E6DFD3] whitespace-nowrap font-medium text-[11px]">
                        {row.department}
                      </td>
                      {matrixData.days.map((d) => {
                        const cell = row.days[d.dayNumber];
                        const code = cell ? cell.code : 'OFF';

                        let cellClass = 'bg-stone-100 text-stone-600';
                        if (code === 'H') cellClass = 'bg-emerald-100 text-emerald-800 font-extrabold';
                        else if (code === 'T') cellClass = 'bg-amber-100 text-amber-900 font-extrabold';
                        else if (code === 'WFH') cellClass = 'bg-sky-100 text-sky-800 font-bold';
                        else if (['C', 'S', 'I'].includes(code)) cellClass = 'bg-purple-100 text-purple-800 font-bold';
                        else if (code === 'A') cellClass = 'bg-rose-100 text-rose-800 font-extrabold';

                        return (
                          <td
                            key={d.dayNumber}
                            className={`py-1.5 px-0.5 text-center border-r border-stone-200 text-[10px] ${
                              d.isWeekend ? 'bg-stone-50' : ''
                            }`}
                            title={cell?.detail || code}
                          >
                            <span className={`inline-block px-1 py-0.5 rounded-sm text-[9px] ${cellClass}`}>
                              {code}
                            </span>
                          </td>
                        );
                      })}
                      <td className="py-2 px-2 text-center font-bold bg-stone-50 border-l border-[#E6DFD3]">
                        {row.summary.present_count}
                      </td>
                      <td className="py-2 px-2 text-center font-bold bg-amber-50/40 text-amber-800">
                        {row.summary.late_count}
                      </td>
                      <td className="py-2 px-2 text-center font-bold bg-rose-50/40 text-rose-700">
                        {row.summary.alpa_count}
                      </td>
                      <td className="py-2 px-2 text-center font-extrabold bg-emerald-50/40 text-emerald-800">
                        {row.summary.attendance_percentage}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
