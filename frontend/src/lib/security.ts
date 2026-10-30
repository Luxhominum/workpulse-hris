import { registerPlugin, Capacitor } from '@capacitor/core';

export interface DeviceIntegrityResult {
  isMockLocation: boolean;
  isDevMode: boolean;
  platform: 'android' | 'web' | 'ios';
}

interface SecurityPluginInterface {
  checkDeviceIntegrity(): Promise<DeviceIntegrityResult>;
  showSystemNotification(options: { title: string; message: string }): Promise<void>;
}

const SecurityNative = registerPlugin<SecurityPluginInterface>('SecurityPlugin');

export class SecurityGuard {
  static async checkIntegrity(): Promise<DeviceIntegrityResult> {
    if (Capacitor.isNativePlatform()) {
      try {
        return await SecurityNative.checkDeviceIntegrity();
      } catch (err) {
        console.warn('Security plugin native call error:', err);
      }
    }

    return {
      isMockLocation: false,
      isDevMode: false,
      platform: 'web',
    };
  }

  static async notify(title: string, message: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        await SecurityNative.showSystemNotification({ title, message });
        return;
      } catch (err) {
        console.warn('Native notification error:', err);
      }
    }

    // Web Notification fallback
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, { body: message, icon: '/brand/workpulse-emblem.png' });
      } catch (err) {
        console.warn('Web notification error:', err);
      }
    }
  }
}
