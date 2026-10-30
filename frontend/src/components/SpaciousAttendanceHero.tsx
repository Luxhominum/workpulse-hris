'use client';

import React, { useState } from 'react';
import { Shift, Office, AttendanceRecord } from '../types';
import { GeoCoords } from '../hooks/useGeolocation';
import { useLiveClock } from '../hooks/useLiveClock';
import { HapticFeedback } from '../lib/haptics';
import { SlideToConfirm } from './SlideToConfirm';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  RefreshCw,
  Building2,
  Calendar,
  Sparkles,
  Activity,
  Store,
  MapPin,
  Clock,
} from 'lucide-react';

interface SpaciousAttendanceHeroProps {
  user: any;
  shift?: Shift | null;
  office?: Office | null;
  activeOffice?: Office | null;
  todayAttendance?: AttendanceRecord | null;
  isWithinPerimeter: boolean;
  isWfhAllowed: boolean;
  distanceMeters: number | null;
  coords: GeoCoords | null;
  geoLoading: boolean;
  geoError: string | null;
  isSimulated: boolean;
  isMockLocation?: boolean;
  actionMessage: { type: 'success' | 'error'; text: string } | null;
  onRefreshGeo: () => void;
  onSimulateOffice: () => void;
  onSimulateFar: () => void;
  onOpenCapture: (mode: 'clock-in' | 'clock-out') => void;
  onSelectTab?: (tab: 'attendance' | 'canvasing') => void;
}

