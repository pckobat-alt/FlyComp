import React, { useMemo, useState } from 'react';
import {
  CheckSquare,
  Eye,
  FilePlus2,
  Plus,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {
  ComplianceDocument,
  CustomFieldDef,
  DocumentTemplate,
  Language,
  Personnel,
  PersonnelCategory,
  ResponsibilityDef,
  UserRole,
} from '../../types/domain';
import {
  evaluateExpiry,
  formatBytes,
  readFileAsDataUrl,
} from '../../utils/compliance';
import { useT } from '../../i18n/translations';
import { ComplianceStatusLabel } from '../../components/shared/ComplianceStatusLabel';
import { DocumentPreviewModal } from '../../components/shared/DocumentPreviewModal';

interface Props {
  companyId: string;
  personnel: Personnel[];
  responsibilities: ResponsibilityDef[];
  documents: ComplianceDocument[];
  documentTemplates: DocumentTemplate[];
  customFields: CustomFieldDef[];
  activeRole: UserRole;
  activePersonnelId: string;
  language: Language;
  onAddPersonnel: (person: Personnel) => void;
  onUpdatePersonnel: (person: Personnel) => void;
  onAddDocument: (doc: ComplianceDocument) => void;
  onUpdateDocument: (doc: ComplianceDocument) => void;
  onDeleteDocument: (docId: string) => void;
}

export const PersonnelView: React.FC<Props> = ({
  companyId,
  personnel,
  responsibilities,
  documents,
  documentTemplates,
  customFields,
  activeRole,
  activePersonnelId,
  language,
  onAddPersonnel,
  onUpdatePersonnel,
  onAddDocument,
  onUpdateDocument,
  onDeleteDocument,
}) => {
  const t = useT(language);
  const [categoryFilter, setCategoryFilter] = useState<'pilots' | 'ground_crew'>('pilots');
  const [selectedId, setSelectedId] = useState<string>(personnel[0]?.id || '');
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [showUploadDoc, setShowUploadDoc] = useState(false);
  const [uploadAsSpecial, setUploadAsSpecial] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<ComplianceDocument | null>(null);

  // Add person form
  const [fullName, setFullName] = useState('');
  const [catInput, setCatInput] = useState<PersonnelCategory>('pilot');
  const [licenseInput, setLicenseInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');

  // Upload doc form
  const [docTemplateId, setDocTemplateId] = useState('');
  const [docExpiry, setDocExpiry] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);

  const filteredPersonnel = useMemo(() => {
    return personnel.filter((p) =>
      categoryFilter === 'pilots'
        ? p.category === 'pilot' || p.category === 'copilot'
        : p.category === 'ground_crew'
    );
  }, [personnel, categoryFilter]);

  const selectedPerson =
    personnel.find((p) => p.id === selectedId) || filteredPersonnel[0] || personnel[0] || null;

  const isAdmin = activeRole === 'admin';
  const isResponsible = activeRole === 'responsible';
  const isEmployee =
    activeRole === 'pilot' || activeRole === 'copilot' || activeRole === 'ground_crew';
  const isInspector = activeRole === 'inspector';

  const isOwnCard = selectedPerson?.id === activePersonnelId;
  const canUploadOwnDoc = isEmployee && isOwnCard;
  const canAdminManageDocs = isAdmin;
  const canUploadSpecialDoc = (isAdmin || isResponsible) && !isInspector;

  const personTemplates = useMemo(() => {
    if (!selectedPerson) return [];
    if (uploadAsSpecial) {
      return documentTemplates.filter((dt) => dt.targetType === 'special');
    }
    const targetType = selectedPerson.category === 'ground_crew' ? 'ground_crew' : 'pilot';
    return documentTemplates.filter((dt) => dt.targetType === targetType);
  }, [documentTemplates, selectedPerson, uploadAsSpecial]);

  const personnelCustomFields = customFields.filter((cf) => cf.target === 'personnel');

  const handleToggleResponsibility = (respId: string) => {
    if (!selectedPerson || !isAdmin) return;
    const exists = selectedPerson.responsibilityIds.includes(respId);
    const nextIds = exists
      ? selectedPerson.responsibilityIds.filter((id) => id !== respId)
      : [...selectedPerson.responsibilityIds, respId];
    onUpdatePersonnel({ ...selectedPerson, responsibilityIds: nextIds });
  };

  const handleCreatePerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    const next: Personnel = {
      id: `per-${Date.now()}`,
      companyId,
      category: catInput,
      fullName: fullName.trim(),
      licenseNumber: licenseInput.trim() || 'PENDING',
      email: emailInput.trim(),
      phone: phoneInput.trim(),
      responsibilityIds: [],
      customFields: {},
    };
    onAddPersonnel(next);
    setSelectedId(next.id);
    setCategoryFilter(catInput === 'ground_crew' ? 'ground_crew' : 'pilots');
    setFullName('');
    setLicenseInput('');
    setEmailInput('');
    setPhoneInput('');
    setShowAddPerson(false);
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson || !docFile) return;
    const tpl = personTemplates.find((x) => x.id === docTemplateId) || personTemplates[0];
    const dataUrl = await readFileAsDataUrl(docFile);

    const newDoc: ComplianceDocument = {
      id: `doc-${Date.now()}`,
      companyId,
      targetId: selectedPerson.id,
      targetKind: 'personnel',
      templateId: tpl?.id || 'custom',
      customTitle: tpl ? undefined : docFile.name,
      fileName: docFile.name,
      fileMime: docFile.type || 'application/pdf',
      fileSizeBytes: docFile.size,
      fileDataUrl: dataUrl,
      uploadedById: activePersonnelId || activeRole,
      uploadedByRole: activeRole,
      isSpecialDoc: uploadAsSpecial,
      hasExpiry: tpl ? tpl.hasExpiry : Boolean(docExpiry),
      // Only Company Admin sets verified expiry dates directly; employee-submitted docs await admin expiry check if expiry template
      expiryDate: isAdmin ? docExpiry || undefined : undefined,
      adminVerified: isAdmin,
      uploadedAt: new Date().toISOString().split('T')[0],
    };
    onAddDocument(newDoc);
    setDocFile(null);
    setDocExpiry('');
    setShowUploadDoc(false);
  };

  const selectedPersonDocs = selectedPerson
    ? documents.filter((d) => d.targetKind === 'personnel' && d.targetId === selectedPerson.id)
    : [];

  const getCategoryLabel = (cat: PersonnelCategory) => {
    if (cat === 'pilot') return 'Pilot';
    if (cat === 'copilot') return 'Copilot';
    return language === 'tr' ? 'Yer Ekibi' : 'Ground Crew';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {language === 'tr'
              ? 'Personel & Pilot Kartları (Ayrı Kategoriler)'
              : 'Personnel & Pilot Cards (Separated Categories)'}
          </h2>
          <p className="text-xs text-slate-500">
            {isAdmin
              ? t('adminDocControl')
              : isResponsible
              ? t('responsibleDocControl')
              : isInspector
              ? t('inspectorNotice')
              : t('ownDocumentsOnly')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setCategoryFilter('pilots')}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                categoryFilter === 'pilots'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('pilotsCategory')}
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('ground_crew')}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                categoryFilter === 'ground_crew'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('groundCrewCategory')}
            </button>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowAddPerson(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0F4C81] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0c3c66] min-h-[40px]"
            >
              <Plus className="h-4 w-4" />
              <span>{t('addPersonnel')}</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left List */}
        <div className="space-y-3 lg:col-span-4">
          {filteredPersonnel.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
              {t('noData')}
            </div>
          ) : (
            filteredPersonnel.map((person) => {
              const pDocs = documents.filter((d) => d.targetId === person.id);
              const assignedResps = responsibilities.filter((r) =>
                person.responsibilityIds.includes(r.id)
              );
              const isSelected = selectedPerson?.id === person.id;

              return (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => setSelectedId(person.id)}
                  className={`w-full rounded-xl border p-4 text-left transition-colors ${
                    isSelected
                      ? 'border-[#0F4C81] bg-sky-50/40'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        {person.fullName}
                        {person.id === activePersonnelId && (
                          <span className="ml-2 text-[11px] font-medium text-[#0F4C81]">
                            ({language === 'tr' ? 'Siz' : 'You'})
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                        <span>{getCategoryLabel(person.category)}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{person.licenseNumber}</span>
                      </div>
                    </div>
                    <span className="font-mono text-xs text-slate-500">{pDocs.length} evrak</span>
                  </div>

                  {assignedResps.length > 0 && (
                    <div className="mt-2 text-[11px] font-medium text-[#0F4C81]">
                      {assignedResps
                        .map((r) => (language === 'tr' ? r.titleTr : r.titleEn))
                        .join(' · ')}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Right Detail Card */}
        {selectedPerson && (
          <div className="space-y-6 lg:col-span-8">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-[#0F4C81]">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{selectedPerson.fullName}</h3>
                    <p className="text-xs text-slate-500">
                      {getCategoryLabel(selectedPerson.category)} ·{' '}
                      <span className="font-mono">{selectedPerson.licenseNumber}</span>
                      {selectedPerson.phone && ` · ${selectedPerson.phone}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Responsibility Assignment (Admin Editable, Others View-Only) */}
              <div className="mt-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <ShieldCheck className="h-4 w-4 text-[#0F4C81]" />
                  <span>
                    {language === 'tr'
                      ? 'Şirket İçi Atanan Sorumluluklar'
                      : 'Assigned Company Responsibilities'}
                  </span>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {responsibilities.map((resp) => {
                    const active = selectedPerson.responsibilityIds.includes(resp.id);
                    return (
                      <button
                        key={resp.id}
                        type="button"
                        disabled={!isAdmin}
                        onClick={() => handleToggleResponsibility(resp.id)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                          active
                            ? 'border-[#0F4C81] bg-[#0F4C81] text-white'
                            : 'border-slate-200 bg-slate-50 text-slate-600'
                        } ${isAdmin ? 'cursor-pointer hover:opacity-90' : 'cursor-default opacity-80'}`}
                      >
                        <CheckSquare className="h-3.5 w-3.5" />
                        <span>{language === 'tr' ? resp.titleTr : resp.titleEn}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Personnel Fields */}
              {personnelCustomFields.length > 0 && (
                <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                  {personnelCustomFields.map((cf) => (
                    <div key={cf.id}>
                      <label className="block text-xs font-medium text-slate-500">
                        {language === 'tr' ? cf.labelTr : cf.labelEn}
                      </label>
                      <input
                        type="text"
                        disabled={!isAdmin && !isOwnCard}
                        value={selectedPerson.customFields[cf.fieldKey] || ''}
                        onChange={(e) =>
                          onUpdatePersonnel({
                            ...selectedPerson,
                            customFields: {
                              ...selectedPerson.customFields,
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

            {/* Personnel Documents Section */}
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-slate-600" />
                  <h4 className="text-sm font-bold text-slate-900">
                    {language === 'tr' ? 'Personel Evrak & Lisans Dosyaları' : 'Personnel Licenses & Files'}
                  </h4>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {(canUploadOwnDoc || canAdminManageDocs) && (
                    <button
                      type="button"
                      onClick={() => {
                        setUploadAsSpecial(false);
                        const targetType =
                          selectedPerson.category === 'ground_crew' ? 'ground_crew' : 'pilot';
                        const first = documentTemplates.find((dt) => dt.targetType === targetType);
                        setDocTemplateId(first?.id || '');
                        setShowUploadDoc(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F4C81] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0c3c66]"
                    >
                      <FilePlus2 className="h-3.5 w-3.5" />
                      <span>{t('addDocument')}</span>
                    </button>
                  )}

                  {canUploadSpecialDoc && (
                    <button
                      type="button"
                      onClick={() => {
                        setUploadAsSpecial(true);
                        const firstSpecial = documentTemplates.find(
                          (dt) => dt.targetType === 'special'
                        );
                        setDocTemplateId(firstSpecial?.id || '');
                        setShowUploadDoc(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <ShieldCheck className="h-3.5 w-3.5 text-[#EA580C]" />
                      <span>
                        {language === 'tr' ? 'Özel Evrak Yükle (Sorumlu)' : 'Upload Special Doc'}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {selectedPersonDocs.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">{t('noData')}</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {selectedPersonDocs.map((doc) => {
                    const tpl = documentTemplates.find((x) => x.id === doc.templateId);
                    const docTitle =
                      (language === 'tr' ? tpl?.titleTr : tpl?.titleEn) ||
                      doc.customTitle ||
                      doc.fileName;
                    const ev = evaluateExpiry(doc.hasExpiry, doc.expiryDate, tpl?.warningDays ?? 30);

                    const canDeleteThisDoc =
                      isAdmin ||
                      (isEmployee &&
                        isOwnCard &&
                        doc.uploadedById === activePersonnelId &&
                        !doc.isSpecialDoc);

                    return (
                      <div
                        key={doc.id}
                        className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900">{docTitle}</span>
                            {doc.isSpecialDoc && (
                              <span className="text-[11px] font-semibold text-[#EA580C]">
                                · {language === 'tr' ? 'Sorumlu Özel Evrak' : 'Special Compliance Doc'}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="font-mono truncate max-w-[220px]">{doc.fileName}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono">{formatBytes(doc.fileSizeBytes)}</span>
                            <span aria-hidden="true">·</span>
                            <span>
                              {doc.adminVerified
                                ? language === 'tr'
                                  ? 'Yönetici Süre Onaylı'
                                  : 'Admin Expiry Verified'
                                : language === 'tr'
                                ? 'Yönetici Süre Kontrolü Bekliyor'
                                : 'Awaiting Admin Expiry Check'}
                            </span>
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

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {isAdmin && doc.hasExpiry && (
                            <input
                              type="date"
                              value={doc.expiryDate || ''}
                              onChange={(e) =>
                                onUpdateDocument({
                                  ...doc,
                                  expiryDate: e.target.value || undefined,
                                  adminVerified: true,
                                })
                              }
                              title={
                                language === 'tr'
                                  ? 'Firma Yöneticisi Bitiş Tarihi Belirle'
                                  : 'Admin Set Expiry Date'
                              }
                              className="rounded-lg border border-slate-300 px-2 py-1 font-mono text-xs text-slate-700"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => setPreviewDoc(doc)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>{t('preview')}</span>
                          </button>
                          {canDeleteThisDoc && (
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

      {/* Add Personnel Modal */}
      {showAddPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <form
            onSubmit={handleCreatePerson}
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">{t('addPersonnel')}</h3>
              <button type="button" onClick={() => setShowAddPerson(false)} className="p-1 text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {language === 'tr' ? 'Ad Soyad' : 'Full Name'}
                </label>
                <input
                  required
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    {language === 'tr' ? 'Kategori' : 'Category'}
                  </label>
                  <select
                    value={catInput}
                    onChange={(e) => setCatInput(e.target.value as PersonnelCategory)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="pilot">Pilot</option>
                    <option value="copilot">Copilot</option>
                    <option value="ground_crew">{language === 'tr' ? 'Yer Ekibi' : 'Ground Crew'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    {language === 'tr' ? 'Lisans / Sicil No' : 'License No'}
                  </label>
                  <input
                    type="text"
                    value={licenseInput}
                    onChange={(e) => setLicenseInput(e.target.value)}
                    placeholder="TR-BPL-..."
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">E-posta</label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    {language === 'tr' ? 'Telefon' : 'Phone'}
                  </label>
                  <input
                    type="text"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddPerson(false)}
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

      {/* Upload Personnel Document Modal */}
      {showUploadDoc && selectedPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <form
            onSubmit={handleUploadDocument}
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {selectedPerson.fullName} · {t('addDocument')}
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
                  {personTemplates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {language === 'tr' ? tpl.titleTr : tpl.titleEn}
                    </option>
                  ))}
                </select>
              </div>
              {isAdmin ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    {language === 'tr'
                      ? 'Son Geçerlilik Tarihi (Yönetici Onayı)'
                      : 'Expiry Date (Admin Verified)'}
                  </label>
                  <input
                    type="date"
                    value={docExpiry}
                    onChange={(e) => setDocExpiry(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                  />
                </div>
              ) : (
                <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                  {language === 'tr'
                    ? 'Not: Süreli evrakların bitiş tarihini Firma Yöneticisi kontrol edip onaylar.'
                    : 'Note: Expiry dates on personnel documents are controlled and verified by the Company Admin.'}
                </div>
              )}
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
