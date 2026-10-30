'use client';

import { useState, useEffect, useCallback } from 'react';
import { OfflineQueue } from '../lib/offlineQueue';

export function useOfflineSync(onSyncSuccess?: () => void) {
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatusText, setSyncStatusText] = useState<string | null>(null);

  const refreshCount = useCallback(() => {
    setPendingCount(OfflineQueue.getPendingCount());
  }, []);

  const triggerSync = useCallback(async () => {
    if (isSyncing || OfflineQueue.getPendingCount() === 0) return;
    setIsSyncing(true);
    setSyncStatusText('Menghubungkan ke server...');

    try {
      const result = await OfflineQueue.syncPending();
      if (result.synced > 0) {
        setSyncStatusText(`${result.synced} presensi berhasil disinkronkan ke server.`);
        if (onSyncSuccess) onSyncSuccess();
      } else if (result.failed > 0) {
        setSyncStatusText(`Gagal menyinkronkan ${result.failed} presensi. Menunggu sinyal lebih kuat...`);
      }
    } catch (err: any) {
      setSyncStatusText('Sinkronisasi tertunda (sinyal belum stabil).');
    } finally {
      setIsSyncing(false);
      refreshCount();
    }
  }, [isSyncing, onSyncSuccess, refreshCount]);

  useEffect(() => {
    refreshCount();

    const handleQueueChanged = () => refreshCount();
    const handleOnline = () => {
      triggerSync();
    };

    window.addEventListener('hris_queue_changed', handleQueueChanged);
    window.addEventListener('online', handleOnline);

    // Periodic heartbeat check every 25 seconds
    const interval = setInterval(() => {
      if (navigator.onLine && OfflineQueue.hasPending()) {
        triggerSync();
      }
    }, 25000);

    return () => {
      window.removeEventListener('hris_queue_changed', handleQueueChanged);
      window.removeEventListener('online', handleOnline);
      clearInterval(interval);
    };
  }, [refreshCount, triggerSync]);

  return {
    pendingCount,
    isSyncing,
    syncStatusText,
    triggerSync,
    refreshCount,
  };
}
