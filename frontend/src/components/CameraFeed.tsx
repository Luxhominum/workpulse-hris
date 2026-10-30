'use client';

import React from 'react';
import { Camera, RefreshCw, AlertCircle, Check, RotateCcw, Sparkles } from 'lucide-react';

interface CameraFeedProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isStreaming: boolean;
  isInitializing: boolean;
  capturedPhoto: { blob: Blob; dataUrl: string; sizeKb: number } | null;
  error: string | null;
  showDevControls?: boolean;
  onRetry: () => void;
  onCapture: () => void;
  onRetake: () => void;
  onSimulatePhoto?: () => void;
  onNativePhoto?: (file: File) => void;
}

export function CameraFeed({
  videoRef,
  isStreaming,
  isInitializing,
  capturedPhoto,
  error,
  showDevControls = process.env.NODE_ENV !== 'production',
  onRetry,
  onCapture,
  onRetake,
  onSimulatePhoto,
}: CameraFeedProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Camera className="w-4 h-4 text-slate-500" />
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Live Face Verification
          </span>
        </div>

        {capturedPhoto ? (
          <span className="text-[11px] font-mono font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
            <Check className="w-3 h-3" /> Foto Terverifikasi ({capturedPhoto.sizeKb} KB)
          </span>
        ) : isStreaming ? (
          <span className="flex items-center space-x-1.5 text-[10px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Kamera Live Aktif</span>
          </span>
        ) : null}
      </div>

      {/* Viewfinder Frame */}
      <div className="relative aspect-[4/3] w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner">
        {/* Error State */}
        {error ? (
          <div className="p-4 text-center space-y-3 max-w-xs">
            <AlertCircle className="w-7 h-7 text-rose-400 mx-auto" />
            <p className="text-xs text-slate-300 leading-relaxed font-normal">{error}</p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white text-slate-900 text-xs font-semibold rounded-lg hover:bg-slate-100 transition-colors shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Coba Akses Kamera</span>
              </button>
              {showDevControls && onSimulatePhoto && (
                <button
                  type="button"
                  onClick={onSimulatePhoto}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors"
                >
                  <span>Test Canvas</span>
                </button>
              )}
            </div>
          </div>
        ) : capturedPhoto ? (
          /* Captured Preview Image */
          <div className="relative w-full h-full">
            <img
              src={capturedPhoto.dataUrl}
              alt="Verification Preview"
              className="w-full h-full object-cover scale-x-[-1]"
            />
            <div className="absolute top-2.5 left-2.5 bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-medium px-2 py-0.5 rounded flex items-center gap-1 border border-white/10 shadow-xs">
              <Check className="w-3 h-3 text-emerald-400" /> Frame Berhasil Disimpan
            </div>
          </div>
        ) : (
          /* Live Viewfinder (Rendered on both Android & Desktop) */
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              webkit-playsinline="true"
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />

            {/* Face Alignment Oval Guide */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-40 h-52 border border-dashed border-white/60 rounded-full flex items-center justify-center shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]">
                <span className="text-[10px] text-white/90 font-semibold tracking-wide uppercase px-2 py-0.5 bg-black/60 rounded backdrop-blur-xs">
                  Posisikan Wajah
                </span>
              </div>
            </div>

            {/* Tap to Activate Overlay if video didn't auto-start */}
            {!isStreaming && !isInitializing && (
              <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center space-y-2.5 p-4 text-center">
                <Camera className="w-8 h-8 text-slate-400" />
                <p className="text-xs text-slate-300">Ketuk untuk mengaktifkan video preview live</p>
                <button
                  type="button"
                  onClick={onRetry}
                  className="px-3.5 py-1.5 bg-white text-slate-900 rounded-lg text-xs font-semibold shadow-xs hover:bg-slate-100 transition-colors"
                >
                  Aktifkan Kamera Live
                </button>
              </div>
            )}
          </>
        )}

        {/* Loading Spinner */}
        {isInitializing && !error && (
          <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center space-y-2">
            <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />
            <span className="text-xs text-slate-400 font-medium">Memulai kamera preview live...</span>
          </div>
        )}
      </div>

      {/* Shutter / Retake Controls */}
      <div className="space-y-2 pt-0.5">
        {capturedPhoto ? (
          <button
            type="button"
            onClick={onRetake}
            className="w-full flex items-center justify-center space-x-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Ambil Ulang Foto Selfie</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onCapture}
            disabled={!isStreaming || isInitializing}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-lg transition-all flex items-center justify-center space-x-2 shadow-xs"
          >
            <Camera className="w-4 h-4 text-emerald-400" />
            <span>Ambil Foto Presensi (Live Capture)</span>
          </button>
        )}
      </div>
    </div>
  );
}
