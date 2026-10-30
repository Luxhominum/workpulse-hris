import { describe, it, expect } from 'vitest';
import { encryptPII, decryptPII, maskKTP, maskBankAccount } from '../src/utils/crypto';

describe('AES-256-GCM Field-Level Encryption & PII Masking', () => {
  it('should encrypt sensitive string and produce enc:v1 prefix', () => {
    const rawNIK = '3372051204900001';
    const encrypted = encryptPII(rawNIK);

    expect(encrypted).not.toBeNull();
    expect(encrypted).toMatch(/^enc:v1:[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+/);
    expect(encrypted).not.toContain(rawNIK);
  });

  it('should decrypt encrypted string back to original plaintext', () => {
    const rawBankAccount = '5271928371';
    const encrypted = encryptPII(rawBankAccount);
    const decrypted = decryptPII(encrypted);

    expect(decrypted).toBe(rawBankAccount);
  });

  it('should handle null, undefined, and empty strings gracefully', () => {
    expect(encryptPII(null)).toBeNull();
    expect(encryptPII(undefined)).toBeNull();
    expect(encryptPII('')).toBeNull();

    expect(decryptPII(null)).toBeNull();
    expect(decryptPII(undefined)).toBeNull();
    expect(decryptPII('')).toBeNull();
  });

  it('should not re-encrypt already encrypted strings (idempotent)', () => {
    const original = '3372051204900001';
    const firstEnc = encryptPII(original);
    const secondEnc = encryptPII(firstEnc);

    expect(secondEnc).toBe(firstEnc);
  });

  it('should gracefully pass through legacy unencrypted plaintext on decrypt', () => {
    const legacyPlaintext = '3372051204900001';
    const result = decryptPII(legacyPlaintext);

    expect(result).toBe(legacyPlaintext);
  });

  it('should mask Indonesian KTP NIK properly (337205********01)', () => {
    const rawNIK = '3372051204900001';
    expect(maskKTP(rawNIK)).toBe('337205********01');

    const encryptedNIK = encryptPII(rawNIK);
    expect(maskKTP(encryptedNIK)).toBe('337205********01');
  });

  it('should mask Bank Account properly (•••• •••• 0001)', () => {
    const rawAccount = '1234567890';
    expect(maskBankAccount(rawAccount)).toBe('•••• •••• 7890');

    const encryptedAccount = encryptPII(rawAccount);
    expect(maskBankAccount(encryptedAccount)).toBe('•••• •••• 7890');
  });
});
