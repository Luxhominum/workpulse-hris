'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiClient } from '../../lib/api';
import {
  Employee,
  LiveOverviewData,
  AttendanceAuditRow,
  LeaveRequest,
  PayrollSummaryData,
} from '../../types';
import { AuditModal } from '../../components/admin/AuditModal';
import { ManualAdjustmentModal } from '../../components/admin/ManualAdjustmentModal';
import { CalendarStripBar } from '../../components/admin/CalendarStripBar';
import { RouletteTimePicker } from '../../components/admin/RouletteTimePicker';
import { PendingApprovalsCard } from '../../components/admin/PendingApprovalsCard';
import { PayrollTable } from '../../components/admin/PayrollTable';
import { AnalyticsTab } from '../../components/admin/AnalyticsTab';
import { AdminSidebar, AdminTab } from '../../components/admin/AdminSidebar';
import { EmployeesDirectoryTab } from '../../components/admin/EmployeesDirectoryTab';
import { ShiftRosterTab } from '../../components/admin/ShiftRosterTab';
import { OfficesGeofenceTab } from '../../components/admin/OfficesGeofenceTab';
import { ShiftsManagementTab } from '../../components/admin/ShiftsManagementTab';
import { GeneralSettingsTab } from '../../components/admin/GeneralSettingsTab';
import { AdminCanvasingView } from '../../components/admin/AdminCanvasingView';
import { AuditTrailTab } from '../../components/admin/AuditTrailTab';
import { NotificationModal } from '../../components/NotificationModal';
import {
  Users,
  CheckCircle,
  Clock,
  UserX,
  CalendarDays,
  FileSpreadsheet,
  ArrowLeft,
  RefreshCw,
  Eye,
  Calendar,
  Sliders,
  Download,
  Edit2,
  Coffee,
  BarChart3,
  Bell,
  Menu,
  Search,
  LogOut,
  ChevronDown,
} from 'lucide-react';

