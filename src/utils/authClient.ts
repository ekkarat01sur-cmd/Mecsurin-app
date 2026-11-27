import {
  COHORT_STUDENTS,
  IMAGE_ASSETS,
  INITIAL_STUDENT_PHOTOS,
} from '../data/initialMedicalData';
import {
  AuthUserProfile,
  MemberAccountStatus,
  RoleAccessLevel,
  UserRole,
} from '../types/medicalSchool';
import { sanitizeAvatarUrlInput } from './imageUtils';

export interface BootstrapDirectoryEntry {
  username: string;
  role: UserRole;
  displayName: string;
  affiliation: string;
  photoUrl?: string;
  positionTitle?: string;
  department?: string;
  status?: MemberAccountStatus;
  studentId?: string;
  assignedCourseCodes?: string[];
  hasPasswordSet: boolean;
}

export interface IssuedCredentialSlip {
  username: string;
  displayName: string;
  role: UserRole;
  affiliation?: string;
  temporaryPassword: string;
}

interface StoredStaticAccount {
  username: string;
  role: UserRole;
  level: RoleAccessLevel;
  displayName: string;
  affiliation: string;
  photoUrl?: string;
  positionTitle?: string;
  department?: string;
  phone?: string;
  email?: string;
  licenseOrCode?: string;
  status?: MemberAccountStatus;
  notes?: string;
  studentId?: string;
  assignedCourseCodes?: string[];
  salt?: string;
  passwordHash?: string;
  mustChangePassword: boolean;
}

interface StaticSessionRecord {
  username: string;
  role: UserRole;
  exp: number;
}

const STATIC_ACCOUNTS_STORAGE_KEY = 'surin_mec_static_auth_accounts_v1';
const STATIC_TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

let authTransportMode: 'unknown' | 'server' | 'static' = 'unknown';
const staticSessions = new Map<string, StaticSessionRecord>();

function roleToLevel(role: UserRole): RoleAccessLevel {
  if (role === 'admin' || role === 'course_officer') return 3;
  if (role === 'faculty') return 2;
  return 1;
}

