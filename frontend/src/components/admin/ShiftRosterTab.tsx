'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ApiClient } from '../../lib/api';
import { Shift, Employee } from '../../types';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  Users,
  Clock,
  Sparkles,
  CheckCircle2,
  X,
  RefreshCw,
  AlertCircle,
  Plus,
  RotateCcw,
  Sun,
  Sunset,
  Moon,
  Coffee,
  Check,
  Star,
  Layers,
  Building2,
  ArrowRight,
  Info,
} from 'lucide-react';

interface RosterEmployee extends Employee {
  shift_rosters: Array<{
    id: string;
    date: string;
    shift_id: string;
    notes?: string | null;
    shift: Shift;
  }>;
}

export function ShiftRosterTab() {
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 9, 1)); // October 2026 default
  const [employees, setEmployees] = useState<RosterEmployee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');

  // Single Day Edit Popover State
  const [selectedCell, setSelectedCell] = useState<{
    employee: RosterEmployee;
    dateStr: string;
    dayNum: number;
    currentShift?: Shift | null;
    isOverride: boolean;
  } | null>(null);

  // Bulk Assign Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkShiftId, setBulkShiftId] = useState('');
  const [bulkDept, setBulkDept] = useState('ALL');
  const [bulkStartDate, setBulkStartDate] = useState('');
  const [bulkEndDate, setBulkEndDate] = useState('');
  const [bulkNotes, setBulkNotes] = useState('');
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1 to 12

  // Total days in current month
  const daysInMonth = useMemo(() => {
    return new Date(year, month, 0).getDate();
  }, [year, month]);

  const loadRoster = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await ApiClient.getMonthlyRoster(year, month, departmentFilter);
      setEmployees(data.employees as any);
      setShifts(data.shifts);
      if (data.shifts.length > 0 && !bulkShiftId) {
        setBulkShiftId(data.shifts[0].id);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memuat jadwal roster shift.');
    } finally {
      setIsLoading(false);
    }
  }, [year, month, departmentFilter, bulkShiftId]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  // Unique departments with employee counts
  const departmentsWithCounts = useMemo(() => {
    const map = new Map<string, number>();
    employees.forEach((e) => {
      const dept = e.department || 'Umum';
      map.set(dept, (map.get(dept) || 0) + 1);
    });
    return Array.from(map.entries()).map(([dept, count]) => ({ dept, count }));
  }, [employees]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        emp.full_name.toLowerCase().includes(q) ||
        (emp.nickname && emp.nickname.toLowerCase().includes(q)) ||
        (emp.employee_id_number && emp.employee_id_number.toLowerCase().includes(q)) ||
        (emp.position && emp.position.toLowerCase().includes(q));

      const matchDept = departmentFilter === 'ALL' || emp.department === departmentFilter;

      return matchSearch && matchDept;
    });
  }, [employees, searchTerm, departmentFilter]);

  // Total Overrides count this month
  const totalOverridesCount = useMemo(() => {
    let count = 0;
    employees.forEach((emp) => {
      count += (emp.shift_rosters || []).length;
    });
    return count;
  }, [employees]);

  // Month navigation
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const monthName = currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  // Handle single cell shift update
  const handleUpdateCellShift = async (newShiftId: string) => {
    if (!selectedCell) return;
    try {
      await ApiClient.assignRoster({
        employee_ids: [selectedCell.employee.id],
        shift_id: newShiftId,
        start_date: selectedCell.dateStr,
        end_date: selectedCell.dateStr,
      });
      setSelectedCell(null);
      await loadRoster();
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah shift.');
    }
  };

  // Handle reset single cell to default shift
  const handleResetCell = async () => {
    if (!selectedCell) return;
    try {
      await ApiClient.resetRoster({
        employee_id: selectedCell.employee.id,
        date: selectedCell.dateStr,
      });
      setSelectedCell(null);
      await loadRoster();
    } catch (err: any) {
      alert(err.message || 'Gagal mereset shift.');
    }
  };

  // Handle bulk shift assignment
  const handleBulkAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkShiftId || !bulkStartDate || !bulkEndDate) {
      setErrorMsg('Pilih shift dan rentang tanggal penugasan.');
      return;
    }

    setIsSubmittingBulk(true);
    setBulkSuccessMsg(null);

    try {
      const targetEmployees = employees.filter(
        (emp) => bulkDept === 'ALL' || emp.department === bulkDept
      );
      const empIds = targetEmployees.map((e) => e.id);

      if (empIds.length === 0) {
        throw new Error('Tidak ada karyawan di departemen yang dipilih.');
      }

      const res = await ApiClient.assignRoster({
        employee_ids: empIds,
        shift_id: bulkShiftId,
        start_date: bulkStartDate,
        end_date: bulkEndDate,
        notes: bulkNotes.trim() || undefined,
      });

      setBulkSuccessMsg(res.message);
      await loadRoster();
      setTimeout(() => {
        setIsBulkModalOpen(false);
        setBulkSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menugaskan roster shift massal.');
    } finally {
      setIsSubmittingBulk(false);
    }
  };

  // Shift badge styling helper
  const getShiftVisual = (name: string, isOverride: boolean) => {
    const n = (name || '').toLowerCase();
    if (n.includes('pagi') || n.includes('morning') || n.includes('reguler')) {
      return {
        label: 'Pagi',
        short: '09-18',
        bg: isOverride
          ? 'bg-emerald-600 text-white font-bold shadow-2xs ring-1 ring-emerald-700'
          : 'bg-emerald-50 text-emerald-800 border border-emerald-200/90 font-semibold',
        dot: 'bg-emerald-500',
      };
    }
    if (n.includes('siang') || n.includes('middle') || n.includes('afternoon')) {
      return {
        label: 'Siang',
        short: '13-21',
        bg: isOverride
          ? 'bg-amber-600 text-white font-bold shadow-2xs ring-1 ring-amber-700'
          : 'bg-amber-50 text-amber-800 border border-amber-200/90 font-semibold',
        dot: 'bg-amber-500',
      };
    }
    if (n.includes('malam') || n.includes('night')) {
      return {
        label: 'Malam',
        short: '21-05',
        bg: isOverride
          ? 'bg-purple-600 text-white font-bold shadow-2xs ring-1 ring-purple-700'
          : 'bg-purple-50 text-purple-800 border border-purple-200/90 font-semibold',
        dot: 'bg-purple-500',
      };
    }
    if (n.includes('off') || n.includes('libur')) {
      return {
        label: 'Libur',
        short: 'OFF',
        bg: isOverride
          ? 'bg-slate-700 text-white font-bold shadow-2xs'
          : 'bg-[#F5EFE6] text-[#78716C] border border-[#E6DFD3] font-medium',
        dot: 'bg-slate-400',
      };
    }
    return {
      label: name || 'Shift',
      short: (name || 'SFT').slice(0, 5),
      bg: isOverride
        ? 'bg-[#161B26] text-white font-bold shadow-2xs'
        : 'bg-slate-100 text-slate-800 border border-slate-200 font-semibold',
      dot: 'bg-slate-500',
    };
  };

  // Daily coverage statistics (headcount per day)
  const dailyCoverage = useMemo(() => {
    const result: Array<{
      dayNum: number;
      totalActive: number;
      pagiCount: number;
      siangCount: number;
      malamCount: number;
      offCount: number;
    }> = [];

    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      let pagi = 0;
      let siang = 0;
      let malam = 0;
      let off = 0;
      let total = 0;

      filteredEmployees.forEach((emp) => {
        const override = emp.shift_rosters?.find((r) => {
          const rDate = new Date(r.date);
          return (
            rDate.getUTCFullYear() === year &&
            rDate.getUTCMonth() === month - 1 &&
            rDate.getUTCDate() === dayNum
          );
        });
        const activeShift = override ? override.shift : emp.shift;
        if (!activeShift) {
          off++;
          return;
        }
        const sName = activeShift.name.toLowerCase();
        if (sName.includes('pagi') || sName.includes('morning') || sName.includes('reguler')) {
          pagi++;
          total++;
        } else if (sName.includes('siang') || sName.includes('middle')) {
          siang++;
          total++;
        } else if (sName.includes('malam') || sName.includes('night')) {
          malam++;
          total++;
        } else if (sName.includes('off') || sName.includes('libur')) {
          off++;
        } else {
          pagi++;
          total++;
        }
      });

      result.push({
        dayNum,
        totalActive: total,
        pagiCount: pagi,
        siangCount: siang,
        malamCount: malam,
        offCount: off,
      });
    }
    return result;
  }, [daysInMonth, filteredEmployees, year, month]);

  return (
    <div className="space-y-4 font-sans text-[#161B26]">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#161B26] tracking-tight flex items-center space-x-2">
            <CalendarDays className="w-5 h-5 text-amber-600" />
            <span>Roster Penugasan Shift Bulanan</span>
          </h2>
          <p className="text-xs text-[#78716C] mt-0.5">
            Plotting shift kerja personil secara granular per tanggal kalender untuk sinkronisasi presensi otomatis
          </p>
        </div>

        <div className="flex items-center space-x-2.5 flex-wrap">
          {/* Month Navigator */}
          <div className="flex items-center bg-white border border-[#E6DFD3] rounded-xl p-1 shadow-2xs">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-[#FAF8F5] text-[#57534E] hover:text-[#161B26] transition-colors cursor-pointer"
              title="Bulan Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-[#161B26] capitalize min-w-[130px] text-center">
              {monthName}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-[#FAF8F5] text-[#57534E] hover:text-[#161B26] transition-colors cursor-pointer"
              title="Bulan Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleCurrentMonth}
            className="px-3 py-1.5 rounded-xl border border-[#E6DFD3] bg-white hover:bg-[#FAF8F5] text-[#161B26] text-xs font-bold transition-colors cursor-pointer shadow-2xs"
          >
            Bulan Ini
          </button>

          {/* Bulk Assign Button */}
          <button
            type="button"
            onClick={() => {
              const defaultStart = `${year}-${String(month).padStart(2, '0')}-01`;
              const defaultEnd = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
              setBulkStartDate(defaultStart);
              setBulkEndDate(defaultEnd);
              setBulkSuccessMsg(null);
              setIsBulkModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-[#161B26] hover:bg-[#222938] text-white text-xs font-bold flex items-center space-x-2 transition-all shadow-xs border border-[#161B26] cursor-pointer active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
            <span>+ Plotting Shift Massal</span>
          </button>
        </div>
      </div>

      {/* 2. Compact Metric Ribbon (Morning Luxury Theme) */}
      <div className="bg-[#FAF8F5] border border-[#E6DFD3] rounded-2xl px-4 py-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {/* Metric 1: Total Employees */}
          <div className="flex items-center space-x-2">
            <span className="text-[#78716C] font-medium">Total Personil:</span>
            <span className="font-mono font-black text-sm text-[#161B26]">{employees.length}</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
              Pegawai Aktif
            </span>
          </div>

          {/* Metric 2: Departemen */}
          <div className="flex items-center space-x-2">
            <span className="text-[#78716C] font-medium">Departemen:</span>
            <span className="font-mono font-black text-sm text-amber-600">
              {departmentsWithCounts.length}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
              Unit Kerja
            </span>
          </div>

          {/* Metric 3: Active Shifts */}
          <div className="flex items-center space-x-2">
            <span className="text-[#78716C] font-medium">Shift Tersedia:</span>
            <span className="font-mono font-black text-sm text-emerald-700">{shifts.length}</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
              Pilihan Shift
            </span>
          </div>

          {/* Metric 4: Override Roster */}
          <div className="flex items-center space-x-2">
            <span className="text-[#78716C] font-medium">Override Khusus:</span>
            <span className="font-mono font-black text-sm text-purple-700">
              {totalOverridesCount}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200">
              Plotting Manual
            </span>
          </div>
        </div>

        {/* Legend Ribbon */}
        <div className="flex items-center space-x-3 text-[10px] font-semibold text-[#57534E]">
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            <span>Pagi (09-18)</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
            <span>Siang (13-21)</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block"></span>
            <span>Malam (21-05)</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block"></span>
            <span>Libur (OFF)</span>
          </span>
          <span className="flex items-center space-x-1 text-amber-700 font-bold">
            <Star className="w-3 h-3 fill-amber-500 text-amber-600" />
            <span>Override</span>
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

        {/* Individual Department Chips */}
        {departmentsWithCounts.map(({ dept, count }) => {
          const isActive = departmentFilter === dept;
          return (
            <button
              key={dept}
              type="button"
              onClick={() => setDepartmentFilter(dept)}
              className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex-shrink-0 ${
                isActive
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white hover:bg-[#FAF8F5] text-[#57534E] border border-[#E6DFD3]'
              }`}
            >
              <span>{dept}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive ? 'bg-amber-700/80 text-white' : 'bg-slate-100 text-[#78716C]'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. Search and Table Container */}
      <div className="bg-white border border-[#E6DFD3] rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full max-w-sm">
            <Search className="w-3.5 h-3.5 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari personil nama / NIK..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#E6DFD3] text-xs font-medium focus:outline-none focus:border-amber-500 bg-[#FAF8F5]"
            />
          </div>

          <div className="flex items-center space-x-2 text-xs text-[#78716C]">
            <Info className="w-3.5 h-3.5 text-amber-600" />
            <span>Klik sel tanggal mana pun untuk mengubah jadwal shift harian</span>
          </div>
        </div>

        {/* Matrix Calendar Table */}
        <div className="overflow-x-auto rounded-xl border border-[#E6DFD3] relative max-h-[640px]">
          {isLoading ? (
            <div className="p-12 text-center text-[#78716C] text-xs flex flex-col items-center">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-600 mb-2" />
              <span className="font-bold">Memuat kalender roster shift {monthName}...</span>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="p-12 text-center text-[#78716C] text-xs space-y-2">
              <Users className="w-8 h-8 text-[#78716C]/40 mx-auto" />
              <p className="font-bold text-sm text-[#161B26]">Tidak ada personil yang sesuai filter.</p>
              <p className="text-[11px]">Coba sesuaikan kata kunci pencarian atau filter divisi.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#F5EFE6] text-[#44403C] uppercase text-[10px] tracking-wider font-extrabold border-b border-[#E6DFD3] sticky top-0 z-20">
                <tr>
                  {/* Sticky Employee Column Header */}
                  <th className="py-3 px-3.5 min-w-[210px] sticky left-0 bg-[#F5EFE6] z-30 border-r border-[#E6DFD3]">
                    Personil & Jabatan
                  </th>

                  {/* Day Column Headers */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const dateObj = new Date(year, month - 1, dayNum);
                    const dayOfWeek = dateObj.getDay(); // 0: Min, 6: Sab
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

                    return (
                      <th
                        key={dayNum}
                        className={`py-2 px-1 min-w-[46px] text-center border-r border-[#E6DFD3] ${
                          isWeekend ? 'bg-amber-100/70 text-amber-950 font-black' : 'text-[#44403C]'
                        }`}
                      >
                        <span className="text-[11px] font-black block leading-none">{dayNum}</span>
                        <span className="text-[8px] font-bold block mt-0.5 uppercase opacity-75">
                          {dayNames[dayOfWeek]}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E6DFD3]">
                {filteredEmployees.map((emp) => {
                  const initials = emp.nickname
                    ? emp.nickname.slice(0, 2).toUpperCase()
                    : emp.full_name.slice(0, 2).toUpperCase();

                  return (
                    <tr key={emp.id} className="hover:bg-[#FAF8F5] transition-colors">
                      {/* Sticky Employee Info Cell */}
                      <td className="py-2.5 px-3 sticky left-0 bg-white z-10 border-r border-[#E6DFD3] shadow-xs">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#161B26] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0 pr-1">
                            <span className="font-bold text-[#161B26] block truncate max-w-[140px] text-xs">
                              {emp.full_name}
                            </span>
                            <div className="flex items-center space-x-1.5 text-[10px] text-[#78716C] font-mono mt-0.5">
                              {emp.employee_id_number && (
                                <span className="font-bold text-[#161B26] bg-[#FAF8F5] border border-[#E6DFD3] px-1 rounded">
                                  {emp.employee_id_number}
                                </span>
                              )}
                              <span className="truncate max-w-[85px]">{emp.position}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Day Shift Cells */}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const dayNum = i + 1;
                        const dateObj = new Date(year, month - 1, dayNum);
                        const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

                        // Check override for this date
                        const override = emp.shift_rosters?.find((r) => {
                          const rDate = new Date(r.date);
                          return (
                            rDate.getUTCFullYear() === year &&
                            rDate.getUTCMonth() === month - 1 &&
                            rDate.getUTCDate() === dayNum
                          );
                        });

                        const activeShift = override ? override.shift : emp.shift;
                        const isOverride = !!override;
                        const visual = activeShift
                          ? getShiftVisual(activeShift.name, isOverride)
                          : null;

                        return (
                          <td
                            key={dayNum}
                            onClick={() => {
                              setSelectedCell({
                                employee: emp,
                                dateStr,
                                dayNum,
                                currentShift: activeShift,
                                isOverride,
                              });
                            }}
                            className={`p-1 text-center border-r border-[#E6DFD3]/60 cursor-pointer transition-all hover:bg-amber-100/60 ${
                              isWeekend ? 'bg-amber-50/40' : ''
                            }`}
                            title={`Klik untuk ubah: ${emp.full_name} (${dayNum} ${monthName})`}
                          >
                            {activeShift && visual ? (
                              <div
                                className={`text-[9px] py-1 px-1 rounded-md text-center truncate flex items-center justify-center space-x-0.5 transition-transform hover:scale-105 ${visual.bg}`}
                                title={`${activeShift.name} (${activeShift.start_time} - ${activeShift.end_time})${isOverride ? ' [Override Manual]' : ''}`}
                              >
                                {isOverride && (
                                  <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-200 shrink-0" />
                                )}
                                <span>{visual.short}</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-[#78716C]/40 font-mono">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>

              {/* Sticky Summary Row at Foot of Table (Daily Headcount) */}
              <tfoot className="bg-[#FAF8F5] border-t-2 border-[#E6DFD3] font-bold text-xs sticky bottom-0 z-20">
                <tr>
                  <td className="py-2.5 px-3 sticky left-0 bg-[#FAF8F5] z-30 border-r border-[#E6DFD3]">
                    <div className="flex items-center space-x-1.5 text-xs text-[#161B26]">
                      <Layers className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Standby Harian</span>
                    </div>
                    <span className="text-[10px] text-[#78716C] font-normal block">
                      Total personil shift masuk
                    </span>
                  </td>

                  {dailyCoverage.map((col) => {
                    return (
                      <td
                        key={col.dayNum}
                        className="py-2 px-1 text-center border-r border-[#E6DFD3] align-middle"
                        title={`Tgl ${col.dayNum}: ${col.totalActive} Personil Masuk (Pagi: ${col.pagiCount}, Siang: ${col.siangCount}, Malam: ${col.malamCount}, Libur: ${col.offCount})`}
                      >
                        <span className="font-mono text-xs font-black text-[#161B26] block">
                          {col.totalActive}
                        </span>
                        <div className="flex items-center justify-center space-x-0.5 mt-0.5">
                          {col.pagiCount > 0 && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                          )}
                          {col.siangCount > 0 && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                          )}
                          {col.malamCount > 0 && (
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-600 inline-block" />
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      {/* 5. Single Cell Shift Edit Popover Modal */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-[#E6DFD3] shadow-2xl p-5 space-y-4 font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6DFD3]">
              <div>
                <h4 className="font-bold text-sm text-[#161B26]">Plotting Shift Tanggal Ini</h4>
                <p className="text-xs text-[#78716C] font-medium mt-0.5">
                  {selectedCell.employee.full_name}
                </p>
                <div className="flex items-center space-x-1.5 text-[11px] text-amber-700 font-mono font-bold mt-1">
                  <CalendarDays className="w-3 h-3 text-amber-600" />
                  <span>
                    Tanggal {selectedCell.dayNum} {monthName}
                  </span>
                  {selectedCell.isOverride && (
                    <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 text-[9px] font-bold">
                      Override
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                className="p-1.5 rounded-lg text-[#78716C] hover:bg-[#FAF8F5] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-[#57534E] block mb-1">
                Pilih Shift Pengganti:
              </span>
              {shifts.map((s) => {
                const isSelected = selectedCell.currentShift?.id === s.id;
                const visual = getShiftVisual(s.name, false);

                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleUpdateCellShift(s.id)}
                    className={`w-full p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-600 bg-amber-50 text-amber-950 shadow-2xs'
                        : 'border-[#E6DFD3] hover:bg-[#FAF8F5] text-[#161B26]'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${visual.dot}`} />
                      <div>
                        <span className="block font-bold">{s.name}</span>
                        <span className="text-[10px] text-[#78716C] font-mono">
                          {s.start_time} - {s.end_time} (toleransi {s.grace_period_minutes}m)
                        </span>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-amber-600 shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-[#E6DFD3] flex items-center justify-between">
              {selectedCell.isOverride ? (
                <button
                  type="button"
                  onClick={handleResetCell}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center space-x-1 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset ke Standar</span>
                </button>
              ) : (
                <span className="text-[10px] text-[#78716C] italic">Menggunakan shift standar</span>
              )}

              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#57534E] hover:bg-[#FAF8F5] cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Bulk Assign Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full border border-[#E6DFD3] shadow-2xl p-6 space-y-4 font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6DFD3]">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#161B26] text-white flex items-center justify-center font-bold shadow-xs">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#161B26]">Penugasan Roster Shift Massal</h3>
                  <p className="text-xs text-[#78716C]">Tugaskan shift ke satu divisi sekaligus</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="p-1.5 rounded-lg text-[#78716C] hover:bg-[#FAF8F5] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {bulkSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center space-x-2 font-bold animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{bulkSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleBulkAssign} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-[#44403C] block mb-1">
                  Departemen / Divisi Target
                </label>
                <select
                  value={bulkDept}
                  onChange={(e) => setBulkDept(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E6DFD3] bg-[#FAF8F5] font-semibold text-[#161B26] focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="ALL">Semua Departemen ({employees.length} Personil)</option>
                  {departmentsWithCounts.map(({ dept, count }) => (
                    <option key={dept} value={dept}>
                      {dept} ({count} Personil)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#44403C] block mb-1">
                  Shift yang Ditugaskan
                </label>
                <select
                  value={bulkShiftId}
                  onChange={(e) => setBulkShiftId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E6DFD3] bg-[#FAF8F5] font-semibold text-[#161B26] focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.start_time} - {s.end_time})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[#44403C] block mb-1">
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    required
                    value={bulkStartDate}
                    onChange={(e) => setBulkStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E6DFD3] bg-[#FAF8F5] font-mono text-[#161B26] focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#44403C] block mb-1">
                    Tanggal Selesai
                  </label>
                  <input
                    type="date"
                    required
                    value={bulkEndDate}
                    onChange={(e) => setBulkEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E6DFD3] bg-[#FAF8F5] font-mono text-[#161B26] focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#44403C] block mb-1">
                  Catatan Penugasan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lembur Produksi Batch 2 atau Jadwal Weekend"
                  value={bulkNotes}
                  onChange={(e) => setBulkNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E6DFD3] bg-[#FAF8F5] text-[#161B26] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-[#E6DFD3] flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#57534E] hover:bg-[#FAF8F5] cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBulk}
                  className="px-5 py-2.5 rounded-xl bg-[#161B26] hover:bg-[#222938] text-white text-xs font-bold flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer shadow-xs transition-all active:scale-95"
                >
                  {isSubmittingBulk ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#D97706]" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#D97706]" />
                  )}
                  <span>Tugaskan Roster Shift</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}