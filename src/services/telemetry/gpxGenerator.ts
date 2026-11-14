import { FlightLog, TrackPoint } from '../../types/domain';

export function filterPointsByTimeRange(
  points: TrackPoint[],
  trimStartMs: number,
  trimEndMs: number
): TrackPoint[] {
  return points.filter((p) => p.timestamp >= trimStartMs && p.timestamp <= trimEndMs);
}

export function generateGpxXml(
  flight: FlightLog,
  balloonRegistration: string,
  pilotName: string,
  trimStartMs: number,
  trimEndMs: number
): string {
  const filtered = filterPointsByTimeRange(flight.points, trimStartMs, trimEndMs);
  const safePoints = filtered.length > 0 ? filtered : flight.points;
  const isoStart = new Date(trimStartMs).toISOString();

  const trkpts = safePoints
    .map(
      (pt) => `      <trkpt lat="${pt.lat}" lon="${pt.lng}">
        <ele>${pt.altM}</ele>
        <time>${new Date(pt.timestamp).toISOString()}</time>
        <extensions>
          <speed_kmh>${pt.speedKmh}</speed_kmh>
          <vario_ms>${pt.varioMs}</vario_ms>
        </extensions>
      </trkpt>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="AeroBalon Ops PWA" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${balloonRegistration} - ${pilotName}</name>
    <time>${isoStart}</time>
  </metadata>
  <trk>
    <name>${balloonRegistration} Uçuş Kaydı (${pilotName})</name>
    <type>Hot Air Balloon Flight</type>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>
`;
}

export function downloadGpxFile(gpxXml: string, filename: string): void {
  const blob = new Blob([gpxXml], { type: 'application/gpx+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function shareGpxFile(
  gpxXml: string,
  filename: string,
  summaryText: string
): Promise<'shared' | 'downloaded'> {
  const file = new File([gpxXml], filename, { type: 'application/gpx+xml' });
  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    const canShareFiles =
      'canShare' in navigator &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] });

    try {
      if (canShareFiles) {
        await navigator.share({
          title: filename,
          text: summaryText,
          files: [file],
        });
        return 'shared';
      }
      await navigator.share({
        title: filename,
        text: summaryText,
      });
      downloadGpxFile(gpxXml, filename);
      return 'shared';
    } catch {
      downloadGpxFile(gpxXml, filename);
      return 'downloaded';
    }
  }
  downloadGpxFile(gpxXml, filename);
  return 'downloaded';
}

export function buildWhatsAppShareUrl(summaryText: string): string {
  return `https://wa.me/?text=${encodeURIComponent(summaryText)}`;
}

export function buildMailtoShareUrl(subject: string, body: string): string {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
