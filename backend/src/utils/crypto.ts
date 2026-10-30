import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const PREFIX = 'enc:v1:';

function getEncryptionKey(): Buffer {
  const envKey = process.env.DATA_ENCRYPTION_KEY;
  if (envKey && envKey.length === 64) {
    return Buffer.from(envKey, 'hex');
  }
  // Deterministic fallback derived from JWT secret if custom key not provided
  const secret = process.env.JWT_SECRET || 'hris_super_secure_jwt_secret_key_2026_dev_env';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts sensitive personal data using AES-256-GCM with random IV and authentication tag
 */
export function encryptPII(text: string | null | undefined): string | null {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return text || null;
  }

  // Already encrypted
  if (text.startsWith(PREFIX)) {
    return text;
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return `${PREFIX}${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error('Failed to encrypt PII field:', err);
    return text; // Fallback to raw on failure to prevent data loss
  }
}

/**
 * Decrypts sensitive personal data. If value is unencrypted legacy plaintext, returns as-is.
 */
export function decryptPII(cipherText: string | null | undefined): string | null {
  if (!cipherText || typeof cipherText !== 'string' || !cipherText.startsWith(PREFIX)) {
    return cipherText || null;
  }

  try {
    const key = getEncryptionKey();
    const parts = cipherText.slice(PREFIX.length).split(':');
    if (parts.length !== 3) {
      return cipherText;
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Failed to decrypt PII field:', err);
    return cipherText;
  }
}

/**
 * Masks 16-digit Indonesian KTP NIK for display (e.g. 337205********01)
 */
export function maskKTP(ktp: string | null | undefined): string | null {
  if (!ktp) return null;
  const raw = decryptPII(ktp)?.trim() || '';
  if (raw.length < 8) return raw;
  const first6 = raw.slice(0, 6);
  const last2 = raw.slice(-2);
  return `${first6}********${last2}`;
}

/**
 * Masks Bank Account Number for display (e.g. •••• 7890)
 */
export function maskBankAccount(account: string | null | undefined): string | null {
  if (!account) return null;
  const raw = decryptPII(account)?.trim() || '';
  if (raw.length <= 4) return raw;
  const last4 = raw.slice(-4);
  return `•••• •••• ${last4}`;
}
