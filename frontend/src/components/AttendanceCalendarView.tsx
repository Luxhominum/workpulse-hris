'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { AttendanceRecord, Shift, Employee } from '../types';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Camera,
  CheckCircle2,
  AlertTriangle,
  History,
  FileText,
  CalendarDays,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Filter,
  TrendingUp,
  Building2,
  ArrowUpRight,
} from 'lucide-react';
import { resolveMediaUrl, ApiClient } from '../lib/api';
import { HapticFeedback } from '../lib/haptics';

interface AttendanceCalendarViewProps {
  history: AttendanceRecord[];
  currentMonth: string; // YYYY-MM
  onMonthChange: (month: string) => void;
  onSelectPhoto: (photoUrl: string, title: string) => void;
  onNavigateToLeaves?: () => void;
  user?: Employee | null;
}

export function AttendanceCalendarView({
  history,
  currentMonth,
  onMonthChange,
  onSelectPhoto,
  onNavigateToLeaves,
  user,
}: AttendanceCalendarViewProps) {
  // Top-level View Mode: 'roster' (Jadwal Shift Roster) vs 'history' (Feed Mutasi Kehadiran)
  const [subTab, setSubTab] = useState<'roster' | 'history'>('roster');
  const [isFullMonthExpanded, setIsFullMonthExpanded] = useState<boolean>(false);
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'LATE' | 'WFH'>('ALL');

  // Schedule Roster state
  const [scheduleData, setScheduleData] = useState<{
    defaultShift: Shift | null;
    rosterOverrides: Array<{
      id: string;
      date: string;
      shift_id: string;
      shift: Shift;
    }>;
  } | null>(null);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState<boolean>(false);

  // Parse current year and month
  const [year, month] = useMemo(() => {
    const [y, m] = currentMonth.split('-').map(Number);
    return [y, m];
  }, [currentMonth]);

  // Selected date inside current month
  const [selectedDateStr, setSelectedDateStr] = useState<string>(`${currentMonth}-01`);

  useEffect(() => {
    const today = new Date();
    const todayMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    if (todayMonth === currentMonth) {
      setSelectedDateStr(today.toISOString().split('T')[0]);
    }
  }, [currentMonth]);

  // Load personal schedule for the month
  useEffect(() => {
    let isMounted = true;
    const fetchSchedule = async () => {
      const token = ApiClient.getToken();
      if (!token) return;
      setIsLoadingSchedule(true);
      try {
        const data = await ApiClient.getMyRosterSchedule(year, month);
        if (isMounted) setScheduleData(data);
      } catch {
        if (isMounted) setScheduleData(null);
      } finally {
        if (isMounted) setIsLoadingSchedule(false);
      }
    };
    fetchSchedule();
    return () => {
      isMounted = false;
    };
  }, [year, month]);

  // Map Attendance records by Date string 'YYYY-MM-DD'
  const recordMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    history.forEach((rec) => {
      const dStr = rec.date ? rec.date.split('T')[0] : '';
      if (dStr) {
        map.set(dStr, rec);
      }
    });
    return map;
  }, [history]);

  // Map Roster overrides by Date string 'YYYY-MM-DD'
  const rosterMap = useMemo(() => {
    const map = new Map<string, Shift>();
    if (scheduleData?.rosterOverrides) {
      scheduleData.rosterOverrides.forEach((roster) => {
        const dStr = roster.date ? roster.date.split('T')[0] : '';
        if (dStr && roster.shift) {
          map.set(dStr, roster.shift);
        }
      });
    }
    return map;
  }, [scheduleData]);

  // Helper to get assigned shift for a specific date
  const getShiftForDate = (dateStr: string, dayNum: number) => {
    if (rosterMap.has(dateStr)) {
      return rosterMap.get(dateStr);
    }
    const dObj = new Date(year, month - 1, dayNum);
    if (dObj.getDay() === 0) {
      return null; // OFF day
    }
    return scheduleData?.defaultShift || user?.shift || null;
  };

  // Monthly summary stats
  const stats = useMemo(() => {
    let onTime = 0;
    let late = 0;
    let totalLateMinutes = 0;
    let wfh = 0;
    let totalWorkMinutes = 0;

    history.forEach((rec) => {
      if (rec.status === 'ON_TIME' || rec.status === 'HADIR_BUKAN_HARI_KERJA') {
        onTime++;
      } else if (rec.status === 'LATE') {
        late++;
        totalLateMinutes += rec.late_minutes;
      } else if (rec.status === 'WFH') {
        wfh++;
      }

      if (rec.clock_in_time && rec.clock_out_time) {
        const inMs = new Date(rec.clock_in_time).getTime();
        const outMs = new Date(rec.clock_out_time).getTime();
        if (outMs > inMs) {
          totalWorkMinutes += Math.round((outMs - inMs) / 60000);
        }
      }
    });

    const workHours = Math.floor(totalWorkMinutes / 60);
    const workMinutesRem = totalWorkMinutes % 60;

    const totalPresent = onTime + late + wfh;
    const disciplineScore = totalPresent > 0 ? Math.round((onTime / totalPresent) * 100) : 100;

    return {
      totalPresent,
      onTime,
      late,
      totalLateMinutes,
      wfh,
      disciplineScore,
      workHoursStr: `${workHours}j ${workMinutesRem}m`,
    };
  }, [history]);

  // Filtered History for Chronological Feed
  const filteredHistory = useMemo(() => {
    return [...history]
      .filter((rec) => {
        if (historyFilter === 'LATE') return rec.status === 'LATE';
        if (historyFilter === 'WFH') return rec.status === 'WFH';
        return true;
      })
      .sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      });
  }, [history, historyFilter]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    HapticFeedback.tick();
    const prevDate = new Date(year, month - 2, 1);
    const yStr = prevDate.getFullYear();
    const mStr = String(prevDate.getMonth() + 1).padStart(2, '0');
    onMonthChange(`${yStr}-${mStr}`);
    setSelectedDateStr(`${yStr}-${mStr}-01`);
  };

  const handleNextMonth = () => {
    HapticFeedback.tick();
    const nextDate = new Date(year, month, 1);
    const yStr = nextDate.getFullYear();
    const mStr = String(nextDate.getMonth() + 1).padStart(2, '0');
    onMonthChange(`${yStr}-${mStr}`);
    setSelectedDateStr(`${yStr}-${mStr}-01`);
  };

  const handleResetToday = () => {
    HapticFeedback.tap();
    const today = new Date();
    const yStr = today.getFullYear();
    const mStr = String(today.getMonth() + 1).padStart(2, '0');
    const todayMonth = `${yStr}-${mStr}`;
    onMonthChange(todayMonth);
    setSelectedDateStr(today.toISOString().split('T')[0]);
  };

  const monthLabel = useMemo(() => {
    const d = new Date(year, month - 1, 1);
    return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  }, [year, month]);

  const selectedDateLabel = useMemo(() => {
    const d = new Date(selectedDateStr + 'T00:00:00');
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [selectedDateStr]);

  const selectedDayShift = useMemo(() => {
    const [y, m, d] = selectedDateStr.split('-').map(Number);
    return getShiftForDate(selectedDateStr, d);
  }, [selectedDateStr, rosterMap, scheduleData, user]);

  const selectedRecord = useMemo(() => {
    return recordMap.get(selectedDateStr);
  }, [selectedDateStr, recordMap]);

  const isTodayDate = (dayNum: number, checkMonth: number, checkYear: number) => {
    const today = new Date();
    return (
      today.getFullYear() === checkYear &&
      today.getMonth() + 1 === checkMonth &&
      today.getDate() === dayNum
    );
  };

  // Generate 7-Day Weekly Horizon Strip based on current selected date
  const weekDays = useMemo(() => {
    const selectedDate = new Date(selectedDateStr + 'T00:00:00');
    const dayOfWeek = selectedDate.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(selectedDate);
    monday.setDate(selectedDate.getDate() + diffToMonday);

    const days = [];
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const dayNum = d.getDate();
      const dStr = `${y}-${String(m).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const rec = recordMap.get(dStr);
      const shift = getShiftForDate(dStr, dayNum);

      days.push({
        date: d,
        dStr,
        dayNum,
        dayName: dayNames[d.getDay()],
        isToday: isTodayDate(dayNum, m, y),
        isSunday: d.getDay() === 0,
        isSelected: selectedDateStr === dStr,
        shift,
        record: rec,
      });
    }
    return days;
  }, [selectedDateStr, recordMap, rosterMap, scheduleData, user]);

  // Full Month Grid helpers
  const daysInMonth = new Date(year, month, 0).getDate();
  const startDayOffset = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const formatTime = (timeStr?: string | null) => {
    if (!timeStr) return '—';
    const d = new Date(timeStr);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const calculateDuration = (inStr?: string | null, outStr?: string | null) => {
    if (!inStr || !outStr) return '—';
    const inMs = new Date(inStr).getTime();
    const outMs = new Date(outStr).getTime();
    if (outMs <= inMs) return '—';
    const mins = Math.round((outMs - inMs) / 60000);
    const hrs = Math.floor(mins / 60);
    const rMins = mins % 60;
    return `${hrs}j ${rMins}m`;
  };

  const formatDateDisplay = (dateString: string) => {
    const d = new Date(dateString);
    const day = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    const weekday = d.toLocaleDateString('id-ID', { weekday: 'short' });
    return { day, weekday };
  };

  return (
    <div className="space-y-4 font-sans select-none animate-in fade-in duration-150 pb-16">
      {/* ========================================================================= */}
      {/* 1. TOP SUB-TAB SWITCHER: ROSTER SHIFT VS RIWAYAT PRESENSI                 */}
      {/* ========================================================================= */}
      <div className="bg-[#EFE9DD]/80 p-1 rounded-full flex items-center gap-1 border border-[#E0D8C8]">
        <button
          type="button"
          onClick={() => {
            HapticFeedback.tick();
            setSubTab('roster');
          }}
          className={`flex-1 py-2 px-3 rounded-full text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
            subTab === 'roster'
              ? 'bg-[#161B26] text-white shadow-sm'
              : 'text-[#6E6454] hover:text-[#161B26]'
          }`}
        >
          <CalendarDays className="w-3.5 h-3.5 text-[#FDE68A]" />
          <span>Jadwal Shift Roster</span>
        </button>

        <button
          type="button"
          onClick={() => {
            HapticFeedback.tick();
            setSubTab('history');
          }}
          className={`flex-1 py-2 px-3 rounded-full text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
            subTab === 'history'
              ? 'bg-[#161B26] text-white shadow-sm'
              : 'text-[#6E6454] hover:text-[#161B26]'
          }`}
        >
          <History className="w-3.5 h-3.5 text-[#FDE68A]" />
          <span>Riwayat & Rekap</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB A: JADWAL SHIFT ROSTER (CALENDAR HORIZON STRIP & PLANNING)          */}
      {/* ========================================================================= */}
      {subTab === 'roster' && (
        <div className="space-y-4">
          {/* Calendar Controls & Weekly Horizon Strip */}
          <div className="bg-white/85 backdrop-blur-sm border border-[#E8DFD0] rounded-3xl p-4 shadow-sm space-y-3.5">
            {/* Month Title & Full Month Expansion Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-xl border border-[#E8DFD0] text-[#8C7E6A] hover:bg-slate-100 transition-colors"
                  title="Bulan Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div>
                  <h3 className="text-sm font-bold text-[#161B26] capitalize tracking-tight flex items-center space-x-1.5">
                    <Calendar className="w-4 h-4 text-[#D97706]" />
                    <span>{monthLabel}</span>
                  </h3>
                  <button
                    type="button"
                    onClick={handleResetToday}
                    className="text-[10px] font-semibold text-amber-700 hover:underline transition-colors cursor-pointer"
                  >
                    Hari Ini
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-xl border border-[#E8DFD0] text-[#8C7E6A] hover:bg-slate-100 transition-colors"
                  title="Bulan Selanjutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Toggle Full Month Expand */}
              <button
                type="button"
                onClick={() => {
                  HapticFeedback.tick();
                  setIsFullMonthExpanded(!isFullMonthExpanded);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#FAF8F5] border border-[#E8DFD0] text-[#161B26] hover:bg-[#F2ECE1] transition-all flex items-center space-x-1 cursor-pointer"
              >
                <span>{isFullMonthExpanded ? 'Ringkas 7 Hari' : 'Bulan Penuh'}</span>
                {isFullMonthExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 text-[#8C7E6A]" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-[#8C7E6A]" />
                )}
              </button>
            </div>

            {/* DEFAULT VIEW: WEEKLY HORIZON STRIP (7-Hari Horizontal Swipeable) */}
            {!isFullMonthExpanded ? (
              <div className="grid grid-cols-7 gap-1.5 pt-1">
                {weekDays.map((item) => (
                  <button
                    key={item.dStr}
                    type="button"
                    onClick={() => {
                      HapticFeedback.tick();
                      setSelectedDateStr(item.dStr);
                    }}
                    className={`py-2.5 px-1 rounded-2xl flex flex-col items-center justify-between text-xs transition-all relative cursor-pointer border ${
                      item.isSelected
                        ? 'bg-[#161B26] text-white border-[#161B26] shadow-md scale-[1.02]'
                        : item.isToday
                        ? 'bg-amber-50/40 border-amber-300/70 text-[#161B26]'
                        : 'bg-[#FAF8F5] border-[#E8DFD0] text-[#5C6479] hover:bg-white'
                    }`}
                  >
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        item.isSelected
                          ? 'text-amber-300'
                          : item.isSunday
                          ? 'text-rose-500'
                          : 'text-[#8C7E6A]'
                      }`}
                    >
                      {item.dayName}
                    </span>

                    <span className="text-sm font-extrabold font-mono mt-1">
                      {item.dayNum}
                    </span>

                    <div className="mt-1.5 flex items-center justify-center h-2">
                      {item.isToday && !item.isSelected ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ring-2 ring-amber-200" />
                      ) : item.shift ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              /* EXPANDED VIEW: FULL MONTH GRID (30 Days) */
              <div className="space-y-2 pt-1 animate-in fade-in duration-200">
                <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] text-[#8C7E6A] uppercase tracking-wider">
                  <span>Sen</span>
                  <span>Sel</span>
                  <span>Rab</span>
                  <span>Kam</span>
                  <span>Jum</span>
                  <span className="text-amber-700">Sab</span>
                  <span className="text-rose-500">Min</span>
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {Array.from({ length: startDayOffset }).map((_, i) => (
                    <div key={`offset-${i}`} className="h-12 rounded-xl bg-slate-50/40 opacity-20" />
                  ))}

                  {daysArray.map((dayNum) => {
                    const dStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    const shift = getShiftForDate(dStr, dayNum);
                    const isSelected = selectedDateStr === dStr;
                    const isToday = isTodayDate(dayNum, month, year);
                    const dObj = new Date(year, month - 1, dayNum);
                    const isSunday = dObj.getDay() === 0;

                    return (
                      <button
                        key={dStr}
                        type="button"
                        onClick={() => {
                          HapticFeedback.tick();
                          setSelectedDateStr(dStr);
                        }}
                        className={`h-12 rounded-xl p-1 flex flex-col items-center justify-between text-xs transition-all relative cursor-pointer border ${
                          isSelected
                            ? 'bg-[#161B26] text-white border-[#161B26] shadow-sm'
                            : isToday
                            ? 'border-amber-300/80 bg-amber-50/30'
                            : 'border-[#E8DFD0] hover:border-amber-200 bg-[#FAF8F5]'
                        }`}
                      >
                        <div className="w-full flex items-center justify-between px-1">
                          <span
                            className={`text-[11px] font-bold ${
                              isSelected
                                ? 'text-white'
                                : isToday
                                ? 'text-amber-800'
                                : isSunday
                                ? 'text-rose-500'
                                : 'text-[#161B26]'
                            }`}
                          >
                            {dayNum}
                          </span>
                          {isToday && !isSelected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ring-1 ring-white" />
                          )}
                        </div>

                        <div className="h-2 flex items-center justify-center">
                          {shift ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Selected Day Shift Card */}
          <div className="bg-white/90 backdrop-blur-sm border border-[#E8DFD0] rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DFD0]">
              <div>
                <span className="text-[10px] font-mono text-[#8C7E6A] uppercase tracking-wider font-bold block">
                  Jadwal Operasional
                </span>
                <h4 className="font-extrabold text-sm text-[#161B26] mt-0.5">
                  {selectedDateLabel}
                </h4>
              </div>

              {selectedDayShift ? (
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]">
                  {selectedDayShift.name}
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  Libur (OFF)
                </span>
              )}
            </div>

            {selectedDayShift ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E8DFD0]">
                    <span className="text-[10px] font-semibold text-[#8C7E6A] block">Jam Masuk Shift</span>
                    <span className="text-base font-extrabold text-[#161B26] font-mono mt-0.5 block">
                      {selectedDayShift.start_time} WIB
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E8DFD0]">
                    <span className="text-[10px] font-semibold text-[#8C7E6A] block">Jam Pulang Shift</span>
                    <span className="text-base font-extrabold text-[#161B26] font-mono mt-0.5 block">
                      {selectedDayShift.end_time} WIB
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-2xl flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 text-[#92400E]">
                    <Clock className="w-4 h-4 text-[#D97706]" />
                    <span>Toleransi Keterlambatan:</span>
                  </div>
                  <strong className="text-[#92400E] font-mono">+{selectedDayShift.grace_period_minutes} Menit</strong>
                </div>

                {/* Realisasi Kehadiran jika ada record */}
                {selectedRecord && (
                  <div className="p-3 bg-[#FAF8F5] border border-[#E8DFD0] rounded-2xl flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2
                        className={`w-4 h-4 ${
                          selectedRecord.status === 'LATE'
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        }`}
                      />
                      <span className="font-medium text-[#161B26]">Realisasi:</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-[#161B26]">
                        {formatTime(selectedRecord.clock_in_time)} - {formatTime(selectedRecord.clock_out_time)}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          selectedRecord.status === 'LATE'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {selectedRecord.status === 'LATE'
                          ? `Telat ${selectedRecord.late_minutes}m`
                          : 'Tepat Waktu'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-[#8C7E6A] space-y-1 bg-[#FAF8F5] rounded-2xl border border-[#E8DFD0]">
                <Sparkles className="w-6 h-6 mx-auto text-[#D97706] mb-1" />
                <p className="text-xs font-bold text-[#161B26]">Hari Bebas Tugas (OFF)</p>
                <p className="text-[11px] text-[#8C7E6A]">
                  Tidak ada kewajiban jam operasional pada tanggal ini.
                </p>
              </div>
            )}

            {/* Contextual Quick Action Button */}
            {onNavigateToLeaves && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    HapticFeedback.tap();
                    onNavigateToLeaves();
                  }}
                  className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-[#FAF8F5] active:bg-[#F2ECE1] border border-[#E8DFD0] text-[#161B26] text-xs font-bold shadow-2xs flex items-center justify-center space-x-2 transition-all cursor-pointer active:scale-[0.99]"
                >
                  <FileText className="w-4 h-4 text-[#D97706]" />
                  <span>Ajukan Cuti / Izin pada Tanggal Ini</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB B: RIWAYAT & REKAP TOTAL (FEED MUTASI KRONOLOGIS TANPA KALENDER)  */}
      {/* ========================================================================= */}
      {subTab === 'history' && (
        <div className="space-y-4">
          {/* Executive Performance Recap Card */}
          <div className="bg-gradient-to-br from-[#161B26] via-[#1E2538] to-[#252F48] rounded-3xl p-5 text-white shadow-xl space-y-4 relative overflow-hidden">
            {/* Ambient gold glow */}
            <div className="absolute top-0 right-0 w-44 h-44 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Header: Month Navigator & Discipline Score */}
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div>
                  <span className="text-[10px] text-amber-300 font-mono font-bold uppercase tracking-wider block">
                    Rekapitulasi Presensi
                  </span>
                  <h3 className="text-sm font-bold text-white capitalize">
                    {monthLabel}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Discipline Score Badge */}
              <div className="text-right">
                <span className="text-[10px] text-white/60 block font-medium">Disiplin Waktu</span>
                <span className="text-lg font-extrabold text-[#FDE68A] font-mono leading-tight">
                  {stats.disciplineScore}%
                </span>
              </div>
            </div>

            {/* 4 Metric Tiles Grid */}
            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/10 relative z-10 text-center">
              <div className="bg-white/5 rounded-2xl p-2.5 border border-white/10">
                <span className="text-[9px] text-white/60 font-bold block uppercase tracking-wider">Hadir</span>
                <span className="text-base font-extrabold text-emerald-400 font-mono mt-0.5 block">
                  {stats.totalPresent}
                </span>
                <span className="text-[9px] text-white/50 block">hari</span>
              </div>

              <div className="bg-white/5 rounded-2xl p-2.5 border border-white/10">
                <span className="text-[9px] text-white/60 font-bold block uppercase tracking-wider">Terlambat</span>
                <span className="text-base font-extrabold text-amber-400 font-mono mt-0.5 block">
                  {stats.late}
                </span>
                <span className="text-[9px] text-amber-300 block">+{stats.totalLateMinutes}m</span>
              </div>

              <div className="bg-white/5 rounded-2xl p-2.5 border border-white/10">
                <span className="text-[9px] text-white/60 font-bold block uppercase tracking-wider">WFH</span>
                <span className="text-base font-extrabold text-sky-400 font-mono mt-0.5 block">
                  {stats.wfh}
                </span>
                <span className="text-[9px] text-white/50 block">remote</span>
              </div>

              <div className="bg-white/5 rounded-2xl p-2.5 border border-white/10">
                <span className="text-[9px] text-white/60 font-bold block uppercase tracking-wider">Total Jam</span>
                <span className="text-xs sm:text-sm font-extrabold text-[#FDE68A] font-mono mt-1 block truncate">
                  {stats.workHoursStr}
                </span>
                <span className="text-[9px] text-white/50 block">akumulasi</span>
              </div>
            </div>
          </div>

          {/* Quick Filter Chips */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] text-[#8C7E6A] font-semibold flex items-center space-x-1 pl-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Filter:</span>
            </span>

            <button
              type="button"
              onClick={() => {
                HapticFeedback.tick();
                setHistoryFilter('ALL');
              }}
              className={`px-3 py-1.5 rounded-xl font-semibold border transition-all cursor-pointer ${
                historyFilter === 'ALL'
                  ? 'bg-[#161B26] text-white border-[#161B26] shadow-2xs'
                  : 'bg-white text-[#5C6479] border-[#E8DFD0] hover:bg-[#FAF8F5]'
              }`}
            >
              Semua ({history.length})
            </button>

            <button
              type="button"
              onClick={() => {
                HapticFeedback.tick();
                setHistoryFilter('LATE');
              }}
              className={`px-3 py-1.5 rounded-xl font-semibold border transition-all cursor-pointer ${
                historyFilter === 'LATE'
                  ? 'bg-amber-700 text-white border-amber-700 shadow-2xs'
                  : 'bg-white text-amber-800 border-amber-200 hover:bg-amber-50'
              }`}
            >
              Terlambat ({stats.late})
            </button>

            <button
              type="button"
              onClick={() => {
                HapticFeedback.tick();
                setHistoryFilter('WFH');
              }}
              className={`px-3 py-1.5 rounded-xl font-semibold border transition-all cursor-pointer ${
                historyFilter === 'WFH'
                  ? 'bg-sky-700 text-white border-sky-700 shadow-2xs'
                  : 'bg-white text-sky-800 border-sky-200 hover:bg-sky-50'
              }`}
            >
              WFH ({stats.wfh})
            </button>
          </div>

          {/* Chronological Attendance Feed (Feed Mutasi) */}
          <div className="space-y-2.5">
            {filteredHistory.length === 0 ? (
              <div className="bg-white/80 rounded-3xl p-8 border border-[#E8DFD0] text-center space-y-2">
                <Clock className="w-8 h-8 text-[#D4CEBF] mx-auto" />
                <h4 className="font-bold text-sm text-[#161B26]">Tidak Ada Data Kehadiran</h4>
                <p className="text-xs text-[#8C7E6A]">
                  Tidak ada catatan presensi yang sesuai dengan filter yang dipilih pada bulan ini.
                </p>
              </div>
            ) : (
              filteredHistory.map((rec) => {
                const dateInfo = formatDateDisplay(rec.date || rec.clock_in_time || '');
                const isLate = rec.status === 'LATE';
                const isWfh = rec.status === 'WFH';
                const isOnTime = rec.status === 'ON_TIME' || rec.status === 'HADIR_BUKAN_HARI_KERJA';

                return (
                  <div
                    key={rec.id}
                    className="bg-white/90 backdrop-blur-sm border border-[#E8DFD0] rounded-2xl p-3.5 shadow-2xs flex items-center justify-between gap-3 hover:border-amber-300 transition-all"
                  >
                    {/* Left: Date Stamp */}
                    <div className="w-14 h-14 rounded-xl bg-[#FAF8F5] border border-[#E8DFD0] flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold uppercase text-[#8C7E6A] tracking-wider leading-none">
                        {dateInfo.weekday}
                      </span>
                      <span className="text-base font-extrabold text-[#161B26] font-mono mt-0.5 leading-none">
                        {dateInfo.day.split(' ')[0]}
                      </span>
                      <span className="text-[9px] text-[#A19788] leading-none mt-0.5">
                        {dateInfo.day.split(' ')[1]}
                      </span>
                    </div>

                    {/* Middle: Timestamps & Durations */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-extrabold text-[#161B26] font-mono">
                          {formatTime(rec.clock_in_time)} - {formatTime(rec.clock_out_time)}
                        </span>
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md font-mono font-bold">
                          {calculateDuration(rec.clock_in_time, rec.clock_out_time)}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1.5 text-[11px] text-[#5C6479]">
                        <MapPin className="w-3 h-3 text-[#D97706] shrink-0" />
                        <span className="truncate">
                          {rec.is_within_perimeter
                            ? 'Kantor Resmi'
                            : isWfh
                            ? 'Remote / WFH'
                            : 'Luar Radius Kantor'}
                        </span>
                      </div>
                    </div>

                    {/* Right: Status Pill & Photo Thumbnail */}
                    <div className="flex flex-col items-end shrink-0 space-y-1.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isOnTime
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : isLate
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : isWfh
                            ? 'bg-sky-50 text-sky-800 border-sky-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {isOnTime
                          ? 'Tepat Waktu'
                          : isLate
                          ? `+${rec.late_minutes}m Telat`
                          : isWfh
                          ? 'WFH'
                          : rec.status}
                      </span>

                      {rec.clock_in_photo_url && (
                        <button
                          type="button"
                          onClick={() =>
                            onSelectPhoto(
                              resolveMediaUrl(rec.clock_in_photo_url!),
                              `Foto Presensi: ${rec.date}`
                            )
                          }
                          className="text-[10px] text-[#8C7E6A] hover:text-[#161B26] flex items-center space-x-1 bg-[#FAF8F5] px-2 py-0.5 rounded-lg border border-[#E8DFD0] cursor-pointer"
                        >
                          <Camera className="w-3 h-3 text-[#D97706]" />
                          <span>Foto</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
