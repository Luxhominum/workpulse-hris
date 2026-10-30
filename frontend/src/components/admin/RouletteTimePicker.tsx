'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

const ITEM_HEIGHT = 38; // Sleek item height in px
const VISIBLE_COUNT = 5; // 5 visible rows (2 top, 1 active center, 2 bottom)
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_COUNT; // 190px
const PADDING_Y = ITEM_HEIGHT * 2; // 76px padding top & bottom so items center cleanly

interface AnchorRect {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
}

interface RouletteTimePickerProps {
  initialTime?: string | null; // "HH:mm" e.g. "08:30" or ISO string
  initialStatus?: string;
  title?: string;
  employeeName?: string;
  field?: 'in' | 'out';
  anchorRect?: AnchorRect | null;
  onSave: (timeStr: string, reason: string, status: string) => void;
  onClose: () => void;
}

export function RouletteTimePicker({
  initialTime,
  initialStatus = 'ON_TIME',
  title = 'Select time',
  employeeName,
  field = 'in',
  anchorRect,
  onSave,
  onClose,
}: RouletteTimePickerProps) {
  // Parse initial 12-hour time and period
  const parseInitial = useCallback(() => {
    let h24 = field === 'out' ? 17 : 8;
    let m = 0;
    if (initialTime) {
      if (initialTime.includes('T')) {
        const d = new Date(initialTime);
        h24 = d.getHours();
        m = d.getMinutes();
      } else {
        const parts = initialTime.split(':');
        h24 = parseInt(parts[0], 10) || (field === 'out' ? 17 : 8);
        m = parseInt(parts[1], 10) || 0;
      }
    }
    const period: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM';
    let h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    return { h12, m, period };
  }, [initialTime, field]);

  const parsed = parseInitial();
  const [selectedHour, setSelectedHour] = useState<number>(parsed.h12);
  const [selectedMinute, setSelectedMinute] = useState<number>(parsed.m);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>(parsed.period);

  const hoursList = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
  const minutesList = Array.from({ length: 60 }, (_, i) => i); // 0..59
  const periodsList: ('AM' | 'PM')[] = ['AM', 'PM'];

  const hoursRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLDivElement>(null);
  const periodsRef = useRef<HTMLDivElement>(null);

  // Programmatic scroll guard to avoid wheel/scroll loop conflict
  const isProgrammaticScrollRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const smoothScrollTo = (
    el: HTMLDivElement | null,
    targetTop: number,
    behavior: ScrollBehavior = 'smooth'
  ) => {
    if (!el) return;
    isProgrammaticScrollRef.current = true;
    el.scrollTo({ top: targetTop, behavior });
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 120);
  };

  // Anchored popover positioning & pointer arrow calculation
  const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom');
  const [caretLeft, setCaretLeft] = useState<number>(126);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 60,
  });

  useEffect(() => {
    if (!anchorRect) return;

    const popoverWidth = 252;
    const popoverHeight = 304;
    const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

    const anchorCenterX = anchorRect.left + anchorRect.width / 2;
    let left = anchorCenterX - popoverWidth / 2;

    // Boundary clamping on screen edges
    if (left < 16) left = 16;
    if (left + popoverWidth > windowWidth - 16) {
      left = windowWidth - popoverWidth - 16;
    }

    // Caret horizontal position relative to popover card
    const rawCaret = anchorCenterX - left;
    const clampedCaret = Math.max(24, Math.min(rawCaret, popoverWidth - 24));
    setCaretLeft(clampedCaret);

    // Determine top or bottom placement
    const spaceBelow = windowHeight - anchorRect.bottom;
    const spaceAbove = anchorRect.top;
    const placeTop = spaceBelow < popoverHeight + 16 && spaceAbove >= popoverHeight + 16;

    const style: React.CSSProperties = {
      position: 'fixed',
      left: `${left}px`,
      width: `${popoverWidth}px`,
      zIndex: 60,
    };

    if (placeTop) {
      setPlacement('top');
      style.top = `${anchorRect.top - popoverHeight - 10}px`;
    } else {
      setPlacement('bottom');
      style.top = `${anchorRect.bottom + 10}px`;
    }

    setPopoverStyle(style);
  }, [anchorRect]);

  // Precise 1-step Wheel Scrolling (Fixes rapid jump & bad accuracy)
  useEffect(() => {
    const hoursEl = hoursRef.current;
    const minutesEl = minutesRef.current;
    const periodsEl = periodsRef.current;

    const handleWheelHours = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const dir = e.deltaY > 0 ? 1 : -1;
      setSelectedHour((prev) => {
        let next = prev + dir;
        if (next > 12) next = 1;
        if (next < 1) next = 12;
        return next;
      });
    };

    const handleWheelMinutes = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const step = e.shiftKey ? 5 : 1;
      const dir = e.deltaY > 0 ? step : -step;
      setSelectedMinute((prev) => {
        let next = prev + dir;
        if (next >= 60) next = next % 60;
        if (next < 0) next = ((next % 60) + 60) % 60;
        return next;
      });
    };

    const handleWheelPeriods = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setSelectedPeriod((prev) => (prev === 'AM' ? 'PM' : 'AM'));
    };

    if (hoursEl) hoursEl.addEventListener('wheel', handleWheelHours, { passive: false });
    if (minutesEl) minutesEl.addEventListener('wheel', handleWheelMinutes, { passive: false });
    if (periodsEl) periodsEl.addEventListener('wheel', handleWheelPeriods, { passive: false });

    return () => {
      if (hoursEl) hoursEl.removeEventListener('wheel', handleWheelHours);
      if (minutesEl) minutesEl.removeEventListener('wheel', handleWheelMinutes);
      if (periodsEl) periodsEl.removeEventListener('wheel', handleWheelPeriods);
    };
  }, []);

  // Sync scroll positions when state updates (smooth centering)
  useEffect(() => {
    if (hoursRef.current) {
      const targetScroll = (selectedHour - 1) * ITEM_HEIGHT;
      smoothScrollTo(hoursRef.current, targetScroll, 'smooth');
    }
  }, [selectedHour]);

  useEffect(() => {
    if (minutesRef.current) {
      const targetScroll = selectedMinute * ITEM_HEIGHT;
      smoothScrollTo(minutesRef.current, targetScroll, 'smooth');
    }
  }, [selectedMinute]);

  useEffect(() => {
    if (periodsRef.current) {
      const targetScroll = (selectedPeriod === 'AM' ? 0 : 1) * ITEM_HEIGHT;
      smoothScrollTo(periodsRef.current, targetScroll, 'smooth');
    }
  }, [selectedPeriod]);

  // Touch / Drag snapping fallback
  const handleScrollSnap = (
    ref: React.RefObject<HTMLDivElement | null>,
    type: 'hour' | 'minute' | 'period'
  ) => {
    if (isProgrammaticScrollRef.current || !ref.current) return;
    const top = ref.current.scrollTop;
    const index = Math.round(top / ITEM_HEIGHT);

    if (type === 'hour') {
      const clamped = Math.max(0, Math.min(index, 11));
      const h = clamped + 1;
      if (h !== selectedHour) setSelectedHour(h);
    } else if (type === 'minute') {
      const clamped = Math.max(0, Math.min(index, 59));
      if (clamped !== selectedMinute) setSelectedMinute(clamped);
    } else if (type === 'period') {
      const clamped = Math.max(0, Math.min(index, 1));
      const p = clamped === 0 ? 'AM' : 'PM';
      if (p !== selectedPeriod) setSelectedPeriod(p);
    }
  };

  const format2Digit = (num: number) => String(num).padStart(2, '0');

  // Handle Save
  const handleSave = () => {
    let h24 = selectedHour;
    if (selectedPeriod === 'PM') {
      if (h24 !== 12) h24 += 12;
    } else {
      if (h24 === 12) h24 = 0;
    }
    const formatted = `${format2Digit(h24)}:${format2Digit(selectedMinute)}`;
    const reason = 'Koreksi jam operasional harian';
    const finalStatus = 'AUTO_CALCULATE';
    onSave(formatted, reason, finalStatus);
  };

  return (
    <>
      {/* 1. Backdrop Click-Away */}
      <div
        className="fixed inset-0 z-50 bg-black/15 backdrop-blur-[0.5px] cursor-default animate-in fade-in duration-100"
        onClick={onClose}
      />

      {/* 2. Morning Luxury Popover Card */}
      <div
        style={popoverStyle}
        className="relative bg-[#FAF8F5] rounded-3xl border border-[#E6DFD3] shadow-[0_22px_55px_rgba(22,27,38,0.24)] p-4 font-sans select-none animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Caret Pointer Arrow pointing directly into the clicked cell button */}
        {placement === 'bottom' && (
          <div
            style={{ left: `${caretLeft}px` }}
            className="absolute -top-[9px] -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center"
          >
            <svg width="18" height="9" viewBox="0 0 18 9" fill="none">
              <path
                d="M1 9 L9 1 L17 9"
                stroke="#E6DFD3"
                strokeWidth="1.5"
                fill="#FAF8F5"
                strokeLinejoin="round"
              />
            </svg>
            <div className="w-[14px] h-[2px] bg-[#FAF8F5] -mt-[1.5px]" />
          </div>
        )}
        {placement === 'top' && (
          <div
            style={{ left: `${caretLeft}px` }}
            className="absolute -bottom-[9px] -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center"
          >
            <div className="w-[14px] h-[2px] bg-[#FAF8F5] -mb-[1.5px] z-10" />
            <svg width="18" height="9" viewBox="0 0 18 9" fill="none">
              <path
                d="M1 0 L9 8 L17 0"
                stroke="#E6DFD3"
                strokeWidth="1.5"
                fill="#FAF8F5"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}

        {/* Header: Badge + Title + Employee Name */}
        <div className="pb-2.5 border-b border-[#E6DFD3]/80 space-y-1">
          <div className="flex items-center justify-between">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border tracking-wide uppercase ${
                field === 'in'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {field === 'in' ? 'Clock In' : 'Clock Out'}
            </span>
            <span className="text-xs font-bold text-[#161B26] tracking-tight">{title}</span>
            <button
              type="button"
              onClick={onClose}
              className="text-[#78716C] hover:text-[#161B26] text-xs font-bold px-1.5 py-0.5 rounded-md hover:bg-[#EFE9DF]/80 transition-colors cursor-pointer"
              title="Tutup"
            >
              ✕
            </button>
          </div>
          {employeeName && (
            <p
              className="text-[11px] font-semibold text-[#78716C] text-center truncate pt-0.5"
              title={employeeName}
            >
              {employeeName}
            </p>
          )}
        </div>

        {/* Roller Drum Wheels Container with Depth Fade Mask */}
        <div
          className="relative overflow-hidden my-2.5"
          style={{
            height: `${CONTAINER_HEIGHT}px`,
            maskImage:
              'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.65) 18%, rgba(0,0,0,1) 38%, rgba(0,0,0,1) 62%, rgba(0,0,0,0.65) 82%, rgba(0,0,0,0) 100%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.65) 18%, rgba(0,0,0,1) 38%, rgba(0,0,0,1) 62%, rgba(0,0,0,0.65) 82%, rgba(0,0,0,0) 100%)',
          }}
        >
          {/* Active Center Rounded Selection Box */}
          <div
            style={{
              height: `${ITEM_HEIGHT}px`,
              top: '50%',
              transform: 'translateY(-50%)',
            }}
            className="absolute inset-x-1 border border-amber-400/80 rounded-xl pointer-events-none z-10 bg-white/85 shadow-[0_2px_8px_rgba(217,119,6,0.12)]"
          />

          {/* 3 Columns Grid: Hours : Minutes Period */}
          <div className="grid grid-cols-3 h-full relative z-20">
            {/* Column 1: Hours (01..12) */}
            <div
              ref={hoursRef}
              onScroll={() => handleScrollSnap(hoursRef, 'hour')}
              style={{
                height: `${CONTAINER_HEIGHT}px`,
                paddingTop: `${PADDING_Y}px`,
                paddingBottom: `${PADDING_Y}px`,
                scrollbarWidth: 'none',
                scrollSnapType: 'y mandatory',
              }}
              className="overflow-y-auto text-center cursor-ns-resize"
              title="Scroll mouse wheel untuk ganti jam"
            >
              {hoursList.map((h) => {
                const isSelected = h === selectedHour;
                const distance = Math.abs(h - selectedHour);
                return (
                  <div
                    key={h}
                    style={{
                      height: `${ITEM_HEIGHT}px`,
                      lineHeight: `${ITEM_HEIGHT}px`,
                      scrollSnapAlign: 'center',
                    }}
                    onClick={() => setSelectedHour(h)}
                    className={`font-mono cursor-pointer transition-colors ${
                      isSelected
                        ? 'text-base font-bold text-[#161B26]'
                        : distance === 1
                        ? 'text-xs font-bold text-[#57534E]'
                        : 'text-[11px] font-medium text-[#A8A29E]'
                    }`}
                  >
                    {format2Digit(h)}
                  </div>
                );
              })}
            </div>

            {/* Column 2: Minutes (00..59) with Centered Colon */}
            <div className="relative">
              {/* Static Center Colon */}
              <div
                style={{
                  height: `${ITEM_HEIGHT}px`,
                  lineHeight: `${ITEM_HEIGHT}px`,
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
                className="absolute -left-1 font-mono font-bold text-amber-600 text-base pointer-events-none z-30"
              >
                :
              </div>

              <div
                ref={minutesRef}
                onScroll={() => handleScrollSnap(minutesRef, 'minute')}
                style={{
                  height: `${CONTAINER_HEIGHT}px`,
                  paddingTop: `${PADDING_Y}px`,
                  paddingBottom: `${PADDING_Y}px`,
                  scrollbarWidth: 'none',
                  scrollSnapType: 'y mandatory',
                }}
                className="overflow-y-auto text-center cursor-ns-resize"
                title="Scroll mouse wheel untuk ganti menit"
              >
                {minutesList.map((m) => {
                  const isSelected = m === selectedMinute;
                  const distance = Math.abs(m - selectedMinute);
                  return (
                    <div
                      key={m}
                      style={{
                        height: `${ITEM_HEIGHT}px`,
                        lineHeight: `${ITEM_HEIGHT}px`,
                        scrollSnapAlign: 'center',
                      }}
                      onClick={() => setSelectedMinute(m)}
                      className={`font-mono cursor-pointer transition-colors ${
                        isSelected
                          ? 'text-base font-bold text-[#161B26]'
                          : distance === 1
                          ? 'text-xs font-bold text-[#57534E]'
                          : 'text-[11px] font-medium text-[#A8A29E]'
                      }`}
                    >
                      {format2Digit(m)}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Column 3: AM / PM */}
            <div
              ref={periodsRef}
              onScroll={() => handleScrollSnap(periodsRef, 'period')}
              style={{
                height: `${CONTAINER_HEIGHT}px`,
                paddingTop: `${PADDING_Y}px`,
                paddingBottom: `${PADDING_Y}px`,
                scrollbarWidth: 'none',
                scrollSnapType: 'y mandatory',
              }}
              className="overflow-y-auto text-center cursor-ns-resize"
              title="Scroll mouse wheel untuk ganti AM/PM"
            >
              {periodsList.map((p) => {
                const isSelected = p === selectedPeriod;
                return (
                  <div
                    key={p}
                    style={{
                      height: `${ITEM_HEIGHT}px`,
                      lineHeight: `${ITEM_HEIGHT}px`,
                      scrollSnapAlign: 'center',
                    }}
                    onClick={() => setSelectedPeriod(p)}
                    className={`font-mono cursor-pointer transition-colors ${
                      isSelected
                        ? 'text-sm font-bold text-[#161B26]'
                        : 'text-xs font-semibold text-[#78716C]/60 hover:text-[#161B26]'
                    }`}
                  >
                    {p}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer: Morning Luxury Actions */}
        <div className="flex items-center justify-between pt-2.5 border-t border-[#E6DFD3]/80">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-bold text-[#78716C] hover:text-[#161B26] hover:bg-[#EFE9DF]/70 rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-xs font-bold text-white shadow-sm shadow-amber-900/15 transition-all cursor-pointer"
          >
            Save
          </button>
        </div>
      </div>
    </>
  );
}
