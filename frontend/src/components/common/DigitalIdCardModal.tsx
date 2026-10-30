'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import { Employee } from '../../types';
import { HapticFeedback } from '../../lib/haptics';
import {
  X,
  CreditCard,
  QrCode,
  RotateCw,
  Download,
  Building2,
  Phone,
  ShieldCheck,
  Sparkles,
  MapPin,
  Heart,
  Calendar,
  CheckCircle,
  Activity,
} from 'lucide-react';

interface DigitalIdCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
}

export function DigitalIdCardModal({ isOpen, onClose, employee }: DigitalIdCardModalProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // 3D Tilt & Holographic Parallax State
  const [tilt, setTilt] = useState<{ x: number; y: number; sheenX: number; sheenY: number }>({
    x: 0,
    y: 0,
    sheenX: 50,
    sheenY: 50,
  });

  const cardRef = useRef<HTMLDivElement>(null);
  const companyName = employee?.company?.name || 'Pusat Grosir Eceran (PGE)';

  useEffect(() => {
    if (employee) {
      setIsFlipped(false);
      // Generate secure QR payload
      const qrPayload = JSON.stringify({
        org: 'PGE',
        id: employee.id,
        nik: employee.employee_id_number || 'PGE-ID',
        name: employee.full_name,
        role: employee.role,
        pos: employee.position,
        v: 1,
      });

      QRCode.toDataURL(qrPayload, {
        width: 240,
        margin: 1,
        color: {
          dark: '#161B26',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Failed to generate QR:', err));
    }
  }, [employee]);

  // Handle Touch & Mouse 3D Gyroscope/Parallax Tilt
  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Calculate rotation (-14 to +14 deg)
    const rotateY = ((x - centerX) / centerX) * 14;
    const rotateX = -((y - centerY) / centerY) * 14;

    const sheenX = Math.round((x / rect.width) * 100);
    const sheenY = Math.round((y / rect.height) * 100);

    setTilt({
      x: rotateX,
      y: rotateY,
      sheenX,
      sheenY,
    });
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches[0]) {
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleResetTilt = () => {
    setTilt({ x: 0, y: 0, sheenX: 50, sheenY: 50 });
  };

  const toggleFlip = () => {
    HapticFeedback.tap();
    setIsFlipped(!isFlipped);
    handleResetTilt();
  };

  if (!isOpen || !employee) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR_Badge_${employee.employee_id_number || employee.id}.png`;
    a.click();
  };

  const initials = employee.nickname
    ? employee.nickname.slice(0, 2).toUpperCase()
    : employee.full_name.slice(0, 2).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#FAF7F2] rounded-3xl max-w-sm sm:max-w-md w-full border border-[#EBE4D5] shadow-2xl overflow-hidden font-sans flex flex-col">
        {/* Modal Top Bar */}
        <div className="p-4 border-b border-[#EBE4D5] flex items-center justify-between bg-white/70">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-lg bg-[#FEF3C7] flex items-center justify-center text-[#D97706]">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
            <h3 className="font-extrabold text-sm text-[#161B26]">
              Digital Employee Pass
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#8C7E6A] hover:text-[#161B26] hover:bg-slate-200/50 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3D Parallax Card Stage */}
        <div
          className="p-6 flex flex-col items-center justify-center bg-[#F3EDE2]/50 select-none overflow-hidden"
          style={{ perspective: '1200px' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleResetTilt}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleResetTilt}
        >
          {/* THE 3D HOLOGRAPHIC BADGE */}
          <div
            ref={cardRef}
            onClick={toggleFlip}
            className="relative w-full max-w-[320px] aspect-[1/1.58] rounded-3xl shadow-2xl overflow-hidden cursor-pointer transition-transform duration-100 ease-out"
            style={{
              transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1.02, 1.02, 1.02)`,
              transformStyle: 'preserve-3d',
            }}
          >
            {!isFlipped ? (
              /* FRONT OF ID CARD: LUXURY SUN & HEARTBEAT EMBLEM */
              <div className="w-full h-full bg-gradient-to-b from-[#1E2538] via-[#161B26] to-[#0D1117] text-white p-5 flex flex-col justify-between border border-[#D97706]/40 relative overflow-hidden">
                {/* Dynamic Holographic Solar Sheen Overlay */}
                <div
                  className="absolute inset-0 pointer-events-none transition-opacity duration-150"
                  style={{
                    background: `radial-gradient(circle at ${tilt.sheenX}% ${tilt.sheenY}%, rgba(253, 230, 138, 0.35) 0%, rgba(217, 119, 6, 0.15) 35%, transparent 65%)`,
                    mixBlendMode: 'screen',
                  }}
                />

                {/* Subtle ECG pulse wave in background */}
                <div className="absolute right-0 top-1/3 w-full h-24 opacity-10 pointer-events-none">
                  <svg viewBox="0 0 400 40" fill="none" className="w-full h-full stroke-amber-400">
                    <path
                      d="M 0 20 L 140 20 L 155 10 L 165 30 L 175 0 L 185 38 L 195 15 L 205 20 L 400 20"
                      strokeWidth="3"
                    />
                  </svg>
                </div>

                {/* Holographic Header Bar */}
                <div className="relative z-10 flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] p-0.5 flex items-center justify-center shadow-md">
                      <img
                        src="/brand/workpulse-emblem.png"
                        alt="WP"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] font-black tracking-widest text-[#FDE68A] uppercase block leading-none">
                        WORKPULSE
                      </span>
                      <span className="text-[8px] text-amber-200/70 tracking-wider block mt-0.5 uppercase truncate max-w-[145px]" title={companyName}>
                        {companyName}
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-[#D97706]/20 text-[#FDE68A] border border-[#D97706]/50 text-[9px] font-extrabold tracking-wider uppercase">
                    Verified Pass
                  </span>
                </div>

                {/* Badge Center: Avatar & Names */}
                <div className="relative z-10 flex flex-col items-center text-center my-auto py-1 space-y-2">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#D97706] via-[#F59E0B] to-[#FDE68A] p-0.5 shadow-xl">
                      <div className="w-full h-full rounded-[14px] bg-[#161B26] flex items-center justify-center text-white font-black text-2xl tracking-wider">
                        {initials}
                      </div>
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#D97706] border-2 border-[#161B26] flex items-center justify-center text-white shadow-sm">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-extrabold text-base text-white tracking-tight leading-tight">
                      {employee.full_name}
                    </h4>
                    {employee.nickname && (
                      <span className="text-xs font-semibold text-[#FDE68A] mt-0.5 inline-block">
                        &quot;{employee.nickname}&quot;
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5 flex-wrap justify-center">
                    <span className="font-mono text-[11px] font-bold bg-white/10 text-white px-2 py-0.5 rounded-md border border-white/15">
                      NIK: {employee.employee_id_number || 'PGE-ID'}
                    </span>
                    {employee.employment_status && (
                      <span className="text-[10px] font-bold bg-[#D97706]/30 text-amber-200 px-2 py-0.5 rounded-md border border-amber-500/40">
                        {employee.employment_status}
                      </span>
                    )}
                  </div>

                  <div className="text-center pt-0.5">
                    <span className="text-xs font-bold text-slate-200 block">
                      {employee.position || 'Staff'}
                    </span>
                    <span className="text-[10px] text-amber-200/80 block">
                      {employee.department}
                    </span>
                  </div>
                </div>

                {/* Badge Bottom: Scannable QR & Serial */}
                <div className="relative z-10 pt-2 border-t border-white/10 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[8px] text-slate-400 uppercase tracking-wider block">
                      Kantor Penempatan
                    </span>
                    <span className="text-[10px] font-semibold text-slate-200 block truncate max-w-[170px]">
                      {employee.office ? employee.office.name : 'Surakarta / Solo Hub'}
                    </span>
                    <span className="text-[8px] text-amber-300/60 font-mono block">
                      Join: {employee.join_date ? new Date(employee.join_date).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) : '2021'}
                    </span>
                  </div>

                  {qrDataUrl && (
                    <div className="w-14 h-14 bg-white rounded-xl p-1 shadow-md shrink-0 border border-amber-400/40">
                      <img
                        src={qrDataUrl}
                        alt="Employee QR Code"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* BACK OF ID CARD: COMPANY CREDENTIALS */
              <div className="w-full h-full bg-[#161B26] text-white p-5 flex flex-col justify-between border border-[#D97706]/40 relative">
                <div className="border-b border-white/10 pb-2 flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-[#FDE68A] uppercase">
                    Ketentuan Pegawai
                  </span>
                  <RotateCw className="w-3.5 h-3.5 text-slate-400" />
                </div>

                <div className="space-y-2 text-[10px] text-slate-300 leading-relaxed my-auto">
                  <p>1. Kartu ini adalah tanda pengenal resmi {companyName}.</p>
                  <p>2. Digunakan untuk clock-in Kiosk geofence, presensi mobile, dan otentikasi tugas dinas.</p>
                  <p>3. Jika kartu ditemukan di luar kantor, mohon hubungi HRD {companyName}.</p>
                  <div className="pt-2 border-t border-white/10 space-y-1">
                    <span className="text-[9px] text-[#FDE68A] block font-mono">
                      Emergency Contact:
                    </span>
                    <span className="text-[10px] text-white font-mono block">
                      {employee.emergency_contact_phone || '0812-3456-7890 (HRD)'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 text-center">
                  <span className="text-[8px] text-slate-400 font-mono uppercase tracking-widest block">
                    Tap di mana saja untuk membalik kartu
                  </span>
                </div>
              </div>
            )}
          </div>

          <p className="text-[11px] font-medium text-[#8C7E6A] mt-3 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
            <span>Miringkan jari untuk melihat efek 3D hologram emas • Ketuk untuk balik</span>
          </p>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-3 bg-white/70 border-t border-[#EBE4D5] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={toggleFlip}
            className="flex-1 py-2.5 px-3 rounded-2xl bg-[#FAF7F2] border border-[#EBE4D5] text-[#161B26] text-xs font-bold hover:bg-slate-100 flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5 text-[#D97706]" />
            <span>Balik Kartu</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="flex-1 py-2.5 px-3 rounded-2xl bg-[#161B26] text-white text-xs font-bold hover:bg-[#232B3E] flex items-center justify-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#FDE68A]" />
            <span>Simpan QR</span>
          </button>
        </div>
      </div>
    </div>
  );
}
