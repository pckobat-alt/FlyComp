import { AppDatabaseState, TrackPoint } from '../types/domain';

function daysFromToday(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

function makeLogoDataUrl(primary: string, accent: string, monogram: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
    <rect width="120" height="120" rx="22" fill="${primary}"/>
    <circle cx="60" cy="48" r="28" fill="#FFFFFF"/>
    <path d="M60 20C50 32 46 42 46 48C46 60 52 70 60 78C68 70 74 60 74 48C74 42 70 32 60 20Z" fill="${accent}"/>
    <rect x="49" y="84" width="22" height="12" rx="3" fill="#FFFFFF"/>
    <text x="60" y="110" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="700" fill="#E2E8F0">${monogram}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function makeDemoPdfDataUrl(title: string, subtitle: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
    <rect width="640" height="420" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2"/>
    <rect x="0" y="0" width="640" height="68" fill="#0F4C81"/>
    <text x="28" y="42" font-family="sans-serif" font-size="20" font-weight="700" fill="#FFFFFF">${title}</text>
    <text x="28" y="108" font-family="monospace" font-size="14" fill="#334155">${subtitle}</text>
    <line x1="28" y1="130" x2="612" y2="130" stroke="#E2E8F0" stroke-width="1"/>
    <text x="28" y="166" font-family="sans-serif" font-size="13" fill="#475569">T.C. Ulaştırma ve Altyapı Bakanlığı — Sivil Havacılık Genel Müdürlüğü (SHGM)</text>
    <text x="28" y="194" font-family="sans-serif" font-size="13" fill="#475569">Resmi Operasyon &amp; Denetim Arşiv Belgesi Örneği</text>
    <rect x="28" y="230" width="584" height="120" rx="8" fill="#F8FAFC" stroke="#E2E8F0"/>
    <text x="48" y="268" font-family="monospace" font-size="13" fill="#0F172A">DOKÜMAN DOĞRULAMA: AKTİF ARŞİV KAYDI</text>
    <text x="48" y="296" font-family="monospace" font-size="12" fill="#475569">Bu önizleme sistemde yüklü resmi PDF/belge kaydını temsil eder.</text>
    <text x="48" y="324" font-family="monospace" font-size="12" fill="#15803D">DURUM: DENETİME HAZIR</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function generateSampleFlightTrack(startEpochMs: number, count: number): TrackPoint[] {
  const points: TrackPoint[] = [];
  let lat = 38.6431; // Göreme, Cappadocia
  let lng = 34.8289;
  let alt = 1090;
  for (let i = 0; i < count; i++) {
    const progress = i / Math.max(1, count - 1);
    let vario = 0;
    let speed = 14;
    if (progress < 0.12) {
      // Pre-takeoff ground inflation
      vario = 0.1;
      speed = 1.2;
      alt += 0.2;
    } else if (progress < 0.38) {
      // Climb
      vario = 2.4 + Math.sin(i * 0.4) * 0.6;
      speed = 18 + progress * 15;
      alt += vario * 15;
    } else if (progress < 0.72) {
      // Cruise over Love Valley
      vario = Math.sin(i * 0.5) * 0.8;
      speed = 24 + Math.cos(i * 0.3) * 4;
      alt += vario * 15;
    } else if (progress < 0.9) {
      // Approach & descent
      vario = -2.1 + Math.sin(i * 0.4) * 0.4;
      speed = 15;
      alt = Math.max(1095, alt + vario * 15);
    } else {
      // Post-landing forgotten stop on chase vehicle
      vario = 0;
      speed = 28;
      alt = 1095;
    }
    lat += 0.00045 + Math.sin(i * 0.2) * 0.0001;
    lng += 0.00058 + Math.cos(i * 0.2) * 0.0001;

    points.push({
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      altM: Math.round(alt),
      speedKmh: Number(speed.toFixed(1)),
      varioMs: Number(vario.toFixed(2)),
      timestamp: startEpochMs + i * 15000,
    });
  }
  return points;
}

const nowMs = Date.now();
const morningFlightStart = nowMs - 1000 * 60 * 180;
const samplePoints = generateSampleFlightTrack(morningFlightStart, 42);

export const initialSeedDatabase: AppDatabaseState = {
  companies: [
    {
      id: 'comp-kapadokya',
      name: 'Kapadokya Gökyüzü Balonculuk A.Ş.',
      aocNumber: 'TR-SHGM-B-042',
      baseLocation: 'Göreme / Nevşehir',
      logoDataUrl: makeLogoDataUrl('#0F4C81', '#EA580C', 'KGB'),
      createdAt: daysFromToday(-420),
    },
    {
      id: 'comp-pamukkale',
      name: 'Pamukkale Termal Balon İşletmesi',
      aocNumber: 'TR-SHGM-B-089',
      baseLocation: 'Pamukkale / Denizli',
      logoDataUrl: makeLogoDataUrl('#1E293B', '#0284C7', 'PTB'),
      createdAt: daysFromToday(-210),
    },
  ],
  responsibilities: [
    {
      id: 'resp-flight-ops',
      companyId: 'comp-kapadokya',
      key: 'flight_ops',
      titleTr: 'Uçuş İşletme Sorumlusu',
      titleEn: 'Flight Operations Manager',
      canUploadSpecialDocs: true,
      canCreateTrainings: true,
    },
    {
      id: 'resp-maintenance',
      companyId: 'comp-kapadokya',
      key: 'maintenance',
      titleTr: 'Bakım Sorumlusu',
      titleEn: 'Maintenance Manager',
      canUploadSpecialDocs: true,
      canCreateTrainings: true,
    },
    {
      id: 'resp-quality',
      companyId: 'comp-kapadokya',
      key: 'quality',
      titleTr: 'Kalite Yönetim Sorumlusu',
      titleEn: 'Quality Management Manager',
      canUploadSpecialDocs: true,
      canCreateTrainings: true,
    },
    {
      id: 'resp-pam-ops',
      companyId: 'comp-pamukkale',
      key: 'flight_ops',
      titleTr: 'Uçuş İşletme Sorumlusu',
      titleEn: 'Flight Operations Manager',
      canUploadSpecialDocs: true,
      canCreateTrainings: true,
    },
  ],
  documentTemplates: [
    // Balloon docs
    {
      id: 'tpl-b-reg',
      companyId: 'comp-kapadokya',
      targetType: 'balloon',
      titleTr: 'Balon Tescil & Ruhsat Sertifikası',
      titleEn: 'Certificate of Registration',
      hasExpiry: false,
      warningDays: 30,
      requiredForAudit: true,
    },
    {
      id: 'tpl-b-ins',
      companyId: 'comp-kapadokya',
      targetType: 'balloon',
      titleTr: 'Üçüncü Şahıs Mali Mesuliyet Sigortası',
      titleEn: 'Third-Party Liability Insurance',
      hasExpiry: true,
      warningDays: 30,
      requiredForAudit: true,
    },
    {
      id: 'tpl-b-arc',
      companyId: 'comp-kapadokya',
      targetType: 'balloon',
      titleTr: 'Uçuşa Elverişlilik Gözden Geçirme (ARC)',
      titleEn: 'Airworthiness Review Certificate (ARC)',
      hasExpiry: true,
      warningDays: 45,
      requiredForAudit: true,
    },
    // Pilot docs
    {
      id: 'tpl-p-lic',
      companyId: 'comp-kapadokya',
      targetType: 'pilot',
      titleTr: 'SHGM Sıcak Hava Balon Pilot Lisansı (BPL)',
      titleEn: 'Balloon Pilot License (BPL)',
      hasExpiry: true,
      warningDays: 45,
      requiredForAudit: true,
    },
    {
      id: 'tpl-p-med',
      companyId: 'comp-kapadokya',
      targetType: 'pilot',
      titleTr: 'Havacılık Sağlık Sertifikası (Class 2)',
      titleEn: 'Aviation Medical Certificate (Class 2)',
      hasExpiry: true,
      warningDays: 30,
      requiredForAudit: true,
    },
    {
      id: 'tpl-p-lang',
      companyId: 'comp-kapadokya',
      targetType: 'pilot',
      titleTr: 'ICAO Dil Yeterlilik Belgesi',
      titleEn: 'ICAO Language Proficiency',
      hasExpiry: true,
      warningDays: 60,
      requiredForAudit: true,
    },
    // Ground crew docs
    {
      id: 'tpl-g-cert',
      companyId: 'comp-kapadokya',
      targetType: 'ground_crew',
      titleTr: 'Yer Ekibi Emniyet & Operasyon Sertifikası',
      titleEn: 'Ground Crew Safety Certificate',
      hasExpiry: true,
      warningDays: 30,
      requiredForAudit: true,
    },
    {
      id: 'tpl-g-src',
      companyId: 'comp-kapadokya',
      targetType: 'ground_crew',
      titleTr: 'Tehlikeli Madde / LPG Taşıma Yetki Belgesi',
      titleEn: 'LPG Handling & Transport Permit',
      hasExpiry: true,
      warningDays: 30,
      requiredForAudit: true,
    },
    // Special responsible docs
    {
      id: 'tpl-s-audit',
      companyId: 'comp-kapadokya',
      targetType: 'special',
      titleTr: 'Kalite & İç Denetim Özel Değerlendirme Formu',
      titleEn: 'Quality & Internal Compliance Assessment',
      hasExpiry: false,
      warningDays: 30,
      requiredForAudit: true,
    },
    // Pamukkale basic templates
    {
      id: 'tpl-pam-ins',
      companyId: 'comp-pamukkale',
      targetType: 'balloon',
      titleTr: 'Balon Mali Mesuliyet Sigortası',
      titleEn: 'Balloon Liability Insurance',
      hasExpiry: true,
      warningDays: 30,
      requiredForAudit: true,
    },
    {
      id: 'tpl-pam-lic',
      companyId: 'comp-pamukkale',
      targetType: 'pilot',
      titleTr: 'Pilot Lisansı (BPL)',
      titleEn: 'Pilot License (BPL)',
      hasExpiry: true,
      warningDays: 30,
      requiredForAudit: true,
    },
  ],
  trainingTemplates: [
    {
      id: 'tt-crm',
      companyId: 'comp-kapadokya',
      titleTr: 'CRM (Ekip Kaynak Yönetimi) Tazeleme Eğitimi',
      titleEn: 'CRM Refresher Training',
      defaultContent: 'Uçuş öncesi brifing, acil iniş koordinasyonu, telsiz disiplini ve yolcu tahliye prosedürleri.',
      validityMonths: 12,
    },
    {
      id: 'tt-fire',
      companyId: 'comp-kapadokya',
      titleTr: 'LPG Tüp & Yangın Müdahale Tatbikatı',
      titleEn: 'LPG Cylinder & Fire Response Drill',
      defaultContent: 'Brülör hortum kaçak kontrolü, valf kapatma sıralaması ve kuru kimyevi toz söndürücü kullanımı.',
      validityMonths: 12,
    },
    {
      id: 'tt-sms',
      companyId: 'comp-kapadokya',
      titleTr: 'Emniyet Yönetim Sistemi (SMS) Şirket İçi Eğitimi',
      titleEn: 'Safety Management System (SMS) Training',
      defaultContent: 'Tehlike bildirim prosedürleri, rüzgar limitleri değerlendirmesi ve olay raporlama.',
      validityMonths: 24,
    },
  ],
  customFields: [
    {
      id: 'cf-burner',
      companyId: 'comp-kapadokya',
      target: 'balloon',
      labelTr: 'Brülör Tipi',
      labelEn: 'Burner Type',
      fieldKey: 'burner_type',
    },
    {
      id: 'cf-blood',
      companyId: 'comp-kapadokya',
      target: 'personnel',
      labelTr: 'Kan Grubu',
      labelEn: 'Blood Type',
      fieldKey: 'blood_type',
    },
  ],
  balloons: [
    {
      id: 'bal-tcbzd',
      companyId: 'comp-kapadokya',
      registration: 'TC-BZD',
      model: 'CAMERON 420 cbft',
      serialNumber: 'CAM-Z420-11894',
      totalFlightHours: 842.5,
      hoursAtLast100hCheck: 760.5,
      cylinders: [
        {
          id: 'cyl-1',
          serialNumber: 'CB-2099-01',
          capacityLiters: 80,
          lastTestDate: daysFromToday(-380),
          nextTestDate: daysFromToday(350),
        },
        {
          id: 'cyl-2',
          serialNumber: 'CB-2099-02',
          capacityLiters: 80,
          lastTestDate: daysFromToday(-380),
          nextTestDate: daysFromToday(350),
        },
        {
          id: 'cyl-3',
          serialNumber: 'CB-2099-03',
          capacityLiters: 60,
          lastTestDate: daysFromToday(-715),
          nextTestDate: daysFromToday(15),
        },
      ],
      customFields: {
        burner_type: 'Cameron Shadow Quad',
      },
    },
    {
      id: 'bal-tckpd',
      companyId: 'comp-kapadokya',
      registration: 'TC-KPD',
      model: 'ULTRAMAGIC 355 cbft',
      serialNumber: 'UM-N355-4412',
      totalFlightHours: 496.2,
      hoursAtLast100hCheck: 404.0,
      cylinders: [
        {
          id: 'cyl-4',
          serialNumber: 'UM-8821-A',
          capacityLiters: 80,
          lastTestDate: daysFromToday(-180),
          nextTestDate: daysFromToday(550),
        },
        {
          id: 'cyl-5',
          serialNumber: 'UM-8821-B',
          capacityLiters: 80,
          lastTestDate: daysFromToday(-180),
          nextTestDate: daysFromToday(550),
        },
      ],
      customFields: {
        burner_type: 'Ultramagic MK-32 Triple',
      },
    },
    {
      id: 'bal-tcpam',
      companyId: 'comp-pamukkale',
      registration: 'TC-PAM',
      model: 'KUBICEK 300 cbft',
      serialNumber: 'KUB-BB300-771',
      totalFlightHours: 312.0,
      hoursAtLast100hCheck: 250.0,
      cylinders: [
        {
          id: 'cyl-6',
          serialNumber: 'KB-5501-01',
          capacityLiters: 72,
          lastTestDate: daysFromToday(-240),
          nextTestDate: daysFromToday(490),
        },
      ],
      customFields: {},
    },
  ],
  personnel: [
    {
      id: 'per-ahmet',
      companyId: 'comp-kapadokya',
      category: 'pilot',
      fullName: 'Ahmet Yılmaz',
      licenseNumber: 'TR-BPL-1042',
      email: 'ahmet.yilmaz@kapadokyabalon.example',
      phone: '+90 532 100 20 30',
      responsibilityIds: ['resp-flight-ops'],
      customFields: { blood_type: 'A Rh+' },
    },
    {
      id: 'per-selin',
      companyId: 'comp-kapadokya',
      category: 'pilot',
      fullName: 'Selin Kaya',
      licenseNumber: 'TR-BPL-1388',
      email: 'selin.kaya@kapadokyabalon.example',
      phone: '+90 533 204 45 12',
      responsibilityIds: [],
      customFields: { blood_type: '0 Rh+' },
    },
    {
      id: 'per-emre',
      companyId: 'comp-kapadokya',
      category: 'copilot',
      fullName: 'Emre Demir',
      licenseNumber: 'TR-BPL-1904',
      email: 'emre.demir@kapadokyabalon.example',
      phone: '+90 541 390 11 88',
      responsibilityIds: [],
      customFields: { blood_type: 'B Rh+' },
    },
    {
      id: 'per-mehmet',
      companyId: 'comp-kapadokya',
      category: 'ground_crew',
      fullName: 'Mehmet Arslan',
      licenseNumber: 'YER-OPS-308',
      email: 'mehmet.arslan@kapadokyabalon.example',
      phone: '+90 535 771 92 10',
      responsibilityIds: ['resp-maintenance'],
      customFields: { blood_type: 'AB Rh+' },
    },
    {
      id: 'per-ayse',
      companyId: 'comp-kapadokya',
      category: 'ground_crew',
      fullName: 'Ayşe Şahin',
      licenseNumber: 'YER-KLT-412',
      email: 'ayse.sahin@kapadokyabalon.example',
      phone: '+90 536 812 34 56',
      responsibilityIds: ['resp-quality'],
      customFields: { blood_type: 'A Rh-' },
    },
    {
      id: 'per-murat',
      companyId: 'comp-kapadokya',
      category: 'ground_crew',
      fullName: 'Murat Özkan',
      licenseNumber: 'YER-OPS-519',
      email: 'murat.ozkan@kapadokyabalon.example',
      phone: '+90 538 400 77 21',
      responsibilityIds: [],
      customFields: { blood_type: '0 Rh-' },
    },
    {
      id: 'per-caner',
      companyId: 'comp-pamukkale',
      category: 'pilot',
      fullName: 'Caner Aydın',
      licenseNumber: 'TR-BPL-2201',
      email: 'caner@pamukkalebalon.example',
      phone: '+90 532 998 44 10',
      responsibilityIds: ['resp-pam-ops'],
      customFields: {},
    },
  ],
  documents: [
    {
      id: 'doc-1',
      companyId: 'comp-kapadokya',
      targetId: 'bal-tcbzd',
      targetKind: 'balloon',
      templateId: 'tpl-b-reg',
      fileName: 'TC-BZD_Ruhsat_SHGM.pdf',
      fileMime: 'image/svg+xml',
      fileSizeBytes: 248120,
      fileDataUrl: makeDemoPdfDataUrl('TC-BZD · TESCİL VE RUHSAT', 'CAMERON 420 cbft · Seri: CAM-Z420-11894'),
      uploadedById: 'admin',
      uploadedByRole: 'admin',
      isSpecialDoc: false,
      hasExpiry: false,
      adminVerified: true,
      uploadedAt: daysFromToday(-120),
    },
    {
      id: 'doc-2',
      companyId: 'comp-kapadokya',
      targetId: 'bal-tcbzd',
      targetKind: 'balloon',
      templateId: 'tpl-b-ins',
      fileName: 'TC-BZD_Sigorta_Policesi_2026.pdf',
      fileMime: 'image/svg+xml',
      fileSizeBytes: 412000,
      fileDataUrl: makeDemoPdfDataUrl('TC-BZD · MALİ MESULİYET SİGORTASI', 'Poliçe Geçerlilik & Teminat Belgesi'),
      uploadedById: 'admin',
      uploadedByRole: 'admin',
      isSpecialDoc: false,
      hasExpiry: true,
      expiryDate: daysFromToday(142),
      adminVerified: true,
      uploadedAt: daysFromToday(-90),
    },
    {
      id: 'doc-3',
      companyId: 'comp-kapadokya',
      targetId: 'bal-tcbzd',
      targetKind: 'balloon',
      templateId: 'tpl-b-arc',
      fileName: 'TC-BZD_ARC_Sertifikasi.pdf',
      fileMime: 'image/svg+xml',
      fileSizeBytes: 315400,
      fileDataUrl: makeDemoPdfDataUrl('TC-BZD · UÇUŞA ELVERİŞLİLİK (ARC)', 'SHGM Onaylı Yıllık Gözden Geçirme'),
      uploadedById: 'per-mehmet',
      uploadedByRole: 'responsible',
      isSpecialDoc: false,
      hasExpiry: true,
      expiryDate: daysFromToday(18),
      adminVerified: true,
      uploadedAt: daysFromToday(-300),
    },
    {
      id: 'doc-4',
      companyId: 'comp-kapadokya',
      targetId: 'bal-tckpd',
      targetKind: 'balloon',
      templateId: 'tpl-b-ins',
      fileName: 'TC-KPD_Sigorta_Policesi.pdf',
      fileMime: 'image/svg+xml',
      fileSizeBytes: 389100,
      fileDataUrl: makeDemoPdfDataUrl('TC-KPD · MALİ MESULİYET SİGORTASI', 'Yenileme Süresi Yaklaşan Poliçe'),
      uploadedById: 'admin',
      uploadedByRole: 'admin',
      isSpecialDoc: false,
      hasExpiry: true,
      expiryDate: daysFromToday(-3),
      adminVerified: true,
      uploadedAt: daysFromToday(-360),
    },
    {
      id: 'doc-5',
      companyId: 'comp-kapadokya',
      targetId: 'per-ahmet',
      targetKind: 'personnel',
      templateId: 'tpl-p-lic',
      fileName: 'AhmetYilmaz_BPL_Lisans.pdf',
      fileMime: 'image/svg+xml',
      fileSizeBytes: 194500,
      fileDataUrl: makeDemoPdfDataUrl('AHMET YILMAZ · BPL PİLOT LİSANSI', 'Lisans No: TR-BPL-1042'),
      uploadedById: 'per-ahmet',
      uploadedByRole: 'pilot',
      isSpecialDoc: false,
      hasExpiry: true,
      expiryDate: daysFromToday(260),
      adminVerified: true,
      uploadedAt: daysFromToday(-60),
    },
    {
      id: 'doc-6',
      companyId: 'comp-kapadokya',
      targetId: 'per-ahmet',
      targetKind: 'personnel',
      templateId: 'tpl-p-med',
      fileName: 'AhmetYilmaz_Saglik_Class2.pdf',
      fileMime: 'image/svg+xml',
      fileSizeBytes: 158200,
      fileDataUrl: makeDemoPdfDataUrl('AHMET YILMAZ · SAĞLIK SERTİFİKASI', 'Class 2 Havacılık Tıp Muayenesi'),
      uploadedById: 'per-ahmet',
      uploadedByRole: 'pilot',
      isSpecialDoc: false,
      hasExpiry: true,
      expiryDate: daysFromToday(14),
      adminVerified: true,
      uploadedAt: daysFromToday(-330),
    },
    {
      id: 'doc-7',
      companyId: 'comp-kapadokya',
      targetId: 'per-selin',
      targetKind: 'personnel',
      templateId: 'tpl-p-lang',
      fileName: 'SelinKaya_ICAO_Level5.pdf',
      fileMime: 'image/svg+xml',
      fileSizeBytes: 182000,
      fileDataUrl: makeDemoPdfDataUrl('SELİN KAYA · ICAO DİL YETERLİLİK', 'Seviye 5 İngilizce Yeterlilik'),
      uploadedById: 'per-selin',
      uploadedByRole: 'pilot',
      isSpecialDoc: false,
      hasExpiry: true,
      expiryDate: daysFromToday(510),
      adminVerified: true,
      uploadedAt: daysFromToday(-45),
    },
    {
      id: 'doc-8',
      companyId: 'comp-kapadokya',
      targetId: 'per-murat',
      targetKind: 'personnel',
      templateId: 'tpl-g-cert',
      fileName: 'MuratOzkan_YerEkibi_Sertifika.pdf',
      fileMime: 'image/svg+xml',
      fileSizeBytes: 142300,
      fileDataUrl: makeDemoPdfDataUrl('MURAT ÖZKAN · YER EKİBİ SERTİFİKASI', 'Soğuk Şişirme & Kurtarma Ekibi'),
      uploadedById: 'per-murat',
      uploadedByRole: 'ground_crew',
      isSpecialDoc: false,
      hasExpiry: true,
      expiryDate: daysFromToday(95),
      adminVerified: true,
      uploadedAt: daysFromToday(-80),
    },
  ],
  trainings: [
    {
      id: 'trn-1',
      companyId: 'comp-kapadokya',
      templateId: 'tt-crm',
      title: '2026 Kış Dönemi CRM & Acil İniş Koordinasyon Eğitimi',
      content: 'Tüm pilot ve yer ekibi katılımıyla Göreme brifing salonunda gerçekleştirilen CRM tazeleme ve acil durum tahliye eğitimi.',
      trainingDate: daysFromToday(-24),
      instructorPersonnelId: 'per-ayse',
      participantIds: ['per-ahmet', 'per-selin', 'per-emre', 'per-mehmet', 'per-murat'],
      signedSheetFileName: 'CRM_2026_Imza_Tutanagi.pdf',
      signedSheetDataUrl: makeDemoPdfDataUrl('CRM EĞİTİMİ · İMZALI KATILIM TUTANAĞI', 'Eğitmen: Ayşe Şahin (Kalite Yönetim Sorumlusu) · 5 Katılımcı İmzalı'),
      createdAt: daysFromToday(-24),
    },
    {
      id: 'trn-2',
      companyId: 'comp-kapadokya',
      templateId: 'tt-fire',
      title: 'LPG Tüp Dolum & Yangın Müdahale Tatbikatı',
      content: 'Yüksek basınçlı propan tüpleri, valf sızdırmazlık testi ve saha yangın söndürme tatbikatı.',
      trainingDate: daysFromToday(-65),
      instructorPersonnelId: 'per-mehmet',
      participantIds: ['per-mehmet', 'per-murat', 'per-emre'],
      signedSheetFileName: 'LPG_Yangin_Tatbikat_Imza.pdf',
      signedSheetDataUrl: makeDemoPdfDataUrl('LPG & YANGIN TATBİKATI · İMZA TUTANAĞI', 'Eğitmen: Mehmet Arslan (Bakım Sorumlusu) · 3 Katılımcı İmzalı'),
      createdAt: daysFromToday(-65),
    },
  ],
  flightLogs: [
    {
      id: 'flt-sample-1',
      companyId: 'comp-kapadokya',
      balloonId: 'bal-tcbzd',
      pilotId: 'per-ahmet',
      copilotId: 'per-emre',
      startedAt: morningFlightStart,
      endedAt: morningFlightStart + (samplePoints.length - 1) * 15000,
      durationMinutes: 64,
      maxAltM: Math.max(...samplePoints.map((p) => p.altM)),
      maxSpeedKmh: Math.max(...samplePoints.map((p) => p.speedKmh)),
      maxClimbMs: Math.max(...samplePoints.map((p) => p.varioMs)),
      maxSinkMs: Math.min(...samplePoints.map((p) => p.varioMs)),
      points: samplePoints,
      syncStatus: 'synced',
      notes: 'Göreme - Aşk Vadisi sabah sorti uçuşu (kayıt sonunda araç transferi bölümü GPX kırpma testi için dahildir).',
    },
  ],
};
