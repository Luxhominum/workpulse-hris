'use client';

import React, { useState, useEffect } from 'react';
import { ApiClient } from '../../lib/api';
import { Employee, Office, Shift } from '../../types';
import {
  User,
  X,
  AlertCircle,
  RefreshCw,
  CheckCircle,
  Archive,
  Lock,
  Briefcase,
  IdCard,
  CreditCard,
  Building2,
  Clock,
  Phone,
  Mail,
  Home,
  Heart,
  Calendar,
} from 'lucide-react';

interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  offices: Office[];
  shifts: Shift[];
  onSaved: () => void;
  onArchive: (id: string, name: string) => void;
  onRestore?: (id: string, name: string) => void;
}

type ModalTab = 'work' | 'civil' | 'payroll';

export function EditEmployeeModal({
  isOpen,
  onClose,
  employee,
  offices,
  shifts,
  onSaved,
  onArchive,
  onRestore,
}: EditEmployeeModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>('work');

  // Tab 1: Work & Identity
  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [employeeIdNumber, setEmployeeIdNumber] = useState('');
  const [companyName, setCompanyName] = useState('Pusat Grosir Eceran (PGE)');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'EMPLOYEE' | 'MANAGER' | 'ADMIN'>('EMPLOYEE');
  const [department, setDepartment] = useState('General');
  const [position, setPosition] = useState('Staff');
  const [employmentStatus, setEmploymentStatus] = useState('Tetap');
  const [joinDate, setJoinDate] = useState('');
  const [contractSignedDate, setContractSignedDate] = useState('');
  const [annualLeaveQuota, setAnnualLeaveQuota] = useState(12);
  const [officeId, setOfficeId] = useState<string>('');
  const [shiftId, setShiftId] = useState<string>('');
  const [isWfhAllowed, setIsWfhAllowed] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // Tab 2: Civil & Family
  const [ktpNumber, setKtpNumber] = useState('');
  const [kkNumber, setKkNumber] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('Perempuan');
  const [maritalStatus, setMaritalStatus] = useState('Belum Kawin');
  const [childrenCount, setChildrenCount] = useState(0);
  const [bloodType, setBloodType] = useState('');
  const [religion, setReligion] = useState('Islam');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [address, setAddress] = useState('');

  // Tab 3: Payroll
  const [bankUob, setBankUob] = useState('');
  const [bankOther, setBankOther] = useState('');

  // Career Background
  const [workHistory, setWorkHistory] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (employee) {
      setFullName(employee.full_name || '');
      setNickname(employee.nickname || '');
      setEmployeeIdNumber(employee.employee_id_number || '');
      setCompanyName(employee.company?.name || 'Pusat Grosir Eceran (PGE)');
      setEmail(employee.email || '');
      setPhone(employee.phone || '');
      setRole(employee.role || 'EMPLOYEE');
      setDepartment(employee.department || 'General');
      setPosition(employee.position || 'Staff');
      setEmploymentStatus(employee.employment_status || 'Tetap');
      setJoinDate(
        employee.join_date ? new Date(employee.join_date).toISOString().split('T')[0] : ''
      );
      setContractSignedDate(
        employee.contract_signed_date
          ? new Date(employee.contract_signed_date).toISOString().split('T')[0]
          : ''
      );
      setAnnualLeaveQuota(employee.annual_leave_quota ?? 12);
      setOfficeId(employee.office_id || '');
      setShiftId(employee.shift_id || '');
      setIsWfhAllowed(!!employee.is_wfh_allowed);
      setNewPassword('');

      // Civil
      setKtpNumber(employee.ktp_number || '');
      setKkNumber(employee.kk_number || '');
      setBirthPlace(employee.birth_place || '');
      setBirthDate(
        employee.birth_date ? new Date(employee.birth_date).toISOString().split('T')[0] : ''
      );
      setGender(employee.gender || 'Perempuan');
      setMaritalStatus(employee.marital_status || 'Belum Kawin');
      setChildrenCount(employee.children_count ?? 0);
      setBloodType(employee.blood_type || '');
      setReligion(employee.religion || 'Islam');
      setEmergencyContactPhone(employee.emergency_contact_phone || '');
      setAddress(employee.address || '');

      // Payroll
      setBankUob(employee.bank_uob || '');
      setBankOther(employee.bank_other || '');

      // Career
      setWorkHistory(employee.work_history || '');

      setErrorMsg(null);
      setActiveTab('work');
    }
  }, [employee]);

  if (!isOpen || !employee) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      setErrorMsg('Nama lengkap dan email tidak boleh kosong.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const payload: any = {
        full_name: fullName.trim(),
        nickname: nickname.trim() || null,
        employee_id_number: employeeIdNumber.trim() || null,
        company_name: companyName.trim() || null,
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        role,
        department: department.trim() || 'General',
        position: position.trim() || 'Staff',
        employment_status: employmentStatus.trim() || 'Tetap',
        join_date: joinDate || null,
        contract_signed_date: contractSignedDate || null,
        annual_leave_quota: Number(annualLeaveQuota) || 12,
        office_id: officeId || null,
        shift_id: shiftId || null,
        is_wfh_allowed: isWfhAllowed,
        // Civil
        ktp_number: ktpNumber.trim() || null,
        kk_number: kkNumber.trim() || null,
        birth_place: birthPlace.trim() || null,
        birth_date: birthDate || null,
        gender: gender || null,
        marital_status: maritalStatus || null,
        children_count: Number(childrenCount) || 0,
        blood_type: bloodType.trim() || null,
        religion: religion || null,
        emergency_contact_phone: emergencyContactPhone.trim() || null,
        address: address.trim() || null,
        // Payroll
        bank_uob: bankUob.trim() || null,
        bank_other: bankOther.trim() || null,
        // Career
        work_history: workHistory.trim() || null,
      };

      if (newPassword.trim()) {
        if (newPassword.trim().length < 6) {
          throw new Error('Password baru minimal 6 karakter.');
        }
        payload.password = newPassword.trim();
      }

      await ApiClient.updateEmployee(employee.id, payload);
      onSaved();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan perubahan karyawan.');
    } finally {
      setIsSaving(false);
    }
  };

  const isArchived = employee.is_active === false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col font-sans max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center shrink-0 shadow-xs">
              {nickname ? nickname.slice(0, 2).toUpperCase() : fullName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-sm sm:text-base text-slate-900">{fullName}</h3>
                {employeeIdNumber && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-800">
                    ID: {employeeIdNumber}
                  </span>
                )}
                {isArchived ? (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                    Diarsipkan
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Aktif
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center space-x-2">
                <span>{position} ({department})</span>
                {nickname && <span className="text-amber-700 font-semibold">• &quot;{nickname}&quot;</span>}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 px-4 sm:px-5 bg-white text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('work')}
            className={`py-3 px-3 border-b-2 flex items-center space-x-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'work'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Kepegawaian & Shift</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('civil')}
            className={`py-3 px-3 border-b-2 flex items-center space-x-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'civil'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <IdCard className="w-3.5 h-3.5" />
            <span>Kependudukan & Keluarga</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payroll')}
            className={`py-3 px-3 border-b-2 flex items-center space-x-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'payroll'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Rekening Payroll UOB</span>
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form id="edit-employee-form" onSubmit={handleSubmit} className="space-y-4">
            {/* TAB 1: WORK & ATTENDANCE ASSIGNMENT */}
            {activeTab === 'work' && (
              <div className="space-y-4 animate-in fade-in duration-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Nama Lengkap <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Nama Panggilan (Nickname)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Anis, Ary, Wahyu"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Instansi / Perusahaan (Company)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Pusat Grosir Eceran (PGE)"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Nama instansi ini tampil pada Digital ID Card pegawai.
                    </p>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      No ID Karyawan (NIK Internal PGE)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 210703"
                      value={employeeIdNumber}
                      onChange={(e) => setEmployeeIdNumber(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Email Karyawan <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      No Telepon / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Role Hak Akses Sistem
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden font-semibold"
                    >
                      <option value="EMPLOYEE">Karyawan (EMPLOYEE)</option>
                      <option value="MANAGER">Manager / Atasan (MANAGER)</option>
                      <option value="ADMIN">HR Administrator (ADMIN)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Departemen / Divisi
                    </label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Posisi / Jabatan
                    </label>
                    <input
                      type="text"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Tanggal Mulai Bekerja (Join Date)
                    </label>
                    <input
                      type="date"
                      value={joinDate}
                      onChange={(e) => setJoinDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Tanggal TTD Kontrak
                    </label>
                    <input
                      type="date"
                      value={contractSignedDate}
                      onChange={(e) => setContractSignedDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Status Pekerjaan
                    </label>
                    <input
                      type="text"
                      placeholder="Tetap, Kontrak, Probasi"
                      value={employmentStatus}
                      onChange={(e) => setEmploymentStatus(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Kuota Cuti Tahunan (Hari)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={annualLeaveQuota}
                      onChange={(e) => setAnnualLeaveQuota(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-xs font-mono font-semibold rounded-lg border border-slate-200 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Kantor Cabang (Geofence GPS)
                    </label>
                    <select
                      value={officeId}
                      onChange={(e) => setOfficeId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden"
                    >
                      <option value="">Belum Ditugaskan (No Office)</option>
                      {offices.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name} ({o.radius_meters}m)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Jadwal Shift Kerja
                    </label>
                    <select
                      value={shiftId}
                      onChange={(e) => setShiftId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden"
                    >
                      <option value="">Belum Ditugaskan (No Shift)</option>
                      {shifts.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.start_time} - {s.end_time})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isWfhAllowed}
                      onChange={(e) => setIsWfhAllowed(e.target.checked)}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <span className="font-semibold text-slate-800">
                      Izinkan Absen Remote / WFH (Bebas Validasi Geofence)
                    </span>
                  </label>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <label className="text-[11px] font-semibold text-slate-700 flex items-center space-x-1.5 mb-1">
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Reset Password Akun (Opsional)</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Kosongkan bila tidak mengubah password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 focus:outline-hidden"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Minimal 6 karakter jika ingin mengganti password karyawan.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <label className="text-[11px] font-semibold text-slate-700 flex items-center space-x-1.5 mb-1">
                    <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                    <span>Riwayat Pekerjaan / Background Karir (Opsional)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Pengalaman kerja terdahulu atau riwayat penugasan internal"
                    value={workHistory}
                    onChange={(e) => setWorkHistory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: CIVIL DATA & EMERGENCY */}
            {activeTab === 'civil' && (
              <div className="space-y-4 animate-in fade-in duration-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Nomor KTP (NIK Kependudukan)
                    </label>
                    <input
                      type="text"
                      placeholder="16 digit e.g. 331316..."
                      value={ktpNumber}
                      onChange={(e) => setKtpNumber(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Nomor Kartu Keluarga (No KK)
                    </label>
                    <input
                      type="text"
                      placeholder="16 digit e.g. 331316..."
                      value={kkNumber}
                      onChange={(e) => setKkNumber(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Tempat Lahir
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Karanganyar, Surakarta"
                      value={birthPlace}
                      onChange={(e) => setBirthPlace(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Tanggal Lahir
                    </label>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Jenis Kelamin
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden"
                    >
                      <option value="Perempuan">Perempuan</option>
                      <option value="Laki-laki">Laki-laki</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Status Perkawinan
                    </label>
                    <select
                      value={maritalStatus}
                      onChange={(e) => setMaritalStatus(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden"
                    >
                      <option value="Belum Kawin">Belum Kawin</option>
                      <option value="Kawin">Kawin</option>
                      <option value="Cerai Hidup">Cerai Hidup</option>
                      <option value="Cerai Mati">Cerai Mati</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Jumlah Anak
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={childrenCount}
                      onChange={(e) => setChildrenCount(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Golongan Darah
                    </label>
                    <select
                      value={bloodType}
                      onChange={(e) => setBloodType(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden"
                    >
                      <option value="">Tidak Diketahui</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="AB">AB</option>
                      <option value="O">O</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Agama
                    </label>
                    <input
                      type="text"
                      placeholder="Islam, Kristen, Katholik, Hindu, Buddha"
                      value={religion}
                      onChange={(e) => setReligion(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Kontak Darurat / Telp Keluarga
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. (Ibu) 0857-0255-0628"
                      value={emergencyContactPhone}
                      onChange={(e) => setEmergencyContactPhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Alamat Lengkap Rumah
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Alamat domisili / tempat tinggal saat ini"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden"
                  />
                </div>
              </div>
            )}

            {/* TAB 3: PAYROLL & BANK ACCOUNTS */}
            {activeTab === 'payroll' && (
              <div className="space-y-4 animate-in fade-in duration-100">
                <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl">
                  <h4 className="text-xs font-bold text-amber-950 flex items-center space-x-1.5">
                    <CreditCard className="w-4 h-4 text-amber-600" />
                    <span>Rekening Penggajian Resmi (Team PGE)</span>
                  </h4>
                  <p className="text-[11px] text-amber-800 mt-1">
                    Team PGE menggunakan Bank UOB untuk transfer penggajian otomatis. Rekening alternatif dicatat untuk reimbursement & klaim darurat.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Nomor Rekening Bank UOB (Payroll PGE Utama)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 3083763459"
                      value={bankUob}
                      onChange={(e) => setBankUob(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono font-bold text-slate-900 rounded-lg border border-slate-200 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Rekening Bank Lain / Pribadi Karyawan
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. BRI 6704 0102 1776 537 a/n Anisyatul Hasanah cabang Batu Jamus"
                      value={bankOther}
                      onChange={(e) => setBankOther(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div>
            {isArchived ? (
              <button
                type="button"
                onClick={() => {
                  if (onRestore) onRestore(employee.id, employee.full_name);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Pulihkan Karyawan</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onArchive(employee.id, employee.full_name);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Arsipkan Karyawan</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              form="edit-employee-form"
              disabled={isSaving}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white flex items-center space-x-1.5 transition-colors disabled:opacity-50 shadow-sm shadow-amber-950/20 cursor-pointer"
            >
              {isSaving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
