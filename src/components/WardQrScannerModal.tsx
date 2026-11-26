import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
import {
  AlertTriangle,
  BedDouble,
  Camera,
  CheckCircle2,
  ClipboardPenLine,
  Download,
  ImagePlus,
  QrCode,
  RefreshCw,
  ScanLine,
  Stethoscope,
  VideoOff,
  X,
} from 'lucide-react';
import {
  BedsideCheckInRecord,
  DutyShift,
  ProcedureRole,
  UserRole,
} from '../types/medicalSchool';

export interface WardQrPayload {
  system: 'SURIN_MEC';
  type: 'WARD_CHECKIN';
  wardCode: string;
  department: string;
  wardOrUnit: string;
  shiftId?: string;
}

export interface BedsideQrPayload {
  system: 'SURIN_MEC';
  type: 'BEDSIDE_CASE';
  scanKind: 'patient_case' | 'ward_round';
  bedsideCode: string;
  department: string;
  wardOrUnit: string;
  bedOrRoom: string;
  caseCode: string;
  patientSummary: string;
  diagnosis: string;
  icd10: string;
  supervisingStaff: string;
}

export type AnyClinicQrPayload = WardQrPayload | BedsideQrPayload;

export interface QrCheckInResult {
  shift: DutyShift;
  matchedExisting: boolean;
  wardCode: string;
}

export interface BedsideReflectionInput {
  roleInEncounter: ProcedureRole;
  clinicalTakeaway: string;
  reflectionNote: string;
  syncToLogbook: boolean;
}

interface WardQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: UserRole;
  currentStudentName: string;
  shifts: DutyShift[];
  onRecordQrCheckIn: (payload: WardQrPayload) => QrCheckInResult;
  onRecordBedsideCheckIn: (payload: BedsideQrPayload) => BedsideCheckInRecord;
  onSaveBedsideReflection: (
    recordId: string,
    input: BedsideReflectionInput
  ) => void;
}

interface WardStationPreset {
  wardCode: string;
  department: string;
  wardOrUnit: string;
  shiftId?: string;
  locationNote: string;
}

interface BedsideStationPreset extends BedsideQrPayload {
  locationNote: string;
}

const CORE_WARD_PRESETS: WardStationPreset[] = [
  {
    wardCode: 'MED-M1',
    department: 'กลุ่มงานอายุรศาสตร์',
    wardOrUnit: 'หอผู้ป่วยอายุรกรรมชาย 1',
    shiftId: 'shift-1',
    locationNote: 'อาคารเฉลิมพระเกียรติ ชั้น 4 · เคาน์เตอร์พยาบาล',
  },
  {
    wardCode: 'ER-RESUS',
    department: 'กลุ่มงานเวชศาสตร์ฉุกเฉิน',
    wardOrUnit: 'ห้องอุบัติเหตุและฉุกเฉิน (ER โซน Resuscitation)',
    shiftId: 'shift-2',
    locationNote: 'อาคารอุบัติเหตุและฉุกเฉิน ชั้น 1 · จุดคัดกรอง',
  },
  {
    wardCode: 'PED-W1',
    department: 'กลุ่มงานกุมารเวชศาสตร์',
    wardOrUnit: 'หอผู้ป่วยกุมารเวชกรรม 1',
    locationNote: 'อาคารกุมารเวชกรรม ชั้น 2 · หน้าห้องพักแพทย์เวร',
  },
  {
    wardCode: 'SURG-TR',
    department: 'กลุ่มงานศัลยศาสตร์',
    wardOrUnit: 'หอผู้ป่วยศัลยกรรมอุบัติเหตุ',
    locationNote: 'อาคารศัลยกรรม ชั้น 3 · เคาน์เตอร์พยาบาล',
  },
  {
    wardCode: 'OBG-LR',
    department: 'กลุ่มงานสูติศาสตร์-นรีเวชวิทยา',
    wardOrUnit: 'ห้องคลอด (Labor Room)',
    locationNote: 'อาคารสูติ-นรีเวช ชั้น 2 · จุดลงทะเบียนรับเวร',
  },
  {
    wardCode: 'ORT-CAST',
    department: 'กลุ่มงานออร์โธปิดิกส์',
    wardOrUnit: 'ห้องตรวจฉุกเฉินออร์โธปิดิกส์ (ER Cast Room)',
    shiftId: 'shift-08',
    locationNote: 'แผนกฉุกเฉิน โซนออร์โธปิดิกส์ ชั้น 1',
  },
];

