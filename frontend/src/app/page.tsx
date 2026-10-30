'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClient } from '../lib/api';
import { Employee, AttendanceRecord, Office } from '../types';
import { useGeolocation } from '../hooks/useGeolocation';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { OfflineQueue } from '../lib/offlineQueue';
import { SecurityGuard } from '../lib/security';
import { Header } from '../components/Header';
import { SpaciousAttendanceHero } from '../components/SpaciousAttendanceHero';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { OfflineSyncBanner } from '../components/OfflineSyncBanner';
import { FullscreenCameraModal } from '../components/FullscreenCameraModal';
import { useHardwareBackButton } from '../hooks/useHardwareBackButton';
import { HistoryDrawer } from '../components/HistoryDrawer';
import { AttendanceCalendarView } from '../components/AttendanceCalendarView';
import { LeaveTab } from '../components/LeaveTab';
import { CanvasingTab } from '../components/CanvasingTab';
import { SelfieModal } from '../components/SelfieModal';
import { LoginModal } from '../components/LoginModal';
import { SettingsModal } from '../components/SettingsModal';
import { NotificationModal } from '../components/NotificationModal';
import { DigitalIdCardModal } from '../components/common/DigitalIdCardModal';
import { PayslipTab } from '../components/PayslipTab';
import { Loader2, Clock, FileText, CalendarDays, CreditCard, BellRing, MessageCircle, MapPin } from 'lucide-react';

