'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ApiClient } from '../../lib/api';
import { Employee, Office, Shift } from '../../types';
import { EditEmployeeModal } from './EditEmployeeModal';
import { DigitalIdCardModal } from '../common/DigitalIdCardModal';
import {
  Users,
  Search,
  UserPlus,
  Edit2,
  Archive,
  RotateCcw,
  RefreshCw,
  Building2,
  Clock,
  Shield,
  Laptop,
  CheckCircle2,
  X,
  FileSpreadsheet,
  AlertCircle,
  CreditCard,
  Phone,
  Calendar,
  Briefcase,
  ChevronRight,
  UserCheck,
  MessageCircle,
  Check,
  CheckSquare,
  Square,
  SlidersHorizontal,
  ExternalLink,
} from 'lucide-react';

export function EmployeesDirectoryTab() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived'>('active');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [wfhFilter, setWfhFilter] = useState<'ALL' | 'WFH' | 'ONSITE'>('ALL');

  // Bulk Selection & Quick Actions
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());
  const [bulkShiftId, setBulkShiftId] = useState<string>('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [quickShiftUpdatingId, setQuickShiftUpdatingId] = useState<string | null>(null);
  const [quickShiftSuccessId, setQuickShiftSuccessId] = useState<string | null>(null);

  // Edit & Add Modals
  const [selectedEditEmployee, setSelectedEditEmployee] = useState<Employee | null>(null);
  const [selectedIdCardEmployee, setSelectedIdCardEmployee] = useState<Employee | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Excel Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    totalRows: number;
    createdCount: number;
    updatedCount: number;
    message: string;
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Add Employee Form State
  const [isCreatingEmployee, setIsCreatingEmployee] = useState(false);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpNickname, setNewEmpNickname] = useState('');
  const [newEmpIdNumber, setNewEmpIdNumber] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpPassword, setNewEmpPassword] = useState('Password123!');
  const [newEmpRole, setNewEmpRole] = useState<'EMPLOYEE' | 'MANAGER' | 'ADMIN'>('EMPLOYEE');
  const [newEmpDept, setNewEmpDept] = useState('Produksi');
  const [newEmpPosition, setNewEmpPosition] = useState('Staff');
  const [newEmpPhone, setNewEmpPhone] = useState('+62 812-');
  const [newEmpJoinDate, setNewEmpJoinDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newEmpQuota, setNewEmpQuota] = useState(12);
  const [newEmpOfficeId, setNewEmpOfficeId] = useState('');
  const [newEmpShiftId, setNewEmpShiftId] = useState('');
  const [newEmpWfh, setNewEmpWfh] = useState(false);

  const loadData = useCallback(async (status = statusFilter) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [empList, offList, shiftList] = await Promise.all([
        ApiClient.getEmployees(status),
        ApiClient.getOffices().catch(() => []),
        ApiClient.getShifts().catch(() => []),
      ]);
      setEmployees(empList);
      setOffices(offList);
      setShifts(shiftList);
      if (offList.length > 0 && !newEmpOfficeId) setNewEmpOfficeId(offList[0].id);
      if (shiftList.length > 0 && !newEmpShiftId) setNewEmpShiftId(shiftList[0].id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memuat master karyawan.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, newEmpOfficeId, newEmpShiftId]);

  useEffect(() => {
    loadData(statusFilter);
  }, [statusFilter, loadData]);

  // Unique departments list with counts
  const departmentsWithCounts = useMemo(() => {
    const map = new Map<string, number>();
    employees.forEach((e) => {
      const dept = e.department || 'Umum';
      map.set(dept, (map.get(dept) || 0) + 1);
    });
    return Array.from(map.entries()).map(([dept, count]) => ({ dept, count }));
  }, [employees]);

  // Filtered employees list (Standard HR fields: Name, NIK, Email, Dept, Position, Bank, Phone)
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        emp.full_name.toLowerCase().includes(q) ||
        (emp.nickname && emp.nickname.toLowerCase().includes(q)) ||
        (emp.employee_id_number && emp.employee_id_number.toLowerCase().includes(q)) ||
        emp.email.toLowerCase().includes(q) ||
        (emp.department && emp.department.toLowerCase().includes(q)) ||
        (emp.position && emp.position.toLowerCase().includes(q)) ||
        (emp.phone && emp.phone.toLowerCase().includes(q)) ||
        (emp.bank_uob && emp.bank_uob.toLowerCase().includes(q)) ||
        (emp.bank_other && emp.bank_other.toLowerCase().includes(q));

      const matchDept = departmentFilter === 'ALL' || emp.department === departmentFilter;

      const matchWfh =
        wfhFilter === 'ALL' ||
        (wfhFilter === 'WFH' && emp.is_wfh_allowed) ||
        (wfhFilter === 'ONSITE' && !emp.is_wfh_allowed);

      return matchSearch && matchDept && matchWfh;
    });
  }, [employees, searchTerm, departmentFilter, wfhFilter]);

  // Date and Tenure Helpers
  const formatDateIndo = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const calculateTenure = (dateStr?: string | null) => {
    if (!dateStr) return null;
    try {
      const joinDate = new Date(dateStr);
      if (isNaN(joinDate.getTime())) return null;
      const now = new Date();
      if (joinDate > now) return 'Akan Datang';
      let years = now.getFullYear() - joinDate.getFullYear();
      let months = now.getMonth() - joinDate.getMonth();
      if (months < 0) {
        years -= 1;
        months += 12;
      }
      if (years === 0 && months === 0) return '< 1 bln';
      if (years === 0) return `${months} bln`;
      if (months === 0) return `${years} thn`;
      return `${years} thn ${months} bln`;
    } catch {
      return null;
    }
  };

  const getWhatsAppUrl = (phone?: string | null, name?: string) => {
    if (!phone) return null;
    let cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.slice(1);
    } else if (!cleaned.startsWith('62')) {
      cleaned = '62' + cleaned;
    }
    const text = encodeURIComponent(`Halo ${name || 'Rekan PGE'}, perihal administrasi HR WorkPulse...`);
    return `https://wa.me/${cleaned}?text=${text}`;
  };

  const renderEmploymentBadge = (status?: string | null) => {
    const s = (status || 'Tetap').toLowerCase();
    if (s.includes('tetap') || s.includes('permanent')) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-block">
          Karyawan Tetap
        </span>
      );
    }
    if (s.includes('kontrak') || s.includes('pkwt')) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-50 text-sky-800 border border-sky-200 inline-block">
          PKWT / Kontrak
        </span>
      );
    }
    if (s.includes('probation') || s.includes('percobaan')) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-block">
          Probation
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FAF8F5] text-[#78716C] border border-[#E6DFD3] inline-block">
        {status || 'Tetap'}
      </span>
    );
  };

  // Selection handlers
  const isAllSelected =
    filteredEmployees.length > 0 &&
    filteredEmployees.every((e) => selectedEmployeeIds.has(e.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedEmployeeIds(new Set());
    } else {
      setSelectedEmployeeIds(new Set(filteredEmployees.map((e) => e.id)));
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent | React.ChangeEvent) => {
    e.stopPropagation();
    setSelectedEmployeeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Quick Shift Change handler
  const handleQuickShiftChange = async (employeeId: string, shiftId: string) => {
    setQuickShiftUpdatingId(employeeId);
    try {
      // Optimistic update
      const targetShift = shifts.find((s) => s.id === shiftId);
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === employeeId ? { ...emp, shift_id: shiftId, shift: targetShift } : emp
        )
      );

      await ApiClient.updateEmployee(employeeId, { shift_id: shiftId });
      setQuickShiftSuccessId(employeeId);
      setTimeout(() => {
        setQuickShiftSuccessId((curr) => (curr === employeeId ? null : curr));
      }, 2000);
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah shift karyawan.');
      await loadData();
    } finally {
      setQuickShiftUpdatingId(null);
    }
  };

  // Bulk Shift Update handler
  const handleBulkShiftUpdate = async () => {
    if (!bulkShiftId || selectedEmployeeIds.size === 0) return;
    setIsBulkUpdating(true);
    try {
      const targetShift = shifts.find((s) => s.id === bulkShiftId);
      const ids = Array.from(selectedEmployeeIds);

      // Optimistic update
      setEmployees((prev) =>
        prev.map((emp) =>
          selectedEmployeeIds.has(emp.id)
            ? { ...emp, shift_id: bulkShiftId, shift: targetShift }
            : emp
        )
      );

      await Promise.all(
        ids.map((id) => ApiClient.updateEmployee(id, { shift_id: bulkShiftId }))
      );

      setSelectedEmployeeIds(new Set());
      setBulkShiftId('');
      alert(`Berhasil memperbarui shift untuk ${ids.length} karyawan.`);
    } catch (err: any) {
      alert(err.message || 'Sebagian atau seluruh shift gagal diperbarui.');
      await loadData();
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Handle Create Employee
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim() || !newEmpEmail.trim() || !newEmpPassword.trim()) {
      setErrorMsg('Nama lengkap, email, dan password wajib diisi.');
      return;
    }

    setIsCreatingEmployee(true);
    setErrorMsg(null);

    try {
      await ApiClient.createEmployee({
        full_name: newEmpName.trim(),
        email: newEmpEmail.trim().toLowerCase(),
        password: newEmpPassword,
        role: newEmpRole,
        department: newEmpDept.trim() || 'General',
        position: newEmpPosition.trim() || 'Staff',
        phone: newEmpPhone.trim() || null,
        join_date: newEmpJoinDate || null,
        annual_leave_quota: Number(newEmpQuota) || 12,
        office_id: newEmpOfficeId || null,
        shift_id: newEmpShiftId || null,
        is_wfh_allowed: newEmpWfh,
      });

      setIsAddModalOpen(false);
      setNewEmpName('');
      setNewEmpNickname('');
      setNewEmpIdNumber('');
      setNewEmpEmail('');
      setNewEmpPassword('Password123!');
      await loadData();
    } catch (err: any) {
      setErrorMsg(`Gagal menambahkan karyawan: ${err.message}`);
    } finally {
      setIsCreatingEmployee(false);
    }
  };

  // Archive & Restore actions
  const handleArchive = async (id: string, name: string) => {
    if (!window.confirm(`Arsipkan karyawan "${name}"? Akun akan dinonaktifkan, riwayat absensi tetap aman.`)) {
      return;
    }
    try {
      await ApiClient.archiveEmployee(id);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengarsipkan karyawan.');
    }
  };

  const handleRestore = async (id: string, name: string) => {
    try {
      await ApiClient.restoreEmployee(id);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memulihkan karyawan.');
    }
  };

  // Handle Excel Import Execution
  const triggerExcelImport = async (useDefaultLocal = false) => {
    setIsImporting(true);
    setImportError(null);
    setImportResult(null);

    try {
      const fileToUpload = useDefaultLocal ? undefined : (selectedFile || undefined);
      const res = await ApiClient.importEmployeesExcel(fileToUpload);
      setImportResult({
        totalRows: res.data.totalRows,
        createdCount: res.data.createdCount,
        updatedCount: res.data.updatedCount,
        message: res.message,
      });
      await loadData();
    } catch (err: any) {
      setImportError(err.message || 'Gagal mengimpor file Excel Team PGE.');
    } finally {
      setIsImporting(false);
    }
  };

  // Handle Export CSV
  const handleExportCSV = () => {
    const rows = filteredEmployees;
    if (rows.length === 0) {
      alert('Tidak ada data karyawan untuk diexport.');
      return;
    }

    const headers = [
      'No',
      'Nama Lengkap',
      'Nama Panggilan',
      'NIK / No Pegawai',
      'Email',
      'No Telepon',
      'Departemen',
      'Jabatan / Posisi',
      'Status Kerja',
      'Kantor Penugasan',
      'Shift Kerja',
      'Mode Kerja',
      'Rekening Bank',
      'Tgl Bergabung',
      'Sisa Cuti',
    ];

    const csvContent = [
      headers.join(';'),
      ...rows.map((e, idx) => [
        idx + 1,
        `"${e.full_name}"`,
        `"${e.nickname || '-'}"`,
        `"${e.employee_id_number || '-'}"`,
        `"${e.email}"`,
        `"${e.phone || '-'}"`,
        `"${e.department || '-'}"`,
        `"${e.position || '-'}"`,
        `"${e.employment_status || 'Karyawan Tetap'}"`,
        `"${e.office?.name || 'Kantor Pusat'}"`,
        `"${e.shift ? `${e.shift.name} (${e.shift.start_time}-${e.shift.end_time})` : 'Reguler'}"`,
        `"${e.is_wfh_allowed ? 'Remote / WFH' : 'On-Site'}"`,
        `"${e.bank_uob ? `UOB - ${e.bank_uob}` : (e.bank_other || '-')}"`,
        `"${e.join_date || '-'}"`,
        e.annual_leave_quota || 0,
      ].join(';')),
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Master_Karyawan_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 font-sans text-[#161B26]">
      {/* 1. Header Toolbar (Clean, Unboxed, 1 Row) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-black text-[#161B26] tracking-tight">
              Master Database Karyawan
            </h2>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-mono text-emerald-700 font-extrabold uppercase">
              Directory Terpadu
            </span>
          </div>
          <p className="text-xs text-[#78716C] font-medium mt-0.5">
            Pengelolaan data personil, NIK resmi, divisi kerja, shift penugasan, rekening payroll, dan kuota cuti tahunan.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => loadData()}
            disabled={isLoading}
            className="p-2 rounded-xl bg-white hover:bg-[#F5EFE6] text-[#57534E] hover:text-[#161B26] border border-[#E6DFD3] shadow-2xs transition-colors cursor-pointer"
            title="Refresh Data Karyawan"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-600' : ''}`} />
          </button>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#FAF8F5] border border-[#E6DFD3] text-xs font-bold text-[#161B26] flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            title="Export Master Karyawan ke CSV / Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          {/* Import Excel Button */}
          <button
            type="button"
            onClick={() => {
              setImportResult(null);
              setImportError(null);
              setSelectedFile(null);
              setIsImportModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#FAF8F5] border border-[#E6DFD3] text-xs font-bold text-emerald-800 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Import Excel</span>
          </button>

          {/* Add Employee Button */}
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#161B26] hover:bg-[#222938] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95 border border-[#161B26]"
          >
            <UserPlus className="w-3.5 h-3.5 text-[#D97706] stroke-[2.5]" />
            <span>+ Tambah Karyawan</span>
          </button>
        </div>
      </div>

      {/* 2. Compact Metric Ribbon (Standard HRIS KPIs) */}
      <div className="bg-[#FAF8F5] border border-[#E6DFD3] rounded-2xl px-4 py-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {/* Metric 1: Total Employees */}
          <div className="flex items-center space-x-2">
            <span className="text-[#78716C] font-medium">Total Personil:</span>
            <span className="font-mono font-black text-sm text-[#161B26]">
              {employees.length}
            </span>
            <span className="text-[11px] text-[#78716C]">
              ({statusFilter === 'active' ? 'Karyawan Aktif' : 'Diarsipkan'})
            </span>
          </div>

          <span className="hidden sm:inline w-px h-3.5 bg-[#E6DFD3]" />

          {/* Metric 2: Payroll Registered */}
          <div className="flex items-center space-x-2">
            <span className="text-[#78716C] font-medium">Rekening Payroll:</span>
            <span className="font-mono font-black text-sm text-emerald-700">
              {employees.filter((e) => e.bank_uob || e.bank_other).length}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
              Terdaftar
            </span>
          </div>

          <span className="hidden sm:inline w-px h-3.5 bg-[#E6DFD3]" />

          {/* Metric 3: Total Divisions */}
          <div className="flex items-center space-x-2">
            <span className="text-[#78716C] font-medium">Departemen:</span>
            <span className="font-mono font-black text-sm text-amber-600">
              {departmentsWithCounts.length}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
              Divisi Aktif
            </span>
          </div>
        </div>

        {/* WFH Ratio Badge */}
        <div className="flex items-center space-x-2 bg-white px-3 py-1 rounded-xl border border-[#E6DFD3] shadow-2xs">
          <Laptop className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
          <span className="text-[#78716C] font-medium text-[11px]">Mode Remote / WFH:</span>
          <span className="font-mono font-black text-xs text-amber-700">
            {employees.filter((e) => e.is_wfh_allowed).length} Personil
          </span>
        </div>
      </div>

      {/* 3. Division Quick Filter Chips */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none pt-0.5">
        <span className="text-[10px] font-mono uppercase text-[#78716C] font-extrabold flex-shrink-0 mr-1">
          Divisi:
        </span>

        {/* All Divisions Chip */}
        <button
          type="button"
          onClick={() => setDepartmentFilter('ALL')}
          className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex-shrink-0 ${
            departmentFilter === 'ALL'
              ? 'bg-[#161B26] text-white shadow-xs'
              : 'bg-white hover:bg-[#FAF8F5] text-[#57534E] border border-[#E6DFD3]'
          }`}
        >
          <span>Semua Divisi ({employees.length})</span>
        </button>

        {/* Department Chips */}
        {departmentsWithCounts.map(({ dept, count }) => (
          <button
            key={dept}
            type="button"
            onClick={() => setDepartmentFilter(dept)}
            className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex-shrink-0 ${
              departmentFilter === dept
                ? 'bg-[#161B26] text-white shadow-xs'
                : 'bg-white hover:bg-[#FAF8F5] text-[#57534E] border border-[#E6DFD3]'
            }`}
          >
            <span>{dept}</span>
            <span className="text-[10px] opacity-70 font-mono">({count})</span>
          </button>
        ))}
      </div>

      {/* 4. Main Employees Directory Card */}
      <div className="bg-white border border-[#E6DFD3] rounded-3xl p-5 shadow-2xs space-y-4">
        {/* Card Header & Status Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E6DFD3]">
          <div>
            <h3 className="text-sm font-black text-[#161B26] tracking-tight">
              Daftar Karyawan Terdaftar
            </h3>
            <p className="text-xs text-[#78716C] font-medium">
              Total {filteredEmployees.length} personil ditampilkan • Klik tombol ID Card atau Dossier untuk rincian
            </p>
          </div>

          {/* Active vs Archived Tab Filter */}
          <div className="inline-flex items-center bg-[#FAF8F5] p-1 rounded-xl border border-[#E6DFD3] shadow-2xs self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-[#161B26] text-white shadow-xs'
                  : 'text-[#78716C] hover:text-[#161B26]'
              }`}
            >
              Karyawan Aktif ({statusFilter === 'active' ? employees.length : '...'})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('archived')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'archived'
                  ? 'bg-[#161B26] text-white shadow-xs'
                  : 'text-[#78716C] hover:text-[#161B26]'
              }`}
            >
              Diarsipkan ({statusFilter === 'archived' ? employees.length : '...'})
            </button>
          </div>
        </div>

        {/* Search & Mode Filter Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama, NIK, email, jabatan, atau bank..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs font-bold text-[#161B26] bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl focus:outline-none focus:border-amber-500 shadow-2xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#78716C] hover:text-[#161B26]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Mode Kerja Filter Dropdown */}
          <div className="flex items-center space-x-2">
            <select
              value={wfhFilter}
              onChange={(e) => setWfhFilter(e.target.value as any)}
              className="bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl px-3 py-2 text-xs font-bold text-[#161B26] focus:outline-none focus:border-amber-500 cursor-pointer shadow-2xs"
            >
              <option value="ALL">Semua Mode Kerja</option>
              <option value="WFH">Hanya WFH (Remote)</option>
              <option value="ONSITE">Hanya On-Site (Kantor)</option>
            </select>
          </div>
        </div>

        {/* Standard HRIS Employee Table */}
        <div className="overflow-x-auto rounded-2xl border border-[#E6DFD3] relative">
          {isLoading ? (
            <div className="p-12 text-center text-[#78716C] text-xs flex flex-col items-center">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-600 mb-2" />
              <span className="font-bold">Memuat master karyawan...</span>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="p-12 text-center text-[#78716C] text-xs space-y-2">
              <Users className="w-10 h-10 text-[#78716C]/40 mx-auto" />
              <p className="font-bold text-sm text-[#161B26]">Tidak ada karyawan yang sesuai filter.</p>
              <p className="text-[11px]">Coba ubah kata kunci pencarian atau reset filter departemen.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-[#161B26] min-w-[1050px]">
              <thead className="bg-[#F5EFE6] text-[#44403C] uppercase text-[10px] tracking-wider font-extrabold border-b border-[#E6DFD3]">
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      className="rounded border-[#E6DFD3] text-amber-600 focus:ring-amber-500 cursor-pointer w-4 h-4"
                      title="Pilih semua karyawan di halaman ini"
                    />
                  </th>
                  <th className="py-3.5 px-4 min-w-[240px]">Karyawan & NIK</th>
                  <th className="py-3.5 px-4 min-w-[170px]">Departemen & Status</th>
                  <th className="py-3.5 px-4 min-w-[210px]">Kantor & Shift</th>
                  <th className="py-3.5 px-4 min-w-[160px]">Payroll & Rekening</th>
                  <th className="py-3.5 px-4 min-w-[160px]">Tgl Masuk & Masa Kerja</th>
                  <th className="py-3.5 px-4 min-w-[130px] text-right pr-6">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6DFD3]">
                {filteredEmployees.map((emp) => {
                  const initials = emp.nickname
                    ? emp.nickname.slice(0, 2).toUpperCase()
                    : emp.full_name.slice(0, 2).toUpperCase();

                  return (
                    <tr
                      key={emp.id}
                      onClick={() => {
                        setSelectedEditEmployee(emp);
                        setIsEditModalOpen(true);
                      }}
                      className={`group transition-colors cursor-pointer ${
                        selectedEmployeeIds.has(emp.id)
                          ? 'bg-amber-50/70 hover:bg-amber-100/60'
                          : 'hover:bg-[#FAF8F5]'
                      }`}
                      title="Klik baris untuk membuka Dossier detail kepegawaian"
                    >
                      {/* 0. Selection Checkbox */}
                      <td
                        className="py-3.5 px-4 text-center align-middle"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedEmployeeIds.has(emp.id)}
                          onChange={(e) => toggleSelect(emp.id, e)}
                          className="rounded border-[#E6DFD3] text-amber-600 focus:ring-amber-500 cursor-pointer w-4 h-4"
                        />
                      </td>

                      {/* 1. Name & Avatar & NIK & WhatsApp Direct */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-xl bg-[#161B26] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                            {initials}
                          </div>
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center space-x-1.5 flex-wrap gap-y-0.5">
                              <span className="font-bold text-[#161B26] text-xs leading-tight">
                                {emp.full_name}
                              </span>
                              {emp.nickname && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                                  &quot;{emp.nickname}&quot;
                                </span>
                              )}
                              {emp.role === 'ADMIN' && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                                  ADMIN
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 mt-1 text-[10px] text-[#78716C] font-mono flex-wrap gap-y-1">
                              {emp.employee_id_number && (
                                <span className="font-bold text-[#161B26] bg-[#FAF8F5] border border-[#E6DFD3] px-1.5 py-0.2 rounded">
                                  NIK: {emp.employee_id_number}
                                </span>
                              )}
                              {emp.phone && (
                                <a
                                  href={getWhatsAppUrl(emp.phone, emp.nickname || emp.full_name) || '#'}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center space-x-1 text-emerald-700 hover:text-emerald-900 hover:underline font-mono text-[10px] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-1.5 py-0.2 rounded transition-colors"
                                  title="Chat langsung via WhatsApp"
                                >
                                  <MessageCircle className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                  <span>{emp.phone}</span>
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Department & Status Kepegawaian */}
                      <td className="py-3.5 px-4 align-middle">
                        <span className="font-bold text-[#161B26] block leading-tight">
                          {emp.position || 'Staff'}
                        </span>
                        <span className="text-[11px] text-[#78716C] font-medium block mt-0.5">
                          {emp.department}
                        </span>
                        <div className="mt-1.5">
                          {renderEmploymentBadge(emp.employment_status)}
                        </div>
                      </td>

                      {/* 3. Office & Quick Shift Change */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-[#161B26]">
                          <Building2 className="w-3.5 h-3.5 text-[#78716C] shrink-0" />
                          <span className="truncate">
                            {emp.office ? emp.office.name : 'Kantor Pusat Solo'}
                          </span>
                        </div>

                        {/* Interactive Quick Shift Selector */}
                        <div
                          className="flex items-center space-x-1.5 mt-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Clock className="w-3 h-3 text-[#78716C] shrink-0" />
                          <div className="relative flex items-center">
                            <select
                              value={emp.shift_id || ''}
                              disabled={quickShiftUpdatingId === emp.id}
                              onChange={(e) => handleQuickShiftChange(emp.id, e.target.value)}
                              className="text-[10px] font-mono bg-white border border-[#E6DFD3] rounded-lg px-2 py-0.5 text-[#161B26] font-semibold hover:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer transition-colors"
                              title="Ubah shift langsung untuk karyawan ini"
                            >
                              <option value="" disabled>Pilih Shift</option>
                              {shifts.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name} ({s.start_time}-{s.end_time})
                                </option>
                              ))}
                            </select>
                            {quickShiftSuccessId === emp.id && (
                              <span className="ml-1.5 text-emerald-600 flex items-center animate-in fade-in" title="Shift tersimpan">
                                <Check className="w-3 h-3" />
                              </span>
                            )}
                            {quickShiftUpdatingId === emp.id && (
                              <span className="ml-1.5 text-amber-600 animate-spin">
                                <RefreshCw className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-1.5">
                          {emp.is_wfh_allowed ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-block">
                              Remote / WFH
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FAF8F5] text-[#78716C] border border-[#E6DFD3] inline-block">
                              On-Site Strict
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 4. Payroll & Bank */}
                      <td className="py-3.5 px-4 align-middle">
                        {emp.bank_uob ? (
                          <div>
                            <span className="font-mono font-bold text-amber-800 flex items-center space-x-1.5 text-[11px]">
                              <CreditCard className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>UOB: {emp.bank_uob}</span>
                            </span>
                            <span className="text-[9px] text-emerald-700 font-bold block mt-1">
                              ✓ Payroll Resmi PGE
                            </span>
                          </div>
                        ) : emp.bank_other ? (
                          <div>
                            <span className="text-[11px] text-[#161B26] font-mono block font-bold">
                              {emp.bank_other.split('\n')[0]}
                            </span>
                            <span className="text-[9px] text-[#78716C] block mt-0.5">Rekening Lain</span>
                          </div>
                        ) : (
                          <span className="text-[#78716C] italic text-[11px]">— Belum diisi —</span>
                        )}
                      </td>

                      {/* 5. Join Date & Masa Kerja & Saldo Cuti */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="font-mono text-xs font-bold text-[#161B26]">
                          {formatDateIndo(emp.join_date)}
                        </div>
                        {calculateTenure(emp.join_date) && (
                          <div className="text-[10px] text-amber-800 font-semibold mt-0.5 whitespace-nowrap">
                            • {calculateTenure(emp.join_date)} kerja
                          </div>
                        )}
                        <div className="text-[10px] font-bold text-emerald-700 mt-0.5 whitespace-nowrap">
                          Sisa Cuti: {emp.annual_leave_quota} hari
                        </div>
                      </td>

                      {/* 6. Actions (Leluasa & Rapi) */}
                      <td className="py-3.5 px-4 align-middle text-right pr-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-2">
                          {/* Digital ID Card */}
                          <button
                            type="button"
                            onClick={() => setSelectedIdCardEmployee(emp)}
                            className="p-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 transition-colors shadow-2xs cursor-pointer"
                            title="Buka Kartu Pegawai Digital & QR Code"
                          >
                            <CreditCard className="w-3.5 h-3.5 text-amber-700" />
                          </button>

                          {/* Dossier / Edit */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEditEmployee(emp);
                              setIsEditModalOpen(true);
                            }}
                            className="p-2 rounded-xl border border-[#E6DFD3] bg-white hover:bg-[#FAF8F5] text-[#161B26] transition-colors shadow-2xs cursor-pointer group"
                            title="Buka & Edit Dossier Lengkap"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-[#78716C] group-hover:text-amber-700" />
                          </button>

                          {/* Archive / Restore */}
                          {emp.is_active === false ? (
                            <button
                              type="button"
                              onClick={() => handleRestore(emp.id, emp.full_name)}
                              className="p-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors cursor-pointer"
                              title="Pulihkan Karyawan"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleArchive(emp.id, emp.full_name)}
                              className="p-2 rounded-xl border border-[#E6DFD3] hover:bg-rose-50 hover:text-rose-700 text-[#78716C] transition-colors cursor-pointer"
                              title="Arsipkan Karyawan"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Floating Bulk Action Bar */}
        {selectedEmployeeIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#161B26] text-white px-5 py-3 rounded-2xl shadow-2xl border border-amber-500/40 flex items-center space-x-4 animate-in slide-in-from-bottom duration-200 text-xs font-sans">
            <div className="flex items-center space-x-2 border-r border-slate-700 pr-4">
              <span className="w-6 h-6 rounded-full bg-amber-500 text-[#161B26] font-bold flex items-center justify-center text-xs">
                {selectedEmployeeIds.size}
              </span>
              <span className="font-bold">Karyawan Terpilih</span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-slate-400 font-medium">Ubah Shift Massal:</span>
              <select
                value={bulkShiftId}
                onChange={(e) => setBulkShiftId(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-amber-400 font-semibold cursor-pointer"
              >
                <option value="">Pilih Shift Baru...</option>
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.start_time} - {s.end_time})
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!bulkShiftId || isBulkUpdating}
                onClick={handleBulkShiftUpdate}
                className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-[#161B26] font-bold transition-colors cursor-pointer flex items-center space-x-1"
              >
                {isBulkUpdating ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Terapkan</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setSelectedEmployeeIds(new Set())}
              className="text-slate-400 hover:text-white transition-colors text-xs font-semibold underline underline-offset-2 cursor-pointer ml-2"
            >
              Batalkan
            </button>
          </div>
        )}
      </div>

      {/* 5. Modals: Edit Employee Modal */}
      {isEditModalOpen && selectedEditEmployee && (
        <EditEmployeeModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedEditEmployee(null);
          }}
          employee={selectedEditEmployee}
          offices={offices}
          shifts={shifts}
          onSaved={() => loadData()}
          onArchive={handleArchive}
          onRestore={handleRestore}
        />
      )}

      {/* 6. Modals: Digital ID Card Modal */}
      {selectedIdCardEmployee && (
        <DigitalIdCardModal
          isOpen={!!selectedIdCardEmployee}
          onClose={() => setSelectedIdCardEmployee(null)}
          employee={selectedIdCardEmployee}
        />
      )}

      {/* 7. Modals: Excel Bulk Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-[#E6DFD3] shadow-2xl p-6 space-y-4 font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6DFD3]">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#161B26]">Import Master Karyawan Team PGE</h3>
                  <p className="text-xs text-[#78716C]">Sinkronkan data dari file Excel resmi</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 rounded-lg text-[#78716C] hover:text-[#161B26] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {importError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-bold">
                {importError}
              </div>
            )}

            {importResult && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                <p className="font-bold text-emerald-800">{importResult.message}</p>
                <p>Total Baris: {importResult.totalRows} • Baru Ditambahkan: {importResult.createdCount} • Diperbarui: {importResult.updatedCount}</p>
              </div>
            )}

            <div className="space-y-3">
              <label className="block text-xs font-bold text-[#161B26]">Pilih File Excel (.xlsx)</label>
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-[#78716C] file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border file:border-[#E6DFD3] file:bg-[#FAF8F5] file:text-xs file:font-bold file:text-[#161B26] hover:file:bg-[#F5EFE6] cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E6DFD3]">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#E6DFD3] text-xs font-bold text-[#57534E] hover:bg-[#FAF8F5] cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                disabled={isImporting}
                onClick={() => triggerExcelImport(false)}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isImporting ? 'Mengimpor...' : 'Mulai Import Excel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Modals: Add New Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-[#E6DFD3] shadow-2xl p-6 space-y-4 my-8 font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6DFD3]">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-amber-600" />
                <h3 className="font-black text-base text-[#161B26]">Tambah Karyawan Baru</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-[#FAF8F5] text-[#78716C] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#161B26] mb-1">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso"
                  value={newEmpName}
                  onChange={(e) => setNewEmpName(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl px-3 py-2 font-bold text-[#161B26] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#161B26] mb-1">
                    NIK / No. Induk Pegawai
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 210703"
                    value={newEmpIdNumber}
                    onChange={(e) => setNewEmpIdNumber(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl px-3 py-2 font-mono font-bold text-[#161B26] focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#161B26] mb-1">Nama Panggilan</label>
                  <input
                    type="text"
                    placeholder="Budi"
                    value={newEmpNickname}
                    onChange={(e) => setNewEmpNickname(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl px-3 py-2 font-bold text-[#161B26] focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#161B26] mb-1">
                    Email Login <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="budi@pge.co.id"
                    value={newEmpEmail}
                    onChange={(e) => setNewEmpEmail(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl px-3 py-2 text-[#161B26] focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#161B26] mb-1">
                    Password Awal <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newEmpPassword}
                    onChange={(e) => setNewEmpPassword(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl px-3 py-2 font-mono text-[#161B26] focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#161B26] mb-1">Departemen</label>
                  <input
                    type="text"
                    placeholder="Produksi / Sales"
                    value={newEmpDept}
                    onChange={(e) => setNewEmpDept(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl px-3 py-2 font-bold text-[#161B26] focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#161B26] mb-1">Jabatan / Posisi</label>
                  <input
                    type="text"
                    placeholder="Staff / Koordinator"
                    value={newEmpPosition}
                    onChange={(e) => setNewEmpPosition(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl px-3 py-2 font-bold text-[#161B26] focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#161B26] mb-1">Kantor Penugasan</label>
                  <select
                    value={newEmpOfficeId}
                    onChange={(e) => setNewEmpOfficeId(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl px-3 py-2 font-bold text-[#161B26] focus:outline-none focus:border-amber-500"
                  >
                    {offices.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#161B26] mb-1">Shift Kerja</label>
                  <select
                    value={newEmpShiftId}
                    onChange={(e) => setNewEmpShiftId(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl px-3 py-2 font-bold text-[#161B26] focus:outline-none focus:border-amber-500"
                  >
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.start_time}-{s.end_time})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#161B26] mb-1">Role Akun</label>
                  <select
                    value={newEmpRole}
                    onChange={(e) => setNewEmpRole(e.target.value as any)}
                    className="w-full bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl px-3 py-2 font-bold text-[#161B26] focus:outline-none focus:border-amber-500"
                  >
                    <option value="EMPLOYEE">EMPLOYEE (Karyawan Biasa)</option>
                    <option value="MANAGER">MANAGER (Approver / Supervisor)</option>
                    <option value="ADMIN">ADMIN (Hak Akses Penuh)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#161B26] mb-1">Kuota Cuti Tahunan</label>
                  <input
                    type="number"
                    value={newEmpQuota}
                    onChange={(e) => setNewEmpQuota(Number(e.target.value))}
                    className="w-full bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl px-3 py-2 font-mono font-bold text-[#161B26] focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="newEmpWfh"
                  checked={newEmpWfh}
                  onChange={(e) => setNewEmpWfh(e.target.checked)}
                  className="rounded border-[#E6DFD3] text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="newEmpWfh" className="text-xs font-bold text-[#161B26] cursor-pointer">
                  Izinkan absensi WFH / Remote dari luar kantor
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E6DFD3]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E8DFD0] text-xs font-bold text-[#57534E] hover:bg-[#FAF8F5] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCreatingEmployee}
                  className="px-5 py-2.5 rounded-xl bg-[#161B26] hover:bg-[#222938] text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-[#D97706]" />
                  <span>{isCreatingEmployee ? 'Menyimpan...' : 'Simpan Karyawan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
