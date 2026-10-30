'use client';

import React from 'react';
import { X, ExternalLink } from 'lucide-react';

interface SelfieModalProps {
  photoUrl: string | null;
  title: string;
  onClose: () => void;
}

export function SelfieModal({ photoUrl, title, onClose }: SelfieModalProps) {
  if (!photoUrl) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full overflow-hidden shadow-xl space-y-3 p-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <h3 className="text-xs font-semibold text-slate-900 tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="aspect-[4/3] w-full bg-slate-900 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center">
          <img
            src={photoUrl}
            alt="Attendance Selfie"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span className="truncate max-w-[180px] font-mono text-[11px]">{photoUrl}</span>
          <a
            href={photoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-700 hover:text-amber-900 hover:underline flex items-center gap-1 font-semibold text-xs"
          >
            Open File <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
