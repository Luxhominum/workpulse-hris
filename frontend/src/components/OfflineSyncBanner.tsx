'use client';

import React from 'react';
import { CloudOff, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

interface OfflineSyncBannerProps {
  pendingCount: number;
  isSyncing: boolean;
  statusText: string | null;
  onSync: () => void;
}

export function OfflineSyncBanner({
  pendingCount,
  isSyncing,
  statusText,
  onSync,
}: OfflineSyncBannerProps) {
  if (pendingCount === 0 && !statusText) return null;

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 shadow-xs space-y-1.5 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {isSyncing ? (
            <RefreshCw className="w-4 h-4 text-amber-600 animate-spin" />
          ) : (
            <CloudOff className="w-4 h-4 text-amber-600" />
          )}
          <span className="text-xs font-semibold text-amber-900">
            {pendingCount} Presensi Tersimpan di HP (Offline)
          </span>
        </div>

        <button
          type="button"
          onClick={onSync}
          disabled={isSyncing}
          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-[11px] font-semibold rounded-lg shadow-xs transition-all disabled:opacity-50 flex items-center gap-1"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Sinkronisasi...' : 'Sinkronkan'}</span>
        </button>
      </div>

      <p className="text-[11px] text-amber-800/90 font-normal leading-relaxed">
        {statusText || 'Data tersimpan aman di memori perangkat dan akan otomatis dikirim begitu sinyal internet terhubung.'}
      </p>
    </div>
  );
}
