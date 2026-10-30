import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { getNormalizedDate } from '../src/utils/attendanceCalculator';

const app = createApp();

describe('Attendance API Integration Tests', () => {
  let johnToken: string;
  let aliceToken: string;

  // HQ Coordinates: -6.175392, 106.827153 (Radius: 100m)
  const hqLat = -6.175392;
  const hqLng = 106.827153;

  // Far Away Coordinates: -6.250000, 106.850000 (~8.6 km away)
  const farLat = -6.25;
  const farLng = 106.85;

  // Tiny valid 1x1 WebP/PNG dummy buffer
  const dummyImageBuffer = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  );

  beforeAll(async () => {
    // 1. Clean attendance for today to ensure test idempotency
    const today = getNormalizedDate(new Date());
    await prisma.attendanceRecord.deleteMany({
      where: { date: today },
    });

    // 2. Login John Doe (is_wfh_allowed = false)
    const johnRes = await request(app).post('/api/v1/auth/login').send({
      email: 'john.doe@company.com',
      password: 'Password123!',
    });
    johnToken = johnRes.body.data.token;

    // 3. Login Alice Smith (is_wfh_allowed = true)
    const aliceRes = await request(app).post('/api/v1/auth/login').send({
      email: 'alice.smith@company.com',
      password: 'Password123!',
    });
    aliceToken = aliceRes.body.data.token;
  });

  describe('Clock-In Validation & Anti-Fraud', () => {
    it('should reject clock-in without a photo file', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/clock-in')
        .set('Authorization', `Bearer ${johnToken}`)
        .field('latitude', hqLat)
        .field('longitude', hqLng);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Selfie photo is required');
    });

    it('should reject on-site employee when outside office perimeter (Geofence enforcement)', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/clock-in')
        .set('Authorization', `Bearer ${johnToken}`)
        .field('latitude', farLat)
        .field('longitude', farLng)
        .attach('photo', dummyImageBuffer, 'selfie.png');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('outside the office perimeter');
      expect(res.body.message).toContain('meters away');
    });

    it('should allow remote employee to clock in outside perimeter (WFH permitted)', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/clock-in')
        .set('Authorization', `Bearer ${aliceToken}`)
        .field('latitude', farLat)
        .field('longitude', farLng)
        .attach('photo', dummyImageBuffer, 'alice_selfie.png');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBeDefined();
      expect(res.body.data.clock_in_photo_url).toBeDefined();
      expect(res.body.data.is_within_perimeter).toBe(false);
    });

    it('should allow on-site employee to clock in within office perimeter', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/clock-in')
        .set('Authorization', `Bearer ${johnToken}`)
        .field('latitude', hqLat)
        .field('longitude', hqLng)
        .attach('photo', dummyImageBuffer, 'john_selfie.png');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.is_within_perimeter).toBe(true);
      expect(res.body.data.clock_in_time).toBeDefined();
      expect(res.body.data.distance_to_office_meters).toBeLessThan(10);
    });

    it('should block duplicate clock-in on the same day when no idempotency key is provided', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/clock-in')
        .set('Authorization', `Bearer ${johnToken}`)
        .field('latitude', hqLat)
        .field('longitude', hqLng)
        .attach('photo', dummyImageBuffer, 'duplicate_selfie.png');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already clocked in for today');
    });

    it('should safely return existing record when idempotent retry is sent with idempotency_key', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/clock-in')
        .set('Authorization', `Bearer ${johnToken}`)
        .field('latitude', hqLat)
        .field('longitude', hqLng)
        .field('idempotency_key', 'john_retry_123')
        .attach('photo', dummyImageBuffer, 'duplicate_selfie.png');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.is_idempotent).toBe(true);
      expect(res.body.data.clock_in_time).toBeDefined();
    });
  });

  describe('Clock-Out & Status Flow', () => {
    it('should clock out successfully with optional photo', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/clock-out')
        .set('Authorization', `Bearer ${johnToken}`)
        .field('latitude', hqLat)
        .field('longitude', hqLng)
        .attach('photo', dummyImageBuffer, 'checkout_selfie.png');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.clock_out_time).toBeDefined();
      expect(res.body.data.clock_out_photo_url).toBeDefined();
    });

    it('should block duplicate clock-out on the same day when no idempotency key is provided', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/clock-out')
        .set('Authorization', `Bearer ${johnToken}`)
        .field('latitude', hqLat)
        .field('longitude', hqLng);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already clocked out for today');
    });

    it('should safely return existing clock-out record when idempotent retry is sent with idempotency_key', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/clock-out')
        .set('Authorization', `Bearer ${johnToken}`)
        .field('latitude', hqLat)
        .field('longitude', hqLng)
        .field('idempotency_key', 'john_clockout_retry_456');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.is_idempotent).toBe(true);
      expect(res.body.data.clock_out_time).toBeDefined();
    });

    it('should return today status via GET /api/v1/attendance/today', async () => {
      const res = await request(app)
        .get('/api/v1/attendance/today')
        .set('Authorization', `Bearer ${johnToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.clock_in_time).toBeDefined();
      expect(res.body.data.clock_out_time).toBeDefined();
    });

    it('should return personal attendance history via GET /api/v1/attendance/my-history', async () => {
      const res = await request(app)
        .get('/api/v1/attendance/my-history')
        .set('Authorization', `Bearer ${johnToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });
});
