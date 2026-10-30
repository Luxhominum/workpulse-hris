'use client';

import React, { useState, useEffect } from 'react';
import { ApiClient } from '../../lib/api';
import { Office, Shift, Employee } from '../../types';
import { EditEmployeeModal } from './EditEmployeeModal';
import {
  Building2,
  Clock,
  Users,
  Save,
  Check,
  AlertCircle,
  RefreshCw,
  MapPin,
  Sliders,
  Shield,
  UserPlus,
  Trash2,
  X,
  Plus,
  Navigation,
  Edit2,
  Archive,
  RotateCcw,
} from 'lucide-react';

export function SettingsTab() {
  const [offices, setOffices] = useState<Office[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New Employee Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCreatingEmployee, setIsCreatingEmployee] = useState(false);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpPassword, setNewEmpPassword] = useState('Password123!');
  const [newEmpRole, setNewEmpRole] = useState<'EMPLOYEE' | 'MANAGER' | 'ADMIN'>('EMPLOYEE');
  const [newEmpDept, setNewEmpDept] = useState('Engineering');
  const [newEmpPosition, setNewEmpPosition] = useState('Staff');
  const [newEmpPhone, setNewEmpPhone] = useState('+62 812-');
  const [newEmpJoinDate, setNewEmpJoinDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newEmpQuota, setNewEmpQuota] = useState(12);
  const [newEmpCompanyName, setNewEmpCompanyName] = useState('Pusat Grosir Eceran (PGE)');
  const [newEmpOfficeId, setNewEmpOfficeId] = useState('');
  const [newEmpShiftId, setNewEmpShiftId] = useState('');
  const [newEmpWfh, setNewEmpWfh] = useState(false);

  // New Office Modal State
  const [isAddOfficeModalOpen, setIsAddOfficeModalOpen] = useState(false);
  const [isCreatingOffice, setIsCreatingOffice] = useState(false);
  const [newOfficeName, setNewOfficeName] = useState('');
  const [newOfficeLat, setNewOfficeLat] = useState<number | ''>(-7.55331);
  const [newOfficeLng, setNewOfficeLng] = useState<number | ''>(110.83910);
  const [newOfficeRadius, setNewOfficeRadius] = useState<number>(250);
  const [isDetectingGps, setIsDetectingGps] = useState(false);

  // Filter and Edit Employee State
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState<'active' | 'archived'>('active');
  const [selectedEditEmployee, setSelectedEditEmployee] = useState<Employee | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const loadData = async (status = employeeStatusFilter) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [officesRes, shiftsRes, employeesRes] = await Promise.all([
        ApiClient.getOffices(),
        ApiClient.getShifts(),
        ApiClient.getEmployees(status),
      ]);
      setOffices(officesRes);
      setShifts(shiftsRes);
      setEmployees(employeesRes);
      if (officesRes.length > 0 && !newEmpOfficeId) {
        setNewEmpOfficeId(officesRes[0].id);
      }
      if (shiftsRes.length > 0 && !newEmpShiftId) {
        setNewEmpShiftId(shiftsRes[0].id);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load organization settings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- Handlers for Offices ---
  const handleOfficeChange = (id: string, field: keyof Office, value: any) => {
    setOffices((prev) =>
      prev.map((o) => (o.id === id ? { ...o, [field]: value } : o))
    );
  };

  const handleSaveOffice = async (office: Office) => {
    setSavingId(office.id);
    setErrorMsg(null);
    try {
      await ApiClient.updateOffice(office.id, {
        name: office.name,
        latitude: Number(office.latitude),
        longitude: Number(office.longitude),
        radius_meters: Number(office.radius_meters),
      });
      setSuccessId(office.id);
      setTimeout(() => setSuccessId(null), 2500);
    } catch (err: any) {
      setErrorMsg(`Office update error: ${err.message}`);
    } finally {
      setSavingId(null);
    }
  };

  const handleDetectCurrentGps = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }
    setIsDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNewOfficeLat(parseFloat(pos.coords.latitude.toFixed(6)));
        setNewOfficeLng(parseFloat(pos.coords.longitude.toFixed(6)));
        setIsDetectingGps(false);
      },
      (err) => {
        setErrorMsg(`Failed to detect GPS: ${err.message}`);
        setIsDetectingGps(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleCreateOffice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOfficeName.trim() || newOfficeLat === '' || newOfficeLng === '') {
      setErrorMsg('Office name, latitude, and longitude are required.');
      return;
    }
    setIsCreatingOffice(true);
    setErrorMsg(null);
    try {
      const created = await ApiClient.createOffice({
        name: newOfficeName.trim(),
        latitude: Number(newOfficeLat),
        longitude: Number(newOfficeLng),
        radius_meters: Number(newOfficeRadius) || 250,
      });
      setOffices((prev) => [...prev, created]);
      setIsAddOfficeModalOpen(false);
      setNewOfficeName('');
      setSuccessId(created.id);
      setTimeout(() => setSuccessId(null), 2500);
    } catch (err: any) {
      setErrorMsg(`Failed to create office: ${err.message}`);
    } finally {
      setIsCreatingOffice(false);
    }
  };

  const handleDeleteOffice = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete office "${name}"? Assigned employees will be unassigned.`)) {
      return;
    }
    setSavingId(id);
    setErrorMsg(null);
    try {
      await ApiClient.deleteOffice(id);
      setOffices((prev) => prev.filter((o) => o.id !== id));
    } catch (err: any) {
      setErrorMsg(`Failed to delete office: ${err.message}`);
    } finally {
      setSavingId(null);
    }
  };

  // --- Handlers for Shifts ---
  const handleShiftChange = (id: string, field: keyof Shift, value: any) => {
    setShifts((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleSaveShift = async (shift: Shift) => {
    setSavingId(shift.id);
    setErrorMsg(null);
    try {
      await ApiClient.updateShift(shift.id, {
        name: shift.name,
        start_time: shift.start_time,
        end_time: shift.end_time,
        grace_period_minutes: Number(shift.grace_period_minutes),
      });
      setSuccessId(shift.id);
      setTimeout(() => setSuccessId(null), 2500);
    } catch (err: any) {
      setErrorMsg(`Shift update error: ${err.message}`);
    } finally {
      setSavingId(null);
    }
  };

  // --- Handlers for Employees ---
  const handleEmployeeChange = (id: string, field: keyof Employee, value: any) => {
    setEmployees((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  const handleSaveEmployee = async (emp: Employee) => {
    setSavingId(emp.id);
    setErrorMsg(null);
    try {
      await ApiClient.updateEmployee(emp.id, {
        is_wfh_allowed: emp.is_wfh_allowed,
        office_id: emp.office_id || null,
        shift_id: emp.shift_id || null,
        department: emp.department,
        position: emp.position || 'Staff',
        phone: emp.phone || null,
        annual_leave_quota: Number(emp.annual_leave_quota) || 12,
      });
      setSuccessId(emp.id);
      setTimeout(() => setSuccessId(null), 2500);
    } catch (err: any) {
      setErrorMsg(`Employee update error: ${err.message}`);
    } finally {
      setSavingId(null);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim() || !newEmpEmail.trim() || !newEmpPassword.trim()) {
      setErrorMsg('Full name, email, and password are required.');
      return;
    }

    setIsCreatingEmployee(true);
    setErrorMsg(null);

    try {
      const created = await ApiClient.createEmployee({
        full_name: newEmpName.trim(),
        email: newEmpEmail.trim().toLowerCase(),
        password: newEmpPassword,
        role: newEmpRole,
        department: newEmpDept.trim() || 'General',
        position: newEmpPosition.trim() || 'Staff',
        phone: newEmpPhone.trim() || null,
        join_date: newEmpJoinDate || null,
        annual_leave_quota: Number(newEmpQuota) || 12,
        company_name: newEmpCompanyName.trim() || undefined,
        office_id: newEmpOfficeId || null,
        shift_id: newEmpShiftId || null,
        is_wfh_allowed: newEmpWfh,
      });

      setEmployees((prev) => [...prev, created]);
      setIsAddModalOpen(false);
      setNewEmpName('');
      setNewEmpEmail('');
      setNewEmpPassword('Password123!');
      setNewEmpPosition('Staff');
      setNewEmpPhone('+62 812-');
      setSuccessId(created.id);
      setTimeout(() => setSuccessId(null), 2500);
    } catch (err: any) {
      setErrorMsg(`Failed to create employee: ${err.message}`);
    } finally {
      setIsCreatingEmployee(false);
    }
  };

  const handleArchiveEmployee = async (id: string, name: string) => {
    if (!confirm(`Arsipkan karyawan "${name}"? Akun akan dinonaktifkan dari absensi, namun riwayat presensi masa lalunya tetap aman.`)) {
      return;
    }
    setSavingId(id);
    setErrorMsg(null);
    try {
      await ApiClient.archiveEmployee(id);
      await loadData();
    } catch (err: any) {
      setErrorMsg(`Gagal mengarsipkan karyawan: ${err.message}`);
    } finally {
      setSavingId(null);
    }
  };

  const handleRestoreEmployee = async (id: string, name: string) => {
    setSavingId(id);
    setErrorMsg(null);
    try {
      await ApiClient.restoreEmployee(id);
      await loadData();
    } catch (err: any) {
      setErrorMsg(`Gagal memulihkan karyawan: ${err.message}`);
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteEmployee = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from the employee database?`)) {
      return;
    }

    setSavingId(id);
    setErrorMsg(null);
    try {
      await ApiClient.deleteEmployee(id);
      setEmployees((prev) => prev.filter((e) => e.id !== id));
    } catch (err: any) {
      setErrorMsg(`Failed to delete employee: ${err.message}`);
    } finally {
      setSavingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <RefreshCw className="w-5 h-5 text-slate-400 animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-500 font-medium">Loading organization & employee database...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert banner if error */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* SECTION 1: Employee Database & Assignments */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-sm text-slate-900">Database Master Karyawan</h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                  {employees.length} {employeeStatusFilter === 'active' ? 'Aktif' : 'Diarsipkan'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Kelola profil, shift kerja, penugasan kantor cabang (geofence), dan izin remote WFH
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            {/* Status Filter Tabs */}
            <div className="flex items-center space-x-1 bg-slate-200/70 p-0.5 rounded-lg border border-slate-300/50 text-xs font-semibold">
              <button
                onClick={() => {
                  setEmployeeStatusFilter('active');
                  loadData('active');
                }}
                className={`px-3 py-1 rounded-md transition-all ${
                  employeeStatusFilter === 'active'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Aktif
              </button>
              <button
                onClick={() => {
                  setEmployeeStatusFilter('archived');
                  loadData('archived');
                }}
                className={`px-3 py-1 rounded-md transition-all ${
                  employeeStatusFilter === 'archived'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Diarsipkan
              </button>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Tambah Karyawan</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                <th className="py-2.5 px-4">Karyawan</th>
                <th className="py-2.5 px-4">Departemen & Kontak</th>
                <th className="py-2.5 px-4">Kantor & Geofence</th>
                <th className="py-2.5 px-4">Shift Jam Kerja</th>
                <th className="py-2.5 px-4 text-center">Hak Cuti</th>
                <th className="py-2.5 px-4 text-center">Izin WFH</th>
                <th className="py-2.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Tidak ada data karyawan {employeeStatusFilter === 'active' ? 'aktif' : 'yang diarsipkan'}.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <span>{emp.full_name}</span>
                        {emp.role === 'ADMIN' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 bg-purple-100 text-purple-700 rounded">
                            ADMIN
                          </span>
                        )}
                        {emp.role === 'MANAGER' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded">
                            MGR
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">{emp.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{emp.department}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {emp.phone || emp.position || 'Staff'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {emp.office ? (
                        <div>
                          <div className="font-medium text-slate-800">{emp.office.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">Radius: {emp.office.radius_meters}m</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No Office</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {emp.shift ? (
                        <div>
                          <div className="font-medium text-slate-800">{emp.shift.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {emp.shift.start_time} - {emp.shift.end_time}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No Shift</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      <span className="font-bold text-slate-800">{emp.annual_leave_quota}</span>
                      <span className="text-slate-400 text-[10px]"> / used {emp.annual_leave_used}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          emp.is_wfh_allowed
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {emp.is_wfh_allowed ? 'Remote' : 'On-Site'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center space-x-1">
                        <button
                          onClick={() => {
                            setSelectedEditEmployee(emp);
                            setIsEditModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1 shadow-2xs transition-colors"
                          title="Edit Employee Profile"
                        >
                          <Edit2 className="w-3 h-3 text-slate-500" />
                          <span>Edit</span>
                        </button>

                        {emp.is_active === false ? (
                          <button
                            onClick={() => handleRestoreEmployee(emp.id, emp.full_name)}
                            disabled={savingId === emp.id}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1 transition-colors"
                            title="Pulihkan Karyawan"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Pulihkan</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleArchiveEmployee(emp.id, emp.full_name)}
                            disabled={savingId === emp.id || emp.email === 'admin@company.com'}
                            className="p-1 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 disabled:opacity-30 transition-colors"
                            title="Arsipkan Karyawan"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteEmployee(emp.id, emp.full_name)}
                          disabled={savingId === emp.id || emp.email === 'admin@company.com'}
                          title={emp.email === 'admin@company.com' ? 'Primary admin cannot be deleted' : 'Hapus Permanen'}
                          className="p-1 text-slate-300 hover:text-rose-600 disabled:opacity-20 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: Office Locations & Geofence Radius */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-sm text-slate-900">Offices & Geofencing Perimeter</h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                  {offices.length} Branch Hubs
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Adjust office coordinates and GPS validation radius for clock-in perimeter verification
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsAddOfficeModalOpen(true)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Branch Office</span>
            </button>
            <button
              onClick={() => loadData()}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
              title="Refresh Settings"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4 divide-y divide-slate-100">
          {offices.map((office) => (
            <div key={office.id} className="pt-4 first:pt-0 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  <span className="font-semibold text-xs text-slate-900">{office.name}</span>
                  <span className="text-[10px] font-mono text-slate-400">ID: {office.id.slice(-6)}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => handleSaveOffice(office)}
                    disabled={savingId === office.id}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                      successId === office.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    {savingId === office.id ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : successId === office.id ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Save className="w-3 h-3" />
                    )}
                    <span>{successId === office.id ? 'Saved' : 'Save Office'}</span>
                  </button>
                  <button
                    onClick={() => handleDeleteOffice(office.id, office.name)}
                    disabled={savingId === office.id}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                    title="Delete Office"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">Office Name</label>
                  <input
                    type="text"
                    value={office.name}
                    onChange={(e) => handleOfficeChange(office.id, 'name', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={office.latitude}
                    onChange={(e) => handleOfficeChange(office.id, 'latitude', parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={office.longitude}
                    onChange={(e) => handleOfficeChange(office.id, 'longitude', parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">
                    Geofence Radius (Meters)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="10000"
                    value={office.radius_meters}
                    onChange={(e) =>
                      handleOfficeChange(office.id, 'radius_meters', parseInt(e.target.value) || 50)
                    }
                    className="w-full px-2.5 py-1.5 text-xs font-mono font-semibold rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3: Work Shifts & Grace Periods */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center space-x-2.5 bg-slate-50/50">
          <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-900">Work Shifts & Grace Periods</h3>
            <p className="text-xs text-slate-500">
              Configure shift hours, arrival windows, and late penalty buffer minutes
            </p>
          </div>
        </div>

        <div className="p-5 space-y-4 divide-y divide-slate-100">
          {shifts.map((shift) => (
            <div key={shift.id} className="pt-4 first:pt-0 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-xs text-slate-900">{shift.name}</span>
                  <span className="text-[10px] font-mono text-slate-400">ID: {shift.id.slice(-6)}</span>
                </div>
                <button
                  onClick={() => handleSaveShift(shift)}
                  disabled={savingId === shift.id}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                    successId === shift.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {savingId === shift.id ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : successId === shift.id ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Save className="w-3 h-3" />
                  )}
                  <span>{successId === shift.id ? 'Saved' : 'Save Shift'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">Shift Name</label>
                  <input
                    type="text"
                    value={shift.name}
                    onChange={(e) => handleShiftChange(shift.id, 'name', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">
                    Start Time (HH:mm)
                  </label>
                  <input
                    type="text"
                    pattern="^([01]\d|2[0-3]):([0-5]\d)$"
                    placeholder="09:00"
                    value={shift.start_time}
                    onChange={(e) => handleShiftChange(shift.id, 'start_time', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">
                    End Time (HH:mm)
                  </label>
                  <input
                    type="text"
                    pattern="^([01]\d|2[0-3]):([0-5]\d)$"
                    placeholder="18:00"
                    value={shift.end_time}
                    onChange={(e) => handleShiftChange(shift.id, 'end_time', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">
                    Grace Period (Minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={shift.grace_period_minutes}
                    onChange={(e) =>
                      handleShiftChange(shift.id, 'grace_period_minutes', parseInt(e.target.value) || 0)
                    }
                    className="w-full px-2.5 py-1.5 text-xs font-mono font-semibold rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL: Register New Employee */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-900">Add New Employee</h3>
                  <p className="text-[11px] text-slate-500">Create a user record with shift and office rules</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-medium text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Budi Santoso"
                  value={newEmpName}
                  onChange={(e) => setNewEmpName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-700 block mb-1">
                  Instansi / Perusahaan (Company)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pusat Grosir Eceran (PGE)"
                  value={newEmpCompanyName}
                  onChange={(e) => setNewEmpCompanyName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Nama instansi ini akan otomatis muncul pada Digital ID Card pegawai saat diterbitkan.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-700 block mb-1">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="budi@company.com"
                    value={newEmpEmail}
                    onChange={(e) => setNewEmpEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-700 block mb-1">Initial Password</label>
                  <input
                    type="text"
                    required
                    value={newEmpPassword}
                    onChange={(e) => setNewEmpPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-700 block mb-1">Department</label>
                  <input
                    type="text"
                    placeholder="Engineering / Sales / HR"
                    value={newEmpDept}
                    onChange={(e) => setNewEmpDept(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-700 block mb-1">Role</label>
                  <select
                    value={newEmpRole}
                    onChange={(e) => setNewEmpRole(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  >
                    <option value="EMPLOYEE">Employee</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-700 block mb-1">Job Title / Position</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Software Engineer"
                    value={newEmpPosition}
                    onChange={(e) => setNewEmpPosition(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-700 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+62 812-xxxx-xxxx"
                    value={newEmpPhone}
                    onChange={(e) => setNewEmpPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-700 block mb-1">Join Date</label>
                  <input
                    type="date"
                    value={newEmpJoinDate}
                    onChange={(e) => setNewEmpJoinDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-700 block mb-1">Annual Leave Quota</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={newEmpQuota}
                    onChange={(e) => setNewEmpQuota(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-700 block mb-1">Assigned Office</label>
                  <select
                    value={newEmpOfficeId}
                    onChange={(e) => setNewEmpOfficeId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  >
                    <option value="">No Office Assigned</option>
                    {offices.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.radius_meters}m)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-700 block mb-1">Assigned Shift</label>
                  <select
                    value={newEmpShiftId}
                    onChange={(e) => setNewEmpShiftId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  >
                    <option value="">No Shift Assigned</option>
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.start_time} - {s.end_time})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newEmpWfh}
                    onChange={(e) => setNewEmpWfh(e.target.checked)}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <span>Permit Remote / WFH Check-in (exempt from office geofence)</span>
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingEmployee}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                >
                  {isCreatingEmployee && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>Create Employee</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add New Branch Office */}
      {isAddOfficeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-900">Add Regional Branch Office</h3>
                  <p className="text-[11px] text-slate-500">Configure coordinates & geofence perimeter radius</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddOfficeModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOffice} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-medium text-slate-700 block mb-1">
                  Office / Hub Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Yogyakarta Regional Hub"
                  value={newOfficeName}
                  onChange={(e) => setNewOfficeName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* Coordinates with GPS auto-detect button */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-slate-700 block">
                    GPS Coordinates <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleDetectCurrentGps}
                    disabled={isDetectingGps}
                    className="text-[10px] text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded transition-colors"
                  >
                    <Navigation className={`w-3 h-3 ${isDetectingGps ? 'animate-spin' : ''}`} />
                    <span>{isDetectingGps ? 'Detecting...' : 'Detect Current GPS'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      type="number"
                      step="0.000001"
                      required
                      placeholder="Latitude (e.g. -7.7956)"
                      value={newOfficeLat}
                      onChange={(e) =>
                        setNewOfficeLat(e.target.value === '' ? '' : parseFloat(e.target.value))
                      }
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      step="0.000001"
                      required
                      placeholder="Longitude (e.g. 110.3695)"
                      value={newOfficeLng}
                      onChange={(e) =>
                        setNewOfficeLng(e.target.value === '' ? '' : parseFloat(e.target.value))
                      }
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-700 block mb-1">
                  Geofence Radius (Meters)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="10"
                    max="10000"
                    required
                    value={newOfficeRadius}
                    onChange={(e) => setNewOfficeRadius(parseInt(e.target.value) || 250)}
                    className="w-full px-3 py-2 text-xs font-mono font-semibold rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                  <span className="text-xs text-slate-500 font-mono shrink-0">meters</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Recommended: 150m – 300m to account for GPS drift inside multi-story office buildings.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOfficeModalOpen(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingOffice}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                >
                  {isCreatingOffice && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>Save Branch Office</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: Edit Employee Profile */}
      <EditEmployeeModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedEditEmployee(null);
        }}
        employee={selectedEditEmployee}
        offices={offices}
        shifts={shifts}
        onSaved={() => loadData(employeeStatusFilter)}
        onArchive={handleArchiveEmployee}
        onRestore={handleRestoreEmployee}
      />
    </div>
  );
}