export function SpaciousAttendanceHero({
  user,
  shift,
  office,
  activeOffice,
  todayAttendance,
  isWithinPerimeter,
  isWfhAllowed,
  distanceMeters,
  coords,
  geoLoading,
  geoError,
  isSimulated,
  isMockLocation = false,
  actionMessage,
  onRefreshGeo,
  onSimulateOffice,
  onSimulateFar,
  onOpenCapture,
  onSelectTab,
}: SpaciousAttendanceHeroProps) {
  const { timeFormatted, dateFormatted } = useLiveClock();
  const [showLocationDetails, setShowLocationDetails] = useState(false);

  const isClockedIn = Boolean(todayAttendance);
  const isClockedOut = Boolean(todayAttendance?.clock_out_time);

  const canClockIn =
    !isClockedIn &&
    !isMockLocation &&
    (isWithinPerimeter || isWfhAllowed || Boolean(activeOffice) || Boolean(coords));

  const canClockOut =
    isClockedIn &&
    !isClockedOut &&
    !isMockLocation &&
    (isWithinPerimeter || isWfhAllowed || Boolean(activeOffice) || Boolean(coords));

  const inTimeFormatted = todayAttendance?.clock_in_time
    ? new Date(todayAttendance.clock_in_time).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const outTimeFormatted = todayAttendance?.clock_out_time
    ? new Date(todayAttendance.clock_out_time).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const targetOfficeName = activeOffice?.name || office?.name || 'Kantor Solo';
  const firstName = user?.nickname || user?.full_name?.split(' ')[0] || 'Rekan';

  const getSolarGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return { greeting: 'Pagi produktif', icon: '☀️' };
    if (hour >= 11 && hour < 15) return { greeting: 'Siang berenergi', icon: '🌞' };
    if (hour >= 15 && hour < 18) return { greeting: 'Sore fokus', icon: '🌤️' };
    return { greeting: 'Malam tenang', icon: '🌙' };
  };

  const solar = getSolarGreeting();

  return (
    <div className="w-full space-y-4 select-none font-sans">
      {/* ========================================================================= */}
      {/* 1. TOP SEGMENTED PILL SWITCHER: PRESENSI KANTOR VS SALES CANVASING       */}
      {/* ========================================================================= */}
      <div className="bg-[#EFE9DD]/80 p-1 rounded-full flex items-center gap-1 border border-[#E0D8C8]">
        <button
          type="button"
          className="flex-1 py-2 px-3 rounded-full text-xs font-bold transition-all flex items-center justify-center space-x-1.5 bg-[#161B26] text-white shadow-sm"
        >
          <Building2 className="w-3.5 h-3.5 text-[#FDE68A]" />
          <span>Presensi Kantor</span>
        </button>

        <button
          type="button"
          onClick={() => {
            HapticFeedback.tick();
            onSelectTab?.('canvasing');
          }}
          className="flex-1 py-2 px-3 rounded-full text-xs font-semibold text-[#6E6454] hover:text-[#161B26] hover:bg-white/50 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
        >
          <Store className="w-3.5 h-3.5 text-[#8C7E6A]" />
          <span>Kunjungan Toko</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 2. THE UNBROKEN LIVING CANVAS: ZERO NESTED BOXES                          */}
      {/* ========================================================================= */}
      <div className="relative rounded-3xl bg-gradient-to-b from-[#FFFDF9] via-[#FAF8F5] to-[#F5EFE6] border border-[#E8DFD0] p-6 shadow-sm overflow-hidden space-y-5">
        {/* Subtle Ambient Solar Radial Aura */}
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-gradient-to-br from-amber-200/25 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* 2A. Hero Time & Date */}
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-[#8C7E6A] flex items-center space-x-1">
              <span>{solar.greeting}, {firstName}</span>
              <span>{solar.icon}</span>
            </span>
            <div className="text-4xl sm:text-5xl font-extrabold text-[#161B26] tracking-tight font-mono tabular-nums mt-1 leading-none">
              {timeFormatted}
            </div>
            <div className="text-xs text-[#8C7E6A] mt-2 flex items-center space-x-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5 text-[#D97706]" />
              <span className="capitalize">{dateFormatted}</span>
            </div>
          </div>

          {/* Minimal Shift Pill */}
          <div className="bg-white/80 backdrop-blur-sm border border-[#E8DFD0] rounded-xl px-3 py-1.5 text-right shadow-2xs">
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#D97706] block">
              Shift Hari Ini
            </span>
            <span className="text-xs font-bold text-[#161B26] block font-mono">
              {shift ? `${shift.start_time} - ${shift.end_time}` : '07:30 - 16:30'}
            </span>
          </div>
        </div>

        {/* 2B. Unified Single Hairline Status Pill (Zero nested clutter) */}
        <div className="relative z-10 bg-white/70 backdrop-blur-sm rounded-2xl border border-[#E8DFD0] px-4 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 min-w-0">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isWithinPerimeter || isWfhAllowed ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isWithinPerimeter || isWfhAllowed ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            </span>
            <span className="font-semibold text-[#161B26] truncate">
              {isWithinPerimeter ? targetOfficeName : isWfhAllowed ? 'Mode WFH Aktif' : 'Di Luar Perimeter'}
            </span>
            <span className="text-[#A19788]">•</span>
            <span className="text-[#8C7E6A] font-mono text-[11px] truncate">
              {isWithinPerimeter
                ? `${Math.round(distanceMeters || 0)}m dari kantor`
                : isWfhAllowed
                ? 'Bebas presensi'
                : `±${Math.round(distanceMeters || 0)}m menuju radius`}
            </span>
          </div>

          <span className="text-[10px] font-mono font-bold text-[#8C7E6A] shrink-0 ml-2">
            GPS LIVE
          </span>
        </div>

        {/* 2C. Session Indicator (If Active) */}
        {isClockedIn && !isClockedOut && (
          <div className="relative z-10 flex items-center justify-between px-1 text-xs">
            <span className="text-[#8C7E6A] font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Sesi Kerja Aktif
            </span>
            <span className="font-mono font-bold text-[#161B26] bg-white px-2.5 py-0.5 rounded-full border border-[#E8DFD0]">
              Masuk Pukul {inTimeFormatted} WIB
            </span>
          </div>
        )}

        {/* 2D. Action Stage: True iOS Capsule Slider */}
        <div className="relative z-10 pt-1">
          {isClockedOut ? (
            <div className="py-5 px-4 bg-white/90 rounded-2xl border border-emerald-200 text-center space-y-2 shadow-xs">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto text-emerald-700">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-[#161B26] text-sm">Presensi Hari Ini Selesai</h4>
              <p className="text-xs text-emerald-800 font-mono font-semibold">
                Masuk: {inTimeFormatted} WIB • Pulang: {outTimeFormatted} WIB
              </p>
              <p className="text-[11px] text-[#8C7E6A]">
                Terima kasih atas dedikasi dan kerja keras Anda hari ini!
              </p>
            </div>
          ) : isClockedIn ? (
            <SlideToConfirm
              mode="clock-out"
              label="Geser untuk Presensi Pulang"
              disabled={!canClockOut}
              disabledReason="Presensi pulang belum dapat dilakukan"
              onConfirm={() => onOpenCapture('clock-out')}
            />
          ) : (
            <div className="space-y-3">
              <SlideToConfirm
                mode="clock-in"
                label="Geser untuk Presensi Masuk"
                disabled={!canClockIn}
                disabledReason={
                  isMockLocation
                    ? '⚠️ Fake GPS / Mock Location Terdeteksi! Matikan aplikasi lokasi tiruan.'
                    : !canClockIn && !isWfhAllowed && distanceMeters !== null && !isWithinPerimeter
                    ? `Anda berada ±${Math.round(distanceMeters)}m di luar perimeter`
                    : 'GPS belum siap atau di luar jangkauan'
                }
                onConfirm={() => onOpenCapture('clock-in')}
              />

              {isMockLocation && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-semibold flex items-center space-x-2 shadow-xs animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    <strong>Anti-Spoofing Aktif:</strong> Perangkat Anda terdeteksi menggunakan Mock Location / Fake GPS. Matikan aplikasi tersebut untuk presensi.
                  </span>
                </div>
              )}

              {!isMockLocation && !canClockIn && !isWfhAllowed && distanceMeters !== null && !isWithinPerimeter && (
                <div className="p-3 rounded-2xl bg-[#FEF3C7]/90 border border-[#FDE68A] text-[#92400E] text-xs text-center font-medium flex items-center justify-center space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[#D97706]" />
                  <span>
                    Anda berada ±{Math.round(distanceMeters)}m di luar perimeter {targetOfficeName}.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2E. Collapsible Technical Geofence Diagnostics */}
        <div className="relative z-10 pt-2 border-t border-[#E8DFD0]/60 flex items-center justify-between text-xs text-[#8C7E6A]">
          <div className="flex items-center space-x-1.5 min-w-0 truncate">
            <Building2 className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
            <span className="font-semibold text-[#161B26] truncate">
              {targetOfficeName}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowLocationDetails(!showLocationDetails)}
            className="flex items-center space-x-1 text-[11px] font-semibold text-[#8C7E6A] hover:text-[#161B26] p-1 rounded-lg transition-colors cursor-pointer"
          >
            <span>Detail Radar GPS</span>
            {showLocationDetails ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Collapsible Diagnostics Area */}
        {showLocationDetails && (
          <div className="relative z-10 bg-white/95 rounded-2xl border border-[#E8DFD0] p-3.5 text-xs font-mono space-y-2 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <span className="text-[#8C7E6A]">Koordinat Terdeteksi:</span>
              <span className="font-bold text-[#161B26]">
                {coords ? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}` : 'Mencari...'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#8C7E6A]">Radius Kantor:</span>
              <span className="font-bold text-[#161B26]">
                {activeOffice?.radius_meters || office?.radius_meters || 100} meter
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#8C7E6A]">Jarak Aktual:</span>
              <span className={`font-bold ${isWithinPerimeter ? 'text-emerald-700' : 'text-amber-700'}`}>
                {distanceMeters !== null ? `${Math.round(distanceMeters)} m` : '-'}
              </span>
            </div>

            <div className="pt-2 border-t border-[#E8DFD0] flex justify-end">
              <button
                type="button"
                onClick={onRefreshGeo}
                className="px-2.5 py-1 bg-[#FAF8F5] hover:bg-[#EAE3D2] border border-[#E8DFD0] text-[#161B26] rounded-lg text-[11px] font-sans font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Perbarui Lokasi GPS</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
