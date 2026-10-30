'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Employee } from '../types';
import {
  ShieldCheck,
  Settings,
  Bell,
  MoreVertical,
  UserCheck,
  RefreshCw,
  LogOut,
  ChevronDown,
} from 'lucide-react';

interface HeaderProps {
  user: Employee | null;
  onSwitchUserClick: () => void;
  onOpenSettings?: () => void;
  onOpenNotifications?: () => void;
  hasUnreadNotifications?: boolean;
  onLogout: () => void;
}

export function Header({
  user,
  onSwitchUserClick,
  onOpenSettings,
  onOpenNotifications,
  hasUnreadNotifications = true,
  onLogout,
}: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const initials = user
    ? user.nickname
      ? user.nickname.slice(0, 2).toUpperCase()
      : user.full_name.slice(0, 2).toUpperCase()
    : 'WP';

  const firstName = user?.nickname || user?.full_name?.split(' ')[0] || 'Karyawan';
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  return (
    <header className="bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#E8E2D5] sticky top-0 z-40 select-none font-sans">
      <div className="max-w-lg mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        {/* Left Side: Avatar & Direct Friendly Greeting */}
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full bg-[#161B26] text-[#FDE68A] flex items-center justify-center font-bold text-xs tracking-wider shadow-xs border border-[#D97706]/30">
              {initials}
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute bottom-0 right-0 ring-2 ring-[#FAF8F5]" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs text-[#8C7E6A] font-medium leading-none">Halo,</span>
              <h2 className="font-extrabold text-sm text-[#161B26] tracking-tight leading-none truncate">
                {firstName}
              </h2>
              {isAdmin && (
                <span className="bg-[#FEF3C7] text-[#D97706] text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-[#FDE68A]">
                  Admin
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#5C6479] font-medium truncate mt-0.5 leading-none">
              {user?.position || 'Staff'} • {user?.department || 'WorkPulse'}
            </p>
          </div>
        </div>

        {/* Right Side: Clean Controls (Bell & More Menu) */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Notifications Bell */}
          {onOpenNotifications && (
            <button
              type="button"
              onClick={onOpenNotifications}
              title="Notifikasi & Pengingat"
              className="w-9 h-9 rounded-full bg-white hover:bg-[#F4EFE6] active:bg-[#E8E2D5] text-[#5C6479] border border-[#E8E2D5] transition-all flex items-center justify-center relative cursor-pointer shadow-xs active:scale-95"
            >
              <Bell className="w-4 h-4 text-[#161B26]" />
              {hasUnreadNotifications && (
                <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-2 right-2 ring-2 ring-white" />
              )}
            </button>
          )}

          {/* Clean Action Overflow Menu (3-Dots) */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              title="Menu Lainnya"
              className="w-9 h-9 rounded-full bg-white hover:bg-[#F4EFE6] active:bg-[#E8E2D5] text-[#161B26] border border-[#E8E2D5] transition-all flex items-center justify-center cursor-pointer shadow-xs active:scale-95"
            >
              <MoreVertical className="w-4 h-4 text-[#161B26]" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-[#E8E2D5] shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Admin Portal if Admin */}
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-[#161B26] hover:bg-[#FAF8F5] flex items-center space-x-2.5 transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#D97706]" />
                    <span>Buka Portal Admin HR</span>
                  </Link>
                )}

                {/* Kiosk Mode */}
                <Link
                  href="/kiosk"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-[#161B26] hover:bg-[#FAF8F5] flex items-center space-x-2.5 transition-colors cursor-pointer"
                >
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>Mode Kiosk / Tablet Kantor</span>
                </Link>

                {/* Switch Profile */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onSwitchUserClick();
                  }}
                  className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-[#161B26] hover:bg-[#FAF8F5] flex items-center space-x-2.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 text-[#8C7E6A]" />
                  <span>Ganti Profil Karyawan</span>
                </button>

                {/* API Settings */}
                {onOpenSettings && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenSettings();
                    }}
                    className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-[#161B26] hover:bg-[#FAF8F5] flex items-center space-x-2.5 transition-colors cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-[#8C7E6A]" />
                    <span>Pengaturan Server API</span>
                  </button>
                )}

                <div className="my-1.5 border-t border-[#E8E2D5]" />

                {/* Sign Out */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-rose-700 hover:bg-rose-50 flex items-center space-x-2.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-600" />
                  <span>Keluar (Sign Out)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
