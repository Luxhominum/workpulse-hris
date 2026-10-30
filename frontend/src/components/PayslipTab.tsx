'use client';

import React, { useState, useEffect } from 'react';
import { ApiClient } from '../lib/api';
import { Employee } from '../types';
import {
  CreditCard,
  Eye,
  EyeOff,
  Download,
  Calendar,
  Building,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  Share2,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Receipt,
  FileText,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';

interface PayslipTabProps {
  user: Employee | null;
}

export function PayslipTab({ user }: PayslipTabProps) {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isPrivacyBlurred, setIsPrivacyBlurred] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [payslipData, setPayslipData] = useState<any | null>(null);

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  const loadPayslip = async (year: number, month: number) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await ApiClient.getMyPayslip(year, month);
      setPayslipData(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Slip gaji untuk periode ini belum tersedia.');
      setPayslipData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPayslip(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    const now = new Date();
    const isCurrentOrFuture =
      selectedYear > now.getFullYear() ||
      (selectedYear === now.getFullYear() && selectedMonth >= now.getMonth() + 1);
    if (isCurrentOrFuture) return;

    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  // Base calculation defaults
  const baseSalary = 5000000;
  const transportAllowance = 1200000;
  const positionAllowance = 800000;
  const overtimeRatePerHour = 35000;
  const latePenaltyRatePerMin = 1000;

  const overtimeHours = payslipData?.total_overtime_hours ?? 0;
  const overtimeCompensation = Math.round(overtimeHours * overtimeRatePerHour);

  const lateMinutes = payslipData?.total_late_minutes ?? 0;
  const lateDeduction = Math.round(lateMinutes * latePenaltyRatePerMin);

  const grossEarnings = baseSalary + transportAllowance + positionAllowance + overtimeCompensation;
  const totalDeductions = lateDeduction;
  const netTakeHomePay = Math.max(0, grossEarnings - totalDeductions);

  const formatRupiah = (val: number) => {
    if (isPrivacyBlurred) return 'Rp ••••••••';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handlePrintSlip = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = `*SLIP GAJI RESMI - PT PRIMA GLOBAL EKSHIBISI*
Periode: ${monthNames[selectedMonth - 1]} ${selectedYear}
Nama: ${user?.full_name || payslipData?.full_name}
Departemen: ${user?.department || payslipData?.department}
Hari Hadir: ${payslipData?.total_days_present || 0} Hari
Jam Lembur: ${overtimeHours} Jam
Take Home Pay: Rp ${netTakeHomePay.toLocaleString('id-ID')}
Rekening: ${payslipData?.bank_uob ? `UOB PGE (${payslipData.bank_uob})` : 'Rekening Payroll Terdaftar'}
_Dokumen digital sah sistem WorkPulse HRIS._`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-4 pb-24 font-sans max-w-lg mx-auto px-1 animate-in fade-in duration-150">
      {/* 1. Header Toolbar & Month Selector */}
      <div className="bg-white border border-[#E6DFD3] rounded-2xl p-3.5 shadow-2xs flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-700 flex items-center justify-center">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-xs text-[#161B26]">Slip Gaji Saya (ESS)</h2>
            <p className="text-[10px] text-slate-500">Rincian pendapatan, lembur & potongan resmi</p>
          </div>
        </div>

        {/* Privacy Toggle */}
        <button
          type="button"
          onClick={() => setIsPrivacyBlurred(!isPrivacyBlurred)}
          className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
            isPrivacyBlurred
              ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
          }`}
          title={isPrivacyBlurred ? 'Tampilkan Nominal' : 'Sembunyikan Nominal'}
        >
          {isPrivacyBlurred ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span>{isPrivacyBlurred ? 'Privasi Aktif' : 'Terlihat'}</span>
        </button>
      </div>

      {/* 2. Month Navigator Bar */}
      <div className="flex items-center justify-between px-2 py-1 bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-1.5 rounded-lg text-slate-500 hover:text-[#161B26] hover:bg-white cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-2">
          <Calendar className="w-3.5 h-3.5 text-amber-600" />
          <span className="font-bold text-xs text-[#161B26]">
            {monthNames[selectedMonth - 1]} {selectedYear}
          </span>
        </div>

        <button
          type="button"
          onClick={handleNextMonth}
          className="p-1.5 rounded-lg text-slate-500 hover:text-[#161B26] hover:bg-white cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 3. Main Slip Content */}
      {isLoading ? (
        <div className="bg-white border border-[#E6DFD3] rounded-2xl p-12 text-center text-slate-400 text-xs flex flex-col items-center">
          <RefreshCw className="w-6 h-6 animate-spin text-amber-600 mb-2" />
          <span className="font-medium text-slate-600">Memuat rincian slip gaji...</span>
        </div>
      ) : errorMsg && !payslipData ? (
        <div className="bg-white border border-[#E6DFD3] rounded-2xl p-8 text-center text-slate-500 text-xs space-y-2">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
          <p className="font-bold text-[#161B26]">Slip Belum Diterbitkan</p>
          <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
            Rekapitulasi gaji untuk periode {monthNames[selectedMonth - 1]} {selectedYear} belum difinalisasi oleh tim Finance.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {/* Hero THP Card */}
          <div className="bg-gradient-to-br from-[#161B26] via-[#21293A] to-[#161B26] text-white rounded-2xl p-5 border border-amber-500/20 shadow-md relative overflow-hidden space-y-3">
            <div className="flex items-center justify-between text-[10px] text-amber-300 font-bold uppercase tracking-wider">
              <div className="flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Gaji Bersih Diterima (Take Home Pay)</span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/20 text-amber-300">
                Lunas
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
                {formatRupiah(netTakeHomePay)}
              </div>
              <p className="text-[11px] text-slate-400">
                Ditransfer ke: <strong className="text-slate-200">{payslipData?.bank_uob ? `Bank UOB PGE • ${payslipData.bank_uob}` : payslipData?.bank_other || 'Rekening Karyawan Terdaftar'}</strong>
              </p>
            </div>

            {/* Quick Metrics Ribbon */}
            <div className="pt-2 border-t border-slate-700/60 grid grid-cols-3 gap-2 text-center text-[10px]">
              <div>
                <span className="text-slate-400 block">Hari Hadir</span>
                <span className="font-bold text-white font-mono">{payslipData?.total_days_present ?? 0} Hari</span>
              </div>
              <div>
                <span className="text-slate-400 block">Jam Lembur</span>
                <span className="font-bold text-amber-400 font-mono">{overtimeHours} Jam</span>
              </div>
              <div>
                <span className="text-slate-400 block">Terlambat</span>
                <span className={`font-bold font-mono ${lateMinutes > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {lateMinutes} Mnt
                </span>
              </div>
            </div>
          </div>

          {/* Breakdown Section: Penerimaan */}
          <div className="bg-white border border-[#E6DFD3] rounded-2xl p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E6DFD3]">
              <span className="font-bold text-xs text-[#161B26] uppercase tracking-wider">
                1. Komponen Penerimaan (Earnings)
              </span>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                + {formatRupiah(grossEarnings)}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Gaji Pokok (Base Salary)</span>
                <span className="font-semibold text-slate-800 font-mono">{formatRupiah(baseSalary)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Tunjangan Operasional & Transport</span>
                <span className="font-semibold text-slate-800 font-mono">{formatRupiah(transportAllowance)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Tunjangan Posisi / Fungsional</span>
                <span className="font-semibold text-slate-800 font-mono">{formatRupiah(positionAllowance)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-slate-600 block">Kompensasi Lembur ({overtimeHours} Jam)</span>
                  <span className="text-[9px] text-slate-400">Tarif kompensasi @Rp 35.000/jam</span>
                </div>
                <span className="font-semibold text-amber-700 font-mono">{formatRupiah(overtimeCompensation)}</span>
              </div>
            </div>
          </div>

          {/* Breakdown Section: Potongan */}
          <div className="bg-white border border-[#E6DFD3] rounded-2xl p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E6DFD3]">
              <span className="font-bold text-xs text-[#161B26] uppercase tracking-wider">
                2. Potongan Disiplin & Pajak (Deductions)
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                totalDeductions > 0 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}>
                - {formatRupiah(totalDeductions)}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-slate-600 block">Denda Keterlambatan Absensi</span>
                  <span className="text-[9px] text-slate-400">Total {lateMinutes} menit keterlambatan</span>
                </div>
                <span className={`font-semibold font-mono ${lateDeduction > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                  {lateDeduction > 0 ? `-${formatRupiah(lateDeduction)}` : 'Rp 0'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600">Izin Tidak Berbayar / Alpha</span>
                <span className="font-semibold text-slate-400 font-mono">Rp 0</span>
              </div>
            </div>
          </div>

          {/* Rekapitulasi Hak Cuti Tahunan */}
          <div className="p-3 bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span className="font-bold text-[#161B26]">Sisa Hak Cuti Tahunan:</span>
            </div>
            <span className="font-bold font-mono text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-lg border border-amber-300">
              {payslipData?.annual_leave_quota ? (payslipData.annual_leave_quota - (payslipData.annual_leave_used || 0)) : 10} / {payslipData?.annual_leave_quota || 12} Hari
            </span>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={handlePrintSlip}
              className="py-2.5 px-3 rounded-xl bg-white border border-[#E6DFD3] hover:border-amber-400 text-xs font-bold text-[#161B26] flex items-center justify-center space-x-2 shadow-2xs transition-all cursor-pointer active:scale-98"
            >
              <Printer className="w-3.5 h-3.5 text-amber-600" />
              <span>Cetak / PDF</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="py-2.5 px-3 rounded-xl bg-[#161B26] hover:bg-[#252E42] text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer active:scale-98"
            >
              <Share2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Kirim ke WA</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
