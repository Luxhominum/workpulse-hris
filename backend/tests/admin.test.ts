import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';

const app = createApp();

describe('Manager Admin Portal & Payroll Integration Tests', () => {
  let adminToken: string;
  let managerToken: string;
  let employeeToken: string;
  let createdLeaveId: string;

  beforeAll(async () => {
    // 1. Admin Login
    const adminRes = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@company.com',
      password: 'Password123!',
    });
    adminToken = adminRes.body.data.token;

    // 2. Manager Login
    const mgrRes = await request(app).post('/api/v1/auth/login').send({
      email: 'manager@company.com',
      password: 'Password123!',
    });
    managerToken = mgrRes.body.data.token;

    // 3. Employee Login
    await prisma.employee.update({
      where: { email: 'john.doe@company.com' },
      data: { annual_leave_used: 0, annual_leave_quota: 12 },
    });

    const empRes = await request(app).post('/api/v1/auth/login').send({
      email: 'john.doe@company.com',
      password: 'Password123!',
    });
    employeeToken = empRes.body.data.token;
  });

  describe('Live Attendance Board Overview', () => {
    it('should deny employee access to admin overview (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/overview')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
    });

    it('should return live overview with metrics and records for Admin', async () => {
      const res = await request(app)
        .get('/api/v1/admin/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.metrics).toBeDefined();
      expect(res.body.data.metrics.total_employees).toBeGreaterThanOrEqual(2);
      expect(Array.isArray(res.body.data.records)).toBe(true);
    });

    it('should allow Manager to view live overview', async () => {
      const res = await request(app)
        .get('/api/v1/admin/overview')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Leave & Attendance Correction Workflow', () => {
    it('should fetch employee leave balance', async () => {
      const res = await request(app)
        .get('/api/v1/leaves/balance')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.annual_leave_quota).toBeDefined();
      expect(res.body.data.annual_leave_remaining).toBeDefined();
    });

    it('should allow employee to submit an attendance correction request', async () => {
      const res = await request(app)
        .post('/api/v1/leaves')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          type: 'CORRECTION',
          start_date: new Date().toISOString(),
          end_date: new Date().toISOString(),
          reason: 'Forgot to clock out due to emergency client meeting offsite',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PENDING');
      createdLeaveId = res.body.data.id;
    });

    it('should allow employee to submit sick leave with doctor certificate attachment', async () => {
      const dummyPdfBuffer = Buffer.from('%PDF-1.4 test surat sakit');
      const res = await request(app)
        .post('/api/v1/leaves')
        .set('Authorization', `Bearer ${employeeToken}`)
        .field('type', 'SICK')
        .field('start_date', new Date().toISOString())
        .field('end_date', new Date().toISOString())
        .field('reason', 'Demam tinggi dan flu, istirahat dokter 1 hari')
        .attach('attachment', dummyPdfBuffer, 'surat_dokter.pdf');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.type).toBe('SICK');
      expect(res.body.data.attachment_url).toContain('surat_dokter.pdf');
    });

    it('should deduct leave balance when manager approves annual leave', async () => {
      // 1. Get initial balance
      const balBefore = await request(app)
        .get('/api/v1/leaves/balance')
        .set('Authorization', `Bearer ${employeeToken}`);
      const initialUsed = balBefore.body.data.annual_leave_used;

      // 2. Submit 1-day annual leave (Monday)
      const submitRes = await request(app)
        .post('/api/v1/leaves')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          type: 'ANNUAL',
          start_date: '2026-10-26T00:00:00.000Z',
          end_date: '2026-10-26T00:00:00.000Z',
          reason: 'Family gathering event',
        });

      expect(submitRes.status).toBe(201);
      const annualLeaveId = submitRes.body.data.id;

      // 3. Manager approves
      const approveRes = await request(app)
        .patch(`/api/v1/leaves/${annualLeaveId}/approve`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(approveRes.status).toBe(200);

      // 4. Verify balance incremented
      const balAfter = await request(app)
        .get('/api/v1/leaves/balance')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(balAfter.body.data.annual_leave_used).toBe(initialUsed + 1);
    });

    it('should allow manager to reject personal leave with rejection reason', async () => {
      const submitRes = await request(app)
        .post('/api/v1/leaves')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          type: 'PERSONAL',
          start_date: new Date().toISOString(),
          end_date: new Date().toISOString(),
          reason: 'Urgent personal matters',
        });

      const personalLeaveId = submitRes.body.data.id;

      const rejectRes = await request(app)
        .patch(`/api/v1/leaves/${personalLeaveId}/reject`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ rejection_reason: 'High workload day, please reschedule' });

      expect(rejectRes.status).toBe(200);
      expect(rejectRes.body.data.status).toBe('REJECTED');
      expect(rejectRes.body.data.rejection_reason).toBe('High workload day, please reschedule');
    });

    it('should list pending requests for Manager', async () => {
      const res = await request(app)
        .post('/api/v1/leaves')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          type: 'CORRECTION',
          start_date: new Date().toISOString(),
          end_date: new Date().toISOString(),
          reason: 'Forgot to clock out due to emergency client meeting offsite',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PENDING');
      createdLeaveId = res.body.data.id;
    });

    it('should list pending requests for Manager', async () => {
      const res = await request(app)
        .get('/api/v1/leaves/pending')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const target = res.body.data.find((l: any) => l.id === createdLeaveId);
      expect(target).toBeDefined();
    });

    it('should allow Manager to approve correction request', async () => {
      const res = await request(app)
        .patch(`/api/v1/leaves/${createdLeaveId}/approve`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('APPROVED');
    });
  });

  describe('Monthly Payroll Summary & Export', () => {
    it('should calculate monthly payroll summary with aggregated metrics', async () => {
      const res = await request(app)
        .get('/api/v1/admin/payroll/summary?month=10&year=2026')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.period.expected_working_days).toBeGreaterThan(0);
      expect(Array.isArray(res.body.data.summary)).toBe(true);

      const johnSummary = res.body.data.summary.find(
        (s: any) => s.email === 'john.doe@company.com'
      );
      expect(johnSummary).toBeDefined();
      expect(johnSummary.total_days_expected).toBeDefined();
    });

    it('should export payroll as CSV with proper headers', async () => {
      const res = await request(app)
        .get('/api/v1/admin/payroll/export?month=10&year=2026&format=csv')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.text).toContain('Employee ID');
      expect(res.text).toContain('Full Name');
      expect(res.text).toContain('john.doe@company.com');
    });

    it('should export payroll as XLSX binary spreadsheet', async () => {
      const res = await request(app)
        .get('/api/v1/admin/payroll/export?month=10&year=2026&format=xlsx')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      expect(res.body).toBeDefined();
    });
  });

  describe('Manual Attendance Adjustment by Admin', () => {
    it('should require a reason when manually adjusting attendance', async () => {
      const emp = await prisma.employee.findUnique({ where: { email: 'john.doe@company.com' } });
      const res = await request(app)
        .post('/api/v1/admin/attendance/adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employee_id: emp!.id,
          date: '2026-10-21',
          clock_in_time: '2026-10-21T08:30:00.000Z',
          clock_out_time: '2026-10-21T17:15:00.000Z',
          status: 'ON_TIME',
          reason: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Alasan koreksi absensi wajib diisi');
    });

    it('should successfully create/update attendance with manual adjustment flag and reason', async () => {
      const emp = await prisma.employee.findUnique({ where: { email: 'john.doe@company.com' } });
      const res = await request(app)
        .post('/api/v1/admin/attendance/adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employee_id: emp!.id,
          date: '2026-10-21',
          clock_in_time: '2026-10-21T08:30:00.000Z',
          clock_out_time: '2026-10-21T17:15:00.000Z',
          status: 'ON_TIME',
          reason: 'Lupa clock in karena jaringan mati di lokasi proyek',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.is_manual_adjustment).toBe(true);
      expect(res.body.data.adjustment_reason).toBe('Lupa clock in karena jaringan mati di lokasi proyek');

      // Verify in getLiveOverview
      const overview = await request(app)
        .get('/api/v1/admin/overview?date=2026-10-21')
        .set('Authorization', `Bearer ${adminToken}`);

      const record = overview.body.data.records.find((r: any) => r.employee_id === emp!.id);
      expect(record).toBeDefined();
      expect(record.is_manual_adjustment).toBe(true);
      expect(record.adjustment_reason).toBe('Lupa clock in karena jaringan mati di lokasi proyek');
    });
  });

  describe('Employee Archiving & Lifecycle Management', () => {
    let testEmpId: string;

    it('should create an active employee, archive them, and reject login', async () => {
      // 1. Create a test employee
      const createRes = await request(app)
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          full_name: 'Archive Test Subject',
          email: 'archive.test@company.com',
          password: 'Password123!',
          role: 'EMPLOYEE',
          department: 'Operations',
          position: 'Field Staff',
        });

      expect(createRes.status).toBe(201);
      testEmpId = createRes.body.data.id;
      expect(createRes.body.data.is_active).toBe(true);

      // 2. Verify login succeeds when active
      const loginBefore = await request(app).post('/api/v1/auth/login').send({
        email: 'archive.test@company.com',
        password: 'Password123!',
      });
      expect(loginBefore.status).toBe(200);

      // 3. Archive employee
      const archiveRes = await request(app)
        .patch(`/api/v1/employees/${testEmpId}/archive`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(archiveRes.status).toBe(200);
      expect(archiveRes.body.data.is_active).toBe(false);
      expect(archiveRes.body.data.archived_at).toBeDefined();

      // 4. Verify login is blocked with 403 Forbidden
      const loginAfter = await request(app).post('/api/v1/auth/login').send({
        email: 'archive.test@company.com',
        password: 'Password123!',
      });
      expect(loginAfter.status).toBe(403);
      expect(loginAfter.body.message).toContain('dinonaktifkan atau diarsipkan');

      // 5. Restore employee
      const restoreRes = await request(app)
        .patch(`/api/v1/employees/${testEmpId}/restore`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(restoreRes.status).toBe(200);
      expect(restoreRes.body.data.is_active).toBe(true);

      // 6. Verify login succeeds again
      const loginRestored = await request(app).post('/api/v1/auth/login').send({
        email: 'archive.test@company.com',
        password: 'Password123!',
      });
      expect(loginRestored.status).toBe(200);

      // Clean up test employee
      await prisma.employee.delete({ where: { id: testEmpId } });
    });
  });
});
