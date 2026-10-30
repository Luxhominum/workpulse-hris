import {
  Employee,
  Office,
  Shift,
  AttendanceRecord,
  TodayAttendanceResponse,
  ClockInResponse,
  ClockOutResponse,
  LiveOverviewData,
  LeaveRequest,
  LeaveBalance,
  PayrollSummaryData,
  AttendanceMatrixData,
  KioskInitData,
  KioskAttendanceResult,
  OvertimeRequest,
  LeaveStatus,
  ClientVisit,
  MyVisitsResponse,
  AdminVisitsOverviewResponse,
} from '../types';

export class ApiClient {
  private static TOKEN_KEY = 'hris_auth_token';
  private static BASE_URL_KEY = 'hris_api_base_url';

  public static getBaseUrl(): string {
    if (typeof window !== 'undefined') {
      const custom = localStorage.getItem(this.BASE_URL_KEY);
      if (custom) return custom.replace(/\/$/, '');
      // If running inside Capacitor (native Android/iOS)
      const isCapacitor = !!(window as any).Capacitor;
      if (isCapacitor) {
        return process.env.NEXT_PUBLIC_API_URL || 'https://nerve-knee-insurance-came.trycloudflare.com';
      }
    }
    return process.env.NEXT_PUBLIC_API_URL || 'https://nerve-knee-insurance-came.trycloudflare.com';
  }

  public static setBaseUrl(url: string): void {
    if (typeof window !== 'undefined') {
      if (!url.trim()) {
        localStorage.removeItem(this.BASE_URL_KEY);
      } else {
        localStorage.setItem(this.BASE_URL_KEY, url.trim().replace(/\/$/, ''));
      }
    }
  }

  public static getApiBase(): string {
    const base = this.getBaseUrl();
    return base ? `${base}/api/v1` : '/api/v1';
  }

