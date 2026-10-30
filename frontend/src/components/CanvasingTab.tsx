'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ApiClient, resolveMediaUrl } from '../lib/api';
import { ClientVisit, MyVisitsResponse } from '../types';
import { HapticFeedback } from '../lib/haptics';
import { StoreCheckInModal, StoreCheckInData } from './StoreCheckInModal';
import {
  MapPin,
  Store,
  Plus,
  Clock,
  Phone,
  User,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  Camera,
  RefreshCw,
  X,
  FileText,
  Navigation,
  ChevronRight,
  TrendingUp,
  Sparkles,
  ShoppingBag,
  Compass,
  Milestone,
  Route,
  ArrowRight,
  Flame,
  Building2,
} from 'lucide-react';

// Haversine distance calculator between two GPS coordinates (in km)
function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

interface CanvasingTabProps {
  employeeId?: string;
  onSelectPhoto?: (url: string, title: string) => void;
  onSelectTab?: (tab: 'attendance' | 'canvasing') => void;
}

const VISIT_PURPOSES = [
  'Penawaran Produk Baru',
  'Restock / Order Ulang Toko',
  'Kunjungan Rutin & Edukasi',
  'Penagihan Invoice / Piutang',
  'Survey Lokasi / Toko Prospek',
  'Penanganan Keluhan / Retur',
];

