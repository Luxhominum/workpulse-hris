'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ApiClient } from '../../lib/api';
import { Shift } from '../../types';
import {
  Clock3,
  Plus,
  Save,
  Check,
  RefreshCw,
  Search,
  Moon,
  Sun,
  AlertCircle,
  X,
  Timer,
  Users,
  Pencil,
  Trash2,
  ArrowRight,
  Sparkles,
  Info,
} from 'lucide-react';

export function ShiftsManagementTab() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields
  const [shiftName, setShiftName] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [gracePeriod, setGracePeriod] = useState(15);

  // Delete confirmation modal state
  const [shiftToDelete, setShiftToDelete] = useState<Shift | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadShifts = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await ApiClient.getShifts();
      setShifts(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memuat jadwal shift.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadShifts();
  }, []);

  const filteredShifts = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return shifts;
    return shifts.filter((s) => s.name.toLowerCase().includes(q));
  }, [shifts, searchTerm]);

  const isOvernightShift = (start: string, end: string) => {
    if (!start || !end) return false;
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    return eH < sH || (eH === sH && eM < sM);
  };

  const calculateDurationHours = (start: string, end: string) => {
    if (!start || !end) return '0 jam';
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    let startMins = sH * 60 + sM;
    let endMins = eH * 60 + eM;
    if (endMins < startMins) {
      endMins += 24 * 60; // Overnight
    }
    const diff = endMins - startMins;
    const hrs = Math.floor(diff / 60);
    const remMins = diff % 60;
    return remMins > 0 ? `${hrs}j ${remMins}m` : `${hrs} jam`;
  };

  const calculateGraceDeadline = (start: string, graceMins: number) => {
    if (!start) return '--:--';
    const [sH, sM] = start.split(':').map(Number);
    let totalMins = sH * 60 + sM + Number(graceMins || 0);
    const h = Math.floor(totalMins / 60) % 24;
    const m = totalMins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const openCreateModal = () => {
    setModalMode('create');
    setActiveShiftId(null);
    setShiftName('');
    setStartTime('09:00');
    setEndTime('18:00');
    setGracePeriod(15);
    setIsModalOpen(true);
  };

  const openEditModal = (shift: Shift) => {
    setModalMode('edit');
    setActiveShiftId(shift.id);
    setShiftName(shift.name);
    setStartTime(shift.start_time);
    setEndTime(shift.end_time);
    setGracePeriod(shift.grace_period_minutes);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftName.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (modalMode === 'create') {
        await ApiClient.createShift({
          name: shiftName.trim(),
          start_time: startTime,
          end_time: endTime,
          grace_period_minutes: Number(gracePeriod),
        });
        setSuccessMsg(`Jadwal shift "${shiftName}" berhasil ditambahkan!`);
      } else if (modalMode === 'edit' && activeShiftId) {
        await ApiClient.updateShift(activeShiftId, {
          name: shiftName.trim(),
          start_time: startTime,
          end_time: endTime,
          grace_period_minutes: Number(gracePeriod),
        });
        setSuccessMsg(`Jadwal shift "${shiftName}" berhasil diperbarui!`);
      }

      setIsModalOpen(false);
      await loadShifts();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan shift.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteShift = async () => {
    if (!shiftToDelete) return;
    setIsDeleting(true);
    setErrorMsg(null);
    try {
      await ApiClient.deleteShift(shiftToDelete.id);
      setSuccessMsg(`Shift "${shiftToDelete.name}" berhasil dihapus.`);
      setShiftToDelete(null);
      await loadShifts();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menghapus shift.');
    } finally {
      setIsDeleting(false);
    }
  };

  // 24H Timeline calculations
  const getTimelineSegments = (start: string, end: string) => {
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    const startMins = sH * 60 + sM;
    const endMins = eH * 60 + eM;
    const totalDayMins = 24 * 60;

    if (endMins >= startMins) {
      const left = (startMins / totalDayMins) * 100;
      const width = ((endMins - startMins) / totalDayMins) * 100;
      return [{ left, width, key: 'day' }];
    } else {
      // Overnight: splits into two segments (start to 24:00, and 00:00 to end)
      const seg1Left = (startMins / totalDayMins) * 100;
      const seg1Width = ((totalDayMins - startMins) / totalDayMins) * 100;
      const seg2Left = 0;
      const seg2Width = (endMins / totalDayMins) * 100;
      return [
        { left: seg1Left, width: seg1Width, key: 'night-seg1' },
        { left: seg2Left, width: seg2Width, key: 'night-seg2' },
      ];
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#161B26] tracking-tight flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700">
              <Clock3 className="w-4 h-4" />
            </div>
            <span>Jadwal Shift Kerja & Kebijakan Toleransi</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Konfigurasi jam operasional masuk/pulang, buffer toleransi keterlambatan (*grace period*), dan shift malam lintas hari
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="w-64 relative hidden sm:block">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari jadwal shift..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#E6DFD3] text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white shadow-2xs"
            />
          </div>

          <button
            onClick={openCreateModal}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-semibold flex items-center space-x-2 transition-all shadow-sm shadow-amber-950/20 cursor-pointer shrink-0 active:scale-98"
          >
            <Plus className="w-4 h-4 text-amber-200" />
            <span>Tambah Shift Baru</span>
          </button>
        </div>
      </div>

      {/* 2. Notifications Banner */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Shifts Timetable Grid (Morning Luxury Timetable Cards) */}
      {isLoading ? (
        <div className="bg-white border border-[#E6DFD3] rounded-2xl p-16 text-center text-slate-400 text-xs flex flex-col items-center">
          <RefreshCw className="w-6 h-6 animate-spin text-amber-600 mb-2" />
          <span className="font-medium text-slate-600">Memuat jadwal shift terkonfigurasi...</span>
        </div>
      ) : filteredShifts.length === 0 ? (
        <div className="bg-white border border-[#E6DFD3] rounded-2xl p-16 text-center text-slate-400 text-xs flex flex-col items-center">
          <Clock3 className="w-8 h-8 text-slate-300 mb-2" />
          <span className="font-semibold text-slate-700 text-sm">Belum Ada Shift Ditemukan</span>
          <p className="text-slate-500 mt-1 max-w-sm">
            {searchTerm ? `Tidak ada shift dengan nama "${searchTerm}".` : 'Mulai buat shift kerja baru untuk kantor Anda.'}
          </p>
          <button
            onClick={openCreateModal}
            className="mt-4 px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-amber-200" />
            <span>Buat Shift Pertama</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredShifts.map((shift) => {
            const isNight = isOvernightShift(shift.start_time, shift.end_time);
            const duration = calculateDurationHours(shift.start_time, shift.end_time);
            const graceDeadline = calculateGraceDeadline(shift.start_time, shift.grace_period_minutes);
            const assignedCount = shift._count?.employees ?? 0;
            const timelineSegments = getTimelineSegments(shift.start_time, shift.end_time);

            return (
              <div
                key={shift.id}
                className="bg-white border border-[#E6DFD3] rounded-2xl p-5 shadow-2xs hover:shadow-md hover:border-amber-300 transition-all flex flex-col justify-between space-y-4 group relative overflow-hidden"
              >
                {/* Top Ambient Highlight */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 ${
                    isNight
                      ? 'bg-gradient-to-r from-[#161B26] via-indigo-900 to-amber-500'
                      : 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600'
                  }`}
                />

                {/* Card Header */}
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                          isNight
                            ? 'bg-[#161B26] text-amber-300 border border-amber-500/20'
                            : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                        }`}
                      >
                        {isNight ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <h3 className="font-bold text-sm text-[#161B26] tracking-tight group-hover:text-amber-700 transition-colors">
                            {shift.name}
                          </h3>
                        </div>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          {isNight && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                              Overnight (+1 Hari)
                            </span>
                          )}
                          <span className="text-[10px] font-medium text-slate-500">
                            Durasi: <strong className="text-slate-800">{duration}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => openEditModal(shift)}
                        title="Edit Shift"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setShiftToDelete(shift)}
                        title="Hapus Shift"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Operational Time Box (Departure / Arrival Style) */}
                  <div className="bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        Jam Masuk
                      </span>
                      <span className="text-base font-extrabold font-mono text-[#161B26] tracking-tight">
                        {shift.start_time} <span className="text-[10px] font-medium text-slate-400">WIB</span>
                      </span>
                    </div>

                    <div className="flex flex-col items-center px-2">
                      <span className="text-[9px] font-semibold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full mb-1">
                        {duration}
                      </span>
                      <div className="w-12 h-px bg-amber-300 relative flex items-center justify-center">
                        <ArrowRight className="w-3 h-3 text-amber-600 absolute right-0 -mr-1" />
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        Jam Pulang
                      </span>
                      <span className="text-base font-extrabold font-mono text-[#161B26] tracking-tight">
                        {shift.end_time} <span className="text-[10px] font-medium text-slate-400">WIB</span>
                        {isNight && (
                          <span className="text-[9px] text-amber-600 font-bold ml-1">+1H</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* 24-Hour Coverage Mini Visualizer */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                      <span>00:00</span>
                      <span>06:00</span>
                      <span>12:00</span>
                      <span>18:00</span>
                      <span>24:00</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full relative overflow-hidden border border-slate-200/60">
                      {/* Grid tick marks */}
                      <div className="absolute left-1/4 top-0 bottom-0 w-px bg-slate-200" />
                      <div className="absolute left-2/4 top-0 bottom-0 w-px bg-slate-200" />
                      <div className="absolute left-3/4 top-0 bottom-0 w-px bg-slate-200" />

                      {/* Active span bars */}
                      {timelineSegments.map((seg) => (
                        <div
                          key={seg.key}
                          className={`absolute top-0 bottom-0 rounded-full ${
                            isNight
                              ? 'bg-gradient-to-r from-indigo-700 to-amber-500'
                              : 'bg-gradient-to-r from-amber-500 to-amber-600'
                          }`}
                          style={{ left: `${seg.left}%`, width: `${seg.width}%` }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Grace Period Policy Strip */}
                  <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/50 flex items-start space-x-2.5">
                    <div className="w-5 h-5 rounded-md bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Timer className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-[11px] leading-tight">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-amber-900">
                          Toleransi: +{shift.grace_period_minutes} Menit
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">(Grace)</span>
                      </div>
                      <p className="text-slate-600 text-[10px] mt-0.5">
                        Absen s.d. <strong className="text-slate-900 font-mono">{graceDeadline} WIB</strong> dihitung Hadir Tepat Waktu (bebas denda terlambat).
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs text-slate-600">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-800">{assignedCount}</span>
                    <span className="text-[11px] text-slate-500">Karyawan Ditugaskan</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => openEditModal(shift)}
                    className="px-3 py-1.5 rounded-lg border border-[#E6DFD3] hover:border-amber-400 hover:bg-amber-50/50 text-[#161B26] text-xs font-semibold flex items-center space-x-1 transition-all cursor-pointer"
                  >
                    <span>Atur Shift</span>
                    <ArrowRight className="w-3 h-3 text-amber-600" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Add / Edit Shift Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#E6DFD3] shadow-2xl overflow-hidden p-6 space-y-4 font-sans animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#161B26] text-white flex items-center justify-center">
                  <Clock3 className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#161B26]">
                    {modalMode === 'create' ? 'Tambah Jadwal Shift Baru' : 'Konfigurasi Jadwal Shift'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Atur jam operasional masuk, jam pulang, dan toleransi keterlambatan
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Nama Jadwal Shift *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Shift Pagi Reguler, Shift Malam Produksi"
                  value={shiftName}
                  onChange={(e) => setShiftName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E6DFD3] text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Jam Masuk Operasional *
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#E6DFD3] text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Jam Pulang Operasional *
                  </label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#E6DFD3] text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Overnight Indicator Badge */}
              {isOvernightShift(startTime, endTime) && (
                <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center space-x-2 text-indigo-800 text-xs">
                  <Moon className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>
                    <strong>Shift Malam Terdeteksi:</strong> Jam pulang melewati tengah malam (+1 hari).
                  </span>
                </div>
              )}

              {/* Grace Period Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700">
                    Grace Period Toleransi Keterlambatan
                  </label>
                  <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/50">
                    +{gracePeriod} Menit
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {[0, 5, 10, 15, 30].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setGracePeriod(preset)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        gracePeriod === preset
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-white border-[#E6DFD3] text-slate-700 hover:border-amber-400'
                      }`}
                    >
                      {preset} mnt
                    </button>
                  ))}
                </div>

                <input
                  type="range"
                  min="0"
                  max="60"
                  step="5"
                  value={gracePeriod}
                  onChange={(e) => setGracePeriod(Number(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer"
                />
              </div>

              {/* Live Preview Box */}
              <div className="bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl p-3.5 space-y-1.5">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-[#161B26]">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Simulasi Kebijakan Shift:</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-slate-500 block">Batas Tepat Waktu:</span>
                    <strong className="text-slate-900 font-mono">
                      {calculateGraceDeadline(startTime, gracePeriod)} WIB
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Total Durasi Kerja:</span>
                    <strong className="text-slate-900">
                      {calculateDurationHours(startTime, endTime)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white flex items-center space-x-1.5 disabled:opacity-50 shadow-sm shadow-amber-950/20 cursor-pointer active:scale-98 transition-all"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>{modalMode === 'create' ? 'Buat Shift Baru' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Delete Confirmation Modal */}
      {shiftToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-rose-200 shadow-2xl p-6 space-y-4 font-sans animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#161B26]">Hapus Jadwal Shift?</h3>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus jadwal <strong className="text-slate-900">"{shiftToDelete.name}"</strong>?
              {shiftToDelete._count?.employees && shiftToDelete._count.employees > 0 ? (
                <span className="block mt-2 p-2 bg-rose-50 text-rose-800 rounded-lg font-medium border border-rose-200">
                  ⚠️ Peringatan: Terdapat {shiftToDelete._count.employees} karyawan yang saat ini terhubung dengan shift ini.
                </span>
              ) : null}
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShiftToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteShift}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white flex items-center space-x-1.5 disabled:opacity-50 shadow-xs cursor-pointer"
              >
                {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Hapus Shift</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