function buildSeedStaticAccounts(): StoredStaticAccount[] {
  const baseStaff: StoredStaticAccount[] = [
    {
      username: 'admin',
      role: 'admin',
      level: 3,
      displayName: 'ประธานคณะกรรมการบริหารหลักสูตรและฝ่ายวิชาการ',
      affiliation: 'สำนักงานศูนย์แพทยศาสตรศึกษาชั้นคลินิก รพ.สุรินทร์',
      photoUrl: IMAGE_ASSETS.studentMaleExtern,
      positionTitle: 'ผู้อำนวยการ / ประธานหลักสูตร ศพค.',
      department: 'สำนักงานศูนย์แพทยศาสตรศึกษาชั้นคลินิก',
      phone: 'ภายใน 2001 · 044-511-006',
      email: 'mec-admin@surinhospital.go.th',
      licenseOrCode: 'MEC-ADMIN-01',
      status: 'ใช้งานปกติ',
      mustChangePassword: false,
    },
    {
      username: 'off_ped',
      role: 'course_officer',
      level: 3,
      displayName: 'นางสาวณัฐริกา ใจซื่อ (นักวิชาการรายวิชา กุมารฯ)',
      affiliation: 'กลุ่มงานกุมารเวชศาสตร์ (SUR-PED-502)',
      photoUrl: IMAGE_ASSETS.studentFemaleMed1,
      positionTitle: 'นักวิชาการศึกษาประจำรายวิชา',
      department: 'กลุ่มงานกุมารเวชศาสตร์',
      phone: 'ภายใน 2209',
      email: 'natrika.j@surinhospital.go.th',
      licenseOrCode: 'OFF-PED-01',
      status: 'ใช้งานปกติ',
      assignedCourseCodes: ['SUR-PED-502'],
      mustChangePassword: false,
    },
    {
      username: 'off_med',
      role: 'course_officer',
      level: 3,
      displayName: 'นายธีระวัฒน์ สุริยา (นักวิชาการรายวิชา อายุรฯ)',
      affiliation: 'กลุ่มงานอายุรศาสตร์ (SUR-MED-401)',
      photoUrl: IMAGE_ASSETS.studentMaleMed2,
      positionTitle: 'นักวิชาการศึกษาประจำรายวิชา',
      department: 'กลุ่มงานอายุรศาสตร์',
      phone: 'ภายใน 2109',
      email: 'teerawat.s@surinhospital.go.th',
      licenseOrCode: 'OFF-MED-01',
      status: 'ใช้งานปกติ',
      assignedCourseCodes: ['SUR-MED-401'],
      mustChangePassword: false,
    },
    {
      username: 'off_surg',
      role: 'course_officer',
      level: 3,
      displayName: 'นางสาวศศิวิมล พูลสุข (นักวิชาการรายวิชา ศัลยฯ)',
      affiliation: 'กลุ่มงานศัลยศาสตร์ (SUR-SURG-402)',
      photoUrl: IMAGE_ASSETS.studentFemaleMed2,
      positionTitle: 'นักวิชาการศึกษาประจำรายวิชา',
      department: 'กลุ่มงานศัลยศาสตร์',
      phone: 'ภายใน 2309',
      email: 'sasiwimon.p@surinhospital.go.th',
      licenseOrCode: 'OFF-SURG-01',
      status: 'ใช้งานปกติ',
      assignedCourseCodes: ['SUR-SURG-402'],
      mustChangePassword: false,
    },
    {
      username: 'off_obg',
      role: 'course_officer',
      level: 3,
      displayName: 'นางสาวปิยะพร จันทร์งาม (นักวิชาการรายวิชา สูติฯ)',
      affiliation: 'กลุ่มงานสูติศาสตร์-นรีเวชวิทยา (SUR-OBG-501)',
      photoUrl: IMAGE_ASSETS.studentFemaleMed1,
      positionTitle: 'นักวิชาการศึกษาประจำรายวิชา',
      department: 'กลุ่มงานสูติศาสตร์-นรีเวชวิทยา',
      phone: 'ภายใน 2409',
      email: 'piyaporn.c@surinhospital.go.th',
      licenseOrCode: 'OFF-OBG-01',
      status: 'ใช้งานปกติ',
      assignedCourseCodes: ['SUR-OBG-501'],
      mustChangePassword: false,
    },
    {
      username: 'dr_pinyada',
      role: 'faculty',
      level: 2,
      displayName: 'อ.ภิญญดา แก้วปลั่ง',
      affiliation: 'อาจารย์แพทย์ กลุ่มงานกุมารเวชศาสตร์',
      photoUrl: IMAGE_ASSETS.studentFemaleMed2,
      positionTitle: 'อาจารย์แพทย์พี่เลี้ยง / ประเมิน OSCE',
      department: 'กลุ่มงานกุมารเวชศาสตร์',
      phone: 'ภายใน 2204',
      email: 'pinyada.k@surinhospital.go.th',
      licenseOrCode: 'ว.49812',
      status: 'ใช้งานปกติ',
      assignedCourseCodes: ['SUR-PED-502'],
      mustChangePassword: false,
    },
    {
      username: 'dr_napassorn',
      role: 'faculty',
      level: 2,
      displayName: 'พญ. นภัสสร สุขเจริญ',
      affiliation: 'หัวหน้ากลุ่มงานกุมารเวชศาสตร์',
      photoUrl: IMAGE_ASSETS.studentFemaleMed1,
      positionTitle: 'หัวหน้ากลุ่มงานกุมารเวชศาสตร์',
      department: 'กลุ่มงานกุมารเวชศาสตร์',
      phone: 'ภายใน 2201',
      email: 'napassorn.s@surinhospital.go.th',
      licenseOrCode: 'ว.45630',
      status: 'ใช้งานปกติ',
      assignedCourseCodes: ['SUR-PED-502'],
      mustChangePassword: false,
    },
    {
      username: 'dr_ekarat',
      role: 'faculty',
      level: 2,
      displayName: 'นพ. เอกรัตน์ วัฒนสุรินทร์',
      affiliation: 'หัวหน้ากลุ่มงานอายุรศาสตร์',
      photoUrl: IMAGE_ASSETS.studentMaleExtern,
      positionTitle: 'หัวหน้ากลุ่มงานอายุรศาสตร์',
      department: 'กลุ่มงานอายุรศาสตร์',
      phone: 'ภายใน 2101',
      email: 'ekkarat.w@surinhospital.go.th',
      licenseOrCode: 'ว.41208',
      status: 'ใช้งานปกติ',
      assignedCourseCodes: ['SUR-MED-401'],
      mustChangePassword: false,
    },
    {
      username: 'dr_kittipong',
      role: 'faculty',
      level: 2,
      displayName: 'นพ. กิตติพงษ์ จันทรา',
      affiliation: 'หัวหน้ากลุ่มงานศัลยศาสตร์',
      photoUrl: IMAGE_ASSETS.studentMaleMed2,
      positionTitle: 'หัวหน้ากลุ่มงานศัลยศาสตร์',
      department: 'กลุ่มงานศัลยศาสตร์',
      phone: 'ภายใน 2301',
      email: 'kittipong.c@surinhospital.go.th',
      licenseOrCode: 'ว.42815',
      status: 'ใช้งานปกติ',
      assignedCourseCodes: ['SUR-SURG-402'],
      mustChangePassword: false,
    },
    {
      username: 'dr_siriporn',
      role: 'faculty',
      level: 2,
      displayName: 'พญ. ศิริพร วงศ์สุวรรณ',
      affiliation: 'หัวหน้ากลุ่มงานสูติศาสตร์-นรีเวชวิทยา',
      photoUrl: IMAGE_ASSETS.studentFemaleMed1,
      positionTitle: 'หัวหน้ากลุ่มงานสูติศาสตร์-นรีเวชวิทยา',
      department: 'กลุ่มงานสูติศาสตร์-นรีเวชวิทยา',
      phone: 'ภายใน 2401',
      email: 'siriporn.w@surinhospital.go.th',
      licenseOrCode: 'ว.44109',
      status: 'ใช้งานปกติ',
      assignedCourseCodes: ['SUR-OBG-501'],
      mustChangePassword: false,
    },
    {
      username: 'dr_phuritat',
      role: 'faculty',
      level: 2,
      displayName: 'นพ. ภูริทัต ศรีสวัสดิ์',
      affiliation: 'หัวหน้ากลุ่มงานเวชศาสตร์ฉุกเฉิน',
      photoUrl: IMAGE_ASSETS.studentMaleExtern,
      positionTitle: 'หัวหน้ากลุ่มงานเวชศาสตร์ฉุกเฉิน',
      department: 'กลุ่มงานเวชศาสตร์ฉุกเฉิน',
      phone: 'ภายใน 1660',
      email: 'phuritat.s@surinhospital.go.th',
      licenseOrCode: 'ว.47922',
      status: 'ใช้งานปกติ',
      assignedCourseCodes: ['SUR-MED-401', 'SUR-SURG-402'],
      mustChangePassword: false,
    },
  ];

  const studentAccounts: StoredStaticAccount[] = COHORT_STUDENTS.map((s) => ({
    username: `std_${s.studentId}`,
    role: 'student',
    level: 1,
    displayName: s.studentName,
    affiliation: `ชั้นปีที่ ${s.yearLevel} (${s.group}) · รหัส ${s.studentId}`,
    photoUrl: s.photoUrl ?? INITIAL_STUDENT_PHOTOS[s.studentId],
    positionTitle: `นักศึกษาแพทย์ชั้นปีที่ ${s.yearLevel}${s.yearLevel === '6' ? ' (Extern)' : ''}`,
    department: 'ศูนย์แพทยศาสตรศึกษาชั้นคลินิก รพ.สุรินทร์',
    phone: s.contactInfo,
    email: `${s.studentId}@student.surinmec.ac.th`,
    licenseOrCode: s.studentId,
    status: 'ใช้งานปกติ',
    studentId: s.studentId,
    mustChangePassword: true,
  }));

  return [...baseStaff, ...studentAccounts];
}

