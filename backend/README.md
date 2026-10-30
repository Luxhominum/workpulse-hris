# HRIS MVP Backend — Attendance & Organization Management

Foundational backend service for the HRIS Attendance & Clock-In Engine built with Node.js, Express, TypeScript, and Prisma ORM.

---

## 🛠 Tech Stack

- **Runtime:** Node.js v24+
- **Language:** TypeScript 5+ (Strict typing)
- **Framework:** Express.js 5
- **ORM:** Prisma 6
- **Database:** SQLite (default for zero-config local dev; 100% swappable to PostgreSQL via `provider = "postgresql"`)
- **Storage:** S3 / Cloudflare R2 compatible SDK (`@aws-sdk/client-s3`) with zero-config local disk fallback
- **Authentication:** JSON Web Tokens (JWT) + bcrypt password hashing
- **Validation:** Zod schema validation
- **Testing:** Vitest & Supertest (37 automated tests passing)

---

## 🗄 Prisma Data Models

- **`Office`**: id, name, latitude, longitude, radius_meters, employees relation.
- **`Shift`**: id, name, start_time (HH:mm), end_time (HH:mm), grace_period_minutes, employees relation.
- **`Employee`**: id, email (unique), password_hash, full_name, role (ADMIN, MANAGER, EMPLOYEE), office_id, shift_id, is_wfh_allowed, department.
- **`AttendanceRecord`**: id, employee_id, date, clock_in_time, clock_out_time, clock_in_lat, clock_in_lng, clock_in_photo_url, clock_out_photo_url, status (ON_TIME, LATE, WFH, OUT_OF_OFFICE), late_minutes. Unique constraint on `(employee_id, date)`.
- **`LeaveRequest`**: id, employee_id, type, start_date, end_date, reason, status, approved_by_id, approved_at.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Push Database Schema & Seed Data
```bash
npm run db:push
npm run db:seed
```

### 3. Run Automated Tests
```bash
npm run test
```

### 4. Start Development Server
```bash
npm run dev
```

---

## 🔑 Default Seeded Accounts

All accounts share the default password: **`Password123!`**

| Role | Email | Name | Details |
|---|---|---|---|
| **ADMIN** | `admin@company.com` | System Administrator | Full access to manage Offices, Shifts, and Employees |
| **MANAGER** | `manager@company.com` | Sarah Connor | Can view directories, audit logs, and approve leaves |
| **EMPLOYEE** | `john.doe@company.com` | John Doe | On-site required (`is_wfh_allowed: false`) |
| **EMPLOYEE** | `alice.smith@company.com` | Alice Smith | Remote permitted (`is_wfh_allowed: true`) |

---

## 📡 API Endpoints

### Attendance Engine (Anti-Fraud & Geofencing)
- `POST /api/v1/attendance/clock-in` — Clock in with GPS coordinates and selfie photo (`multipart/form-data`)
  - Validates Haversine distance against assigned office perimeter.
  - Strictly enforces server-side time.
  - Calculates status (`ON_TIME`, `LATE`, `WFH`) and `late_minutes`.
  - Rejects duplicate clock-ins on the same day.
- `POST /api/v1/attendance/clock-out` — Clock out with coordinates and optional photo (`multipart/form-data`)
- `GET /api/v1/attendance/today` — Retrieve current active daily attendance status for the employee
- `GET /api/v1/attendance/my-history` — Retrieve past attendance log (defaults to last 14 days)

### Authentication
- `POST /api/v1/auth/login` — Log in with email & password, returns JWT token & user profile
- `GET /api/v1/auth/me` — Retrieve current authenticated user profile

### Offices Management
- `GET /api/v1/offices` — List all offices (ADMIN, MANAGER)
- `GET /api/v1/offices/:id` — Get office details with employee list (ADMIN, MANAGER)
- `POST /api/v1/offices` — Create new office with coordinates & radius (ADMIN)
- `PUT /api/v1/offices/:id` — Update office details (ADMIN)
- `DELETE /api/v1/offices/:id` — Delete office (ADMIN)

### Shifts Management
- `GET /api/v1/shifts` — List all shifts (All authenticated users)
- `GET /api/v1/shifts/:id` — Get shift details (All authenticated users)
- `POST /api/v1/shifts` — Create new shift schedule with grace period (ADMIN)
- `PUT /api/v1/shifts/:id` — Update shift schedule (ADMIN)
- `DELETE /api/v1/shifts/:id` — Delete shift (ADMIN)

### Employees Management
- `GET /api/v1/employees` — List employees with search, department, role, or office filters (ADMIN, MANAGER)
- `GET /api/v1/employees/:id` — Get single employee profile with assigned office and shift (ADMIN, MANAGER)
- `POST /api/v1/employees` — Create new employee with hashed password and assignment (ADMIN)
- `PUT /api/v1/employees/:id` — Update employee profile or reassignment (ADMIN)
- `DELETE /api/v1/employees/:id` — Delete employee profile (ADMIN)

---

## ☁️ S3 / Cloudflare R2 Storage Configuration

Add the following environment variables to `.env` to enable AWS S3 or Cloudflare R2:
```env
AWS_S3_BUCKET="your-bucket-name"
AWS_REGION="auto" # or us-east-1
AWS_ACCESS_KEY_ID="your-access-key-id"
AWS_SECRET_ACCESS_KEY="your-secret-access-key"
AWS_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com" # For Cloudflare R2
AWS_PUBLIC_DOMAIN="https://pub-xxxxxx.r2.dev" # Optional CDN domain
```
When omitted, photos automatically save to local `./uploads/` and are served via Express.
