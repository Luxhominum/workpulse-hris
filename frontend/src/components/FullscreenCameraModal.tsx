'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import {
  X,
  Camera,
  RotateCcw,
  CheckCircle2,
  Loader2,
  AlertCircle,
  MapPin,
  Sparkles,
  Sun,
  Activity,
} from 'lucide-react';
import { captureAndCompressFrame } from '../lib/imageCompressor';
import { HapticFeedback } from '../lib/haptics';

interface FullscreenCameraModalProps {
  isOpen: boolean;
  mode: 'clock-in' | 'clock-out';
  officeName?: string;
  isWithinPerimeter: boolean;
  isWfhAllowed: boolean;
  coords: { latitude: number; longitude: number } | null;
  onClose: () => void;
  onSubmit: (photoBlob: Blob, photoDataUrl: string) => Promise<void>;
  isSubmitting: boolean;
}

export function FullscreenCameraModal({
  isOpen,
  mode,
  officeName,
  isWithinPerimeter,
  isWfhAllowed,
  coords,
  onClose,
  onSubmit,
  isSubmitting,
}: FullscreenCameraModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const [capturedPhoto, setCapturedPhoto] = useState<{
    blob: Blob;
    dataUrl: string;
    sizeKb: number;
  } | null>(null);

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  const attachStream = useCallback((stream: MediaStream) => {
    if (videoRef.current) {
      const video = videoRef.current;
      video.srcObject = stream;
      video.muted = true;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');

      video.onloadedmetadata = () => {
        video
          .play()
          .then(() => {
            setIsStreaming(true);
            setIsInitializing(false);
          })
          .catch((err) => {
            console.warn('Auto-play blocked or deferred:', err);
            setIsStreaming(true);
            setIsInitializing(false);
          });
      };
    }
  }, []);

  const handleNativeCapacitorCapture = async () => {
    try {
      HapticFeedback.tap();
      setError(null);
      const photo = await CapCamera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });

      if (photo.dataUrl) {
        const res = await fetch(photo.dataUrl);
        const blob = await res.blob();
        setCapturedPhoto({
          blob,
          dataUrl: photo.dataUrl,
          sizeKb: Math.round((blob.size / 1024) * 10) / 10,
        });
        setError(null);
      }
    } catch (err: any) {
      console.warn('Native camera capture cancelled or failed:', err);
    }
  };

  const startCameraStream = useCallback(async () => {
    setIsInitializing(true);
    setError(null);
    setCapturedPhoto(null);

    // Stop previous track if any
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      // 1. Request native camera permissions on Android Capacitor before requesting web media
      if (typeof window !== 'undefined') {
        try {
          const perm = await CapCamera.requestPermissions({ permissions: ['camera'] });
          if (perm.camera === 'denied') {
            throw new Error('Izin kamera ditolak. Silakan berikan izin di Pengaturan Aplikasi.');
          }
        } catch (permErr: any) {
          console.warn('Capacitor camera request notice:', permErr);
        }
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Kamera tidak didukung oleh browser/webview ini.');
      }

      // 2. Race getUserMedia with a 4.5s timeout to guarantee it never freezes the UI
      const getStreamWithTimeout = async () => {
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT_CAMERA')), 4500)
        );

        const tryStream = async () => {
          try {
            return await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: { ideal: 'user' },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
              audio: false,
            });
          } catch (e1) {
            console.warn('Front camera constraint 1 failed, trying fallback:', e1);
            try {
              return await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'user' } },
                audio: false,
              });
            } catch (e2) {
              console.warn('Front camera constraint 2 failed, trying any video device:', e2);
              return await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false,
              });
            }
          }
        };

        return Promise.race([tryStream(), timeout]);
      };

      const stream = await getStreamWithTimeout();

      if (!stream) {
        throw new Error('Sensor kamera tidak dapat diaktifkan.');
      }

      streamRef.current = stream;
      attachStream(stream);
    } catch (err: any) {
      console.warn('Camera initiation failed:', err);
      let message = 'Gagal mengakses sensor kamera.';
      if (err.message === 'TIMEOUT_CAMERA') {
        message = 'Sensor kamera membutuhkan waktu terlalu lama untuk aktif. Anda dapat mencoba lagi atau membuka kamera native.';
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Izin kamera ditolak. Silakan berikan izin kamera pada aplikasi.';
      } else if (err.name === 'NotFoundError') {
        message = 'Kamera depan tidak ditemukan pada perangkat ini.';
      } else if (err.name === 'NotReadableError') {
        message = 'Sensor kamera sedang sibuk digunakan oleh aplikasi lain.';
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
      setIsInitializing(false);
      setIsStreaming(false);
    }
  }, [attachStream]);

  // Lifecycle: start camera only when modal opens, stop cleanly when modal closes
  useEffect(() => {
    if (isOpen) {
      startCameraStream();
    } else {
      stopCameraStream();
      setCapturedPhoto(null);
      setError(null);
    }

    return () => {
      stopCameraStream();
    };
  }, [isOpen, startCameraStream, stopCameraStream]);

  const handleCapture = async () => {
    if (!videoRef.current) return;
    HapticFeedback.tap();
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 280);
    try {
      const result = await captureAndCompressFrame(videoRef.current, 800, 0.85);
      setCapturedPhoto(result);
    } catch (err: any) {
      setError(`Gagal mengambil foto: ${err.message}`);
    }
  };

  const handleRetake = () => {
    HapticFeedback.tap();
    setCapturedPhoto(null);
    setSubmitError(null);
    if (streamRef.current) {
      attachStream(streamRef.current);
    } else {
      startCameraStream();
    }
  };

  const handleSimulatePhoto = () => {
    setSubmitError(null);
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 960;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#161B26';
      ctx.fillRect(0, 0, 720, 960);
      ctx.fillStyle = '#232B3E';
      ctx.beginPath();
      ctx.arc(360, 400, 180, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#D97706';
      ctx.font = 'bold 36px Plus Jakarta Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(mode === 'clock-in' ? 'PRESENSI MASUK' : 'PRESENSI PULANG', 360, 640);
      ctx.fillStyle = '#FAF7F2';
      ctx.font = '24px monospace';
      ctx.fillText(new Date().toLocaleTimeString(), 360, 690);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const dataUrl = canvas.toDataURL('image/webp', 0.85);
            setCapturedPhoto({
              blob,
              dataUrl,
              sizeKb: Math.round((blob.size / 1024) * 10) / 10,
            });
            setError(null);
          }
        },
        'image/webp',
        0.85
      );
    }
  };

  const handleConfirmSubmit = async () => {
    if (!capturedPhoto) return;
    setSubmitError(null);
    HapticFeedback.heartbeatSuccess();
    try {
      await onSubmit(capturedPhoto.blob, capturedPhoto.dataUrl);
    } catch (err: any) {
      setSubmitError(err.message || 'Gagal mengirim presensi.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden select-none animate-in fade-in duration-200 font-sans">
      {/* Sunrise Flash Animation */}
      {isFlashing && (
        <div className="absolute inset-0 bg-gradient-to-b from-amber-100/90 via-white to-amber-200/90 z-40 pointer-events-none transition-opacity duration-200" />
      )}

      {/* 1. Camera Viewport / Frozen Preview */}
      <div className="absolute inset-0 w-full h-full overflow-hidden bg-black flex items-center justify-center">
        {capturedPhoto ? (
          <img
            src={capturedPhoto.dataUrl}
            alt="Captured Selfie"
            className="w-full h-full object-cover scale-x-[-1]"
          />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            webkit-playsinline="true"
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
        )}

        {/* Upgrade 5: WorkPulse Solar Face Viewfinder */}
        {!capturedPhoto && isStreaming && !error && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            {/* Viewfinder Outer Container */}
            <div className="relative w-64 h-84 sm:w-72 sm:h-96 flex items-center justify-center">
              {/* Pulsating Solar Halo Corona */}
              <div
                className="absolute inset-0 rounded-[50%] border-2 border-amber-400/40 shadow-[0_0_50px_rgba(217,119,6,0.35)]"
                style={{ animation: 'solarRayRotate 25s linear infinite' }}
              />

              {/* Main Solar Golden Ring */}
              <div className="absolute inset-2 rounded-[50%] border-2 border-[#D97706] shadow-[0_0_25px_rgba(217,119,6,0.5)] flex flex-col items-center justify-between p-4 bg-[#161B26]/30 backdrop-blur-[1px]">
                {/* Top Alignment Status */}
                <div className="flex items-center space-x-1.5 px-3 py-1 bg-[#161B26]/80 backdrop-blur-md border border-[#D97706]/60 rounded-full shadow-sm">
                  <Sun className="w-3.5 h-3.5 text-[#F59E0B] animate-spin-slow" />
                  <span className="text-[10px] font-mono font-bold text-[#FEF3C7] uppercase tracking-widest">
                    Solar Reticle
                  </span>
                </div>

                {/* Center Vital Pulse Crosshair */}
                <div className="w-12 h-12 rounded-full border border-amber-300/30 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#D97706] shadow-[0_0_10px_#D97706] animate-pulse" />
                </div>

                {/* Bottom Liveness Badge */}
                <div className="flex items-center space-x-1.5 px-3 py-1 bg-[#161B26]/80 backdrop-blur-md border border-[#EBE4D5]/30 rounded-full shadow-sm">
                  <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span className="text-[9px] font-mono text-[#FAF7F2] uppercase tracking-wider font-semibold">
                    Liveness Sensor Active
                  </span>
                </div>
              </div>

              {/* 4 Solar Precision Reticle Brackets */}
              <div className="absolute -top-1 -left-1 w-5 h-5 border-t-2 border-l-2 border-[#F59E0B]" />
              <div className="absolute -top-1 -right-1 w-5 h-5 border-t-2 border-r-2 border-[#F59E0B]" />
              <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-2 border-l-2 border-[#F59E0B]" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-2 border-r-2 border-[#F59E0B]" />
            </div>

            <p className="mt-5 text-xs font-bold text-[#FAF7F2] drop-shadow-md flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] animate-ping" />
              Posisikan wajah Anda di dalam lingkar surya
            </p>
          </div>
        )}

        {/* Loading Spinner */}
        {isInitializing && !error && (
          <div className="absolute inset-0 bg-[#161B26]/85 backdrop-blur-xs flex flex-col items-center justify-center space-y-3 z-10">
            <Loader2 className="w-8 h-8 text-[#D97706] animate-spin" />
            <p className="text-xs text-[#FAF7F2] font-medium tracking-wide">
              Menghubungkan ke sensor kamera depan...
            </p>
          </div>
        )}

        {/* Error Fallback Screen */}
        {error && (
          <div className="absolute inset-0 bg-[#161B26]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-4 z-20">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-rose-400" />
            </div>
            <div className="space-y-1 max-w-xs">
              <h4 className="text-sm font-bold text-white">Kamera Tidak Tersedia</h4>
              <p className="text-xs text-slate-300 leading-relaxed">{error}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={handleNativeCapacitorCapture}
                className="px-4 py-2 bg-[#D97706] hover:bg-[#B45309] text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center justify-center space-x-1.5"
              >
                <Camera className="w-4 h-4" />
                <span>Buka Kamera HP (Native)</span>
              </button>
              <button
                type="button"
                onClick={startCameraStream}
                className="px-4 py-2 bg-white text-[#161B26] rounded-xl text-xs font-bold shadow hover:bg-slate-100 transition-colors"
              >
                Coba Akses Lagi
              </button>
              <button
                type="button"
                onClick={handleSimulatePhoto}
                className="px-4 py-2 bg-slate-800 text-slate-300 border border-slate-700 rounded-xl text-xs font-medium hover:bg-slate-700 transition-colors"
              >
                Foto Simulasi
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Top Header Bar (Over Video) */}
      <div className="relative z-50 p-4 pt-8 flex items-center justify-between bg-gradient-to-b from-[#161B26] via-[#161B26]/80 to-transparent">
        {/* Back / Close Button */}
        <button
          type="button"
          onClick={() => {
            HapticFeedback.tap();
            onClose();
          }}
          disabled={isSubmitting}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#161B26]/60 backdrop-blur-md border border-white/20 rounded-full text-white text-xs font-medium hover:bg-[#161B26]/80 transition-all active:scale-95 disabled:opacity-50"
        >
          <X className="w-4 h-4" />
          <span>Batal</span>
        </button>

        {/* Center Title Badge */}
        <div className="flex flex-col items-center">
          <div className="flex items-center space-x-1.5 px-3.5 py-1 bg-[#161B26]/70 backdrop-blur-md border border-[#D97706]/40 rounded-full text-white text-xs font-bold">
            {mode === 'clock-in' ? (
              <span className="text-emerald-400 tracking-wide">PRESENSI MASUK</span>
            ) : (
              <span className="text-[#F59E0B] tracking-wide">PRESENSI PULANG</span>
            )}
            <span className="text-white/40">•</span>
            <span className="flex items-center gap-1 text-[11px] font-mono text-[#FEF3C7]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          </div>
        </div>

        {/* GPS Status Chip */}
        <div className="flex items-center space-x-1 px-2.5 py-1 bg-[#161B26]/60 backdrop-blur-md border border-white/20 rounded-full text-[10px] text-white/90">
          <MapPin className="w-3 h-3 text-[#D97706]" />
          <span className="truncate max-w-[80px]">
            {isWfhAllowed ? 'WFH' : isWithinPerimeter ? 'Kantor' : 'Luar Radius'}
          </span>
        </div>
      </div>

      {/* 3. Bottom Action Controls Bar (Over Video) */}
      <div className="relative z-20 p-6 pb-8 bg-gradient-to-t from-[#161B26] via-[#161B26]/70 to-transparent space-y-4">
        {capturedPhoto ? (
          /* Captured Preview Actions */
          <div className="space-y-3 max-w-sm mx-auto w-full animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center justify-center space-x-2 text-emerald-400 text-xs font-semibold bg-emerald-950/70 border border-emerald-500/30 py-1.5 px-3 rounded-full backdrop-blur-md">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Foto Siap ({capturedPhoto.sizeKb} KB)</span>
            </div>

            {submitError && (
              <div className="flex items-start space-x-2.5 p-3 bg-red-950/90 border border-red-500/60 rounded-2xl text-red-200 text-xs shadow-xl backdrop-blur-md animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 text-left">
                  <p className="font-bold text-red-300">Presensi Gagal</p>
                  <p className="text-[11px] text-red-200/90 leading-tight mt-0.5">{submitError}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleRetake}
                disabled={isSubmitting}
                className="py-3 px-4 bg-white/10 hover:bg-white/20 active:bg-white/30 border border-white/20 text-white font-bold text-xs rounded-2xl backdrop-blur-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Ambil Ulang</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="py-3 px-4 bg-[#D97706] hover:bg-[#B45309] active:bg-[#92400E] text-white font-extrabold text-xs rounded-2xl shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Konfirmasi Absen</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Live View Shutter Bar */
          <div className="flex flex-col items-center justify-center space-y-3">
            <p className="text-[11px] text-white/80 font-medium drop-shadow-sm">
              Pastikan pencahayaan cukup dan wajah terlihat jelas
            </p>

            <div className="flex items-center justify-center">
              {/* Circular Camera Shutter Button with Solar Aura */}
              <button
                type="button"
                onClick={handleCapture}
                disabled={!isStreaming || isInitializing}
                className="group relative w-20 h-20 rounded-full border-4 border-[#F59E0B] flex items-center justify-center p-1.5 transition-transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(245,158,11,0.45)] hover:border-amber-300 cursor-pointer"
                aria-label="Ambil Foto Presensi"
              >
                <div className="w-full h-full bg-[#FAF7F2] group-active:bg-amber-100 group-hover:bg-amber-50 rounded-full transition-colors flex items-center justify-center shadow-inner">
                  <Camera className="w-6 h-6 text-[#161B26] group-hover:text-[#D97706] transition-colors" />
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
