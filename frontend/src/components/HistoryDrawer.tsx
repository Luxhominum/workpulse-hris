'use client';

import React, { useState } from 'react';
import { AttendanceRecord } from '../types';
import { History, Calendar, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { resolveMediaUrl } from '../lib/api';

interface HistoryDrawerProps {
  history: AttendanceRecord[];
  onSelectPhoto: (photoUrl: string, title: string) => void;
}

export function HistoryDrawer({ history, onSelectPhoto }: HistoryDrawerProps) {
  const [isOpen, setIsOpen] = useState(true);

  const getStatusBadge = (record: AttendanceRecord) => {
    switch (record.status) {
      case 'ON_TIME':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            On Time
          </span>
        );
      case 'LATE':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            Late (+{record.late_minutes}m)
          </span>
        );
      case 'WFH':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            WFH
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {record.status}
          </span>
        );
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-3">
      {/* Header and Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left group"
      >
        <div className="flex items-center space-x-2">
          <History className="w-4 h-4 text-slate-500" />
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Past Attendance Log
          </span>
        </div>
        <div className="flex items-center space-x-1.5 text-xs text-slate-500 group-hover:text-slate-900 transition-colors">
          <span>{history.length} records</span>
          <ChevronRight
            className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
          />
        </div>
      </button>

      {/* Roster Items */}
      {isOpen && (
        <div className="space-y-2 pt-1 max-h-72 overflow-y-auto pr-0.5">
          {history.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              No recent attendance logs recorded.
            </div>
          ) : (
            history.map((record) => {
              const recordDate = new Date(record.date).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });

              const inTime = new Date(record.clock_in_time).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              });

              const outTime = record.clock_out_time
                ? new Date(record.clock_out_time).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '—';

              return (
                <div
                  key={record.id}
                  className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between hover:border-slate-200 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs font-semibold text-slate-900">{recordDate}</span>
                      {getStatusBadge(record)}
                    </div>

                    <div className="flex items-center space-x-3 text-[11px] text-slate-500 pl-5">
                      <span>In: <strong className="text-slate-800 font-mono">{inTime}</strong></span>
                      <span>•</span>
                      <span>Out: <strong className="text-slate-800 font-mono">{outTime}</strong></span>
                    </div>
                  </div>

                  {/* Photo inspector button */}
                  {record.clock_in_photo_url && (
                    <button
                      onClick={() =>
                        onSelectPhoto(
                          resolveMediaUrl(record.clock_in_photo_url),
                          `${recordDate} Attendance Photo`
                        )
                      }
                      title="Inspect Photo"
                      className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors border border-slate-200 shadow-sm"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
