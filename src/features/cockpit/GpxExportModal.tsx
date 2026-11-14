import React, { useMemo, useState } from 'react';
import { Download, Mail, MessageCircle, Scissors, Share2, X } from 'lucide-react';
import { Balloon, FlightLog, Language, Personnel } from '../../types/domain';
import {
  buildMailtoShareUrl,
  buildWhatsAppShareUrl,
  downloadGpxFile,
  filterPointsByTimeRange,
  generateGpxXml,
  shareGpxFile,
} from '../../services/telemetry/gpxGenerator';
import { formatDurationMs } from '../../utils/compliance';
import { useT } from '../../i18n/translations';

interface Props {
  flight: FlightLog;
  balloon?: Balloon;
  pilot?: Personnel;
  language: Language;
  onClose: () => void;
}

function toTimeInputValue(epochMs: number): string {
  const d = new Date(epochMs);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export const GpxExportModal: React.FC<Props> = ({
  flight,
  balloon,
  pilot,
  language,
  onClose,
}) => {
  const t = useT(language);
  const firstTs = flight.points[0]?.timestamp ?? flight.startedAt;
  const lastTs = flight.points[flight.points.length - 1]?.timestamp ?? flight.endedAt;
  const totalSpanMs = Math.max(1000, lastTs - firstTs);

  const [trimStartMs, setTrimStartMs] = useState<number>(firstTs);
  const [trimEndMs, setTrimEndMs] = useState<number>(lastTs);
  const [feedback, setFeedback] = useState<string | null>(null);

  const trimmedPoints = useMemo(
    () => filterPointsByTimeRange(flight.points, trimStartMs, trimEndMs),
    [flight.points, trimStartMs, trimEndMs]
  );

  const balloonReg = balloon?.registration || 'BALLOON';
  const pilotName = pilot?.fullName || 'Pilot';
  const fileDate = new Date(trimStartMs).toISOString().slice(0, 10);
  const filename = `${balloonReg}_${fileDate}_ucus.gpx`;

  const summaryText = `${balloonReg} (${balloon?.model || ''}) — ${pilotName}\n${
    language === 'tr' ? 'Uçuş Süresi' : 'Duration'
  }: ${formatDurationMs(trimEndMs - trimStartMs)}\n${
    language === 'tr' ? 'Kayıt Aralığı' : 'Window'
  }: ${toTimeInputValue(trimStartMs)} - ${toTimeInputValue(trimEndMs)}\nMax ${
    language === 'tr' ? 'İrtifa' : 'Alt'
  }: ${
    trimmedPoints.length > 0 ? Math.max(...trimmedPoints.map((p) => p.altM)) : flight.maxAltM
  } m`;

  const handleStartTimeEdit = (timeStr: string) => {
    const parts = timeStr.split(':').map(Number);
    if (parts.length < 2 || parts.some(Number.isNaN)) return;
    const base = new Date(firstTs);
    base.setHours(parts[0], parts[1], parts[2] || 0, 0);
    const nextMs = Math.max(firstTs, Math.min(trimEndMs - 1000, base.getTime()));
    setTrimStartMs(nextMs);
  };

  const handleEndTimeEdit = (timeStr: string) => {
    const parts = timeStr.split(':').map(Number);
    if (parts.length < 2 || parts.some(Number.isNaN)) return;
    const base = new Date(lastTs);
    base.setHours(parts[0], parts[1], parts[2] || 0, 0);
    const nextMs = Math.min(lastTs, Math.max(trimStartMs + 1000, base.getTime()));
    setTrimEndMs(nextMs);
  };

  const gpxXml = useMemo(
    () => generateGpxXml(flight, balloonReg, pilotName, trimStartMs, trimEndMs),
    [flight, balloonReg, pilotName, trimStartMs, trimEndMs]
  );

  const handleDownload = () => {
    downloadGpxFile(gpxXml, filename);
    setFeedback(
      language === 'tr'
        ? `${filename} indirildi (${trimmedPoints.length} GPS noktası).`
        : `Downloaded ${filename} (${trimmedPoints.length} GPS points).`
    );
  };

  const handleSystemShare = async () => {
    const result = await shareGpxFile(gpxXml, filename, summaryText);
    setFeedback(
      result === 'shared'
        ? language === 'tr'
          ? 'GPX dosyası paylaşım menüsüne aktarıldı.'
          : 'GPX file sent to system share sheet.'
        : language === 'tr'
        ? `${filename} cihazınıza indirildi.`
        : `Saved ${filename} to your device.`
    );
  };

  const handleWhatsAppShare = () => {
    downloadGpxFile(gpxXml, filename);
    const url = buildWhatsAppShareUrl(
      `${summaryText}\n\n(${language === 'tr' ? 'GPX dosyası indirildi, sohbete ekleyebilirsiniz' : 'GPX file downloaded and ready to attach'}: ${filename})`
    );
    window.open(url, '_blank', 'noopener,noreferrer');
    setFeedback(
      language === 'tr'
        ? 'GPX indirildi ve WhatsApp paylaşımı açıldı.'
        : 'GPX downloaded and WhatsApp opened.'
    );
  };

  const handleEmailShare = () => {
    downloadGpxFile(gpxXml, filename);
    window.location.href = buildMailtoShareUrl(
      `GPX Uçuş Kaydı: ${balloonReg} · ${fileDate}`,
      `${summaryText}\n\nEk dosya: ${filename}`
    );
  };

  // Build SVG elevation chart path
  const svgChart = useMemo(() => {
    const pts = flight.points;
    if (pts.length < 2) return null;
    const minAlt = Math.min(...pts.map((p) => p.altM));
    const maxAlt = Math.max(...pts.map((p) => p.altM), minAlt + 10);
    const w = 520;
    const h = 110;
    const toX = (ts: number) => ((ts - firstTs) / totalSpanMs) * w;
    const toY = (alt: number) => h - 10 - ((alt - minAlt) / (maxAlt - minAlt)) * (h - 22);

    const allPath = pts
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${toX(p.timestamp).toFixed(1)} ${toY(p.altM).toFixed(1)}`)
      .join(' ');
    const selPts = trimmedPoints;
    const selPath =
      selPts.length >= 2
        ? selPts
            .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${toX(p.timestamp).toFixed(1)} ${toY(p.altM).toFixed(1)}`)
            .join(' ')
        : '';

    return {
      w,
      h,
      allPath,
      selPath,
      selX1: toX(trimStartMs),
      selX2: toX(trimEndMs),
      minAlt,
      maxAlt,
    };
  }, [flight.points, trimmedPoints, firstTs, totalSpanMs, trimStartMs, trimEndMs]);

  const startPercent = Math.round(((trimStartMs - firstTs) / totalSpanMs) * 100);
  const endPercent = Math.round(((trimEndMs - firstTs) / totalSpanMs) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Scissors className="h-5 w-5 text-[#EA580C]" />
            <div>
              <h3 className="text-base font-bold text-slate-900">{t('exportTrimGpx')}</h3>
              <p className="font-mono text-xs text-slate-500">
                {balloonReg} · {pilotName} · {flight.points.length} GPS
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label={t('close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <p className="text-xs text-slate-600">
            {language === 'tr'
              ? 'Uçuş sonrası kaydı durdurmayı unuttuysanız başlangıç ve bitiş saatlerini buradan kırparak temiz .GPX dosyası oluşturabilirsiniz. Orijinal denetim kaydı sunucuda korunur.'
              : 'If you forgot to stop recording after landing, trim the start and end times here before exporting your .GPX track. The original audit log remains untouched.'}
          </p>

          {svgChart && (
            <div className="rounded-lg border border-slate-200 bg-slate-950 p-3">
              <div className="mb-2 flex items-center justify-between font-mono text-[11px] text-slate-400">
                <span>
                  {language === 'tr' ? 'İrtifa Profili' : 'Altitude Profile'}: {svgChart.minAlt}m – {svgChart.maxAlt}m
                </span>
                <span className="text-orange-400">
                  {trimmedPoints.length} / {flight.points.length} {language === 'tr' ? 'nokta seçili' : 'points selected'}
                </span>
              </div>
              <svg viewBox={`0 0 ${svgChart.w} ${svgChart.h}`} className="h-28 w-full">
                <rect
                  x={svgChart.selX1}
                  y={0}
                  width={Math.max(4, svgChart.selX2 - svgChart.selX1)}
                  height={svgChart.h}
                  fill="rgba(234, 88, 12, 0.14)"
                />
                <path d={svgChart.allPath} fill="none" stroke="#475569" strokeWidth="2" />
                {svgChart.selPath && (
                  <path d={svgChart.selPath} fill="none" stroke="#EA580C" strokeWidth="2.8" />
                )}
              </svg>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">{t('trimStart')}</label>
                <input
                  type="time"
                  step={1}
                  value={toTimeInputValue(trimStartMs)}
                  onChange={(e) => handleStartTimeEdit(e.target.value)}
                  className="rounded border border-slate-300 bg-white px-2 py-1 font-mono text-xs text-slate-900"
                />
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(1, endPercent - 1)}
                value={startPercent}
                onChange={(e) => {
                  const pct = Number(e.target.value);
                  const next = firstTs + (totalSpanMs * pct) / 100;
                  setTrimStartMs(Math.min(next, trimEndMs - 1000));
                }}
                className="mt-3 w-full accent-[#0F4C81]"
              />
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">{t('trimEnd')}</label>
                <input
                  type="time"
                  step={1}
                  value={toTimeInputValue(trimEndMs)}
                  onChange={(e) => handleEndTimeEdit(e.target.value)}
                  className="rounded border border-slate-300 bg-white px-2 py-1 font-mono text-xs text-slate-900"
                />
              </div>
              <input
                type="range"
                min={Math.min(99, startPercent + 1)}
                max={100}
                value={endPercent}
                onChange={(e) => {
                  const pct = Number(e.target.value);
                  const next = firstTs + (totalSpanMs * pct) / 100;
                  setTrimEndMs(Math.max(next, trimStartMs + 1000));
                }}
                className="mt-3 w-full accent-[#EA580C]"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-lg border border-slate-200 bg-white p-3 text-center">
            <div>
              <div className="text-[11px] text-slate-500">{t('elapsed')}</div>
              <div className="font-mono text-sm font-bold text-slate-900">
                {formatDurationMs(trimEndMs - trimStartMs)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">
                {language === 'tr' ? 'Seçili GPS' : 'Selected GPS'}
              </div>
              <div className="font-mono text-sm font-bold text-slate-900">{trimmedPoints.length}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">
                {language === 'tr' ? 'Maks. İrtifa' : 'Max Alt'}
              </div>
              <div className="font-mono text-sm font-bold text-slate-900">
                {trimmedPoints.length > 0 ? Math.max(...trimmedPoints.map((p) => p.altM)) : flight.maxAltM} m
              </div>
            </div>
          </div>

          {feedback && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-900">
              {feedback}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-200 bg-slate-50 px-5 py-3.5">
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-600 bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 min-h-[40px]"
          >
            <MessageCircle className="h-4 w-4" />
            <span>{t('shareWhatsApp')}</span>
          </button>
          <button
            type="button"
            onClick={handleEmailShare}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 min-h-[40px]"
          >
            <Mail className="h-4 w-4" />
            <span>E-posta</span>
          </button>
          <button
            type="button"
            onClick={handleSystemShare}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 min-h-[40px]"
          >
            <Share2 className="h-4 w-4" />
            <span>{t('shareSystem')}</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0F4C81] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0c3c66] min-h-[40px]"
          >
            <Download className="h-4 w-4" />
            <span>{t('downloadGpx')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