export default function AdminPortalPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>('board');
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [companyAcronym, setCompanyAcronym] = useState('PGE');

  useEffect(() => {
    const loadCompanyCode = () => {
      try {
        const saved = localStorage.getItem('hris_general_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.companyCode) setCompanyAcronym(parsed.companyCode);
        }
      } catch {}
    };
    loadCompanyCode();
    window.addEventListener('company_settings_updated', loadCompanyCode);
    return () => window.removeEventListener('company_settings_updated', loadCompanyCode);
  }, []);

  // Tab 1: Live Board
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [overviewData, setOverviewData] = useState<LiveOverviewData | null>(null);
  const [isOverviewLoading, setIsOverviewLoading] = useState<boolean>(true);
  const [selectedAuditRecord, setSelectedAuditRecord] = useState<AttendanceAuditRow | null>(null);
  const [selectedAdjustRecord, setSelectedAdjustRecord] = useState<AttendanceAuditRow | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState<boolean>(false);

  // Roulette 24h Time Picker & Status State (Anchored Popover)
  const [rouletteModal, setRouletteModal] = useState<{
    isOpen: boolean;
    record: AttendanceAuditRow | null;
    field: 'in' | 'out';
    initialTime: string | null;
    initialStatus: string;
    anchorRect?: {
      top: number;
      bottom: number;
      left: number;
      right: number;
      width: number;
      height: number;
    } | null;
  }>({
    isOpen: false,
    record: null,
    field: 'in',
    initialTime: null,
    initialStatus: 'ON_TIME',
    anchorRect: null,
  });

  // Roster Filters
  const [rosterSearch, setRosterSearch] = useState<string>('');
  const [rosterCategory, setRosterCategory] = useState<
    'ALL' | 'WORKDAY' | 'OFF_DAY' | 'OVERTIME' | 'LEAVE' | 'ATTENTION'
  >('ALL');

  // Tab 2: Pending Approvals
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([]);
  const [isApprovalsLoading, setIsApprovalsLoading] = useState<boolean>(false);

  // Tab 3: Payroll
  const [payrollYear, setPayrollYear] = useState<number>(2026);
  const [payrollMonth, setPayrollMonth] = useState<number>(10);
  const [payrollData, setPayrollData] = useState<PayrollSummaryData | null>(null);
  const [isPayrollLoading, setIsPayrollLoading] = useState<boolean>(false);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  const checkAuth = useCallback(async (): Promise<boolean> => {
    setIsAuthChecking(true);
    const token = ApiClient.getToken();
    if (!token) {
      router.push('/login?redirect=/admin');
      return false;
    }
    try {
      const user = await ApiClient.getMe();
      if (user.role === 'EMPLOYEE') {
        // Employees are strictly redirected to employee dashboard
        router.push('/');
        return false;
      }
      setCurrentUser(user);
      setIsAuthChecking(false);
      return true;
    } catch {
      ApiClient.clearToken();
      router.push('/login?redirect=/admin');
      return false;
    }
  }, [router]);

  const loadOverview = useCallback(async (date: string, isSilent = false) => {
    if (!isSilent) setIsOverviewLoading(true);
    try {
      const data = await ApiClient.getLiveOverview(date || undefined);
      setOverviewData(data);
    } catch (err: any) {
      console.warn('Failed to load overview:', err?.message || err);
    } finally {
      if (!isSilent) setIsOverviewLoading(false);
    }
  }, []);

  const loadApprovals = useCallback(async () => {
    setIsApprovalsLoading(true);
    try {
      const list = await ApiClient.getPendingLeaves();
      setPendingRequests(list);
    } catch (err: any) {
      console.warn('Failed to load pending requests:', err?.message || err);
    } finally {
      setIsApprovalsLoading(false);
    }
  }, []);

  const loadPayroll = useCallback(async (y: number, m: number) => {
    setIsPayrollLoading(true);
    try {
      const summary = await ApiClient.getPayrollSummary(y, m);
      setPayrollData(summary);
    } catch (err: any) {
      console.warn('Failed to load payroll:', err?.message || err);
    } finally {
      setIsPayrollLoading(false);
    }
  }, []);

  const handleLogout = () => {
    ApiClient.clearToken();
    router.push('/login');
  };

  useEffect(() => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    setSelectedDate(dateStr);
    setPayrollYear(today.getFullYear());
    setPayrollMonth(today.getMonth() + 1);

    checkAuth().then((isAuthorized) => {
      if (isAuthorized) {
        loadOverview(dateStr);
        loadApprovals();
        loadPayroll(today.getFullYear(), today.getMonth() + 1);
      }
    });
  }, [checkAuth, loadOverview, loadApprovals, loadPayroll]);

  const handleApprove = async (id: string) => {
    await ApiClient.approveLeave(id);
    loadApprovals();
    loadOverview(selectedDate);
  };

  const handleReject = async (id: string, reason?: string) => {
    await ApiClient.rejectLeave(id, reason);
    loadApprovals();
  };

  const handleExportDailyCsv = () => {
    if (!overviewData || overviewData.records.length === 0) return;

    const headers = [
      'Employee Name',
      'Email',
      'Department',
      'Position',
      'Office Name',
      'Shift',
      'Clock In Time',
      'Clock Out Time',
      'Status',
      'Late Minutes',
      'Clock In Latitude',
      'Clock In Longitude',
      'Leave Reason',
    ];

    const rows = overviewData.records.map((r) => [
      `"${r.full_name}"`,
      `"${r.email}"`,
      `"${r.department}"`,
      `"${r.position}"`,
      `"${r.office_name || ''}"`,
      `"${r.shift_name} (${r.shift_hours})"`,
      r.clock_in_time ? `"${new Date(r.clock_in_time).toISOString()}"` : '""',
      r.clock_out_time ? `"${new Date(r.clock_out_time).toISOString()}"` : '""',
      `"${r.status}"`,
      r.late_minutes,
      r.clock_in_lat !== null ? r.clock_in_lat : '""',
      r.clock_in_lng !== null ? r.clock_in_lng : '""',
      `"${r.leave_reason || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `attendance_roster_${selectedDate || new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveRoulette = async (timeStr: string, reason: string, newStatus: string) => {
    if (!rouletteModal.record) return;
    const baseDate = selectedDate || new Date().toISOString().split('T')[0];
    const isoTime = new Date(`${baseDate}T${timeStr}:00`).toISOString();

    const isFieldIn = rouletteModal.field === 'in';
    const existingIn = rouletteModal.record.clock_in_time;
    const existingOut = rouletteModal.record.clock_out_time;

    // Evaluasi keterlambatan secara otomatis berdasarkan jam mulai shift
    let targetStatus = newStatus;
    let targetLateMinutes = rouletteModal.record.late_minutes;

    if (isFieldIn) {
      const shiftHours = rouletteModal.record.shift_hours || '09:00 - 18:00';
      const shiftStartStr = shiftHours.split('-')[0].trim();
      const [shHour, shMin] = shiftStartStr.split(':').map(Number);
      const clockDate = new Date(`${baseDate}T${timeStr}:00`);
      const shiftDate = new Date(`${baseDate}T${timeStr}:00`);
      shiftDate.setHours(shHour, shMin, 0, 0);

      const diffMinutes = Math.floor((clockDate.getTime() - shiftDate.getTime()) / (60 * 1000));
      if (diffMinutes > 0) {
        targetStatus = 'LATE';
        targetLateMinutes = diffMinutes;
      } else {
        targetStatus = 'ON_TIME';
        targetLateMinutes = 0;
      }
    }

    // Optimistic UI update in overviewData
    setOverviewData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        records: prev.records.map((rec) =>
          rec.employee_id === rouletteModal.record!.employee_id
            ? {
                ...rec,
                clock_in_time: isFieldIn ? isoTime : existingIn,
                clock_out_time: !isFieldIn ? isoTime : existingOut,
                status: (targetStatus === 'AUTO_CALCULATE' ? rec.status : targetStatus) as any,
                late_minutes: targetLateMinutes,
                is_manual_adjustment: true,
              }
            : rec
        ),
      };
    });

    try {
      await ApiClient.adjustAttendance({
        employee_id: rouletteModal.record.employee_id,
        date: baseDate,
        clock_in_time: isFieldIn ? isoTime : existingIn,
        clock_out_time: !isFieldIn ? isoTime : existingOut,
        status: targetStatus === 'AUTO_CALCULATE' ? undefined : targetStatus,
        reason: reason || 'Koreksi jam operasional harian via 24h Drum',
      });
      setRouletteModal({
        isOpen: false,
        record: null,
        field: 'in',
        initialTime: null,
        initialStatus: 'ON_TIME',
        anchorRect: null,
      });
      loadOverview(selectedDate, true);
    } catch (err: any) {
      alert('Gagal menyimpan koreksi jam: ' + (err?.message || err));
      loadOverview(selectedDate, true);
    }
  };

  const filteredRecords = (overviewData?.records || []).filter((r) => {
    // Search query filter
    if (rosterSearch.trim()) {
      const q = rosterSearch.toLowerCase();
      const matchName = r.full_name?.toLowerCase().includes(q);
      const matchDept = r.department?.toLowerCase().includes(q);
      const matchEmail = r.email?.toLowerCase().includes(q);
      if (!matchName && !matchDept && !matchEmail) return false;
    }

    // Category filter
    switch (rosterCategory) {
      case 'WORKDAY':
        return ['ON_TIME', 'LATE', 'WFH', 'OUT_OF_OFFICE', 'ABSENT'].includes(r.status);
      case 'OFF_DAY':
        return r.status === 'LIBUR';
      case 'OVERTIME':
        return r.status === 'HADIR_BUKAN_HARI_KERJA';
      case 'LEAVE':
        return r.status === 'ON_LEAVE';
      case 'ATTENTION':
        return r.status === 'LATE' || r.status === 'ABSENT';
      case 'ALL':
      default:
        return true;
    }
  });

  const getStatusBadgeStyle = (status: AttendanceAuditRow['status']) => {
    switch (status) {
      case 'ON_TIME':
        return 'bg-[#EBF7F0] text-[#166534] border-[#BBF7D0]';
      case 'LATE':
        return 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]';
      case 'HADIR_BUKAN_HARI_KERJA':
        return 'bg-[#F3E8FF] text-[#6B21A8] border-[#E9D5FF]';
      case 'LIBUR':
        return 'bg-[#F5F2EB] text-[#57534E] border-[#DCD5C5]';
      case 'WFH':
        return 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]';
      case 'OUT_OF_OFFICE':
        return 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]';
      case 'ON_LEAVE':
        return 'bg-[#F3E8FF] text-[#6B21A8] border-[#E9D5FF]';
      case 'ABSENT':
      default:
        return 'bg-[#FFE4E6] text-[#9F1239] border-[#FECDD3]';
    }
  };

  const handleStatusChange = async (r: AttendanceAuditRow, newStatus: string) => {
    const baseDate = selectedDate || new Date().toISOString().split('T')[0];
    let inTime = r.clock_in_time;
    let outTime = r.clock_out_time;

    // Tetap kosongkan jam jika sebelumnya kosong (tidak mengarang waktu masuk/pulang otomatis)
    if (newStatus === 'ABSENT' || newStatus === 'LIBUR') {
      inTime = null;
      outTime = null;
    }

    // Optimistic UI update in overviewData
    setOverviewData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        records: prev.records.map((rec) =>
          rec.employee_id === r.employee_id
            ? {
                ...rec,
                status: newStatus as any,
                clock_in_time: inTime,
                clock_out_time: outTime,
                is_manual_adjustment: true,
              }
            : rec
        ),
      };
    });

    try {
      await ApiClient.adjustAttendance({
        employee_id: r.employee_id,
        date: baseDate,
        clock_in_time: inTime,
        clock_out_time: outTime,
        status: newStatus,
        reason: `Perubahan status langsung via tabel admin ke ${newStatus}`,
      });
      loadOverview(selectedDate, true);
    } catch (err: any) {
      alert('Gagal mengubah status: ' + (err?.message || err));
      loadOverview(selectedDate, true);
    }
  };

  const getSectionTitle = () => {
    switch (activeTab) {
      case 'board':
        return 'Daily Live Attendance Board';
      case 'approvals':
        return 'Pusat Persetujuan Cuti & Izin';
      case 'employees':
        return 'Master Database Karyawan';
      case 'analytics':
        return 'Visual Analytics & Laporan';
      case 'payroll':
        return 'Rekapitulasi Penggajian & Ekspor';
      case 'offices':
        return 'Kantor Cabang & Radius Geofence';
      case 'shifts':
        return 'Jadwal Shift Kerja & Grace Period';
      case 'general':
        return 'Pengaturan Sistem & Perusahaan';
      default:
        return 'Manager Portal';
    }
  };

  if (isAuthChecking || !currentUser || currentUser.role === 'EMPLOYEE') {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-[#FEF8E7] border border-[#FDE7B4] flex items-center justify-center p-1 shadow-sm mb-3">
          <img
            src="/brand/workpulse-emblem.png"
            alt="WorkPulse"
            className="w-full h-full object-contain animate-pulse"
          />
        </div>
        <p className="text-xs font-mono text-[#8C8578] font-bold tracking-wider uppercase">
          Memverifikasi Hak Akses Administrator...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1E2538] flex font-sans">
      {/* 1. ENTERPRISE LEFT SIDEBAR */}
      <AdminSidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        pendingApprovalsCount={pendingRequests.length}
        activeEmployeesCount={overviewData?.metrics?.total_employees || 0}
        officesCount={12}
        currentUser={currentUser}
        onOpenNotifications={() => setIsNotificationOpen(true)}
        hasUnreadNotifications={pendingRequests.length > 0}
        onLogout={handleLogout}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-y-auto">
        {/* Top Header Bar */}
        <header className="bg-[#FBF9F5] border-b border-[#E6DFD3] sticky top-0 z-30 px-4 sm:px-8 py-3.5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-xl border border-[#E6DFD3] text-[#57534E] hover:bg-[#F5EFE6] cursor-pointer"
              title="Buka Navigasi Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                  {companyAcronym}
                </span>
                <span className="font-extrabold text-xs text-[#78716C] uppercase tracking-wider hidden sm:inline">
                  WorkPulse HRIS
                </span>
                <span className="text-[#D6CEBC] font-bold hidden sm:inline">/</span>
                <h1 className="font-black text-sm sm:text-base text-[#161B26] tracking-tight">
                  {getSectionTitle()}
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsNotificationOpen(true)}
              className="p-1.5 rounded-xl border border-[#E6DFD3] bg-white hover:bg-[#F5EFE6] text-[#57534E] hover:text-[#161B26] transition-colors relative cursor-pointer shadow-2xs"
              title="Notifikasi & Peringatan HR"
            >
              <Bell className="w-4 h-4" />
              {pendingRequests.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1 right-1 ring-1 ring-white" />
              )}
            </button>

            <div className="flex items-center space-x-2 pl-3 border-l border-[#E6DFD3]">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center font-black text-xs text-white shadow-xs">
                {currentUser?.full_name ? currentUser.full_name.slice(0, 2).toUpperCase() : 'AD'}
              </div>
              <div className="hidden sm:block text-left">
                <span className="text-xs font-black text-[#161B26] block leading-tight">
                  {currentUser?.full_name || 'System Admin'}
                </span>
                <span className="text-[10px] text-amber-800 font-extrabold block leading-tight">
                  {currentUser?.role || 'ADMIN'} Privileges
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-xl border border-[#E6DFD3] bg-white hover:bg-rose-50 text-[#78716C] hover:text-rose-600 transition-colors shadow-2xs cursor-pointer ml-1"
                title="Keluar dari Portal Admin"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Workspace */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-4">

        {/* TAB 1: DAILY LIVE BOARD */}
        {activeTab === 'board' && (
          <div className="space-y-3">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#161B26] tracking-tight">Workforce Attendance Overview</h2>
                <p className="text-xs text-[#78716C] font-medium">
                  Real-time visibility into verified check-ins, office perimeter compliance, and audit records.
                </p>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => loadOverview(selectedDate)}
                  disabled={isOverviewLoading}
                  className="p-2 rounded-xl bg-white hover:bg-[#F2ECE1] text-[#57534E] hover:text-[#161B26] border border-[#E8DFD0] shadow-2xs transition-colors cursor-pointer"
                  title="Segarkan Data Presensi"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isOverviewLoading ? 'animate-spin text-[#D97706]' : ''}`} />
                </button>
                <button
                  onClick={handleExportDailyCsv}
                  disabled={!overviewData || overviewData.records.length === 0}
                  className="px-4 py-2 rounded-xl bg-[#161B26] hover:bg-[#222938] disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95 border border-[#161B26]"
                  title="Download Daily Attendance as CSV"
                >
                  <Download className="w-3.5 h-3.5 text-[#D97706]" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Interactive Calendar Strip Bar (Compact & Ergonomic) */}
            <CalendarStripBar
              selectedDate={selectedDate}
              onSelectDate={(newDate) => {
                setSelectedDate(newDate);
                loadOverview(newDate);
              }}
              overviewData={overviewData}
              isLoading={isOverviewLoading}
            />

            {/* Daily Roster Table */}
            <div className="bg-white border border-[#E8DFD0] rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E8DFD0]">
                <div>
                  <h3 className="text-sm font-black text-[#161B26] tracking-tight">
                    Daftar Presensi Karyawan Harian
                  </h3>
                  <p className="text-xs text-[#78716C] font-medium">
                    Total {overviewData?.records.length || 0} personil terdaftar • Status audit dan verifikasi kehadiran
                  </p>
                </div>
              </div>

              {/* Roster Controls: Search & Category Filter Pills */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                {/* Search input */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari nama karyawan / departemen / email..."
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-bold text-[#161B26] bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl focus:outline-none focus:border-amber-500 shadow-2xs"
                  />
                </div>

                {/* Category Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  {[
                    { id: 'ALL', label: 'Semua Status' },
                    { id: 'WORKDAY', label: '🟢 Hari Kerja' },
                    { id: 'OFF_DAY', label: '☕ Libur Kantor' },
                    { id: 'OVERTIME', label: '🟣 Hadir Libur / Lembur' },
                    { id: 'LEAVE', label: '📋 Cuti & Izin' },
                    { id: 'ATTENTION', label: '⚠️ Perlu Perhatian' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setRosterCategory(tab.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                        rosterCategory === tab.id
                          ? 'bg-[#161B26] text-white shadow-xs'
                          : 'bg-[#FAF8F5] hover:bg-[#F5EFE6] text-[#57534E] border border-[#E6DFD3]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-[#E6DFD3] relative">
                {/* Hairline background indicator when refreshing */}
                {isOverviewLoading && overviewData && (
                  <div className="absolute top-0 inset-x-0 h-0.5 bg-amber-500/20 overflow-hidden z-10">
                    <div className="h-full bg-amber-600 animate-pulse w-full" />
                  </div>
                )}
                <table className="w-full text-left text-xs text-[#161B26]">
                  <thead className="bg-[#F5EFE6] text-[#44403C] uppercase text-[10px] tracking-wider font-extrabold border-b border-[#E6DFD3]">
                    <tr>
                      <th className="py-3.5 px-4">Karyawan</th>
                      <th className="py-3.5 px-4">Departemen</th>
                      <th className="py-3.5 px-4">Shift Kerja</th>
                      <th className="py-3.5 px-4 text-center">Clock In</th>
                      <th className="py-3.5 px-4 text-center">Clock Out</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-center">Terlambat</th>
                      <th className="py-3.5 px-4 text-center">Bukti Audit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EBE4D5] font-sans">
                    {isOverviewLoading && !overviewData ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-[#78716C]">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-600" />
                          <span className="font-bold">Memuat daftar presensi harian...</span>
                        </td>
                      </tr>
                    ) : filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-[#78716C] font-medium">
                          Tidak ada data yang cocok dengan kriteria filter presensi ini.
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((r) => {
                        const inTime = r.clock_in_time
                          ? new Date(r.clock_in_time).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—';

                        const outTime = r.clock_out_time
                          ? new Date(r.clock_out_time).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—';

                        return (
                          <tr key={r.employee_id} className="hover:bg-[#FAF8F5] transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-sm text-[#161B26]">{r.full_name}</div>
                              <div className="text-[11px] text-[#57534E] font-mono">{r.email}</div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-xs text-[#44403C]">{r.department}</span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-xs text-[#161B26] block">{r.shift_name}</span>
                              <span className="text-[10px] text-[#57534E] font-mono font-bold bg-[#F5EFE6] px-1.5 py-0.5 rounded border border-[#D6CEBC] inline-block mt-0.5 whitespace-nowrap">
                                {r.shift_hours}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setRouletteModal({
                                    isOpen: true,
                                    record: r,
                                    field: 'in',
                                    initialTime: r.clock_in_time,
                                    initialStatus: r.status,
                                    anchorRect: {
                                      top: rect.top,
                                      bottom: rect.bottom,
                                      left: rect.left,
                                      right: rect.right,
                                      width: rect.width,
                                      height: rect.height,
                                    },
                                  });
                                }}
                                className="group inline-flex items-center gap-1 font-bold text-[#161B26] font-mono hover:text-amber-900 bg-transparent hover:bg-amber-100/70 px-2 py-1 rounded-lg border border-transparent hover:border-amber-300 transition-all cursor-pointer"
                                title="Klik untuk putar 24h drum jam masuk"
                              >
                                <span>{inTime}</span>
                                <Edit2 className="w-2.5 h-2.5 text-[#57534E] group-hover:text-amber-800 opacity-40 group-hover:opacity-100 transition-opacity" />
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setRouletteModal({
                                    isOpen: true,
                                    record: r,
                                    field: 'out',
                                    initialTime: r.clock_out_time,
                                    initialStatus: r.status,
                                    anchorRect: {
                                      top: rect.top,
                                      bottom: rect.bottom,
                                      left: rect.left,
                                      right: rect.right,
                                      width: rect.width,
                                      height: rect.height,
                                    },
                                  });
                                }}
                                className="group inline-flex items-center gap-1 font-bold text-[#161B26] font-mono hover:text-amber-900 bg-transparent hover:bg-amber-100/70 px-2 py-1 rounded-lg border border-transparent hover:border-amber-300 transition-all cursor-pointer"
                                title="Klik untuk putar 24h drum jam pulang"
                              >
                                <span>{outTime}</span>
                                <Edit2 className="w-2.5 h-2.5 text-[#57534E] group-hover:text-amber-800 opacity-40 group-hover:opacity-100 transition-opacity" />
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <div className="flex flex-col items-center gap-0.5">
                                <div className="relative inline-flex items-center group">
                                  <select
                                    value={r.status}
                                    onChange={(e) => handleStatusChange(r, e.target.value)}
                                    className={`appearance-none cursor-pointer pl-3 pr-6 py-1 rounded-full text-xs font-bold border shadow-2xs transition-all hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-amber-500/40 ${getStatusBadgeStyle(
                                      r.status
                                    )}`}
                                    title="Klik untuk ubah status kehadiran karyawan langsung"
                                  >
                                    <option value="ON_TIME" className="bg-white text-[#161B26] font-bold">🟢 Hadir Tepat Waktu</option>
                                    <option value="LATE" className="bg-white text-[#161B26] font-bold">🟡 Terlambat</option>
                                    <option value="HADIR_BUKAN_HARI_KERJA" className="bg-white text-[#161B26] font-bold">🟣 Hadir Libur / Lembur</option>
                                    <option value="LIBUR" className="bg-white text-[#161B26] font-bold">☕ Libur / Day Off</option>
                                    <option value="WFH" className="bg-white text-[#161B26] font-bold">🌐 Remote / WFH</option>
                                    <option value="OUT_OF_OFFICE" className="bg-white text-[#161B26] font-bold">🚗 Tugas Luar / Dinas</option>
                                    <option value="ON_LEAVE" className="bg-white text-[#161B26] font-bold">📋 Izin / Cuti</option>
                                    <option value="ABSENT" className="bg-white text-[#161B26] font-bold">🔴 Tidak Hadir / Alpha</option>
                                  </select>
                                  <ChevronDown className="w-3 h-3 absolute right-2 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity" />
                                </div>

                                {r.is_manual_adjustment && (
                                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-900 border border-amber-300 tracking-tight">
                                    Koreksi
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono">
                              {r.late_minutes > 0 ? (
                                <span className="text-amber-800 font-black text-xs">+{r.late_minutes}m</span>
                              ) : (
                                <span className="text-slate-300 font-bold">—</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {r.clock_in_photo_url ? (
                                <button
                                  onClick={() => setSelectedAuditRecord(r)}
                                  className="px-3 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-white rounded-lg text-[11px] font-black flex items-center gap-1 mx-auto shadow-sm shadow-amber-900/15 cursor-pointer transition-all"
                                >
                                  <Eye className="w-3.5 h-3.5 text-amber-100" />
                                  <span>Audit</span>
                                </button>
                              ) : (
                                <span className="text-slate-300 font-mono text-xs">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LEAVE & CORRECTIONS */}
        {activeTab === 'approvals' && (
          <PendingApprovalsCard
            requests={pendingRequests}
            isLoading={isApprovalsLoading}
            onApprove={handleApprove}
            onReject={handleReject}
            onRefresh={() => {
              loadApprovals();
              loadOverview(selectedDate, true);
            }}
          />
        )}

        {/* TAB 2.5: SALES CANVASING & FIELD VISIT MONITORING */}
        {activeTab === 'canvasing' && <AdminCanvasingView />}

        {/* TAB 3: PAYROLL EXPORT */}
        {activeTab === 'payroll' && (
          <PayrollTable
            data={payrollData}
            year={payrollYear}
            month={payrollMonth}
            isLoading={isPayrollLoading}
            onYearChange={(y) => {
              setPayrollYear(y);
              loadPayroll(y, payrollMonth);
            }}
            onMonthChange={(m) => {
              setPayrollMonth(m);
              loadPayroll(payrollYear, m);
            }}
            onRefresh={() => loadPayroll(payrollYear, payrollMonth)}
          />
        )}

        {/* TAB 3: MASTER DATABASE KARYAWAN */}
        {activeTab === 'employees' && <EmployeesDirectoryTab />}

        {/* TAB 3.5: ROSTER SHIFT KERJA BULANAN */}
        {activeTab === 'roster' && <ShiftRosterTab />}

        {/* TAB 4: VISUAL ANALYTICS & HR REPORTS */}
        {activeTab === 'analytics' && <AnalyticsTab />}

        {/* TAB 5: AUDIT TRAIL & UU PDP COMPLIANCE LOG */}
        {activeTab === 'audit' && <AuditTrailTab />}

        {/* TAB 6: KANTOR CABANG & GEOFENCING */}
        {activeTab === 'offices' && <OfficesGeofenceTab />}

        {/* TAB 7: JADWAL SHIFT KERJA & GRACE PERIOD */}
        {activeTab === 'shifts' && <ShiftsManagementTab />}

        {/* TAB 8: PENGATURAN UMUM SISTEM & PERUSAHAAN */}
        {activeTab === 'general' && <GeneralSettingsTab />}
      </main>
    </div>

      {/* Audit Modal */}
      <AuditModal
        record={selectedAuditRecord}
        onClose={() => setSelectedAuditRecord(null)}
      />

      {/* Manual Time Adjustment Modal (Fallback) */}
      <ManualAdjustmentModal
        isOpen={isAdjustModalOpen}
        onClose={() => {
          setIsAdjustModalOpen(false);
          setSelectedAdjustRecord(null);
        }}
        record={selectedAdjustRecord}
        date={selectedDate}
        onSaved={() => loadOverview(selectedDate)}
      />

      {/* 24-Hour Drum Roulette Adjustment Picker (Anchored to table cell) */}
      {rouletteModal.isOpen && rouletteModal.record && (
        <RouletteTimePicker
          initialTime={rouletteModal.initialTime}
          initialStatus={rouletteModal.initialStatus}
          title={
            rouletteModal.field === 'in'
              ? 'Jam Masuk'
              : 'Jam Pulang'
          }
          employeeName={rouletteModal.record.full_name}
          field={rouletteModal.field}
          anchorRect={rouletteModal.anchorRect}
          onSave={handleSaveRoulette}
          onClose={() =>
            setRouletteModal({
              isOpen: false,
              record: null,
              field: 'in',
              initialTime: null,
              initialStatus: 'ON_TIME',
              anchorRect: null,
            })
          }
        />
      )}

      {/* Notifications Modal */}
      <NotificationModal
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        user={currentUser}
        todayAttendance={null}
      />
    </div>
  );
}