function loadStaticAccountsMap(): Map<string, StoredStaticAccount> {
  const seeded = buildSeedStaticAccounts();
  const seedByUsername = new Map(seeded.map((acc) => [acc.username, acc]));
  try {
    const raw = localStorage.getItem(STATIC_ACCOUNTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredStaticAccount[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        const merged = new Map<string, StoredStaticAccount>();
        for (const acc of parsed) {
          if (!acc || typeof acc.username !== 'string') continue;
          const seed = seedByUsername.get(acc.username);
          merged.set(acc.username, {
            ...seed,
            ...acc,
            photoUrl: acc.photoUrl !== undefined ? acc.photoUrl : seed?.photoUrl,
            positionTitle: acc.positionTitle ?? seed?.positionTitle,
            department: acc.department ?? seed?.department,
            phone: acc.phone ?? seed?.phone,
            email: acc.email ?? seed?.email,
            licenseOrCode: acc.licenseOrCode ?? seed?.licenseOrCode,
            status: acc.status ?? seed?.status ?? 'ใช้งานปกติ',
          });
        }
        for (const [uname, seed] of seedByUsername.entries()) {
          if (!merged.has(uname)) {
            merged.set(uname, seed);
          }
        }
        return merged;
      }
    }
  } catch {
    // Fallback to seed accounts
  }
  saveStaticAccounts(seeded);
  return seedByUsername;
}

function saveStaticAccounts(accounts: Iterable<StoredStaticAccount>): void {
  try {
    localStorage.setItem(
      STATIC_ACCOUNTS_STORAGE_KEY,
      JSON.stringify(Array.from(accounts))
    );
  } catch {
    // Ignore storage quota errors
  }
}

function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashPasswordWeb(
  password: string,
  existingSalt?: string
): Promise<{ salt: string; passwordHash: string }> {
  const salt = existingSalt || randomHex(16);
  const enc = new TextEncoder();
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    const derived = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: enc.encode(salt),
        iterations: 100_000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );
    const hashHex = Array.from(new Uint8Array(derived), (b) =>
      b.toString(16).padStart(2, '0')
    ).join('');
    return { salt, passwordHash: `pbkdf2:${hashHex}` };
  }
  throw new Error('เบราว์เซอร์ไม่รองรับ Web Crypto API');
}

async function verifyPasswordWeb(
  password: string,
  salt: string,
  storedHash: string
): Promise<boolean> {
  const { passwordHash } = await hashPasswordWeb(password, salt);
  if (passwordHash.length !== storedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < passwordHash.length; i += 1) {
    diff |= passwordHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return diff === 0;
}

function generateReadableTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const digits = String(1000 + ((bytes[0] * 256 + bytes[1]) % 9000));
  const c1 = chars[bytes[2] % chars.length];
  const c2 = chars[bytes[3] % chars.length];
  return `Surin-${digits}${c1}${c2}`;
}

function toPublicProfile(acc: StoredStaticAccount): AuthUserProfile {
  return {
    username: acc.username,
    role: acc.role,
    level: acc.level,
    displayName: acc.displayName,
    affiliation: acc.affiliation,
    photoUrl: acc.photoUrl || undefined,
    positionTitle: acc.positionTitle,
    department: acc.department,
    phone: acc.phone,
    email: acc.email,
    licenseOrCode: acc.licenseOrCode,
    status: acc.status ?? 'ใช้งานปกติ',
    notes: acc.notes,
    studentId: acc.studentId,
    assignedCourseCodes: acc.assignedCourseCodes,
    hasPasswordSet: Boolean(acc.passwordHash && acc.salt),
    mustChangePassword: acc.mustChangePassword,
  };
}

function createStaticToken(acc: StoredStaticAccount): string {
  const token = `static.${randomHex(24)}`;
  staticSessions.set(token, {
    username: acc.username,
    role: acc.role,
    exp: Date.now() + STATIC_TOKEN_TTL_MS,
  });
  return token;
}

