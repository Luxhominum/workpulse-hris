import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('HRIS Core API Integration Tests', () => {
  let adminToken: string;
  let employeeToken: string;
  let createdOfficeId: string;
  let createdShiftId: string;
  let createdEmployeeId: string;

  beforeAll(async () => {
    // 1. Log in as Admin
    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@company.com',
        password: 'Password123!',
      });

    expect(adminLoginRes.status).toBe(200);
    expect(adminLoginRes.body.success).toBe(true);
    expect(adminLoginRes.body.data.token).toBeDefined();
    adminToken = adminLoginRes.body.data.token;

    // 2. Log in as Employee
    const empLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'john.doe@company.com',
        password: 'Password123!',
      });

    expect(empLoginRes.status).toBe(200);
    employeeToken = empLoginRes.body.data.token;
  });

  describe('Healthcheck & Routing', () => {
    it('should return 200 ok for healthcheck', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    it('should return 404 for unknown endpoints', async () => {
      const res = await request(app).get('/api/v1/non-existent-route');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Authentication & Profile', () => {
    it('should reject login with wrong password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@company.com',
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return profile for authenticated user via /me', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('admin@company.com');
      expect(res.body.data.role).toBe('ADMIN');
      expect(res.body.data.password_hash).toBeUndefined();
    });

    it('should block /me without authorization header', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Role-Based Access Control (RBAC)', () => {
    it('should deny employee from creating an office (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/offices')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          name: 'Unauthorized Branch',
          latitude: -6.2,
          longitude: 106.8,
          radius_meters: 50,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should deny employee from creating an employee profile (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          email: 'hacker@company.com',
          password: 'Password123!',
          full_name: 'Hacker',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('Offices CRUD (Admin)', () => {
    it('should create a new office as Admin', async () => {
      const res = await request(app)
        .post('/api/v1/offices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Surabaya Tech Hub',
          latitude: -7.2575,
          longitude: 112.7521,
          radius_meters: 75,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Surabaya Tech Hub');
      createdOfficeId = res.body.data.id;
    });

    it('should retrieve list of offices', async () => {
      const res = await request(app)
        .get('/api/v1/offices')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should update an office', async () => {
      const res = await request(app)
        .put(`/api/v1/offices/${createdOfficeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Surabaya Regional Office',
          radius_meters: 120,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Surabaya Regional Office');
      expect(res.body.data.radius_meters).toBe(120);
    });
  });

  describe('Shifts CRUD (Admin)', () => {
    it('should create a new shift', async () => {
      const res = await request(app)
        .post('/api/v1/shifts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Night Operations Shift',
          start_time: '20:00',
          end_time: '04:00',
          grace_period_minutes: 5,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Night Operations Shift');
      createdShiftId = res.body.data.id;
    });

    it('should reject invalid time format for shift', async () => {
      const res = await request(app)
        .post('/api/v1/shifts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Bad Shift',
          start_time: '25:99', // Invalid time
          end_time: '18:00',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Employees CRUD (Admin)', () => {
    it('should create a new employee profile', async () => {
      const res = await request(app)
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'budi.santoso@company.com',
          password: 'Password123!',
          full_name: 'Budi Santoso',
          role: 'EMPLOYEE',
          department: 'Customer Success',
          office_id: createdOfficeId,
          shift_id: createdShiftId,
          is_wfh_allowed: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.email).toBe('budi.santoso@company.com');
      expect(res.body.data.password_hash).toBeUndefined();
      createdEmployeeId = res.body.data.id;
    });

    it('should prevent duplicate email registration (409 Conflict)', async () => {
      const res = await request(app)
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'budi.santoso@company.com',
          password: 'Password123!',
          full_name: 'Duplicate Budi',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should list employees with filter', async () => {
      const res = await request(app)
        .get('/api/v1/employees?search=Budi')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].full_name).toBe('Budi Santoso');
    });

    it('should update employee profile', async () => {
      const res = await request(app)
        .put(`/api/v1/employees/${createdEmployeeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          department: 'Support & Success',
          is_wfh_allowed: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.department).toBe('Support & Success');
      expect(res.body.data.is_wfh_allowed).toBe(false);
    });

    it('should clean up created test employee', async () => {
      const res = await request(app)
        .delete(`/api/v1/employees/${createdEmployeeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });
  });
});
