/**
 * WITA (Asia/Makassar, UTC+8) and Geo Utilities for Sistem Monitoring Bedah Rumah 2026
 */

export const TIMEZONE = 'Asia/Makassar';

/**
 * Returns current date/time in Asia/Makassar (WITA) as an ISO-like string
 */
export function getNowWITA(): Date {
  // Asia/Makassar is UTC+8
  const now = new Date();
  return now;
}

/**
 * Given any Date/timestamp, returns the Monday (YYYY-MM-DD) of that week in WITA.
 * A week starts on Monday 00:00 and ends Sunday 23:59:59.
 */
export function getWeekStartWITA(dateInput?: Date | string): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  
  // Format into components in Asia/Makassar
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  // Extract parts
  const parts = formatter.formatToParts(d);
  const year = parseInt(parts.find((p) => p.type === 'year')?.value || '2026', 10);
  const month = parseInt(parts.find((p) => p.type === 'month')?.value || '1', 10) - 1;
  const day = parseInt(parts.find((p) => p.type === 'day')?.value || '1', 10);

  const localDate = new Date(Date.UTC(year, month, day));
  // 0 is Sunday, 1 is Monday, ... 6 is Saturday
  const dayOfWeek = localDate.getUTCDay();
  // Monday distance:
  // If Sunday (0), Monday was 6 days ago (-6)
  // If Monday (1), Monday is today (0)
  // If Tuesday (2), Monday was 1 day ago (-1)
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  localDate.setUTCDate(localDate.getUTCDate() + diffToMonday);

  const y = localDate.getUTCFullYear();
  const m = String(localDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(localDate.getUTCDate()).padStart(2, '0');

  return `${y}-${m}-${dd}`;
}

/**
 * Given a Monday YYYY-MM-DD, returns the Sunday YYYY-MM-DD
 */
export function getWeekEndWITA(weekStart: string): string {
  const [y, m, d] = weekStart.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + 6);
  const endY = date.getUTCFullYear();
  const endM = String(date.getUTCMonth() + 1).padStart(2, '0');
  const endD = String(date.getUTCDate()).padStart(2, '0');
  return `${endY}-${endM}-${endD}`;
}

/**
 * Generates an Indonesian label for the week, e.g. "Rekap Kunjungan 12–18 Oktober 2026"
 */
export function getRecapLabel(weekStart: string): string {
  const weekEnd = getWeekEndWITA(weekStart);
  const [y1, m1, d1] = weekStart.split('-').map(Number);
  const [y2, m2, d2] = weekEnd.split('-').map(Number);

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  if (m1 === m2) {
    return `Rekap Kunjungan ${d1}–${d2} ${months[m1 - 1]} ${y1}`;
  }
  return `Rekap Kunjungan ${d1} ${months[m1 - 1]} – ${d2} ${months[m2 - 1]} ${y2}`;
}

/**
 * Formats date into Indonesian locale string: "16 Okt 2026"
 */
export function formatDateID(dateInput?: string | Date): string {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/**
 * Formats date and time into Indonesian locale string: "16 Okt 2026, 14:30 WITA"
 */
export function formatDateTimeID(dateInput?: string | Date): string {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';
  const formatted = new Intl.DateTimeFormat('id-ID', {
    timeZone: TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
  return `${formatted} WITA`;
}

/**
 * Calculates Haversine distance in meters between two GPS coordinates
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Normalizes WhatsApp phone number to 628... format
 */
export function normalizeWhatsAppNumber(rawNumber: string): string | null {
  if (!rawNumber) return null;
  let cleaned = rawNumber.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }
  const regex = /^62[0-9]{8,13}$/;
  if (!regex.test(cleaned)) {
    return null;
  }
  return cleaned;
}

/**
 * Builds Google Maps navigation URL
 */
export function getGoogleMapsDirUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}
