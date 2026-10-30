import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

const isTest = process.env.NODE_ENV === 'test';

// HTTP Security Headers via Helmet
export const securityHeaders = helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allows uploaded photos to be rendered across origins
  crossOriginEmbedderPolicy: false,
});

// General API Rate Limiter
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 10000 : 600, // 600 requests per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP address. Please try again after 15 minutes.',
  },
  skip: () => isTest,
});

// Strict Login Rate Limiter (Brute-force protection)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 10000 : 15, // 15 login attempts per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. For security reasons, your IP is temporarily blocked for 15 minutes.',
  },
  skip: () => isTest,
});

// Attendance Check-in Rate Limiter (Spam prevention)
export const attendanceRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isTest ? 10000 : 10, // 10 attempts per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many clock-in submissions in a short period. Please wait 1 minute.',
  },
  skip: () => isTest,
});
