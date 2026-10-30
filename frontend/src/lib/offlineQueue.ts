import { ApiClient } from './api';

export interface QueuedAttendance {
  id: string;
  idempotencyKey: string;
  employeeId: string;
  type: 'clock-in' | 'clock-out';
  latitude: number;
  longitude: number;
  photoDataUrl: string;
  capturedAt: string;
  attempts: number;
  lastError?: string;
  status: 'pending' | 'syncing' | 'failed';
}

const STORAGE_KEY = 'hris_offline_attendance_queue';

export class OfflineQueue {
  public static getQueue(): QueuedAttendance[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (err) {
      console.warn('Failed to read offline queue from storage:', err);
      return [];
    }
  }

  private static saveQueue(queue: QueuedAttendance[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
      // Dispatch custom window event for reactive UI badge updates
      window.dispatchEvent(new CustomEvent('hris_queue_changed', { detail: { count: queue.length } }));
    } catch (err) {
      console.error('Failed to save offline queue to storage:', err);
    }
  }

  public static enqueue(
    entry: Omit<QueuedAttendance, 'id' | 'attempts' | 'status'>
  ): QueuedAttendance {
    const queue = this.getQueue();
    const item: QueuedAttendance = {
      ...entry,
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `queue_${Date.now()}_${Math.random()}`,
      attempts: 0,
      status: 'pending',
    };

    // Prevent identical idempotencyKey duplication in queue
    const filtered = queue.filter((q) => q.idempotencyKey !== item.idempotencyKey);
    filtered.push(item);
    this.saveQueue(filtered);
    return item;
  }

  public static dequeue(id: string): void {
    const queue = this.getQueue();
    const updated = queue.filter((item) => item.id !== id);
    this.saveQueue(updated);
  }

  public static updateStatus(
    id: string,
    status: QueuedAttendance['status'],
    error?: string
  ): void {
    const queue = this.getQueue();
    const item = queue.find((q) => q.id === id);
    if (item) {
      item.status = status;
      item.attempts += 1;
      if (error) item.lastError = error;
      this.saveQueue(queue);
    }
  }

  public static hasPending(): boolean {
    return this.getQueue().some((q) => q.status === 'pending' || q.status === 'failed');
  }

  public static getPendingCount(): number {
    return this.getQueue().length;
  }

  public static clearQueue(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new CustomEvent('hris_queue_changed', { detail: { count: 0 } }));
    }
  }

  public static async dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const res = await fetch(dataUrl);
    return await res.blob();
  }

  /**
   * Drain and synchronize all pending attendance records with the backend API
   */
  public static async syncPending(): Promise<{ synced: number; failed: number }> {
    const queue = this.getQueue();
    if (queue.length === 0) return { synced: 0, failed: 0 };

    let synced = 0;
    let failed = 0;

    for (const item of queue) {
      try {
        this.updateStatus(item.id, 'syncing');
        const blob = await this.dataUrlToBlob(item.photoDataUrl);

        if (item.type === 'clock-in') {
          await ApiClient.clockIn(item.latitude, item.longitude, blob, {
            idempotencyKey: item.idempotencyKey,
            clientTimestamp: item.capturedAt,
          });
        } else {
          await ApiClient.clockOut(item.latitude, item.longitude, blob, {
            idempotencyKey: item.idempotencyKey,
            clientTimestamp: item.capturedAt,
          });
        }

        // Successfully synced -> remove from queue
        this.dequeue(item.id);
        synced++;
      } catch (err: any) {
        console.warn(`Sync failed for queue item ${item.id}:`, err);
        this.updateStatus(item.id, 'failed', err.message || 'Network sync error');
        failed++;
      }
    }

    if (synced > 0 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hris_attendance_synced', { detail: { synced } }));
    }

    return { synced, failed };
  }
}
