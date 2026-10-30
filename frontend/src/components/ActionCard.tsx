'use client';

import React from 'react';
import { AttendanceRecord } from '../types';
import { LogIn, LogOut, CheckCircle, AlertCircle, Camera, ArrowRight } from 'lucide-react';

interface ActionCardProps {
  todayAttendance: AttendanceRecord | null;
  isWithinPerimeter: boolean;
  isWfhAllowed: boolean;
  hasCoords: boolean;
  actionMessage: { type: 'success' | 'error'; text: string } | null;
  onOpenCapture: (mode: 'clock-in' | 'clock-out') => void;
}

export function ActionCard({
  todayAttendance,
  isWithinPerimeter,
  isWfhAllowed,
  hasCoords,
  actionMessage,
  onOpenCapture,
}: ActionCardProps) {
  const isClockedIn = Boolean(todayAttendance);
  const isClockedOut = Boolean(todayAttendance?.clock_out_time);

  const canClockIn =
    !isClockedIn &&
    hasCoords &&
    (isWithinPerimeter || isWfhAllowed);

  const canClockOut =
    isClockedIn &&
    !isClockedOut &&
    hasCoords;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-3.5">
      {/* Alert Banner */}
      {actionMessage && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-start space-x-2.5 transition-all ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
          )}
          <span className="flex-1 leading-relaxed font-medium">{actionMessage.text}</span>
        </div>
      )}

      {/* State Actions */}
      {isClockedOut ? (
        /* Completed Today */
        <div className="text-center py-6 bg-slate-50/80 rounded-xl border border-slate-200/60 space-y-2">
          <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Presensi Hari Ini Selesai</h3>
            <p className="text-xs text-slate-500 mt-0.5 max-w-xs mx-auto">
              Jam masuk dan jam pulang Anda telah tercatat dengan verifikasi GPS dan foto selfie.
            </p>
          </div>
        </div>
      ) : isClockedIn ? (
        /* Clock Out Action */
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => onOpenCapture('clock-out')}
            disabled={!canClockOut}
            className="w-full py-3.5 px-4 rounded-xl font-semibold text-xs text-white bg-slate-900 hover:bg-slate-800 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-between shadow-sm group"
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-amber-400">
                <LogOut className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="font-bold text-xs tracking-tight">Presensi Pulang (Clock Out)</div>
                <div className="text-[10px] text-slate-400 font-normal">Buka kamera live untuk verifikasi wajah</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      ) : (
        /* Clock In Action */
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => onOpenCapture('clock-in')}
            disabled={!canClockIn}
            className="w-full py-3.5 px-4 rounded-xl font-semibold text-xs text-white bg-slate-900 hover:bg-slate-800 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-between shadow-sm group"
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-emerald-400">
                <LogIn className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="font-bold text-xs tracking-tight">Presensi Masuk (Clock In)</div>
                <div className="text-[10px] text-slate-400 font-normal">Buka kamera live untuk verifikasi wajah</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {!isWithinPerimeter && !isWfhAllowed && (
            <p className="text-center text-[11px] text-rose-600 font-medium">
              Posisi Anda berada di luar radius kantor yang ditentukan.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
