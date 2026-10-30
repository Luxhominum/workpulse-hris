'use client';

import React, { useState, useEffect } from 'react';
import { ApiClient } from '../../lib/api';
import { AttendanceAuditRow } from '../../types';
import { Clock, X, AlertCircle, RefreshCw, CheckCircle, FileText } from 'lucide-react';

interface ManualAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AttendanceAuditRow | null;
  date: string;
  onSaved: () => void;
}

export function ManualAdjustmentModal({
  isOpen,
  onClose,
  record,
  date,
  onSaved,
}: ManualAdjustmentModalProps) {
  const [clockInTime, setClockInTime] = useState('08:00');
  const [clockOutTime, setClockOutTime] = useState('17:00');
  const [status, setStatus] = useState<string>('ON_TIME');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const presetReasons = [
    'Lupa melakukan absensi',
    'Kendala perangkat HP / baterai habis',
    'Kendala jaringan internet / GPS',
    'Tugas dinas luar kota mendadak',
    'Lembur / Hadir bukan hari kerja',
  ];

  useEffect(() => {
    if (record) {
      setErrorMsg(null);
      // Format existing clock in time if available
      if (record.clock_in_time) {
        const d = new Date(record.clock_in_time);
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        setClockInTime(`${hh}:${mm}`);
      } else {
        setClockInTime('08:00');
      }

      // Format existing clock out time if available
      if (record.clock_out_time) {
        const d = new Date(record.clock_out_time);
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        setClockOutTime(`${hh}:${mm}`);
      } else {
        setClockOutTime('17:00');
      }

      if (record.status === 'ABSENT' || record.status === 'LIBUR') {
        setStatus('ON_TIME');
      } else if (record.status === 'HADIR_BUKAN_HARI_KERJA') {
        setStatus('ON_TIME');
      } else {
        setStatus(record.status);
      }

      setReason(record.adjustment_reason || '');
    }
  }, [record]);

  if (!isOpen || !record) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg('Alasan koreksi absensi wajib diisi untuk kepatuhan audit HR.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // Build ISO timestamps based on selected date
      const baseDate = date || new Date().toISOString().split('T')[0];
      const inIso = clockInTime ? new Date(`${baseDate}T${clockInTime}:00`).toISOString() : null;
      const outIso = clockOutTime ? new Date(`${baseDate}T${clockOutTime}:00`).toISOString() : null;

      await ApiClient.adjustAttendance({
        employee_id: record.employee_id,
        date: baseDate,
        clock_in_time: inIso,
        clock_out_time: outIso,
        status,
        reason: reason.trim(),
      });

      onSaved();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan penyesuaian absensi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden p-6 space-y-4 font-sans">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-sm text-slate-900">Koreksi Jam Absensi Manual</h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  Admin Override
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {record.full_name} ({record.department} • {record.position})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Schedule & Date Badge */}
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500 font-medium">Tanggal Presensi:</span>{' '}
            <strong className="text-slate-900 font-mono font-semibold">
              {date || new Date().toISOString().split('T')[0]}
            </strong>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Jadwal Shift:</span>{' '}
            <span className="font-mono text-slate-800 font-semibold">{record.shift_hours}</span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Time Picker Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Jam Masuk (Clock In) <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                required
                value={clockInTime}
                onChange={(e) => setClockInTime(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono font-semibold rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Jam Pulang (Clock Out)
              </label>
              <input
                type="time"
                value={clockOutTime}
                onChange={(e) => setClockOutTime(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono font-semibold rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Status Selection */}
          <div>
            <label className="text-[11px] font-semibold text-slate-700 block mb-1">
              Status Kehadiran <span className="text-rose-500">*</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            >
              <option value="ON_TIME">Tepat Waktu (On Time)</option>
              <option value="LATE">Terlambat (Late)</option>
              <option value="WFH">Bekerja Dari Rumah (WFH)</option>
              <option value="OUT_OF_OFFICE">Tugas Luar / Dinas (Out of Office)</option>
            </select>
          </div>

          {/* Reason & Preset Pills */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-700 block">
                Alasan Koreksi Admin <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400">Wajib untuk audit trail HR</span>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {presetReasons.map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setReason(preset)}
                  className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-medium transition-colors cursor-pointer"
                >
                  + {preset}
                </button>
              ))}
            </div>

            <textarea
              required
              rows={2}
              placeholder="Jelaskan alasan penyesuaian jam absen..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-slate-900 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white flex items-center space-x-1.5 transition-colors disabled:opacity-50 shadow-sm"
            >
              {isSubmitting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>Simpan Penyesuaian</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
