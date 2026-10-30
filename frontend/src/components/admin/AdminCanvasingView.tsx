'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ApiClient, resolveMediaUrl } from '../../lib/api';
import { AdminVisitsOverviewResponse, ClientVisit, Employee } from '../../types';
import {
  MapPin,
  Store,
  RefreshCw,
  Calendar,
  Search,
  ExternalLink,
  DollarSign,
  Clock,
  TrendingUp,
  CheckCircle2,
  Users,
  ShoppingBag,
  AlertCircle,
  X,
  FileSpreadsheet,
  Plus,
  Route,
  Navigation,
  ChevronLeft,
  ChevronRight,
  ChevronRight as ArrowRightIcon,
  Phone,
  Trash2,
  Upload,
  Eye,
  Check,
  Building2,
  Briefcase,
  Layers,
  Sparkles,
  Map as MapIcon,
  Radio,
} from 'lucide-react';

// Haversine distance calculator between two GPS coordinates (in km)
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

const VISIT_PURPOSES = [
  'Penawaran Produk Baru',
  'Restock / Order Ulang Toko',
  'Kunjungan Rutin & Edukasi',
  'Penagihan Invoice / Piutang',
  'Survey Lokasi / Toko Prospek',
  'Penanganan Keluhan / Retur',
];

export function AdminCanvasingView() {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [overview, setOverview] = useState<AdminVisitsOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'IN_PROGRESS'>('ALL');
  const [selectedRepId, setSelectedRepId] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'map' | 'route'>('table');

  // Selected visit for inspection drawer/modal
  const [selectedVisit, setSelectedVisit] = useState<ClientVisit | null>(null);

  // Map refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  // Admin Manual Log / Bypass Modal state
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [employeesList, setEmployeesList] = useState<Employee[]>([]);
  const [manualForm, setManualForm] = useState({
    employee_id: '',
    client_name: '',
    client_address: '',
    contact_person: '',
    contact_phone: '',
    visit_purpose: VISIT_PURPOSES[0],
    check_in_time: '09:00',
    check_out_time: '10:00',
    is_completed: true,
    order_amount: '',
    notes: '',
    latitude: '-7.5612',
    longitude: '110.8245',
  });
  const [manualPhotoFile, setManualPhotoFile] = useState<File | null>(null);
  const [manualPhotoPreview, setManualPhotoPreview] = useState<string | null>(null);
  const [isSubmittingManual, setIsSubmittingManual] = useState<boolean>(false);
  const [manualError, setManualError] = useState<string | null>(null);

  // Fetch overview data
  const fetchOverview = useCallback(
    async (isSilent = false) => {
      try {
        if (!isSilent) setIsLoading(true);
        setError(null);
        const res = await ApiClient.getAdminVisitsOverview(selectedDate);
        setOverview(res);
      } catch (err: any) {
        setError(err.message || 'Gagal memuat data sales canvasing');
      } finally {
        if (!isSilent) setIsLoading(false);
      }
    },
    [selectedDate]
  );

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // Load employees for admin manual bypass modal
  useEffect(() => {
    ApiClient.getEmployees()
      .then((emps) => setEmployeesList(emps))
      .catch((err) => console.error('Gagal memuat daftar karyawan:', err));
  }, []);

  const formatRupiah = (val?: number | null) => {
    if (!val || val === 0) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Quick Date Navigation
  const changeDateByDays = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const setDateToday = () => {
    setSelectedDate(new Date().toISOString().slice(0, 10));
  };

  // Unique sales reps present in today's visits for quick avatar chips
  const repsWithVisits = useMemo(() => {
    const map = new Map<string, { id: string; name: string; initials: string; count: number }>();
    (overview?.visits || []).forEach((v) => {
      const empId = v.employee_id;
      const empName = v.employee?.full_name || 'Sales Staff';
      const initials = empName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

      if (!map.has(empId)) {
        map.set(empId, { id: empId, name: empName, initials, count: 0 });
      }
      map.get(empId)!.count += 1;
    });
    return Array.from(map.values());
  }, [overview?.visits]);

  // Filtered visits based on Search, Status, and selected Rep Chip
  const filteredVisits = useMemo(() => {
    return (overview?.visits || []).filter((v) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        v.client_name.toLowerCase().includes(q) ||
        (v.employee?.full_name && v.employee.full_name.toLowerCase().includes(q)) ||
        (v.employee?.nickname && v.employee.nickname.toLowerCase().includes(q)) ||
        (v.employee?.employee_id_number && v.employee.employee_id_number.toLowerCase().includes(q)) ||
        (v.client_address && v.client_address.toLowerCase().includes(q)) ||
        (v.contact_person && v.contact_person.toLowerCase().includes(q)) ||
        (v.visit_purpose && v.visit_purpose.toLowerCase().includes(q));

      const matchStatus = statusFilter === 'ALL' || v.status === statusFilter;
      const matchRep = selectedRepId === 'ALL' || v.employee_id === selectedRepId;

      return matchSearch && matchStatus && matchRep;
    });
  }, [overview?.visits, searchQuery, statusFilter, selectedRepId]);

  // Active reps currently visiting a store right now (for Live Status Ticker)
  const activeNowVisits = useMemo(() => {
    return (overview?.visits || []).filter((v) => v.status === 'IN_PROGRESS');
  }, [overview?.visits]);

  // Group visits by sales rep for Route Itinerary view
  const salesGroupedVisits = useMemo(() => {
    const groups: {
      [key: string]: {
        employee: {
          id: string;
          full_name: string;
          nickname?: string | null;
          department: string;
          position: string;
          employee_id_number?: string | null;
        };
        visits: ClientVisit[];
        totalClosing: number;
        completedCount: number;
        inProgressCount: number;
      };
    } = {};

    filteredVisits.forEach((v) => {
      const empId = v.employee_id;
      if (!groups[empId]) {
        groups[empId] = {
          employee: v.employee || {
            id: empId,
            full_name: 'Sales Staff',
            department: 'Sales & Marketing',
            position: 'Sales Representative',
          },
          visits: [],
          totalClosing: 0,
          completedCount: 0,
          inProgressCount: 0,
        };
      }
      groups[empId].visits.push(v);
      groups[empId].totalClosing += v.order_amount || 0;
      if (v.status === 'COMPLETED') groups[empId].completedCount += 1;
      if (v.status === 'IN_PROGRESS') groups[empId].inProgressCount += 1;
    });

    Object.values(groups).forEach((g) => {
      g.visits.sort(
        (a, b) => new Date(a.check_in_time).getTime() - new Date(b.check_in_time).getTime()
      );
    });

    return Object.values(groups).sort((a, b) => b.totalClosing - a.totalClosing);
  }, [filteredVisits]);

  // Leaflet Interactive Map Initialization
  useEffect(() => {
    if (viewMode !== 'map' || !mapContainerRef.current) return;

    let isMounted = true;
    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapContainerRef.current).setView([-7.5612, 110.8245], 13);
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      const markers: any[] = [];

      filteredVisits.forEach((visit) => {
        const isDone = visit.status === 'COMPLETED';
        const color = isDone ? '#059669' : '#D97706';

        const customIcon = L.divIcon({
          className: 'custom-leaflet-marker',
          html: `
            <div style="
              background-color: ${color};
              color: white;
              width: 32px;
              height: 32px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 10px rgba(0,0,0,0.35);
              border: 2px solid white;
              font-size: 13px;
              font-weight: bold;
              cursor: pointer;
              position: relative;
            ">
              ${isDone ? '✓' : '⏳'}
              ${
                !isDone
                  ? '<span style="position:absolute; inset:-4px; border-radius:50%; border:2px solid #D97706; opacity: 0.75;"></span>'
                  : ''
              }
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16],
        });

        const popupHtml = `
          <div style="font-family: sans-serif; min-width: 190px; padding: 4px;">
            <div style="font-size: 9px; font-weight: 800; color: ${color}; text-transform: uppercase;">
              ${isDone ? '✓ Kunjungan Selesai' : '⏳ Sedang di Toko'}
            </div>
            <div style="font-size: 13px; font-weight: 800; color: #161B26; margin-top: 2px;">
              ${visit.client_name}
            </div>
            <div style="font-size: 11px; color: #78716C; margin-top: 2px;">
              Sales: <b>${visit.employee?.full_name || 'Sales Staff'}</b>
            </div>
            <div style="font-size: 11px; color: #78716C;">
              Waktu: Masuk ${new Date(visit.check_in_time).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            ${
              visit.order_amount && visit.order_amount > 0
                ? `<div style="font-size: 12px; font-weight: 800; color: #059669; margin-top: 4px;">Closing: Rp ${Number(
                    visit.order_amount
                  ).toLocaleString('id-ID')}</div>`
                : ''
            }
            <button id="btn-visit-${visit.id}" style="
              margin-top: 8px;
              width: 100%;
              background: #161B26;
              color: white;
              border: none;
              border-radius: 8px;
              padding: 6px 10px;
              font-size: 11px;
              font-weight: bold;
              cursor: pointer;
            ">
              Buka Detail Lengkap →
            </button>
          </div>
        `;

        const marker = L.marker([visit.latitude, visit.longitude], { icon: customIcon })
          .addTo(map)
          .bindPopup(popupHtml);

        marker.on('popupopen', () => {
          const btn = document.getElementById(`btn-visit-${visit.id}`);
          if (btn) {
            btn.onclick = () => {
              setSelectedVisit(visit);
            };
          }
        });

        markers.push(marker);
      });

      if (markers.length > 0) {
        const group = L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.15));
      }
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [viewMode, filteredVisits]);

  // Handle Delete Visit
  const handleDeleteVisit = async (visitId: string, clientName: string) => {
    if (!confirm(`Hapus data kunjungan toko "${clientName}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }
    try {
      await ApiClient.adminDeleteVisit(visitId);
      if (selectedVisit?.id === visitId) setSelectedVisit(null);
      await fetchOverview(true);
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus kunjungan');
    }
  };

  // Handle Export CSV
  const handleExportCSV = () => {
    const rows = filteredVisits;
    if (rows.length === 0) {
      alert('Tidak ada data kunjungan untuk diexport.');
      return;
    }

    const headers = [
      'No',
      'Tanggal',
      'Sales Representative',
      'NIK',
      'Departemen',
      'Nama Toko / Outlet',
      'Alamat Klien',
      'Kontak PIC',
      'No Telp PIC',
      'Waktu Check-In',
      'Waktu Check-Out',
      'Durasi (Menit)',
      'Tujuan Kunjungan',
      'Status Kunjungan',
      'Nilai Closing Order (Rp)',
      'Catatan Kunjungan',
      'Latitude',
      'Longitude',
    ];

    const csvContent = [
      headers.join(';'),
      ...rows.map((v, idx) => {
        const inTime = new Date(v.check_in_time).toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
        });
        const outTime = v.check_out_time
          ? new Date(v.check_out_time).toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : '-';

        return [
          idx + 1,
          `"${selectedDate}"`,
          `"${v.employee?.full_name || 'Sales Staff'}"`,
          `"${v.employee?.employee_id_number || '-'}"`,
          `"${v.employee?.department || 'Sales'}"`,
          `"${v.client_name.replace(/"/g, '""')}"`,
          `"${(v.client_address || '-').replace(/"/g, '""')}"`,
          `"${(v.contact_person || '-').replace(/"/g, '""')}"`,
          `"${v.contact_phone || '-'}"`,
          `"${inTime}"`,
          `"${outTime}"`,
          v.duration_minutes || 0,
          `"${v.visit_purpose || '-'}"`,
          `"${v.status === 'COMPLETED' ? 'Selesai' : 'Sedang Kunjungan'}"`,
          v.order_amount || 0,
          `"${(v.notes || '-').replace(/"/g, '""')}"`,
          v.latitude,
          v.longitude,
        ].join(';');
      }),
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Laporan_Sales_Canvasing_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle Admin Manual Submit
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.employee_id) {
      setManualError('Pilih Sales Representative terlebih dahulu.');
      return;
    }
    if (!manualForm.client_name.trim()) {
      setManualError('Nama toko / klien wajib diisi.');
      return;
    }

    try {
      setIsSubmittingManual(true);
      setManualError(null);

      const checkInISO = new Date(`${selectedDate}T${manualForm.check_in_time}:00`).toISOString();
      let checkOutISO: string | undefined = undefined;
      if (manualForm.is_completed && manualForm.check_out_time) {
        checkOutISO = new Date(`${selectedDate}T${manualForm.check_out_time}:00`).toISOString();
      }

      const formData = new FormData();
      formData.append('employee_id', manualForm.employee_id);
      formData.append('client_name', manualForm.client_name.trim());
      if (manualForm.client_address.trim()) {
        formData.append('client_address', manualForm.client_address.trim());
      }
      if (manualForm.contact_person.trim()) {
        formData.append('contact_person', manualForm.contact_person.trim());
      }
      if (manualForm.contact_phone.trim()) {
        formData.append('contact_phone', manualForm.contact_phone.trim());
      }
      formData.append('visit_purpose', manualForm.visit_purpose);
      formData.append('check_in_time', checkInISO);
      if (checkOutISO) {
        formData.append('check_out_time', checkOutISO);
      }
      formData.append('status', manualForm.is_completed ? 'COMPLETED' : 'IN_PROGRESS');
      if (manualForm.order_amount) {
        formData.append('order_amount', manualForm.order_amount);
      }
      if (manualForm.notes.trim()) {
        formData.append('notes', manualForm.notes.trim());
      }
      formData.append('latitude', manualForm.latitude || '-7.5612');
      formData.append('longitude', manualForm.longitude || '110.8245');

      if (manualPhotoFile) {
        formData.append('photo', manualPhotoFile);
      }

      await ApiClient.adminCreateVisit(formData);

      setIsManualModalOpen(false);
      setManualPhotoFile(null);
      setManualPhotoPreview(null);
      setManualForm({
        employee_id: '',
        client_name: '',
        client_address: '',
        contact_person: '',
        contact_phone: '',
        visit_purpose: VISIT_PURPOSES[0],
        check_in_time: '09:00',
        check_out_time: '10:00',
        is_completed: true,
        order_amount: '',
        notes: '',
        latitude: '-7.5612',
        longitude: '110.8245',
      });

      await fetchOverview(true);
    } catch (err: any) {
      setManualError(err.message || 'Gagal menyimpan kunjungan manual');
    } finally {
      setIsSubmittingManual(false);
    }
  };

  return (
    <div className="space-y-3 font-sans text-[#161B26]">
      {/* 1. Header (Clean, Unboxed, 1 Row, Identical to Menu 1) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-black text-[#161B26] tracking-tight">
              Sales Canvasing & Kunjungan Klien
            </h2>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono text-emerald-700 font-extrabold uppercase">
              Live Field Tracking
            </span>
          </div>
          <p className="text-xs text-[#78716C] font-medium mt-0.5">
            Monitoring pergerakan tim sales lapangan, verifikasi selfie GPS, rute toko, dan closing order harian.
          </p>
        </div>

        {/* Action Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Compact Date Switcher */}
          <div className="flex items-center bg-white border border-[#E6DFD3] rounded-xl px-2 py-1 shadow-2xs">
            <button
              type="button"
              onClick={() => changeDateByDays(-1)}
              className="p-1 rounded text-[#78716C] hover:text-[#161B26] hover:bg-[#FAF8F5] transition-colors"
              title="Hari Sebelumnya"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={setDateToday}
              className="px-2 py-0.5 text-[11px] font-bold text-[#78716C] hover:text-[#161B26]"
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => changeDateByDays(1)}
              className="p-1 rounded text-[#78716C] hover:text-[#161B26] hover:bg-[#FAF8F5] transition-colors"
              title="Hari Berikutnya"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <span className="w-px h-3.5 bg-[#E6DFD3] mx-1" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs text-[#161B26] font-bold focus:outline-none cursor-pointer pr-1"
            />
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchOverview(false)}
            disabled={isLoading}
            className="p-2 rounded-xl bg-white hover:bg-[#F5EFE6] text-[#57534E] hover:text-[#161B26] border border-[#E6DFD3] shadow-2xs transition-colors cursor-pointer"
            title="Refresh Data Kunjungan"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-600' : ''}`} />
          </button>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredVisits.length === 0}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#FAF8F5] disabled:opacity-40 border border-[#E6DFD3] text-xs font-bold text-[#161B26] flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            title="Export Laporan Canvasing ke CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          {/* Admin Manual Log Button */}
          <button
            type="button"
            onClick={() => setIsManualModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#161B26] hover:bg-[#222938] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95 border border-[#161B26]"
          >
            <Plus className="w-3.5 h-3.5 text-[#D97706] stroke-[2.5]" />
            <span>+ Catat Kunjungan Manual</span>
          </button>
        </div>
      </div>

      {/* 2. Live Activity Ticker (Smart Alert) */}
      {activeNowVisits.length > 0 ? (
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl px-3.5 py-2 flex items-center justify-between text-xs text-amber-900 shadow-2xs">
          <div className="flex items-center space-x-2 truncate">
            <Radio className="w-3.5 h-3.5 text-amber-600 animate-pulse flex-shrink-0" />
            <span className="font-bold text-[11px] uppercase tracking-wider text-amber-800">
              Live Field Activity:
            </span>
            <span className="text-xs truncate">
              {activeNowVisits
                .map((v) => `${v.employee?.full_name || 'Sales'} di ${v.client_name}`)
                .join(' • ')}
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold bg-amber-100 border border-amber-300 text-amber-800 px-2 py-0.5 rounded-full flex-shrink-0 ml-2">
            {activeNowVisits.length} Sales Aktif
          </span>
        </div>
      ) : (
        <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-2xl px-3.5 py-1.5 flex items-center space-x-2 text-xs text-emerald-900">
          <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
          <span className="text-[11px] font-medium text-emerald-800">
            Semua tim sales telah menyelesaikan rute kunjungan hari ini ({overview?.visits.length || 0} toko selesai).
          </span>
        </div>
      )}

      {/* 3. Quick Rep Avatar Filter Chips */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none pt-0.5">
        <span className="text-[10px] font-mono uppercase text-[#78716C] font-extrabold flex-shrink-0 mr-1">
          Filter Sales:
        </span>

        {/* All Chips */}
        <button
          type="button"
          onClick={() => setSelectedRepId('ALL')}
          className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex-shrink-0 ${
            selectedRepId === 'ALL'
              ? 'bg-[#161B26] text-white shadow-xs'
              : 'bg-white hover:bg-[#FAF8F5] text-[#57534E] border border-[#E6DFD3]'
          }`}
        >
          <span>Semua ({overview?.visits.length || 0})</span>
        </button>

        {/* Rep Profile Chips */}
        {repsWithVisits.map((rep) => (
          <button
            key={rep.id}
            type="button"
            onClick={() => setSelectedRepId(rep.id)}
            className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex-shrink-0 ${
              selectedRepId === rep.id
                ? 'bg-[#161B26] text-white shadow-xs'
                : 'bg-white hover:bg-[#FAF8F5] text-[#57534E] border border-[#E6DFD3]'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] flex items-center justify-center font-mono">
              {rep.initials}
            </span>
            <span>{rep.name.split(' ')[0]}</span>
            <span className="text-[10px] opacity-70 font-mono">({rep.count})</span>
          </button>
        ))}
      </div>

      {/* 4. Main Data Card with 3 View Modes: Table, Live Map, and Route Itinerary */}
      <div className="bg-white border border-[#E6DFD3] rounded-3xl p-5 shadow-2xs space-y-4">
        {/* Card Header & 3-Way View Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E6DFD3]">
          <div>
            <h3 className="text-sm font-black text-[#161B26] tracking-tight">
              Daftar Kunjungan & Pipeline Sales
            </h3>
            <p className="text-xs text-[#78716C] font-medium">
              Total {filteredVisits.length} kunjungan tercatat • Koordinat GPS dan verifikasi foto selfie
            </p>
          </div>

          {/* View Mode Segmented Pill */}
          <div className="inline-flex items-center bg-[#FAF8F5] p-1 rounded-xl border border-[#E6DFD3] shadow-2xs self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-[#161B26] text-white shadow-xs'
                  : 'text-[#78716C] hover:text-[#161B26]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Tabel</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'map'
                  ? 'bg-[#161B26] text-white shadow-xs'
                  : 'text-[#78716C] hover:text-[#161B26]'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span>Peta Live</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('route')}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'route'
                  ? 'bg-[#161B26] text-white shadow-xs'
                  : 'text-[#78716C] hover:text-[#161B26]'
              }`}
            >
              <Route className="w-3.5 h-3.5 text-amber-400" />
              <span>Rute Sales</span>
            </button>
          </div>
        </div>

        {/* Filter Row: Search & Status Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          {/* Search input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari toko, PIC, alamat, atau sales..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-bold text-[#161B26] bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl focus:outline-none focus:border-amber-500 shadow-2xs"
            />
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'ALL', label: `Semua (${overview?.visits.length || 0})` },
              { id: 'COMPLETED', label: `🟢 Selesai (${overview?.metrics.completed_visits || 0})` },
              { id: 'IN_PROGRESS', label: `⏳ Sedang di Toko (${overview?.metrics.in_progress_visits || 0})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-[#161B26] text-white shadow-xs'
                    : 'bg-[#FAF8F5] hover:bg-[#F5EFE6] text-[#57534E] border border-[#E6DFD3]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading / Error / Content Switcher */}
        {isLoading ? (
          <div className="rounded-2xl border border-[#E6DFD3] p-12 text-center text-xs text-[#78716C]">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-600" />
            <span className="font-bold">Memuat data canvasing...</span>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-xs text-rose-700 font-bold">
            {error}
          </div>
        ) : filteredVisits.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E6DFD3] p-12 text-center space-y-2">
            <Store className="w-10 h-10 text-[#78716C]/40 mx-auto" />
            <h4 className="font-bold text-sm text-[#161B26]">Tidak Ada Kunjungan Ditemukan</h4>
            <p className="text-xs text-[#78716C] max-w-sm mx-auto">
              Tidak ada data kunjungan untuk tanggal <span className="font-mono font-bold text-[#161B26]">{selectedDate}</span>.
            </p>
          </div>
        ) : viewMode === 'table' ? (
          /* ======================== 1. TABEL RINGKAS (4 KOLOM) ======================== */
          <div className="overflow-x-auto rounded-2xl border border-[#E6DFD3] relative">
            <table className="w-full text-left text-xs text-[#161B26]">
              <thead className="bg-[#F5EFE6] text-[#44403C] uppercase text-[10px] tracking-wider font-extrabold border-b border-[#E6DFD3]">
                <tr>
                  <th className="py-3 px-4">Sales Representative</th>
                  <th className="py-3 px-4">Toko / Outlet</th>
                  <th className="py-3 px-4">Waktu Kunjungan</th>
                  <th className="py-3 px-4">Status & Closing</th>
                  <th className="py-3 px-3 text-right">Rincian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6DFD3]">
                {filteredVisits.map((visit) => {
                  const isDone = visit.status === 'COMPLETED';
                  const checkInFormatted = new Date(visit.check_in_time).toLocaleTimeString(
                    'id-ID',
                    {
                      hour: '2-digit',
                      minute: '2-digit',
                    }
                  );
                  const checkOutFormatted = visit.check_out_time
                    ? new Date(visit.check_out_time).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—';

                  const initials = (visit.employee?.full_name || 'SR')
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <tr
                      key={visit.id}
                      onClick={() => setSelectedVisit(visit)}
                      className="hover:bg-[#FAF8F5] transition-colors cursor-pointer group"
                      title="Klik untuk membuka detail lengkap kunjungan"
                    >
                      {/* 1. Sales Representative */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#161B26] text-white flex items-center justify-center font-mono text-[11px] font-bold flex-shrink-0 group-hover:scale-105 transition-transform">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-[#161B26] text-xs leading-tight">
                              {visit.employee?.full_name || 'Sales Staff'}
                            </div>
                            <div className="text-[10px] text-[#78716C] font-mono">
                              {visit.employee?.employee_id_number
                                ? `NIK ${visit.employee.employee_id_number} • `
                                : ''}
                              {visit.employee?.department || 'Sales'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Toko / Outlet */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="font-bold text-[#161B26] text-xs">
                          {visit.client_name}
                        </div>
                        <div className="text-[10px] text-[#78716C] flex items-center space-x-1.5 mt-0.5">
                          <span className="font-medium text-[#57534E]">{visit.visit_purpose}</span>
                          {visit.contact_person && (
                            <>
                              <span>•</span>
                              <span>PIC: {visit.contact_person}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* 3. Waktu Kunjungan */}
                      <td className="py-3.5 px-4 align-middle font-mono text-[11px]">
                        <div className="font-bold text-[#161B26]">
                          {checkInFormatted} – {checkOutFormatted}
                        </div>
                        <div className="text-[10px] text-[#78716C] font-sans">
                          {visit.duration_minutes ? `${visit.duration_minutes} Menit` : 'Sedang berlangsung'}
                        </div>
                      </td>

                      {/* 4. Status & Closing */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded border inline-block ${
                              isDone
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {isDone ? '✓ Selesai' : '⏳ Di Toko'}
                          </span>
                          {visit.order_amount && visit.order_amount > 0 ? (
                            <span className="font-mono font-bold text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                              <ShoppingBag className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                              <span>{formatRupiah(visit.order_amount)}</span>
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* 5. Inspection Arrow Indicator */}
                      <td className="py-3.5 px-3 align-middle text-right">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-[#78716C] group-hover:text-[#161B26] group-hover:bg-[#E6DFD3]/40 transition-colors">
                          <ArrowRightIcon className="w-4 h-4" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : viewMode === 'map' ? (
          /* ======================== 2. PETA INTERAKTIF LIVE (LEAFLET / OPENSTREETMAP) ======================== */
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#78716C] px-1">
              <span>Menampilkan {filteredVisits.length} titik outlet GPS di peta</span>
              <div className="flex items-center space-x-3">
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                  <span>Selesai</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block animate-pulse" />
                  <span>Sedang di Toko</span>
                </span>
              </div>
            </div>

            <div
              ref={mapContainerRef}
              className="w-full h-[450px] rounded-2xl overflow-hidden border border-[#E6DFD3] shadow-inner relative z-0"
            />
          </div>
        ) : (
          /* ======================== 3. RUTE TIMELINE SALES ======================== */
          <div className="space-y-4">
            {salesGroupedVisits.map((group) => {
              const initials = group.employee.full_name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();

              const currentActiveVisit = group.visits.find((v) => v.status === 'IN_PROGRESS');

              return (
                <div
                  key={group.employee.id}
                  className="rounded-2xl border border-[#E6DFD3] p-4 bg-[#FAF8F5] space-y-4"
                >
                  {/* Rep Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#E6DFD3]">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-[#161B26] text-white flex items-center justify-center font-mono text-xs font-bold shadow-2xs">
                        {initials}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-sm text-[#161B26]">
                            {group.employee.full_name}
                          </h4>
                          <span className="text-[10px] font-mono bg-white border border-[#E6DFD3] text-[#78716C] px-1.5 py-0.5 rounded font-bold">
                            {group.employee.department}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#78716C]">
                          {group.employee.position || 'Sales'} • {group.visits.length} Kunjungan Toko
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2.5">
                      {currentActiveVisit ? (
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold">
                          <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
                          <span>Sedang di {currentActiveVisit.client_name}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold">
                          <Check className="w-3 h-3" />
                          <span>Rute Selesai ({group.completedCount} Toko)</span>
                        </span>
                      )}

                      <div className="bg-white border border-[#E6DFD3] px-3 py-1 rounded-xl text-right">
                        <span className="text-[10px] text-[#78716C] block leading-none font-bold">
                          Total Closing
                        </span>
                        <span className="text-xs font-mono font-black text-emerald-700">
                          {formatRupiah(group.totalClosing)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Route Stops */}
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E6DFD3]">
                    {group.visits.map((visit, idx) => {
                      const isDone = visit.status === 'COMPLETED';
                      const checkInFormatted = new Date(visit.check_in_time).toLocaleTimeString(
                        'id-ID',
                        {
                          hour: '2-digit',
                          minute: '2-digit',
                        }
                      );
                      const checkOutFormatted = visit.check_out_time
                        ? new Date(visit.check_out_time).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—';

                      const nextVisit = group.visits[idx + 1];
                      const distKm = nextVisit
                        ? calculateDistanceKm(
                            visit.latitude,
                            visit.longitude,
                            nextVisit.latitude,
                            nextVisit.longitude
                          )
                        : null;

                      return (
                        <div
                          key={visit.id}
                          onClick={() => setSelectedVisit(visit)}
                          className="relative cursor-pointer group"
                        >
                          {/* Node Number */}
                          <div
                            className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold border ${
                              isDone
                                ? 'bg-emerald-600 border-white text-white'
                                : 'bg-amber-500 border-white text-white animate-pulse'
                            }`}
                          >
                            {idx + 1}
                          </div>

                          <div className="bg-white border border-[#E6DFD3] rounded-xl p-3 shadow-2xs group-hover:border-amber-500 transition-colors space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2 text-xs">
                                <span className="font-mono font-bold text-[#161B26]">
                                  {checkInFormatted} - {checkOutFormatted}
                                </span>
                                {visit.duration_minutes ? (
                                  <span className="text-[10px] font-mono bg-[#FAF8F5] border border-[#E6DFD3] text-[#78716C] px-1 rounded font-bold">
                                    {visit.duration_minutes}m
                                  </span>
                                ) : null}
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-50 border border-amber-200 text-amber-800">
                                  {visit.visit_purpose}
                                </span>
                              </div>

                              {visit.order_amount && visit.order_amount > 0 ? (
                                <span className="font-mono font-black text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                                  {formatRupiah(visit.order_amount)}
                                </span>
                              ) : null}
                            </div>

                            <div className="flex items-center justify-between">
                              <h5 className="font-bold text-sm text-[#161B26]">
                                {visit.client_name}
                              </h5>
                              <span className="text-[11px] font-bold text-amber-700 group-hover:underline">
                                Lihat Rincian →
                              </span>
                            </div>
                          </div>

                          {distKm !== null && (
                            <div className="flex items-center space-x-1 text-[10px] font-mono text-[#78716C] py-0.5 pl-2">
                              <Navigation className="w-3 h-3 text-amber-600" />
                              <span>Ke stop #{idx + 2}: ~{distKm} km</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ======================== PROGRESSIVE DISCLOSURE: DETAIL INSPECTION MODAL ======================== */}
      {selectedVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white border border-[#E6DFD3] rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-8">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-[#E6DFD3]">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-700 font-extrabold">
                    Detail Kunjungan Canvasing
                  </span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                      selectedVisit.status === 'COMPLETED'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {selectedVisit.status === 'COMPLETED' ? 'Selesai' : 'Sedang di Toko'}
                  </span>
                </div>
                <h3 className="font-black text-xl text-[#161B26] mt-0.5">
                  {selectedVisit.client_name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVisit(null)}
                className="p-1.5 rounded-xl hover:bg-[#FAF8F5] text-[#78716C] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Photo & GPS Banner */}
            <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-black shadow-inner">
              <img
                src={resolveMediaUrl(selectedVisit.photo_url)}
                alt="Bukti foto kunjungan"
                className="w-full h-full object-contain"
              />
              <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg flex items-center space-x-1.5">
                <MapPin className="w-3 h-3 text-rose-400" />
                <span>GPS: {selectedVisit.latitude.toFixed(4)}, {selectedVisit.longitude.toFixed(4)}</span>
              </div>
            </div>

            {/* Key Information Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-[#FAF8F5] border border-[#E6DFD3] rounded-2xl p-4">
              <div>
                <span className="text-[#78716C] text-[10px] font-bold uppercase tracking-wider block">
                  Sales Representative
                </span>
                <span className="font-bold text-[#161B26] text-sm block mt-0.5">
                  {selectedVisit.employee?.full_name || 'Sales Staff'}
                </span>
                <span className="text-[11px] text-[#78716C] font-mono">
                  {selectedVisit.employee?.department || 'Sales & Marketing'}
                </span>
              </div>

              <div>
                <span className="text-[#78716C] text-[10px] font-bold uppercase tracking-wider block">
                  Waktu & Durasi
                </span>
                <span className="font-mono font-bold text-[#161B26] text-sm block mt-0.5">
                  {new Date(selectedVisit.check_in_time).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  –{' '}
                  {selectedVisit.check_out_time
                    ? new Date(selectedVisit.check_out_time).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Sekarang'}
                </span>
                <span className="text-[11px] text-amber-700 font-bold">
                  {selectedVisit.duration_minutes
                    ? `${selectedVisit.duration_minutes} Menit di lokasi`
                    : 'Sedang berlangsung'}
                </span>
              </div>

              <div>
                <span className="text-[#78716C] text-[10px] font-bold uppercase tracking-wider block">
                  Tujuan Kunjungan
                </span>
                <span className="font-bold text-[#161B26] block mt-0.5">
                  {selectedVisit.visit_purpose}
                </span>
              </div>

              <div>
                <span className="text-[#78716C] text-[10px] font-bold uppercase tracking-wider block">
                  Nilai Closing Deal
                </span>
                <span className="font-mono font-black text-emerald-700 text-sm block mt-0.5">
                  {formatRupiah(selectedVisit.order_amount)}
                </span>
              </div>
            </div>

            {/* Client Location & PIC */}
            <div className="bg-[#FAF8F5] border border-[#E6DFD3] rounded-2xl p-4 space-y-2 text-xs">
              <div>
                <span className="text-[#78716C] text-[10px] font-bold uppercase tracking-wider block">
                  Alamat Klien
                </span>
                <p className="text-[#161B26] font-medium mt-0.5">
                  {selectedVisit.client_address || 'Alamat tidak dicantumkan'}
                </p>
              </div>

              {selectedVisit.contact_person && (
                <div className="pt-2 border-t border-[#E6DFD3] flex items-center justify-between">
                  <div>
                    <span className="text-[#78716C] text-[10px] font-bold uppercase tracking-wider block">
                      Kontak PIC Toko
                    </span>
                    <span className="font-bold text-[#161B26]">
                      {selectedVisit.contact_person}
                    </span>
                  </div>
                  {selectedVisit.contact_phone && (
                    <a
                      href={`tel:${selectedVisit.contact_phone}`}
                      className="inline-flex items-center space-x-1 px-3 py-1 bg-white border border-[#E6DFD3] rounded-xl text-amber-700 font-bold hover:bg-amber-50"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{selectedVisit.contact_phone}</span>
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Notes */}
            {selectedVisit.notes && (
              <div className="p-3.5 bg-amber-50/50 border border-amber-200/60 rounded-2xl text-xs">
                <span className="text-[10px] font-mono text-amber-800 uppercase font-bold block mb-1">
                  Catatan Kunjungan Sales:
                </span>
                <p className="text-[#57534E] italic leading-relaxed">
                  &quot;{selectedVisit.notes}&quot;
                </p>
              </div>
            )}

            {/* Bottom Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-[#E6DFD3]">
              <div className="flex items-center space-x-2">
                <a
                  href={`https://www.google.com/maps?q=${selectedVisit.latitude},${selectedVisit.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1.5 px-3 py-2 bg-[#FAF8F5] border border-[#E6DFD3] hover:border-rose-300 text-xs font-bold text-rose-700 rounded-xl"
                >
                  <MapPin className="w-3.5 h-3.5 text-rose-600" />
                  <span>Buka di Google Maps</span>
                </a>
                <button
                  type="button"
                  onClick={() => handleDeleteVisit(selectedVisit.id, selectedVisit.client_name)}
                  className="inline-flex items-center space-x-1 px-3 py-2 bg-[#FAF8F5] border border-[#E6DFD3] hover:border-rose-300 text-xs font-bold text-[#78716C] hover:text-rose-600 rounded-xl cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedVisit(null)}
                className="px-4 py-2 bg-[#161B26] text-white rounded-xl text-xs font-bold hover:bg-slate-800 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================== MODAL: CATAT KUNJUNGAN MANUAL (ADMIN BYPASS) ======================== */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white border border-[#E6DFD3] rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6DFD3]">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-700 font-extrabold">
                  Admin Bypass Action
                </span>
                <h3 className="font-black text-lg text-[#161B26]">
                  Catat Kunjungan Sales Manual
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-[#FAF8F5] text-[#78716C] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {manualError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-bold">
                {manualError}
              </div>
            )}

            <form onSubmit={handleManualSubmit} className="space-y-3.5">
              {/* Sales Rep Select */}
              <div>
                <label className="block text-xs font-bold text-[#161B26] mb-1">
                  Sales Representative <span className="text-rose-500">*</span>
                </label>
                <select
                  value={manualForm.employee_id}
                  onChange={(e) => setManualForm({ ...manualForm, employee_id: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl px-3 py-2 text-xs font-bold text-[#161B26] focus:outline-none focus:border-amber-500"
                  required
                >
                  <option value="">-- Pilih Sales Representative --</option>
                  {employeesList.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.department})
                    </option>
                  ))}
                </select>
              </div>

              {/* Client Name */}
              <div>
                <label className="block text-xs font-bold text-[#161B26] mb-1">
                  Nama Toko / Outlet / Klien <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Butik Busana Mulia, Toko Kain Barokah..."
                  value={manualForm.client_name}
                  onChange={(e) => setManualForm({ ...manualForm, client_name: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl px-3 py-2 text-xs font-bold text-[#161B26] focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-bold text-[#161B26] mb-1">
                  Alamat Klien / Lokasi Toko
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Jl. Slamet Riyadi No. 120, Surakarta"
                  value={manualForm.client_address}
                  onChange={(e) => setManualForm({ ...manualForm, client_address: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl px-3 py-2 text-xs font-bold text-[#161B26] focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* PIC & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#161B26] mb-1">
                    Nama PIC Toko
                  </label>
                  <input
                    type="text"
                    placeholder="Ibu Rina (Owner)"
                    value={manualForm.contact_person}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, contact_person: e.target.value })
                    }
                    className="w-full bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl px-3 py-2 text-xs font-bold text-[#161B26] focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#161B26] mb-1">
                    No. Handphone PIC
                  </label>
                  <input
                    type="tel"
                    placeholder="081234567890"
                    value={manualForm.contact_phone}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, contact_phone: e.target.value })
                    }
                    className="w-full bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#161B26] focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Purpose & Times */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#161B26] mb-1">
                    Tujuan Kunjungan
                  </label>
                  <select
                    value={manualForm.visit_purpose}
                    onChange={(e) => setManualForm({ ...manualForm, visit_purpose: e.target.value })}
                    className="w-full bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl px-2.5 py-2 text-xs font-bold text-[#161B26] focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    {VISIT_PURPOSES.map((purpose) => (
                      <option key={purpose} value={purpose}>
                        {purpose}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#161B26] mb-1">
                    Jam Masuk
                  </label>
                  <input
                    type="time"
                    value={manualForm.check_in_time}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, check_in_time: e.target.value })
                    }
                    className="w-full bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-[#161B26] focus:outline-none focus:border-amber-500 cursor-pointer"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#161B26] mb-1">
                    Jam Keluar
                  </label>
                  <input
                    type="time"
                    value={manualForm.check_out_time}
                    disabled={!manualForm.is_completed}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, check_out_time: e.target.value })
                    }
                    className="w-full bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-[#161B26] focus:outline-none focus:border-amber-500 cursor-pointer disabled:opacity-40"
                  />
                </div>
              </div>

              {/* Closing Deal Amount */}
              <div>
                <label className="block text-xs font-bold text-[#161B26] mb-1">
                  Nilai Closing Deal (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-[#78716C]">
                    Rp
                  </span>
                  <input
                    type="number"
                    placeholder="0 jika tidak ada closing"
                    value={manualForm.order_amount}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, order_amount: e.target.value })
                    }
                    className="w-full bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl pl-9 pr-3 py-2 text-xs font-mono font-bold text-[#161B26] focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-[#161B26] mb-1">
                  Catatan Kunjungan
                </label>
                <textarea
                  rows={2}
                  placeholder="Hasil pertemuan, feedback owner, kesepakatan..."
                  value={manualForm.notes}
                  onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl p-2.5 text-xs font-medium text-[#161B26] focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E8DFD0]">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E8DFD0] text-xs font-bold text-[#57534E] hover:bg-[#FAF8F5] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingManual}
                  className="px-5 py-2.5 rounded-xl bg-[#161B26] hover:bg-[#222938] text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-[#D97706]" />
                  <span>{isSubmittingManual ? 'Menyimpan...' : 'Simpan Kunjungan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
