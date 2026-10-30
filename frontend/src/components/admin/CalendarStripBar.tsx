'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Sparkles } from 'lucide-react';
import { LiveOverviewData } from '../../types';

interface CalendarStripBarProps {
  selectedDate: string; // "YYYY-MM-DD"
  onSelectDate: (dateStr: string) => void;
  overviewData: LiveOverviewData | null;
  isLoading?: boolean;
}

export function CalendarStripBar({
  selectedDate,
  onSelectDate,
  overviewData,
  isLoading = false,
}: CalendarStripBarProps) {
  const currentDate = selectedDate ? new Date(selectedDate) : new Date();
  
  // Format Month Year heading (e.g. "Oktober 2026")
  const monthYearStr = currentDate.toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });

  // Today in YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];
  const isSelectedToday = selectedDate === todayStr;

  // Generate 9 days rolling strip (-4 days to +4 days)
  const generateStripDays = () => {
    const days = [];
    for (let offset = -4; offset <= 4; offset++) {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + offset);
      const isoStr = d.toISOString().split('T')[0];
      const dayNum = d.getDate();
      const dayName = d.toLocaleDateString('id-ID', { weekday: 'short' }).toUpperCase();
      const dayOfWeek = d.getDay(); // 0 is Sunday, 6 is Saturday
      const isWeekend = dayOfWeek === 0; // In 6-day PGE cycle, Sunday is weekend
      const isToday = isoStr === todayStr;
      const isSelected = isoStr === selectedDate;

      days.push({
        isoStr,
        dayNum,
        dayName,
        isWeekend,
        isToday,
        isSelected,
      });
    }
    return days;
  };

  const stripDays = generateStripDays();

  const handlePrevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    onSelectDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    onSelectDate(d.toISOString().split('T')[0]);
  };

  const handleGoToday = () => {
    onSelectDate(todayStr);
  };

  return (
    <div className="bg-[#FAF8F5] border border-[#E8DFD0] rounded-2xl p-2.5 sm:p-3 shadow-2xs space-y-2 font-sans select-none">
      {/* Top Header: Compact Month Switcher, Quick Date Jump & Status Counters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E8DFD0]">
        <div className="flex items-center space-x-2">
          {/* Month Switcher Controls */}
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={handlePrevDay}
              className="p-1 rounded-lg bg-white hover:bg-[#F2ECE1] text-[#57534E] hover:text-[#161B26] border border-[#E8DFD0] transition-colors shadow-2xs cursor-pointer"
              title="Hari Sebelumnya"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <div className="px-2.5 py-1 bg-white border border-[#E8DFD0] rounded-lg shadow-2xs text-center min-w-[120px]">
              <span className="text-xs font-bold text-[#161B26] capitalize">
                {monthYearStr}
              </span>
            </div>

            <button
              type="button"
              onClick={handleNextDay}
              className="p-1 rounded-lg bg-white hover:bg-[#F2ECE1] text-[#57534E] hover:text-[#161B26] border border-[#E8DFD0] transition-colors shadow-2xs cursor-pointer"
              title="Hari Berikutnya"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Quick Date Picker Icon Button */}
            <div className="relative flex items-center">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => onSelectDate(e.target.value)}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                title="Pilih tanggal spesifik dari kalender"
              />
              <div className="p-1 rounded-lg bg-white hover:bg-[#F2ECE1] text-[#57534E] hover:text-[#161B26] border border-[#E8DFD0] transition-colors shadow-2xs cursor-pointer">
                <CalendarIcon className="w-3.5 h-3.5 text-[#D97706]" />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoToday}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs ${
              isSelectedToday
                ? 'bg-[#161B26] text-white border border-[#161B26]'
                : 'bg-white text-[#57534E] hover:text-[#161B26] border border-[#E8DFD0] hover:bg-[#F2ECE1]'
            }`}
          >
            Hari Ini
          </button>
        </div>

        {/* Compact Live Status Counters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-white border border-[#E8DFD0] rounded-xl shadow-2xs text-xs font-bold">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[#161B26] font-mono font-bold">
                {overviewData?.metrics.present_today ?? 0}
              </span>
              <span className="text-[#78716C] text-[11px] font-medium">Hadir</span>
            </div>

            <span className="text-[#D6CEBC]">•</span>

            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#D97706]" />
              <span className="text-[#161B26] font-mono font-bold">
                {overviewData?.metrics.late_today ?? 0}
              </span>
              <span className="text-[#78716C] text-[11px] font-medium">Terlambat</span>
            </div>

            <span className="text-[#D6CEBC]">•</span>

            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#A8A29E]" />
              <span className="text-[#161B26] font-mono font-bold">
                {overviewData?.is_workday === false
                  ? (overviewData?.metrics.off_today ?? 0)
                  : (overviewData?.metrics.absent_today ?? 0)}
              </span>
              <span className="text-[#78716C] text-[11px] font-medium">
                {overviewData?.is_workday === false ? 'Libur' : 'Alpha'}
              </span>
            </div>

            <span className="text-[#D6CEBC]">•</span>

            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-[#161B26] font-mono font-bold">
                {overviewData?.metrics.on_leave_today ?? 0}
              </span>
              <span className="text-[#78716C] text-[11px] font-medium">Cuti/Izin</span>
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal Interactive Calendar Date Strip (Low-Profile Compact Tiles) */}
      <div className="grid grid-cols-5 sm:grid-cols-9 gap-1.5 sm:gap-2 overflow-x-auto pb-0.5">
        {stripDays.map((d) => {
          return (
            <button
              key={d.isoStr}
              type="button"
              onClick={() => onSelectDate(d.isoStr)}
              style={
                d.isSelected
                  ? {
                      background: '#161B26',
                      color: '#FFFFFF',
                      boxShadow: '0 2px 8px rgba(22, 27, 38, 0.2)',
                    }
                  : undefined
              }
              className={`py-1.5 px-1 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer border ${
                d.isSelected
                  ? 'border-[#161B26] font-bold'
                  : 'bg-white hover:bg-[#F2ECE1] text-[#161B26] border-[#E8DFD0] hover:border-[#D97706]/40 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-1 leading-none">
                <span
                  className={`text-[10px] font-bold tracking-wider ${
                    d.isSelected
                      ? 'text-[#D97706]'
                      : d.isWeekend
                      ? 'text-rose-600'
                      : 'text-[#78716C]'
                  }`}
                >
                  {d.dayName}
                </span>
                {d.isToday && !d.isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] animate-pulse" />
                )}
              </div>

              <span
                className={`text-sm sm:text-base font-mono font-bold leading-tight mt-0.5 ${
                  d.isSelected
                    ? 'text-white'
                    : d.isWeekend
                    ? 'text-rose-700'
                    : 'text-[#161B26]'
                }`}
              >
                {d.dayNum}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
