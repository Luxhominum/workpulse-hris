'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { captureAndCompressFrame, compressImageFile } from '../lib/imageCompressor';

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [capturedPhoto, setCapturedPhoto] = useState<{
    blob: Blob;
    dataUrl: string;
    sizeKb: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  const attachStreamToVideo = useCallback((stream: MediaStream) => {
    if (videoRef.current) {
      const video = videoRef.current;
      video.srcObject = stream;
      video.muted = true;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');

      video.onloadedmetadata = () => {
        video
          .play()
          .then(() => {
            setIsStreaming(true);
          })
          .catch((err) => {
            console.warn('Video play deferred or blocked:', err);
            setIsStreaming(true);
          });
      };
    }
  }, []);

  const startCamera = useCallback(async () => {
    setIsInitializing(true);
    setError(null);

    // Stop any existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Kamera tidak didukung oleh browser/webview ini.');
      }

      let stream: MediaStream | null = null;

      // Attempt 1: High quality front camera
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'user' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (err1) {
        console.warn('Level 1 camera constraints failed, trying Level 2:', err1);
        try {
          // Attempt 2: Flexible front camera
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'user' } },
            audio: false,
          });
        } catch (err2) {
          console.warn('Level 2 camera constraints failed, trying Level 3 fallback:', err2);
          // Attempt 3: Any available video sensor
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      if (!stream) {
        throw new Error('Tidak dapat menginisialisasi sensor kamera.');
      }

      streamRef.current = stream;
      attachStreamToVideo(stream);
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      let message = 'Gagal mengakses sensor kamera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Izin kamera ditolak. Silakan izinkan akses kamera di pengaturan perangkat.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'Sensor kamera tidak ditemukan pada perangkat ini.';
      } else if (err.name === 'NotReadableError') {
        message = 'Sensor kamera sedang sibuk atau digunakan oleh aplikasi lain.';
      }
      setError(message);
      setIsStreaming(false);
    } finally {
      setIsInitializing(false);
    }
  }, [attachStreamToVideo]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current) {
      setError('Kamera belum siap.');
      return null;
    }

    try {
      const result = await captureAndCompressFrame(videoRef.current);
      setCapturedPhoto(result);
      setError(null);
      return result;
    } catch (err: any) {
      setError(`Gagal mengambil foto: ${err.message}`);
      return null;
    }
  }, []);

  const handleNativePhoto = useCallback(async (file: File) => {
    try {
      const compressed = await compressImageFile(file);
      setCapturedPhoto(compressed);
      setError(null);
      return compressed;
    } catch (err: any) {
      setError(`Foto gagal diproses: ${err.message}`);
      return null;
    }
  }, []);

  const retakePhoto = useCallback(() => {
    setCapturedPhoto(null);
    if (streamRef.current) {
      attachStreamToVideo(streamRef.current);
    } else {
      startCamera();
    }
  }, [attachStreamToVideo, startCamera]);

  // Ensure stream attaches when video element becomes available in DOM
  useEffect(() => {
    if (videoRef.current && streamRef.current && !isStreaming) {
      attachStreamToVideo(streamRef.current);
    }
  });

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  return {
    videoRef,
    isStreaming,
    isInitializing,
    capturedPhoto,
    error,
    startCamera,
    stopCamera,
    capturePhoto,
    handleNativePhoto,
    retakePhoto,
    setCapturedPhoto,
  };
}
