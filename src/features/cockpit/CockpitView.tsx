import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  CloudOff,
  Compass,
  Lock,
  Navigation,
  Play,
  RefreshCw,
  Scissors,
  Square,
} from 'lucide-react';
import {
  Balloon,
  FlightLog,
  Language,
  Personnel,
  TrackPoint,
  UserRole,
} from '../../types/domain';
import {
  startTelemetrySession,
  TelemetrySessionHandle,
} from '../../services/telemetry/telemetryAdapter';
import {
  loadActiveFlightDraft,
  saveActiveFlightDraft,
} from '../../services/storage/idbStore';
import { formatDurationMs } from '../../utils/compliance';
import { useT } from '../../i18n/translations';
import { GpxExportModal } from './GpxExportModal';

interface Props {
  companyId: string;
  balloons: Balloon[];
  personnel: Personnel[];
  flightLogs: FlightLog[];
  activeRole: UserRole;
  activePersonnelId: string;
  language: Language;
  isOnline: boolean;
  onSaveFlightLog: (log: FlightLog) => Promise<void>;
  onSyncPending: () => Promise<void>;
}

export const CockpitView: React.FC<Props> = ({
  companyId,
  balloons,
  personnel,
  flightLogs,
  activeRole,
  activePersonnelId,
  language,
  isOnline,
  onSaveFlightLog,
  onSyncPending,
}) => {
  const t = useT(language);
  const pilots = useMemo(
    () => personnel.filter((p) => p.category === 'pilot' || p.category === 'copilot'),
    [personnel]
  );

  const [selectedBalloonId, setSelectedBalloonId] = useState<string>(balloons[0]?.id || '');
  const [selectedPilotId, setSelectedPilotId] = useState<string>(
    pilots.find((p) => p.id === activePersonnelId)?.id || pilots[0]?.id || ''
  );
  const [telemetryMode, setTelemetryMode] = useState<'gps' | 'simulator'>('simulator');
  const [isRecording, setIsRecording] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [livePoints, setLivePoints] = useState<TrackPoint[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [exportTarget, setExportTarget] = useState<FlightLog | null>(null);

  const sessionRef = useRef<TelemetrySessionHandle | null>(null);
  const pointsRef = useRef<TrackPoint[]>([]);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!balloons.some((b) => b.id === selectedBalloonId)) {
      setSelectedBalloonId(balloons[0]?.id || '');
    }
  }, [balloons, selectedBalloonId]);

  useEffect(() => {
    if (!pilots.some((p) => p.id === selectedPilotId)) {
      setSelectedPilotId(pilots[0]?.id || '');
    }
  }, [pilots, selectedPilotId]);

  // Recover crashed/interrupted flight draft from IndexedDB
  useEffect(() => {
    loadActiveFlightDraft().then((draft) => {
      if (draft && draft.companyId === companyId && draft.points.length > 0 && !isRecording) {
        setSelectedBalloonId(draft.balloonId);
        setSelectedPilotId(draft.pilotId);
        setStartedAt(draft.startedAt);
        startedAtRef.current = draft.startedAt;
        setLivePoints(draft.points);
        pointsRef.current = draft.points;
        setElapsedMs(Date.now() - draft.startedAt);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  useEffect(() => {
    if (!isRecording || !startedAt) return;
    const timer = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRecording, startedAt]);

  useEffect(() => {
    return () => {
      sessionRef.current?.stop();
    };
  }, []);

  const isReadOnly = activeRole === 'inspector';
  const latestPoint = livePoints[livePoints.length - 1] || null;

  const handleStartRecording = async () => {
    if (!selectedBalloonId || !selectedPilotId || isReadOnly) return;
    setGpsError(null);
    const now = Date.now();
    const initialPts = livePoints.length > 0 && startedAt ? livePoints : [];
    const effectiveStart = startedAt || now;
    setStartedAt(effectiveStart);
    startedAtRef.current = effectiveStart;
    pointsRef.current = initialPts;
    setIsRecording(true);

    const handle = await startTelemetrySession(telemetryMode, {
      onPoint: (pt) => {
        const nextPts = [...pointsRef.current, pt];
        pointsRef.current = nextPts;
        setLivePoints(nextPts);
        void saveActiveFlightDraft({
          id: `draft-${effectiveStart}`,
          companyId,
          balloonId: selectedBalloonId,
          pilotId: selectedPilotId,
          startedAt: effectiveStart,
          points: nextPts,
          mode: telemetryMode,
        });
      },
      onError: (msg) => setGpsError(msg),
    });

    sessionRef.current = handle;
    setWakeLockActive(handle.wakeLockActive);
  };

  const handleStopRecording = async () => {
    if (sessionRef.current) {
      await sessionRef.current.stop();
      sessionRef.current = null;
    }
    setIsRecording(false);
    setWakeLockActive(false);

    const pts = pointsRef.current;
    const startTs = startedAtRef.current || Date.now();
    const endTs = pts[pts.length - 1]?.timestamp || Date.now();
    const durationMin = Math.max(1, Math.round((endTs - startTs) / 60000));

    if (pts.length > 0) {
      const newLog: FlightLog = {
        id: `flt-${Date.now()}`,
        companyId,
        balloonId: selectedBalloonId,
        pilotId: selectedPilotId,
        startedAt: startTs,
        endedAt: endTs,
        durationMinutes: durationMin,
        maxAltM: Math.max(...pts.map((p) => p.altM)),
        maxSpeedKmh: Math.max(...pts.map((p) => p.speedKmh)),
        maxClimbMs: Math.max(0, ...pts.map((p) => p.varioMs)),
        maxSinkMs: Math.min(0, ...pts.map((p) => p.varioMs)),
        points: pts,
        syncStatus: isOnline ? 'synced' : 'pending_sync',
        notes: notes.trim() || undefined,
      };
      await onSaveFlightLog(newLog);
    }

    await saveActiveFlightDraft(null);
    setStartedAt(null);
    startedAtRef.current = null;
    setLivePoints([]);
    pointsRef.current = [];
    setElapsedMs(0);
    setNotes('');
  };

  const varioVal = latestPoint?.varioMs ?? 0;
  const varioClamp = Math.max(-5, Math.min(5, varioVal));
  const varioBarPct = Math.abs(varioClamp) * 20;

  // Live SVG altitude graph
  const liveAltitudePath = useMemo(() => {
    if (livePoints.length < 2) return '';
    const minAlt = Math.min(...livePoints.map((p) => p.altM));
    const maxAlt = Math.max(...livePoints.map((p) => p.altM), minAlt + 10);
    const w = 480;
    const h = 84;
    return livePoints
      .map((pt, i) => {
        const x = (i / (livePoints.length - 1)) * w;
        const y = h - 8 - ((pt.altM - minAlt) / (maxAlt - minAlt)) * (h - 16);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [livePoints]);

  const pendingLogsCount = flightLogs.filter((l) => l.syncStatus === 'pending_sync').length;

  return (
    <div className="space-y-6">
      {/* High-contrast Cockpit Telemetry Panel */}
      <section className="overflow-hidden rounded-xl border border-slate-800 bg-[#0B1220] text-slate-100 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-3">
            <Compass className="h-5 w-5 text-orange-400" />
            <div>
              <h2 className="text-base font-bold tracking-tight text-white">
                {language === 'tr' ? 'Canlı Uçuş Kokpiti & Varyometre' : 'Live Flight Cockpit & Variometer'}
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'tr'
                  ? 'İnternet kesilse dahi her GPS noktası IndexedDB yerel belleğine yazılır.'
                  : 'Every GPS point is saved to offline IndexedDB even when network drops.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-700 bg-slate-900 p-1">
              <button
                type="button"
                disabled={isRecording}
                onClick={() => setTelemetryMode('gps')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  telemetryMode === 'gps'
                    ? 'bg-[#0F4C81] text-white'
                    : 'text-slate-400 hover:text-white'
                } disabled:opacity-50`}
              >
                {t('gpsLive')}
              </button>
              <button
                type="button"
                disabled={isRecording}
                onClick={() => setTelemetryMode('simulator')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  telemetryMode === 'simulator'
                    ? 'bg-[#0F4C81] text-white'
                    : 'text-slate-400 hover:text-white'
                } disabled:opacity-50`}
              >
                {t('gpsSim')}
              </button>
            </div>
          </div>
        </div>

        {/* Selectors & Record CTA */}
        <div className="grid grid-cols-1 gap-4 border-b border-slate-800/80 bg-slate-900/50 px-5 py-4 md:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              {language === 'tr' ? 'Balon Seçimi' : 'Select Balloon'}
            </label>
            <select
              disabled={isRecording || isReadOnly}
              value={selectedBalloonId}
              onChange={(e) => setSelectedBalloonId(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm font-medium text-white focus:border-sky-500 focus:outline-none disabled:opacity-60"
            >
              {balloons.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.registration} · {b.model}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              {language === 'tr' ? 'Sorumlu Pilot' : 'Pilot in Command'}
            </label>
            <select
              disabled={isRecording || isReadOnly}
              value={selectedPilotId}
              onChange={(e) => setSelectedPilotId(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm font-medium text-white focus:border-sky-500 focus:outline-none disabled:opacity-60"
            >
              {pilots.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.licenseNumber})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              {language === 'tr' ? 'Uçuş Notu (Opsiyonel)' : 'Flight Notes'}
            </label>
            <input
              type="text"
              disabled={isReadOnly}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={language === 'tr' ? 'Örn: Göreme sabah uçuşu' : 'e.g. Sunrise sortie'}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div className="flex items-end">
            {!isRecording ? (
              <button
                type="button"
                disabled={isReadOnly || !selectedBalloonId || !selectedPilotId}
                onClick={handleStartRecording}
                className="flex w-full min-h-[46px] items-center justify-center gap-2 rounded-lg bg-[#EA580C] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#c2410c] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>{t('startFlight')}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStopRecording}
                className="flex w-full min-h-[46px] items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
              >
                <Square className="h-4 w-4 fill-current" />
                <span>{t('stopFlight')}</span>
              </button>
            )}
          </div>
        </div>

        {gpsError && (
          <div className="border-b border-amber-800/60 bg-amber-950/60 px-5 py-2.5 text-xs text-amber-200">
            {gpsError}
          </div>
        )}

        {/* Primary Telemetry Readouts */}
        <div className="grid grid-cols-2 divide-x divide-y divide-slate-800 md:grid-cols-4 md:divide-y-0">
          <div className="p-5">
            <div className="text-xs font-medium text-slate-400">{t('altitude')}</div>
            <div className="mt-1.5 flex items-baseline gap-1.5 font-mono text-3xl font-bold text-white">
              <span>{latestPoint ? latestPoint.altM : '---'}</span>
              <span className="text-sm font-normal text-slate-400">m</span>
            </div>
            <div className="mt-1 font-mono text-[11px] text-slate-500">MSL GPS</div>
          </div>

          <div className="p-5">
            <div className="text-xs font-medium text-slate-400">{t('groundSpeed')}</div>
            <div className="mt-1.5 flex items-baseline gap-1.5 font-mono text-3xl font-bold text-white">
              <span>{latestPoint ? latestPoint.speedKmh.toFixed(1) : '--.-'}</span>
              <span className="text-sm font-normal text-slate-400">km/s</span>
            </div>
            <div className="mt-1 font-mono text-[11px] text-slate-500">GS VECTOR</div>
          </div>

          <div className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">{t('variometer')}</span>
              {varioVal > 0.15 ? (
                <ArrowUp className="h-4 w-4 text-emerald-400" />
              ) : varioVal < -0.15 ? (
                <ArrowDown className="h-4 w-4 text-amber-400" />
              ) : (
                <Activity className="h-4 w-4 text-slate-500" />
              )}
            </div>
            <div
              className={`mt-1.5 flex items-baseline gap-1.5 font-mono text-3xl font-bold ${
                varioVal > 0.15
                  ? 'text-emerald-400'
                  : varioVal < -0.15
                  ? 'text-amber-400'
                  : 'text-white'
              }`}
            >
              <span>{latestPoint ? `${varioVal > 0 ? '+' : ''}${varioVal.toFixed(2)}` : '0.00'}</span>
              <span className="text-sm font-normal text-slate-400">m/s</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full transition-all duration-150 ${
                  varioVal >= 0 ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(100, varioBarPct)}%` }}
              />
            </div>
          </div>

          <div className="p-5">
            <div className="text-xs font-medium text-slate-400">{t('elapsed')}</div>
            <div className="mt-1.5 font-mono text-3xl font-bold text-sky-400">
              {formatDurationMs(elapsedMs)}
            </div>
            <div className="mt-1 font-mono text-[11px] text-slate-400">
              {livePoints.length} {language === 'tr' ? 'nokta' : 'pts'}
              {wakeLockActive && ` · ${t('wakeLockActive')}`}
            </div>
          </div>
        </div>

        {/* Live Coordinate & Elevation Strip */}
        <div className="flex flex-col gap-3 border-t border-slate-800 bg-slate-950/60 px-5 py-3.5 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-slate-300">
            <Navigation className="h-3.5 w-3.5 text-sky-400" />
            <span>
              {latestPoint
                ? `${latestPoint.lat.toFixed(5)}°, ${latestPoint.lng.toFixed(5)}°`
                : '38.64310°, 34.82890°'}
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">
              {isRecording
                ? language === 'tr'
                  ? 'Yerel IndexedDB anlık yazılıyor'
                  : 'Writing to local IndexedDB'
                : language === 'tr'
                ? 'Kayıt hazır'
                : 'Ready to record'}
            </span>
          </div>

          {liveAltitudePath && (
            <svg viewBox="0 0 480 84" className="h-12 w-full max-w-md rounded bg-slate-900/70 px-1">
              <path d={liveAltitudePath} fill="none" stroke="#38BDF8" strokeWidth="2.2" />
            </svg>
          )}
        </div>
      </section>

      {/* Immutable Flight Log Archive */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Lock className="h-4 w-4 text-slate-500" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t('flightRecords')}</h3>
              <p className="text-xs text-slate-500">
                {language === 'tr'
                  ? 'Pilotlar uçuş loglarını silemez; GPX dışa aktarırken başlangıç ve bitiş saatini kırpabilir.'
                  : 'Pilots cannot delete flight logs; start and end times can be trimmed during GPX export.'}
              </p>
            </div>
          </div>

          {pendingLogsCount > 0 && (
            <button
              type="button"
              onClick={onSyncPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-[#0F4C81] hover:bg-sky-100"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>
                {pendingLogsCount} {t('syncNow')}
              </span>
            </button>
          )}
        </div>

        {flightLogs.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">{t('noData')}</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {flightLogs.map((log) => {
              const b = balloons.find((x) => x.id === log.balloonId);
              const p = personnel.find((x) => x.id === log.pilotId);
              const dateStr = new Date(log.startedAt).toLocaleString(
                language === 'tr' ? 'tr-TR' : 'en-US',
                { dateStyle: 'medium', timeStyle: 'short' }
              );
              return (
                <div
                  key={log.id}
                  className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-slate-50/80 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
                      <span className="font-mono">{b?.registration || 'TC-???'}</span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <span>{p?.fullName || 'Pilot'}</span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <span className="font-mono text-xs font-normal text-slate-500">{dateStr}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-slate-600">
                      <span>{log.durationMinutes} dk</span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <span>Max {log.maxAltM} m</span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <span>Max {log.maxSpeedKmh} km/s</span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <span>{log.points.length} GPS</span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      {log.syncStatus === 'synced' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-sans font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {language === 'tr' ? 'Sunucu Senkron' : 'Synced'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-sans font-medium">
                          <CloudOff className="h-3.5 w-3.5" />
                          {language === 'tr' ? 'Yerelde Bekliyor' : 'Pending Sync'}
                        </span>
                      )}
                    </div>
                    {log.notes && <p className="text-xs text-slate-500">{log.notes}</p>}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setExportTarget(log)}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:border-[#0F4C81] hover:text-[#0F4C81] min-h-[40px] whitespace-nowrap"
                    >
                      <Scissors className="h-3.5 w-3.5 text-[#EA580C]" />
                      <span>{t('exportTrimGpx')}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {exportTarget && (
        <GpxExportModal
          flight={exportTarget}
          balloon={balloons.find((b) => b.id === exportTarget.balloonId)}
          pilot={personnel.find((p) => p.id === exportTarget.pilotId)}
          language={language}
          onClose={() => setExportTarget(null)}
        />
      )}
    </div>
  );
};
