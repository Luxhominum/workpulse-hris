'use client';

import React, { useState, useEffect } from 'react';
import { ApiClient } from '../lib/api';
import { X, Server, Check, AlertCircle, RefreshCw } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function SettingsModal({ isOpen, onClose, onSaved }: SettingsModalProps) {
  const [url, setUrl] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setUrl(ApiClient.getBaseUrl());
      setTestStatus('idle');
      setStatusMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async (testUrl: string) => {
    setTestStatus('testing');
    setStatusMessage('Memeriksa konektivitas server...');
    try {
      const target = (testUrl.trim() || ApiClient.getBaseUrl()).replace(/\/$/, '');
      const fullUrl = target ? `${target}/api/v1/health` : '/api/v1/health';
      const res = await fetch(fullUrl);
      if (res.ok) {
        setTestStatus('success');
        setStatusMessage('Terhubung dengan sukses! Server online.');
      } else {
        setTestStatus('error');
        setStatusMessage(`Server merespons dengan status ${res.status}`);
      }
    } catch (err: any) {
      setTestStatus('error');
      setStatusMessage(err.message || 'Tidak dapat menjangkau server backend.');
    }
  };

  const handleSave = () => {
    ApiClient.setBaseUrl(url);
    if (onSaved) onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#161B26]/60 backdrop-blur-xs">
      <div className="bg-[#FAF8F5] rounded-2xl max-w-sm w-full border border-[#E8DFD0] shadow-xl overflow-hidden p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E8DFD0]">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-[#EAE3D2] flex items-center justify-center text-[#161B26]">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#161B26]">Alamat Server API</h3>
              <p className="text-[11px] text-[#8C7E6A]">Konfigurasi host backend untuk aplikasi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[#EAE3D2] text-[#8C7E6A] hover:text-[#161B26] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input Field */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#161B26] block">
            URL Backend Server
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://workpulse.perusahaan.com"
            className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl bg-white border border-[#E8DFD0] text-[#161B26] focus:outline-hidden focus:ring-1 focus:ring-[#161B26]"
          />
          <p className="text-[11px] text-[#8C7E6A] leading-relaxed">
            Biarkan kosong untuk menggunakan host server default sistem.
          </p>
        </div>

        {/* Status display */}
        {testStatus !== 'idle' && (
          <div
            className={`p-2.5 rounded-xl text-xs flex items-center space-x-2 border ${
              testStatus === 'testing'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : testStatus === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {testStatus === 'testing' && <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />}
            {testStatus === 'success' && <Check className="w-3.5 h-3.5 shrink-0" />}
            {testStatus === 'error' && <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
            <span className="truncate">{statusMessage}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#E8DFD0]">
          <button
            type="button"
            onClick={() => handleTest(url)}
            disabled={testStatus === 'testing'}
            className="px-3 py-2 text-xs font-bold text-[#161B26] bg-[#EAE3D2] hover:bg-[#DFD6C3] rounded-xl transition-all cursor-pointer"
          >
            Uji Koneksi
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-xs font-bold text-white bg-[#161B26] hover:bg-[#2A3142] rounded-xl transition-all cursor-pointer shadow-sm"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}
