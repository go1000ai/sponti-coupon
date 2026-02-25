import { type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return inputs.map(input => {
    if (typeof input === 'string') return input;
    if (Array.isArray(input)) return input.filter(Boolean).join(' ');
    if (typeof input === 'object' && input !== null) {
      return Object.entries(input)
        .filter(([, value]) => Boolean(value))
        .map(([key]) => key)
        .join(' ');
    }
    return '';
  }).filter(Boolean).join(' ');
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}

export function calculateDiscount(originalPrice: number, dealPrice: number): number {
  if (originalPrice <= 0) return 0;
  return ((originalPrice - dealPrice) / originalPrice) * 100;
}

export function getTimeRemaining(expiresAt: string): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
  expired: boolean;
} {
  const total = new Date(expiresAt).getTime() - Date.now();
  if (total <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0, expired: true };
  }
  return {
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60),
    total,
    expired: false,
  };
}

export function formatTimeRemaining(expiresAt: string): string {
  const { days, hours, minutes, seconds, expired } = getTimeRemaining(expiresAt);
  if (expired) return 'Expired';
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

export function getDistanceFromLatLng(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 3959; // Earth radius in miles
  const dLat = deg2rad(lat2 - lat1);
  const dLng = deg2rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');
}

// Geocode a location query (address, city, ZIP) using OpenStreetMap Nominatim
export async function geocodeAddress(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const encoded = encodeURIComponent(query.includes('USA') ? query : `${query}, USA`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`,
      { headers: { 'User-Agent': 'SpontiCoupon/1.0' } }
    );
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  } catch {
    return null;
  }
}

export function formatDistance(miles: number): string {
  if (miles < 1) {
    return `${Math.round(miles * 5280).toLocaleString()} ft`;
  }
  return `${miles.toFixed(1)} mi`;
}
