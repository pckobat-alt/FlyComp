import React, { useState } from 'react';
import {
  BookOpenCheck,
  Compass,
  Flame,
  Globe,
  Menu,
  Settings2,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react';
import {
  Company,
  Language,
  Personnel,
  UserRole,
} from '../../types/domain';
import { useT } from '../../i18n/translations';
import { PWAInstallButton } from '../../components/pwa/PWAInstallButton';

export type NavTab =
  | 'cockpit'
  | 'balloons'
  | 'personnel'
  | 'trainings'
  | 'studio'
  | 'inspector';

interface Props {
  activeTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
  companies: Company[];
  activeCompany: Company;
  onSelectCompany: (id: string) => void;
  activeRole: UserRole;
  onChangeRole: (role: UserRole) => void;
  personnel: Personnel[];
  activePersonnelId: string;
  onChangePersonnelId: (id: string) => void;
  language: Language;
  onChangeLanguage: (lang: Language) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<Props> = ({
  activeTab,
  onChangeTab,
  companies,
  activeCompany,
  onSelectCompany,
  activeRole,
  onChangeRole,
  personnel,
  activePersonnelId,
  onChangePersonnelId,
  language,
  onChangeLanguage,
  children,
}) => {
  const t = useT(language);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const navItems: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'cockpit', label: t('navCockpit'), icon: Compass },
    { id: 'balloons', label: t('navBalloons'), icon: Flame },
    { id: 'personnel', label: t('navPersonnel'), icon: Users },
    { id: 'trainings', label: t('navTrainings'), icon: BookOpenCheck },
    { id: 'studio', label: t('navStudio'), icon: Settings2 },
  ];

  const handleRoleSwitch = (nextRole: UserRole) => {
    onChangeRole(nextRole);
    if (nextRole === 'inspector') {
      onChangeTab('inspector');
    } else if (activeTab === 'inspector') {
      onChangeTab('cockpit');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* Strict 3-Zone Top Bar Contract (Desktop + Mobile) */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md print:hidden">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-8 px-4 lg:px-6">
          {/* Zone 1: Single-element Brand Wordmark */}
          <button
            type="button"
            onClick={() => onChangeTab('cockpit')}
            className="text-left font-display text-lg font-extrabold tracking-tight text-[#0F4C81] whitespace-nowrap shrink-0"
          >
            AeroBalon Ops
          </button>

          {/* Zone 2: 5 concise single-line text nav links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChangeTab(item.id)}
                  className={`border-b-2 py-4 transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'border-[#0F4C81] font-semibold text-slate-900'
                      : 'border-transparent hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary Action + Mobile Drawer Trigger */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:block">
              <PWAInstallButton language={language} />
            </div>
            <button
              type="button"
              onClick={() => {
                if (activeTab === 'inspector') {
                  onChangeRole('admin');
                  onChangeTab('cockpit');
                } else {
                  onChangeRole('inspector');
                  onChangeTab('inspector');
                }
              }}
              className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 min-h-[38px] ${
                activeTab === 'inspector'
                  ? 'bg-[#EA580C] text-white hover:bg-[#c2410c]'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {activeTab === 'inspector'
                ? language === 'tr'
                  ? 'Operasyona Dön'
                  : 'Exit Audit'
                : t('navInspector')}
            </button>

            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 lg:hidden"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace: 256px Desktop Sidebar + Fluid Content */}
      <div className="mx-auto flex w-full max-w-[1440px] flex-1 gap-6 px-4 py-6 pb-24 md:pb-8 lg:px-6">
        <aside className="hidden w-64 shrink-0 space-y-5 lg:block print:hidden">
          {/* Active Company Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex items-center gap-3">
              <img
                src={activeCompany.logoDataUrl}
                alt={activeCompany.name}
                referrerPolicy="no-referrer"
                className="h-11 w-11 rounded-lg border border-slate-200 object-cover shrink-0"
              />
              <div className="min-w-0">
                <div className="truncate text-xs font-bold text-slate-900">{activeCompany.name}</div>
                <div className="font-mono text-[11px] text-slate-500">{activeCompany.aocNumber}</div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500">
                {t('activeCompany')}
              </label>
              <select
                value={activeCompany.id}
                onChange={(e) => onSelectCompany(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-medium text-slate-800"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Role & User Context Switcher */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500">
                {t('activeRole')}
              </label>
              <select
                value={activeRole}
                onChange={(e) => handleRoleSwitch(e.target.value as UserRole)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-900"
              >
                <option value="admin">{t('roleAdmin')}</option>
                <option value="responsible">{t('roleResponsible')}</option>
                <option value="pilot">{t('rolePilot')}</option>
                <option value="copilot">{t('roleCopilot')}</option>
                <option value="ground_crew">{t('roleGroundCrew')}</option>
                <option value="inspector">{t('roleInspector')}</option>
              </select>
            </div>

            {activeRole !== 'admin' && activeRole !== 'inspector' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-500">
                  {t('activeUser')}
                </label>
                <select
                  value={activePersonnelId}
                  onChange={(e) => onChangePersonnelId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-medium text-slate-800"
                >
                  {personnel.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                <Globe className="h-3.5 w-3.5" />
                <span>{language === 'tr' ? 'Dil / Language' : 'Language'}</span>
              </span>
              <div className="inline-flex rounded-md border border-slate-200 bg-slate-100 p-0.5">
                <button
                  type="button"
                  onClick={() => onChangeLanguage('tr')}
                  className={`rounded px-2 py-1 text-[11px] font-bold ${
                    language === 'tr' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  TR
                </button>
                <button
                  type="button"
                  onClick={() => onChangeLanguage('en')}
                  className={`rounded px-2 py-1 text-[11px] font-bold ${
                    language === 'en' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  EN
                </button>
              </div>
            </div>
          </div>

          {/* Quick Inspector Trigger */}
          <button
            type="button"
            onClick={() => {
              onChangeRole('inspector');
              onChangeTab('inspector');
            }}
            className="flex w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-3.5 text-left text-xs font-semibold text-slate-700 transition-colors hover:border-[#0F4C81] hover:text-[#0F4C81]"
          >
            <ShieldAlert className="h-4 w-4 text-[#0F4C81] shrink-0" />
            <span>{language === 'tr' ? 'SHGM Denetim Dosyasını Aç' : 'Open CAA Audit View'}</span>
          </button>
        </aside>

        {/* Main Viewport */}
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {/* Mobile Fixed Thumb-Zone Bottom Tab Bar (< 15% viewport height, 44px+ hitboxes) */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-md md:hidden pb-safe print:hidden">
        <div className="grid grid-cols-4 h-16 items-center">
          {[
            { id: 'cockpit', label: language === 'tr' ? 'Kokpit' : 'Cockpit', icon: Compass },
            { id: 'balloons', label: language === 'tr' ? 'Balonlar' : 'Fleet', icon: Flame },
            { id: 'personnel', label: language === 'tr' ? 'Ekip' : 'Crew', icon: Users },
            { id: 'studio', label: language === 'tr' ? 'Stüdyo' : 'Studio', icon: Settings2 },
          ].map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeTab(item.id as NavTab)}
                className={`flex min-h-[44px] flex-col items-center justify-center gap-1 ${
                  active ? 'text-[#0F4C81]' : 'text-slate-500'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-semibold tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile Context Drawer (Company / Role / Training / Language / PWA Install) */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs lg:hidden">
          <div className="h-full w-80 max-w-full overflow-y-auto bg-white p-5 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="font-display text-base font-bold text-slate-900">
                {activeCompany.name}
              </span>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-600">{t('activeCompany')}</label>
              <select
                value={activeCompany.id}
                onChange={(e) => onSelectCompany(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <label className="block text-xs font-semibold text-slate-600">{t('activeRole')}</label>
              <select
                value={activeRole}
                onChange={(e) => handleRoleSwitch(e.target.value as UserRole)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="admin">{t('roleAdmin')}</option>
                <option value="responsible">{t('roleResponsible')}</option>
                <option value="pilot">{t('rolePilot')}</option>
                <option value="copilot">{t('roleCopilot')}</option>
                <option value="ground_crew">{t('roleGroundCrew')}</option>
                <option value="inspector">{t('roleInspector')}</option>
              </select>

              {activeRole !== 'admin' && activeRole !== 'inspector' && (
                <>
                  <label className="block text-xs font-semibold text-slate-600">{t('activeUser')}</label>
                  <select
                    value={activePersonnelId}
                    onChange={(e) => onChangePersonnelId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {personnel.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>

            <div className="space-y-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  onChangeTab('trainings');
                  setMobileDrawerOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800"
              >
                <BookOpenCheck className="h-4 w-4 text-[#0F4C81]" />
                <span>{t('navTrainings')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onChangeRole('inspector');
                  onChangeTab('inspector');
                  setMobileDrawerOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800"
              >
                <ShieldAlert className="h-4 w-4 text-[#EA580C]" />
                <span>{t('navInspector')}</span>
              </button>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <div className="inline-flex rounded-md border border-slate-200 bg-slate-100 p-0.5">
                <button
                  type="button"
                  onClick={() => onChangeLanguage('tr')}
                  className={`rounded px-3 py-1.5 text-xs font-bold ${
                    language === 'tr' ? 'bg-white text-slate-900' : 'text-slate-500'
                  }`}
                >
                  TR
                </button>
                <button
                  type="button"
                  onClick={() => onChangeLanguage('en')}
                  className={`rounded px-3 py-1.5 text-xs font-bold ${
                    language === 'en' ? 'bg-white text-slate-900' : 'text-slate-500'
                  }`}
                >
                  EN
                </button>
              </div>
              <PWAInstallButton language={language} compact />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
