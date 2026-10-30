'use client';

import React, { useState, useEffect } from 'react';
import { Employee, Shift, AttendanceRecord, LeaveRequest } from '../types';
import { ApiClient } from '../lib/api';
import {
  Bell,
  X,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Calendar,
  Sparkles,
  ShieldCheck,
  Smartphone,
  ExternalLink,
} from 'lucide-react';

export interface AppNotification {
  id: string;
  type: 'SHIFT_REMINDER' | 'LEAVE_UPDATE' | 'COMPLIANCE' | 'SYSTEM';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  priority?: 'high' | 'normal';
}

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: Employee | null;
  todayAttendance: AttendanceRecord | null;
}

export function NotificationModal({
  isOpen,
  onClose,
  user,
  todayAttendance,
}: NotificationModalProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [testNotificationSent, setTestNotificationSent] = useState(false);

  // Check browser Notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setHasPermission(Notification.permission === 'granted');
    }
  }, []);

  // Generate contextual & backend persisted notifications
  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    const loadNotifications = async () => {
      const list: AppNotification[] = [];

      // A. Load Real Persisted Notifications from Backend
      try {
        const backendData = await ApiClient.getMyNotifications();
        if (backendData?.notifications && isMounted) {
          backendData.notifications.forEach((n: any) => {
            list.push({
              id: n.id,
              type: n.type as any,
              title: n.title,
              message: n.message,
              timestamp: new Date(n.created_at).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                day: 'numeric',
                month: 'short',
              }) + ' WIB',
              isRead: n.is_read,
              priority: n.type.includes('ALERT') ? 'high' : 'normal',
            });
          });
        }
      } catch (err) {
        console.warn('Could not load backend notifications:', err);
      }

      // B. Contextual Shift & Clock In Reminders
    if (user.shift) {
      if (!todayAttendance?.clock_in_time) {
        list.push({
          id: 'shift-reminder-in',
          type: 'SHIFT_REMINDER',
          title: `Pengingat Jam Masuk (${user.shift.start_time} WIB)`,
          message: `Jadwal shift Anda "${user.shift.name}" dimulai pukul ${user.shift.start_time}. Pastikan Anda berada dalam radius kantor untuk presensi tepat waktu.`,
          timestamp: 'Hari ini • ' + user.shift.start_time,
          isRead: false,
          priority: 'high',
        });
      } else {
        list.push({
          id: 'shift-completed-in',
          type: 'COMPLIANCE',
          title: 'Presensi Masuk Berhasil',
          message: `Anda telah melakukan clock-in pada pukul ${new Date(
            todayAttendance.clock_in_time
          ).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB dengan status "${
            todayAttendance.status === 'ON_TIME'
              ? 'Tepat Waktu'
              : todayAttendance.status === 'LATE'
              ? `Terlambat (+${todayAttendance.late_minutes}m)`
              : todayAttendance.status
          }".`,
          timestamp: 'Hari ini',
          isRead: true,
        });

        // If clock out is missing, remind about clock out
        if (!todayAttendance.clock_out_time) {
          list.push({
            id: 'shift-reminder-out',
            type: 'SHIFT_REMINDER',
            title: `Pengingat Jam Pulang (${user.shift.end_time} WIB)`,
            message: `Shift Anda berakhir pada pukul ${user.shift.end_time}. Jangan lupa lakukan absensi pulang sebelum meninggalkan kantor.`,
            timestamp: 'Hari ini • ' + user.shift.end_time,
            isRead: false,
          });
        }
      }
    }

    // 2. Leave Quota Notification
    const remainingQuota = user.annual_leave_quota - user.annual_leave_used;
    list.push({
      id: 'leave-quota-info',
      type: 'LEAVE_UPDATE',
      title: 'Saldo Cuti Tahunan',
      message: `Anda memiliki sisa ${remainingQuota} hari cuti tahunan dari total alokasi ${user.annual_leave_quota} hari.`,
      timestamp: 'Bulan ini',
      isRead: false,
    });

    // 3. System Announcement
    list.push({
      id: 'system-welcome',
      type: 'SYSTEM',
      title: 'WorkPulse HRIS v2.4 Active',
      message: 'Sistem presensi dilengkapi verifikasi kamera full-screen, perlindungan geofence multi-cabang, dan sinkronisasi offline zero-data-loss.',
      timestamp: 'Sistem Aktif',
      isRead: true,
    });

      if (isMounted) {
        setNotifications(list);
      }
    };

    loadNotifications();

    return () => {
      isMounted = false;
    };
  }, [user, todayAttendance, isOpen]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await ApiClient.markAllNotificationsAsRead();
    } catch (e) {}
  };

  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setHasPermission(perm === 'granted');
        if (perm === 'granted') {
          new Notification('WorkPulse HRIS Notifikasi Aktif', {
            body: 'Pengingat shift kerja dan update perizinan akan muncul di perangkat Anda.',
            icon: '/favicon.ico',
          });
          setTestNotificationSent(true);
        }
      } catch (err) {
        console.error('Permission error:', err);
      }
    }
  };

  const triggerTestNotification = () => {
    if (typeof window !== 'undefined' && 'Notification' in window && hasPermission) {
      new Notification('🔔 Pengingat Shift WorkPulse', {
        body: `Halo ${user?.full_name || 'Karyawan'}, shift kerja Anda dimulai pukul ${
          user?.shift?.start_time || '08:00'
        } WIB.`,
      });
      setTestNotificationSent(true);
      setTimeout(() => setTestNotificationSent(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden p-5 space-y-4 font-sans max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <Bell className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-sm text-slate-900">Pusat Notifikasi</h3>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                    {unreadCount} Baru
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Pengingat shift, konfirmasi presensi, dan status cuti
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Device Push Notification Banner */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs">
            <Smartphone className="w-4 h-4 text-slate-600 shrink-0" />
            <div>
              <span className="font-bold text-slate-800 block">Notifikasi Perangkat (Push)</span>
              <span className="text-[10px] text-slate-500">
                {hasPermission ? 'Aktif di perangkat ini' : 'Belum diaktifkan di browser/HP'}
              </span>
            </div>
          </div>

          {hasPermission ? (
            <button
              onClick={triggerTestNotification}
              className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-bold transition-colors cursor-pointer"
            >
              {testNotificationSent ? 'Terkirim!' : 'Uji Notifikasi'}
            </button>
          ) : (
            <button
              onClick={requestNotificationPermission}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold transition-colors shadow-2xs"
            >
              Aktifkan
            </button>
          )}
        </div>

        {/* Action Bar (Mark all read) */}
        {unreadCount > 0 && (
          <div className="flex justify-end">
            <button
              onClick={markAllAsRead}
              className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Tandai semua sudah dibaca
            </button>
          </div>
        )}

        {/* Notifications Scrollable List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-80">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-3 rounded-xl border transition-all ${
                notif.isRead
                  ? 'bg-white border-slate-100 text-slate-600'
                  : 'bg-slate-50/80 border-slate-200 text-slate-900 shadow-2xs'
              }`}
            >
              <div className="flex items-start space-x-2.5">
                <div className="mt-0.5 shrink-0">
                  {notif.type === 'SHIFT_REMINDER' ? (
                    <Clock className="w-4 h-4 text-amber-500" />
                  ) : notif.type === 'LEAVE_UPDATE' ? (
                    <FileText className="w-4 h-4 text-purple-500" />
                  ) : notif.type === 'COMPLIANCE' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                  )}
                </div>

                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold leading-tight">{notif.title}</h4>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {notif.timestamp}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {notif.message}
                  </p>
                </div>

                {!notif.isRead && (
                  <span className="w-2 h-2 rounded-full bg-slate-900 shrink-0 mt-1" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