function resolveStaticActor(
  token: string,
  accounts: Map<string, StoredStaticAccount>
): StoredStaticAccount | null {
  const session = staticSessions.get(token);
  if (!session || session.exp < Date.now()) {
    staticSessions.delete(token);
    return null;
  }
  const acc = accounts.get(session.username);
  if (!acc || acc.role !== session.role) return null;
  return acc;
}

function canActorManageTarget(
  actor: StoredStaticAccount,
  target: StoredStaticAccount
): boolean {
  if (actor.role === 'admin') return true;
  if (actor.role === 'course_officer') {
    if (target.role === 'student') return true;
    if (target.role === 'faculty') {
      const actorCourses = actor.assignedCourseCodes ?? [];
      const targetCourses = target.assignedCourseCodes ?? [];
      return (
        targetCourses.length === 0 ||
        targetCourses.some((c) => actorCourses.includes(c))
      );
    }
    return false;
  }
  return false;
}

async function tryServerFetch(
  path: string,
  init?: RequestInit
): Promise<{ available: boolean; status: number; data: Record<string, unknown> | null }> {
  if (authTransportMode === 'static') {
    return { available: false, status: 404, data: null };
  }
  try {
    const res = await fetch(path, init);
    const contentType = res.headers.get('content-type') ?? '';
    if (res.status === 404 || !contentType.includes('application/json')) {
      authTransportMode = 'static';
      return { available: false, status: res.status, data: null };
    }
    const data = (await res.json()) as Record<string, unknown>;
    authTransportMode = 'server';
    return { available: true, status: res.status, data };
  } catch {
    if (authTransportMode !== 'server') {
      authTransportMode = 'static';
      return { available: false, status: 0, data: null };
    }
    throw new Error('network_error');
  }
}

export async function getBootstrapStatus(): Promise<{
  mode: 'server' | 'static';
  adminConfigured: boolean;
  requiresBootstrapPasscode: boolean;
  accounts: BootstrapDirectoryEntry[];
}> {
  const serverRes = await tryServerFetch('/api/auth/bootstrap-status');
  if (serverRes.available && serverRes.data) {
    return {
      mode: 'server',
      adminConfigured: Boolean(serverRes.data.adminConfigured),
      requiresBootstrapPasscode: Boolean(serverRes.data.requiresBootstrapPasscode),
      accounts: (serverRes.data.accounts as BootstrapDirectoryEntry[]) ?? [],
    };
  }

  const map = loadStaticAccountsMap();
  const adminAcc = map.get('admin');
  return {
    mode: 'static',
    adminConfigured: Boolean(adminAcc?.passwordHash),
    requiresBootstrapPasscode: false,
    accounts: Array.from(map.values()).map((acc) => ({
      username: acc.username,
      role: acc.role,
      displayName: acc.displayName,
      affiliation: acc.affiliation,
      photoUrl: acc.photoUrl || undefined,
      positionTitle: acc.positionTitle,
      department: acc.department,
      status: acc.status ?? 'ใช้งานปกติ',
      studentId: acc.studentId,
      assignedCourseCodes: acc.assignedCourseCodes,
      hasPasswordSet: Boolean(acc.passwordHash),
    })),
  };
}

export async function setupAdminAccount(
  newPassword: string,
  bootstrapPasscode?: string
): Promise<{ ok: boolean; token?: string; user?: AuthUserProfile; error?: string }> {
  const serverRes = await tryServerFetch('/api/auth/setup-admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      newPassword,
      bootstrapPasscode: bootstrapPasscode || undefined,
    }),
  });
  if (serverRes.available && serverRes.data) {
    const ok =
      serverRes.status >= 200 &&
      serverRes.status < 300 &&
      Boolean(serverRes.data.token && serverRes.data.user);
    return {
      ok,
      token: serverRes.data.token as string | undefined,
      user: serverRes.data.user as AuthUserProfile | undefined,
      error: serverRes.data.error as string | undefined,
    };
  }

  const cleanPassword = newPassword.trim();
  if (cleanPassword.length < 8 || cleanPassword.length > 72) {
    return { ok: false, error: 'รหัสผ่านต้องมีความยาว 8–72 ตัวอักษร' };
  }

  const accounts = loadStaticAccountsMap();
  const adminAcc = accounts.get('admin');
  if (!adminAcc) {
    return { ok: false, error: 'ไม่พบข้อมูลบัญชีผู้ดูแลระบบ' };
  }
  if (adminAcc.passwordHash) {
    return { ok: false, error: 'บัญชีผู้ดูแลระบบถูกตั้งค่าไว้แล้ว กรุณาเข้าสู่ระบบ' };
  }

  const { salt, passwordHash } = await hashPasswordWeb(cleanPassword);
  adminAcc.salt = salt;
  adminAcc.passwordHash = passwordHash;
  adminAcc.mustChangePassword = false;
  saveStaticAccounts(accounts.values());

  return {
    ok: true,
    token: createStaticToken(adminAcc),
    user: toPublicProfile(adminAcc),
  };
}

