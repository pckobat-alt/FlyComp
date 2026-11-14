import { TrackPoint } from '../../types/domain';

export interface TelemetryCallbacks {
  onPoint: (point: TrackPoint) => void;
  onError: (message: string) => void;
}

export interface TelemetrySessionHandle {
  stop: () => Promise<void>;
  wakeLockActive: boolean;
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function acquireWakeLock(): Promise<WakeLockSentinel | null> {
  try {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      return await navigator.wakeLock.request('screen');
    }
  } catch {
    // WakeLock may be blocked in background tabs or unsupported browsers
  }
  return null;
}

/**
 * Platform-agnostic Telemetry Adapter.
 * Uses Web Geolocation + Wake Lock in PWA mode; structured so Capacitor's
 * @capacitor-community/background-geolocation can drop in with zero UI changes.
 */
export async function startTelemetrySession(
  mode: 'gps' | 'simulator',
  callbacks: TelemetryCallbacks
): Promise<TelemetrySessionHandle> {
  const wakeLock = await acquireWakeLock();
  let lastPoint: TrackPoint | null = null;

  if (mode === 'gps') {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      callbacks.onError('Bu tarayıcıda GPS konum servisi desteklenmiyor. Simülasyon modunu kullanabilirsiniz.');
      return {
        wakeLockActive: !!wakeLock,
        stop: async () => {
          if (wakeLock) await wakeLock.release().catch(() => undefined);
        },
      };
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = pos.timestamp || Date.now();
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const altM = pos.coords.altitude !== null ? Math.round(pos.coords.altitude) : lastPoint?.altM ?? 1090;

        let speedKmh = 0;
        if (pos.coords.speed !== null && pos.coords.speed >= 0) {
          speedKmh = Number((pos.coords.speed * 3.6).toFixed(1));
        } else if (lastPoint) {
          const dtSec = Math.max(0.5, (now - lastPoint.timestamp) / 1000);
          const distM = haversineMeters(lastPoint.lat, lastPoint.lng, lat, lng);
          speedKmh = Number(((distM / dtSec) * 3.6).toFixed(1));
        }

        let varioMs = 0;
        if (lastPoint) {
          const dtSec = Math.max(0.5, (now - lastPoint.timestamp) / 1000);
          varioMs = Number(((altM - lastPoint.altM) / dtSec).toFixed(2));
        }

        const point: TrackPoint = {
          lat,
          lng,
          altM,
          speedKmh,
          varioMs,
          timestamp: now,
        };
        lastPoint = point;
        callbacks.onPoint(point);
      },
      (err) => {
        callbacks.onError(
          err.code === 1
            ? 'Konum izni reddedildi. Tarayıcı ayarlarından izin verin veya Simülasyon Modunu seçin.'
            : `GPS sinyal uyarısı: ${err.message}`
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 15000,
      }
    );

    return {
      wakeLockActive: !!wakeLock,
      stop: async () => {
        navigator.geolocation.clearWatch(watchId);
        if (wakeLock) await wakeLock.release().catch(() => undefined);
      },
    };
  }

  // Simulator mode: Realistic Cappadocia sunrise balloon profile (1.5s interval)
  let tick = 0;
  let simLat = 38.6431;
  let simLng = 34.8289;
  let simAlt = 1095;

  const emitSimulatedPoint = () => {
    tick += 1;
    const phase = tick % 40;
    let varioMs = 0;
    let speedKmh = 14;
    if (phase < 12) {
      varioMs = 1.8 + Math.sin(tick * 0.5) * 0.6; // climb
      speedKmh = 18 + Math.sin(tick * 0.3) * 3;
    } else if (phase < 26) {
      varioMs = Math.sin(tick * 0.4) * 0.5; // level flight
      speedKmh = 24 + Math.cos(tick * 0.25) * 4;
    } else {
      varioMs = -1.6 + Math.sin(tick * 0.5) * 0.4; // descent
      speedKmh = 16 + Math.sin(tick * 0.3) * 2;
    }

    simAlt = Math.max(1085, simAlt + varioMs * 1.5);
    simLat += 0.00009 + Math.sin(tick * 0.15) * 0.00002;
    simLng += 0.00012 + Math.cos(tick * 0.15) * 0.00002;

    const point: TrackPoint = {
      lat: Number(simLat.toFixed(6)),
      lng: Number(simLng.toFixed(6)),
      altM: Math.round(simAlt),
      speedKmh: Number(speedKmh.toFixed(1)),
      varioMs: Number(varioMs.toFixed(2)),
      timestamp: Date.now(),
    };
    callbacks.onPoint(point);
  };

  emitSimulatedPoint();
  const intervalId = window.setInterval(emitSimulatedPoint, 1500);

  return {
    wakeLockActive: !!wakeLock,
    stop: async () => {
      window.clearInterval(intervalId);
      if (wakeLock) await wakeLock.release().catch(() => undefined);
    },
  };
}
