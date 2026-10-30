'use client';

import React from 'react';
import { AttendanceAuditRow } from '../../types';
import { X, MapPin, ExternalLink, ShieldCheck, Check } from 'lucide-react';
import { resolveMediaUrl } from '../../lib/api';

interface AuditModalProps {
  record: AttendanceAuditRow | null;
  onClose: () => void;
}

export function AuditModal({ record, onClose }: AuditModalProps) {
  if (!record) return null;

  const hasCoords = record.clock_in_lat !== null && record.clock_in_lng !== null;
  const inTime = record.clock_in_time
    ? new Date(record.clock_in_time).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  const outTime = record.clock_out_time
    ? new Date(record.clock_out_time).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Attendance Audit: {record.full_name}
            </h3>
            <p className="text-xs text-slate-500">
              {record.department} • {record.email}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Audit Meta Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Clock-In Time</span>
            <span className="text-slate-900 font-mono font-medium">{inTime}</span>
            {record.late_minutes > 0 && (
              <span className="text-amber-700 font-medium ml-1 text-xs">
                (+{record.late_minutes}m Late)
              </span>
            )}
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Clock-Out Time</span>
            <span className="text-slate-900 font-mono font-medium">{outTime}</span>
          </div>
        </div>

        {/* Media & GPS Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Selfie Photo */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-700">Verified Photo</span>
            <div className="aspect-[4/3] w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
              {record.clock_in_photo_url ? (
                <img
                  src={resolveMediaUrl(record.clock_in_photo_url)}
                  alt={`${record.full_name} clock-in selfie`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs text-slate-400">No Photo Available</span>
              )}
            </div>
          </div>

          {/* GPS Coordinates & Google Maps Link */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-700">GPS Map Location</span>
            <div className="aspect-[4/3] w-full bg-slate-50 rounded-xl border border-slate-200 relative flex flex-col items-center justify-center p-3 text-center">
              {hasCoords ? (
                <>
                  <MapPin className="w-7 h-7 text-rose-500 mb-1" />
                  <div className="font-mono text-xs font-semibold text-slate-900">
                    {record.clock_in_lat?.toFixed(5)}, {record.clock_in_lng?.toFixed(5)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Assigned: {record.office_name}
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${record.clock_in_lat},${record.clock_in_lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center space-x-1 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
                  >
                    <span>View in Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </>
              ) : (
                <span className="text-xs text-slate-400">No GPS Coordinates</span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
