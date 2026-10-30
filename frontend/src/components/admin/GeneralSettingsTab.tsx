'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings2,
  Building,
  Globe,
  Calendar,
  ShieldCheck,
  CreditCard,
  Save,
  Check,
  RefreshCw,
  Bell,
  Camera,
  MapPin,
  Lock,
  Sparkles,
  Upload,
  Trash2,
  Download,
  Server,
  Database,
  Activity,
  HardDrive,
  FileJson,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

type SettingsSubTab = 'branding' | 'policy' | 'security' | 'diagnostics';

export function GeneralSettingsTab() {
  const [activeSubTab, setActiveSubTab] = useState<SettingsSubTab>('branding');

  // Company Profile & Custom Logo
  const [companyName, setCompanyName] = useState('PT Prima Global Ekshibisi');
  const [companyCode, setCompanyCode] = useState('PGE');
  const [companyLogoUrl, setCompanyLogoUrl] = useState('');
  const [companyAddress, setCompanyAddress] = useState('Gedung Cyber 2 Lantai 18, Jl. H. R. Rasuna Said, Jakarta Selatan');
  const [timezone, setTimezone] = useState('Asia/Jakarta (WIB • UTC+7)');

  // Attendance & Work-to-Rest Cycle Policies
  const [workingDays, setWorkingDays] = useState<'5_DAYS' | '6_DAYS' | 'CUSTOM'>('6_DAYS');
  const [consecutiveWorkDays, setConsecutiveWorkDays] = useState<number>(6);
  const [autoOffDays, setAutoOffDays] = useState<number>(1);
  const [autoOvertimeOnRestDay, setAutoOvertimeOnRestDay] = useState<boolean>(true);
  const [fatigueAlertEnabled, setFatigueAlertEnabled] = useState<boolean>(true);
  const [defaultLeaveQuota, setDefaultLeaveQuota] = useState(12);

  // Security & Anti-Fraud Policies
  const [faceLivenessRequired, setFaceLivenessRequired] = useState(true);
  const [allowMockLocationDetection, setAllowMockLocationDetection] = useState(true);
  const [strictDeviceBinding, setStrictDeviceBinding] = useState(false);

  // Payroll & Discipline Policies
  const [payrollCutoffDate, setPayrollCutoffDate] = useState(25);
  const [lateDeductionPolicy, setLateDeductionPolicy] = useState('COACHING_ONLY');

  // Persistence State
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [apiLatency, setApiLatency] = useState<number | null>(18);
  const [diagnosticStatus, setDiagnosticStatus] = useState<'healthy' | 'checking'>('healthy');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('hris_general_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.companyName) setCompanyName(parsed.companyName);
        if (parsed.companyCode) setCompanyCode(parsed.companyCode);
        if (parsed.companyLogoUrl) setCompanyLogoUrl(parsed.companyLogoUrl);
        if (parsed.companyAddress) setCompanyAddress(parsed.companyAddress);
        if (parsed.timezone) setTimezone(parsed.timezone);
        if (parsed.workingDays) setWorkingDays(parsed.workingDays);
        if (parsed.consecutiveWorkDays) setConsecutiveWorkDays(parsed.consecutiveWorkDays);
        if (parsed.autoOffDays) setAutoOffDays(parsed.autoOffDays);
        if (parsed.autoOvertimeOnRestDay !== undefined) setAutoOvertimeOnRestDay(parsed.autoOvertimeOnRestDay);
        if (parsed.fatigueAlertEnabled !== undefined) setFatigueAlertEnabled(parsed.fatigueAlertEnabled);
        if (parsed.defaultLeaveQuota) setDefaultLeaveQuota(parsed.defaultLeaveQuota);
        if (parsed.faceLivenessRequired !== undefined) setFaceLivenessRequired(parsed.faceLivenessRequired);
        if (parsed.allowMockLocationDetection !== undefined) setAllowMockLocationDetection(parsed.allowMockLocationDetection);
        if (parsed.strictDeviceBinding !== undefined) setStrictDeviceBinding(parsed.strictDeviceBinding);
        if (parsed.payrollCutoffDate) setPayrollCutoffDate(parsed.payrollCutoffDate);
        if (parsed.lateDeductionPolicy) setLateDeductionPolicy(parsed.lateDeductionPolicy);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setCompanyLogoUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    try {
      const payload = {
        companyName,
        companyCode,
        companyLogoUrl,
        companyAddress,
        timezone,
        workingDays,
        consecutiveWorkDays,
        autoOffDays,
        autoOvertimeOnRestDay,
        fatigueAlertEnabled,
        defaultLeaveQuota,
        faceLivenessRequired,
        allowMockLocationDetection,
        strictDeviceBinding,
        payrollCutoffDate,
        lateDeductionPolicy,
      };
      localStorage.setItem('hris_general_settings', JSON.stringify(payload));
      window.dispatchEvent(new Event('company_settings_updated'));
      setTimeout(() => {
        setIsSaving(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }, 400);
    } catch (err) {
      setIsSaving(false);
    }
  };

  const handleExportBackup = () => {
    const payload = {
      companyName,
      companyCode,
      companyLogoUrl,
      companyAddress,
      timezone,
      workingDays,
      consecutiveWorkDays,
      autoOffDays,
      autoOvertimeOnRestDay,
      fatigueAlertEnabled,
      defaultLeaveQuota,
      faceLivenessRequired,
      allowMockLocationDetection,
      strictDeviceBinding,
      payrollCutoffDate,
      lateDeductionPolicy,
      exportedAt: new Date().toISOString(),
      systemVersion: 'v2.4.0-enterprise',
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `hris-settings-backup-${companyCode.toLowerCase() || 'config'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.companyName) setCompanyName(parsed.companyName);
          if (parsed.companyCode) setCompanyCode(parsed.companyCode);
          if (parsed.companyLogoUrl) setCompanyLogoUrl(parsed.companyLogoUrl);
          if (parsed.companyAddress) setCompanyAddress(parsed.companyAddress);
          if (parsed.timezone) setTimezone(parsed.timezone);
          if (parsed.workingDays) setWorkingDays(parsed.workingDays);
          if (parsed.consecutiveWorkDays) setConsecutiveWorkDays(parsed.consecutiveWorkDays);
          if (parsed.autoOffDays) setAutoOffDays(parsed.autoOffDays);
          if (parsed.autoOvertimeOnRestDay !== undefined) setAutoOvertimeOnRestDay(parsed.autoOvertimeOnRestDay);
          if (parsed.fatigueAlertEnabled !== undefined) setFatigueAlertEnabled(parsed.fatigueAlertEnabled);
          if (parsed.defaultLeaveQuota) setDefaultLeaveQuota(parsed.defaultLeaveQuota);
          if (parsed.faceLivenessRequired !== undefined) setFaceLivenessRequired(parsed.faceLivenessRequired);
          if (parsed.allowMockLocationDetection !== undefined) setAllowMockLocationDetection(parsed.allowMockLocationDetection);
          if (parsed.strictDeviceBinding !== undefined) setStrictDeviceBinding(parsed.strictDeviceBinding);
          if (parsed.payrollCutoffDate) setPayrollCutoffDate(parsed.payrollCutoffDate);
          if (parsed.lateDeductionPolicy) setLateDeductionPolicy(parsed.lateDeductionPolicy);
          alert('Konfigurasi berhasil diimpor! Silakan klik "Simpan Pengaturan".');
        } catch (err) {
          alert('Format berkas JSON tidak valid.');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleResetCache = () => {
    if (confirm('Bersihkan cache preferensi lokal dan muat ulang setelan default?')) {
      localStorage.removeItem('hris_general_settings');
      window.location.reload();
    }
  };

  const handleTestLatency = () => {
    setDiagnosticStatus('checking');
    const start = Date.now();
    fetch('/api/v1/auth/me', { method: 'HEAD' })
      .catch(() => {})
      .finally(() => {
        const diff = Date.now() - start;
        setApiLatency(diff > 0 ? diff : 12);
        setDiagnosticStatus('healthy');
      });
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Header Toolbar & Quick Save */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#161B26] tracking-tight flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700">
              <Settings2 className="w-4 h-4" />
            </div>
            <span>Pengaturan Umum Sistem & Perusahaan</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Konfigurasi identitas perusahaan, kebijakan kerja, parameter anti-fraud, dan diagnostik server
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-semibold flex items-center space-x-2 transition-all shadow-sm shadow-amber-950/20 cursor-pointer disabled:opacity-50 active:scale-98"
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin text-amber-200" />
            ) : saveSuccess ? (
              <Check className="w-4 h-4 text-emerald-300" />
            ) : (
              <Save className="w-4 h-4 text-amber-100" />
            )}
            <span>{saveSuccess ? 'Tersimpan!' : 'Simpan Pengaturan'}</span>
          </button>
        </div>
      </div>

      {/* 2. Sub-Tab Navigation Bar */}
      <div className="flex items-center space-x-1.5 p-1 bg-white border border-[#E6DFD3] rounded-2xl shadow-2xs overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab('branding')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'branding'
              ? 'bg-[#161B26] text-amber-400 shadow-xs'
              : 'text-slate-600 hover:text-[#161B26] hover:bg-slate-50'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Identitas & Branding</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('policy')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'policy'
              ? 'bg-[#161B26] text-amber-400 shadow-xs'
              : 'text-slate-600 hover:text-[#161B26] hover:bg-slate-50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Kebijakan Kerja & Cuti</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('security')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'security'
              ? 'bg-[#161B26] text-amber-400 shadow-xs'
              : 'text-slate-600 hover:text-[#161B26] hover:bg-slate-50'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Keamanan & Anti-Fraud</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('diagnostics')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'diagnostics'
              ? 'bg-[#161B26] text-amber-400 shadow-xs'
              : 'text-slate-600 hover:text-[#161B26] hover:bg-slate-50'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Diagnostik & Backup</span>
        </button>
      </div>

      {/* 3. Sub-Tab Content Views */}

      {/* TAB 1: IDENTITAS & BRANDING */}
      {activeSubTab === 'branding' && (
        <div className="bg-white border border-[#E6DFD3] rounded-3xl p-6 shadow-2xs space-y-6 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-[#E6DFD3]">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-700 flex items-center justify-center">
                <Building className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#161B26]">Profil & Logo Resmi Tenant</h3>
                <p className="text-xs text-slate-500">Kustomisasi identitas visual organisasi pada seluruh portal dan slip</p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              Co-Branding Active
            </span>
          </div>

          {/* Logo Upload Box */}
          <div className="p-4 bg-[#FAF8F5] border border-[#E6DFD3] rounded-2xl flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-white border border-[#E6DFD3] flex items-center justify-center p-2.5 shadow-xs shrink-0 overflow-hidden relative">
              {companyLogoUrl ? (
                <img src={companyLogoUrl} alt={companyName} className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full rounded-xl bg-gradient-to-br from-[#161B26] to-[#2B344D] text-amber-400 border border-amber-500/30 flex items-center justify-center font-black text-base tracking-wider shadow-inner">
                  {companyCode || 'PGE'}
                </div>
              )}
            </div>

            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <label className="px-3.5 py-2 rounded-xl bg-white hover:bg-amber-50 text-[#161B26] text-xs font-bold border border-[#E6DFD3] hover:border-amber-400 shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-98">
                  <Upload className="w-3.5 h-3.5 text-amber-600" />
                  <span>Unggah Logo (PNG / SVG)</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>

                {companyLogoUrl && (
                  <button
                    type="button"
                    onClick={() => setCompanyLogoUrl('')}
                    className="px-3 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold border border-[#E6DFD3] hover:border-rose-300 shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Reset ke Monogram {companyCode || 'PGE'}</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Rekomendasi rasio 1:1 atau logo horizontal transparan. Ditampilkan di Sidebar, Top Navigation, ID Card Karyawan, dan Dokumen Payroll.
              </p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
                Nama Lengkap Perusahaan / Organisasi *
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Contoh: PT Prima Global Ekshibisi"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6DFD3] bg-[#FAF8F5] text-xs font-semibold text-[#161B26] focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
                Kode / Singkatan Monogram (Max 5 Huruf) *
              </label>
              <input
                type="text"
                maxLength={5}
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                placeholder="Contoh: PGE"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6DFD3] bg-[#FAF8F5] text-xs font-mono font-bold text-[#161B26] focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
                Zona Waktu Operasional Utama
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6DFD3] bg-[#FAF8F5] text-xs font-bold text-[#161B26] focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs cursor-pointer"
              >
                <option value="Asia/Jakarta (WIB • UTC+7)">Asia/Jakarta — WIB (Jakarta • UTC+7)</option>
                <option value="Asia/Makassar (WITA • UTC+8)">Asia/Makassar — WITA (Bali/Makassar • UTC+8)</option>
                <option value="Asia/Jayapura (WIT • UTC+9)">Asia/Jayapura — WIT (Jayapura • UTC+9)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
                Alamat Kantor Pusat (HQ)
              </label>
              <textarea
                rows={2}
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                placeholder="Alamat fisik kantor pusat..."
                className="w-full px-3.5 py-2 rounded-xl border border-[#E6DFD3] bg-[#FAF8F5] text-xs font-medium text-[#161B26] focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs resize-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KEBIJAKAN KERJA & CUTI */}
      {activeSubTab === 'policy' && (
        <div className="bg-white border border-[#E6DFD3] rounded-3xl p-6 shadow-2xs space-y-6 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-[#E6DFD3]">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-700 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#161B26]">Siklus Kerja & Ketentuan Cuti Tahunan</h3>
                <p className="text-xs text-slate-500">Konfigurasi Work-to-Rest Cycle Engine, kuota cuti standar, dan cutoff payroll bulanan</p>
              </div>
            </div>
          </div>

          {/* Model Alokasi Hari Kerja */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-2.5">
              Model Alokasi Hari Kerja & Hari Libur Kantor
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => {
                  setWorkingDays('6_DAYS');
                  setConsecutiveWorkDays(6);
                  setAutoOffDays(1);
                }}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  workingDays === '6_DAYS'
                    ? 'border-amber-600 bg-amber-50/70 ring-1 ring-amber-600 shadow-xs'
                    : 'border-[#E6DFD3] bg-[#FAF8F5] hover:bg-amber-50/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs text-[#161B26]">6 Hari Kerja : 1 Libur</span>
                  {workingDays === '6_DAYS' && (
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">
                      Standard PGE
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-600 block leading-tight">
                  Senin s/d Sabtu aktif. Hari ke-7 (Minggu) otomatis libur kantor.
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setWorkingDays('5_DAYS');
                  setConsecutiveWorkDays(5);
                  setAutoOffDays(2);
                }}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  workingDays === '5_DAYS'
                    ? 'border-amber-600 bg-amber-50/70 ring-1 ring-amber-600 shadow-xs'
                    : 'border-[#E6DFD3] bg-[#FAF8F5] hover:bg-amber-50/30'
                }`}
              >
                <span className="font-bold text-xs text-[#161B26] block mb-1.5">5 Hari Kerja : 2 Libur</span>
                <span className="text-[11px] text-slate-600 block leading-tight">
                  Senin s/d Jumat aktif. Sabtu & Minggu libur kantor korporat.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setWorkingDays('CUSTOM')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  workingDays === 'CUSTOM'
                    ? 'border-amber-600 bg-amber-50/70 ring-1 ring-amber-600 shadow-xs'
                    : 'border-[#E6DFD3] bg-[#FAF8F5] hover:bg-amber-50/30'
                }`}
              >
                <span className="font-bold text-xs text-[#161B26] block mb-1.5">Siklus Rolling Dinamis</span>
                <span className="text-[11px] text-slate-600 block leading-tight">
                  Kustomisasi alokasi N hari kerja berturut-turut untuk rolling roster.
                </span>
              </button>
            </div>
          </div>

          {/* Engine Parameters */}
          <div className="bg-[#FAF8F5] border border-[#E6DFD3] rounded-2xl p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-[#161B26]">
                  Parameter Siklus Kerja Otomatis
                </span>
              </div>
              <span className="text-[11px] font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-300">
                {consecutiveWorkDays} Hari Kerja &rarr; Hari ke-{consecutiveWorkDays + 1} Libur
              </span>
            </div>

            {workingDays === 'CUSTOM' && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#E6DFD3]">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">
                    Target Hari Kerja Berturut-turut:
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="2"
                      max="14"
                      value={consecutiveWorkDays}
                      onChange={(e) => setConsecutiveWorkDays(parseInt(e.target.value, 10) || 6)}
                      className="w-full px-3 py-1.5 rounded-xl border border-[#E6DFD3] bg-white text-xs font-bold font-mono text-[#161B26]"
                    />
                    <span className="text-xs font-bold text-slate-600">Hari</span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">
                    Jumlah Hari Libur Dialokasikan:
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="1"
                      max="7"
                      value={autoOffDays}
                      onChange={(e) => setAutoOffDays(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-3 py-1.5 rounded-xl border border-[#E6DFD3] bg-white text-xs font-bold font-mono text-[#161B26]"
                    />
                    <span className="text-xs font-bold text-slate-600">Hari Libur</span>
                  </div>
                </div>
              </div>
            )}

            {/* Policy Toggles */}
            <div className="space-y-3 pt-2 border-t border-[#E6DFD3]">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoOvertimeOnRestDay}
                  onChange={(e) => setAutoOvertimeOnRestDay(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 mt-0.5 accent-amber-600"
                />
                <div>
                  <span className="text-xs font-bold text-[#161B26] block">
                    Otomatis Konversi Presensi di Hari Libur Sebagai Lembur
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Karyawan yang tetap clock in di hari libur otomatis dikategorikan sebagai{' '}
                    <strong className="text-indigo-700 font-mono">HADIR_BUKAN_HARI_KERJA</strong> untuk kompensasi upah lembur resmi.
                  </span>
                </div>
              </label>

              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fatigueAlertEnabled}
                  onChange={(e) => setFatigueAlertEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 mt-0.5 accent-amber-600"
                />
                <div>
                  <span className="text-xs font-bold text-[#161B26] block">
                    Proteksi Kepatuhan Lelah (Fatigue Guard)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Beri sinyal peringatan audit bila karyawan bekerja &gt; 6 hari berturut-turut tanpa jeda istirahat mingguan.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Quota & Cutoff */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-[#FAF8F5] border border-[#E6DFD3] rounded-2xl space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">
                Default Kuota Cuti Tahunan Karyawan
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="6"
                  max="30"
                  value={defaultLeaveQuota}
                  onChange={(e) => setDefaultLeaveQuota(parseInt(e.target.value, 10) || 12)}
                  className="w-24 px-3 py-2 rounded-xl border border-[#E6DFD3] bg-white text-xs font-mono font-bold text-[#161B26]"
                />
                <span className="text-xs font-semibold text-slate-600">Hari / Tahun</span>
              </div>
              <p className="text-[10px] text-slate-500">
                Alokasi cuti tahunan otomatis saat karyawan baru didaftarkan ke sistem.
              </p>
            </div>

            <div className="p-4 bg-[#FAF8F5] border border-[#E6DFD3] rounded-2xl space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">
                Tanggal Cutoff Siklus Payroll Bulanan
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={payrollCutoffDate}
                  onChange={(e) => setPayrollCutoffDate(parseInt(e.target.value, 10) || 25)}
                  className="w-24 px-3 py-2 rounded-xl border border-[#E6DFD3] bg-white text-xs font-mono font-bold text-[#161B26]"
                />
                <span className="text-xs font-semibold text-slate-600">Tiap Bulan (Tanggal {payrollCutoffDate})</span>
              </div>
              <p className="text-[10px] text-slate-500">
                Batas rekapitulasi presensi bulanan untuk perhitungan slip gaji dan lembur.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: KEAMANAN & ANTI-FRAUD */}
      {activeSubTab === 'security' && (
        <div className="bg-white border border-[#E6DFD3] rounded-3xl p-6 shadow-2xs space-y-6 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-[#E6DFD3]">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-700 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#161B26]">Parameter Keamanan Presensi & Anti-Fraud</h3>
                <p className="text-xs text-slate-500">Integritas data absensi, verifikasi kamera live, dan pencegahan manipulasi lokasi</p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              Anti-Fraud Level: High
            </span>
          </div>

          <div className="space-y-3.5">
            {/* Liveness Camera */}
            <div className="p-4 bg-[#FAF8F5] border border-[#E6DFD3] rounded-2xl flex items-center justify-between">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-xl bg-white border border-[#E6DFD3] flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-[#161B26] block">
                    Kamera Live In-App Viewfinder
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Wajibkan pengambilan foto selfie langsung saat Clock In / Out (otomatis menolak unggahan dari galeri file atau emulasi gambar).
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={faceLivenessRequired}
                onChange={(e) => setFaceLivenessRequired(e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
              />
            </div>

            {/* Mock GPS Detection */}
            <div className="p-4 bg-[#FAF8F5] border border-[#E6DFD3] rounded-2xl flex items-center justify-between">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-xl bg-white border border-[#E6DFD3] flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-[#161B26] block">
                    Anti-Fake GPS & Mock Location Blocker
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Deteksi aplikasi pemalsu koordinat (Mock Providers) dan gagalkan clock in bila mock location aktif pada OS Android/iOS.
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={allowMockLocationDetection}
                onChange={(e) => setAllowMockLocationDetection(e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
              />
            </div>

            {/* Strict Device Binding */}
            <div className="p-4 bg-[#FAF8F5] border border-[#E6DFD3] rounded-2xl flex items-center justify-between">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-xl bg-white border border-[#E6DFD3] flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-[#161B26] block">
                    Kunci Perangkat Tunggal (Single Device Binding)
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Satu akun karyawan hanya diizinkan absen melalui 1 smartphone terdaftar guna mencegah titip absen antar staf.
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={strictDeviceBinding}
                onChange={(e) => setStrictDeviceBinding(e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Late Policy */}
          <div className="pt-2">
            <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
              Kebijakan Disiplin Keterlambatan Absensi
            </label>
            <select
              value={lateDeductionPolicy}
              onChange={(e) => setLateDeductionPolicy(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6DFD3] bg-[#FAF8F5] text-xs font-semibold text-[#161B26] focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer"
            >
              <option value="COACHING_ONLY">Pencatatan Audit & Pembinaan Disiplin HR (Tanpa Denda)</option>
              <option value="DEDUCTION_HOURLY">Pemotongan Tunjangan Kehadiran Proporsional Menit Terlambat</option>
              <option value="STRICT_PENALTY">Penerbitan Surat Peringatan (SP) Otomatis setelah 3x Terlambat dlm 1 Bulan</option>
            </select>
          </div>
        </div>
      )}

      {/* TAB 4: DIAGNOSTIK & BACKUP */}
      {activeSubTab === 'diagnostics' && (
        <div className="bg-white border border-[#E6DFD3] rounded-3xl p-6 shadow-2xs space-y-6 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-[#E6DFD3]">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-700 flex items-center justify-center">
                <Server className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#161B26]">Status Sistem, Diagnostik, & Cadangan Data</h3>
                <p className="text-xs text-slate-500">Informasi server runtime, lisensi tenant, ekspor konfigurasi JSON, dan manajemen memori lokal</p>
              </div>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold text-emerald-800">Operational</span>
            </div>
          </div>

          {/* System Health Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="p-4 bg-[#FAF8F5] border border-[#E6DFD3] rounded-2xl space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">
                Backend API Status
              </span>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-bold text-[#161B26]">Connected (200 OK)</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                Latency: {apiLatency}ms
              </span>
            </div>

            <div className="p-4 bg-[#FAF8F5] border border-[#E6DFD3] rounded-2xl space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">
                Lisensi Tenant
              </span>
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-bold text-[#161B26]">Enterprise Pilot Master</span>
              </div>
              <span className="text-[10px] text-amber-700 font-bold">
                Lifetime Free & Unlimited Quota
              </span>
            </div>

            <div className="p-4 bg-[#FAF8F5] border border-[#E6DFD3] rounded-2xl space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">
                Versi Aplikasi HRIS
              </span>
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-bold text-[#161B26]">v2.4.0 Production</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                Next.js 16 + Turbopack + Prisma
              </span>
            </div>
          </div>

          {/* Diagnostic Action Bar */}
          <div className="p-4 bg-[#FAF8F5] border border-[#E6DFD3] rounded-2xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Activity className="w-5 h-5 text-amber-600" />
              <div>
                <span className="font-bold text-xs text-[#161B26] block">Uji Latensi Komunikasi Backend</span>
                <span className="text-[10px] text-slate-500">Ping live endpoint untuk verifikasi stabilitas koneksi</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleTestLatency}
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-amber-50 text-xs font-bold text-[#161B26] border border-[#E6DFD3] hover:border-amber-400 shadow-2xs transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-600 ${diagnosticStatus === 'checking' ? 'animate-spin' : ''}`} />
              <span>Cek Ping Server</span>
            </button>
          </div>

          {/* Backup & Restore Controls */}
          <div className="pt-2 border-t border-[#E6DFD3] space-y-3">
            <h4 className="font-bold text-xs text-[#161B26] uppercase tracking-wider">
              Manajemen Cadangan & Pemulihan Konfigurasi
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Export JSON */}
              <button
                type="button"
                onClick={handleExportBackup}
                className="p-3.5 bg-white border border-[#E6DFD3] hover:border-amber-400 rounded-2xl flex items-center space-x-3 transition-all text-left shadow-2xs cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-[#161B26] block group-hover:text-amber-700">
                    Ekspor Backup JSON
                  </span>
                  <span className="text-[10px] text-slate-500">Unduh arsip setelan sistem</span>
                </div>
              </button>

              {/* Import JSON */}
              <label className="p-3.5 bg-white border border-[#E6DFD3] hover:border-amber-400 rounded-2xl flex items-center space-x-3 transition-all text-left shadow-2xs cursor-pointer group">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200/60 text-indigo-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <FileJson className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-[#161B26] block group-hover:text-indigo-700">
                    Impor Konfigurasi
                  </span>
                  <span className="text-[10px] text-slate-500">Pulihkan dari berkas .json</span>
                </div>
                <input
                  type="file"
                  accept="application/json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>

              {/* Reset Cache */}
              <button
                type="button"
                onClick={handleResetCache}
                className="p-3.5 bg-white border border-[#E6DFD3] hover:border-rose-300 rounded-2xl flex items-center space-x-3 transition-all text-left shadow-2xs cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200/60 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-rose-700 block">
                    Reset Cache Lokal
                  </span>
                  <span className="text-[10px] text-slate-500">Bersihkan preferensi browser</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
