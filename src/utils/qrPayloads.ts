import {
  ClinicalSetting,
  FacultyGeneratedQrStation,
  ProcedureRole,
} from '../types/medicalSchool';

export interface WardQrPayload {
  system: 'SURIN_MEC';
  type: 'WARD_CHECKIN';
  qrId?: string;
  wardCode: string;
  department: string;
  wardOrUnit: string;
  shiftId?: string;
  shiftType?: string;
  supervisingStaff?: string;
}

export interface ProcedureQrPayload {
  system: 'SURIN_MEC';
  type: 'PROCEDURE_CHECKIN';
  qrId?: string;
  procedureCode: string;
  procedureName: string;
  department: string;
  wardOrUnit: string;
  setting: ClinicalSetting;
  defaultRole: ProcedureRole;
  supervisingStaff: string;
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

export type AnyClinicQrPayload =
  | WardQrPayload
  | ProcedureQrPayload
  | BedsideQrPayload;

export function generateUniqueQrCode(prefix: 'WARD' | 'PROC'): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(6);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  let suffix = '';
  for (let i = 0; i < bytes.length; i += 1) {
    suffix += alphabet[bytes[i] % alphabet.length];
  }
  return `${prefix}-${suffix}`;
}

export function serializeFacultyStationQr(station: FacultyGeneratedQrStation): string {
  if (station.kind === 'procedure') {
    const payload: ProcedureQrPayload = {
      system: 'SURIN_MEC',
      type: 'PROCEDURE_CHECKIN',
      qrId: station.id,
      procedureCode: station.code,
      procedureName: station.procedureName || 'หัตถการทางคลินิก',
      department: station.department,
      wardOrUnit: station.wardOrUnit,
      setting: station.clinicalSetting ?? 'IPD',
      defaultRole: station.defaultRole ?? 'Perform',
      supervisingStaff: station.supervisingStaff,
    };
    return JSON.stringify(payload);
  }

  const payload: WardQrPayload = {
    system: 'SURIN_MEC',
    type: 'WARD_CHECKIN',
    qrId: station.id,
    wardCode: station.code,
    department: station.department,
    wardOrUnit: station.wardOrUnit,
    ...(station.shiftType ? { shiftType: station.shiftType } : {}),
    ...(station.supervisingStaff ? { supervisingStaff: station.supervisingStaff } : {}),
  };
  return JSON.stringify(payload);
}

const VALID_SETTINGS: readonly ClinicalSetting[] = [
  'IPD',
  'OPD',
  'ER',
  'OR',
  'LR',
  'Community',
];
const VALID_ROLES: readonly ProcedureRole[] = ['Perform', 'Assist', 'Observe'];

export function parseClinicQrData(rawText: string): AnyClinicQrPayload | null {
  const trimmed = rawText.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as Partial<
        Omit<WardQrPayload, 'type'> &
          Omit<ProcedureQrPayload, 'type'> &
          Omit<BedsideQrPayload, 'type'> & { type: string }
      >;
      if (parsed.system !== 'SURIN_MEC') return null;

      if (
        parsed.type === 'PROCEDURE_CHECKIN' &&
        typeof parsed.procedureName === 'string' &&
        typeof parsed.department === 'string' &&
        parsed.procedureName.trim().length > 0 &&
        parsed.department.trim().length > 0
      ) {
        const setting =
          typeof parsed.setting === 'string' &&
          VALID_SETTINGS.includes(parsed.setting as ClinicalSetting)
            ? (parsed.setting as ClinicalSetting)
            : 'IPD';
        const defaultRole =
          typeof parsed.defaultRole === 'string' &&
          VALID_ROLES.includes(parsed.defaultRole as ProcedureRole)
            ? (parsed.defaultRole as ProcedureRole)
            : 'Perform';

        return {
          system: 'SURIN_MEC',
          type: 'PROCEDURE_CHECKIN',
          qrId: typeof parsed.qrId === 'string' ? parsed.qrId.trim() : undefined,
          procedureCode:
            typeof parsed.procedureCode === 'string' && parsed.procedureCode.trim()
              ? parsed.procedureCode.trim()
              : 'PROC-SURIN',
          procedureName: parsed.procedureName.trim(),
          department: parsed.department.trim(),
          wardOrUnit:
            typeof parsed.wardOrUnit === 'string' && parsed.wardOrUnit.trim()
              ? parsed.wardOrUnit.trim()
              : parsed.department.trim(),
          setting,
          defaultRole,
          supervisingStaff:
            typeof parsed.supervisingStaff === 'string' && parsed.supervisingStaff.trim()
              ? parsed.supervisingStaff.trim()
              : 'อาจารย์แพทย์ประจำหอผู้ป่วย',
        };
      }

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
          qrId: typeof parsed.qrId === 'string' ? parsed.qrId.trim() : undefined,
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
          shiftType:
            typeof parsed.shiftType === 'string' && parsed.shiftType.trim()
              ? parsed.shiftType.trim()
              : undefined,
          supervisingStaff:
            typeof parsed.supervisingStaff === 'string' && parsed.supervisingStaff.trim()
              ? parsed.supervisingStaff.trim()
              : undefined,
        };
      }
    } catch {
      return null;
    }
  }

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

  if (trimmed.startsWith('SURINPROC|')) {
    const parts = trimmed.split('|').map((p) => p.trim());
    if (parts.length >= 5 && parts[1] && parts[2] && parts[3]) {
      const setting = VALID_SETTINGS.includes(parts[5] as ClinicalSetting)
        ? (parts[5] as ClinicalSetting)
        : 'IPD';
      const defaultRole = VALID_ROLES.includes(parts[6] as ProcedureRole)
        ? (parts[6] as ProcedureRole)
        : 'Perform';
      return {
        system: 'SURIN_MEC',
        type: 'PROCEDURE_CHECKIN',
        procedureCode: parts[1],
        procedureName: parts[2],
        department: parts[3],
        wardOrUnit: parts[4] || parts[3],
        setting,
        defaultRole,
        supervisingStaff: parts[7] || 'อาจารย์แพทย์ประจำหอผู้ป่วย',
      };
    }
  }

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