export default function AttendancePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'attendance' | 'leaves' | 'history' | 'canvasing' | 'payslip'>('attendance');
  const [user, setUser] = useState<Employee | null>(null);
  const [offices, setOffices] = useState<Office[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [currentMonth, setCurrentMonth] = useState<string>('2026-10');
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Dedicated Full-Screen Camera Capture State
  const [captureMode, setCaptureMode] = useState<'clock-in' | 'clock-out' | null>(null);

  // Modals state
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; title: string } | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState<boolean>(false);
  const [isIdCardOpen, setIsIdCardOpen] = useState<boolean>(false);

  // Android Hierarchical Hardware Back Button & Double-Tap Exit Handler
  const { exitToast } = useHardwareBackButton({
    captureMode,
    onCloseCapture: () => setCaptureMode(null),
    isIdCardOpen,
    onCloseIdCard: () => setIsIdCardOpen(false),
    selectedPhoto,
    onClosePhoto: () => setSelectedPhoto(null),
    isNotificationModalOpen,
    onCloseNotifications: () => setIsNotificationModalOpen(false),
    isSettingsModalOpen,
    onCloseSettings: () => setIsSettingsModalOpen(false),
    isLoginModalOpen,
    onCloseLogin: () => setIsLoginModalOpen(false),
    activeTab,
    onSelectTab: setActiveTab,
  });

  // Geolocation Hook with Multi-Branch Support
  const geo = useGeolocation(user?.office, offices);

  // Load User Session & Dashboard
  const loadDashboardData = useCallback(async () => {
    const token = ApiClient.getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const profile = await ApiClient.getMe();
      setUser(profile);

      const [today, historyList, officeList] = await Promise.all([
        ApiClient.getTodayAttendance().catch(() => null),
        ApiClient.getMyHistory(30).catch(() => []),
        ApiClient.getOffices().catch(() => []),
      ]);

      setTodayAttendance(today);
      setHistory(historyList);
      setOffices(officeList);
    } catch {
      // Invalid/expired token -> clear and redirect to login
      ApiClient.clearToken();
      router.push('/login');
    } finally {
      setIsLoadingUser(false);
    }
  }, [router]);

  // Offline Sync Engine Hook
  const offlineSync = useOfflineSync(loadDashboardData);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleLogin = async (email: string, pass: string) => {
    const data = await ApiClient.login(email, pass);
    setUser(data.user);
    setActionMessage(null);

    const [today, historyList] = await Promise.all([
      ApiClient.getTodayAttendance().catch(() => null),
      ApiClient.getMyHistory(30).catch(() => []),
    ]);
    setTodayAttendance(today);
    setHistory(historyList);
  };

  const handleLogout = () => {
    ApiClient.clearToken();
    setUser(null);
    setTodayAttendance(null);
    setHistory([]);
    router.push('/login');
  };

  const handleOpenCapture = (mode: 'clock-in' | 'clock-out') => {
    const effectiveCoords =
      geo.coords ||
      (geo.activeOffice
        ? { latitude: geo.activeOffice.latitude, longitude: geo.activeOffice.longitude }
        : null);

    if (!effectiveCoords && !user?.is_wfh_allowed) {
      setActionMessage({
        type: 'error',
        text: 'Lokasi GPS belum siap. Harap izinkan akses lokasi perangkat atau ketuk Refresh GPS.',
      });
      return;
    }
    setActionMessage(null);
    setCaptureMode(mode);
  };

  const handleSubmitCapture = async (photoBlob: Blob, photoDataUrl: string) => {
    if (!captureMode || !user) return;

    if (geo.isMockLocation) {
      throw new Error('Presensi ditolak: Terdeteksi Fake GPS / Mock Location pada perangkat Anda!');
    }

    // Use current GPS or fallback to office coordinates if GPS is still resolving
    const targetCoords = geo.coords || (geo.activeOffice ? { latitude: geo.activeOffice.latitude, longitude: geo.activeOffice.longitude } : null);

    if (!targetCoords) {
      throw new Error('Titik koordinat GPS belum terdeteksi. Harap periksa izin lokasi.');
    }

    setIsSubmitting(true);
    setActionMessage(null);

    const capturedAt = new Date().toISOString();
    const todayStr = capturedAt.slice(0, 10);
    const idempotencyKey = `${user.id}_${todayStr}_${captureMode}`;

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    // 1. Direct offline branch if disconnected
    if (!isOnline) {
      OfflineQueue.enqueue({
        idempotencyKey,
        employeeId: user.id,
        type: captureMode,
        latitude: targetCoords.latitude,
        longitude: targetCoords.longitude,
        photoDataUrl,
        capturedAt,
      });

      setActionMessage({
        type: 'success',
        text: 'Presensi aman tersimpan di HP (Offline). Aplikasi akan otomatis menyinkronkan saat sinyal internet terhubung.',
      });
      setCaptureMode(null);
      setIsSubmitting(false);
      offlineSync.refreshCount();
      return;
    }

    // 2. Online submission with automatic offline failover
    try {
      if (captureMode === 'clock-in') {
        const result = await ApiClient.clockIn(
          targetCoords.latitude,
          targetCoords.longitude,
          photoBlob,
          { idempotencyKey, clientTimestamp: capturedAt }
        );

        setActionMessage({
          type: 'success',
          text: `Presensi masuk tercatat: ${result.status} ${
            result.late_minutes > 0 ? `(Terlambat ${result.late_minutes} menit)` : 'Tepat Waktu'
          }`,
        });

        SecurityGuard.notify(
          'Presensi Masuk Berhasil',
          `Presensi masuk tercatat pukul ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB (${
            result.late_minutes > 0 ? `Terlambat ${result.late_minutes}m` : 'Tepat Waktu'
          }).`
        );
      } else {
        await ApiClient.clockOut(
          targetCoords.latitude,
          targetCoords.longitude,
          photoBlob,
          { idempotencyKey, clientTimestamp: capturedAt }
        );

        setActionMessage({
          type: 'success',
          text: 'Presensi pulang berhasil tercatat. Terima kasih atas kerja keras Anda hari ini!',
        });

        SecurityGuard.notify(
          'Presensi Pulang Berhasil',
          `Presensi pulang tercatat pukul ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB. Selamat beristirahat!`
        );
      }

      setCaptureMode(null);
      await loadDashboardData();
    } catch (err: any) {
      const isNetworkDrop =
        !navigator.onLine ||
        err.message?.includes('TIMEOUT_WEAK_SIGNAL') ||
        err.message?.toLowerCase().includes('timeout') ||
        err.message?.toLowerCase().includes('abort') ||
        err.message?.toLowerCase().includes('fetch') ||
        err.message?.toLowerCase().includes('network') ||
        err.message?.toLowerCase().includes('failed to fetch');

      if (isNetworkDrop) {
        OfflineQueue.enqueue({
          idempotencyKey,
          employeeId: user.id,
          type: captureMode,
          latitude: targetCoords.latitude,
          longitude: targetCoords.longitude,
          photoDataUrl,
          capturedAt,
        });

        setActionMessage({
          type: 'success',
          text: 'Sinyal lemah saat mengirim, namun presensi telah aman tersimpan di HP! Akan otomatis disinkronkan ke server begitu sinyal stabil.',
        });
        setCaptureMode(null);
        offlineSync.refreshCount();
      } else {
        setActionMessage({
          type: 'error',
          text: err.message || 'Presensi gagal diproses. Silakan coba kembali.',
        });
        // Re-throw so FullscreenCameraModal can display the error banner inside modal
        throw err;
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-6 h-6 text-[#1E2538] animate-spin" />
        <p className="text-xs text-[#5C6479] font-medium">Memuat sesi karyawan...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col font-sans text-[#1E2538]">
      {/* App Header */}
      <Header
        user={user}
        onSwitchUserClick={() => setIsLoginModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenNotifications={() => setIsNotificationModalOpen(true)}
        hasUnreadNotifications={!todayAttendance?.clock_in_time}
        onLogout={handleLogout}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 space-y-4 pb-28">
        {/* Offline Queue Sync Banner */}
        <OfflineSyncBanner
          pendingCount={offlineSync.pendingCount}
          isSyncing={offlineSync.isSyncing}
          statusText={offlineSync.syncStatusText}
          onSync={offlineSync.triggerSync}
        />

        {/* TAB 1: PRESENSI / CLOCK IN */}
        {activeTab === 'attendance' && (
          <SpaciousAttendanceHero
            user={user}
            shift={user?.shift}
            office={user?.office}
            activeOffice={geo.activeOffice}
            todayAttendance={todayAttendance}
            isWithinPerimeter={geo.isWithinPerimeter}
            isWfhAllowed={user?.is_wfh_allowed || false}
            distanceMeters={geo.distanceMeters}
            coords={geo.coords}
            geoLoading={geo.isLoading}
            geoError={geo.error}
            isSimulated={geo.isSimulated}
            isMockLocation={geo.isMockLocation}
            actionMessage={actionMessage}
            onRefreshGeo={geo.refresh}
            onSimulateOffice={() => {
              if (user?.office) {
                geo.setSimulatedLocation(user.office.latitude, user.office.longitude);
              }
            }}
            onSimulateFar={() => {
              geo.setSimulatedLocation(-6.25, 106.85);
            }}
            onOpenCapture={handleOpenCapture}
            onSelectTab={setActiveTab}
          />
        )}

        {/* TAB 2: IZIN & CUTI (WORK PERMITS) */}
        {activeTab === 'leaves' && <LeaveTab employeeId={user?.id} />}

        {/* TAB 3: SALES CANVASING & CLIENT VISITS */}
        {activeTab === 'canvasing' && (
          <CanvasingTab
            employeeId={user?.id}
            onSelectPhoto={(url, title) => setSelectedPhoto({ url, title })}
            onSelectTab={setActiveTab}
          />
        )}

        {/* TAB 4: RIWAYAT ABSENSI & KALENDER ESS */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            <AttendanceCalendarView
              history={history}
              currentMonth={currentMonth}
              user={user}
              onMonthChange={async (m) => {
                setCurrentMonth(m);
                try {
                  const res = await ApiClient.getMyHistory(60, m);
                  setHistory(res);
                } catch (err) {
                  console.error(err);
                }
              }}
              onSelectPhoto={(url, title) => setSelectedPhoto({ url, title })}
              onNavigateToLeaves={() => setActiveTab('leaves')}
            />
          </div>
        )}

        {/* TAB 5: SLIP GAJI SAYA (ESS PAYSLIP VAULT) */}
        {activeTab === 'payslip' && <PayslipTab user={user} />}
      </main>

      {/* Mobile Bottom Navigation Dock */}
      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenIdCard={() => setIsIdCardOpen(true)}
        historyCount={history.length}
        hasActiveSession={Boolean(todayAttendance && !todayAttendance.clock_out_time)}
      />

      {/* Dedicated Full-Screen Live Camera View */}
      <FullscreenCameraModal
        isOpen={Boolean(captureMode)}
        mode={captureMode || 'clock-in'}
        officeName={geo.activeOffice?.name || user?.office?.name}
        isWithinPerimeter={geo.isWithinPerimeter}
        isWfhAllowed={user?.is_wfh_allowed || false}
        coords={geo.coords}
        onClose={() => setCaptureMode(null)}
        onSubmit={handleSubmitCapture}
        isSubmitting={isSubmitting}
      />

      {/* Photo Inspector Modal */}
      <SelfieModal
        photoUrl={selectedPhoto?.url || null}
        title={selectedPhoto?.title || 'Verified Photo'}
        onClose={() => setSelectedPhoto(null)}
      />

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLogin={handleLogin}
      />

      {/* Settings Modal (API Host / Emulator / LAN) */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSaved={loadDashboardData}
      />

      {/* Notifications & Shift Reminder Modal */}
      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        user={user}
        todayAttendance={todayAttendance}
      />

      {/* Digital ID Card Modal */}
      <DigitalIdCardModal
        isOpen={isIdCardOpen}
        onClose={() => setIsIdCardOpen(false)}
        employee={user}
      />

      {/* Android Hardware Back Safety Exit Toast */}
      {exitToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 backdrop-blur-md text-white text-xs px-4 py-2.5 rounded-full shadow-xl pointer-events-none transition-all flex items-center space-x-2 border border-white/10 animate-in fade-in slide-in-from-bottom-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-medium tracking-wide">{exitToast}</span>
        </div>
      )}
    </div>
  );
}
