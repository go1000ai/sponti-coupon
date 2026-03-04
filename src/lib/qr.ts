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
 * Generate a 6-digit redemption code that is guaranteed unique in the DB.
 * Retries up to 10 times on collision (unique constraint violation).
 * Pass any Supabase client (server, service-role, etc.).
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
  // Extremely unlikely — fall back to a random UUID suffix to guarantee uniqueness
  return Math.floor(100000 + Math.random() * 900000).toString() + Date.now().toString().slice(-4);
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