  public static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }

  public static setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.TOKEN_KEY, token);
    }
  }

  public static clearToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.TOKEN_KEY);
    }
  }

  private static getHeaders(isMultipart = false): HeadersInit {
    const headers: Record<string, string> = {
      'Bypass-Tunnel-Reminder': 'true',
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (!isMultipart) {
      headers['Content-Type'] = 'application/json';
    }
    return headers;
  }

  /**
   * Adaptive fetch with timeout to protect against hanging sockets on weak 2G/3G connections
   */
  public static async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs = 12000
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('TIMEOUT_WEAK_SIGNAL: Waktu permintaan habis karena sinyal lemah. Sistem mengalihkan ke antrean offline.');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  public static async login(email: string, password: string): Promise<{ token: string; user: Employee }> {
    const res = await fetch(`${this.getApiBase()}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': 'true' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Login failed');
    }

    this.setToken(data.data.token);
    return data.data;
  }


  public static async getMe(): Promise<Employee> {
    const res = await fetch(`${this.getApiBase()}/auth/me`, {
      headers: this.getHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to fetch user profile');
    }

    return data.data;
  }


  public static async getTodayAttendance(): Promise<AttendanceRecord | null> {
    const res = await fetch(`${this.getApiBase()}/attendance/today`, {
      headers: this.getHeaders(),
    });

    const data: TodayAttendanceResponse = await res.json();
    if (!res.ok) {
      throw new Error((data as any).message || 'Failed to fetch today attendance');
    }

    return data.data;
  }


  public static async getMyHistory(limit = 60, month?: string): Promise<AttendanceRecord[]> {
    let url = `${this.getApiBase()}/attendance/my-history?limit=${limit}`;
    if (month) {
      url += `&month=${encodeURIComponent(month)}`;
    }
    const res = await fetch(url, {
      headers: this.getHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to fetch attendance history');
    }

    return data.data;
  }

  public static async getMyPayslip(year?: number, month?: number): Promise<any> {
    const now = new Date();
    const y = year || now.getFullYear();
    const m = month || now.getMonth() + 1;
    const res = await fetch(`${this.getApiBase()}/attendance/my-payslip?year=${y}&month=${m}`, {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Gagal memuat slip gaji');
    }
    return data.data;
  }

  public static async clockIn(
    latitude: number,
    longitude: number,
    photoBlob: Blob,
    options?: { clientTimestamp?: string; idempotencyKey?: string }
  ): Promise<ClockInResponse['data']> {
    const formData = new FormData();
    formData.append('latitude', latitude.toString());
    formData.append('longitude', longitude.toString());
    formData.append('photo', photoBlob, 'clockin_selfie.webp');
    if (options?.idempotencyKey) {
      formData.append('idempotency_key', options.idempotencyKey);
    }
    if (options?.clientTimestamp) {
      formData.append('client_timestamp', options.clientTimestamp);
    }

    const res = await this.fetchWithTimeout(`${this.getApiBase()}/attendance/clock-in`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: formData,
    }, 12000);

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Clock-in failed');
    }

    return data.data;
  }


  public static async clockOut(
    latitude: number,
    longitude: number,
    photoBlob?: Blob,
    options?: { clientTimestamp?: string; idempotencyKey?: string }
  ): Promise<ClockOutResponse['data']> {
    const formData = new FormData();
    formData.append('latitude', latitude.toString());
    formData.append('longitude', longitude.toString());
    if (photoBlob) {
      formData.append('photo', photoBlob, 'clockout_selfie.webp');
    }
    if (options?.idempotencyKey) {
      formData.append('idempotency_key', options.idempotencyKey);
    }
    if (options?.clientTimestamp) {
      formData.append('client_timestamp', options.clientTimestamp);
    }

    const res = await this.fetchWithTimeout(`${this.getApiBase()}/attendance/clock-out`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: formData,
    }, 12000);

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Clock-out failed');
    }

    return data.data;
  }


  // --- Milestone 4: Admin Portal & Payroll ---

  public static async getLiveOverview(date?: string): Promise<LiveOverviewData> {
    const url = date ? `${this.getApiBase()}/admin/overview?date=${date}` : `${this.getApiBase()}/admin/overview`;
    const res = await fetch(url, {
      headers: this.getHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to load live overview');
    }

    return data.data;
  }


  // --- Leave, Permit & Correction System ---

  public static async createLeave(input: {
    type: string;
    start_date: string;
    end_date: string;
    reason: string;
    attachment?: File | Blob | null;
  }): Promise<LeaveRequest> {
    const formData = new FormData();
    formData.append('type', input.type);
    formData.append('start_date', input.start_date);
    formData.append('end_date', input.end_date);
    formData.append('reason', input.reason);

    if (input.attachment) {
      if (input.attachment instanceof File) {
        formData.append('attachment', input.attachment, input.attachment.name);
      } else {
        formData.append('attachment', input.attachment, 'attachment.jpg');
      }
    }

    const res = await fetch(`${this.getApiBase()}/leaves`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to submit leave request');
    }

    return data.data;
  }


  public static async getMyLeaves(): Promise<LeaveRequest[]> {
    const res = await fetch(`${this.getApiBase()}/leaves/my`, {
      headers: this.getHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to fetch personal leave requests');
    }

    return data.data;
  }


  public static async getMyLeaveBalance(): Promise<LeaveBalance> {
    const res = await fetch(`${this.getApiBase()}/leaves/balance`, {
      headers: this.getHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to fetch leave balance');
    }

    return data.data;
  }


  public static async getPendingLeaves(): Promise<LeaveRequest[]> {
    const res = await fetch(`${this.getApiBase()}/leaves/pending`, {
      headers: this.getHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to fetch pending requests');
    }

    return data.data;
  }


  public static async getAllLeaves(status?: string): Promise<LeaveRequest[]> {
    const url = status && status !== 'ALL'
      ? `${this.getApiBase()}/leaves?status=${status}`
      : `${this.getApiBase()}/leaves`;
    const res = await fetch(url, {
      headers: this.getHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to fetch leave requests');
    }

    return data.data;
  }


  public static async adminCreateLeave(formData: FormData): Promise<any> {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${this.getApiBase()}/leaves/admin-create`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to create leave request');
    }

    return data.data;
  }


  public static async approveLeave(id: string): Promise<void> {
    const res = await fetch(`${this.getApiBase()}/leaves/${id}/approve`, {
      method: 'PATCH',
      headers: this.getHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to approve request');
    }
  }

  public static async rejectLeave(id: string, reason?: string): Promise<void> {
    const res = await fetch(`${this.getApiBase()}/leaves/${id}/reject`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ rejection_reason: reason }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to reject request');
    }
  }

  public static async getPayrollSummary(year: number, month: number): Promise<PayrollSummaryData> {
    const res = await fetch(`${this.getApiBase()}/admin/payroll/summary?year=${year}&month=${month}`, {
      headers: this.getHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to load payroll summary');
    }

    return data.data;
  }


  public static getExportPayrollUrl(year: number, month: number, format: 'csv' | 'xlsx'): string {
    return `${this.getApiBase()}/admin/payroll/export?year=${year}&month=${month}&format=${format}`;
  }

  public static async getAttendanceMatrixData(
    year: number,
    month: number,
    department?: string
  ): Promise<AttendanceMatrixData> {
    const deptParam = department && department !== 'all' ? `&department=${encodeURIComponent(department)}` : '';
    const res = await fetch(`${this.getApiBase()}/admin/attendance/matrix-data?year=${year}&month=${month}${deptParam}`, {
      headers: this.getHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to load attendance matrix');
    }

    return data.data;
  }


  public static getExportAttendanceMatrixUrl(year: number, month: number, department?: string): string {
    const deptParam = department && department !== 'all' ? `&department=${encodeURIComponent(department)}` : '';
    return `${this.getApiBase()}/admin/attendance/export-matrix?year=${year}&month=${month}${deptParam}`;
  }

  // --- Kiosk / Shared Tablet Terminal ---

  public static async getKioskInit(officeId?: string): Promise<KioskInitData> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);
    try {
      const sep = officeId ? '&' : '?';
      const baseParam = officeId ? `office_id=${encodeURIComponent(officeId)}` : '';
      const query = `${baseParam}${sep}_t=${Date.now()}`;
      const url = `${this.getApiBase()}/kiosk/init?${query}`;
      const res = await fetch(url, {
        signal: controller.signal,
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to initialize Kiosk data');
      return data.data;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  public static async kioskClockIn(
    employeeId: string,
    photoBlob: Blob,
    pin?: string,
    officeId?: string
  ): Promise<KioskAttendanceResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const formData = new FormData();
      formData.append('employee_id', employeeId);
      if (pin) formData.append('pin', pin);
      if (officeId) formData.append('office_id', officeId);
      formData.append('client_timestamp', new Date().toISOString());
      formData.append('photo', photoBlob, `kiosk_in_${employeeId}_${Date.now()}.jpg`);

      const res = await fetch(`${this.getApiBase()}/kiosk/clock-in`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to clock in at Kiosk');
      return data.data;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  public static async kioskClockOut(
    employeeId: string,
    photoBlob: Blob,
    pin?: string,
    officeId?: string
  ): Promise<KioskAttendanceResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const formData = new FormData();
      formData.append('employee_id', employeeId);
      if (pin) formData.append('pin', pin);
      if (officeId) formData.append('office_id', officeId);
      formData.append('client_timestamp', new Date().toISOString());
      formData.append('photo', photoBlob, `kiosk_out_${employeeId}_${Date.now()}.jpg`);

      const res = await fetch(`${this.getApiBase()}/kiosk/clock-out`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to clock out at Kiosk');
      return data.data;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  public static async verifyKioskAdminPin(pin: string): Promise<boolean> {
    const res = await fetch(`${this.getApiBase()}/kiosk/verify-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Invalid Kiosk Admin PIN');
    return data.success;
  }

  // --- Overtime / Surat Perintah Lembur (SPL) ---

  public static async createOvertimeRequest(data: {
    date: string;
    start_time: string;
    end_time: string;
    reason: string;
  }): Promise<{ success: boolean; data: OvertimeRequest; message: string }> {
    const res = await fetch(`${this.getApiBase()}/overtime`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Gagal mengajukan lembur');
    return result;
  }

  public static async getMyOvertimes(): Promise<OvertimeRequest[]> {
    const res = await fetch(`${this.getApiBase()}/overtime/my`, {
      headers: this.getHeaders(),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Gagal memuat riwayat lembur');
    return result.data;
  }

  public static async getAllOvertimes(status?: string, department?: string): Promise<OvertimeRequest[]> {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status);
    if (department && department !== 'all') params.append('department', department);
    const qs = params.toString() ? `?${params.toString()}` : '';

    const res = await fetch(`${this.getApiBase()}/overtime${qs}`, {
      headers: this.getHeaders(),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Gagal memuat daftar lembur');
    return result.data;
  }

  public static async approveOvertime(id: string, approval_note?: string): Promise<any> {
    const res = await fetch(`${this.getApiBase()}/overtime/${id}/approve`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ approval_note }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Gagal menyetujui pengajuan lembur');
    return result;
  }

  public static async rejectOvertime(id: string, reason: string): Promise<any> {
    const res = await fetch(`${this.getApiBase()}/overtime/${id}/reject`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ approval_note: reason }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Gagal menolak pengajuan lembur');
    return result;
  }

  public static async cancelOvertime(id: string): Promise<any> {
    const res = await fetch(`${this.getApiBase()}/overtime/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Gagal membatalkan pengajuan lembur');
    return result;
  }

  // --- Master Data & Workplace Settings ---

  public static async getOffices(): Promise<Office[]> {
    const res = await fetch(`${this.getApiBase()}/offices`, {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch offices');
    return data.data;
  }


  public static async createOffice(data: {
    name: string;
    latitude: number;
    longitude: number;
    radius_meters?: number;
  }): Promise<Office> {
    const res = await fetch(`${this.getApiBase()}/offices`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.message || 'Failed to create office');
    return resData.data;
  }

  public static async updateOffice(id: string, data: Partial<Office>): Promise<Office> {
    const res = await fetch(`${this.getApiBase()}/offices/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.message || 'Failed to update office');
    return resData.data;
  }

  public static async deleteOffice(id: string): Promise<void> {
    const res = await fetch(`${this.getApiBase()}/offices/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.message || 'Failed to delete office');
  }

  public static async getShifts(): Promise<Shift[]> {
    const res = await fetch(`${this.getApiBase()}/shifts`, {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch shifts');
    return data.data;
  }


  public static async createShift(data: Omit<Shift, 'id' | '_count'>): Promise<Shift> {
    const res = await fetch(`${this.getApiBase()}/shifts`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.message || 'Failed to create shift');
    return resData.data;
  }

  public static async updateShift(id: string, data: Partial<Shift>): Promise<Shift> {
    const res = await fetch(`${this.getApiBase()}/shifts/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.message || 'Failed to update shift');
    return resData.data;
  }

  public static async deleteShift(id: string): Promise<void> {
    const res = await fetch(`${this.getApiBase()}/shifts/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.message || 'Failed to delete shift');
  }

  public static async getEmployees(status: 'active' | 'archived' | 'all' = 'active'): Promise<Employee[]> {
    const res = await fetch(`${this.getApiBase()}/employees?status=${status}`, {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch employees');
    return data.data;
  }


  public static async updateEmployee(id: string, data: Partial<Employee> & { password?: string; company_name?: string | null }): Promise<Employee> {
    const res = await fetch(`${this.getApiBase()}/employees/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.message || 'Failed to update employee');
    return resData.data;
  }

  public static async archiveEmployee(id: string): Promise<Employee> {
    const res = await fetch(`${this.getApiBase()}/employees/${id}/archive`, {
      method: 'PATCH',
      headers: this.getHeaders(),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.message || 'Failed to archive employee');
    return resData.data;
  }

  public static async restoreEmployee(id: string): Promise<Employee> {
    const res = await fetch(`${this.getApiBase()}/employees/${id}/restore`, {
      method: 'PATCH',
      headers: this.getHeaders(),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.message || 'Failed to restore employee');
    return resData.data;
  }

  public static async adjustAttendance(data: {
    employee_id: string;
    date: string;
    clock_in_time: string | null;
    clock_out_time: string | null;
    status?: string;
    reason: string;
  }): Promise<any> {
    const res = await fetch(`${this.getApiBase()}/admin/attendance/adjust`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.message || 'Failed to adjust attendance');
    return resData.data;
  }

  public static async createEmployee(data: {
    email: string;
    password: string;
    full_name: string;
    role?: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
    department?: string;
    position?: string;
    phone?: string | null;
    join_date?: string | null;
    annual_leave_quota?: number;
    annual_leave_used?: number;
    company_id?: string | null;
    company_name?: string | null;
    office_id?: string | null;
    shift_id?: string | null;
    is_wfh_allowed?: boolean;
  }): Promise<Employee> {
    const res = await fetch(`${this.getApiBase()}/employees`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.message || 'Failed to create employee');
    return resData.data;
  }

  public static async deleteEmployee(id: string): Promise<void> {
    const res = await fetch(`${this.getApiBase()}/employees/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.message || 'Failed to delete employee');
  }

  public static async importEmployeesExcel(file?: File, filePath?: string): Promise<{
    success: boolean;
    message: string;
    data: {
      totalRows: number;
      createdCount: number;
      updatedCount: number;
      employees: Employee[];
    };
  }> {
    let res: Response;
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      res = await fetch(`${this.getApiBase()}/employees/import-excel`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: formData,
      });
    } else {
      res = await fetch(`${this.getApiBase()}/employees/import-excel`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ filePath: filePath || 'C:\\Users\\User\\Downloads\\Team PGE (1).xlsx' }),
      });
    }

    const resData = await res.json();
    if (!res.ok) throw new Error(resData.message || 'Failed to import Excel');
    return resData;
  }

  public static async getMonthlyAnalytics(
    year: number,
    month: number,
    department?: string
  ): Promise<any> {
    let url = `${this.getApiBase()}/admin/analytics?year=${year}&month=${month}`;
    if (department && department !== 'ALL') {
      url += `&department=${encodeURIComponent(department)}`;
    }
    const res = await fetch(url, {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to load analytics data');
    return data.data;
  }


  public static async getMonthlyRoster(year: number, month: number, department?: string): Promise<{
    year: number;
    month: number;
    shifts: Shift[];
    employees: Array<Employee & {
      shift_rosters: Array<{
        id: string;
        date: string;
        shift_id: string;
        notes?: string | null;
        shift: Shift;
      }>;
    }>;
  }> {
    let url = `${this.getApiBase()}/roster?year=${year}&month=${month}`;
    if (department && department !== 'ALL') {
      url += `&department=${encodeURIComponent(department)}`;
    }
    const res = await fetch(url, { headers: this.getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch roster');
    return data.data;
  }


  public static async assignRoster(payload: {
    employee_ids: string[];
    shift_id: string;
    start_date: string;
    end_date: string;
    notes?: string;
  }): Promise<any> {
    const res = await fetch(`${this.getApiBase()}/roster/assign`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to assign roster');
    return data;
  }

  public static async resetRoster(payload: { employee_id: string; date: string }): Promise<any> {
    const res = await fetch(`${this.getApiBase()}/roster/reset`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to reset roster');
    return data;
  }

  public static async getMyRosterSchedule(year: number, month: number): Promise<{
    year: number;
    month: number;
    defaultShift: Shift | null;
    rosterOverrides: Array<{
      id: string;
      date: string;
      shift_id: string;
      shift: Shift;
    }>;
  }> {
    const res = await fetch(`${this.getApiBase()}/roster/my-schedule?year=${year}&month=${month}`, {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch personal schedule');
    return data.data;
  }


  // --- Sales Canvasing & Field Visit Tracker ---

  public static async checkInVisit(formData: FormData): Promise<{ status: string; data: ClientVisit; message: string }> {
    const res = await this.fetchWithTimeout(`${this.getApiBase()}/visits/check-in`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: formData,
    }, 12000);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal melakukan check-in kunjungan');
    return data;
  }

  public static async checkOutVisit(
    visitId: string,
    payload: { notes?: string; order_amount?: number }
  ): Promise<{ status: string; data: ClientVisit; message: string }> {
    const res = await this.fetchWithTimeout(`${this.getApiBase()}/visits/${visitId}/check-out`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    }, 12000);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal melakukan check-out kunjungan');
    return data;
  }

  public static async getMyVisits(date?: string): Promise<MyVisitsResponse> {
    const query = date ? `?date=${encodeURIComponent(date)}` : '';
    const res = await fetch(`${this.getApiBase()}/visits/my-visits${query}`, {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal memuat riwayat kunjungan');
    return data.data;
  }


  public static async getAdminVisitsOverview(date?: string): Promise<AdminVisitsOverviewResponse> {
    const query = date ? `?date=${encodeURIComponent(date)}` : '';
    const res = await fetch(`${this.getApiBase()}/visits/admin/overview${query}`, {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal memuat overview sales canvasing');
    return data.data;
  }


  public static async adminCreateVisit(formData: FormData): Promise<{ status: string; data: ClientVisit; message: string }> {
    const res = await fetch(`${this.getApiBase()}/visits/admin/create`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal mencatat kunjungan sales');
    return data;
  }

  public static async adminDeleteVisit(visitId: string): Promise<void> {
    const res = await fetch(`${this.getApiBase()}/visits/admin/${visitId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal menghapus data kunjungan');
  }

  public static async getAuditLogs(params?: {
    search?: string;
    action?: string;
    entity_type?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: any[]; total: number }> {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.action && params.action !== 'ALL') q.append('action', params.action);
    if (params?.entity_type && params.entity_type !== 'ALL') q.append('entity_type', params.entity_type);
    if (params?.start_date) q.append('start_date', params.start_date);
    if (params?.end_date) q.append('end_date', params.end_date);
    if (params?.limit) q.append('limit', String(params.limit));
    if (params?.offset) q.append('offset', String(params.offset));

    const res = await fetch(`${this.getApiBase()}/audit-logs?${q.toString()}`, {
      headers: this.getHeaders(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Gagal memuat rekam audit');
    return json.data;
  }

  public static async exportAuditLogs(
    format: 'xlsx' | 'csv' = 'xlsx',
    filters?: { search?: string; action?: string; entity_type?: string }
  ): Promise<Blob> {
    const q = new URLSearchParams();
    q.append('format', format);
    if (filters?.search) q.append('search', filters.search);
    if (filters?.action && filters.action !== 'ALL') q.append('action', filters.action);
    if (filters?.entity_type && filters.entity_type !== 'ALL') q.append('entity_type', filters.entity_type);

    const res = await fetch(`${this.getApiBase()}/audit-logs/export?${q.toString()}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Gagal mengekspor berkas audit log');
    return res.blob();
  }

  public static async getMyNotifications(): Promise<{ notifications: any[]; unreadCount: number }> {
    const res = await fetch(`${this.getApiBase()}/notifications/my`, {
      headers: this.getHeaders(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Gagal memuat notifikasi');
    return json.data;
  }

  public static async markNotificationAsRead(id: string): Promise<void> {
    const res = await fetch(`${this.getApiBase()}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Gagal menandai notifikasi dibaca');
  }

  public static async markAllNotificationsAsRead(): Promise<void> {
    const res = await fetch(`${this.getApiBase()}/notifications/mark-all-read`, {
      method: 'PATCH',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Gagal menandai semua dibaca');
  }
}

/**
 * Resolves local upload paths to full HTTP URLs if running in mobile / remote environment,
 * and appends secure authentication token query for protected media streaming.
 */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('data:')) {
    return url;
  }
  let fullUrl = url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    const base = ApiClient.getBaseUrl();
    fullUrl = base ? `${base}${url.startsWith('/') ? '' : '/'}${url}` : url;
  }

  // Attach auth token for protected media streaming if token is available and not already appended
  const token = ApiClient.getToken();
  if (token && (fullUrl.includes('/uploads/') || fullUrl.includes('/api/v1/media/'))) {
    if (!fullUrl.includes('token=')) {
      const separator = fullUrl.includes('?') ? '&' : '?';
      fullUrl = `${fullUrl}${separator}token=${encodeURIComponent(token)}`;
    }
  }

  return fullUrl;
}
