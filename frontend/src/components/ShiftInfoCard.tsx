'use client';

import React from 'react';
import { Shift, Office, AttendanceRecord } from '../types';
import { CalendarClock, MapPin, CheckCircle, AlertCircle, Home, Clock } from 'lucide-react';

interface ShiftInfoCardProps {
  shift?: Shift | null;
  office?: Office | null;
  todayAttendance?: AttendanceRecord | null;
  isWfhAllowed: boolean;
}

export function ShiftInfoCard({
  shift,
  office,
  todayAttendance,
  isWfhAllowed,
}: ShiftInfoCardProps) {
  const getBadgeContent = () => {
    if (!todayAttendance) {
      return {
        bg: 'bg-slate-100 text-slate-700 border-slate-200',
        icon: <Clock className="w-3.5 h-3.5 text-slate-500" />,
        text: 'Not Clocked In Today',
      };
    }

    if (todayAttendance.clock_out_time) {
      const outTime = new Date(todayAttendance.clock_out_time).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return {
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />,
        text: `Clocked Out at ${outTime}`,
      };
    }

    const inTime = new Date(todayAttendance.clock_in_time).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    if (todayAttendance.status === 'LATE') {
      return {
        bg: 'bg-amber-50 text-amber-800 border-amber-200',
        icon: <AlertCircle className="w-3.5 h-3.5 text-amber-600" />,
        text: `Clocked In at ${inTime} (${todayAttendance.late_minutes}m Late)`,
      };
    }

    if (todayAttendance.status === 'WFH') {
      return {
        bg: 'bg-sky-50 text-sky-700 border-sky-200',
        icon: <Home className="w-3.5 h-3.5 text-sky-600" />,
        text: `Clocked In at ${inTime} (Remote / WFH)`,
      };
    }

    return {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />,
      text: `Clocked In at ${inTime} (On Time)`,
    };
  };

  const badge = getBadgeContent();

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-3.5">
      {/* Today Status Bar */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Daily Status
        </span>
        <div
          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${badge.bg}`}
        >
          {badge.icon}
          <span>{badge.text}</span>
        </div>
      </div>

      {/* Shift & Location Details */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-1.5 text-slate-500 text-xs font-medium">
            <CalendarClock className="w-3.5 h-3.5 text-slate-400" />
            <span>Shift Schedule</span>
          </div>
          <div className="text-sm font-semibold text-slate-900 tracking-tight">
            {shift ? `${shift.start_time} – ${shift.end_time}` : '09:00 – 18:00'}
          </div>
          <div className="text-[11px] text-slate-500 font-normal">
            +{shift?.grace_period_minutes || 10} min grace window
          </div>
        </div>

        <div className="space-y-0.5 border-l border-slate-100 pl-3">
          <div className="flex items-center space-x-1.5 text-slate-500 text-xs font-medium">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span>Assigned Office</span>
          </div>
          <div className="text-sm font-semibold text-slate-900 truncate tracking-tight">
            {office?.name || 'Jakarta Central HQ'}
          </div>
          <div className="text-[11px] text-slate-500 font-normal">
            {isWfhAllowed ? 'Remote Permitted' : `Within ${office?.radius_meters || 50}m radius`}
          </div>
        </div>
      </div>
    </div>
  );
}
