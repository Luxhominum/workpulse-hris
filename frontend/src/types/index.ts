export type Role = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';

export type AttendanceStatus =
  | 'ON_TIME'
  | 'LATE'
  | 'WFH'
  | 'OUT_OF_OFFICE'
  | 'HADIR_BUKAN_HARI_KERJA'
  | 'LIBUR'
  | 'ABSENT'
  | 'LEAVE'
  | 'CUTI';

export type LeaveType = 'SICK' | 'ANNUAL' | 'PERSONAL' | 'DUTY' | 'CORRECTION' | 'UNPAID';

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Office {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  _count?: {
    employees: number;
  };
}

export interface Shift {
  id: string;
  name: string;
  start_time: string; // "HH:mm"
  end_time: string;   // "HH:mm"
  grace_period_minutes: number;
  _count?: {
    employees: number;
  };
}

export interface Employee {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  department: string;
  position: string;
  phone?: string | null;
  join_date?: string | null;
  annual_leave_quota: number;
  annual_leave_used: number;
  is_wfh_allowed: boolean;
  is_active?: boolean;
  archived_at?: string | null;
  office_id: string | null;
  shift_id: string | null;
  company_id?: string | null;
  company?: {
    id: string;
    name: string;
    slug?: string;
    logo_url?: string | null;
  } | null;
  office?: Office | null;
  shift?: Shift | null;
  // Team PGE Comprehensive Profile Fields
  employee_id_number?: string | null;
  nickname?: string | null;
  birth_place?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  marital_status?: string | null;
  children_count?: number | null;
  blood_type?: string | null;
  religion?: string | null;
  ktp_number?: string | null;
  kk_number?: string | null;
  emergency_contact_phone?: string | null;
  address?: string | null;
  bank_uob?: string | null;
  bank_other?: string | null;
  contract_signed_date?: string | null;
  employment_status?: string | null;
  work_history?: string | null;
  disc_work?: string | null;
  disc_home?: string | null;
  vak?: string | null;
  iq_score?: string | null;
  iq_eling_healing?: string | null;
  stifin?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  clock_in_time: string;
  clock_out_time: string | null;
  clock_in_lat: number;
  clock_in_lng: number;
  clock_in_photo_url: string;
  clock_out_photo_url: string | null;
  status: AttendanceStatus | string;
  late_minutes: number;
  is_within_perimeter?: boolean;
  is_manual_adjustment?: boolean;
  adjustment_reason?: string | null;
  day_type?: string;
  employee?: {
    full_name: string;
    email: string;
    position?: string;
    shift?: Shift;
    office?: Office;
  };
}

export interface TodayAttendanceResponse {
  success: boolean;
  data: AttendanceRecord | null;
}

export interface ClockInResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    date: string;
    clock_in_time: string;
    status: AttendanceStatus;
    late_minutes: number;
    clock_in_photo_url: string;
    distance_to_office_meters: number;
    is_within_perimeter: boolean;
    office_name: string;
  };
}

export interface ClockOutResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    clock_in_time: string;
    clock_out_time: string;
    status: AttendanceStatus;
    late_minutes: number;
    clock_out_photo_url: string | null;
  };
}

// Milestone 4: Admin & Payroll Types
export interface AttendanceAuditRow {
  employee_id: string;
  full_name: string;
  email: string;
  department: string;
  position: string;
  role: string;
  office_name: string;
  shift_name: string;
  shift_hours: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  status: 'ON_TIME' | 'LATE' | 'WFH' | 'OUT_OF_OFFICE' | 'ABSENT' | 'ON_LEAVE' | 'HADIR_BUKAN_HARI_KERJA' | 'LIBUR';
  late_minutes: number;
  clock_in_lat: number | null;
  clock_in_lng: number | null;
  clock_in_photo_url: string | null;
  clock_out_photo_url: string | null;
  leave_reason?: string;
  is_manual_adjustment?: boolean;
  adjustment_reason?: string | null;
  day_type?: 'WORKDAY' | 'OFF_DAY';
  attendance_record_id?: string | null;
}

