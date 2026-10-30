'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ApiClient } from '../../lib/api';
import { Office } from '../../types';
import {
  Building2,
  MapPin,
  Plus,
  Save,
  Trash2,
  ExternalLink,
  Search,
  Check,
  RefreshCw,
  AlertCircle,
  X,
  Compass,
  Users,
  Sparkles,
  Sliders,
  CheckCircle2
} from 'lucide-react';

export function OfficesGeofenceTab() {
  const [offices, setOffices] = useState<Office[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State (Unified for Create & Edit)
  const [activeModal, setActiveModal] = useState<'create' | 'edit' | null>(null);
  const [editingOfficeId, setEditingOfficeId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formLat, setFormLat] = useState<number>(-7.562381);
  const [formLng, setFormLng] = useState<number>(110.824964);
  const [formRadius, setFormRadius] = useState<number>(100);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Smart Paste state inside modal
  const [pasteInput, setPasteInput] = useState('');
  const [pasteFeedback, setPasteFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Leaflet Modal Map Refs
  const modalMapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);

  const loadOffices = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await ApiClient.getOffices();
      setOffices(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memuat kantor cabang.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOffices();
  }, []);

  const filteredOffices = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return offices;
    return offices.filter((o) => o.name.toLowerCase().includes(q));
  }, [offices, searchTerm]);

  // Smart Google Maps Parser
  const parseGoogleMapsInput = (input: string): { lat: number; lng: number } | null => {
    if (!input || typeof input !== 'string') return null;
    const trimmed = input.trim();

    // 1. Check for URL patterns: @lat,lng or q=lat,lng
    const urlMatch = trimmed.match(/[@?&]q?=?(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
    if (urlMatch) {
      const lat = parseFloat(urlMatch[1]);
      const lng = parseFloat(urlMatch[2]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }

    // 2. Check for raw lat, lng e.g. "-7.562381, 110.824964" or "-7.562381 110.824964"
    const rawMatch = trimmed.match(/(-?\d+\.\d+)[\s,]+(-?\d+\.\d+)/);
    if (rawMatch) {
      const lat = parseFloat(rawMatch[1]);
      const lng = parseFloat(rawMatch[2]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }

    return null;
  };

  const handleApplyPaste = () => {
    const parsed = parseGoogleMapsInput(pasteInput);
    if (!parsed) {
      setPasteFeedback({
        type: 'error',
        text: 'Format tidak valid. Masukkan "-7.56238, 110.82496" atau link URL Google Maps.',
      });
      setTimeout(() => setPasteFeedback(null), 4000);
      return;
    }

    setFormLat(parsed.lat);
    setFormLng(parsed.lng);
    setPasteFeedback({
      type: 'success',
      text: `✓ Koordinat berhasil disetel: ${parsed.lat}, ${parsed.lng}`,
    });
    setPasteInput('');
    setTimeout(() => setPasteFeedback(null), 3500);

    // Pan modal map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([parsed.lat, parsed.lng], 16, { duration: 1 });
      if (markerRef.current) markerRef.current.setLatLng([parsed.lat, parsed.lng]);
      if (circleRef.current) circleRef.current.setLatLng([parsed.lat, parsed.lng]);
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setActiveModal('create');
    setEditingOfficeId(null);
    setFormName('');
    setFormLat(-7.562381);
    setFormLng(110.824964);
    setFormRadius(100);
    setPasteInput('');
    setPasteFeedback(null);
  };

  // Open Edit Modal
  const handleOpenEditModal = (office: Office) => {
    setActiveModal('edit');
    setEditingOfficeId(office.id);
    setFormName(office.name);
    setFormLat(office.latitude);
    setFormLng(office.longitude);
    setFormRadius(office.radius_meters);
    setPasteInput('');
    setPasteFeedback(null);
  };

  const handleCloseModal = () => {
    setActiveModal(null);
    setEditingOfficeId(null);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
  };

  // Initialize and update Modal Leaflet Map
  useEffect(() => {
    if (!activeModal || !modalMapContainerRef.current) return;
    let isMounted = true;

    // Small delay to ensure modal DOM is mounted
    const timer = setTimeout(() => {
      import('leaflet').then((L) => {
        if (!isMounted || !modalMapContainerRef.current) return;

        // Fix Leaflet icons
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        const map = L.map(modalMapContainerRef.current, {
          center: [formLat, formLng],
          zoom: 16,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
          maxZoom: 19,
        }).addTo(map);

        // Marker
        const marker = L.marker([formLat, formLng], { draggable: true }).addTo(map);
        marker.on('dragend', (e: any) => {
          const pos = e.target.getLatLng();
          const lat = Number(pos.lat.toFixed(6));
          const lng = Number(pos.lng.toFixed(6));
          setFormLat(lat);
          setFormLng(lng);
          if (circleRef.current) circleRef.current.setLatLng([lat, lng]);
        });

        // Geofence Circle
        const circle = L.circle([formLat, formLng], {
          radius: formRadius,
          color: '#D97706',
          weight: 2,
          fillColor: '#F59E0B',
          fillOpacity: 0.2,
        }).addTo(map);

        // Click anywhere on map to reposition pin
        map.on('click', (e: any) => {
          const lat = Number(e.latlng.lat.toFixed(6));
          const lng = Number(e.latlng.lng.toFixed(6));
          setFormLat(lat);
          setFormLng(lng);
          marker.setLatLng([lat, lng]);
          circle.setLatLng([lat, lng]);
        });

        markerRef.current = marker;
        circleRef.current = circle;
        mapInstanceRef.current = map;

        setTimeout(() => {
          map.invalidateSize();
        }, 200);
      });
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [activeModal]);

  // Update circle radius live on slider/preset change
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(formRadius);
    }
  }, [formRadius]);

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || isNaN(formLat) || isNaN(formLng)) {
      alert('Nama kantor dan koordinat latitude/longitude wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (activeModal === 'create') {
        await ApiClient.createOffice({
          name: formName.trim(),
          latitude: Number(formLat),
          longitude: Number(formLng),
          radius_meters: Number(formRadius) || 100,
        });
      } else if (activeModal === 'edit' && editingOfficeId) {
        await ApiClient.updateOffice(editingOfficeId, {
          name: formName.trim(),
          latitude: Number(formLat),
          longitude: Number(formLng),
          radius_meters: Number(formRadius) || 100,
        });
      }

      handleCloseModal();
      await loadOffices();
    } catch (err: any) {
      setErrorMsg(`Gagal menyimpan kantor cabang: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOffice = async (id: string, name: string) => {
    if (!window.confirm(`Hapus kantor cabang "${name}"? Karyawan yang terhubung akan dialihkan ke mode bebas kantor.`)) {
      return;
    }
    setErrorMsg(null);
    try {
      await ApiClient.deleteOffice(id);
      await loadOffices();
    } catch (err: any) {
      setErrorMsg(`Gagal menghapus kantor: ${err.message}`);
    }
  };

  const radiusPresets = [50, 100, 250, 500];

  return (
    <div className="space-y-4 font-sans">
      {/* 1. Clean Top Header & Actions Bar (No Giant Cards!) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E6DFD3]">
        <div>
          <h2 className="text-base font-extrabold text-[#161B26] tracking-tight flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-amber-700" />
            <span>Kantor Cabang & Radius Geofence</span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Daftar lokasi kantor operasional dan batas perimeter validasi absensi GPS karyawan
          </p>
        </div>

        {/* Search & Add CTA Toolbar */}
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <div className="relative w-48 sm:w-60">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari kantor cabang..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#E6DFD3] bg-white text-xs font-medium text-[#161B26] placeholder-stone-400 focus:outline-hidden focus:border-stone-800 shadow-2xs"
            />
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="px-3.5 py-1.5 rounded-xl bg-[#161B26] hover:bg-[#232B3E] active:scale-95 text-white text-xs font-bold flex items-center space-x-1.5 transition-all shadow-2xs shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Tambah Kantor</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2. Clean, Spacious Table (Option 2 Focus) */}
      <div className="bg-white border border-[#E6DFD3] rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-[#FAF8F5] text-stone-600 uppercase text-[10px] tracking-wider font-extrabold border-b border-[#E6DFD3]">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Nama Kantor Cabang</th>
                <th className="py-3 px-4">Radius Geofence</th>
                <th className="py-3 px-4">Karyawan Terdaftar</th>
                <th className="py-3 px-4">Titik Koordinat GPS</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-stone-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />
                    <span>Memuat data kantor cabang...</span>
                  </td>
                </tr>
              ) : filteredOffices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-stone-400">
                    Tidak ada kantor cabang yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredOffices.map((office, idx) => (
                  <tr key={office.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                    <td className="py-3 px-4 text-center font-mono text-stone-400 text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-lg bg-stone-100 text-stone-800 flex items-center justify-center font-bold shrink-0">
                          <Building2 className="w-3.5 h-3.5 text-amber-700" />
                        </div>
                        <div>
                          <span className="font-extrabold text-[#161B26] block text-xs">
                            {office.name}
                          </span>
                          <span className="text-[10px] text-stone-400 font-mono">
                            ID: {office.id.slice(-6)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-900 border border-amber-200">
                        {office.radius_meters} Meter
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-700">
                        <Users className="w-3 h-3 text-stone-400" />
                        <span>{office._count?.employees || 0} Orang</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-stone-600">
                      <div className="flex items-center space-x-2">
                        <span>{office.latitude.toFixed(6)}, {office.longitude.toFixed(6)}</span>
                        <a
                          href={`https://www.google.com/maps?q=${office.latitude},${office.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Buka di Google Maps"
                          className="p-1 rounded-md text-stone-400 hover:text-amber-700 hover:bg-stone-100 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => handleOpenEditModal(office)}
                          className="px-3 py-1.5 rounded-xl bg-[#161B26] hover:bg-[#232B3E] text-white text-xs font-bold transition-all shadow-2xs flex items-center space-x-1 cursor-pointer"
                        >
                          <Compass className="w-3 h-3 text-amber-400" />
                          <span>Atur Geofence</span>
                        </button>
                        <button
                          onClick={() => handleDeleteOffice(office.id, office.name)}
                          className="p-1.5 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Hapus Kantor"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Interactive Leaflet Map & Smart Paste Modal (Appears ONLY on Create / Edit) */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#161B26]/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-[#E6DFD3] shadow-2xl overflow-hidden p-6 space-y-4 font-sans max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-center font-extrabold text-sm shadow-2xs">
                  <Compass className="w-5 h-5 text-amber-800" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-[#161B26]">
                    {activeModal === 'create' ? 'Tambah Kantor Cabang Baru' : `Atur Geofence: ${formName}`}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Setel koordinat GPS dan perimeter lingkaran radius kehadiran
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Smart Google Maps Paste Bar */}
            <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E6DFD3] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-[#161B26] flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  <span>Salin-Tempel dari Google Maps (Untuk Desktop PC)</span>
                </span>
                <span className="text-[10px] text-stone-400">URL atau koordinat klik-kanan</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Paste koordinat (-7.56238, 110.82496) atau URL link Google Maps..."
                  value={pasteInput}
                  onChange={(e) => setPasteInput(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-[#E6DFD3] bg-white text-xs text-[#161B26] placeholder-stone-400 font-mono shadow-2xs"
                />
                <button
                  type="button"
                  onClick={handleApplyPaste}
                  className="px-4 py-1.5 bg-[#161B26] hover:bg-[#232B3E] text-white rounded-xl text-xs font-bold shrink-0 shadow-2xs transition-all cursor-pointer"
                >
                  Ekstrak
                </button>
              </div>
              {pasteFeedback && (
                <p
                  className={`text-[11px] font-bold flex items-center space-x-1 ${
                    pasteFeedback.type === 'success' ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {pasteFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  )}
                  <span>{pasteFeedback.text}</span>
                </p>
              )}
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">
                  Nama Kantor Cabang *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kantor Pusat Solo / Hub Semarang"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E6DFD3] text-xs font-bold text-[#161B26]"
                />
              </div>

              {/* Interactive Modal Leaflet Map */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-stone-700">Preview Peta & Radius Perimeter Geofence:</span>
                  <span className="text-[10px] text-stone-400">Klik di peta atau geser pin untuk atur titik</span>
                </div>
                <div
                  ref={modalMapContainerRef}
                  className="w-full h-56 rounded-2xl border border-[#E6DFD3] overflow-hidden shadow-inner z-10"
                />
              </div>

              {/* Lat, Lng and Radius */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={formLat}
                    onChange={(e) => setFormLat(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-xl border border-[#E6DFD3] bg-[#FAF8F5] text-xs font-mono text-[#161B26]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={formLng}
                    onChange={(e) => setFormLng(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-xl border border-[#E6DFD3] bg-[#FAF8F5] text-xs font-mono text-[#161B26]"
                  />
                </div>
              </div>

              {/* Radius Geofence with Presets & Slider */}
              <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#E6DFD3] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-stone-700">
                    Radius Validasi Geofence:
                  </span>
                  <span className="text-xs font-extrabold font-mono text-amber-800">
                    {formRadius} Meter
                  </span>
                </div>

                <div className="flex items-center space-x-1.5">
                  {radiusPresets.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setFormRadius(r)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        formRadius === r
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'bg-white border border-[#E6DFD3] text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      {r}m
                    </button>
                  ))}
                </div>

                <input
                  type="range"
                  min="20"
                  max="1000"
                  step="10"
                  value={formRadius}
                  onChange={(e) => setFormRadius(parseInt(e.target.value, 10) || 100)}
                  className="w-full accent-amber-600 cursor-pointer mt-1"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#161B26] hover:bg-[#232B3E] active:scale-95 text-white flex items-center space-x-1.5 disabled:opacity-50 shadow-2xs cursor-pointer transition-all"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span>{activeModal === 'create' ? 'Buat Kantor Cabang' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
