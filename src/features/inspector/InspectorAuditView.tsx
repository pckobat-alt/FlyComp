import React from 'react';
import { Download, Lock, Printer } from 'lucide-react';
import {
  Balloon,
  Company,
  ComplianceDocument,
  DocumentTemplate,
  FlightLog,
  Language,
  Personnel,
  TrainingRecord,
} from '../../types/domain';
import { evaluate100hMaintenance, evaluateExpiry } from '../../utils/compliance';
import { useT } from '../../i18n/translations';
import { ComplianceStatusLabel } from '../../components/shared/ComplianceStatusLabel';

interface Props {
  company: Company;
  balloons: Balloon[];
  personnel: Personnel[];
  documents: ComplianceDocument[];
  documentTemplates: DocumentTemplate[];
  trainings: TrainingRecord[];
  flightLogs: FlightLog[];
  language: Language;
}

export const InspectorAuditView: React.FC<Props> = ({
  company,
  balloons,
  personnel,
  documents,
  documentTemplates,
  trainings,
  flightLogs,
  language,
}) => {
  const t = useT(language);

  const handleExportAuditJson = () => {
    const bundle = {
      exportedAt: new Date().toISOString(),
      company: {
        name: company.name,
        aocNumber: company.aocNumber,
        baseLocation: company.baseLocation,
      },
      balloons,
      personnel,
      documents: documents.map(({ fileDataUrl: _omit, ...meta }) => meta),
      trainings: trainings.map(({ signedSheetDataUrl: _omit, ...meta }) => meta),
      flightLogsCount: flightLogs.length,
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${company.aocNumber}_SHGM_Denetim_Ozeti.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-300 bg-white p-5 print:border-0">
        <div className="flex items-center gap-4">
          <img
            src={company.logoDataUrl}
            alt={company.name}
            referrerPolicy="no-referrer"
            className="h-14 w-14 rounded-xl border border-slate-200 object-cover"
          />
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#0F4C81]">
              <Lock className="h-3.5 w-3.5" />
              <span>{t('inspectorNotice')}</span>
            </div>
            <h2 className="mt-0.5 text-xl font-bold text-slate-900">{company.name}</h2>
            <p className="font-mono text-xs text-slate-500">
              AOC: {company.aocNumber} · {company.baseLocation} ·{' '}
              {new Date().toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={handleExportAuditJson}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{language === 'tr' ? 'Denetim Özeti (JSON)' : 'Audit JSON'}</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F4C81] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0c3c66]"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>{t('printAudit')}</span>
          </button>
        </div>
      </div>

      {/* Fleet Compliance Matrix */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
          <h3 className="text-sm font-bold text-slate-900">
            1. {language === 'tr' ? 'Filo, 100 Saatlik Bakım & Tüp Uyumluluk Matrisi' : 'Fleet, 100h Maintenance & Cylinder Matrix'}
          </h3>
        </div>
        <div className="divide-y divide-slate-100">
          {balloons.map((b) => {
            const maint = evaluate100hMaintenance(b);
            const bDocs = documents.filter((d) => d.targetId === b.id);
            return (
              <div key={b.id} className="p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-mono text-base font-bold text-slate-900">{b.registration}</span>
                    <span className="ml-2 text-sm text-slate-600">{b.model}</span>
                  </div>
                  <div className="font-mono text-xs text-slate-700">
                    {t('totalFlightHours')}: <strong>{b.totalFlightHours.toFixed(1)} s</strong> ·{' '}
                    {t('maintenanceRemaining')}:{' '}
                    <strong className={maint.state === 'expired' ? 'text-red-700' : 'text-slate-900'}>
                      {maint.remainingHours} s
                    </strong>{' '}
                    · {b.cylinders.length} tüp
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {bDocs.map((doc) => {
                    const tpl = documentTemplates.find((x) => x.id === doc.templateId);
                    const ev = evaluateExpiry(doc.hasExpiry, doc.expiryDate, tpl?.warningDays ?? 30);
                    return (
                      <div key={doc.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                        <span className="font-medium text-slate-800 truncate pr-2">
                          {(language === 'tr' ? tpl?.titleTr : tpl?.titleEn) || doc.fileName}
                        </span>
                        <ComplianceStatusLabel
                          state={ev.state}
                          daysRemaining={ev.daysRemaining}
                          language={language}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Personnel & Pilot Matrix */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
          <h3 className="text-sm font-bold text-slate-900">
            2. {language === 'tr' ? 'Pilot & Yer Ekibi Lisans Geçerlilik Tablosu' : 'Pilot & Ground Crew License Validity'}
          </h3>
        </div>
        <div className="divide-y divide-slate-100">
          {personnel.map((p) => {
            const pDocs = documents.filter((d) => d.targetId === p.id);
            return (
              <div key={p.id} className="p-5 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-bold text-slate-900">
                    {p.fullName}{' '}
                    <span className="font-mono text-xs font-normal text-slate-500">
                      ({p.category} · {p.licenseNumber})
                    </span>
                  </div>
                  <span className="font-mono text-xs text-slate-500">{pDocs.length} evrak</span>
                </div>
                {pDocs.length > 0 && (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {pDocs.map((doc) => {
                      const tpl = documentTemplates.find((x) => x.id === doc.templateId);
                      const ev = evaluateExpiry(doc.hasExpiry, doc.expiryDate, tpl?.warningDays ?? 30);
                      return (
                        <div key={doc.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                          <span className="font-medium text-slate-800 truncate pr-2">
                            {(language === 'tr' ? tpl?.titleTr : tpl?.titleEn) || doc.fileName}
                          </span>
                          <ComplianceStatusLabel
                            state={ev.state}
                            daysRemaining={ev.daysRemaining}
                            language={language}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Trainings & Flight Logs Summary */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
            <h3 className="text-sm font-bold text-slate-900">
              3. {language === 'tr' ? 'Şirket İçi Eğitim Kayıtları' : 'Internal Training Records'} ({trainings.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {trainings.map((trn) => (
              <div key={trn.id} className="px-5 py-3 text-xs">
                <div className="font-semibold text-slate-900">{trn.title}</div>
                <div className="mt-0.5 font-mono text-slate-500">
                  {trn.trainingDate} · {trn.participantIds.length} katılımcı imzalı
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
            <h3 className="text-sm font-bold text-slate-900">
              4. {language === 'tr' ? 'Silinemez Uçuş Logları' : 'Immutable Flight Logs'} ({flightLogs.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {flightLogs.map((log) => {
              const b = balloons.find((x) => x.id === log.balloonId);
              const p = personnel.find((x) => x.id === log.pilotId);
              return (
                <div key={log.id} className="px-5 py-3 text-xs">
                  <div className="font-semibold text-slate-900">
                    {b?.registration} · {p?.fullName}
                  </div>
                  <div className="mt-0.5 font-mono text-slate-500">
                    {new Date(log.startedAt).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US')} ·{' '}
                    {log.durationMinutes} dk · Max {log.maxAltM} m · {log.points.length} GPS
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};