export interface LiveOverviewData {
  date: string;
  is_workday?: boolean;
  metrics: {
    total_employees: number;
    present_today: number;
    late_today: number;
    absent_today: number;
    on_leave_today: number;
    off_today?: number;
    weekend_attendance_today?: number;
  };
  records: AttendanceAuditRow[];
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  type: LeaveType;
  start_date: string;
  end_date: string;
  reason: string;
  attachment_url?: string | null;
  rejection_reason?: string | null;
  status: LeaveStatus;
  approved_by_id: string | null;
  approved_at: string | null;
  created_at: string;
  employee: {
    id: string;
    full_name: string;
    email: string;
    department: string;
    position?: string;
    phone?: string | null;
    shift?: Shift;
    annual_leave_quota?: number;
    annual_leave_used?: number;
  };
}

export interface LeaveBalance {
  annual_leave_quota: number;
  annual_leave_used: number;
  annual_leave_remaining: number;
}

export type OvertimeStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface OvertimeRequest {
  id: string;
  employee_id: string;
  employee?: {
    id: string;
    full_name: string;
    nickname?: string;
    employee_id_number?: string;
    department: string;
    position?: string;
  };
  date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  reason: string;
  status: OvertimeStatus;
  approved_by?: string | null;
  approval_note?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayrollRow {
  employee_id: string;
  employee_id_number?: string | null;
  full_name: string;
  email: string;
  phone?: string | null;
  department: string;
  position?: string;
  shift_name: string;
  bank_uob?: string | null;
  bank_other?: string | null;
  total_days_expected: number;
  total_days_present: number;
  total_late_instances: number;
  total_late_minutes: number;
  total_sick_leaves: number;
  total_annual_leaves: number;
  total_unpaid_leaves: number;
  total_duty_leaves?: number;
  annual_leave_quota?: number;
  annual_leave_used?: number;
  total_overtime_hours: number;
}

export interface PayrollSummaryData {
  period: {
    year: number;
    month: number;
    expected_working_days: number;
  };
  readiness?: {
    is_ready: boolean;
    pending_leaves: number;
    pending_overtimes: number;
    missing_clock_outs: number;
    total_anomalies: number;
  };
  totals?: {
    total_man_days_present: number;
    total_man_days_expected: number;
    total_overtime_hours: number;
    total_late_instances: number;
    total_late_minutes: number;
    total_leaves_taken: number;
  };
  summary: PayrollRow[];
}

export interface DailyTrendItem {
  date: string;
  day: number;
  day_name: string;
  is_workday: boolean;
  present: number;
  on_time: number;
  late: number;
  wfh: number;
  absent: number;
}

export interface DepartmentBreakdownItem {
  department: string;
  total_employees: number;
  total_present: number;
  attendance_rate: number;
  on_time_count?: number;
  total_late_count: number;
  total_late_minutes: number;
  wfh_count: number;
  health_score?: number;
  health_status?: 'EXCELLENT' | 'GOOD' | 'NEEDS_ATTENTION' | 'CRITICAL';
}

export interface RankedEmployee {
  id: string;
  name: string;
  department: string;
  position: string;
  days_present: number;
  on_time_count: number;
  late_count: number;
  late_minutes: number;
  phone?: string | null;
}

export interface MonthlyAnalyticsData {
  period: {
    year: number;
    month: number;
    expected_working_days: number;
    total_days_in_month: number;
  };
  summary: {
    total_employees: number;
    attendance_rate: number;
    on_time_rate: number;
    total_present_days: number;
    total_late_days: number;
    total_late_minutes: number;
    avg_late_minutes?: number;
    late_minor_count?: number;
    late_moderate_count?: number;
    late_severe_count?: number;
    total_early_departure_days?: number;
    total_early_departure_minutes?: number;
    total_wfh_days: number;
    total_work_hours: number;
    total_approved_leaves: number;
    total_alpha_days?: number;
    alpha_rate?: number;
    peak_late_day?: string;
  };
  daily_trends: DailyTrendItem[];
  department_breakdown: DepartmentBreakdownItem[];
  top_punctual: RankedEmployee[];
  top_late: RankedEmployee[];
}

export interface MatrixDayMeta {
  dayNumber: number;
  dateStr: string;
  dayName: string;
  isWeekend: boolean;
}

export interface MatrixDayCell {
  code: string;
  label: string;
  detail?: string;
}

export interface MatrixEmployeeSummary {
  present_count: number;
  on_time_count: number;
  late_count: number;
  late_minutes: number;
  sick_count: number;
  izin_count: number;
  cuti_count: number;
  alpa_count: number;
  off_count: number;
  total_work_hours: number;
  attendance_percentage: number;
}

export interface MatrixEmployeeRow {
  employee_id: string;
  employee_id_number: string;
  full_name: string;
  nickname: string;
  department: string;
  position: string;
  shift_name: string;
  days: {
    [day: number]: MatrixDayCell;
  };
  summary: MatrixEmployeeSummary;
}

export interface AttendanceMatrixData {
  period: {
    year: number;
    month: number;
    month_name: string;
    expected_working_days: number;
    total_days_in_month: number;
    department_filter: string;
  };
  days: MatrixDayMeta[];
  rows: MatrixEmployeeRow[];
}

export interface KioskEmployee {
  id: string;
  employee_id_number: string;
  full_name: string;
  nickname: string;
  department: string;
  position: string;
  shift: {
    id: string | null;
    name: string;
    start_time: string;
    end_time: string;
  };
  office_name: string;
  today_status: 'NOT_CLOCKED_IN' | 'CLOCKED_IN' | 'CLOCKED_OUT';
  clock_in_time: string | null;
  clock_out_time: string | null;
  late_minutes: number;
  status_label: string | null;
  has_pin: boolean;
}

export interface KioskInitData {
  server_time: string;
  offices: Office[];
  selected_office: Office;
  employees: KioskEmployee[];
}

export interface KioskAttendanceResult {
  record_id: string;
  employee_name: string;
  nickname: string;
  department: string;
  clock_in_time?: string;
  clock_out_time?: string;
  status?: string;
  status_text?: string;
  photo_url: string;
  message: string;
}

export interface ClientVisit {
  id: string;
  company_id?: string | null;
  employee_id: string;
  employee?: {
    id: string;
    full_name: string;
    nickname?: string | null;
    department: string;
    position: string;
    employee_id_number?: string | null;
  };
  client_name: string;
  client_address?: string | null;
  contact_person?: string | null;
  contact_phone?: string | null;
  check_in_time: string;
  check_out_time?: string | null;
  duration_minutes?: number | null;
  latitude: number;
  longitude: number;
  photo_url: string;
  visit_purpose: string;
  notes?: string | null;
  order_amount?: number | null;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
  updated_at: string;
}

export interface MyVisitsResponse {
  date: string;
  total_visits: number;
  total_closing: number;
  visits: ClientVisit[];
}

export interface AuditLogItem {
  id: string;
  actor_id?: string | null;
  actor_name: string;
  actor_email?: string | null;
  actor_role?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  description: string;
  old_values?: string | null;
  new_values?: string | null;
  created_at: string;
}

export interface AuditLogsResponse {
  logs: AuditLogItem[];
  total: number;
}

export interface AdminVisitsOverviewResponse {
  date: string;
  metrics: {
    total_visits: number;
    completed_visits: number;
    in_progress_visits: number;
    total_closing_amount: number;
  };
  visits: ClientVisit[];
}

export interface AuditLogItem {
  id: string;
  actor_id?: string | null;
  actor_name: string;
  actor_email?: string | null;
  actor_role?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  description: string;
  old_values?: string | null;
  new_values?: string | null;
  created_at: string;
}

export interface AuditLogsResponse {
  logs: AuditLogItem[];
  total: number;
}
