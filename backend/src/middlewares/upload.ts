import multer from 'multer';
import { ApiError } from './errorHandler';

const storage = multer.memoryStorage();

export const uploadSinglePhoto = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(ApiError.badRequest('Invalid file type. Only image files (JPEG, PNG, WebP) are allowed.'));
    }
  },
}).single('photo');

export const uploadLeaveAttachment = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(ApiError.badRequest('Invalid file type. Only images (JPG, PNG, WebP) and PDF documents are allowed.'));
    }
  },
}).single('attachment');