export async function loginAccount(
  username: string,
  password: string
): Promise<{ ok: boolean; token?: string; user?: AuthUserProfile; error?: string }> {
  const serverRes = await tryServerFetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username.trim(), password }),
  });
  if (serverRes.available && serverRes.data) {
    const ok =
      serverRes.status >= 200 &&
      serverRes.status < 300 &&
      Boolean(serverRes.data.token && serverRes.data.user);
    return {
      ok,
      token: serverRes.data.token as string | undefined,
      user: serverRes.data.user as AuthUserProfile | undefined,
      error: serverRes.data.error as string | undefined,
    };
  }

  const cleanUsername = username.trim().toLowerCase();
  if (!cleanUsername || !password) {
    return { ok: false, error: 'กรุณากรอกชื่อผู้ใช้ (Username) และรหัสผ่าน' };
  }

  const accounts = loadStaticAccountsMap();
  const account = accounts.get(cleanUsername);
  if (!account) {
    return { ok: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
  }
  if (!account.passwordHash || !account.salt) {
    return {
      ok: false,
      error:
        'บัญชีนี้ยังไม่ได้ออกรหัสผ่าน กรุณาติดต่อผู้ดูแลระบบหรือนักวิชาการประจำรายวิชาเพื่อออกรหัสผ่านเริ่มต้น',
    };
  }
  if (account.status === 'ระงับชั่วคราว') {
    return {
      ok: false,
      error: 'บัญชีสมาชิกนี้ถูกระงับการใช้งานชั่วคราว กรุณาติดต่อผู้ดูแลระบบ',
    };
  }
  const valid = await verifyPasswordWeb(password, account.salt, account.passwordHash);
  if (!valid) {
    return { ok: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
  }

  return {
    ok: true,
    token: createStaticToken(account),
    user: toPublicProfile(account),
  };
}

export async function logoutAccount(token: string | null): Promise<void> {
  if (!token) return;
  if (token.startsWith('static.') || authTransportMode === 'static') {
    staticSessions.delete(token);
    return;
  }
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // Ignore transient network errors
  }
}

