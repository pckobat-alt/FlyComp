import React, { useState } from 'react';
import {
  Building2,
  Check,
  Copy,
  Database,
  Download,
  FileText,
  Layers,
  Plus,
  RotateCcw,
  Shield,
  Smartphone,
  Trash2,
} from 'lucide-react';
import {
  Company,
  CustomFieldDef,
  DocumentTargetType,
  DocumentTemplate,
  Language,
  ResponsibilityDef,
  TrainingTemplate,
} from '../../types/domain';
import { readFileAsDataUrl } from '../../utils/compliance';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  testSupabaseConnection,
} from '../../services/storage/supabaseAdapter';
import { SUPABASE_SQL_SCHEMA } from '../../services/storage/supabaseSchema';

interface Props {
  activeCompany: Company;
  companies: Company[];
  responsibilities: ResponsibilityDef[];
  documentTemplates: DocumentTemplate[];
  trainingTemplates: TrainingTemplate[];
  customFields: CustomFieldDef[];
  language: Language;
  onAddCompany: (company: Company) => void;
  onUpdateCompany: (company: Company) => void;
  onSelectCompany: (companyId: string) => void;
  onAddResponsibility: (resp: ResponsibilityDef) => void;
  onDeleteResponsibility: (id: string) => void;
  onAddDocTemplate: (tpl: DocumentTemplate) => void;
  onDeleteDocTemplate: (id: string) => void;
  onAddTrainingTemplate: (tpl: TrainingTemplate) => void;
  onDeleteTrainingTemplate: (id: string) => void;
  onAddCustomField: (field: CustomFieldDef) => void;
  onDeleteCustomField: (id: string) => void;
  onResetDemo: () => Promise<void>;
}

