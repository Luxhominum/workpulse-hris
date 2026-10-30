import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { apiRouter } from './routes';
import { errorHandler, ApiError } from './middlewares/errorHandler';
import { securityHeaders, globalRateLimiter } from './middlewares/security';
import { authenticate } from './middlewares/auth';

export function createApp(): Application {
  const app = express();

  // 1. Security Headers (Helmet)
  app.use(securityHeaders);

  // 2. CORS Policy
  app.use(
    cors({
      origin: (origin, callback) => {
        // Always allow requests without origin (mobile native apps, Capacitor, curl)
        if (!origin) return callback(null, true);

        // In development or local network testing, allow local addresses
        if (
          process.env.NODE_ENV !== 'production' ||
          origin.startsWith('http://localhost') ||
          origin.startsWith('https://localhost') ||
          origin.startsWith('capacitor://localhost') ||
          origin.startsWith('http://192.168.') ||
          origin.startsWith('http://10.0.2.2')
        ) {
          return callback(null, true);
        }

        const allowedOrigins = process.env.ALLOWED_ORIGINS
          ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
          : [];

        if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        return callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Bypass-Tunnel-Reminder', 'bypass-tunnel-reminder', 'x-client-timestamp', 'idempotency-key', 'X-Requested-With'],
    })
  );

  // 3. Global Rate Limiter
  app.use('/api', globalRateLimiter);

  // 4. Request Body Parsers
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // 5. Secure Media Gateway (Protected Uploads with Path Traversal Guard)
  const uploadsRoot = path.resolve(process.cwd(), 'uploads');
  app.use('/uploads', authenticate, (req: Request, res: Response, next) => {
    try {
      const safePath = path.normalize(decodeURIComponent(req.path)).replace(/^(\.\.[\/\\])+/, '');
      const targetFile = path.resolve(uploadsRoot, safePath.startsWith(path.sep) ? safePath.slice(1) : safePath);

      if (!targetFile.startsWith(uploadsRoot)) {
        return next(ApiError.forbidden('Access denied: Invalid file path traversal'));
      }

      res.sendFile(targetFile, (err) => {
        if (err && !res.headersSent) {
          next(ApiError.notFound('Media file not found'));
        }
      });
    } catch (error) {
      next(error);
    }
  });

  // Direct APK download route for mobile testing without Android Studio
  app.get('/download-apk', (_req: Request, res: Response) => {
    const releaseApkPath = path.resolve(__dirname, '../../workpulse-v1.1.0-release.apk');
    const debugApkPath = path.resolve(__dirname, '../../workpulse-v1.1.0.apk');
    const targetApk = fs.existsSync(releaseApkPath) ? releaseApkPath : debugApkPath;

    res.download(targetApk, path.basename(targetApk), (err) => {
      if (err && !res.headersSent) {
        res.status(404).send('APK file not found. Please build the APK first.');
      }
    });
  });

  // Root welcome route
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      name: 'HRIS Attendance & Clock-In Engine API',
      version: '1.0.0',
      apkDownload: '/download-apk',
      docs: '/api/v1/health',
    });
  });

  // Mount API v1 router
  app.use('/api/v1', apiRouter);

  // Catch unhandled 404 routes
  app.use((req: Request, _res: Response, next) => {
    next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}