export async function changeAccountPassword(
  token: string,
  currentPassword: string,
  newPassword: string
): Promise<{ ok: boolean; user?: AuthUserProfile; error?: string }> {
  if (!token.startsWith('static.')) {
    const serverRes = await tryServerFetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (serverRes.available && serverRes.data) {
      const ok =
        serverRes.status >= 200 &&
        serverRes.status < 300 &&
        Boolean(serverRes.data.user);
      return {
        ok,
        user: serverRes.data.user as AuthUserProfile | undefined,
        error: serverRes.data.error as string | undefined,
      };
    }
  }

  const accounts = loadStaticAccountsMap();
  const actor = resolveStaticActor(token, accounts);
  if (!actor || !actor.passwordHash || !actor.salt) {
    return { ok: false, error: 'ไม่ได้เข้าสู่ระบบ' };
  }
  const valid = await verifyPasswordWeb(currentPassword, actor.salt, actor.passwordHash);
  if (!valid) {
    return { ok: false, error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' };
  }
  const cleanNew = newPassword.trim();
  if (cleanNew.length < 8 || cleanNew.length > 72) {
    return { ok: false, error: 'รหัสผ่านใหม่ต้องมีความยาว 8–72 ตัวอักษร' };
  }
  const { salt, passwordHash } = await hashPasswordWeb(cleanNew);
  actor.salt = salt;
  actor.passwordHash = passwordHash;
  actor.mustChangePassword = false;
  saveStaticAccounts(accounts.values());

  return { ok: true, user: toPublicProfile(actor) };
}

export async function getManagedUsers(
  token: string
): Promise<{ ok: boolean; users?: AuthUserProfile[]; error?: string }> {
  if (!token.startsWith('static.')) {
    const serverRes = await tryServerFetch('/api/auth/users', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (serverRes.available && serverRes.data) {
      const ok = serverRes.status >= 200 && serverRes.status < 300;
      return {
        ok,
        users: serverRes.data.users as AuthUserProfile[] | undefined,
        error: serverRes.data.error as string | undefined,
      };
    }
  }

  const accounts = loadStaticAccountsMap();
  const actor = resolveStaticActor(token, accounts);
  if (!actor || (actor.role !== 'admin' && actor.role !== 'course_officer')) {
    return { ok: false, error: 'สิทธิ์ไม่เพียงพอสำหรับการจัดการบัญชีผู้ใช้' };
  }
  const users = Array.from(accounts.values())
    .filter((target) => actor.role === 'admin' || canActorManageTarget(actor, target))
    .map(toPublicProfile);
  return { ok: true, users };
}

export async function issueUserCredential(
  token: string,
  payload: {
    username: string;
    customPassword?: string;
    displayName?: string;
    role?: UserRole;
    affiliation?: string;
  }
): Promise<{
  ok: boolean;
  user?: AuthUserProfile;
  issuedCredentials?: IssuedCredentialSlip;
  error?: string;
}> {
  if (!token.startsWith('static.')) {
    const serverRes = await tryServerFetch('/api/auth/users/issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (serverRes.available && serverRes.data) {
      const ok =
        serverRes.status >= 200 &&
        serverRes.status < 300 &&
        Boolean(serverRes.data.issuedCredentials);
      return {
        ok,
        user: serverRes.data.user as AuthUserProfile | undefined,
        issuedCredentials: serverRes.data.issuedCredentials as
          | IssuedCredentialSlip
          | undefined,
        error: serverRes.data.error as string | undefined,
      };
    }
  }

  const accounts = loadStaticAccountsMap();
  const actor = resolveStaticActor(token, accounts);
  if (!actor || (actor.role !== 'admin' && actor.role !== 'course_officer')) {
    return { ok: false, error: 'สงวนสิทธิ์เฉพาะผู้ดูแลระบบหรือนักวิชาการประจำรายวิชา' };
  }

  const cleanUsername = payload.username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '');
  if (cleanUsername.length < 3 || cleanUsername.length > 40) {
    return {
      ok: false,
      error: 'ชื่อผู้ใช้ต้องเป็นตัวอักษรภาษาอังกฤษ/ตัวเลข 3–40 ตัวอักษร',
    };
  }

  let target = accounts.get(cleanUsername);
  if (!target) {
    const requestedRole: UserRole = payload.role ?? 'student';
    if (
      actor.role === 'course_officer' &&
      (requestedRole === 'admin' || requestedRole === 'course_officer')
    ) {
      return {
        ok: false,
        error: 'นักวิชาการประจำรายวิชาไม่สามารถสร้างบัญชีแอดมินหรือนักวิชาการรายวิชาอื่นได้',
      };
    }
    target = {
      username: cleanUsername,
      role: requestedRole,
      level: roleToLevel(requestedRole),
      displayName: payload.displayName?.trim() || cleanUsername,
      affiliation:
        payload.affiliation?.trim() || 'ศูนย์แพทยศาสตรศึกษาชั้นคลินิก รพ.สุรินทร์',
      assignedCourseCodes:
        actor.role === 'course_officer' ? actor.assignedCourseCodes : undefined,
      mustChangePassword: true,
    };
    accounts.set(cleanUsername, target);
  } else if (!canActorManageTarget(actor, target)) {
    return { ok: false, error: 'ไม่มีสิทธิ์ออกรหัสผ่านให้บัญชีในรายวิชาหรือระดับสิทธิ์นี้' };
  }

  const customPw = payload.customPassword?.trim() || '';
  if (customPw && (customPw.length < 8 || customPw.length > 72)) {
    return { ok: false, error: 'รหัสผ่านที่กำหนดเองต้องมีอย่างน้อย 8 ตัวอักษร' };
  }
  const plainPassword = customPw || generateReadableTemporaryPassword();
  const { salt, passwordHash } = await hashPasswordWeb(plainPassword);
  target.salt = salt;
  target.passwordHash = passwordHash;
  target.mustChangePassword = target.username !== 'admin';
  saveStaticAccounts(accounts.values());

  return {
    ok: true,
    user: toPublicProfile(target),
    issuedCredentials: {
      username: target.username,
      displayName: target.displayName,
      role: target.role,
      affiliation: target.affiliation,
      temporaryPassword: plainPassword,
    },
  };
}

export async function issueBatchUserCredentials(
  token: string,
  targetRole: 'student' | 'faculty' | 'course_officer',
  onlyUnset = true
): Promise<{
  ok: boolean;
  count?: number;
  credentials?: IssuedCredentialSlip[];
  error?: string;
}> {
  if (!token.startsWith('static.')) {
    const serverRes = await tryServerFetch('/api/auth/users/issue-batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ targetRole, onlyUnset }),
    });
    if (serverRes.available && serverRes.data) {
      const ok =
        serverRes.status >= 200 &&
        serverRes.status < 300 &&
        Array.isArray(serverRes.data.credentials);
      return {
        ok,
        count: serverRes.data.count as number | undefined,
        credentials: serverRes.data.credentials as IssuedCredentialSlip[] | undefined,
        error: serverRes.data.error as string | undefined,
      };
    }
  }

  const accounts = loadStaticAccountsMap();
  const actor = resolveStaticActor(token, accounts);
  if (!actor || (actor.role !== 'admin' && actor.role !== 'course_officer')) {
    return { ok: false, error: 'สงวนสิทธิ์เฉพาะผู้ดูแลระบบหรือนักวิชาการประจำรายวิชา' };
  }
  if (actor.role === 'course_officer' && targetRole === 'course_officer') {
    return { ok: false, error: 'เฉพาะแอดมินเท่านั้นที่ออกรหัสผ่านกลุ่มนักวิชาการประจำรายวิชาได้' };
  }

  const credentials: IssuedCredentialSlip[] = [];
  for (const target of accounts.values()) {
    if (target.role !== targetRole) continue;
    if (!canActorManageTarget(actor, target)) continue;
    if (onlyUnset && target.passwordHash) continue;

    const plainPassword = generateReadableTemporaryPassword();
    const { salt, passwordHash } = await hashPasswordWeb(plainPassword);
    target.salt = salt;
    target.passwordHash = passwordHash;
    target.mustChangePassword = true;
    credentials.push({
      username: target.username,
      displayName: target.displayName,
      role: target.role,
      affiliation: target.affiliation,
      temporaryPassword: plainPassword,
    });
  }
  saveStaticAccounts(accounts.values());

  return { ok: true, count: credentials.length, credentials };
}

