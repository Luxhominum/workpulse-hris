'use client';

import React from 'react';
import { Clock, CreditCard, FileText, CalendarDays, Receipt } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: 'attendance' | 'leaves' | 'history' | 'canvasing' | 'payslip';
  onSelectTab: (tab: 'attendance' | 'leaves' | 'history' | 'canvasing' | 'payslip') => void;
  onOpenIdCard: () => void;
  historyCount: number;
  hasActiveSession?: boolean;
}

export function MobileBottomNav({
  activeTab,
  onSelectTab,
  onOpenIdCard,
  historyCount,
  hasActiveSession = false,
}: MobileBottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-md border-t border-[#E6DFD3] px-1.5 py-1.5 shadow-[0_-4px_16px_rgba(40,30,20,0.04)] font-sans">
      <div className="max-w-md mx-auto grid grid-cols-5 gap-0.5">
        {/* 1. Presensi (Home) */}
        <button
          type="button"
          onClick={() => onSelectTab('attendance')}
          className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'attendance'
              ? 'text-amber-800 font-extrabold bg-amber-100/70 shadow-2xs'
              : 'text-[#78716C] hover:text-[#161B26] font-medium'
          }`}
        >
          <div className="relative">
            <Clock className={`w-5 h-5 ${activeTab === 'attendance' ? 'text-amber-700 stroke-[2.4]' : 'text-[#78716C]'}`} />
            {hasActiveSession && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute -top-0.5 -right-0.5 ring-1 ring-white" />
            )}
          </div>
          <span className="text-[10px] mt-1 leading-none">Presensi</span>
        </button>

        {/* 2. Jadwal & Riwayat (Roster + History) */}
        <button
          type="button"
          onClick={() => onSelectTab('history')}
          className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'text-amber-800 font-extrabold bg-amber-100/70 shadow-2xs'
              : 'text-[#78716C] hover:text-[#161B26] font-medium'
          }`}
        >
          <div className="relative">
            <CalendarDays className={`w-5 h-5 ${activeTab === 'history' ? 'text-amber-700 stroke-[2.4]' : 'text-[#78716C]'}`} />
            {historyCount > 0 && (
              <span className="text-[8px] font-mono px-1.5 py-0.2 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-bold absolute -top-1 -right-2">
                {historyCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 leading-none">Jadwal</span>
        </button>

        {/* 3. Digital ID Card (Center Action) */}
        <button
          type="button"
          onClick={onOpenIdCard}
          className="flex flex-col items-center justify-center py-1.5 px-0.5 rounded-2xl text-[#161B26] hover:text-amber-700 font-medium transition-all cursor-pointer group"
        >
          <div className="w-5 h-5 flex items-center justify-center text-[#161B26] group-hover:scale-110 transition-transform">
            <CreditCard className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="text-[10px] mt-1 leading-none font-bold text-[#161B26]">ID Card</span>
        </button>

        {/* 4. Cuti & Izin */}
        <button
          type="button"
          onClick={() => onSelectTab('leaves')}
          className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'leaves'
              ? 'text-amber-800 font-extrabold bg-amber-100/70 shadow-2xs'
              : 'text-[#78716C] hover:text-[#161B26] font-medium'
          }`}
        >
          <FileText className={`w-5 h-5 ${activeTab === 'leaves' ? 'text-amber-700 stroke-[2.4]' : 'text-[#78716C]'}`} />
          <span className="text-[10px] mt-1 leading-none">Cuti & Izin</span>
        </button>

        {/* 5. Slip Gaji (Payslip Vault) */}
        <button
          type="button"
          onClick={() => onSelectTab('payslip')}
          className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'payslip'
              ? 'text-amber-800 font-extrabold bg-amber-100/70 shadow-2xs'
              : 'text-[#78716C] hover:text-[#161B26] font-medium'
          }`}
        >
          <Receipt className={`w-5 h-5 ${activeTab === 'payslip' ? 'text-amber-700 stroke-[2.4]' : 'text-[#78716C]'}`} />
          <span className="text-[10px] mt-1 leading-none">Slip Gaji</span>
        </button>
      </div>
    </nav>
  );
}
