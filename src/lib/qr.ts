import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export function generateQRCodeId(): string {
  return uuidv4();
}

/**
 * Generate a random 6-digit redemption code (e.g. "482917").
 * Use generateUniqueRedemptionCode() to guarantee DB uniqueness.
 */
export function generateRedemptionCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate a 6-digit redemption code that PROBABLY does not collide. Soft check only —
 * because the read happens before the caller's INSERT, two concurrent requests can still
 * pick the same code and one will hit Postgres' 23505 unique-constraint error.
 *
 * Callers that insert a `claims` row should use {@link withUniqueRedemptionCode} to retry
 * on 23505. This function alone is fine for low-frequency webhook paths where concurrent
 * collisions are negligible.
 */
export async function generateUniqueRedemptionCode(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseClient: { from: (table: string) => any }
): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateRedemptionCode();
    const { count } = await supabaseClient
      .from('claims')
      .select('id', { count: 'exact', head: true })
      .eq('redemption_code', code);
    if ((count ?? 1) === 0) return code;
  }
  // Fall back to a fresh random 6-digit code — keeps the format invariant for downstream
  // regex checks (`^\d{6}$`). The DB unique index is the real authority.
  return generateRedemptionCode();
}

/**
 * Run an insert that requires a unique redemption code, retrying on the race where two
 * concurrent requests pick the same code. The action receives a freshly-generated code
 * and should perform the insert; if it throws/returns a 23505 error, we generate a new
 * code and retry (up to `maxAttempts`).
 *
 * Returns the action's result on success, or throws the last error if all attempts collide.
 */
export async function withUniqueRedemptionCode<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseClient: { from: (table: string) => any },
  action: (code: string) => Promise<{ data: T | null; error: { code?: string; message?: string } | null }>,
  maxAttempts = 5
): Promise<{ data: T | null; error: { code?: string; message?: string } | null }> {
  let lastError: { code?: string; message?: string } | null = null;
  for (let i = 0; i < maxAttempts; i++) {
    const code = await generateUniqueRedemptionCode(supabaseClient);
    const result = await action(code);
    if (!result.error) return result;
    if (result.error.code === '23505' && (result.error.message || '').includes('redemption_code')) {
      lastError = result.error;
      continue;
    }
    return result;
  }
  return { data: null, error: lastError ?? { code: '23505', message: 'redemption_code collision exhausted retries' } };
}

export function getRedemptionUrl(qrCodeId: string): string {
  return `${APP_URL}/redeem/${qrCodeId}`;
}

export async function generateQRCodeDataUrl(qrCodeId: string): Promise<string> {
  const url = getRedemptionUrl(qrCodeId);
  return QRCode.toDataURL(url, {
    width: 400,
    margin: 2,
    color: {
      dark: '#1A1A2E',
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'H',
  });
}

export async function generateQRCodeBuffer(qrCodeId: string): Promise<Buffer> {
  const url = getRedemptionUrl(qrCodeId);
  return QRCode.toBuffer(url, {
    width: 400,
    margin: 2,
    color: {
      dark: '#1A1A2E',
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'H',
  });
}