export async function createMemberAccount(
  token: string,
  payload: {
    username: string;
    customPassword?: string;
    displayName: string;
    role: UserRole;
    affiliation?: string;
    photoUrl?: string;
    positionTitle?: string;
    department?: string;
    phone?: string;
    email?: string;
    licenseOrCode?: string;
    status?: MemberAccountStatus;
    notes?: string;
    studentId?: string;
    assignedCourseCodes?: string[];
  }
): Promise<{
  ok: boolean;
  user?: AuthUserProfile;
  issuedCredentials?: IssuedCredentialSlip;
  error?: string;
}> {
  if (!token.startsWith('static.')) {
    const serverRes = await tryServerFetch('/api/auth/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (serverRes.available && serverRes.data) {
      const ok =
        serverRes.status >= 200 &&
        serverRes.status < 300 &&
        Boolean(serverRes.data.issuedCredentials);
      return {
        ok,
        user: serverRes.data.user as AuthUserProfile | undefined,
        issuedCredentials: serverRes.data.issuedCredentials as
          | IssuedCredentialSlip
          | undefined,
        error: serverRes.data.error as string | undefined,
      };
    }
  }

  const accounts = loadStaticAccountsMap();
  const actor = resolveStaticActor(token, accounts);
  if (!actor || (actor.role !== 'admin' && actor.role !== 'course_officer')) {
    return { ok: false, error: 'สงวนสิทธิ์เฉพาะผู้ดูแลระบบหรือนักวิชาการประจำรายวิชา' };
  }

  const cleanUsername = payload.username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '');
  if (cleanUsername.length < 3 || cleanUsername.length > 40) {
    return {
      ok: false,
      error: 'ชื่อผู้ใช้ต้องเป็นตัวอักษรภาษาอังกฤษ/ตัวเลข 3–40 ตัวอักษร',
    };
  }
  if (accounts.has(cleanUsername)) {
    return { ok: false, error: `ชื่อผู้ใช้ "${cleanUsername}" มีอยู่ในระบบแล้ว` };
  }
  if (
    actor.role === 'course_officer' &&
    (payload.role === 'admin' || payload.role === 'course_officer')
  ) {
    return {
      ok: false,
      error: 'นักวิชาการประจำรายวิชาไม่สามารถสร้างบัญชีแอดมินหรือนักวิชาการรายวิชาอื่นได้',
    };
  }

  const customPw = payload.customPassword?.trim() || '';
  if (customPw && (customPw.length < 8 || customPw.length > 72)) {
    return { ok: false, error: 'รหัสผ่านที่กำหนดเองต้องมีอย่างน้อย 8 ตัวอักษร' };
  }

  const plainPassword = customPw || generateReadableTemporaryPassword();
  const { salt, passwordHash } = await hashPasswordWeb(plainPassword);
  const cleanPhoto = sanitizeAvatarUrlInput(payload.photoUrl);
  const newAcc: StoredStaticAccount = {
    username: cleanUsername,
    role: payload.role,
    level: roleToLevel(payload.role),
    displayName: payload.displayName.trim() || cleanUsername,
    affiliation:
      payload.affiliation?.trim() || 'ศูนย์แพทยศาสตรศึกษาชั้นคลินิก รพ.สุรินทร์',
    photoUrl: cleanPhoto,
    positionTitle: payload.positionTitle?.trim() || undefined,
    department: payload.department?.trim() || undefined,
    phone: payload.phone?.trim() || undefined,
    email: payload.email?.trim() || undefined,
    licenseOrCode: payload.licenseOrCode?.trim() || undefined,
    status: payload.status ?? 'ใช้งานปกติ',
    notes: payload.notes?.trim() || undefined,
    studentId:
      payload.role === 'student' ? payload.studentId?.trim() || undefined : undefined,
    assignedCourseCodes:
      payload.assignedCourseCodes && payload.assignedCourseCodes.length > 0
        ? payload.assignedCourseCodes
        : actor.role === 'course_officer'
          ? actor.assignedCourseCodes
          : undefined,
    salt,
    passwordHash,
    mustChangePassword: payload.role !== 'admin',
  };
  accounts.set(cleanUsername, newAcc);
  saveStaticAccounts(accounts.values());

  return {
    ok: true,
    user: toPublicProfile(newAcc),
    issuedCredentials: {
      username: newAcc.username,
      displayName: newAcc.displayName,
      role: newAcc.role,
      affiliation: newAcc.affiliation,
      temporaryPassword: plainPassword,
    },
  };
}