export function CanvasingTab({ employeeId, onSelectPhoto, onSelectTab }: CanvasingTabProps) {
  const [data, setData] = useState<MyVisitsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // New Visit Modal state
  const [isCheckInOpen, setIsCheckInOpen] = useState<boolean>(false);
  const [isSubmittingCheckIn, setIsSubmittingCheckIn] = useState(false);

  // GPS State
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Check-Out Modal state
  const [activeCheckOutVisit, setActiveCheckOutVisit] = useState<ClientVisit | null>(null);
  const [checkOutNotes, setCheckOutNotes] = useState('');
  const [checkOutOrderAmount, setCheckOutOrderAmount] = useState('');
  const [isSubmittingCheckOut, setIsSubmittingCheckOut] = useState(false);
  const [checkOutError, setCheckOutError] = useState<string | null>(null);

  const fetchVisits = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await ApiClient.getMyVisits();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data kunjungan');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  // Request high-accuracy GPS location
  const refreshLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation tidak didukung pada browser ini.');
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setGpsLoading(false);
      },
      (err) => {
        setGpsError(`Gagal membaca GPS: ${err.message}`);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  const handleOpenCheckInModal = () => {
    HapticFeedback.tap();
    setIsCheckInOpen(true);
    refreshLocation();
  };

  const handleCloseCheckInModal = () => {
    setIsCheckInOpen(false);
  };

  const handleSubmitStoreCheckIn = async (data: StoreCheckInData) => {
    try {
      setIsSubmittingCheckIn(true);
      const formData = new FormData();
      formData.append('client_name', data.clientName);
      if (data.clientAddress) formData.append('client_address', data.clientAddress);
      formData.append('visit_purpose', data.visitPurpose);
      formData.append('latitude', data.coords.lat.toString());
      formData.append('longitude', data.coords.lng.toString());
      formData.append('photo', data.photoBlob, 'visit-photo.jpg');

      await ApiClient.checkInVisit(formData);
      HapticFeedback.heartbeatSuccess();
      setIsCheckInOpen(false);
      await fetchVisits();
    } catch (err: any) {
      if (err.message?.includes('TIMEOUT_WEAK_SIGNAL')) {
        alert('Sinyal internet sedang lemah di lokasi ini. Silakan coba kembali sesaat lagi saat sinyal lebih stabil.');
      } else {
        alert(err.message || 'Gagal menyimpan check-in kunjungan');
      }
    } finally {
      setIsSubmittingCheckIn(false);
    }
  };

  const handleOpenCheckOut = (visit: ClientVisit) => {
    setActiveCheckOutVisit(visit);
    setCheckOutNotes(visit.notes || '');
    setCheckOutOrderAmount(visit.order_amount ? visit.order_amount.toString() : '');
    setCheckOutError(null);
  };

  const handleSubmitCheckOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCheckOutVisit) return;

    try {
      setIsSubmittingCheckOut(true);
      setCheckOutError(null);

      const parsedOrder = checkOutOrderAmount ? parseFloat(checkOutOrderAmount.replace(/[^0-9]/g, '')) : 0;

      await ApiClient.checkOutVisit(activeCheckOutVisit.id, {
        notes: checkOutNotes.trim(),
        order_amount: isNaN(parsedOrder) ? 0 : parsedOrder,
      });

      HapticFeedback.heartbeatSuccess();
      setActiveCheckOutVisit(null);
      await fetchVisits();
    } catch (err: any) {
      setCheckOutError(err.message || 'Gagal menyelesaikan check-out');
    } finally {
      setIsSubmittingCheckOut(false);
    }
  };

  const formatRupiah = (val?: number | null) => {
    if (!val) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const inProgressVisit = data?.visits.find((v) => v.status === 'IN_PROGRESS');
  const [selectedRouteVisitId, setSelectedRouteVisitId] = useState<string | null>(null);

  // Calculate chronological stops and route distances (Haversine km)
  const routeTrail = useMemo(() => {
    if (!data?.visits || data.visits.length === 0) return [];

    // Chronological order (earliest first)
    const sorted = [...data.visits].sort(
      (a, b) => new Date(a.check_in_time).getTime() - new Date(b.check_in_time).getTime()
    );

    let runningTotalKm = 0;

    return sorted.map((visit, index) => {
      let distanceFromPrevKm = 0;
      if (index > 0) {
        const prev = sorted[index - 1];
        if (prev.latitude && prev.longitude && visit.latitude && visit.longitude) {
          distanceFromPrevKm = calculateHaversineKm(
            prev.latitude,
            prev.longitude,
            visit.latitude,
            visit.longitude
          );
        }
      }
      runningTotalKm += distanceFromPrevKm;

      return {
        ...visit,
        stopNumber: index + 1,
        distanceFromPrevKm,
        totalKmSoFar: Math.round(runningTotalKm * 10) / 10,
      };
    });
  }, [data?.visits]);

  const totalKmTraveled = useMemo(() => {
    if (routeTrail.length === 0) return 0;
    return routeTrail[routeTrail.length - 1].totalKmSoFar;
  }, [routeTrail]);

  return (
    <div className="space-y-4 font-sans pb-16">
      {/* Top Segmented Pill Switcher */}
      <div className="bg-[#EFE9DD]/80 p-1 rounded-full flex items-center gap-1 border border-[#E0D8C8]">
        <button
          type="button"
          onClick={() => {
            HapticFeedback.tick();
            onSelectTab?.('attendance');
          }}
          className="flex-1 py-2 px-3 rounded-full text-xs font-semibold text-[#6E6454] hover:text-[#161B26] hover:bg-white/50 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
        >
          <Building2 className="w-3.5 h-3.5 text-[#8C7E6A]" />
          <span>Presensi Kantor</span>
        </button>

        <button
          type="button"
          className="flex-1 py-2 px-3 rounded-full text-xs font-bold transition-all flex items-center justify-center space-x-1.5 bg-[#161B26] text-white shadow-sm"
        >
          <Store className="w-3.5 h-3.5 text-[#FDE68A]" />
          <span>Kunjungan Toko</span>
        </button>
      </div>

      {/* 1. Header Banner & Daily Metric */}
      <div className="bg-[#FAF7F2] border border-[#EBE4D5] rounded-3xl p-5 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-br from-[#FEF3C7]/40 to-transparent rounded-full -mr-12 -mt-12 pointer-events-none" />

        <div className="flex items-center justify-between relative z-10">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#8C7E6A] font-bold flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-[#D97706]" />
              Field Sales Canvasing
            </span>
            <h2 className="text-xl font-extrabold text-[#161B26] mt-0.5 tracking-tight">
              Kunjungan Klien & Toko
            </h2>
          </div>
          <button
            onClick={fetchVisits}
            className="p-2 rounded-xl bg-white border border-[#EBE4D5] text-[#8C7E6A] hover:text-[#161B26] transition-colors shadow-sm cursor-pointer"
            title="Refresh Riwayat"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#D97706]' : ''}`} />
          </button>
        </div>

        {/* Highlight Metrics */}
        <div className="grid grid-cols-2 gap-3 mt-4 relative z-10">
          <div className="bg-white/80 backdrop-blur-sm border border-[#EBE4D5] rounded-2xl p-3.5 shadow-sm">
            <div className="flex items-center space-x-1.5 text-[#8C7E6A] text-[11px] font-medium">
              <Store className="w-3.5 h-3.5 text-[#D97706]" />
              <span>Toko Dikunjungi</span>
            </div>
            <div className="text-2xl font-extrabold text-[#161B26] mt-1">
              {data?.total_visits || 0}
              <span className="text-xs font-normal text-[#8C7E6A] ml-1">outlet</span>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border border-[#EBE4D5] rounded-2xl p-3.5 shadow-sm">
            <div className="flex items-center space-x-1.5 text-[#8C7E6A] text-[11px] font-medium">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>Total Closing Hari Ini</span>
            </div>
            <div className="text-lg font-extrabold text-emerald-700 mt-1 truncate">
              {formatRupiah(data?.total_closing)}
            </div>
          </div>
        </div>

        {/* Action Button: Check-In Toko Baru */}
        <div className="mt-4 relative z-10">
          <button
            type="button"
            onClick={handleOpenCheckInModal}
            className="w-full bg-[#161B26] hover:bg-[#232B3E] text-[#FAF7F2] py-3.5 px-4 rounded-2xl font-bold text-sm flex items-center justify-center space-x-2 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-[0.99]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="tracking-wide">Check-In Kunjungan Toko Baru</span>
          </button>
        </div>
      </div>

      {/* 2. Active Visit Alert (If any) */}
      {inProgressVisit && (
        <div className="bg-[#FEF9EE] border border-[#FDE68A] rounded-2xl p-4 shadow-sm flex items-start space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 text-amber-800">
            <Clock className="w-5 h-5 animate-spin" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-full">
                Sedang Di Toko
              </span>
            </div>
            <h4 className="font-serif font-bold text-[#161B26] text-base mt-1 truncate">
              {inProgressVisit.client_name}
            </h4>
            <p className="text-xs text-[#8C7E6A] mt-0.5 truncate">
              Check-in:{' '}
              {new Date(inProgressVisit.check_in_time).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              • {inProgressVisit.visit_purpose}
            </p>
            <button
              onClick={() => {
                HapticFeedback.tap();
                handleOpenCheckOut(inProgressVisit);
              }}
              className="mt-3 bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Selesaikan Kunjungan (Check-Out)</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Upgrade 4: Sales Canvasing Route Timeline */}
      {routeTrail.length > 0 && (
        <div className="bg-[#FAF7F2] border border-[#EBE4D5] rounded-3xl p-4.5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] flex items-center justify-center text-[#D97706]">
                <Route className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#161B26]">
                  Rute Canvasing Hari Ini
                </h3>
                <p className="text-[10px] text-[#8C7E6A] font-medium">
                  {routeTrail.length} stop kunjungan • {totalKmTraveled} km rute
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 px-3 py-1 bg-white border border-[#EBE4D5] rounded-full text-[11px] font-mono font-bold text-[#D97706] shadow-xs">
              <Compass className="w-3.5 h-3.5 text-[#D97706]" />
              <span>{totalKmTraveled} KM</span>
            </div>
          </div>

          {/* Horizontal Breadcrumb Route Flow */}
          <div className="overflow-x-auto pb-2 pt-1 -mx-1 px-1 scrollbar-thin">
            <div className="flex items-center space-x-2 min-w-max">
              {routeTrail.map((stop, i) => {
                const isSelected = selectedRouteVisitId === stop.id;
                const isDone = stop.status === 'COMPLETED';

                return (
                  <React.Fragment key={stop.id}>
                    {/* Distance Connector between stops */}
                    {i > 0 && (
                      <div className="flex flex-col items-center px-1">
                        <span className="text-[9px] font-mono font-bold text-[#8C7E6A] px-1.5 py-0.5 bg-white border border-[#EBE4D5] rounded-md shadow-xs">
                          +{stop.distanceFromPrevKm} km
                        </span>
                        <div className="w-8 h-0.5 bg-gradient-to-r from-[#D97706]/40 via-[#D97706] to-[#D97706]/40 my-1" />
                      </div>
                    )}

                    {/* Interactive Stop Button */}
                    <button
                      type="button"
                      onClick={() => {
                        HapticFeedback.tick();
                        setSelectedRouteVisitId(isSelected ? null : stop.id);
                      }}
                      className={`text-left p-3 rounded-2xl border transition-all cursor-pointer flex items-center space-x-2.5 ${
                        isSelected
                          ? 'bg-[#161B26] text-white border-[#161B26] shadow-md ring-2 ring-[#D97706]/50 scale-[1.02]'
                          : 'bg-white text-[#161B26] border-[#EBE4D5] hover:border-[#D97706]/60 shadow-xs'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
                          isSelected
                            ? 'bg-[#D97706] text-white'
                            : isDone
                            ? 'bg-[#EBF7F0] text-emerald-700'
                            : 'bg-[#FEF3C7] text-amber-800'
                        }`}
                      >
                        {stop.stopNumber}
                      </div>

                      <div className="max-w-[130px]">
                        <p
                          className={`text-xs font-bold truncate ${
                            isSelected ? 'text-white' : 'text-[#161B26]'
                          }`}
                        >
                          {stop.client_name}
                        </p>
                        <p
                          className={`text-[10px] font-mono truncate ${
                            isSelected ? 'text-amber-200' : 'text-[#8C7E6A]'
                          }`}
                        >
                          {new Date(stop.check_in_time).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          {stop.order_amount ? `• ${formatRupiah(stop.order_amount)}` : ''}
                        </p>
                      </div>
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. Timeline of Visits Today */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[#8C7E6A]">
            Timeline Kunjungan Hari Ini ({data?.visits.length || 0})
          </h3>
          <span className="text-[11px] text-[#8C7E6A] font-mono">
            {new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
        </div>

        {isLoading ? (
          <div className="bg-white border border-[#EBE4D5] rounded-2xl p-8 text-center text-sm text-[#8C7E6A]">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#D97706]" />
            Memuat daftar kunjungan...
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center text-sm text-rose-700">
            {error}
          </div>
        ) : !data?.visits || data.visits.length === 0 ? (
          <div className="bg-white border border-[#EBE4D5] rounded-3xl p-8 text-center space-y-2">
            <Store className="w-10 h-10 text-[#8C7E6A]/50 mx-auto" />
            <h4 className="font-serif font-bold text-[#161B26] text-base">Belum Ada Kunjungan Hari Ini</h4>
            <p className="text-xs text-[#8C7E6A] max-w-xs mx-auto">
              Tekan tombol Check-In di atas saat Anda tiba di toko atau klien untuk mencatat kunjungan GPS dan foto bukti.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.visits.map((visit) => {
              const isDone = visit.status === 'COMPLETED';
              const isSelected = selectedRouteVisitId === visit.id;
              return (
                <div
                  key={visit.id}
                  className={`bg-white border rounded-2xl p-4 shadow-sm transition-all space-y-3 ${
                    isSelected
                      ? 'border-[#D97706] ring-2 ring-[#D97706]/30 bg-amber-50/20'
                      : 'border-[#EBE4D5] hover:border-[#161B26]/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start space-x-3">
                      {/* Photo Thumbnail */}
                      <button
                        type="button"
                        onClick={() =>
                          onSelectPhoto &&
                          onSelectPhoto(resolveMediaUrl(visit.photo_url), `Kunjungan: ${visit.client_name}`)
                        }
                        className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 border border-[#E8E2D5] flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                        title="Klik untuk lihat foto bukti"
                      >
                        <img
                          src={resolveMediaUrl(visit.photo_url)}
                          alt={visit.client_name}
                          className="w-full h-full object-cover"
                        />
                      </button>

                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-extrabold text-[#161B26] text-sm leading-snug">
                            {visit.client_name}
                          </h4>
                          <span
                            className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                              isDone ? 'bg-[#EBF7F0] text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isDone ? 'Selesai' : 'Sedang Kunjungan'}
                          </span>
                        </div>

                        <div className="text-[11px] text-[#8C7E6A] mt-1 space-y-0.5">
                          {visit.contact_person && (
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3 text-[#8C7E6A]" />
                              <span>PIC: {visit.contact_person}</span>
                              {visit.contact_phone && <span>• {visit.contact_phone}</span>}
                            </div>
                          )}
                          {visit.client_address && (
                            <div className="flex items-center gap-1 truncate max-w-[200px]">
                              <MapPin className="w-3 h-3 text-[#8C7E6A]" />
                              <span className="truncate">{visit.client_address}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Time & Duration */}
                    <div className="text-right flex-shrink-0">
                      <span className="text-[11px] font-mono font-bold text-[#161B26] block">
                        {new Date(visit.check_in_time).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {visit.duration_minutes ? (
                        <span className="text-[10px] font-mono text-[#8C7E6A] block">
                          {visit.duration_minutes} mnt
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Purpose & Closing Deals */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#EBE4D5]/60 text-xs">
                    <span className="text-[10px] font-medium bg-[#FAF7F2] text-[#8C7E6A] border border-[#EBE4D5] px-2.5 py-1 rounded-lg">
                      {visit.visit_purpose}
                    </span>

                    {visit.order_amount && visit.order_amount > 0 ? (
                      <div className="flex items-center space-x-1 text-emerald-700 font-bold font-mono text-[11px]">
                        <ShoppingBag className="w-3 h-3 text-emerald-600" />
                        <span>Closing: {formatRupiah(visit.order_amount)}</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-[#8C8578]">Non-Order</span>
                    )}
                  </div>

                  {/* Notes if any */}
                  {visit.notes && (
                    <div className="bg-[#FAF8F5] p-2.5 rounded-xl border border-[#E8E2D5] text-[11px] text-[#554E43] italic">
                      &quot;{visit.notes}&quot;
                    </div>
                  )}

                  {/* Action if still in progress */}
                  {!isDone && (
                    <button
                      onClick={() => handleOpenCheckOut(visit)}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Check-Out & Simpan Hasil Kunjungan</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. MODAL: CHECK-IN KUNJUNGAN TOKO BARU (CAMERA-FIRST & AUTO GEO-TAG) */}
      <StoreCheckInModal
        isOpen={isCheckInOpen}
        initialCoords={coords}
        onClose={handleCloseCheckInModal}
        onSubmit={handleSubmitStoreCheckIn}
        isSubmitting={isSubmittingCheckIn}
      />

      {/* 5. MODAL: CHECK-OUT KUNJUNGAN & CATAT CLOSING DEAL */}
      {activeCheckOutVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#FAF8F5] border border-[#E8E2D5] rounded-3xl w-full max-w-md p-5 shadow-2xl relative my-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D5]">
              <div>
                <h3 className="font-serif font-bold text-lg text-[#1E2538]">
                  Check-Out Kunjungan
                </h3>
                <p className="text-xs text-[#8C8578] truncate max-w-[260px]">
                  {activeCheckOutVisit.client_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveCheckOutVisit(null)}
                className="p-1.5 rounded-full hover:bg-slate-200 text-[#8C8578] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {checkOutError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{checkOutError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitCheckOut} className="space-y-4 text-xs font-sans">
              {/* Closing / Nilai Pesanan */}
              <div>
                <label className="block text-[#1E2538] font-bold mb-1">
                  Nilai Pesanan / Closing Order Deal (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-emerald-700 text-sm">
                    Rp
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="0 jika tidak ada pesanan baru"
                    value={checkOutOrderAmount}
                    onChange={(e) => setCheckOutOrderAmount(e.target.value)}
                    className="w-full bg-white border border-[#E8E2D5] rounded-xl pl-10 pr-3.5 py-2.5 text-sm font-mono font-bold text-[#1E2538] focus:outline-none focus:ring-2 focus:ring-[#4F5589]/30"
                  />
                </div>
                <span className="text-[10px] text-[#8C8578] mt-1 block">
                  Kosongkan jika kunjungan hanya silaturahmi / survey.
                </span>
              </div>

              {/* Catatan Hasil Kunjungan */}
              <div>
                <label className="block text-[#1E2538] font-bold mb-1">
                  Catatan Kunjungan / Notulen
                </label>
                <textarea
                  rows={3}
                  placeholder="Contoh: Toko minta diskon khusus untuk pembelian kartonan minggu depan. PIC berencana order produk baru."
                  value={checkOutNotes}
                  onChange={(e) => setCheckOutNotes(e.target.value)}
                  className="w-full bg-white border border-[#E8E2D5] rounded-xl p-3 text-sm text-[#1E2538] focus:outline-none focus:ring-2 focus:ring-[#4F5589]/30"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveCheckOutVisit(null)}
                  className="w-1/3 bg-white border border-[#E8E2D5] hover:bg-slate-100 text-[#1E2538] py-3 rounded-2xl font-semibold text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCheckOut}
                  className="w-2/3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white py-3 rounded-2xl font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md cursor-pointer"
                >
                  {isSubmittingCheckOut ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Check-Out Sekarang</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
