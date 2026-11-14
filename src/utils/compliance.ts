import { Balloon } from '../types/domain';

export type ComplianceState = 'valid' | 'approaching' | 'expired' | 'unlimited';

export interface ExpiryEvaluation {
  state: ComplianceState;
  daysRemaining: number | null;
}

export function evaluateExpiry(
  hasExpiry: boolean,
  expiryDate?: string,
  warningDays = 30
): ExpiryEvaluation {
  if (!hasExpiry || !expiryDate) {
    return { state: 'unlimited', daysRemaining: null };
  }
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(expiryDate);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { state: 'expired', daysRemaining: diffDays };
  }
  if (diffDays <= warningDays) {
    return { state: 'approaching', daysRemaining: diffDays };
  }
  return { state: 'valid', daysRemaining: diffDays };
}

export function evaluate100hMaintenance(balloon: Balloon): {
  hoursSinceLastCheck: number;
  remainingHours: number;
  state: 'valid' | 'approaching' | 'expired';
  percentUsed: number;
} {
  const hoursSinceLastCheck = Math.max(0, Number((balloon.totalFlightHours - balloon.hoursAtLast100hCheck).toFixed(1)));
  const remainingHours = Number((100 - hoursSinceLastCheck).toFixed(1));
  const percentUsed = Math.min(100, Math.max(0, Math.round((hoursSinceLastCheck / 100) * 100)));

  let state: 'valid' | 'approaching' | 'expired' = 'valid';
  if (remainingHours <= 0) state = 'expired';
  else if (remainingHours <= 15) state = 'approaching';

  return { hoursSinceLastCheck, remainingHours, state, percentUsed };
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Dosya okunamadı'));
    reader.readAsDataURL(file);
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatDurationMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
