# WorkPulse HRIS — Attendance & Clock-In Engine MVP

An enterprise-grade, tamper-proof Attendance and Clock-In Engine built with **Node.js/Express + Prisma 6 + PostgreSQL/SQLite** on the backend, and **Next.js 16 + Tailwind CSS + Capacitor 8** on the frontend (Web PWA & Native Android APK).

---

## 🏗️ Architecture & Modules Overview

| Module | Technologies | Key Features |
|---|---|---|
| **Backend API** | Node.js, TypeScript, Express, Prisma ORM, JWT, Helmet, Rate-Limit, Multer | Server-authoritative time, Haversine formula geofencing, Shift arrival calculation, S3/Cloudflare R2/Local storage adapter, Leave approvals, Payroll aggregation (.xlsx / .csv), HTTP security headers, Brute-force rate limiting. |
| **Mobile Web / PWA** | Next.js 16 (App Router), Tailwind CSS v4, Lucide React | Dedicated `/login` page with role-based route guards, Live ticking clock, High-accuracy GPS, Live camera capture with face guide, WebP compression (<200KB), 7-day drawer. |
| **Admin Portal** | Next.js 16, Lucide, Tailwind CSS | Real-time KPI cards (Total, Present, Late, Absent, On Leave), Daily employee audit with selfie + Google Maps pin modal, Leave approval workflow, 1-click Payroll summary & Excel/CSV export, Full Employee & Office Master Data Management. |
| **Native Android APK** | Capacitor 8, Android SDK (minSdk 24, targetSdk 36) | Native camera & GPS hardware bindings, cleartext traffic for local dev/LAN, configurable server host endpoint. |

---

## 🔒 Security & Hardening Highlights

1. **Authentication & Route Guards:**
   - Dedicated `/login` portal with role-based routing (Admins/Managers to `/admin`, Employees to `/`).
   - Unauthenticated visitors are automatically redirected to `/login` (all auto-login bypasses removed).
   - Strict RBAC: Employees attempting to access `/admin` are immediately kicked back to `/`.
2. **Brute-Force & Rate Limiting:**
   - Global rate limiter: 600 requests per 15 minutes per IP.
   - Auth rate limiter: 15 login attempts per 15 minutes per IP on `POST /api/v1/auth/login`.
   - Attendance submission rate limiter: 10 attempts per minute on `/clock-in`.
3. **HTTP Security Headers (Helmet):**
   - Content Security Policy (CSP), Cross-Origin Resource Policy (`cross-origin` for photo assets), X-Content-Type-Options (`nosniff`), Strict-Transport-Security (HSTS), X-Frame-Options (`SAMEORIGIN`).
4. **Anti-Fraud Attendance Integrity:**
   - **Server-Authoritative Clock:** Client device clocks are strictly ignored; UTC server timestamps determine arrival status.
   - **Backend Haversine Geofencing:** Mathematical distance checks execute on the backend server.
   - **Single Active Session:** `@@unique([employee_id, date])` constraint stops duplicate daily check-ins.
   - **Simulation Guard:** "At HQ" and "Use Test Photo" controls are hidden in production builds.

---

## 🚀 Quick Start Guide (Web Version)

### 1. Backend Server (`http://localhost:4000`)
```bash
cd hris-attendance/backend
npm install
npm run db:push
npm run seed
npm run dev
```

### 2. Frontend Web App (`http://localhost:3000`)
```bash
cd hris-attendance/frontend
npm install
npm run dev
```

### 3. Demo Credentials (Pre-seeded)
All accounts share the password: `Password123!`

- **Admin Account:** `admin@company.com` (Has full access to `/admin` and attendance features)
- **Manager Account:** `manager@company.com` (Has access to `/admin` and team approvals)
- **On-Site Employee:** `john.doe@company.com` (On-site mandatory, geofence radius enforced: 50m)
- **Remote Employee:** `alice.smith@company.com` (WFH permitted, can clock in from anywhere)

---

## 📱 Android APK & Mobile Setup

The native Android project is fully configured in `hris-attendance/frontend/android`.

### Option A: Build & Run in Android Studio (Recommended for local dev)
1. Install [Android Studio](https://developer.android.com/studio).
2. Open Android Studio and choose **"Open"**.
3. Select the folder: `hris-attendance/frontend/android`.
4. Wait for Gradle to index dependencies.
5. Select an Android Emulator or your connected physical Android phone (with USB debugging enabled).
6. Click **Run (Shift + F10)** or go to **Build > Build Bundle(s) / APK(s) > Build APK(s)** to generate the `.apk`.

### Option B: Build APK via Command Line (Requires JDK 17+ & Android SDK)
```bash
# 1. Sync latest frontend static build
cd hris-attendance/frontend
npm run build:cap

# 2. Compile Debug APK
cd android
./gradlew assembleDebug
# Generated APK will be located at:
# android/app/build/outputs/apk/debug/app-debug.apk
```

### Option C: Cloud CI/CD via GitHub Actions (Zero Local Setup)
A pre-configured GitHub Actions workflow is provided at `.github/workflows/build-apk.yml`.
1. Push this repository to GitHub.
2. Go to the **Actions** tab on GitHub.
3. The **"Build Android APK (WorkPulse HRIS)"** workflow will automatically build `app-debug.apk`.
4. Download the ready-to-install `.apk` directly from the workflow run artifacts!

---

## ⚙️ Connecting the Android App to Your Local Backend

When testing on an Android Emulator or a physical device:
- **Android Emulator:** Points to `http://10.0.2.2:4000` by default (special loopback alias for host machine).
- **Physical Android Phone:** Connect your phone to the same Wi-Fi network as your PC and enter `http://<YOUR_PC_IP>:4000` (e.g. `http://192.168.1.5:4000`).
- **In-App Endpoint Switcher:** Tap the ⚙️ (Settings) icon in the mobile app header to view or change the server URL at any time without recompiling!

---

## 🧪 Automated Integration Tests

To run the backend test suite verifying Haversine calculations, late arrivals, authentication, rate limits, and payroll exports:

```bash
cd hris-attendance/backend
npm run test
```
*Result: 46 / 46 passing across 5 suites.*
