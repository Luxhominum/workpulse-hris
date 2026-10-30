'use client';

import { useState, useEffect, useCallback } from 'react';
import { calculateDistanceMeters } from '../lib/geo';
import { Office } from '../types';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { SecurityGuard } from '../lib/security';

export interface GeoCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export function useGeolocation(assignedOffice?: Office | null, allOffices?: Office[]) {
  const [coords, setCoords] = useState<GeoCoords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSimulated, setIsSimulated] = useState<boolean>(false);
  const [isMockLocation, setIsMockLocation] = useState<boolean>(false);

  const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();

  const fetchPosition = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Anti-Spoofing & Fake GPS Check
    const integrity = await SecurityGuard.checkIntegrity();
    if (integrity.isMockLocation) {
      setIsMockLocation(true);
      setError('⚠️ Terdeteksi Fake GPS / Mock Location! Matikan aplikasi lokasi tiruan untuk melanjutkan presensi.');
      setIsLoading(false);
      return;
    }
    setIsMockLocation(false);

    // Native Capacitor Geolocation for Android/iOS
    if (isNative) {
      try {
        const permStatus = await Geolocation.checkPermissions();
        if (permStatus.location !== 'granted') {
          const req = await Geolocation.requestPermissions();
          if (req.location !== 'granted') {
            throw new Error('Izin akses lokasi GPS ditolak oleh pengguna pada perangkat.');
          }
        }

        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 60000,
        });

        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setIsSimulated(false);
        setIsLoading(false);
        return;
      } catch (nativeErr: any) {
        console.warn('Native GPS error, falling back to browser API:', nativeErr);
      }
    }

    // Browser Geolocation API Fallback
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setError('Geolocation is not supported by your browser device.');
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setIsSimulated(false);
        setIsLoading(false);
      },
      (err) => {
        let msg = 'Gagal mendeteksi lokasi GPS.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Izin lokasi GPS ditolak. Silakan aktifkan izin lokasi di pengaturan browser / HP.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'Sinyal GPS saat ini tidak tersedia.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Waktu permintaan lokasi GPS habis. Silakan coba lagi.';
        }
        setError(msg);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000,
      }
    );
  }, [isNative]);

  useEffect(() => {
    fetchPosition();
  }, [fetchPosition]);

  // Simulate Coordinates (for Desktop/Test Devs without native GPS)
  const setSimulatedLocation = useCallback(
    (lat: number, lng: number) => {
      setCoords({ latitude: lat, longitude: lng, accuracy: 5 });
      setIsSimulated(true);
      setError(null);
    },
    []
  );

  // Multi-branch geofence evaluation with Dynamic Elasticity
  let activeOffice: Office | null = assignedOffice || null;
  let distanceMeters: number | null = null;
  let isWithinPerimeter = false;

  // Dynamic Geofence Elasticity (Arah A: The Invisible Guardian)
  // When inside a metal/concrete factory roof, satellite accuracy degrades.
  // Add a modest uncertainty buffer up to 35m maximum to eliminate indoor false-alarms.
  const accuracyBuffer = coords?.accuracy && coords.accuracy > 20
    ? Math.min(35, Math.round((coords.accuracy - 20) * 0.6))
    : 0;

  if (coords && assignedOffice) {
    const effectiveRadius = assignedOffice.radius_meters + accuracyBuffer;
    const assignedDist = calculateDistanceMeters(
      coords.latitude,
      coords.longitude,
      assignedOffice.latitude,
      assignedOffice.longitude
    );
    distanceMeters = assignedDist;
    isWithinPerimeter = assignedDist <= effectiveRadius;

    // If outside assigned home branch, check if employee is present at another regional branch
    if (!isWithinPerimeter && allOffices && allOffices.length > 0) {
      for (const branch of allOffices) {
        if (branch.id === assignedOffice.id) continue;
        const branchEffectiveRadius = branch.radius_meters + accuracyBuffer;
        const d = calculateDistanceMeters(
          coords.latitude,
          coords.longitude,
          branch.latitude,
          branch.longitude
        );
        if (d <= branchEffectiveRadius) {
          activeOffice = branch;
          distanceMeters = d;
          isWithinPerimeter = true;
          break;
        }
      }
    }
  }

  return {
    coords,
    error,
    isLoading,
    isSimulated,
    isMockLocation,
    distanceMeters,
    isWithinPerimeter,
    accuracyBuffer,
    activeOffice,
    refresh: fetchPosition,
    setSimulatedLocation,
  };
}
