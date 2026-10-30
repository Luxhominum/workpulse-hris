'use client';

import React from 'react';
import { Office } from '../types';
import { GeoCoords } from '../hooks/useGeolocation';
import {
  Navigation,
  Check,
  AlertTriangle,
  RefreshCw,
  LocateFixed,
} from 'lucide-react';

interface GeolocationCardProps {
  coords: GeoCoords | null;
  error: string | null;
  isLoading: boolean;
  isSimulated: boolean;
  distanceMeters: number | null;
  isWithinPerimeter: boolean;
  assignedOffice?: Office | null;
  activeOffice?: Office | null;
  isWfhAllowed: boolean;
  showDevControls?: boolean;
  onRefresh: () => void;
  onSimulateOffice: () => void;
  onSimulateFar: () => void;
}

export function GeolocationCard({
  coords,
  error,
  isLoading,
  isSimulated,
  distanceMeters,
  isWithinPerimeter,
  assignedOffice,
  activeOffice,
  isWfhAllowed,
  showDevControls = process.env.NODE_ENV !== 'production',
  onRefresh,
  onSimulateOffice,
  onSimulateFar,
}: GeolocationCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-3.5">
      {/* Header and Compliance Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Navigation className="w-4 h-4 text-slate-500" />
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Location Compliance
          </span>
        </div>

        {/* Dynamic Perimeter Status Badge (Clean, No Emojis) */}
        {distanceMeters !== null && (
          <div
            className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
              isWithinPerimeter
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : isWfhAllowed
                ? 'bg-sky-50 text-sky-700 border-sky-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            {isWithinPerimeter ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Inside Perimeter</span>
              </>
            ) : isWfhAllowed ? (
              <>
                <Check className="w-3.5 h-3.5 text-sky-600" />
                <span>Remote / WFH Allowed</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Outside Perimeter</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start space-x-2 text-rose-800 text-xs">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-600" />
          <div className="flex-1 leading-relaxed">{error}</div>
        </div>
      )}

      {/* Distance and Coordinates Overview */}
      <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 space-y-1.5">
        {/* Target and Detected Office */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Perimeter Target:</span>
          <div className="text-right">
            <span className="font-semibold text-slate-900">
              {activeOffice?.name || assignedOffice?.name || 'Office Base'}
            </span>
            {activeOffice && assignedOffice && activeOffice.id !== assignedOffice.id && (
              <span className="block text-[10px] text-amber-700 font-medium">
                (Cabang Terdeteksi / Tugas Luar)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Measured Distance:</span>
          <span className="font-mono text-sm font-semibold text-slate-900">
            {distanceMeters !== null ? `${distanceMeters.toFixed(1)} m` : 'Acquiring GPS...'}
            <span className="text-slate-400 font-sans font-normal text-xs ml-1">
              (Limit: {activeOffice?.radius_meters || assignedOffice?.radius_meters || 50}m)
            </span>
          </span>
        </div>

        {coords && (
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/60 font-mono">
            <span>
              {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
            </span>
            {isSimulated && (
              <span className="font-sans text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                Simulated
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom Actions & Controls */}
      <div className="flex items-center justify-between pt-0.5 text-xs">
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center space-x-1.5 text-slate-600 hover:text-slate-900 font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Updating GPS...' : 'Refresh GPS'}</span>
        </button>

        {/* Simulation Shortcuts (Dev/Test only) */}
        {showDevControls && (
          <div className="flex items-center space-x-1.5">
            <button
              onClick={onSimulateOffice}
              title="Development override: Simulate coordinates at Office base"
              className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded-md text-[11px] font-medium border border-slate-200 shadow-xs transition-colors flex items-center gap-1"
            >
              <LocateFixed className="w-3 h-3 text-emerald-600" />
              <span>At HQ</span>
            </button>
            <button
              onClick={onSimulateFar}
              title="Development override: Simulate coordinates outside Perimeter"
              className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded-md text-[11px] font-medium border border-slate-200 shadow-xs transition-colors"
            >
              Outside
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
