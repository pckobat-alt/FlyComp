import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AppDatabaseState,
  Balloon,
  Company,
  ComplianceDocument,
  CustomFieldDef,
  DocumentTemplate,
  FlightLog,
  Language,
  Personnel,
  ResponsibilityDef,
  TrainingRecord,
  TrainingTemplate,
  UserRole,
} from './types/domain';
import { initialSeedDatabase } from './data/seedData';
import {
  loadDatabaseState,
  resetDatabaseToSeed,
  saveDatabaseState,
} from './services/storage/idbStore';
import { syncPendingFlightLogsToCloud } from './services/storage/supabaseAdapter';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { AppShell, NavTab } from './features/layout/AppShell';
import { CockpitView } from './features/cockpit/CockpitView';
import { BalloonsView } from './features/balloons/BalloonsView';
import { PersonnelView } from './features/personnel/PersonnelView';
import { TrainingsView } from './features/trainings/TrainingsView';
import { ModularStudioView } from './features/studio/ModularStudioView';
import { InspectorAuditView } from './features/inspector/InspectorAuditView';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';

export default function App() {
  const [db, setDb] = useState<AppDatabaseState>(initialSeedDatabase);
  const [loaded, setLoaded] = useState(false);
  const [activeCompanyId, setActiveCompanyId] = useState<string>(
    initialSeedDatabase.companies[0].id
  );
  const [activeRole, setActiveRole] = useState<UserRole>('admin');
  const [activePersonnelId, setActivePersonnelId] = useState<string>(
    initialSeedDatabase.personnel[0].id
  );
  const [language, setLanguage] = useState<Language>('tr');
  const [activeTab, setActiveTab] = useState<NavTab>('cockpit');

  const isOnline = useOnlineStatus();

  useEffect(() => {
    loadDatabaseState().then((stored) => {
      setDb(stored);
      if (stored.companies[0]) {
        setActiveCompanyId(stored.companies[0].id);
      }
      setLoaded(true);
    });
  }, []);

  const updateDb = useCallback((updater: (prev: AppDatabaseState) => AppDatabaseState) => {
    setDb((prev) => {
      const next = updater(prev);
      void saveDatabaseState(next);
      return next;
    });
  }, []);

  const activeCompany = useMemo(
    () => db.companies.find((c) => c.id === activeCompanyId) || db.companies[0],
    [db.companies, activeCompanyId]
  );

  const companyBalloons = useMemo(
    () => db.balloons.filter((b) => b.companyId === activeCompany.id),
    [db.balloons, activeCompany.id]
  );

  const companyPersonnel = useMemo(
    () => db.personnel.filter((p) => p.companyId === activeCompany.id),
    [db.personnel, activeCompany.id]
  );

  const companyResponsibilities = useMemo(
    () => db.responsibilities.filter((r) => r.companyId === activeCompany.id),
    [db.responsibilities, activeCompany.id]
  );

  const companyDocTemplates = useMemo(
    () => db.documentTemplates.filter((t) => t.companyId === activeCompany.id),
    [db.documentTemplates, activeCompany.id]
  );

  const companyTrainingTemplates = useMemo(
    () => db.trainingTemplates.filter((t) => t.companyId === activeCompany.id),
    [db.trainingTemplates, activeCompany.id]
  );

  const companyCustomFields = useMemo(
    () => db.customFields.filter((f) => f.companyId === activeCompany.id),
    [db.customFields, activeCompany.id]
  );

  const companyDocuments = useMemo(
    () => db.documents.filter((d) => d.companyId === activeCompany.id),
    [db.documents, activeCompany.id]
  );

  const companyTrainings = useMemo(
    () => db.trainings.filter((t) => t.companyId === activeCompany.id),
    [db.trainings, activeCompany.id]
  );

  const companyFlightLogs = useMemo(
    () =>
      db.flightLogs
        .filter((l) => l.companyId === activeCompany.id)
        .sort((a, b) => b.startedAt - a.startedAt),
    [db.flightLogs, activeCompany.id]
  );

  const pendingLogs = useMemo(
    () => db.flightLogs.filter((l) => l.syncStatus === 'pending_sync'),
    [db.flightLogs]
  );

  const handleSyncPending = useCallback(async () => {
    if (pendingLogs.length === 0) return;
    const { syncedIds } = await syncPendingFlightLogsToCloud(pendingLogs);
    if (syncedIds.length > 0) {
      updateDb((prev) => ({
        ...prev,
        flightLogs: prev.flightLogs.map((l) =>
          syncedIds.includes(l.id) ? { ...l, syncStatus: 'synced' } : l
        ),
      }));
    }
  }, [pendingLogs, updateDb]);

  // Automatically sync pending offline logs when connectivity returns
  useEffect(() => {
    if (isOnline && pendingLogs.length > 0) {
      void handleSyncPending();
    }
  }, [isOnline, pendingLogs.length, handleSyncPending]);

  const handleSelectCompany = (id: string) => {
    setActiveCompanyId(id);
    const firstPerson = db.personnel.find((p) => p.companyId === id);
    if (firstPerson) setActivePersonnelId(firstPerson.id);
  };

  const handleChangeRole = (role: UserRole) => {
    setActiveRole(role);
    if (role === 'pilot' || role === 'copilot' || role === 'ground_crew') {
      const match = companyPersonnel.find((p) => p.category === role);
      if (match) setActivePersonnelId(match.id);
    } else if (role === 'responsible') {
      const match = companyPersonnel.find((p) => p.responsibilityIds.length > 0);
      if (match) setActivePersonnelId(match.id);
    }
  };

  const handleAddCompany = (company: Company) => {
    const cid = company.id;
    const starterResps: ResponsibilityDef[] = [
      {
        id: `resp-${cid}-ops`,
        companyId: cid,
        key: 'flight_ops',
        titleTr: 'Uçuş İşletme Sorumlusu',
        titleEn: 'Flight Operations Manager',
        canUploadSpecialDocs: true,
        canCreateTrainings: true,
      },
      {
        id: `resp-${cid}-mnt`,
        companyId: cid,
        key: 'maintenance',
        titleTr: 'Bakım Sorumlusu',
        titleEn: 'Maintenance Manager',
        canUploadSpecialDocs: true,
        canCreateTrainings: true,
      },
      {
        id: `resp-${cid}-qlt`,
        companyId: cid,
        key: 'quality',
        titleTr: 'Kalite Yönetim Sorumlusu',
        titleEn: 'Quality Management Manager',
        canUploadSpecialDocs: true,
        canCreateTrainings: true,
      },
    ];
    const starterTemplates: DocumentTemplate[] = [
      {
        id: `tpl-${cid}-reg`,
        companyId: cid,
        targetType: 'balloon',
        titleTr: 'Balon Ruhsatı',
        titleEn: 'Balloon Registration',
        hasExpiry: false,
        warningDays: 30,
        requiredForAudit: true,
      },
      {
        id: `tpl-${cid}-ins`,
        companyId: cid,
        targetType: 'balloon',
        titleTr: 'Balon Sigortası',
        titleEn: 'Balloon Insurance',
        hasExpiry: true,
        warningDays: 30,
        requiredForAudit: true,
      },
      {
        id: `tpl-${cid}-lic`,
        companyId: cid,
        targetType: 'pilot',
        titleTr: 'Pilot Lisansı',
        titleEn: 'Pilot License',
        hasExpiry: true,
        warningDays: 45,
        requiredForAudit: true,
      },
      {
        id: `tpl-${cid}-med`,
        companyId: cid,
        targetType: 'pilot',
        titleTr: 'Sağlık Lisansı',
        titleEn: 'Medical Certificate',
        hasExpiry: true,
        warningDays: 30,
        requiredForAudit: true,
      },
      {
        id: `tpl-${cid}-gc`,
        companyId: cid,
        targetType: 'ground_crew',
        titleTr: 'Yer Ekibi Sertifikası',
        titleEn: 'Ground Crew Certificate',
        hasExpiry: true,
        warningDays: 30,
        requiredForAudit: true,
      },
    ];
    updateDb((prev) => ({
      ...prev,
      companies: [...prev.companies, company],
      responsibilities: [...prev.responsibilities, ...starterResps],
      documentTemplates: [...prev.documentTemplates, ...starterTemplates],
    }));
  };

  const handleSaveFlightLog = async (log: FlightLog) => {
    const addedHours = Number((log.durationMinutes / 60).toFixed(2));
    updateDb((prev) => ({
      ...prev,
      flightLogs: [log, ...prev.flightLogs],
      balloons: prev.balloons.map((b) =>
        b.id === log.balloonId
          ? { ...b, totalFlightHours: Number((b.totalFlightHours + addedHours).toFixed(1)) }
          : b
      ),
    }));
    if (isOnline) {
      await syncPendingFlightLogsToCloud([log]);
    }
  };

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-medium text-slate-600">
        AeroBalon Ops...
      </div>
    );
  }

  return (
    <>
      <AppShell
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        companies={db.companies}
        activeCompany={activeCompany}
        onSelectCompany={handleSelectCompany}
        activeRole={activeRole}
        onChangeRole={handleChangeRole}
        personnel={companyPersonnel}
        activePersonnelId={activePersonnelId}
        onChangePersonnelId={setActivePersonnelId}
        language={language}
        onChangeLanguage={setLanguage}
      >
        {activeTab === 'cockpit' && (
          <CockpitView
            companyId={activeCompany.id}
            balloons={companyBalloons}
            personnel={companyPersonnel}
            flightLogs={companyFlightLogs}
            activeRole={activeRole}
            activePersonnelId={activePersonnelId}
            language={language}
            isOnline={isOnline}
            onSaveFlightLog={handleSaveFlightLog}
            onSyncPending={handleSyncPending}
          />
        )}

        {activeTab === 'balloons' && (
          <BalloonsView
            companyId={activeCompany.id}
            balloons={companyBalloons}
            documents={companyDocuments}
            documentTemplates={companyDocTemplates}
            customFields={companyCustomFields}
            activeRole={activeRole}
            activePersonnelId={activePersonnelId}
            language={language}
            onAddBalloon={(balloon: Balloon) =>
              updateDb((prev) => ({ ...prev, balloons: [...prev.balloons, balloon] }))
            }
            onUpdateBalloon={(balloon: Balloon) =>
              updateDb((prev) => ({
                ...prev,
                balloons: prev.balloons.map((b) => (b.id === balloon.id ? balloon : b)),
              }))
            }
            onAddDocument={(doc: ComplianceDocument) =>
              updateDb((prev) => ({ ...prev, documents: [doc, ...prev.documents] }))
            }
            onDeleteDocument={(docId: string) =>
              updateDb((prev) => ({
                ...prev,
                documents: prev.documents.filter((d) => d.id !== docId),
              }))
            }
          />
        )}

        {activeTab === 'personnel' && (
          <PersonnelView
            companyId={activeCompany.id}
            personnel={companyPersonnel}
            responsibilities={companyResponsibilities}
            documents={companyDocuments}
            documentTemplates={companyDocTemplates}
            customFields={companyCustomFields}
            activeRole={activeRole}
            activePersonnelId={activePersonnelId}
            language={language}
            onAddPersonnel={(person: Personnel) =>
              updateDb((prev) => ({ ...prev, personnel: [...prev.personnel, person] }))
            }
            onUpdatePersonnel={(person: Personnel) =>
              updateDb((prev) => ({
                ...prev,
                personnel: prev.personnel.map((p) => (p.id === person.id ? person : p)),
              }))
            }
            onAddDocument={(doc: ComplianceDocument) =>
              updateDb((prev) => ({ ...prev, documents: [doc, ...prev.documents] }))
            }
            onUpdateDocument={(doc: ComplianceDocument) =>
              updateDb((prev) => ({
                ...prev,
                documents: prev.documents.map((d) => (d.id === doc.id ? doc : d)),
              }))
            }
            onDeleteDocument={(docId: string) =>
              updateDb((prev) => ({
                ...prev,
                documents: prev.documents.filter((d) => d.id !== docId),
              }))
            }
          />
        )}

        {activeTab === 'trainings' && (
          <TrainingsView
            companyId={activeCompany.id}
            trainings={companyTrainings}
            trainingTemplates={companyTrainingTemplates}
            personnel={companyPersonnel}
            activeRole={activeRole}
            activePersonnelId={activePersonnelId}
            language={language}
            onAddTraining={(record: TrainingRecord) =>
              updateDb((prev) => ({ ...prev, trainings: [record, ...prev.trainings] }))
            }
          />
        )}

        {activeTab === 'studio' && (
          <ModularStudioView
            activeCompany={activeCompany}
            companies={db.companies}
            responsibilities={companyResponsibilities}
            documentTemplates={companyDocTemplates}
            trainingTemplates={companyTrainingTemplates}
            customFields={companyCustomFields}
            language={language}
            onAddCompany={handleAddCompany}
            onUpdateCompany={(company: Company) =>
              updateDb((prev) => ({
                ...prev,
                companies: prev.companies.map((c) => (c.id === company.id ? company : c)),
              }))
            }
            onSelectCompany={handleSelectCompany}
            onAddResponsibility={(resp: ResponsibilityDef) =>
              updateDb((prev) => ({
                ...prev,
                responsibilities: [...prev.responsibilities, resp],
              }))
            }
            onDeleteResponsibility={(id: string) =>
              updateDb((prev) => ({
                ...prev,
                responsibilities: prev.responsibilities.filter((r) => r.id !== id),
              }))
            }
            onAddDocTemplate={(tpl: DocumentTemplate) =>
              updateDb((prev) => ({
                ...prev,
                documentTemplates: [...prev.documentTemplates, tpl],
              }))
            }
            onDeleteDocTemplate={(id: string) =>
              updateDb((prev) => ({
                ...prev,
                documentTemplates: prev.documentTemplates.filter((t) => t.id !== id),
              }))
            }
            onAddTrainingTemplate={(tpl: TrainingTemplate) =>
              updateDb((prev) => ({
                ...prev,
                trainingTemplates: [...prev.trainingTemplates, tpl],
              }))
            }
            onDeleteTrainingTemplate={(id: string) =>
              updateDb((prev) => ({
                ...prev,
                trainingTemplates: prev.trainingTemplates.filter((t) => t.id !== id),
              }))
            }
            onAddCustomField={(field: CustomFieldDef) =>
              updateDb((prev) => ({ ...prev, customFields: [...prev.customFields, field] }))
            }
            onDeleteCustomField={(id: string) =>
              updateDb((prev) => ({
                ...prev,
                customFields: prev.customFields.filter((f) => f.id !== id),
              }))
            }
            onResetDemo={async () => {
              const reset = await resetDatabaseToSeed();
              setDb(reset);
              setActiveCompanyId(reset.companies[0].id);
            }}
          />
        )}

        {activeTab === 'inspector' && (
          <InspectorAuditView
            company={activeCompany}
            balloons={companyBalloons}
            personnel={companyPersonnel}
            documents={companyDocuments}
            documentTemplates={companyDocTemplates}
            trainings={companyTrainings}
            flightLogs={companyFlightLogs}
            language={language}
          />
        )}
      </AppShell>

      <OfflineIndicator
        language={language}
        pendingCount={pendingLogs.length}
        onSyncNow={handleSyncPending}
      />
    </>
  );
}
