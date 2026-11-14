import React, { useMemo, useState } from 'react';
import {
  Cylinder,
  Eye,
  FilePlus2,
  Flame,
  Plus,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import {
  Balloon,
  ComplianceDocument,
  CustomFieldDef,
  DocumentTemplate,
  GasCylinder,
  Language,
  UserRole,
} from '../../types/domain';
import {
  evaluate100hMaintenance,
  evaluateExpiry,
  formatBytes,
  readFileAsDataUrl,
} from '../../utils/compliance';
import { useT } from '../../i18n/translations';
import { ComplianceStatusLabel } from '../../components/shared/ComplianceStatusLabel';
import { DocumentPreviewModal } from '../../components/shared/DocumentPreviewModal';

interface Props {
  companyId: string;
  balloons: Balloon[];
  documents: ComplianceDocument[];
  documentTemplates: DocumentTemplate[];
  customFields: CustomFieldDef[];
  activeRole: UserRole;
  activePersonnelId: string;
  language: Language;
  onAddBalloon: (balloon: Balloon) => void;
  onUpdateBalloon: (balloon: Balloon) => void;
  onAddDocument: (doc: ComplianceDocument) => void;
  onDeleteDocument: (docId: string) => void;
}

export const BalloonsView: React.FC<Props> = ({
  companyId,
  balloons,
  documents,
  documentTemplates,
  customFields,
  activeRole,
  activePersonnelId,
  language,
  onAddBalloon,
  onUpdateBalloon,
  onAddDocument,
  onDeleteDocument,
}) => {
  const t = useT(language);
  const [selectedId, setSelectedId] = useState<string>(balloons[0]?.id || '');
  const [showAddBalloon, setShowAddBalloon] = useState(false);
  const [showAddCylinder, setShowAddCylinder] = useState(false);
  const [showUploadDoc, setShowUploadDoc] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<ComplianceDocument | null>(null);

  // Add balloon form state
  const [regInput, setRegInput] = useState('');
  const [modelInput, setModelInput] = useState('');
  const [serialInput, setSerialInput] = useState('');
  const [hoursInput, setHoursInput] = useState('0');

  // Add cylinder form state
  const [cylSerial, setCylSerial] = useState('');
  const [cylVolume, setCylVolume] = useState('80');
  const [cylLastTest, setCylLastTest] = useState(new Date().toISOString().split('T')[0]);
  const [cylNextTest, setCylNextTest] = useState('');

  // Upload document state
  const balloonTemplates = useMemo(
    () => documentTemplates.filter((dt) => dt.targetType === 'balloon'),
    [documentTemplates]
  );
  const [docTemplateId, setDocTemplateId] = useState<string>(balloonTemplates[0]?.id || '');
  const [docExpiry, setDocExpiry] = useState<string>('');
  const [docFile, setDocFile] = useState<File | null>(null);

  const selectedBalloon =
    balloons.find((b) => b.id === selectedId) || balloons[0] || null;

  const canManageFleet = activeRole === 'admin' || activeRole === 'responsible';
  const isReadOnly = activeRole === 'inspector';
  const balloonCustomFields = customFields.filter((cf) => cf.target === 'balloon');

  const handleCreateBalloon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regInput.trim() || !modelInput.trim()) return;
    const hrs = Number(hoursInput) || 0;
    const newBalloon: Balloon = {
      id: `bal-${Date.now()}`,
      companyId,
      registration: regInput.trim().toUpperCase(),
      model: modelInput.trim(),
      serialNumber: serialInput.trim() || 'N/A',
      totalFlightHours: hrs,
      hoursAtLast100hCheck: hrs,
      cylinders: [],
      customFields: {},
    };
    onAddBalloon(newBalloon);
    setSelectedId(newBalloon.id);
    setRegInput('');
    setModelInput('');
    setSerialInput('');
    setHoursInput('0');
    setShowAddBalloon(false);
  };

  const handleReset100h = () => {
    if (!selectedBalloon || !canManageFleet) return;
    onUpdateBalloon({
      ...selectedBalloon,
      hoursAtLast100hCheck: selectedBalloon.totalFlightHours,
    });
  };

  const handleAddCylinder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBalloon || !cylSerial.trim() || !cylNextTest) return;
    const nextCyl: GasCylinder = {
      id: `cyl-${Date.now()}`,
      serialNumber: cylSerial.trim().toUpperCase(),
      capacityLiters: Number(cylVolume) || 80,
      lastTestDate: cylLastTest,
      nextTestDate: cylNextTest,
    };
    onUpdateBalloon({
      ...selectedBalloon,
      cylinders: [...selectedBalloon.cylinders, nextCyl],
    });
    setCylSerial('');
    setCylNextTest('');
    setShowAddCylinder(false);
  };

  const handleDeleteCylinder = (cylId: string) => {
    if (!selectedBalloon || !canManageFleet) return;
    onUpdateBalloon({
      ...selectedBalloon,
      cylinders: selectedBalloon.cylinders.filter((c) => c.id !== cylId),
    });
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBalloon || !docFile) return;
    const tpl = balloonTemplates.find((t) => t.id === docTemplateId) || balloonTemplates[0];
    const dataUrl = await readFileAsDataUrl(docFile);
    const newDoc: ComplianceDocument = {
      id: `doc-${Date.now()}`,
      companyId,
      targetId: selectedBalloon.id,
      targetKind: 'balloon',
      templateId: tpl?.id || 'custom',
      customTitle: tpl ? undefined : docFile.name,
      fileName: docFile.name,
      fileMime: docFile.type || 'application/pdf',
      fileSizeBytes: docFile.size,
      fileDataUrl: dataUrl,
      uploadedById: activePersonnelId || 'admin',
      uploadedByRole: activeRole,
      isSpecialDoc: false,
      hasExpiry: tpl ? tpl.hasExpiry : Boolean(docExpiry),
      expiryDate: docExpiry || undefined,
      adminVerified: activeRole === 'admin',
      uploadedAt: new Date().toISOString().split('T')[0],
    };
    onAddDocument(newDoc);
    setDocFile(null);
    setDocExpiry('');
    setShowUploadDoc(false);
  };

  const selectedBalloonDocs = selectedBalloon
    ? documents.filter((d) => d.targetKind === 'balloon' && d.targetId === selectedBalloon.id)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {language === 'tr' ? 'Balon Kartları & Envanter' : 'Balloon Cards & Fleet Inventory'}
          </h2>
          <p className="text-xs text-slate-500">
            {language === 'tr'
              ? 'Tescil, 100 saatlik bakım geri sayımı, kayıtlı tüp seri numaraları ve süreli uçuşa elverişlilik evrakları.'
              : 'Registrations, 100-hour maintenance countdown, cylinder serial numbers, and airworthiness certificates.'}
          </p>
        </div>

        {canManageFleet && !isReadOnly && (
          <button
            type="button"
            onClick={() => setShowAddBalloon(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0F4C81] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0c3c66] min-h-[42px]"
          >
            <Plus className="h-4 w-4" />
            <span>{t('addBalloon')}</span>
          </button>
        )}
      </div>

      {balloons.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          {t('noData')}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Fleet List */}
          <div className="space-y-3 lg:col-span-4">
            {balloons.map((b) => {
              const maint = evaluate100hMaintenance(b);
              const bDocs = documents.filter((d) => d.targetId === b.id);
              const hasIssue = bDocs.some((d) => {
                const tpl = documentTemplates.find((x) => x.id === d.templateId);
                const ev = evaluateExpiry(d.hasExpiry, d.expiryDate, tpl?.warningDays ?? 30);
                return ev.state === 'expired' || ev.state === 'approaching';
              });
              const isSelected = selectedBalloon?.id === b.id;

              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedId(b.id)}
                  className={`w-full rounded-xl border p-4 text-left transition-colors ${
                    isSelected
                      ? 'border-[#0F4C81] bg-sky-50/40'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-mono text-base font-bold text-slate-900">
                        {b.registration}
                      </div>
                      <div className="text-xs font-medium text-slate-600">{b.model}</div>
                    </div>
                    <span className="font-mono text-xs font-semibold text-slate-700">
                      {b.totalFlightHours.toFixed(1)} s
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {t('maintenanceRemaining')}:{' '}
                      <strong
                        className={`font-mono ${
                          maint.state === 'expired'
                            ? 'text-red-700'
                            : maint.state === 'approaching'
                            ? 'text-amber-700'
                            : 'text-slate-800'
                        }`}
                      >
                        {maint.remainingHours} {t('hours')}
                      </strong>
                    </span>
                    <span className="font-mono">{b.cylinders.length} tüp</span>
                  </div>

                  {hasIssue && (
                    <div className="mt-2 text-[11px] font-semibold text-amber-700">
                      {language === 'tr' ? 'Evrak süre kontrolü gerekli' : 'Document renewal attention'}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Selected Balloon Detail */}
          {selectedBalloon && (
            <div className="space-y-6 lg:col-span-8">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-900 text-orange-400">
                      <Flame className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-mono text-xl font-bold text-slate-900">
                        {selectedBalloon.registration}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {selectedBalloon.model} · SN: <span className="font-mono">{selectedBalloon.serialNumber}</span>
                      </p>
                    </div>
                  </div>

                  {canManageFleet && !isReadOnly && (
                    <button
                      type="button"
                      onClick={handleReset100h}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 min-h-[40px]"
                    >
                      <Wrench className="h-3.5 w-3.5 text-[#0F4C81]" />
                      <span>{t('resetMaintenance')}</span>
                    </button>
                  )}
                </div>

                {/* Metrics Row */}
                {(() => {
                  const maint = evaluate100hMaintenance(selectedBalloon);
                  return (
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="rounded-lg bg-slate-50 p-3.5">
                        <div className="text-xs text-slate-500">{t('totalFlightHours')}</div>
                        <div className="mt-1 font-mono text-2xl font-bold text-slate-900">
                          {selectedBalloon.totalFlightHours.toFixed(1)} <span className="text-xs font-normal text-slate-500">{t('hours')}</span>
                        </div>
                      </div>

                      <div className="rounded-lg bg-slate-50 p-3.5 sm:col-span-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">{t('maintenanceRemaining')}</span>
                          <span
                            className={`font-mono font-bold ${
                              maint.state === 'expired'
                                ? 'text-red-700'
                                : maint.state === 'approaching'
                                ? 'text-amber-700'
                                : 'text-emerald-700'
                            }`}
                          >
                            {maint.remainingHours} / 100.0 {t('hours')}
                          </span>
                        </div>
                        <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={`h-full transition-all ${
                              maint.state === 'expired'
                                ? 'bg-red-600'
                                : maint.state === 'approaching'
                                ? 'bg-amber-500'
                                : 'bg-[#0F4C81]'
                            }`}
                            style={{ width: `${maint.percentUsed}%` }}
                          />
                        </div>
                        <div className="mt-1.5 font-mono text-[11px] text-slate-500">
                          {language === 'tr' ? 'Son bakım saati' : 'Last 100h check at'}: {selectedBalloon.hoursAtLast100hCheck.toFixed(1)} s
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Modular Custom Fields */}
                {balloonCustomFields.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                    {balloonCustomFields.map((cf) => (
                      <div key={cf.id}>
                        <label className="block text-xs font-medium text-slate-500">
                          {language === 'tr' ? cf.labelTr : cf.labelEn}
                        </label>
                        <input
                          type="text"
                          disabled={!canManageFleet || isReadOnly}
                          value={selectedBalloon.customFields[cf.fieldKey] || ''}
                          onChange={(e) =>
                            onUpdateBalloon({
                              ...selectedBalloon,
                              customFields: {
                                ...selectedBalloon.customFields,
                                [cf.fieldKey]: e.target.value,
                              },
                            })
                          }
                          placeholder="—"
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 disabled:bg-slate-50"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Gas Cylinders Section */}
              <div className="rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <Cylinder className="h-4 w-4 text-slate-600" />
                    <h4 className="text-sm font-bold text-slate-900">
                      {t('cylinders')} ({selectedBalloon.cylinders.length})
                    </h4>
                  </div>
                  {canManageFleet && !isReadOnly && (
                    <button
                      type="button"
                      onClick={() => setShowAddCylinder(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{t('addCylinder')}</span>
                    </button>
                  )}
                </div>

                {selectedBalloon.cylinders.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">{t('noData')}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-100 bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-5 py-2.5 font-semibold">{t('serialNo')}</th>
                          <th className="px-4 py-2.5 font-semibold">{t('capacity')}</th>
                          <th className="px-4 py-2.5 font-semibold">
                            {language === 'tr' ? 'Son Test' : 'Last Test'}
                          </th>
                          <th className="px-4 py-2.5 font-semibold">{t('nextTest')}</th>
                          {canManageFleet && !isReadOnly && <th className="px-4 py-2.5 text-right" />}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedBalloon.cylinders.map((cyl) => {
                          const ev = evaluateExpiry(true, cyl.nextTestDate, 30);
                          return (
                            <tr key={cyl.id} className="hover:bg-slate-50/70">
                              <td className="px-5 py-3 font-mono font-semibold text-slate-900">
                                {cyl.serialNumber}
                              </td>
                              <td className="px-4 py-3 font-mono text-slate-700">{cyl.capacityLiters} L</td>
                              <td className="px-4 py-3 font-mono text-slate-500">{cyl.lastTestDate}</td>
                              <td className="px-4 py-3">
                                <ComplianceStatusLabel
                                  state={ev.state}
                                  daysRemaining={ev.daysRemaining}
                                  language={language}
                                  expiryDate={cyl.nextTestDate}
                                />
                              </td>
                              {canManageFleet && !isReadOnly && (
                                <td className="px-4 py-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCylinder(cyl.id)}
                                    className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                    title={t('delete')}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Balloon Compliance Documents */}
              <div className="rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
                  <h4 className="text-sm font-bold text-slate-900">
                    {language === 'tr' ? 'Balon Evrakları & Süre Takibi' : 'Balloon Documents & Expiry'}
                  </h4>
                  {canManageFleet && !isReadOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        setDocTemplateId(balloonTemplates[0]?.id || '');
                        setShowUploadDoc(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F4C81] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0c3c66]"
                    >
                      <FilePlus2 className="h-3.5 w-3.5" />
                      <span>{t('addDocument')}</span>
                    </button>
                  )}
                </div>

                {selectedBalloonDocs.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">{t('noData')}</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {selectedBalloonDocs.map((doc) => {
                      const tpl = documentTemplates.find((x) => x.id === doc.templateId);
                      const docTitle =
                        (language === 'tr' ? tpl?.titleTr : tpl?.titleEn) ||
                        doc.customTitle ||
                        doc.fileName;
                      const ev = evaluateExpiry(doc.hasExpiry, doc.expiryDate, tpl?.warningDays ?? 30);

                      return (
                        <div
                          key={doc.id}
                          className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="text-sm font-semibold text-slate-900">{docTitle}</div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <span className="font-mono truncate max-w-[220px]">{doc.fileName}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono">{formatBytes(doc.fileSizeBytes)}</span>
                            </div>
                            <div>
                              <ComplianceStatusLabel
                                state={ev.state}
                                daysRemaining={ev.daysRemaining}
                                language={language}
                                expiryDate={doc.expiryDate}
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setPreviewDoc(doc)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>{t('preview')}</span>
                            </button>
                            {activeRole === 'admin' && (
                              <button
                                type="button"
                                onClick={() => onDeleteDocument(doc.id)}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Balloon Modal */}
      {showAddBalloon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <form
            onSubmit={handleCreateBalloon}
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">{t('addBalloon')}</h3>
              <button type="button" onClick={() => setShowAddBalloon(false)} className="p-1 text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {language === 'tr' ? 'Tescil İşareti (Örn: TC-BZD)' : 'Registration'}
                </label>
                <input
                  required
                  type="text"
                  value={regInput}
                  onChange={(e) => setRegInput(e.target.value)}
                  placeholder="TC-BZD"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {language === 'tr' ? 'Model & Hacim (Örn: CAMERON 420 cbft)' : 'Model & Volume'}
                </label>
                <input
                  required
                  type="text"
                  value={modelInput}
                  onChange={(e) => setModelInput(e.target.value)}
                  placeholder="CAMERON 420 cbft"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">{t('serialNo')}</label>
                  <input
                    type="text"
                    value={serialInput}
                    onChange={(e) => setSerialInput(e.target.value)}
                    placeholder="CAM-11894"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">{t('totalFlightHours')}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={hoursInput}
                    onChange={(e) => setHoursInput(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddBalloon(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#0F4C81] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0c3c66]"
              >
                {t('save')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Cylinder Modal */}
      {showAddCylinder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <form
            onSubmit={handleAddCylinder}
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">{t('addCylinder')}</h3>
              <button type="button" onClick={() => setShowAddCylinder(false)} className="p-1 text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">{t('serialNo')}</label>
                <input
                  required
                  type="text"
                  value={cylSerial}
                  onChange={(e) => setCylSerial(e.target.value)}
                  placeholder="CB-2099-04"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">{t('capacity')}</label>
                <input
                  required
                  type="number"
                  value={cylVolume}
                  onChange={(e) => setCylVolume(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    {language === 'tr' ? 'Son Test Tarihi' : 'Last Test'}
                  </label>
                  <input
                    required
                    type="date"
                    value={cylLastTest}
                    onChange={(e) => setCylLastTest(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">{t('nextTest')}</label>
                  <input
                    required
                    type="date"
                    value={cylNextTest}
                    onChange={(e) => setCylNextTest(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
                  />
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddCylinder(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#0F4C81] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0c3c66]"
              >
                {t('save')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Upload Balloon Document Modal */}
      {showUploadDoc && selectedBalloon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <form
            onSubmit={handleUploadDocument}
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {selectedBalloon.registration} · {t('addDocument')}
              </h3>
              <button type="button" onClick={() => setShowUploadDoc(false)} className="p-1 text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {language === 'tr' ? 'Evrak Türü' : 'Document Type'}
                </label>
                <select
                  value={docTemplateId}
                  onChange={(e) => setDocTemplateId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {balloonTemplates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {language === 'tr' ? tpl.titleTr : tpl.titleEn}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {language === 'tr' ? 'Son Geçerlilik Tarihi (Süresiz ise boş bırakın)' : 'Expiry Date (optional)'}
                </label>
                <input
                  type="date"
                  value={docExpiry}
                  onChange={(e) => setDocExpiry(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {language === 'tr' ? 'PDF veya Görsel Dosya' : 'PDF or Image File'}
                </label>
                <input
                  required
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  className="mt-1 block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-700"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowUploadDoc(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#0F4C81] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0c3c66]"
              >
                {t('save')}
              </button>
            </div>
          </form>
        </div>
      )}

      {previewDoc && (
        <DocumentPreviewModal
          title={
            (language === 'tr'
              ? documentTemplates.find((x) => x.id === previewDoc.templateId)?.titleTr
              : documentTemplates.find((x) => x.id === previewDoc.templateId)?.titleEn) ||
            previewDoc.fileName
          }
          fileName={previewDoc.fileName}
          fileMime={previewDoc.fileMime}
          dataUrl={previewDoc.fileDataUrl}
          language={language}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
};