export async function updateMemberAccount(
  token: string,
  targetUsername: string,
  payload: {
    displayName?: string;
    role?: UserRole;
    affiliation?: string;
    photoUrl?: string;
    positionTitle?: string;
    department?: string;
    phone?: string;
    email?: string;
    licenseOrCode?: string;
    status?: MemberAccountStatus;
    notes?: string;
    studentId?: string;
    assignedCourseCodes?: string[];
    newPassword?: string;
  }
): Promise<{ ok: boolean; user?: AuthUserProfile; error?: string }> {
  if (!token.startsWith('static.')) {
    const serverRes = await tryServerFetch(
      `/api/auth/users/${encodeURIComponent(targetUsername)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );
    if (serverRes.available && serverRes.data) {
      const ok =
        serverRes.status >= 200 &&
        serverRes.status < 300 &&
        Boolean(serverRes.data.user);
      return {
        ok,
        user: serverRes.data.user as AuthUserProfile | undefined,
        error: serverRes.data.error as string | undefined,
      };
    }
  }

  const accounts = loadStaticAccountsMap();
  const actor = resolveStaticActor(token, accounts);
  if (!actor || (actor.role !== 'admin' && actor.role !== 'course_officer')) {
    return { ok: false, error: 'สงวนสิทธิ์เฉพาะผู้ดูแลระบบหรือนักวิชาการประจำรายวิชา' };
  }

  const target = accounts.get(targetUsername.trim().toLowerCase());
  if (!target) {
    return { ok: false, error: 'ไม่พบบัญชีสมาชิกที่ต้องการแก้ไข' };
  }
  if (!canActorManageTarget(actor, target)) {
    return { ok: false, error: 'ไม่มีสิทธิ์แก้ไขบัญชีสมาชิกในระดับหรือรายวิชานี้' };
  }

  if (payload.role && payload.role !== target.role) {
    if (target.username === 'admin' && payload.role !== 'admin') {
      return { ok: false, error: 'ไม่สามารถลดระดับสิทธิ์ของบัญชีผู้ดูแลระบบหลัก (admin) ได้' };
    }
    if (
      actor.role === 'course_officer' &&
      (payload.role === 'admin' || payload.role === 'course_officer')
    ) {
      return {
        ok: false,
        error: 'นักวิชาการประจำรายวิชาไม่สามารถปรับสิทธิ์สมาชิกเป็นแอดมินหรือนักวิชาการได้',
      };
    }
    target.role = payload.role;
    target.level = roleToLevel(payload.role);
  }

  if (payload.displayName?.trim()) {
    target.displayName = payload.displayName.trim().slice(0, 120);
  }
  if (payload.affiliation?.trim()) {
    target.affiliation = payload.affiliation.trim().slice(0, 160);
  }
  if (payload.photoUrl !== undefined) {
    const trimmed = payload.photoUrl.trim();
    if (!trimmed) {
      target.photoUrl = '';
    } else {
      const cleaned = sanitizeAvatarUrlInput(trimmed);
      if (cleaned) {
        target.photoUrl = cleaned;
      }
    }
  }
  if (payload.positionTitle !== undefined) {
    target.positionTitle = payload.positionTitle.trim().slice(0, 120) || undefined;
  }
  if (payload.department !== undefined) {
    target.department = payload.department.trim().slice(0, 120) || undefined;
  }
  if (payload.phone !== undefined) {
    target.phone = payload.phone.trim().slice(0, 60) || undefined;
  }
  if (payload.email !== undefined) {
    target.email = payload.email.trim().slice(0, 120) || undefined;
  }
  if (payload.licenseOrCode !== undefined) {
    target.licenseOrCode = payload.licenseOrCode.trim().slice(0, 60) || undefined;
  }
  if (payload.status !== undefined) {
    if (target.username === actor.username && payload.status === 'ระงับชั่วคราว') {
      return { ok: false, error: 'ไม่สามารถระงับบัญชีของตนเองที่กำลังใช้งานอยู่ได้' };
    }
    target.status = payload.status;
  }
  if (payload.notes !== undefined) {
    target.notes = payload.notes.trim().slice(0, 400) || undefined;
  }
  if (payload.studentId !== undefined) {
    target.studentId = payload.studentId.trim() || undefined;
  }
  if (payload.assignedCourseCodes !== undefined) {
    target.assignedCourseCodes =
      payload.assignedCourseCodes.length > 0
        ? payload.assignedCourseCodes
        : undefined;
  }
  if (payload.newPassword?.trim()) {
    const cleanNew = payload.newPassword.trim();
    if (cleanNew.length < 8 || cleanNew.length > 72) {
      return { ok: false, error: 'รหัสผ่านใหม่ต้องมีความยาว 8–72 ตัวอักษร' };
    }
    const { salt, passwordHash } = await hashPasswordWeb(cleanNew);
    target.salt = salt;
    target.passwordHash = passwordHash;
    target.mustChangePassword = target.username !== 'admin';
  }

  saveStaticAccounts(accounts.values());
  return { ok: true, user: toPublicProfile(target) };
}

export async function deleteMemberAccount(
  token: string,
  targetUsername: string
): Promise<{ ok: boolean; error?: string }> {
  if (!token.startsWith('static.')) {
    const serverRes = await tryServerFetch(
      `/api/auth/users/${encodeURIComponent(targetUsername)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (serverRes.available && serverRes.data) {
      const ok = serverRes.status >= 200 && serverRes.status < 300;
      return {
        ok,
        error: serverRes.data.error as string | undefined,
      };
    }
  }

  const accounts = loadStaticAccountsMap();
  const actor = resolveStaticActor(token, accounts);
  if (!actor || (actor.role !== 'admin' && actor.role !== 'course_officer')) {
    return { ok: false, error: 'สงวนสิทธิ์เฉพาะผู้ดูแลระบบหรือนักวิชาการประจำรายวิชา' };
  }

  const key = targetUsername.trim().toLowerCase();
  if (key === 'admin' || key === actor.username) {
    return { ok: false, error: 'ไม่สามารถลบบัญชีผู้ดูแลระบบหลักหรือบัญชีที่กำลังใช้งานอยู่ได้' };
  }
  const target = accounts.get(key);
  if (!target) {
    return { ok: false, error: 'ไม่พบบัญชีสมาชิกที่ต้องการลบ' };
  }
  if (!canActorManageTarget(actor, target)) {
    return { ok: false, error: 'ไม่มีสิทธิ์ลบบัญชีสมาชิกในระดับหรือรายวิชานี้' };
  }

  accounts.delete(key);
  saveStaticAccounts(accounts.values());
  return { ok: true };
}