const BEDSIDE_CASE_PRESETS: BedsideStationPreset[] = [
  {
    system: 'SURIN_MEC',
    type: 'BEDSIDE_CASE',
    scanKind: 'patient_case',
    bedsideCode: 'BED-MED1-08',
    department: 'กลุ่มงานอายุรศาสตร์',
    wardOrUnit: 'หอผู้ป่วยอายุรกรรมชาย 1',
    bedOrRoom: 'เตียง 8 (อายุรกรรมชาย 1)',
    caseCode: 'CASE-69-SEPSIS-08',
    patientSummary: 'ชายไทย 71 ปี ไข้สูงหนาวสั่น BP 86/54 mmHg ปัสสาวะแสบขัด Lactate 3.8 mmol/L',
    diagnosis: 'Urosepsis with Septic Shock',
    icd10: 'A41.9',
    supervisingStaff: 'นพ.เอกรัตน์ วัฒนสุรินทร์',
    locationNote: 'ป้าย QR หัวเตียง 8 · อายุรกรรมชาย 1',
  },
  {
    system: 'SURIN_MEC',
    type: 'BEDSIDE_CASE',
    scanKind: 'ward_round',
    department: 'กลุ่มงานศัลยศาสตร์',
    bedsideCode: 'ROUND-SURG-AM',
    wardOrUnit: 'หอผู้ป่วยศัลยกรรมอุบัติเหตุ',
    bedOrRoom: 'Morning Surgical Ward Round (ทีม A)',
    caseCode: 'ROUND-69-TRAUMA-12',
    patientSummary: 'ติดตามอาการผู้ป่วยหลังผ่าตัด Blunt Abdominal Trauma และประเมิน Drain / Wound Healing',
    diagnosis: 'Post-op Exploratory Laparotomy',
    icd10: 'S36.9',
    supervisingStaff: 'นพ.กิตติพงษ์ จันทรา',
    locationNote: 'จุดเริ่มราวด์วอร์ดเช้า · รถเข็น Chart ทีม A',
  },
  {
    system: 'SURIN_MEC',
    type: 'BEDSIDE_CASE',
    scanKind: 'patient_case',
    bedsideCode: 'BED-PED1-05',
    department: 'กลุ่มงานกุมารเวชศาสตร์',
    wardOrUnit: 'หอผู้ป่วยกุมารเวชกรรม 1',
    bedOrRoom: 'เตียง 5 (กุมารเวชกรรม 1)',
    caseCode: 'CASE-69-DHF-05',
    patientSummary: 'เด็กหญิง 9 ปี ไข้สูงวันที่ 4 Hct เพิ่มขึ้น 18% Plt 42,000/mm³ ปวดท้องใต้ชายโครงขวา',
    diagnosis: 'Dengue Hemorrhagic Fever Grade II',
    icd10: 'A91',
    supervisingStaff: 'พญ.นภัสสร สุขเจริญ',
    locationNote: 'ป้าย QR ข้างเตียง 5 · หอผู้ป่วยกุมารฯ 1',
  },
  {
    system: 'SURIN_MEC',
    type: 'BEDSIDE_CASE',
    scanKind: 'patient_case',
    bedsideCode: 'BED-LR-02',
    department: 'กลุ่มงานสูติศาสตร์-นรีเวชวิทยา',
    wardOrUnit: 'ห้องคลอด (Labor Room)',
    bedOrRoom: 'เตียงรอคลอด 2 (LR)',
    caseCode: 'CASE-69-OBG-02',
    patientSummary: 'หญิงตั้งครรภ์ G1P0 GA 38+4 สัปดาห์ BP 164/108 mmHg Urine protein 3+ ปวดศีรษะ',
    diagnosis: 'Preeclampsia with Severe Features',
    icd10: 'O14.1',
    supervisingStaff: 'พญ.ศิริพร วงศ์สุวรรณ',
    locationNote: 'ป้าย QR ห้องรอคลอดเตียง 2 · ชั้น 2',
  },
  {
    system: 'SURIN_MEC',
    type: 'BEDSIDE_CASE',
    scanKind: 'ward_round',
    bedsideCode: 'ROUND-MICU-01',
    department: 'กลุ่มงานอายุรศาสตร์',
    wardOrUnit: 'หอผู้ป่วยวิกฤตอายุรกรรม (ICU Med)',
    bedOrRoom: 'ICU Med Bedside Teaching Round',
    caseCode: 'ROUND-69-MICU-03',
    patientSummary: 'ราวด์ผู้ป่วยใส่ท่อช่วยหายใจและปรับค่า Ventilator (ARDS lung-protective strategy)',
    diagnosis: 'Acute Respiratory Distress Syndrome',
    icd10: 'J80',
    supervisingStaff: 'นพ.ภูริทัต ศรีสวัสดิ์',
    locationNote: 'จุดสแกน ICU Med · หน้าห้องผู้ป่วยวิกฤต 1-4',
  },
];

function serializeWardQr(station: WardStationPreset): string {
  const payload: WardQrPayload = {
    system: 'SURIN_MEC',
    type: 'WARD_CHECKIN',
    wardCode: station.wardCode,
    department: station.department,
    wardOrUnit: station.wardOrUnit,
    ...(station.shiftId ? { shiftId: station.shiftId } : {}),
  };
  return JSON.stringify(payload);
}

function serializeBedsideQr(preset: BedsideStationPreset): string {
  const payload: BedsideQrPayload = {
    system: 'SURIN_MEC',
    type: 'BEDSIDE_CASE',
    scanKind: preset.scanKind,
    bedsideCode: preset.bedsideCode,
    department: preset.department,
    wardOrUnit: preset.wardOrUnit,
    bedOrRoom: preset.bedOrRoom,
    caseCode: preset.caseCode,
    patientSummary: preset.patientSummary,
    diagnosis: preset.diagnosis,
    icd10: preset.icd10,
    supervisingStaff: preset.supervisingStaff,
  };
  return JSON.stringify(payload);
}

