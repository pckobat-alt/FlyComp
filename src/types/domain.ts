export type Language = 'tr' | 'en';

export type UserRole =
  | 'admin'
  | 'responsible'
  | 'pilot'
  | 'copilot'
  | 'ground_crew'
  | 'inspector';

export type PersonnelCategory = 'pilot' | 'copilot' | 'ground_crew';

export type DocumentTargetType = 'balloon' | 'pilot' | 'ground_crew' | 'special';

export interface Company {
  id: string;
  name: string;
  aocNumber: string;
  baseLocation: string;
  logoDataUrl: string;
  createdAt: string;
}

export interface ResponsibilityDef {
  id: string;
  companyId: string;
  key: string;
  titleTr: string;
  titleEn: string;
  canUploadSpecialDocs: boolean;
  canCreateTrainings: boolean;
}

export interface DocumentTemplate {
  id: string;
  companyId: string;
  targetType: DocumentTargetType;
  titleTr: string;
  titleEn: string;
  hasExpiry: boolean;
  warningDays: number;
  requiredForAudit: boolean;
}

export interface TrainingTemplate {
  id: string;
  companyId: string;
  titleTr: string;
  titleEn: string;
  defaultContent: string;
  validityMonths: number;
}

export interface CustomFieldDef {
  id: string;
  companyId: string;
  target: 'balloon' | 'personnel';
  labelTr: string;
  labelEn: string;
  fieldKey: string;
}

export interface GasCylinder {
  id: string;
  serialNumber: string;
  capacityLiters: number;
  lastTestDate: string;
  nextTestDate: string;
}

export interface Balloon {
  id: string;
  companyId: string;
  registration: string;
  model: string;
  serialNumber: string;
  totalFlightHours: number;
  hoursAtLast100hCheck: number;
  cylinders: GasCylinder[];
  customFields: Record<string, string>;
}

export interface Personnel {
  id: string;
  companyId: string;
  category: PersonnelCategory;
  fullName: string;
  licenseNumber: string;
  email: string;
  phone: string;
  responsibilityIds: string[];
  customFields: Record<string, string>;
}

export interface ComplianceDocument {
  id: string;
  companyId: string;
  targetId: string;
  targetKind: 'balloon' | 'personnel';
  templateId: string;
  customTitle?: string;
  fileName: string;
  fileMime: string;
  fileSizeBytes: number;
  fileDataUrl: string;
  uploadedById: string;
  uploadedByRole: UserRole;
  isSpecialDoc: boolean;
  hasExpiry: boolean;
  expiryDate?: string;
  adminVerified: boolean;
  uploadedAt: string;
}

export interface TrainingRecord {
  id: string;
  companyId: string;
  templateId?: string;
  title: string;
  content: string;
  trainingDate: string;
  instructorPersonnelId: string;
  participantIds: string[];
  signedSheetFileName?: string;
  signedSheetDataUrl?: string;
  createdAt: string;
}

export interface TrackPoint {
  lat: number;
  lng: number;
  altM: number;
  speedKmh: number;
  varioMs: number;
  timestamp: number;
}

export interface FlightLog {
  id: string;
  companyId: string;
  balloonId: string;
  pilotId: string;
  copilotId?: string;
  startedAt: number;
  endedAt: number;
  durationMinutes: number;
  maxAltM: number;
  maxSpeedKmh: number;
  maxClimbMs: number;
  maxSinkMs: number;
  points: TrackPoint[];
  syncStatus: 'synced' | 'pending_sync';
  notes?: string;
}

export interface ActiveSessionState {
  activeCompanyId: string;
  activeRole: UserRole;
  activePersonnelId: string;
  language: Language;
}

export interface AppDatabaseState {
  companies: Company[];
  responsibilities: ResponsibilityDef[];
  documentTemplates: DocumentTemplate[];
  trainingTemplates: TrainingTemplate[];
  customFields: CustomFieldDef[];
  balloons: Balloon[];
  personnel: Personnel[];
  documents: ComplianceDocument[];
  trainings: TrainingRecord[];
  flightLogs: FlightLog[];
}