export const ModularStudioView: React.FC<Props> = ({
  activeCompany,
  companies,
  responsibilities,
  documentTemplates,
  trainingTemplates,
  customFields,
  language,
  onAddCompany,
  onUpdateCompany,
  onSelectCompany,
  onAddResponsibility,
  onDeleteResponsibility,
  onAddDocTemplate,
  onDeleteDocTemplate,
  onAddTrainingTemplate,
  onDeleteTrainingTemplate,
  onAddCustomField,
  onDeleteCustomField,
  onResetDemo,
}) => {
  const [tab, setTab] = useState<'company' | 'templates' | 'fields' | 'cloud'>('company');

  // Company creation/edit
  const [newCompName, setNewCompName] = useState('');
  const [newCompAoc, setNewCompAoc] = useState('');
  const [newCompLoc, setNewCompLoc] = useState('');

  // Document template form
  const [docTitle, setDocTitle] = useState('');
  const [docTarget, setDocTarget] = useState<DocumentTargetType>('balloon');
  const [docHasExpiry, setDocHasExpiry] = useState(true);
  const [docWarnDays, setDocWarnDays] = useState('30');

  // Training template form
  const [trnTitle, setTrnTitle] = useState('');
  const [trnContent, setTrnContent] = useState('');
  const [trnMonths, setTrnMonths] = useState('12');

  // Responsibility form
  const [respTitle, setRespTitle] = useState('');

  // Custom field form
  const [cfTarget, setCfTarget] = useState<'balloon' | 'personnel'>('balloon');
  const [cfLabel, setCfLabel] = useState('');

  // Supabase runtime config
  const initialSb = getSupabaseConfig();
  const [sbUrl, setSbUrl] = useState(initialSb.url);
  const [sbKey, setSbKey] = useState(initialSb.anonKey);
  const [sbStatus, setSbStatus] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleUploadCompanyLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    onUpdateCompany({ ...activeCompany, logoDataUrl: dataUrl });
  };

  const handleCreateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompName.trim()) return;
    const created: Company = {
      id: `comp-${Date.now()}`,
      name: newCompName.trim(),
      aocNumber: newCompAoc.trim() || 'TR-SHGM-NEW',
      baseLocation: newCompLoc.trim() || 'Türkiye',
      logoDataUrl: activeCompany.logoDataUrl,
      createdAt: new Date().toISOString().split('T')[0],
    };
    onAddCompany(created);
    onSelectCompany(created.id);
    setNewCompName('');
    setNewCompAoc('');
    setNewCompLoc('');
  };

  const handleCreateDocTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim()) return;
    onAddDocTemplate({
      id: `tpl-${Date.now()}`,
      companyId: activeCompany.id,
      targetType: docTarget,
      titleTr: docTitle.trim(),
      titleEn: docTitle.trim(),
      hasExpiry: docHasExpiry,
      warningDays: Number(docWarnDays) || 30,
      requiredForAudit: true,
    });
    setDocTitle('');
  };

  const handleCreateTrainingTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trnTitle.trim()) return;
    onAddTrainingTemplate({
      id: `tt-${Date.now()}`,
      companyId: activeCompany.id,
      titleTr: trnTitle.trim(),
      titleEn: trnTitle.trim(),
      defaultContent: trnContent.trim(),
      validityMonths: Number(trnMonths) || 12,
    });
    setTrnTitle('');
    setTrnContent('');
  };

  const handleCreateResponsibility = (e: React.FormEvent) => {
    e.preventDefault();
    if (!respTitle.trim()) return;
    onAddResponsibility({
      id: `resp-${Date.now()}`,
      companyId: activeCompany.id,
      key: respTitle.trim().toLowerCase().replace(/\s+/g, '_'),
      titleTr: respTitle.trim(),
      titleEn: respTitle.trim(),
      canUploadSpecialDocs: true,
      canCreateTrainings: true,
    });
    setRespTitle('');
  };

  const handleCreateCustomField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cfLabel.trim()) return;
    onAddCustomField({
      id: `cf-${Date.now()}`,
      companyId: activeCompany.id,
      target: cfTarget,
      labelTr: cfLabel.trim(),
      labelEn: cfLabel.trim(),
      fieldKey: cfLabel.trim().toLowerCase().replace(/[^a-z0-9]/g, '_'),
    });
    setCfLabel('');
  };

  const handleSaveAndTestSupabase = async () => {
    saveSupabaseConfig({ url: sbUrl, anonKey: sbKey });
    const res = await testSupabaseConnection();
    setSbStatus(res.message);
  };

  const handleCopySql = async () => {
    await navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleDownloadSql = () => {
    const blob = new Blob([SUPABASE_SQL_SCHEMA], { type: 'text/sql;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aerobalon_supabase_schema.sql';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {language === 'tr'
              ? 'Modüler Özellik Stüdyosu & Altyapı'
              : 'Modular Feature Studio & Infrastructure'}
          </h2>
          <p className="text-xs text-slate-500">
            {language === 'tr'
              ? 'Kod yazmadan yeni şirket, logo, evrak türü, eğitim şablonu, sorumluluk rolü ve özel alan ekleyin.'
              : 'Add companies, logos, document types, training templates, responsibilities, and custom fields without touching code.'}
          </p>
        </div>

        <button
          type="button"
          onClick={onResetDemo}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>{language === 'tr' ? 'Örnek Verileri Sıfırla' : 'Reset Demo Data'}</span>
        </button>
      </div>

      {/* Studio Tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
        {[
          { id: 'company', label: language === 'tr' ? 'Şirket & Logo' : 'Company & Logo', icon: Building2 },
          { id: 'templates', label: language === 'tr' ? 'Evrak & Eğitim Şablonları' : 'Doc & Training Templates', icon: FileText },
          { id: 'fields', label: language === 'tr' ? 'Sorumluluk & Özel Alanlar' : 'Roles & Custom Fields', icon: Layers },
          { id: 'cloud', label: language === 'tr' ? 'Supabase & Capacitor Rehberi' : 'Supabase & Capacitor', icon: Database },
        ].map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id as typeof tab)}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                active ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Company & Logo */}
      {tab === 'company' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              {language === 'tr' ? 'Aktif Firma Bilgileri & Logo' : 'Active Company & Logo'}
            </h3>
            <div className="flex items-center gap-4">
              <img
                src={activeCompany.logoDataUrl}
                alt={activeCompany.name}
                referrerPolicy="no-referrer"
                className="h-16 w-16 rounded-xl border border-slate-200 object-cover bg-slate-50"
              />
              <div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                  <span>{language === 'tr' ? 'Firma Logosu Yükle (PNG/SVG)' : 'Upload Company Logo'}</span>
                  <input type="file" accept="image/*" onChange={handleUploadCompanyLogo} className="hidden" />
                </label>
                <p className="mt-1 text-[11px] text-slate-500">
                  {language === 'tr'
                    ? 'Yüklenen logo üst panelde ve SHGM denetim raporlarında görünür.'
                    : 'Shown in the header and CAA inspection dossiers.'}
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600">
                  {language === 'tr' ? 'Firma Unvanı' : 'Company Name'}
                </label>
                <input
                  type="text"
                  value={activeCompany.name}
                  onChange={(e) => onUpdateCompany({ ...activeCompany, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600">SHGM AOC No</label>
                  <input
                    type="text"
                    value={activeCompany.aocNumber}
                    onChange={(e) => onUpdateCompany({ ...activeCompany, aocNumber: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600">
                    {language === 'tr' ? 'Operasyon Üssü' : 'Base Location'}
                  </label>
                  <input
                    type="text"
                    value={activeCompany.baseLocation}
                    onChange={(e) => onUpdateCompany({ ...activeCompany, baseLocation: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleCreateCompany} className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              {language === 'tr' ? 'Yeni Balon Firması Ekle (Çoklu Şirket)' : 'Add New Balloon Company'}
            </h3>
            <div className="space-y-3">
              <input
                required
                type="text"
                value={newCompName}
                onChange={(e) => setNewCompName(e.target.value)}
                placeholder={language === 'tr' ? 'Örn: Anadolu Balonculuk Ltd. Şti.' : 'Company name'}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={newCompAoc}
                  onChange={(e) => setNewCompAoc(e.target.value)}
                  placeholder="TR-SHGM-B-..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                />
                <input
                  type="text"
                  value={newCompLoc}
                  onChange={(e) => setNewCompLoc(e.target.value)}
                  placeholder={language === 'tr' ? 'Ürgüp / Nevşehir' : 'Base location'}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-[#0F4C81] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0c3c66]"
              >
                <Plus className="h-4 w-4" />
                <span>{language === 'tr' ? 'Şirketi Oluştur ve Geçiş Yap' : 'Create & Switch Company'}</span>
              </button>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <div className="text-xs font-semibold text-slate-600 mb-2">
                {language === 'tr' ? 'Kayıtlı Şirketler' : 'Registered Companies'} ({companies.length})
              </div>
              <div className="space-y-1.5">
                {companies.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onSelectCompany(c.id)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs ${
                      c.id === activeCompany.id
                        ? 'border-[#0F4C81] bg-sky-50 font-semibold text-[#0F4C81]'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{c.name}</span>
                    <span className="font-mono text-[11px]">{c.aocNumber}</span>
                  </button>
                ))}
              </div>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: Dynamic Document & Training Templates */}
      {tab === 'templates' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              {language === 'tr' ? 'Dinamik Evrak Şablonları' : 'Dynamic Document Templates'}
            </h3>
            <form onSubmit={handleCreateDocTemplate} className="space-y-3 border-b border-slate-100 pb-4">
              <input
                required
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder={language === 'tr' ? 'Örn: Telsiz Operatör Belgesi' : 'New document type title'}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={docTarget}
                  onChange={(e) => setDocTarget(e.target.value as DocumentTargetType)}
                  className="rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
                >
                  <option value="balloon">{language === 'tr' ? 'Balon' : 'Balloon'}</option>
                  <option value="pilot">Pilot / Copilot</option>
                  <option value="ground_crew">{language === 'tr' ? 'Yer Ekibi' : 'Ground Crew'}</option>
                  <option value="special">{language === 'tr' ? 'Özel Evrak' : 'Special'}</option>
                </select>
                <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-2 text-xs">
                  <input
                    type="checkbox"
                    checked={docHasExpiry}
                    onChange={(e) => setDocHasExpiry(e.target.checked)}
                    className="accent-[#0F4C81]"
                  />
                  <span>{language === 'tr' ? 'Süreli' : 'Has Expiry'}</span>
                </label>
                <input
                  type="number"
                  value={docWarnDays}
                  onChange={(e) => setDocWarnDays(e.target.value)}
                  placeholder="30"
                  title={language === 'tr' ? 'Uyarı günü' : 'Warning days'}
                  className="rounded-lg border border-slate-300 px-2.5 py-2 font-mono text-xs"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F4C81] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0c3c66]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{language === 'tr' ? 'Evrak Türü Ekle' : 'Add Document Type'}</span>
              </button>
            </form>

            <div className="max-h-72 space-y-2 overflow-y-auto">
              {documentTemplates.map((dt) => (
                <div
                  key={dt.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-800">
                      {language === 'tr' ? dt.titleTr : dt.titleEn}
                    </div>
                    <div className="font-mono text-[11px] text-slate-500">
                      {dt.targetType} · {dt.hasExpiry ? `${dt.warningDays} gün uyarı` : 'Süresiz'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteDocTemplate(dt.id)}
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              {language === 'tr' ? 'Modüler Eğitim Şablonları' : 'Modular Training Templates'}
            </h3>
            <form onSubmit={handleCreateTrainingTemplate} className="space-y-3 border-b border-slate-100 pb-4">
              <input
                required
                type="text"
                value={trnTitle}
                onChange={(e) => setTrnTitle(e.target.value)}
                placeholder={language === 'tr' ? 'Örn: Kış Operasyonu & Buzlanma Brifingi' : 'Training template title'}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <textarea
                rows={2}
                value={trnContent}
                onChange={(e) => setTrnContent(e.target.value)}
                placeholder={language === 'tr' ? 'Varsayılan eğitim içeriği...' : 'Default syllabus content...'}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={trnMonths}
                  onChange={(e) => setTrnMonths(e.target.value)}
                  className="w-24 rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
                />
                <span className="text-xs text-slate-500">
                  {language === 'tr' ? 'ay geçerlilik' : 'months validity'}
                </span>
                <button
                  type="submit"
                  className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-[#0F4C81] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0c3c66]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{language === 'tr' ? 'Eğitim Şablonu Ekle' : 'Add Training Template'}</span>
                </button>
              </div>
            </form>

            <div className="max-h-72 space-y-2 overflow-y-auto">
              {trainingTemplates.map((tt) => (
                <div
                  key={tt.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-semibold text-slate-800">
                      {language === 'tr' ? tt.titleTr : tt.titleEn}
                    </div>
                    <div className="truncate text-[11px] text-slate-500">{tt.defaultContent}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteTrainingTemplate(tt.id)}
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Responsibilities & Custom Fields */}
      {tab === 'fields' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#0F4C81]" />
              <h3 className="text-sm font-bold text-slate-900">
                {language === 'tr' ? 'Şirket Sorumluluk Rolleri' : 'Company Responsibility Roles'}
              </h3>
            </div>
            <form onSubmit={handleCreateResponsibility} className="flex gap-2">
              <input
                required
                type="text"
                value={respTitle}
                onChange={(e) => setRespTitle(e.target.value)}
                placeholder={language === 'tr' ? 'Örn: Emniyet Yönetim (SMS) Sorumlusu' : 'New responsibility role'}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F4C81] px-4 py-2 text-xs font-semibold text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{language === 'tr' ? 'Ekle' : 'Add'}</span>
              </button>
            </form>
            <div className="space-y-2">
              {responsibilities.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
                >
                  <span className="font-semibold text-slate-800">
                    {language === 'tr' ? r.titleTr : r.titleEn}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeleteResponsibility(r.id)}
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#EA580C]" />
              <h3 className="text-sm font-bold text-slate-900">
                {language === 'tr' ? 'Kartlara Özel Alan Ekle (Kodsuz)' : 'Custom Card Fields (No-Code)'}
              </h3>
            </div>
            <form onSubmit={handleCreateCustomField} className="flex flex-wrap gap-2">
              <select
                value={cfTarget}
                onChange={(e) => setCfTarget(e.target.value as 'balloon' | 'personnel')}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
              >
                <option value="balloon">{language === 'tr' ? 'Balon Kartı' : 'Balloon Card'}</option>
                <option value="personnel">{language === 'tr' ? 'Personel Kartı' : 'Personnel Card'}</option>
              </select>
              <input
                required
                type="text"
                value={cfLabel}
                onChange={(e) => setCfLabel(e.target.value)}
                placeholder={language === 'tr' ? 'Örn: Sepet Kapasitesi / Telsiz Çağrı Kodu' : 'Field label'}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F4C81] px-4 py-2 text-xs font-semibold text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{language === 'tr' ? 'Ekle' : 'Add'}</span>
              </button>
            </form>
            <div className="space-y-2">
              {customFields.map((cf) => (
                <div
                  key={cf.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-800">
                      {language === 'tr' ? cf.labelTr : cf.labelEn}
                    </span>
                    <span className="ml-2 font-mono text-[11px] text-slate-500">({cf.target})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteCustomField(cf.id)}
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Supabase & Capacitor Guide */}
      {tab === 'cloud' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-[#0F4C81]" />
              <h3 className="text-sm font-bold text-slate-900">
                {language === 'tr' ? 'Supabase Canlı Bulut Bağlantısı' : 'Supabase Live Cloud Connection'}
              </h3>
            </div>
            <p className="text-xs text-slate-600">
              {language === 'tr'
                ? 'Supabase projenizin URL ve Anon Key bilgilerini girerek uçuş loglarını doğrudan PostgreSQL bulutuna senkronize edebilirsiniz. Boş bırakıldığında IndexedDB çevrimdışı yerel mod otomatik çalışır.'
                : 'Enter your Supabase project URL and Anon Key to sync flight logs directly to PostgreSQL. When empty, offline IndexedDB mode runs automatically.'}
            </p>
            <div className="space-y-3">
              <input
                type="url"
                value={sbUrl}
                onChange={(e) => setSbUrl(e.target.value)}
                placeholder="https://xxxxx.supabase.co"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
              />
              <input
                type="password"
                value={sbKey}
                onChange={(e) => setSbKey(e.target.value)}
                placeholder="Supabase Anon Public Key"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveAndTestSupabase}
                  className="rounded-lg bg-[#0F4C81] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0c3c66]"
                >
                  {language === 'tr' ? 'Kaydet & Bağlantıyı Test Et' : 'Save & Test Connection'}
                </button>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {copiedSql ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedSql ? 'SQL Kopyalandı' : 'SQL Şemasını Kopyala'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadSql}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>.SQL İndir</span>
                </button>
              </div>
              {sbStatus && (
                <div className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-800">
                  {sbStatus}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-[#EA580C]" />
              <h3 className="text-sm font-bold text-slate-900">
                {language === 'tr'
                  ? 'iOS & Android Capacitor Dönüşüm Rehberi'
                  : 'Capacitor iOS & Android Wrapping Guide'}
              </h3>
            </div>
            <p className="text-xs leading-relaxed text-slate-600">
              {language === 'tr'
                ? 'Uygulama şu an PWA olarak tüm telefonlarda ana ekrana kurulabilir ve ekran açıkken (Wake Lock) GPS kaydı alır. Ekran tamamen kilitliyken dahi kesintisiz iOS/Android arka plan GPS için projeyi Capacitor ile sarmalayın:'
                : 'The app runs as an installable PWA with Wake Lock GPS today. For locked-screen native background GPS on iOS & Android, wrap the built bundle with Capacitor:'}
            </p>
            <pre className="overflow-x-auto rounded-lg bg-slate-950 p-3.5 font-mono text-[11px] leading-relaxed text-slate-200">
{`npm run build
npm install @capacitor/core @capacitor/cli
npm install @capacitor-community/background-geolocation @capacitor/share
npx cap init "AeroBalon Ops" "com.aerobalon.ops" --web-dir=dist
npx cap add ios && npx cap add android
npx cap sync`}
            </pre>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <strong>{language === 'tr' ? 'Takım Çalışması Yapısı:' : 'Modular Team Structure:'}</strong>{' '}
              {language === 'tr'
                ? 'Tema (index.css), Balonlar (features/balloons), Personel (features/personnel), Kokpit/GPX (features/cockpit) ve Supabase (services/storage) birbirinden bağımsız klasörlerde tutulur; ekip üyeleri veya yapay zeka asistanı diğer modülleri bozmadan tek modülü güncelleyebilir.'
                : 'Theme, Balloons, Personnel, Cockpit/GPX, and Storage live in isolated feature slices so team members or AI can upgrade any module safely.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
