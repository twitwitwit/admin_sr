/**
 * Password Hashing Utility using SHA-256 (Web Crypto API)
 * Ensures user passwords are never stored in plaintext and cannot be read by anyone.
 */

const SALT = 'SWIFTRIDE_MANILA_SALT_2026_SECURE_KEY';

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + SALT);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(passwordAttempt: string, storedHash: string): Promise<boolean> {
  const attemptHash = await hashPassword(passwordAttempt);
  return attemptHash === storedHash;
}

export function generateTempPassword(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
  let result = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}
