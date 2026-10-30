'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClient } from '../../lib/api';
import { KioskInitData, KioskEmployee, KioskAttendanceResult } from '../../types';
import {
  Camera,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Search,
  Maximize2,
  Minimize2,
  RefreshCw,
  LogOut,
  UserCheck,
  ArrowLeft,
  X,
  Volume2,
  VolumeX,
  ChevronRight,
  ShieldCheck,
  Check,
  Lock,
  KeyRound,
  Sun,
  Sparkles,
} from 'lucide-react';

type KioskStep = 'ROSTER' | 'CONFIRM' | 'CAPTURE' | 'SUCCESS';

// Daylight Soft Pastel Palettes
const DAYLIGHT_PALETTES = [
  { bg: 'bg-[#EBF7F0]', text: 'text-[#1B633E]', border: 'border-[#CBE9D6]', dot: 'bg-[#10B981]' }, // Sage Green
  { bg: 'bg-[#FEF8E7]', text: 'text-[#975A16]', border: 'border-[#FDE7B4]', dot: 'bg-[#F59E0B]' }, // Morning Butter
  { bg: 'bg-[#F4F1FD]', text: 'text-[#553C9A]', border: 'border-[#E2DCFA]', dot: 'bg-[#8B5CF6]' }, // Soft Lavender
  { bg: 'bg-[#FBF1EC]', text: 'text-[#9C4221]', border: 'border-[#F6D7CD]', dot: 'bg-[#F97316]' }, // Warm Apricot
  { bg: 'bg-[#EEF7FA]', text: 'text-[#1D6384]', border: 'border-[#D4EBF5]', dot: 'bg-[#0EA5E9]' }, // Sky Breeze
  { bg: 'bg-[#FAF3F0]', text: 'text-[#873A5C]', border: 'border-[#F2D7E2]', dot: 'bg-[#EC4899]' }, // Rose Mist
];

function getDaylightPalette(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % DAYLIGHT_PALETTES.length;
  return DAYLIGHT_PALETTES[index];
}

