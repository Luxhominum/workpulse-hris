'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ApiClient } from '../../lib/api';
import { SettingsModal } from '../../components/SettingsModal';
import { ShieldCheck, Lock, Mail, AlertCircle, RefreshCw, Settings, Sun, Sparkles } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await ApiClient.login(email.trim(), password);
      // Route based on role and redirect parameter
      if (redirectTarget) {
        router.push(redirectTarget);
      } else if (data.user.role === 'ADMIN' || data.user.role === 'MANAGER') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Email atau password tidak sesuai. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-center items-center px-4 py-8 font-sans text-[#1E2538] relative">
      <div className="w-full max-w-[350px] mx-auto space-y-5">
        {/* Brand / Logo */}
        <div className="relative text-center space-y-2">
          {/* Server Settings Icon */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            title="Konfigurasi Server IP / Port"
            className="absolute right-0 top-0 p-2 rounded-xl bg-white hover:bg-[#F3EFE6] text-[#716C62] hover:text-[#1E2538] border border-[#E8E2D5] transition-colors shadow-2xs"
          >
            <Settings className="w-4 h-4" />
          </button>

          <div className="flex flex-col items-center justify-center">
            <img
              src="/brand/workpulse-logo-transparent.png"
              alt="WorkPulse - A calmer, brighter workday is always possible"
              className="w-64 sm:w-72 h-auto object-contain mx-auto"
            />
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-[#E8E2D5] p-6 sm:p-8 shadow-[0_15px_35px_-10px_rgba(40,30,20,0.06)] space-y-5">
          {errorMessage && (
            <div className="p-3 bg-[#FAF0ED] border border-[#F6D7CD] rounded-xl text-xs text-[#9C4221] flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-[#9C4221] shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[#1E2538] block mb-1.5">
                Alamat Email Kerja
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#8C8578] absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@perusahaan.com"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl bg-[#FAF8F5] border border-[#E0D9CB] text-[#1E2538] placeholder-[#8C8578] focus:outline-hidden focus:border-[#1E2538] focus:bg-white transition-all shadow-2xs"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#1E2538]">Kata Sandi</label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8C8578] absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl bg-[#FAF8F5] border border-[#E0D9CB] text-[#1E2538] placeholder-[#8C8578] focus:outline-hidden focus:border-[#1E2538] focus:bg-white transition-all shadow-2xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-[#1E2538] hover:bg-[#2B344D] active:scale-[0.985] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-2 shadow-md shadow-[#1E2538]/15 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Memverifikasi Kredensial...</span>
                </>
              ) : (
                <span>Masuk ke Akun</span>
              )}
            </button>
          </form>

          {/* Quick Entry to Shared Attendance Kiosk */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => router.push('/kiosk')}
              className="w-full py-2.5 px-4 bg-[#FEF8E7] hover:bg-[#FDEEC6] text-[#975A16] border border-[#FDE7B4] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.985] shadow-2xs"
            >
              <Sun className="w-4 h-4 text-[#975A16]" />
              <span>Buka Kios Absensi Bersama</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-[#8C8578]">
          WorkPulse Enterprise Attendance System &bull; Daylight Release 2026
        </p>
      </div>

      {/* Settings Dialog */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaved={() => {}}
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center text-xs text-[#5C6479]">
        Memuat Halaman...
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
