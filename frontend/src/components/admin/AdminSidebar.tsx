'use client';

import React from 'react';
import Link from 'next/link';
import { Employee } from '../../types';
import {
  CalendarDays,
  Clock,
  Users,
  BarChart3,
  FileSpreadsheet,
  Building2,
  Clock3,
  Settings2,
  Bell,
  LogOut,
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  ExternalLink,
  Briefcase,
  MapPin,
} from 'lucide-react';

export type AdminTab =
  | 'board'
  | 'approvals'
  | 'canvasing'
  | 'employees'
  | 'roster'
  | 'analytics'
  | 'payroll'
  | 'audit'
  | 'offices'
  | 'shifts'
  | 'general';

interface AdminSidebarProps {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  pendingApprovalsCount?: number;
  activeEmployeesCount?: number;
  officesCount?: number;
  currentUser: Employee | null;
  onOpenNotifications: () => void;
  hasUnreadNotifications?: boolean;
  onLogout: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function AdminSidebar({
  activeTab,
  onSelectTab,
  pendingApprovalsCount = 0,
  activeEmployeesCount = 0,
  officesCount = 0,
  currentUser,
  onOpenNotifications,
  hasUnreadNotifications = false,
  onLogout,
  isMobileOpen = false,
  onCloseMobile,
}: AdminSidebarProps) {
  // Client Company Branding State (Loaded reactively from settings)
  const [companySettings, setCompanySettings] = React.useState({
    name: 'PT Prima Global Ekshibisi',
    code: 'PGE',
    logoUrl: '',
  });

  React.useEffect(() => {
    const readSettings = () => {
      try {
        const saved = localStorage.getItem('hris_general_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          setCompanySettings({
            name: parsed.companyName || 'PT Prima Global Ekshibisi',
            code: parsed.companyCode || 'PGE',
            logoUrl: parsed.companyLogoUrl || '',
          });
        }
      } catch (err) {
        console.error(err);
      }
    };
    readSettings();
    window.addEventListener('storage', readSettings);
    window.addEventListener('company_settings_updated', readSettings);
    return () => {
      window.removeEventListener('storage', readSettings);
      window.removeEventListener('company_settings_updated', readSettings);
    };
  }, []);

  const navSections = [
    {
      category: 'OPERASIONAL LIVE',
      items: [
        {
          id: 'board' as AdminTab,
          label: 'Daily Live Board',
          icon: CalendarDays,
          badge: null,
        },
        {
          id: 'approvals' as AdminTab,
          label: 'Leave & Approvals',
          icon: Clock,
          badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null,
          badgeColor: 'bg-rose-500 text-white',
        },
        {
          id: 'canvasing' as AdminTab,
          label: 'Sales Canvasing Visit',
          icon: MapPin,
          badge: null,
        },
      ],
    },
    {
      category: 'MANAJEMEN KARYAWAN',
      items: [
        {
          id: 'employees' as AdminTab,
          label: 'Master Karyawan',
          icon: Users,
          badge: activeEmployeesCount > 0 ? `${activeEmployeesCount}` : null,
          badgeColor: 'bg-slate-800 text-slate-200',
        },
        {
          id: 'roster' as AdminTab,
          label: 'Roster Shift Bulanan',
          icon: CalendarDays,
          badge: null,
        },
      ],
    },
    {
      category: 'ANALITIK & KEUANGAN',
      items: [
        {
          id: 'analytics' as AdminTab,
          label: 'Visual Analytics',
          icon: BarChart3,
          badge: null,
        },
        {
          id: 'payroll' as AdminTab,
          label: 'Rekapitulasi Payroll',
          icon: FileSpreadsheet,
          badge: null,
        },
        {
          id: 'audit' as AdminTab,
          label: 'Audit Trail UU PDP',
          icon: ShieldAlert,
          badge: 'Vault',
          badgeColor: 'bg-amber-100 text-amber-900 border border-amber-300 font-bold',
        },
      ],
    },
    {
      category: 'PENGATURAN ORGANISASI',
      items: [
        {
          id: 'offices' as AdminTab,
          label: 'Kantor & Geofence',
          icon: Building2,
          badge: officesCount > 0 ? `${officesCount}` : null,
          badgeColor: 'bg-slate-800 text-slate-300',
        },
        {
          id: 'shifts' as AdminTab,
          label: 'Jadwal Shift Kerja',
          icon: Clock3,
          badge: null,
        },
        {
          id: 'general' as AdminTab,
          label: 'Pengaturan Sistem',
          icon: Settings2,
          badge: null,
        },
      ],
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full sidebar-luxury-cream text-[#161B26] font-sans select-none shadow-[2px_0_16px_rgba(0,0,0,0.02)]">
      {/* Brand Header: Co-Branding (Client Company Logo & WorkPulse Platform) */}
      <div className="p-4 border-b border-[#E6DFD3] bg-[#F5EFE6]/70 space-y-3">
        {/* Row 1: Company Logo Slot & Identity */}
        <div className="flex items-center space-x-2.5 p-2 rounded-2xl bg-white border border-[#E6DFD3] shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] border border-[#E6DFD3] flex items-center justify-center p-1 shadow-2xs overflow-hidden shrink-0">
            {companySettings.logoUrl ? (
              <img
                src={companySettings.logoUrl}
                alt={companySettings.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full rounded-lg bg-gradient-to-br from-[#161B26] to-[#2B344D] text-amber-400 border border-amber-500/30 flex items-center justify-center font-black text-xs tracking-wider shadow-inner">
                {companySettings.code || 'PGE'}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-black text-xs text-[#161B26] block truncate leading-tight">
              {companySettings.name}
            </span>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-[#78716C] uppercase tracking-wider">
                Enterprise Tenant
              </span>
            </div>
          </div>
        </div>

        {/* Row 2: WorkPulse HRIS Brandmark Lockup */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-1.5">
            <div className="w-4 h-4 rounded-md bg-amber-100 border border-amber-300 flex items-center justify-center p-0.5 shrink-0">
              <img
                src="/brand/workpulse-emblem.png"
                alt="WorkPulse"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-[11px] font-black tracking-tight text-[#161B26]">
              WorkPulse <span className="text-amber-800 font-extrabold">HRIS</span>
            </span>
          </div>
          <span className="text-[9px] font-mono font-black text-[#78716C] bg-white border border-[#E6DFD3] px-1.5 py-0.5 rounded shadow-2xs">
            v2.4 Core
          </span>
        </div>

        {/* Shortcut to Employee App */}
        <Link
          href="/"
          className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF8F5] text-[#161B26] text-xs font-bold border border-[#E6DFD3] hover:border-[#D6CEBC] shadow-2xs transition-all group"
        >
          <div className="flex items-center space-x-2">
            <ArrowLeft className="w-3.5 h-3.5 text-[#78716C] group-hover:-translate-x-0.5 transition-transform" />
            <span>Kembali ke App Karyawan</span>
          </div>
          <ExternalLink className="w-3 h-3 text-[#78716C] group-hover:text-amber-600" />
        </Link>

        {/* Shortcut to Kiosk Mode */}
        <Link
          href="/kiosk"
          className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100/80 text-amber-950 text-xs font-bold border border-amber-200/90 shadow-2xs transition-all group"
        >
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse shadow-xs shadow-rose-600" />
            <span>Mode Kios Tablet Kantor</span>
          </div>
          <ExternalLink className="w-3 h-3 text-amber-800 group-hover:text-amber-950" />
        </Link>
      </div>

      {/* Navigation Menu Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navSections.map((section) => (
          <div key={section.category} className="space-y-1">
            <span className="px-3 text-[10px] font-black text-[#78716C] tracking-wider uppercase block mb-1.5">
              {section.category}
            </span>

            {section.items.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  style={
                    isActive
                      ? {
                          background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
                          color: '#FFFFFF',
                          boxShadow: '0 4px 14px rgba(217, 119, 6, 0.28)',
                        }
                      : undefined
                  }
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'active-nav-amber font-black'
                      : 'text-[#44403C] hover:text-[#161B26] hover:bg-white/80 border border-transparent hover:border-[#E6DFD3]'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isActive ? 'text-white' : 'text-[#78716C] group-hover:text-[#161B26]'
                      }`}
                    />
                    <span className={isActive ? 'text-white font-black' : ''}>{item.label}</span>
                  </div>

                  <div className="flex items-center space-x-1">
                    {item.badge !== null && (
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-amber-800/80 text-white'
                            : 'bg-[#EFE8DD] text-[#292524] border border-[#DDD5C5]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/90" />}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* System Infrastructure Footer (Replaces redundant user card) */}
      <div className="p-3 border-t border-[#E6DFD3] bg-[#F5EFE6]/60 flex items-center justify-between text-[11px] text-[#78716C]">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-extrabold text-[10px] text-[#57534E] uppercase tracking-wider">
            Cloud Engine Live
          </span>
        </div>
        <span className="font-mono text-[10px] font-bold text-[#78716C]">
          v2.4.2 Active
        </span>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Left Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0 z-40">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop & Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-[#131722]/80 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