export function parseWardQrData(rawText: string): AnyClinicQrPayload | null {
  const trimmed = rawText.trim();
  if (!trimmed) return null;

  // Format 1: Structured JSON payload
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as Partial<
        Omit<WardQrPayload, 'type'> &
          Omit<BedsideQrPayload, 'type'> & { type: string }
      >;
      if (parsed.system !== 'SURIN_MEC') return null;

      if (
        parsed.type === 'BEDSIDE_CASE' &&
        typeof parsed.department === 'string' &&
        typeof parsed.wardOrUnit === 'string' &&
        typeof parsed.caseCode === 'string'
      ) {
        return {
          system: 'SURIN_MEC',
          type: 'BEDSIDE_CASE',
          scanKind: parsed.scanKind === 'ward_round' ? 'ward_round' : 'patient_case',
          bedsideCode:
            typeof parsed.bedsideCode === 'string' && parsed.bedsideCode.trim()
              ? parsed.bedsideCode.trim()
              : 'BED-SURIN',
          department: parsed.department.trim(),
          wardOrUnit: parsed.wardOrUnit.trim(),
          bedOrRoom:
            typeof parsed.bedOrRoom === 'string' && parsed.bedOrRoom.trim()
              ? parsed.bedOrRoom.trim()
              : parsed.wardOrUnit.trim(),
          caseCode: parsed.caseCode.trim(),
          patientSummary:
            typeof parsed.patientSummary === 'string' && parsed.patientSummary.trim()
              ? parsed.patientSummary.trim()
              : 'ผู้ป่วยรับการดูแลรักษาในหอผู้ป่วย รพ.สุรินทร์',
          diagnosis:
            typeof parsed.diagnosis === 'string' && parsed.diagnosis.trim()
              ? parsed.diagnosis.trim()
              : 'Clinical Case Encounter',
          icd10:
            typeof parsed.icd10 === 'string' && parsed.icd10.trim()
              ? parsed.icd10.trim()
              : 'Z00.0',
          supervisingStaff:
            typeof parsed.supervisingStaff === 'string' && parsed.supervisingStaff.trim()
              ? parsed.supervisingStaff.trim()
              : 'อาจารย์แพทย์ประจำหอผู้ป่วย',
        };
      }

      if (
        parsed.type === 'WARD_CHECKIN' &&
        typeof parsed.department === 'string' &&
        typeof parsed.wardOrUnit === 'string' &&
        parsed.department.trim().length > 0 &&
        parsed.wardOrUnit.trim().length > 0
      ) {
        return {
          system: 'SURIN_MEC',
          type: 'WARD_CHECKIN',
          wardCode:
            typeof parsed.wardCode === 'string' && parsed.wardCode.trim()
              ? parsed.wardCode.trim()
              : 'WARD-SURIN',
          department: parsed.department.trim(),
          wardOrUnit: parsed.wardOrUnit.trim(),
          shiftId:
            typeof parsed.shiftId === 'string' && parsed.shiftId.trim()
              ? parsed.shiftId.trim()
              : undefined,
        };
      }
    } catch {
      return null;
    }
  }

  // Format 2: Pipe-delimited Ward QR: SURINMEC|WARD_CODE|DEPARTMENT|WARD_OR_UNIT[|SHIFT_ID]
  if (trimmed.startsWith('SURINMEC|')) {
    const parts = trimmed.split('|').map((p) => p.trim());
    if (parts.length >= 4 && parts[1] && parts[2] && parts[3]) {
      return {
        system: 'SURIN_MEC',
        type: 'WARD_CHECKIN',
        wardCode: parts[1],
        department: parts[2],
        wardOrUnit: parts[3],
        shiftId: parts[4] || undefined,
      };
    }
  }

  // Format 3: Pipe-delimited Bedside QR:
  // SURINBED|BEDSIDE_CODE|SCAN_KIND|DEPARTMENT|WARD_OR_UNIT|BED_OR_ROOM|CASE_CODE|PATIENT_SUMMARY|DIAGNOSIS|ICD10|SUPERVISING_STAFF
  if (trimmed.startsWith('SURINBED|')) {
    const parts = trimmed.split('|').map((p) => p.trim());
    if (parts.length >= 8 && parts[1] && parts[3] && parts[4] && parts[6]) {
      return {
        system: 'SURIN_MEC',
        type: 'BEDSIDE_CASE',
        bedsideCode: parts[1],
        scanKind: parts[2] === 'ward_round' ? 'ward_round' : 'patient_case',
        department: parts[3],
        wardOrUnit: parts[4],
        bedOrRoom: parts[5] || parts[4],
        caseCode: parts[6],
        patientSummary: parts[7] || 'ผู้ป่วยรับการดูแลรักษาในหอผู้ป่วย',
        diagnosis: parts[8] || 'Clinical Case Encounter',
        icd10: parts[9] || 'Z00.0',
        supervisingStaff: parts[10] || 'อาจารย์แพทย์ประจำหอผู้ป่วย',
      };
    }
  }

  return null;
}

