'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { HapticFeedback } from '../lib/haptics';

interface SlideToConfirmProps {
  mode: 'clock-in' | 'clock-out';
  label?: string;
  onConfirm: () => void;
  disabled?: boolean;
  disabledReason?: string;
}

export function SlideToConfirm({
  mode,
  label,
  onConfirm,
  disabled = false,
  disabledReason,
}: SlideToConfirmProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const knobRef = useRef<HTMLDivElement | null>(null);

  const [dragX, setDragX] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [maxDrag, setMaxDrag] = useState<number>(240);

  const dragStartXRef = useRef<number>(0);
  const hasTriggeredRef = useRef<boolean>(false);
  const lastHapticMilestoneRef = useRef<number>(0);

  // Compute maximum travel distance dynamically
  const updateMaxDrag = useCallback(() => {
    if (trackRef.current && knobRef.current) {
      const trackWidth = trackRef.current.clientWidth;
      const knobWidth = knobRef.current.clientWidth;
      // 8px total horizontal padding (4px left + 4px right)
      const available = Math.max(60, trackWidth - knobWidth - 8);
      setMaxDrag(available);
    }
  }, []);

  useEffect(() => {
    updateMaxDrag();
    window.addEventListener('resize', updateMaxDrag);
    return () => window.removeEventListener('resize', updateMaxDrag);
  }, [updateMaxDrag]);

  // Reset slider if disabled
  useEffect(() => {
    if (disabled) {
      setDragX(0);
      setIsDragging(false);
      setIsCompleted(false);
      hasTriggeredRef.current = false;
    }
  }, [disabled]);

  const handleDragStart = (clientX: number) => {
    if (disabled || isCompleted) return;
    updateMaxDrag();
    setIsDragging(true);
    dragStartXRef.current = clientX;
    hasTriggeredRef.current = false;
    lastHapticMilestoneRef.current = 0;
    HapticFeedback.tick();
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging || disabled || isCompleted) return;

    const deltaX = clientX - dragStartXRef.current;
    const clampedX = Math.max(0, Math.min(maxDrag, deltaX));
    setDragX(clampedX);

    // Subtle haptic milestone pulses at 25% and 50%
    const progressPercent = Math.round((clampedX / maxDrag) * 100);
    const milestone = Math.floor(progressPercent / 30);
    if (milestone > lastHapticMilestoneRef.current && progressPercent < 75) {
      lastHapticMilestoneRef.current = milestone;
      HapticFeedback.tick();
    }

    // Trigger threshold: 72%
    if (clampedX >= maxDrag * 0.72 && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      setIsCompleted(true);
      setIsDragging(false);
      setDragX(maxDrag);
      HapticFeedback.heartbeatSuccess();

      setTimeout(() => {
        onConfirm();
        // Reset knob smoothly after transition
        setTimeout(() => {
          setIsCompleted(false);
          setDragX(0);
          hasTriggeredRef.current = false;
        }, 700);
      }, 150);
    }
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (!hasTriggeredRef.current) {
      // Fluid spring back to start
      setDragX(0);
    }
  };

  // Touch handlers for mobile
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handleDragStart(e.touches[0].clientX);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handleDragMove(e.touches[0].clientX);
    }
  };

  const onTouchEnd = () => {
    handleDragEnd();
  };

  // Pointer / Mouse handlers
  const onPointerDown = (e: React.PointerEvent) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    handleDragStart(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    handleDragMove(e.clientX);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    handleDragEnd();
  };

  const progressPercent = maxDrag > 0 ? Math.min(100, Math.round((dragX / maxDrag) * 100)) : 0;
  const isClockIn = mode === 'clock-in';
  const defaultLabel = isClockIn ? 'Geser untuk Presensi Masuk' : 'Geser untuk Presensi Pulang';
  const displayLabel = label || defaultLabel;

  return (
    <div className="w-full select-none">
      {/* 1. iOS True Capsule Track (Rounded-Full) */}
      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        className={`relative h-14 w-full rounded-full p-1 flex items-center overflow-hidden touch-none transition-all shadow-[0_4px_24px_rgba(22,27,38,0.18)] ${
          disabled
            ? 'bg-[#161B26]/40 border border-[#E8E2D5]/20 opacity-55 cursor-not-allowed'
            : isClockIn
            ? 'bg-[#161B26] border border-[#D97706]/40'
            : 'bg-[#161B26] border border-amber-600/40'
        }`}
      >
        {/* Dynamic Curved Fill that perfectly hugs the circular knob */}
        {dragX > 0 && (
          <div
            className={`absolute left-1 top-1 bottom-1 rounded-full pointer-events-none transition-all ${
              isClockIn
                ? 'bg-gradient-to-r from-[#D97706]/40 to-[#F59E0B]/60'
                : 'bg-gradient-to-r from-amber-700/40 to-[#EA580C]/60'
            }`}
            style={{ width: `${dragX + 48}px` }}
          />
        )}

        {/* Shimmering Center Label (fades smoothly as dragged) */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-150 px-12"
          style={{
            opacity: disabled ? 0.4 : Math.max(0, 1 - progressPercent / 50),
          }}
        >
          <div className="flex items-center space-x-1.5 text-center">
            <span
              className={`text-xs sm:text-[13px] font-semibold tracking-wide ${
                disabled
                  ? 'text-white/40'
                  : 'text-transparent bg-clip-text bg-gradient-to-r from-amber-200/70 via-white to-amber-200/70'
              }`}
            >
              {disabled && disabledReason ? disabledReason : displayLabel}
            </span>
            {!disabled && (
              <span className="text-amber-300/70 text-xs tracking-tighter">»»</span>
            )}
          </div>
        </div>

        {/* 2. Circular iOS Slider Knob */}
        <div
          ref={knobRef}
          style={{
            transform: `translateX(${dragX}px)`,
            transition: isDragging
              ? 'none'
              : 'transform 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.2)',
          }}
          className={`relative z-10 h-12 w-12 rounded-full flex items-center justify-center shadow-lg cursor-grab active:cursor-grabbing transition-colors shrink-0 ${
            disabled
              ? 'bg-slate-700 text-slate-400'
              : isCompleted
              ? 'bg-emerald-500 text-white shadow-[0_0_24px_rgba(16,185,129,0.8)]'
              : isClockIn
              ? 'bg-gradient-to-br from-[#F59E0B] via-[#D97706] to-[#B45309] text-white shadow-[0_3px_14px_rgba(217,119,6,0.65)]'
              : 'bg-gradient-to-br from-[#FB923C] via-[#EA580C] to-[#C2410C] text-white shadow-[0_3px_14px_rgba(234,88,12,0.65)]'
          }`}
        >
          {isCompleted ? (
            <Check className="w-5 h-5 text-white animate-scale-in" />
          ) : (
            <ArrowRight className="w-5 h-5 text-white" />
          )}
        </div>
      </div>
    </div>
  );
}
