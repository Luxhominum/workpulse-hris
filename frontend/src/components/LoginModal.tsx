'use client';

import React, { useState } from 'react';
import { X, KeyRound } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string, pass: string) => Promise<void>;
}

export function LoginModal({ isOpen, onClose, onLogin }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onLogin(email.trim(), password);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Login gagal. Periksa kembali email dan kata sandi Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#161B26]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FAF8F5] border border-[#E8DFD0] rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#E8DFD0] pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-[#EAE3D2] flex items-center justify-center text-[#161B26]">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#161B26]">Ganti Akun Pengguna</h3>
              <p className="text-[11px] text-[#8C7E6A]">Masuk dengan akun terdaftar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[#EAE3D2] text-[#8C7E6A] hover:text-[#161B26] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
          <div>
            <label className="text-xs font-bold text-[#161B26] block mb-1">
              Alamat Email
            </label>
            <input
              type="email"
              placeholder="nama@perusahaan.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-[#E8DFD0] rounded-xl text-xs text-[#161B26] placeholder-[#A09383] focus:outline-hidden focus:border-[#161B26] focus:ring-1 focus:ring-[#161B26]"
              required
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[#161B26] block mb-1">
              Kata Sandi
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-[#E8DFD0] rounded-xl text-xs text-[#161B26] placeholder-[#A09383] focus:outline-hidden focus:border-[#161B26] focus:ring-1 focus:ring-[#161B26]"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#161B26] hover:bg-[#2A3142] text-white font-bold rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50 shadow-sm"
          >
            {loading ? 'Memproses...' : 'Masuk ke Akun'}
          </button>
        </form>
      </div>
    </div>
  );
}
