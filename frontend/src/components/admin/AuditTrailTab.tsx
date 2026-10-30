'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ApiClient } from '../../lib/api';
import { AuditLogItem } from '../../types';
import {
  ShieldAlert,
  Search,
  Download,
  RefreshCw,
  Eye,
  FileSpreadsheet,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  FileText,
  Lock,
  ArrowRight,
  Filter,
  X,
  Laptop,
} from 'lucide-react';

export function AuditTrailTab() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ApiClient.getAuditLogs({
        search: searchQuery.trim() || undefined,
        action: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        limit: 100,
      });
      setLogs(res.logs || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleExport = async (format: 'xlsx' | 'csv') => {
    try {
      setExporting(true);
      const blob = await ApiClient.exportAuditLogs(format, {
        search: searchQuery.trim() || undefined,
        action: selectedCategory !== 'ALL' ? selectedCategory : undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_uupdp_${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || 'Gagal mengekspor log audit');
    } finally {
      setExporting(false);
    }
  };

  const getActionBadge = (action: string) => {
    if (action.startsWith('EMPLOYEE_')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-sky-50 text-sky-800 border border-sky-200">
          <User className="w-3 h-3 text-sky-600" />
          {action.replace('EMPLOYEE_', '')}
        </span>
      );
    }
    if (action.startsWith('LEAVE_')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-amber-50 text-amber-800 border border-amber-200">
          <Clock className="w-3 h-3 text-amber-600" />
          {action.replace('LEAVE_', 'CUTI ')}
        </span>
      );
    }
    if (action.startsWith('OVERTIME_')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-purple-50 text-purple-800 border border-purple-200">
          <FileText className="w-3 h-3 text-purple-600" />
          {action.replace('OVERTIME_', 'LEMBUR ')}
        </span>
      );
    }
    if (action === 'PAYROLL_EXPORT') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
          <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
          PAYROLL EXPORT
        </span>
      );
    }
    if (action.startsWith('ATTENDANCE_')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-indigo-50 text-indigo-800 border border-indigo-200">
          <CheckCircle2 className="w-3 h-3 text-indigo-600" />
          KOREKSI ABSENSI
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-stone-100 text-stone-800 border border-stone-200">
        {action}
      </span>
    );
  };

  const parseJsonSafe = (str: string | null | undefined) => {
    if (!str) return null;
    try {
      return JSON.parse(str);
    } catch {
      return str;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Metrics */}
      <div className="bg-gradient-to-br from-[#161B26] via-[#202736] to-[#161B26] text-white p-6 rounded-2xl border border-stone-800 shadow-xl relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold tracking-wider uppercase">
              <Lock className="w-3.5 h-3.5" />
              UU PDP Compliance & Audit Vault
            </div>
            <h1 className="text-2xl font-serif font-black tracking-tight text-amber-50">
              Audit Trail & Security Activity Log
            </h1>
            <p className="text-xs text-stone-300 max-w-2xl leading-relaxed">
              Pencatatan rekam jejak digital tamper-proof untuk setiap aktivitas administratif, akses data sensitif PII karyawan,
              persetujuan cuti & lembur, serta ekspor file payroll sesuai regulasi perlindungan data pribadi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleExport('xlsx')}
              disabled={exporting || logs.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {exporting ? 'Mengekspor...' : 'Ekspor Excel (.xlsx)'}
            </button>
            <button
              onClick={() => handleExport('csv')}
              disabled={exporting || logs.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold border border-stone-700 transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-stone-400" />
              CSV
            </button>
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 transition-all"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-white/10">
          <div>
            <span className="text-[10px] tracking-wider uppercase text-stone-400 font-semibold block">Total Log Tercatat</span>
            <span className="text-xl font-mono font-black text-white">{total.toLocaleString('id-ID')}</span>
          </div>
          <div>
            <span className="text-[10px] tracking-wider uppercase text-stone-400 font-semibold block">Enkripsi Database</span>
            <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> AES-256-GCM Aktif
            </span>
          </div>
          <div>
            <span className="text-[10px] tracking-wider uppercase text-stone-400 font-semibold block">Standar Kepatuhan</span>
            <span className="text-xs font-mono font-bold text-amber-300 mt-1 block">UU PDP 27/2022</span>
          </div>
          <div>
            <span className="text-[10px] tracking-wider uppercase text-stone-400 font-semibold block">Media Gateway</span>
            <span className="text-xs font-mono font-bold text-sky-400 mt-1 block">JWT Token Guarded</span>
          </div>
        </div>
      </div>

      {/* 2. Search & Category Filters */}
      <div className="bg-[#FAF8F5] p-3 sm:p-4 rounded-xl border border-[#E8DFD0] space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari pelaku, email, alamat IP, atau detail aktivitas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#E8DFD0] rounded-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter Aksi:
          </span>
          {[
            { id: 'ALL', label: 'Semua Log' },
            { id: 'EMPLOYEE_UPDATE', label: 'Update Data Karyawan' },
            { id: 'EMPLOYEE_CREATE', label: 'Tambah Karyawan' },
            { id: 'LEAVE_APPROVE', label: 'Approval Cuti' },
            { id: 'OVERTIME_APPROVE', label: 'Approval SPL' },
            { id: 'PAYROLL_EXPORT', label: 'Ekspor Payroll' },
            { id: 'ATTENDANCE_MANUAL_ADJUST', label: 'Koreksi Presensi' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                selectedCategory === cat.id
                  ? 'bg-[#161B26] text-white shadow-sm'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-[#E8DFD0]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Log Records Table */}
      <div className="bg-white rounded-xl border border-[#E8DFD0] shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-amber-600 animate-spin mx-auto" />
            <p className="text-xs text-stone-500 font-medium">Memuat rekam aktivitas audit...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <ShieldAlert className="w-10 h-10 text-stone-300 mx-auto" />
            <h3 className="text-sm font-bold text-stone-700">Belum Ada Rekam Audit</h3>
            <p className="text-xs text-stone-400 max-w-sm mx-auto">
              Tidak ada aktivitas yang sesuai dengan filter pencarian ini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] text-stone-600 uppercase text-[10px] tracking-wider font-extrabold border-b border-[#E8DFD0]">
                <tr>
                  <th className="py-3 px-4">Waktu (WIB) & IP</th>
                  <th className="py-3 px-4">Pelaku (Actor)</th>
                  <th className="py-3 px-4">Kategori Aksi</th>
                  <th className="py-3 px-4">Rincian Deskripsi</th>
                  <th className="py-3 px-4 text-center">Perubahan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DFD0]/60">
                {logs.map((log) => {
                  const hasChanges = Boolean(log.old_values || log.new_values);
                  return (
                    <tr key={log.id} className="hover:bg-amber-50/30 transition-colors">
                      {/* Waktu & IP */}
                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        <div className="font-mono text-stone-800 font-bold">
                          {new Date(log.created_at).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            timeZone: 'Asia/Jakarta',
                          })}{' '}
                          WIB
                        </div>
                        <div className="text-[10px] text-stone-400 font-mono mt-0.5">
                          {new Date(log.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[10px] font-mono text-stone-500 flex items-center gap-1 mt-1">
                          <Laptop className="w-3 h-3 text-stone-400" />
                          {log.ip_address || '127.0.0.1'}
                        </div>
                      </td>

                      {/* Pelaku */}
                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        <div className="font-bold text-[#161B26]">{log.actor_name}</div>
                        <div className="text-[10px] text-stone-500 font-mono">{log.actor_email || '—'}</div>
                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-stone-100 text-stone-700 border border-stone-200">
                          {log.actor_role || 'SYSTEM'}
                        </span>
                      </td>

                      {/* Kategori Aksi */}
                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        {getActionBadge(log.action)}
                        <div className="text-[10px] text-stone-400 font-mono mt-1">
                          Target: {log.entity_type}
                        </div>
                      </td>

                      {/* Deskripsi */}
                      <td className="py-3 px-4 align-top text-stone-800 leading-relaxed font-medium min-w-[260px]">
                        {log.description}
                      </td>

                      {/* Perubahan Diff Modal Button */}
                      <td className="py-3 px-4 align-top text-center whitespace-nowrap">
                        {hasChanges ? (
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold transition-all shadow-xs"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-600" />
                            Detail Diff
                          </button>
                        ) : (
                          <span className="text-[10px] text-stone-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Modal Perubahan Data Diff (Tamper-Proof Inspector) */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-[#161B26] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Inspeksi Rekam Audit (UU PDP)</h3>
                  <p className="text-xs text-stone-300 font-mono mt-0.5">ID Log: {selectedLog.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Event Metadata Banner */}
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8DFD0] grid grid-cols-2 gap-3 text-stone-700">
                <div>
                  <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider block">Pelaku</span>
                  <strong className="text-stone-900">{selectedLog.actor_name}</strong> ({selectedLog.actor_role})
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider block">Alamat IP</span>
                  <span className="font-mono text-stone-800">{selectedLog.ip_address || '127.0.0.1'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider block">Aksi & Deskripsi</span>
                  <div className="mt-1 font-semibold text-stone-900">{selectedLog.description}</div>
                </div>
              </div>

              {/* Diff Comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Old Values */}
                <div className="space-y-1.5">
                  <div className="font-bold text-stone-700 flex items-center gap-1.5 text-xs">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    Data Sebelum (Old State)
                  </div>
                  <pre className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-[11px] font-mono text-stone-700 overflow-x-auto max-h-60 leading-relaxed">
                    {selectedLog.old_values
                      ? JSON.stringify(parseJsonSafe(selectedLog.old_values), null, 2)
                      : '// Tidak ada data sebelumnya (Record baru)'}
                  </pre>
                </div>

                {/* New Values */}
                <div className="space-y-1.5">
                  <div className="font-bold text-stone-700 flex items-center gap-1.5 text-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Data Sesudah (New State)
                  </div>
                  <pre className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl text-[11px] font-mono text-emerald-950 overflow-x-auto max-h-60 leading-relaxed">
                    {selectedLog.new_values
                      ? JSON.stringify(parseJsonSafe(selectedLog.new_values), null, 2)
                      : '// Data dihapus / diarsipkan'}
                  </pre>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Seluruh nomor KTP, KK, dan rekening bank dalam rekam audit telah disensor otomatis secara kriptografis demi privasi.</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#FAF8F5] border-t border-stone-200 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-[#161B26] hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all"
              >
                Tutup Jendela
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
