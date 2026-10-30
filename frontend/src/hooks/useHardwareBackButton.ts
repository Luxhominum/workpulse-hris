'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

interface HardwareBackProps {
  captureMode: 'clock-in' | 'clock-out' | null;
  onCloseCapture: () => void;
  isIdCardOpen: boolean;
  onCloseIdCard: () => void;
  selectedPhoto: any | null;
  onClosePhoto: () => void;
  isNotificationModalOpen: boolean;
  onCloseNotifications: () => void;
  isSettingsModalOpen: boolean;
  onCloseSettings: () => void;
  isLoginModalOpen: boolean;
  onCloseLogin: () => void;
  activeTab: 'attendance' | 'leaves' | 'history' | 'canvasing' | 'payslip';
  onSelectTab: (tab: 'attendance' | 'leaves' | 'history' | 'canvasing' | 'payslip') => void;
}

export function useHardwareBackButton({
  captureMode,
  onCloseCapture,
  isIdCardOpen,
  onCloseIdCard,
  selectedPhoto,
  onClosePhoto,
  isNotificationModalOpen,
  onCloseNotifications,
  isSettingsModalOpen,
  onCloseSettings,
  isLoginModalOpen,
  onCloseLogin,
  activeTab,
  onSelectTab,
}: HardwareBackProps) {
  const [exitToast, setExitToast] = useState<string | null>(null);
  const lastBackPressRef = useRef<number>(0);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Store latest state in refs so the Capacitor listener callback always sees current values
  const stateRef = useRef({
    captureMode,
    isIdCardOpen,
    selectedPhoto,
    isNotificationModalOpen,
    isSettingsModalOpen,
    isLoginModalOpen,
    activeTab,
  });

  const callbacksRef = useRef({
    onCloseCapture,
    onCloseIdCard,
    onClosePhoto,
    onCloseNotifications,
    onCloseSettings,
    onCloseLogin,
    onSelectTab,
  });

  useEffect(() => {
    stateRef.current = {
      captureMode,
      isIdCardOpen,
      selectedPhoto,
      isNotificationModalOpen,
      isSettingsModalOpen,
      isLoginModalOpen,
      activeTab,
    };
  }, [
    captureMode,
    isIdCardOpen,
    selectedPhoto,
    isNotificationModalOpen,
    isSettingsModalOpen,
    isLoginModalOpen,
    activeTab,
  ]);

  useEffect(() => {
    callbacksRef.current = {
      onCloseCapture,
      onCloseIdCard,
      onClosePhoto,
      onCloseNotifications,
      onCloseSettings,
      onCloseLogin,
      onSelectTab,
    };
  }, [
    onCloseCapture,
    onCloseIdCard,
    onClosePhoto,
    onCloseNotifications,
    onCloseSettings,
    onCloseLogin,
    onSelectTab,
  ]);

  const showExitToast = useCallback((msg: string) => {
    setExitToast(msg);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setExitToast(null);
    }, 2000);
  }, []);

  const handleBackAction = useCallback(() => {
    const s = stateRef.current;
    const c = callbacksRef.current;

    // 1. Highest Priority: Fullscreen Camera View
    if (s.captureMode) {
      c.onCloseCapture();
      return;
    }

    // 2. High Priority: Any active overlay modals
    if (s.isIdCardOpen) {
      c.onCloseIdCard();
      return;
    }
    if (s.selectedPhoto) {
      c.onClosePhoto();
      return;
    }
    if (s.isNotificationModalOpen) {
      c.onCloseNotifications();
      return;
    }
    if (s.isSettingsModalOpen) {
      c.onCloseSettings();
      return;
    }
    if (s.isLoginModalOpen) {
      c.onCloseLogin();
      return;
    }

    // 3. Medium Priority: Return from secondary tabs (Cuti/Riwayat) to Presensi
    if (s.activeTab !== 'attendance') {
      c.onSelectTab('attendance');
      return;
    }

    // 4. Lowest Priority: Root screen double-tap safety guard to prevent accidental exit
    const now = Date.now();
    if (lastBackPressRef.current && now - lastBackPressRef.current < 2000) {
      // Confirmed exit
      App.exitApp();
    } else {
      lastBackPressRef.current = now;
      showExitToast('Tekan sekali lagi untuk keluar dari WorkPulse');
    }
  }, [showExitToast]);

  // Setup Capacitor native back button listener
  useEffect(() => {
    let removeListener: (() => void) | null = null;

    if (Capacitor.isNativePlatform()) {
      App.addListener('backButton', () => {
        handleBackAction();
      }).then((listener) => {
        removeListener = () => listener.remove();
      });
    }

    // Also support desktop Escape key for smooth web/emulator parity
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleBackAction();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (removeListener) removeListener();
      window.removeEventListener('keydown', handleKeyDown);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [handleBackAction]);

  return { exitToast };
}
