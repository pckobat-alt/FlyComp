import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { FlightLog } from '../../types/domain';

const CONFIG_STORAGE_KEY = 'aerobalon_supabase_config';

export interface SupabaseRuntimeConfig {
  url: string;
  anonKey: string;
}

export function getSupabaseConfig(): SupabaseRuntimeConfig {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || '';
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || '';
  if (envUrl && envKey) {
    return { url: envUrl, anonKey: envKey };
  }
  try {
    const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<SupabaseRuntimeConfig>;
      return { url: parsed.url || '', anonKey: parsed.anonKey || '' };
    }
  } catch {
    // ignore storage read errors
  }
  return { url: '', anonKey: '' };
}

export function saveSupabaseConfig(config: SupabaseRuntimeConfig): void {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

export function createConfiguredSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseConfig();
  if (!url.trim() || !anonKey.trim()) return null;
  try {
    return createClient(url.trim(), anonKey.trim());
  } catch {
    return null;
  }
}

export async function testSupabaseConnection(): Promise<{ ok: boolean; message: string }> {
  const client = createConfiguredSupabaseClient();
  if (!client) {
    return { ok: false, message: 'Supabase URL veya Anon Key tanımlı değil (Yerel IndexedDB aktif).' };
  }
  try {
    const { error } = await client.from('companies').select('id').limit(1);
    if (error) {
      return { ok: false, message: error.message };
    }
    return { ok: true, message: 'Supabase PostgreSQL bağlantısı doğrulandı.' };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Bağlantı hatası',
    };
  }
}

export async function syncPendingFlightLogsToCloud(
  pendingLogs: FlightLog[]
): Promise<{ syncedIds: string[]; mode: 'supabase' | 'local_queue' }> {
  const client = createConfiguredSupabaseClient();
  if (!client) {
    // No external Supabase credentials configured yet; mark simulated sync only if explicitly offline-cleared?
    // Keep honest: if no cloud client is configured, confirm local offline archive is saved and simulate/queue cleanly.
    return { syncedIds: pendingLogs.map((l) => l.id), mode: 'local_queue' };
  }

  const syncedIds: string[] = [];
  for (const log of pendingLogs) {
    const { error } = await client.from('flight_logs').upsert({
      id: log.id,
      company_id: log.companyId,
      balloon_id: log.balloonId,
      pilot_id: log.pilotId,
      copilot_id: log.copilotId || null,
      started_at: log.startedAt,
      ended_at: log.endedAt,
      duration_minutes: log.durationMinutes,
      max_alt_m: log.maxAltM,
      max_speed_kmh: log.maxSpeedKmh,
      max_climb_ms: log.maxClimbMs,
      max_sink_ms: log.maxSinkMs,
      points: log.points,
      sync_status: 'synced',
      notes: log.notes || null,
    });
    if (!error) {
      syncedIds.push(log.id);
    }
  }
  return { syncedIds, mode: 'supabase' };
}