export function WardQrScannerModal({
  isOpen,
  onClose,
  role,
  currentStudentName,
  shifts,
  onRecordQrCheckIn,
  onRecordBedsideCheckIn,
  onSaveBedsideReflection,
}: WardQrScannerModalProps) {
  const [activeMode, setActiveMode] = useState<'scan' | 'stations'>('scan');
  const [stationCategory, setStationCategory] = useState<'ward' | 'bedside'>('bedside');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [scanError, setScanError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<QrCheckInResult | null>(null);
  const [lastBedsideResult, setLastBedsideResult] = useState<BedsideCheckInRecord | null>(
    null
  );

  // Quick Clinical Reflection / Case Note prompt state after scanning bedside QR
  const [reflectionRole, setReflectionRole] = useState<ProcedureRole>('Observe');
  const [clinicalTakeaway, setClinicalTakeaway] = useState('');
  const [reflectionNote, setReflectionNote] = useState('');
  const [syncToLogbook, setSyncToLogbook] = useState(true);
  const [reflectionSavedBanner, setReflectionSavedBanner] = useState(false);

  const [stationQrImages, setStationQrImages] = useState<Record<string, string>>({});
  const [bedsideQrImages, setBedsideQrImages] = useState<Record<string, string>>({});

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastDecodedRawRef = useRef<string>('');

  const stationsList = useMemo(() => {
    const map = new Map<string, WardStationPreset>();
    CORE_WARD_PRESETS.forEach((p) => {
      map.set(`${p.department}::${p.wardOrUnit}`, p);
    });
    shifts.forEach((s, idx) => {
      const key = `${s.department}::${s.wardOrUnit}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          wardCode: `WARD-${String(idx + 1).padStart(2, '0')}`,
          department: s.department,
          wardOrUnit: s.wardOrUnit,
          shiftId: !s.checkedInAt ? s.id : undefined,
          locationNote: `เวร ${s.shiftType} · ${s.timeRange} น.`,
        });
      } else if (!existing.shiftId && !s.checkedInAt) {
        existing.shiftId = s.id;
      }
    });
    return Array.from(map.values());
  }, [shifts]);

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  const handleDecodedPayload = useCallback(
    (rawText: string) => {
      const parsed = parseWardQrData(rawText);
      if (!parsed) {
        setScanError(
          'พบ QR Code ที่ไม่ใช่จุดลงเวลาหรือป้ายข้างเตียงของศูนย์แพทยฯ รพ.สุรินทร์ กรุณาตรวจสอบป้าย QR อีกครั้ง'
        );
        return false;
      }

      setScanError(null);

      if (parsed.type === 'BEDSIDE_CASE') {
        const record = onRecordBedsideCheckIn(parsed);
        setLastResult(null);
        setLastBedsideResult(record);
        setReflectionRole(
          parsed.scanKind === 'ward_round' ? 'Observe' : 'Assist'
        );
        setClinicalTakeaway('');
        setReflectionNote('');
        setSyncToLogbook(true);
        setReflectionSavedBanner(false);
        stopCamera();
        return true;
      }

      const res = onRecordQrCheckIn(parsed);
      setLastBedsideResult(null);
      setLastResult(res);
      stopCamera();
      return true;
    },
    [onRecordBedsideCheckIn, onRecordQrCheckIn, stopCamera]
  );

  const startCamera = useCallback(
    async (mode: 'environment' | 'user' = facingMode) => {
      stopCamera();
      setCameraError(null);
      setScanError(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          'เบราว์เซอร์หรือสภาพแวดล้อมนี้ไม่รองรับการเปิดกล้องโดยตรง กรุณาใช้วิธีอัปโหลดภาพ QR Code ด้านล่าง หรือทดสอบสแกนจากคลังป้าย QR'
        );
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraActive(true);
      } catch (err) {
        const msg =
          err instanceof Error && err.name === 'NotAllowedError'
            ? 'ไม่ได้รับอนุญาตให้เข้าถึงกล้อง กรุณาอนุญาตการใช้กล้องในเบราว์เซอร์ หรือใช้วิธีอัปโหลดภาพ QR Code แทน'
            : 'ไม่สามารถเปิดกล้องถ่ายภาพได้ในขณะนี้ (อาจไม่มีกล้องเชื่อมต่ออยู่) สามารถอัปโหลดภาพ QR Code หรือทดสอบสแกนจากคลังป้าย QR ได้ทันที';
        setCameraError(msg);
        setCameraActive(false);
      }
    },
    [facingMode, stopCamera]
  );

  // Continuously scan video frames while camera is active
  useEffect(() => {
    if (!cameraActive || !isOpen || activeMode !== 'scan') return;

    let cancelled = false;
    let lastAttemptMs = 0;

    const scanFrame = (timestamp: number) => {
      if (cancelled) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (
        video &&
        canvas &&
        video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA &&
        timestamp - lastAttemptMs >= 160
      ) {
        lastAttemptMs = timestamp;
        const width = video.videoWidth;
        const height = video.videoHeight;
        if (width > 0 && height > 0) {
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, width, height);
            const imageData = ctx.getImageData(0, 0, width, height);
            const decoded = jsQR(imageData.data, width, height, {
              inversionAttempts: 'attemptBoth',
            });
            if (decoded && decoded.data && decoded.data !== lastDecodedRawRef.current) {
              lastDecodedRawRef.current = decoded.data;
              const ok = handleDecodedPayload(decoded.data);
              if (ok) return;
              window.setTimeout(() => {
                lastDecodedRawRef.current = '';
              }, 2000);
            }
          }
        }
      }

      rafRef.current = requestAnimationFrame(scanFrame);
    };

    rafRef.current = requestAnimationFrame(scanFrame);

    return () => {
      cancelled = true;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [activeMode, cameraActive, handleDecodedPayload, isOpen]);

  // Generate QR code images for Ward Stations & Bedside Cases
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const generateAll = async () => {
      const [wardEntries, bedsideEntries] = await Promise.all([
        Promise.all(
          stationsList.map(async (st) => {
            const dataUrl = await QRCode.toDataURL(serializeWardQr(st), {
              width: 220,
              margin: 2,
              color: { dark: '#0F2A4A', light: '#FFFFFF' },
            });
            return [st.wardCode, dataUrl] as const;
          })
        ),
        Promise.all(
          BEDSIDE_CASE_PRESETS.map(async (bp) => {
            const dataUrl = await QRCode.toDataURL(serializeBedsideQr(bp), {
              width: 220,
              margin: 2,
              color: { dark: '#0F766E', light: '#FFFFFF' },
            });
            return [bp.bedsideCode, dataUrl] as const;
          })
        ),
      ]);

      if (!cancelled) {
        setStationQrImages(Object.fromEntries(wardEntries));
        setBedsideQrImages(Object.fromEntries(bedsideEntries));
      }
    };

    void generateAll();
    return () => {
      cancelled = true;
    };
  }, [isOpen, stationsList]);

  // Stop camera when modal closes or switches tab
  useEffect(() => {
    if (!isOpen || activeMode !== 'scan') {
      stopCamera();
    }
  }, [activeMode, isOpen, stopCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  if (!isOpen) return null;

  const handleImageUpload = (file: File) => {
    setScanError(null);
    if (!file.type.startsWith('image/')) {
      setScanError('กรุณาเลือกไฟล์รูปภาพ QR Code (PNG, JPG หรือ WEBP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          setScanError('ไม่สามารถอ่านข้อมูลภาพ QR Code ได้');
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const decoded = jsQR(imageData.data, canvas.width, canvas.height, {
          inversionAttempts: 'attemptBoth',
        });
        if (!decoded || !decoded.data) {
          setScanError('ไม่พบ QR Code ในรูปภาพที่อัปโหลด กรุณาลองใช้ภาพที่คมชัดขึ้น');
          return;
        }
        handleDecodedPayload(decoded.data);
      };
      img.onerror = () => setScanError('ไม่สามารถเปิดไฟล์รูปภาพได้');
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadStationQr = (station: WardStationPreset) => {
    const dataUrl = stationQrImages[station.wardCode];
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `QR_${station.wardCode}_${station.wardOrUnit}.png`;
    link.click();
  };

  const handleDownloadBedsideQr = (preset: BedsideStationPreset) => {
    const dataUrl = bedsideQrImages[preset.bedsideCode];
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `QR_BEDSIDE_${preset.bedsideCode}_${preset.caseCode}.png`;
    link.click();
  };

  const handleSimulateBedsideScan = (preset: BedsideStationPreset) => {
    setActiveMode('scan');
    handleDecodedPayload(serializeBedsideQr(preset));
  };

  const handleSubmitBedsideReflection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lastBedsideResult || !reflectionNote.trim()) return;
    onSaveBedsideReflection(lastBedsideResult.id, {
      roleInEncounter: reflectionRole,
      clinicalTakeaway: clinicalTakeaway.trim(),
      reflectionNote: reflectionNote.trim(),
      syncToLogbook,
    });
    setLastBedsideResult((prev) =>
      prev
        ? {
            ...prev,
            roleInEncounter: reflectionRole,
            clinicalTakeaway: clinicalTakeaway.trim() || undefined,
            reflectionNote: reflectionNote.trim(),
            reflectionSavedAt: prev.checkedInAt,
          }
        : null
    );
    setReflectionSavedBanner(true);
  };

  const isStaff = role === 'faculty' || role === 'course_officer' || role === 'admin';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="ระบบสแกน QR Code เข้าหอผู้ป่วยและข้างเตียงผู้ป่วย"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-[#0F2A4A] text-white flex items-center justify-center shrink-0">
              <QrCode className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-900 truncate">
                สแกน QR Code เข้าหอผู้ป่วย ข้างเตียงผู้ป่วย และราวด์วอร์ด
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                ผู้ลงเวลา: {currentStudentName} · รองรับทั้งลงเวลาขึ้นเวรหอผู้ป่วย และบันทึกเคสข้างเตียงพร้อม Clinical Reflection
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/70 cursor-pointer shrink-0"
            aria-label="ปิดหน้าต่างสแกน QR"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-tab Switcher */}
        <div className="px-6 py-3 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center p-1 bg-slate-100 border border-slate-200 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveMode('scan')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeMode === 'scan'
                  ? 'bg-white text-[#0F2A4A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ScanLine className="w-3.5 h-3.5" aria-hidden="true" />
              <span>สแกน QR (เวร / ข้างเตียง)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('stations')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeMode === 'stations'
                  ? 'bg-white text-[#0F2A4A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                {isStaff
                  ? 'คลังป้าย QR (หอผู้ป่วย & ข้างเตียง)'
                  : 'ดูป้าย QR หอผู้ป่วย & ข้างเตียง'}
              </span>
            </button>
          </div>

          <span className="text-xs text-slate-500">
            รองรับกล้องสด, อัปโหลดภาพ QR Code และทดสอบสแกนเคสข้างเตียง
          </span>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeMode === 'scan' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Camera Scanner Box */}
              <div className="lg:col-span-6 space-y-3">
                <div className="relative aspect-[4/3] bg-slate-950 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center">
                  <video
                    ref={videoRef}
                    muted
                    playsInline
                    className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {cameraActive ? (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="w-52 h-52 sm:w-60 sm:h-60 relative">
                        <span className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-teal-400 rounded-tl-md" />
                        <span className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-teal-400 rounded-tr-md" />
                        <span className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-teal-400 rounded-bl-md" />
                        <span className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-teal-400 rounded-br-md" />
                      </div>
                      <div className="absolute bottom-3 inset-x-0 text-center">
                        <span className="inline-block px-3 py-1 rounded-md bg-slate-950/75 text-white text-xs">
                          วาง QR ประจำหอผู้ป่วย หรือ QR ข้างเตียงให้อยู่ภายในกรอบ
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center space-y-3 max-w-sm">
                      <div className="w-12 h-12 rounded-xl bg-slate-800 text-teal-400 flex items-center justify-center mx-auto">
                        {cameraError ? (
                          <VideoOff className="w-6 h-6" aria-hidden="true" />
                        ) : (
                          <Camera className="w-6 h-6" aria-hidden="true" />
                        )}
                      </div>
                      <div className="text-sm font-medium text-white">
                        {cameraError
                          ? 'ไม่สามารถเปิดกล้องถ่ายภาพได้'
                          : 'พร้อมสแกน QR Code หอผู้ป่วยหรือข้างเตียง'}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {cameraError ??
                          'สแกนป้าย QR ประจำหอผู้ป่วยเพื่อลงเวลา หรือสแกน QR ข้างเตียง/ราวด์วอร์ดเพื่อเข้าเคสและจดบันทึก Reflection'}
                      </p>
                      <button
                        type="button"
                        onClick={() => void startCamera(facingMode)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#0F766E] hover:bg-[#0D625C] rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Camera className="w-4 h-4" aria-hidden="true" />
                        <span>เปิดกล้องสแกน QR</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Camera Controls */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {cameraActive ? (
                      <>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <VideoOff className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>ปิดกล้อง</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const nextMode =
                              facingMode === 'environment' ? 'user' : 'environment';
                            setFacingMode(nextMode);
                            void startCamera(nextMode);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>
                            สลับกล้อง ({facingMode === 'environment' ? 'หลัง' : 'หน้า'})
                          </span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void startCamera(facingMode)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0F2A4A] bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>เปิดกล้องถ่ายภาพสด</span>
                      </button>
                    )}
                  </div>

                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file);
                        e.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0F2A4A] bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <ImagePlus className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>อัปโหลดรูปภาพ QR Code</span>
                    </button>
                  </div>
                </div>

                {/* Quick Bedside QR Presets for Immediate Testing */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <BedDouble className="w-3.5 h-3.5 text-[#0F766E]" aria-hidden="true" />
                      ทดสอบสแกน QR ข้างเตียง / ราวด์วอร์ดด่วน
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setStationCategory('bedside');
                        setActiveMode('stations');
                      }}
                      className="text-[11px] font-medium text-[#0F2A4A] hover:underline cursor-pointer"
                    >
                      ดูป้าย QR ทั้งหมด →
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {BEDSIDE_CASE_PRESETS.slice(0, 3).map((preset) => (
                      <button
                        key={preset.bedsideCode}
                        type="button"
                        onClick={() => handleSimulateBedsideScan(preset)}
                        className="px-2.5 py-1.5 text-[11px] font-medium text-[#0F2A4A] bg-white border border-slate-300 rounded-md hover:bg-teal-50 hover:border-teal-300 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        {preset.bedsideCode} · {preset.diagnosis.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Scan Result / Bedside Reflection Prompt / Instructions */}
              <div className="lg:col-span-6 space-y-4">
                {scanError && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-2.5 text-xs text-rose-900">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="space-y-1">
                      <div className="font-semibold">ไม่สามารถตรวจรับ QR Code ได้</div>
                      <p className="leading-relaxed">{scanError}</p>
                    </div>
                  </div>
                )}

                {lastBedsideResult ? (
                  <div className="border border-teal-200 bg-teal-50/50 rounded-xl p-5 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="inline-flex items-center gap-2 text-teal-900 font-semibold text-sm">
                        <Stethoscope className="w-5 h-5 text-[#0F766E] shrink-0" aria-hidden="true" />
                        <span>
                          {lastBedsideResult.scanKind === 'ward_round'
                            ? 'เข้าสู่การราวด์วอร์ดสำเร็จ (Ward Round Check-in)'
                            : 'เข้าสู่เคสผู้ป่วยข้างเตียงสำเร็จ (Bedside Case Check-in)'}
                        </span>
                      </div>
                      <span className="font-mono text-xs font-semibold text-teal-900 bg-white border border-teal-200 px-2 py-0.5 rounded tabular-nums shrink-0">
                        {lastBedsideResult.checkedInAt}
                      </span>
                    </div>

                    <dl className="space-y-1.5 text-xs border-t border-teal-200/80 pt-3">
                      <div className="flex justify-between gap-2">
                        <dt className="text-teal-800">รหัสเคส / จุดสแกน</dt>
                        <dd className="font-mono font-semibold text-slate-900">
                          {lastBedsideResult.caseCode} · {lastBedsideResult.bedsideCode}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-teal-800">หอผู้ป่วย / เตียง</dt>
                        <dd className="font-medium text-slate-900 text-right">
                          {lastBedsideResult.wardOrUnit} ({lastBedsideResult.bedOrRoom})
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-teal-800">การวินิจฉัย (ICD-10)</dt>
                        <dd className="font-semibold text-[#0F2A4A] text-right">
                          {lastBedsideResult.diagnosis} ({lastBedsideResult.icd10})
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-teal-800">อาจารย์ผู้ดูแล</dt>
                        <dd className="text-slate-900 text-right">
                          {lastBedsideResult.supervisingStaff}
                        </dd>
                      </div>
                    </dl>

                    <div className="bg-white border border-teal-200/80 rounded-lg p-3 text-xs text-slate-700 leading-relaxed">
                      <span className="font-semibold text-slate-900">ข้อมูลผู้ป่วยโดยย่อ: </span>
                      {lastBedsideResult.patientSummary}
                    </div>

                    {reflectionSavedBanner ? (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-2">
                        <div className="flex items-center gap-2 text-emerald-900 font-semibold text-xs sm:text-sm">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                          <span>บันทึก Clinical Reflection & Case Note เรียบร้อยแล้ว</span>
                        </div>
                        <p className="text-xs text-emerald-900 leading-relaxed">
                          {lastBedsideResult.reflectionNote}
                        </p>
                        {syncToLogbook && (
                          <div className="text-[11px] font-medium text-emerald-800">
                            • ส่งรายการเคสนี้เข้าสู่ E-Logbook (สถานะรออาจารย์รับรอง) เรียบร้อยแล้ว
                          </div>
                        )}
                      </div>
                    ) : (
                      <form
                        onSubmit={handleSubmitBedsideReflection}
                        className="bg-white border border-slate-200 rounded-xl p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs sm:text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                            <ClipboardPenLine className="w-4 h-4 text-[#0F2A4A]" aria-hidden="true" />
                            <span>บันทึก Reflection / Case Note ด่วนข้างเตียง</span>
                          </h4>
                          <span className="text-[11px] text-slate-500">บังคับระบุบันทึก</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-medium text-slate-700 mb-1">
                              บทบาทในการดูแลเคส
                            </label>
                            <select
                              value={reflectionRole}
                              onChange={(e) =>
                                setReflectionRole(e.target.value as ProcedureRole)
                              }
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                            >
                              <option value="Observe">Observe (สังเกตการณ์ / Round)</option>
                              <option value="Assist">Assist (ร่วมดูแล / ซักประวัติ-ตรวจ)</option>
                              <option value="Perform">Perform (ทำหัตถการ / ดูแลหลัก)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-slate-700 mb-1">
                              ประเด็นสำคัญ / หัตถการที่ได้เรียนรู้
                            </label>
                            <input
                              type="text"
                              value={clinicalTakeaway}
                              onChange={(e) => setClinicalTakeaway(e.target.value)}
                              placeholder="เช่น ประเมิน JVP, Fluid management..."
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-700 mb-1">
                            Clinical Reflection / Case Note
                          </label>
                          <textarea
                            rows={3}
                            required
                            value={reflectionNote}
                            onChange={(e) => setReflectionNote(e.target.value)}
                            placeholder="สรุปข้อค้นพบทางคลินิก การวินิจฉัยแยกโรค หรือคำแนะนำจากอาจารย์แพทย์ข้างเตียง..."
                            className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg"
                          />
                        </div>

                        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={syncToLogbook}
                            onChange={(e) => setSyncToLogbook(e.target.checked)}
                            className="rounded border-slate-300 text-[#0F2A4A] focus:ring-[#0F2A4A]"
                          />
                          <span>ส่งบันทึกเคสนี้เข้าสู่ E-Logbook เพื่อรออาจารย์รับรองอัตโนมัติ</span>
                        </label>

                        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                          <button
                            type="submit"
                            className="px-4 py-2 text-xs font-medium text-white bg-[#0F766E] hover:bg-[#0D625C] rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                          >
                            บันทึก Reflection / Case Note
                          </button>
                        </div>
                      </form>
                    )}

                    <div className="pt-1 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setLastBedsideResult(null);
                          lastDecodedRawRef.current = '';
                          void startCamera(facingMode);
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-teal-900 bg-white border border-teal-300 rounded-lg hover:bg-teal-100 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        สแกนเคสถัดไป
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          stopCamera();
                          onClose();
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-[#0F2A4A] rounded-lg hover:bg-[#163B66] cursor-pointer whitespace-nowrap shrink-0"
                      >
                        เสร็จสิ้นและกลับหน้าหลักสูตร
                      </button>
                    </div>
                  </div>
                ) : lastResult ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="inline-flex items-center gap-2 text-emerald-900 font-semibold text-sm">
                        <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" aria-hidden="true" />
                        <span>บันทึกเวลาเข้าหอผู้ป่วยสำเร็จ</span>
                      </div>
                      <span className="font-mono text-xs font-semibold text-emerald-800 bg-white border border-emerald-200 px-2 py-0.5 rounded tabular-nums">
                        {lastResult.shift.checkedInAt}
                      </span>
                    </div>

                    <dl className="space-y-2 text-xs border-t border-emerald-200/80 pt-3">
                      <div className="flex justify-between gap-2">
                        <dt className="text-emerald-800">รหัสจุดสแกน</dt>
                        <dd className="font-mono font-semibold text-emerald-950">
                          {lastResult.wardCode}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-emerald-800">กลุ่มงาน</dt>
                        <dd className="font-medium text-emerald-950 text-right">
                          {lastResult.shift.department}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-emerald-800">หอผู้ป่วย / จุดฝึก</dt>
                        <dd className="font-medium text-emerald-950 text-right">
                          {lastResult.shift.wardOrUnit}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-emerald-800">ผู้ลงเวลา</dt>
                        <dd className="font-medium text-emerald-950 text-right">
                          {lastResult.shift.assignedStudent}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-emerald-800">ประเภทบันทึก</dt>
                        <dd className="text-emerald-950 text-right">
                          {lastResult.matchedExisting
                            ? 'จับคู่ตารางเวรที่กำหนดไว้แล้ว'
                            : 'เพิ่มรายการลงเวลาเข้าจุดปฏิบัติงานใหม่'}
                        </dd>
                      </div>
                    </dl>

                    <div className="pt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setLastResult(null);
                          lastDecodedRawRef.current = '';
                          void startCamera(facingMode);
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-emerald-900 bg-white border border-emerald-300 rounded-lg hover:bg-emerald-100 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        สแกนจุดถัดไป
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          stopCamera();
                          onClose();
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-[#0F2A4A] rounded-lg hover:bg-[#163B66] cursor-pointer whitespace-nowrap shrink-0"
                      >
                        กลับไปดูตารางเวร
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
                    <h3 className="text-sm font-semibold text-slate-900">
                      ขั้นตอนการสแกน QR เข้าหอผู้ป่วยและข้างเตียงผู้ป่วย
                    </h3>
                    <ol className="space-y-2 text-xs text-slate-600 list-decimal list-inside leading-relaxed">
                      <li>
                        <strong>QR เคาน์เตอร์หอผู้ป่วย:</strong> ลงเวลาขึ้นเวรปฏิบัติงานอัตโนมัติลงในตารางเวรและปฏิทิน
                      </li>
                      <li>
                        <strong>QR ข้างเตียงผู้ป่วย / Ward Round:</strong> ลงชื่อเข้าเคสผู้ป่วยหรือรอบราวด์วอร์ด พร้อมแสดงข้อมูลผู้ป่วยเบื้องต้น
                      </li>
                      <li>
                        <strong>บันทึก Reflection ด่วน:</strong> หลังสแกน QR ข้างเตียง ระบบจะเปิดช่องให้บันทึก Clinical Reflection / Case Note และส่งเข้า E-Logbook ได้ทันที
                      </li>
                    </ol>
                    <div className="pt-2 border-t border-slate-200 text-xs text-slate-500 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setStationCategory('bedside');
                          setActiveMode('stations');
                        }}
                        className="text-[#0F766E] font-medium hover:underline cursor-pointer"
                      >
                        เปิดคลัง QR ข้างเตียง / ราวด์วอร์ด →
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStationCategory('ward');
                          setActiveMode('stations');
                        }}
                        className="text-[#0F2A4A] font-medium hover:underline cursor-pointer"
                      >
                        เปิดคลัง QR หอผู้ป่วย →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="inline-flex items-center p-1 bg-slate-100 border border-slate-200 rounded-lg self-start">
                  <button
                    type="button"
                    onClick={() => setStationCategory('bedside')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      stationCategory === 'bedside'
                        ? 'bg-white text-[#0F766E] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    QR ข้างเตียงผู้ป่วย & ราวด์วอร์ด ({BEDSIDE_CASE_PRESETS.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStationCategory('ward')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      stationCategory === 'ward'
                        ? 'bg-white text-[#0F2A4A] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    QR เคาน์เตอร์หอผู้ป่วย ({stationsList.length})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveMode('scan')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#0F2A4A] rounded-lg hover:bg-[#163B66] cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
                >
                  <ScanLine className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>กลับไปหน้าสแกน QR</span>
                </button>
              </div>

              {stationCategory === 'bedside' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {BEDSIDE_CASE_PRESETS.map((preset) => {
                    const qrUrl = bedsideQrImages[preset.bedsideCode];
                    return (
                      <div
                        key={preset.bedsideCode}
                        className="border border-slate-200 rounded-xl p-4 bg-white flex flex-col justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="font-mono font-semibold text-[#0F766E]">
                              {preset.bedsideCode}
                            </span>
                            <span className="text-slate-500">
                              {preset.scanKind === 'ward_round'
                                ? 'Ward Round'
                                : 'เคสข้างเตียง'}
                            </span>
                          </div>
                          <div className="text-sm font-semibold text-slate-900 leading-snug">
                            {preset.diagnosis}
                          </div>
                          <div className="text-xs text-slate-600">
                            {preset.bedOrRoom} · {preset.department}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {preset.locationNote}
                          </div>
                        </div>

                        <div className="flex justify-center py-2 bg-slate-50 rounded-lg border border-slate-200/80">
                          {qrUrl ? (
                            <img
                              src={qrUrl}
                              alt={`QR Code สำหรับ ${preset.caseCode}`}
                              className="w-36 h-36 object-contain"
                            />
                          ) : (
                            <div className="w-36 h-36 flex items-center justify-center text-xs text-slate-400">
                              กำลังสร้าง QR...
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleSimulateBedsideScan(preset)}
                            className="inline-flex items-center justify-center gap-1 px-2.5 py-2 text-xs font-medium text-white bg-[#0F766E] hover:bg-[#0D625C] rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                          >
                            <ScanLine className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>ทดสอบสแกน</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadBedsideQr(preset)}
                            disabled={!qrUrl}
                            className="inline-flex items-center justify-center gap-1 px-2.5 py-2 text-xs font-medium text-[#0F2A4A] bg-slate-50 border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
                          >
                            <Download className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>โหลด PNG</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stationsList.map((station) => {
                    const qrUrl = stationQrImages[station.wardCode];
                    return (
                      <div
                        key={`${station.wardCode}-${station.wardOrUnit}`}
                        className="border border-slate-200 rounded-xl p-4 bg-white flex flex-col justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs font-semibold text-[#0F766E]">
                              {station.wardCode}
                            </span>
                            <span className="text-[11px] text-slate-500 truncate">
                              {station.department}
                            </span>
                          </div>
                          <div className="text-sm font-semibold text-slate-900 leading-snug">
                            {station.wardOrUnit}
                          </div>
                          <div className="text-xs text-slate-500">{station.locationNote}</div>
                        </div>

                        <div className="flex justify-center py-2 bg-slate-50 rounded-lg border border-slate-200/80">
                          {qrUrl ? (
                            <img
                              src={qrUrl}
                              alt={`QR Code สำหรับ ${station.wardOrUnit}`}
                              className="w-36 h-36 object-contain"
                            />
                          ) : (
                            <div className="w-36 h-36 flex items-center justify-center text-xs text-slate-400">
                              กำลังสร้าง QR...
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleDownloadStationQr(station)}
                            disabled={!qrUrl}
                            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-[#0F2A4A] bg-slate-50 border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
                          >
                            <Download className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>ดาวน์โหลดป้าย QR (PNG)</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
