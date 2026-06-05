import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';

/**
 * Salted scrypt hashing for staff PINs. Stored as "salt:hash" (hex).
 * PINs are low-entropy (4 digits) but are only ever checked server-side
 * within the vendor's authenticated session and scoped to that vendor's
 * members, so this is a deterrent/attribution gate, not a remote auth surface.
 */
export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(pin, salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [salt, hash] = (stored || '').split(':');
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(pin, salt, 32);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** A valid PIN is exactly 4 digits. */
export function isValidPin(pin: unknown): pin is string {
  return typeof pin === 'string' && /^\d{4}$/.test(pin);
}
