import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export function generateQRCodeId(): string {
  return uuidv4();
}

/**
 * Generate a unique 6-digit redemption code (e.g. "482917").
 * Customer gives this to the vendor as an alternative to QR scanning.
 */
export function generateRedemptionCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
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
