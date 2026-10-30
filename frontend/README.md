# HRIS Employee Attendance Mobile PWA

Mobile-first Employee Clock-In/Clock-Out Progressive Web Application (PWA) built with **Next.js (App Router)**, **Tailwind CSS**, and **Lucide Icons**.

---

## 📱 Features

- **Live Camera Capture:** Enforces front-facing camera verification (`navigator.mediaDevices.getUserMedia`). Strictly prevents file/gallery upload bypass.
- **Client-Side Image Compression:** Captures stream frames via an offscreen canvas and compresses to `<200KB` WebP/JPEG (max 800px width) before transmission.
- **Real-Time GPS Verification:** Fetches coordinates via `navigator.geolocation` with `enableHighAccuracy: true`.
- **Dynamic Perimeter Badges:**
  - 🟢 **Inside Office Area** (within office radius)
  - 🔴 **Outside Office Area** (outside radius)
  - 🔵 **Remote / WFH Allowed** (status indicator)
  - Real-time distance in meters with live distance delta.
- **Desktop/Dev Test Simulation:** Quick test switches (`At HQ` vs `Far Away`) to simulate geofence boundaries on laptop/desktop environments without native GPS.
- **Live Clock Header:** Real-time ticking clock (1s interval) and calendar date.
- **Personal 7-Day History Drawer:** View past clock-in/out timestamps, status badges (`ON_TIME`, `LATE`, `WFH`), and selfie photo inspector modal.
- **Demo Account Switcher:** 1-click login switching between John Doe (On-Site), Alice Smith (WFH), and Sarah Connor (Manager).

---

## 🚀 Running the Frontend

```bash
cd hris-attendance/frontend
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser (or use mobile responsive mode / Chrome DevTools).

API calls to `/api/v1/*` are automatically proxied to the backend running at `http://localhost:4000/api/v1/*`.