export default function KioskPage() {
  const router = useRouter();

  // Multi-step Flow State
  const [kioskStep, setKioskStep] = useState<KioskStep>('ROSTER');
  const [selectedEmployee, setSelectedEmployee] = useState<KioskEmployee | null>(null);

  // Kiosk Core State
  const [initData, setInitData] = useState<KioskInitData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [cameraFlash, setCameraFlash] = useState<boolean>(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('all');

  // Submission & Feedback
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<KioskAttendanceResult | null>(null);
  const [countdown, setCountdown] = useState<number>(2);

  // 5-Second Auto Capture Countdown & Flash
  const [captureCountdown, setCaptureCountdown] = useState<number>(5);
  const [countdownFlash, setCountdownFlash] = useState<boolean>(false);

  // HR Authorization Gate State
  const [isHrAuthorized, setIsHrAuthorized] = useState<boolean>(false);
  const [hrPinInput, setHrPinInput] = useState<string>('');
  const [hrPinError, setHrPinError] = useState<string | null>(null);
  const [isVerifyingHrPin, setIsVerifyingHrPin] = useState<boolean>(false);
  const [hasCheckedAuth, setHasCheckedAuth] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = sessionStorage.getItem('workpulse_kiosk_hr_auth');
      if (auth === 'true') {
        setIsHrAuthorized(true);
      }
      setHasCheckedAuth(true);
    }
  }, []);

  const handleVerifyHrPin = async () => {
    if (!hrPinInput || hrPinInput.length < 4) {
      setHrPinError('Masukkan 4 digit PIN Supervisor Kios.');
      return;
    }
    try {
      setIsVerifyingHrPin(true);
      setHrPinError(null);
      await ApiClient.verifyKioskAdminPin(hrPinInput);
      sessionStorage.setItem('workpulse_kiosk_hr_auth', 'true');
      setIsHrAuthorized(true);
      setHrPinInput('');
      playSuccessChime();
    } catch (err: any) {
      setHrPinError(err.message || 'PIN Supervisor Kios tidak valid.');
    } finally {
      setIsVerifyingHrPin(false);
    }
  };

  const handleLockAndExitKiosk = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('workpulse_kiosk_hr_auth');
    }
    setIsHrAuthorized(false);
    router.push('/login');
  };

  // Camera Management
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Real-time Clock
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Prevent smartphone screen sleep when in kiosk mode (Screen WakeLock API)
  useEffect(() => {
    let wakeLock: any = null;
    const requestLock = async () => {
      try {
        if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (e) {
        console.warn('WakeLock not supported:', e);
      }
    };
    requestLock();
    return () => {
      if (wakeLock) wakeLock.release().catch(() => {});
    };
  }, []);

  // Web Audio Synth Chime (Warm Pentatonic Chime)
  const playSuccessChime = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.4);
      });
    } catch (e) {
      console.warn('Audio chime error:', e);
    }
  }, [soundEnabled]);

  // Countdown Tick Sound
  const playTickBeep = useCallback((isFinal: boolean = false) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(isFinal ? 1046.5 : 783.99, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch (e) {
      console.warn('Audio tick error:', e);
    }
  }, [soundEnabled]);

  // Load Kiosk Initialization Data (supports silent background refresh)
  const loadKiosk = useCallback(async (officeId?: string, isSilentRefresh: boolean = false) => {
    try {
      if (!isSilentRefresh) {
        setIsLoading(true);
      }
      const data = await ApiClient.getKioskInit(officeId);
      setInitData(data);
      if (data.selected_office && !officeId) {
        setSelectedOfficeId(data.selected_office.id);
      }
    } catch (err: any) {
      console.warn('loadKiosk error:', err);
      if (!isSilentRefresh) {
        setErrorMessage(err.message || 'Gagal memuat data kios kantor.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKiosk();
  }, [loadKiosk]);

  // Initialize Camera Stream
  useEffect(() => {
    let localStream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCameraError('Kamera tidak didukung oleh browser ini.');
          return;
        }
        localStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } },
          audio: false,
        });
        setMediaStream(localStream);
        setCameraActive(true);
        setCameraError(null);
      } catch (err: any) {
        console.warn('Camera stream error:', err);
        setCameraError('Izin kamera diperlukan untuk verifikasi foto selfie.');
        setCameraActive(false);
      }
    };

    startCamera();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Attach MediaStream to Video Element
  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
      videoRef.current.play().catch(() => {});
    }
  }, [mediaStream, kioskStep]);

  const isResettingRef = useRef<boolean>(false);

  // Reset whole flow back to Step 1 (Roster)
  const handleResetFlow = useCallback(() => {
    if (isResettingRef.current) return;
    isResettingRef.current = true;

    setSelectedEmployee(null);
    setKioskStep('ROSTER');
    setSuccessResult(null);
    setErrorMessage(null);
    setCountdown(2);
    setCaptureCountdown(5);
    setCountdownFlash(false);

    // Silent background sync so roster is never blocked with a loading spinner
    loadKiosk(selectedOfficeId, true);

    setTimeout(() => {
      isResettingRef.current = false;
    }, 400);
  }, [loadKiosk, selectedOfficeId]);

  // Success Modal Countdown Auto-Reset to Step 1 (Roster)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (kioskStep === 'SUCCESS') {
      if (countdown > 0) {
        timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      } else if (countdown === 0) {
        handleResetFlow();
      }
    }
    return () => clearTimeout(timer);
  }, [kioskStep, countdown, handleResetFlow]);

  // 5-Second Auto Capture Countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (kioskStep === 'CAPTURE') {
      if (captureCountdown > 0) {
        timer = setTimeout(() => {
          setCountdownFlash(true);
          playTickBeep(captureCountdown === 1);
          setTimeout(() => setCountdownFlash(false), 200);
          setCaptureCountdown((prev) => prev - 1);
        }, 1000);
      } else if (captureCountdown === 0 && !isSubmitting) {
        triggerAutoCapture();
      }
    }
    return () => clearTimeout(timer);
  }, [kioskStep, captureCountdown, isSubmitting, playTickBeep]);

  // Helper to Capture Image Blob from HTML Video Stream
  const captureSelfieBlob = async (): Promise<Blob> => {
    return new Promise((resolve) => {
      if (videoRef.current && canvasRef.current && cameraActive) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else resolve(new Blob(['dummy-selfie-data'], { type: 'image/jpeg' }));
            },
            'image/jpeg',
            0.85
          );
          return;
        }
      }
      resolve(new Blob(['kiosk-selfie-placeholder'], { type: 'image/jpeg' }));
    });
  };

  // Trigger Automatic Camera Capture at 0 Seconds
  const triggerAutoCapture = async () => {
    if (!selectedEmployee || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      // Camera shutter flash visual
      setCameraFlash(true);
      setTimeout(() => setCameraFlash(false), 180);

      const photoBlob = await captureSelfieBlob();
      let result: KioskAttendanceResult;

      if (selectedEmployee.today_status === 'NOT_CLOCKED_IN') {
        result = await ApiClient.kioskClockIn(
          selectedEmployee.id,
          photoBlob,
          undefined,
          selectedOfficeId
        );
      } else {
        result = await ApiClient.kioskClockOut(
          selectedEmployee.id,
          photoBlob,
          undefined,
          selectedOfficeId
        );
      }

      playSuccessChime();
      setSuccessResult(result);

      // Optimistically update the employee's status in local roster immediately
      setInitData((prev) => {
        if (!prev) return prev;
        const isClockIn = selectedEmployee.today_status === 'NOT_CLOCKED_IN';
        return {
          ...prev,
          employees: prev.employees.map((emp) => {
            if (emp.id === selectedEmployee.id) {
              return {
                ...emp,
                today_status: isClockIn ? 'CLOCKED_IN' : 'CLOCKED_OUT',
                clock_in_time: isClockIn ? (result.clock_in_time || new Date().toISOString()) : emp.clock_in_time,
                clock_out_time: !isClockIn ? (result.clock_out_time || new Date().toISOString()) : emp.clock_out_time,
                status_label: result.status_text || (isClockIn ? 'Hadir' : 'Selesai'),
              };
            }
            return emp;
          }),
        };
      });

      setCountdown(2);
      setKioskStep('SUCCESS');
    } catch (err: any) {
      setErrorMessage(err.message || 'Presensi gagal disimpan. Silakan coba kembali.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Departments for Filter Chips
  const departments = useMemo(() => {
    if (!initData) return [];
    const depts = new Set<string>();
    initData.employees.forEach((emp) => {
      if (emp.department) depts.add(emp.department);
    });
    return Array.from(depts);
  }, [initData]);

  // Filtered Employee List (Sorted Alphabetically by Full Name A-Z)
  const filteredEmployees = useMemo(() => {
    if (!initData) return [];
    return initData.employees
      .filter((emp) => {
        const matchesDept = selectedDept === 'all' || emp.department === selectedDept;
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          emp.full_name.toLowerCase().includes(q) ||
          (emp.nickname && emp.nickname.toLowerCase().includes(q)) ||
          (emp.employee_id_number && emp.employee_id_number.toLowerCase().includes(q));
        return matchesDept && matchesSearch;
      })
      .sort((a, b) => a.full_name.localeCompare(b.full_name, 'id', { sensitivity: 'base' }));
  }, [initData, selectedDept, searchQuery]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#FAF8F5] text-[#1E2538] font-sans select-none overflow-hidden relative">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Global Shutter Camera Flash Animation */}
      {cameraFlash && (
        <div className="fixed inset-0 bg-white z-50 pointer-events-none transition-opacity animate-out fade-out duration-150" />
      )}

      {/* ========================================================================= */}
      {/* HR AUTHORIZATION GATE (Daylight Warm Vault)                                */}
      {/* ========================================================================= */}
      {hasCheckedAuth && !isHrAuthorized ? (
        <div className="fixed inset-0 z-50 bg-[#1E2538]/40 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="max-w-sm w-full bg-white border border-[#E8E2D5] rounded-3xl p-6 text-center space-y-5 shadow-[0_20px_40px_-15px_rgba(40,30,20,0.12)]">
            {/* Friendly Sun / Shield Icon */}
            <div className="w-14 h-14 rounded-2xl bg-[#FEF8E7] border border-[#FDE7B4] flex items-center justify-center text-[#975A16] mx-auto shadow-sm">
              <Lock className="w-6 h-6 text-[#975A16]" />
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#F4F1FD] text-[#553C9A] text-[10px] font-medium tracking-widest uppercase border border-[#E2DCFA]">
                <KeyRound className="w-3 h-3" />
                Terminal Security
              </div>
              <h2 className="text-base font-bold text-[#1E2538] tracking-tight">
                Otorisasi Supervisor Kios
              </h2>
              <p className="text-xs text-[#5C6479] leading-relaxed max-w-[260px] mx-auto">
                Masukkan 4 digit PIN Supervisor untuk mengaktifkan terminal absensi bersama.
              </p>
            </div>

            {/* PIN Display Dots (Butter Yellow / Warm Oat) */}
            <div className="flex justify-center gap-3 py-2">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full border transition-all duration-150 ${
                    hrPinInput.length > idx
                      ? 'bg-[#1E2538] border-[#1E2538] scale-110'
                      : 'bg-[#F3EFE6] border-[#E8E2D5]'
                  }`}
                />
              ))}
            </div>

            {/* Error Message */}
            {hrPinError && (
              <div className="p-2.5 bg-[#FAF0ED] border border-[#F6D7CD] rounded-xl text-[#9C4221] text-xs flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 text-[#9C4221] shrink-0" />
                <span className="leading-tight">{hrPinError}</span>
              </div>
            )}

            {/* On-Screen Touch Keypad */}
            <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  onClick={() => {
                    if (hrPinInput.length < 6) {
                      setHrPinInput((p) => p + digit);
                      setHrPinError(null);
                    }
                  }}
                  className="h-11 rounded-xl bg-[#F7F5F0] hover:bg-[#EFECE4] active:bg-[#E5E0D5] active:scale-95 text-base font-semibold text-[#1E2538] border border-[#E8E2D5] transition-all cursor-pointer shadow-2xs"
                >
                  {digit}
                </button>
              ))}
              <button
                onClick={() => setHrPinInput('')}
                className="h-11 rounded-xl bg-white hover:bg-[#FAF0ED] active:scale-95 text-xs font-medium text-[#716C62] hover:text-[#9C4221] border border-[#E8E2D5] transition-all cursor-pointer"
              >
                Clear
              </button>
              <button
                onClick={() => {
                  if (hrPinInput.length < 6) {
                    setHrPinInput((p) => p + '0');
                    setHrPinError(null);
                  }
                }}
                className="h-11 rounded-xl bg-[#F7F5F0] hover:bg-[#EFECE4] active:bg-[#E5E0D5] active:scale-95 text-base font-semibold text-[#1E2538] border border-[#E8E2D5] transition-all cursor-pointer shadow-2xs"
              >
                0
              </button>
              <button
                onClick={() => setHrPinInput((p) => p.slice(0, -1))}
                className="h-11 rounded-xl bg-white hover:bg-[#F3EFE6] active:scale-95 text-xs font-medium text-[#716C62] border border-[#E8E2D5] transition-all cursor-pointer"
              >
                Del
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="flex-1 py-3 px-3 rounded-xl font-medium text-xs bg-[#F3EFE6] hover:bg-[#EBE5D9] text-[#5C6479] border border-[#E8E2D5] transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#5C6479]" />
                <span>Kembali</span>
              </button>

              <button
                type="button"
                disabled={isVerifyingHrPin || hrPinInput.length < 4}
                onClick={() => handleVerifyHrPin()}
                className="flex-[1.5] py-3 px-4 rounded-xl font-semibold text-xs bg-[#1E2538] hover:bg-[#2B344D] text-white transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer active:scale-95 shadow-md shadow-[#1E2538]/15"
              >
                <ShieldCheck className="w-4 h-4 text-white" />
                <span>{isVerifyingHrPin ? 'Memverifikasi...' : 'Buka Terminal'}</span>
              </button>
            </div>
            <p className="text-[10px] text-[#8C8578] font-mono">
              PIN Master: 8888 / 1234
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* STEP 1: ROSTER & SELECTION (Daylight Warm Editorial Canvas)                */}
          {/* ========================================================================= */}
          {kioskStep === 'ROSTER' && (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Daylight Editorial Header Bar */}
              <header className="px-5 py-3.5 bg-white border-b border-[#E8E2D5] flex items-center justify-between shrink-0 shadow-2xs">
                {/* Brand & Location Info */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-[#FEF8E7] border border-[#FDE7B4] flex items-center justify-center p-0.5 shadow-2xs overflow-hidden">
                    <img
                      src="/brand/workpulse-emblem.png"
                      alt="WorkPulse"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-sm font-bold text-[#1E2538] tracking-tight leading-tight">
                        WorkPulse Kiosk
                      </h1>
                      {isLoading && initData ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FEF8E7] text-[9px] font-mono font-medium text-[#975A16] border border-[#FDE7B4]">
                          <RefreshCw className="w-2.5 h-2.5 animate-spin text-[#975A16]" />
                          SYNC
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EBF7F0] text-[9px] font-mono font-medium text-[#1B633E] border border-[#CBE9D6]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#5C6479]">
                      {initData?.selected_office?.name || 'Bandung Regional Branch'}
                    </p>
                  </div>
                </div>

                {/* Center Live Clock (Daylight Serene Monospace) */}
                <div className="hidden md:flex flex-col items-center px-4 py-1.5 rounded-2xl bg-[#FAF8F5] border border-[#E8E2D5]">
                  <div className="text-sm font-mono font-bold tracking-tight text-[#1E2538] flex items-center gap-1.5">
                    <span>
                      {currentTime
                        ? currentTime.toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })
                        : '--:--:--'}
                    </span>
                    <span className="text-[10px] text-[#975A16] font-sans font-semibold">WIB</span>
                  </div>
                  <div className="text-[10px] text-[#716C62] capitalize font-medium">
                    {currentTime
                      ? currentTime.toLocaleDateString('id-ID', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Memuat waktu...'}
                  </div>
                </div>

                {/* Segmented Controls Cluster */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center p-0.5 rounded-xl bg-[#FAF8F5] border border-[#E8E2D5]">
                    <button
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      title={soundEnabled ? 'Suara Aktif' : 'Suara Senyap'}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        soundEnabled ? 'text-[#1B633E] bg-[#EBF7F0]' : 'text-[#8C8578] hover:text-[#1E2538]'
                      }`}
                    >
                      {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={toggleFullscreen}
                      title="Layar Penuh"
                      className="p-1.5 rounded-lg text-[#716C62] hover:text-[#1E2538] transition-colors cursor-pointer"
                    >
                      {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Lock Kiosk (Daylight Midnight Pill) */}
                  <button
                    onClick={handleLockAndExitKiosk}
                    title="Kunci Terminal Kios"
                    className="px-3.5 py-1.5 rounded-xl bg-[#1E2538] hover:bg-[#2B344D] text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm"
                  >
                    <Lock className="w-3.5 h-3.5 text-[#FEE07A]" />
                    <span className="hidden sm:inline">Kunci Kios</span>
                  </button>
                </div>
              </header>

              {/* Filter & Search Bar */}
              <div className="px-5 py-3.5 bg-[#F6F3EC] border-b border-[#E8E2D5] flex flex-col gap-2.5 shrink-0">
                {/* Search Input (Soft White Pill with Sand Border) */}
                <div className="relative">
                  <Search className="w-4 h-4 text-[#8C8578] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari nama karyawan atau NIK..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-9 py-2.5 bg-white border border-[#E0D9CB] focus:border-[#1E2538] rounded-xl text-xs text-[#1E2538] placeholder-[#8C8578] focus:outline-none transition-all shadow-2xs"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8578] hover:text-[#1E2538] p-0.5 rounded-full"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Department Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                  <button
                    onClick={() => setSelectedDept('all')}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      selectedDept === 'all'
                        ? 'bg-[#1E2538] text-white shadow-sm'
                        : 'bg-white text-[#5C6479] hover:text-[#1E2538] hover:bg-[#F0EBE0] border border-[#E0D9CB]'
                    }`}
                  >
                    Semua ({initData?.employees.length || 0})
                  </button>
                  {departments.map((dept) => (
                    <button
                      key={dept}
                      onClick={() => setSelectedDept(dept)}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        selectedDept === dept
                          ? 'bg-[#1E2538] text-white shadow-sm'
                          : 'bg-white text-[#5C6479] hover:text-[#1E2538] hover:bg-[#F0EBE0] border border-[#E0D9CB]'
                      }`}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toast Error Notification */}
              {errorMessage && (
                <div className="mx-5 mt-3 p-3 bg-[#FAF0ED] border border-[#F6D7CD] text-[#9C4221] text-xs rounded-xl flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-[#9C4221] shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                  <button onClick={() => setErrorMessage(null)} className="text-[#9C4221] hover:text-black p-1">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Employee Directory Cards Grid */}
              <main className="flex-1 overflow-y-auto p-5 space-y-3">
                {isLoading && !initData ? (
                  <div className="py-28 text-center text-[#8C8578]">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-[#1E2538]" />
                    <span className="text-xs font-medium">Menyiapkan data karyawan...</span>
                  </div>
                ) : filteredEmployees.length === 0 ? (
                  <div className="py-24 text-center bg-white rounded-3xl border border-[#E8E2D5] max-w-md mx-auto shadow-2xs p-6">
                    <p className="text-sm font-semibold text-[#1E2538]">Tidak ada karyawan yang cocok</p>
                    <p className="text-xs text-[#716C62] mt-1">Silakan periksa kata kunci pencarian Anda.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {filteredEmployees.map((emp) => {
                      const isClockedIn = emp.today_status === 'CLOCKED_IN';
                      const isClockedOut = emp.today_status === 'CLOCKED_OUT';
                      const initials = emp.nickname
                        ? emp.nickname.slice(0, 2).toUpperCase()
                        : emp.full_name.slice(0, 2).toUpperCase();
                      const palette = getDaylightPalette(emp.full_name);

                      return (
                        <div
                          key={emp.id}
                          onClick={() => {
                            if (isClockedOut) {
                              setErrorMessage(`${emp.full_name} sudah menyelesaikan presensi hari ini.`);
                              setTimeout(() => setErrorMessage(null), 3500);
                              return;
                            }
                            setSelectedEmployee(emp);
                            setKioskStep('CONFIRM');
                          }}
                          className="bg-white hover:bg-[#FCFBF8] border border-[#E8E2D5] hover:border-[#D5CEBE] rounded-2xl p-3.5 flex items-center justify-between gap-3 transition-all cursor-pointer active:scale-[0.985] shadow-[0_2px_10px_-2px_rgba(40,30,20,0.03)] hover:shadow-md"
                        >
                          {/* Avatar & Employee Details */}
                          <div className="flex items-center gap-3.5 min-w-0">
                            {/* Daylight Soft Pastel Avatar */}
                            <div className="relative shrink-0">
                              <div
                                className={`w-11 h-11 rounded-xl ${palette.bg} border ${palette.border} flex items-center justify-center font-bold text-xs tracking-wider ${palette.text} shadow-2xs`}
                              >
                                {initials}
                              </div>
                              {/* Live Status Micro Dot */}
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                                  isClockedIn
                                    ? 'bg-[#10B981]'
                                    : isClockedOut
                                    ? 'bg-[#9CA3AF]'
                                    : 'bg-[#F59E0B]'
                                }`}
                              />
                            </div>

                            <div className="min-w-0">
                              <h3 className="text-sm font-bold text-[#1E2538] tracking-tight truncate">
                                {emp.full_name}
                              </h3>
                              <div className="text-[11px] text-[#5C6479] flex items-center gap-1.5 mt-0.5 truncate">
                                <span className="font-mono text-[#1E2538] font-medium">
                                  {emp.employee_id_number || 'PGE-STAFF'}
                                </span>
                                <span className="text-[#D5CEBE]">•</span>
                                <span className="truncate">{emp.department || 'Staff'}</span>
                              </div>
                              <div className="text-[10px] text-[#8C8578] font-mono mt-0.5">
                                Shift: {emp.shift.start_time} - {emp.shift.end_time}
                              </div>
                            </div>
                          </div>

                          {/* Status Badge & Chevron */}
                          <div className="flex items-center gap-2 shrink-0">
                            {isClockedOut ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#F5F2EB] text-[#716C62] border border-[#E2DCCF]">
                                Selesai
                              </span>
                            ) : isClockedIn ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#EBF7F0] text-[#1B633E] border border-[#CBE9D6] flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                                Hadir
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#FEF8E7] text-[#975A16] border border-[#FDE7B4]">
                                Belum Hadir
                              </span>
                            )}

                            <div className="w-7 h-7 rounded-full bg-[#FAF8F5] border border-[#E8E2D5] flex items-center justify-center text-[#8C8578]">
                              <ChevronRight className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </main>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: USER VERIFICATION CONFIRMATION (Daylight Clean Dialog)             */}
          {/* ========================================================================= */}
          {kioskStep === 'CONFIRM' && selectedEmployee && (
            <div className="fixed inset-0 z-50 bg-[#1E2538]/40 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-white border border-[#E8E2D5] rounded-3xl max-w-sm w-full p-6 text-center space-y-5 shadow-[0_20px_50px_-15px_rgba(40,30,20,0.15)]">
                {/* Header Tag */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[#F4F1FD] text-[#553C9A] border border-[#E2DCFA]">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Konfirmasi Identitas</span>
                </div>

                {/* Daylight Avatar */}
                {(() => {
                  const p = getDaylightPalette(selectedEmployee.full_name);
                  const init = selectedEmployee.nickname
                    ? selectedEmployee.nickname.slice(0, 2).toUpperCase()
                    : selectedEmployee.full_name.slice(0, 2).toUpperCase();
                  return (
                    <div
                      className={`w-16 h-16 rounded-2xl ${p.bg} border ${p.border} flex items-center justify-center font-bold text-xl ${p.text} mx-auto shadow-sm`}
                    >
                      {init}
                    </div>
                  );
                })()}

                {/* Details */}
                <div className="space-y-1">
                  <p className="text-xs text-[#5C6479]">Apakah benar Anda adalah:</p>
                  <h2 className="text-lg font-bold text-[#1E2538] tracking-tight leading-snug">
                    {selectedEmployee.full_name}
                  </h2>
                  <p className="text-xs text-[#5C6479]">
                    NIK:{' '}
                    <span className="text-[#1E2538] font-mono font-medium">
                      {selectedEmployee.employee_id_number || 'PGE-STAFF'}
                    </span>{' '}
                    • {selectedEmployee.department}
                  </p>
                </div>

                {/* Attendance Mode Card */}
                <div className="bg-[#FAF8F5] p-3 rounded-2xl border border-[#E8E2D5] text-xs flex items-center justify-between">
                  <span className="text-[#5C6479] font-medium">Tipe Presensi:</span>
                  <span
                    className={`font-semibold px-2.5 py-0.5 rounded-full text-[11px] ${
                      selectedEmployee.today_status === 'NOT_CLOCKED_IN'
                        ? 'bg-[#EBF7F0] text-[#1B633E] border border-[#CBE9D6]'
                        : 'bg-[#FEF8E7] text-[#975A16] border border-[#FDE7B4]'
                    }`}
                  >
                    {selectedEmployee.today_status === 'NOT_CLOCKED_IN' ? 'Presensi Masuk' : 'Presensi Pulang'}
                  </span>
                </div>

                {/* Yes / No Choices */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEmployee(null);
                      setKioskStep('ROSTER');
                    }}
                    className="py-3 px-4 rounded-xl font-semibold text-xs bg-[#F3EFE6] hover:bg-[#EAE4D7] text-[#5C6479] border border-[#E8E2D5] transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <X className="w-3.5 h-3.5 text-[#9C4221]" />
                    <span>Bukan / Batal</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCaptureCountdown(5);
                      setCountdownFlash(false);
                      setKioskStep('CAPTURE');
                    }}
                    className="py-3 px-4 rounded-xl font-bold text-xs bg-[#1E2538] hover:bg-[#2B344D] text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-md shadow-[#1E2538]/15"
                  >
                    <Check className="w-4 h-4 text-[#FEE07A]" />
                    <span>Ya, Benar Saya</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: CAMERA VIEWFINDER & SHUTTER (Daylight Clean Studio)                */}
          {/* ========================================================================= */}
          {kioskStep === 'CAPTURE' && selectedEmployee && (
            <div className="flex flex-col h-full bg-[#FAF8F5] overflow-hidden">
              {/* Studio Header */}
              <header className="px-5 py-3.5 bg-white border-b border-[#E8E2D5] flex items-center justify-between shrink-0">
                <button
                  onClick={() => setKioskStep('CONFIRM')}
                  className="px-3 py-1.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F3EFE6] text-[#5C6479] border border-[#E8E2D5] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-[#5C6479]" />
                  <span>Kembali</span>
                </button>

                <div className="text-center">
                  <span className="text-[10px] text-[#8C8578] uppercase tracking-widest block font-medium">
                    Ambil Foto Selfie
                  </span>
                  <span className="text-sm font-bold text-[#1E2538] leading-tight">
                    {selectedEmployee.full_name}
                  </span>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                    selectedEmployee.today_status === 'NOT_CLOCKED_IN'
                      ? 'bg-[#EBF7F0] text-[#1B633E] border border-[#CBE9D6]'
                      : 'bg-[#FEF8E7] text-[#975A16] border border-[#FDE7B4]'
                  }`}
                >
                  {selectedEmployee.today_status === 'NOT_CLOCKED_IN' ? 'Presensi Masuk' : 'Presensi Pulang'}
                </span>
              </header>

              {/* Viewfinder Studio Area */}
              <main className="flex-1 p-5 flex flex-col items-center justify-center gap-4 overflow-hidden relative">
                <div className="relative w-full max-w-sm aspect-[3/4] bg-white rounded-3xl border-2 border-[#E8E2D5] overflow-hidden shadow-[0_20px_40px_-15px_rgba(40,30,20,0.08)] flex items-center justify-center">
                  {/* Screen Flash on Each Second Tick */}
                  {countdownFlash && (
                    <div className="absolute inset-0 bg-white/75 z-30 pointer-events-none transition-opacity duration-150 animate-out fade-out" />
                  )}

                  {/* Live Video */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />

                  {/* Minimalist Oval Face Guide */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                    <div className="w-[64%] h-[78%] border-2 border-dashed border-white/80 rounded-[50%] flex items-center justify-center drop-shadow-md">
                      <span className="text-[10px] font-semibold tracking-wide text-[#1E2538] bg-white/90 backdrop-blur-md px-3 py-1 rounded-full border border-white/80 shadow-sm">
                        Posisikan Wajah Anda
                      </span>
                    </div>
                  </div>

                  {/* Live Camera Badge */}
                  <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full border border-white/80 text-[10px] font-medium shadow-2xs">
                    <span className={`w-2 h-2 rounded-full ${cameraActive ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`} />
                    <span className={cameraActive ? 'text-[#1B633E]' : 'text-[#DC2626]'}>
                      {cameraActive ? 'Kamera Aktif' : 'Kamera Nonaktif'}
                    </span>
                  </div>

                  {/* Countdown Badge in Top Right */}
                  <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full border border-white/80 shadow-2xs">
                    <Clock className="w-3 h-3 text-[#975A16]" />
                    <span className="text-[10px] font-mono font-bold text-[#1E2538]">
                      Auto: <strong className="text-[#975A16]">{captureCountdown}s</strong>
                    </span>
                  </div>

                  {/* Central Countdown Number */}
                  {captureCountdown > 0 && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-25">
                      <div
                        className={`w-18 h-18 rounded-full flex items-center justify-center font-mono font-bold text-3xl shadow-xl transition-all duration-150 ${
                          countdownFlash
                            ? 'scale-110 bg-[#1E2538] text-white'
                            : 'scale-100 bg-white/90 text-[#1E2538] border border-white/90 backdrop-blur-md'
                        }`}
                      >
                        {captureCountdown}
                      </div>
                    </div>
                  )}

                  {/* Camera Error Message */}
                  {cameraError && (
                    <div className="absolute bottom-4 inset-x-4 bg-[#FAF0ED] border border-[#F6D7CD] text-[#9C4221] text-xs p-3 rounded-xl text-center z-20">
                      {cameraError}
                    </div>
                  )}
                </div>

                {/* Submission Error Banner */}
                {errorMessage && (
                  <div className="p-3 bg-[#FAF0ED] border border-[#F6D7CD] rounded-xl text-[#9C4221] text-xs flex items-center gap-2 max-w-sm w-full">
                    <AlertCircle className="w-4 h-4 text-[#9C4221] shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Shutter Button with Countdown & Skip */}
                <div className="w-full max-w-sm flex flex-col items-center gap-2 shrink-0">
                  <button
                    disabled={isSubmitting}
                    onClick={() => {
                      setCaptureCountdown(0);
                    }}
                    className="w-full py-3.5 px-6 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all bg-[#1E2538] hover:bg-[#2B344D] text-white disabled:opacity-40 cursor-pointer active:scale-95 shadow-md shadow-[#1E2538]/15"
                  >
                    <Camera className="w-4 h-4 text-[#FEE07A]" />
                    <span>
                      {isSubmitting
                        ? 'Menyimpan Presensi...'
                        : captureCountdown > 0
                        ? `FOTO SEKARANG (LEWATI ${captureCountdown}s)`
                        : 'MENGAMBIL FOTO...'}
                    </span>
                  </button>
                  <p className="text-[10px] text-[#8C8578] text-center font-medium">
                    Foto otomatis diambil dalam {captureCountdown} detik dengan flash layar.
                  </p>
                </div>
              </main>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: CELEBRATION MODAL (Daylight Serene Receipt)                        */}
          {/* ========================================================================= */}
          {kioskStep === 'SUCCESS' && successResult && (
            <div className="fixed inset-0 z-50 bg-[#1E2538]/40 backdrop-blur-md flex items-center justify-center p-4">
              <div className="max-w-sm w-full bg-white border border-[#E8E2D5] rounded-3xl p-7 text-center space-y-5 shadow-[0_25px_60px_-15px_rgba(40,30,20,0.18)]">
                {/* Botanical Sun Badge */}
                <div className="w-16 h-16 rounded-full bg-[#EBF7F0] border border-[#CBE9D6] flex items-center justify-center mx-auto text-[#1B633E] shadow-sm">
                  <CheckCircle2 className="w-8 h-8 text-[#10B981]" />
                </div>

                {/* Message Details */}
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-widest bg-[#EBF7F0] text-[#1B633E] border border-[#CBE9D6]">
                    Presensi Berhasil
                  </div>
                  <h2 className="text-xl font-bold text-[#1E2538] tracking-tight pt-1">
                    Halo, {successResult.nickname || selectedEmployee?.full_name}!
                  </h2>
                  <p className="text-xs text-[#5C6479] leading-relaxed max-w-xs mx-auto">
                    {successResult.message}
                  </p>
                </div>

                {/* Attendance Timestamp Badge */}
                <div className="bg-[#FAF8F5] p-3 rounded-2xl border border-[#E8E2D5] text-xs text-[#5C6479] font-mono">
                  Waktu Tercatat: <strong className="text-[#1E2538] font-bold">{successResult.clock_in_time || successResult.clock_out_time} WIB</strong>
                </div>

                {/* Auto-Dismiss Button */}
                <button
                  onClick={handleResetFlow}
                  className="w-full py-3 bg-[#1E2538] hover:bg-[#2B344D] text-white rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-sm"
                >
                  Kembali ke Daftar ({countdown}s)
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
