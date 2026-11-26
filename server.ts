import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { GoogleGenAI } from '@google/genai';

type UserRole = 'student' | 'faculty' | 'course_officer' | 'admin';
type RoleAccessLevel = 1 | 2 | 3;

interface AccountRecord {
  username: string;
  role: UserRole;
  level: RoleAccessLevel;
  displayName: string;
  affiliation: string;
  studentId?: string;
  assignedCourseCodes?: string[];
  salt?: string;
  passwordHash?: string;
  mustChangePassword: boolean;
}

interface PublicAccountSummary {
  username: string;
  role: UserRole;
  level: RoleAccessLevel;
  displayName: string;
  affiliation: string;
  studentId?: string;
  assignedCourseCodes?: string[];
  hasPasswordSet: boolean;
  mustChangePassword: boolean;
}

interface TokenPayload {
  sub: string;
  role: UserRole;
  iat: number;
  exp: number;
}

interface AuthenticatedRequest extends Request {
  authUser?: AccountRecord;
  bearerToken?: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const SESSION_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length >= 16
    ? process.env.SESSION_SECRET.trim()
    : crypto.randomBytes(32).toString('hex');

const ADMIN_BOOTSTRAP_PASSCODE = process.env.ADMIN_BOOTSTRAP_PASSCODE?.trim() || '';
const DEFAULT_GOOGLE_SHEETS_ID =
  process.env.GOOGLE_SHEETS_ID?.trim() || '1iwYYWj_IRqdf9IcXzBtoprQgjvEE6w2ghmBSyiHo9LE';
const DEFAULT_GOOGLE_APPS_SCRIPT_URL =
  process.env.GOOGLE_APPS_SCRIPT_URL?.trim() ||
  'https://script.google.com/macros/s/AKfycbxkVZe7xTSq3_p3FLBfNJ2otMUvBTn2GfApLbLtiqMKGxYc2r8KvFwdmD7BTmqp5xVbLw/exec';
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

const revokedTokens = new Set<string>();

function hashPassword(password: string, existingSalt?: string): { salt: string; passwordHash: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, passwordHash: derived };
}

function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(storedHash, 'hex');
  if (derived.length !== storedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(derived, storedBuf);
}

function generateReadableTemporaryPassword(): string {
  const digits = String(crypto.randomInt(1000, 9999));
  const suffixChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const c1 = suffixChars[crypto.randomInt(0, suffixChars.length)];
  const c2 = suffixChars[crypto.randomInt(0, suffixChars.length)];
  return `Surin-${digits}${c1}${c2}`;
}

function signToken(account: AccountRecord): string {
  const payload: TokenPayload = {
    sub: account.username,
    role: account.role,
    iat: Date.now(),
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyToken(token: string): TokenPayload | null {
  if (!token || revokedTokens.has(token)) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(sig, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as TokenPayload;
    if (!parsed.sub || typeof parsed.exp !== 'number' || parsed.exp < Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function toPublicSummary(acc: AccountRecord): PublicAccountSummary {
  return {
    username: acc.username,
    role: acc.role,
    level: acc.level,
    displayName: acc.displayName,
    affiliation: acc.affiliation,
    studentId: acc.studentId,
    assignedCourseCodes: acc.assignedCourseCodes,
    hasPasswordSet: Boolean(acc.passwordHash && acc.salt),
    mustChangePassword: acc.mustChangePassword,
  };
}

function buildInitialAccounts(): Map<string, AccountRecord> {
  const accounts = new Map<string, AccountRecord>();

  const seedList: Omit<AccountRecord, 'mustChangePassword'>[] = [
    {
      username: 'admin',
      role: 'admin',
      level: 3,
      displayName: 'ประธานคณะกรรมการบริหารหลักสูตรและฝ่ายวิชาการ',
      affiliation: 'สำนักงานศูนย์แพทยศาสตรศึกษาชั้นคลินิก รพ.สุรินทร์',
    },
    // Per-Course Academic Officers (นักวิชาการประจำรายวิชา)
    {
      username: 'off_ped',
      role: 'course_officer',
      level: 3,
      displayName: 'นางสาวณัฐริกา ใจซื่อ (นักวิชาการรายวิชา กุมารฯ)',
      affiliation: 'กลุ่มงานกุมารเวชศาสตร์ (SUR-PED-502)',
      assignedCourseCodes: ['SUR-PED-502'],
    },
    {
      username: 'off_med',
      role: 'course_officer',
      level: 3,
      displayName: 'นายธีระวัฒน์ สุริยา (นักวิชาการรายวิชา อายุรฯ)',
      affiliation: 'กลุ่มงานอายุรศาสตร์ (SUR-MED-401)',
      assignedCourseCodes: ['SUR-MED-401'],
    },
    {
      username: 'off_surg',
      role: 'course_officer',
      level: 3,
      displayName: 'นางสาวศศิวิมล พูลสุข (นักวิชาการรายวิชา ศัลยฯ)',
      affiliation: 'กลุ่มงานศัลยศาสตร์ (SUR-SURG-402)',
      assignedCourseCodes: ['SUR-SURG-402'],
    },
    {
      username: 'off_obg',
      role: 'course_officer',
      level: 3,
      displayName: 'นางสาวปิยะพร จันทร์งาม (นักวิชาการรายวิชา สูติฯ)',
      affiliation: 'กลุ่มงานสูติศาสตร์-นรีเวชวิทยา (SUR-OBG-501)',
      assignedCourseCodes: ['SUR-OBG-501'],
    },
    // Faculty Physicians
    {
      username: 'dr_pinyada',
      role: 'faculty',
      level: 2,
      displayName: 'อ.ภิญญดา แก้วปลั่ง',
      affiliation: 'อาจารย์แพทย์ กลุ่มงานกุมารเวชศาสตร์',
      assignedCourseCodes: ['SUR-PED-502'],
    },
    {
      username: 'dr_napassorn',
      role: 'faculty',
      level: 2,
      displayName: 'พญ. นภัสสร สุขเจริญ',
      affiliation: 'หัวหน้ากลุ่มงานกุมารเวชศาสตร์',
      assignedCourseCodes: ['SUR-PED-502'],
    },
    {
      username: 'dr_ekarat',
      role: 'faculty',
      level: 2,
      displayName: 'นพ. เอกรัตน์ วัฒนสุรินทร์',
      affiliation: 'หัวหน้ากลุ่มงานอายุรศาสตร์',
      assignedCourseCodes: ['SUR-MED-401'],
    },
    {
      username: 'dr_kittipong',
      role: 'faculty',
      level: 2,
      displayName: 'นพ. กิตติพงษ์ จันทรา',
      affiliation: 'หัวหน้ากลุ่มงานศัลยศาสตร์',
      assignedCourseCodes: ['SUR-SURG-402'],
    },
    {
      username: 'dr_siriporn',
      role: 'faculty',
      level: 2,
      displayName: 'พญ. ศิริพร วงศ์สุวรรณ',
      affiliation: 'หัวหน้ากลุ่มงานสูติศาสตร์-นรีเวชวิทยา',
      assignedCourseCodes: ['SUR-OBG-501'],
    },
    {
      username: 'dr_phuritat',
      role: 'faculty',
      level: 2,
      displayName: 'นพ. ภูริทัต ศรีสวัสดิ์',
      affiliation: 'หัวหน้ากลุ่มงานเวชศาสตร์ฉุกเฉิน',
      assignedCourseCodes: ['SUR-MED-401', 'SUR-SURG-402'],
    },
  ];

  const students: [string, string, string, string][] = [
    ['66104011', 'นศพ. กิตติคุณ แสงสุริยา', '4', 'กลุ่ม A'],
    ['66104015', 'นศพ. ชนิกานต์ วงศ์ทอง', '4', 'กลุ่ม A'],
    ['66104019', 'นศพ. พงศกร ศรีชัย', '4', 'กลุ่ม A'],
    ['66104024', 'นศพ. วริศรา รัตนกุล', '4', 'กลุ่ม B'],
    ['66104028', 'นศพ. อภิสิทธิ์ บุญทวี', '4', 'กลุ่ม B'],
    ['66104032', 'นศพ. ณัฐพล แก้วมณี', '4', 'กลุ่ม C'],
    ['66104036', 'นศพ. ภัทรวดี สุวรรณชัย', '4', 'กลุ่ม C'],
    ['65104102', 'นศพ. กวินทัต สุขสมบูรณ์', '5', 'กลุ่ม A'],
    ['65104105', 'นศพ. ณิชาภัทร เจริญศรี', '5', 'กลุ่ม A'],
    ['65104127', 'นศพ. ธีรภัทร บุญเรือง', '5', 'กลุ่ม A'],
    ['65104131', 'นศพ. ปวริศร์ ทองดี', '5', 'กลุ่ม A'],
    ['65104109', 'นศพ. กชพร สุขสม', '5', 'กลุ่ม B'],
    ['65104114', 'นศพ. พิชญา วงศ์สุรินทร์', '5', 'กลุ่ม B'],
    ['65104118', 'นศพ. ศุภกร มั่นคง', '5', 'กลุ่ม B'],
    ['65104122', 'นศพ. อรปรียา แก้วใส', '5', 'กลุ่ม B'],
    ['65104135', 'นศพ. จิรวัฒน์ พรมมา', '5', 'กลุ่ม C'],
    ['65104139', 'นศพ. ชุติมณฑน์ ใจตรง', '5', 'กลุ่ม C'],
    ['64104218', 'นศพ. ธนภัทร ศรีสุรินทร์', '6', 'กลุ่ม A'],
    ['64104221', 'นศพ. พิมพ์ชนก รักชาติ', '6', 'กลุ่ม A'],
    ['64104225', 'นศพ. ภานุพงศ์ ชาญชัย', '6', 'กลุ่ม A'],
    ['64104230', 'นศพ. รัชชานนท์ ทองคำ', '6', 'กลุ่ม B'],
    ['64104234', 'นศพ. สิริยากร แสงแก้ว', '6', 'กลุ่ม B'],
    ['64104241', 'นศพ. เอกชัย ชื่นชม', '6', 'กลุ่ม C'],
  ];

  for (const item of seedList) {
    accounts.set(item.username, { ...item, mustChangePassword: false });
  }

  for (const [studentId, studentName, yearLevel, group] of students) {
    const username = `std_${studentId}`;
    accounts.set(username, {
      username,
      role: 'student',
      level: 1,
      displayName: studentName,
      affiliation: `ชั้นปีที่ ${yearLevel} (${group}) · รหัส ${studentId}`,
      studentId,
      mustChangePassword: true,
    });
  }

  return accounts;
}

const accountStore = buildInitialAccounts();

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' });
    return;
  }
  const token = header.slice('Bearer '.length).trim();
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'เซสชันหมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่' });
    return;
  }
  const account = accountStore.get(payload.sub);
  if (!account) {
    res.status(401).json({ error: 'ไม่พบบัญชีผู้ใช้งานในระบบ' });
    return;
  }
  req.authUser = account;
  req.bearerToken = token;
  next();
}

function canActorManageTarget(actor: AccountRecord, target: AccountRecord): boolean {
  if (actor.role === 'admin') {
    return true;
  }
  if (actor.role === 'course_officer') {
    if (target.role === 'student') return true;
    if (target.role === 'faculty') {
      const actorCourses = actor.assignedCourseCodes ?? [];
      const targetCourses = target.assignedCourseCodes ?? [];
      return targetCourses.length === 0 || targetCourses.some((c) => actorCourses.includes(c));
    }
    return false;
  }
  return false;
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/auth/bootstrap-status', (_req: Request, res: Response) => {
    const adminAcc = accountStore.get('admin');
    const adminConfigured = Boolean(adminAcc?.passwordHash);
    const publicDirectory = Array.from(accountStore.values()).map((acc) => ({
      username: acc.username,
      role: acc.role,
      displayName: acc.displayName,
      affiliation: acc.affiliation,
      studentId: acc.studentId,
      assignedCourseCodes: acc.assignedCourseCodes,
      hasPasswordSet: Boolean(acc.passwordHash),
    }));
    res.json({
      adminConfigured,
      requiresBootstrapPasscode: Boolean(ADMIN_BOOTSTRAP_PASSCODE),
      accounts: publicDirectory,
    });
  });

  app.post('/api/auth/setup-admin', (req: Request, res: Response) => {
    const adminAcc = accountStore.get('admin');
    if (!adminAcc) {
      res.status(500).json({ error: 'ไม่พบข้อมูลบัญชีผู้ดูแลระบบ' });
      return;
    }
    if (adminAcc.passwordHash) {
      res.status(409).json({ error: 'บัญชีผู้ดูแลระบบถูกตั้งค่าไว้แล้ว กรุณาเข้าสู่ระบบ' });
      return;
    }

    const body = req.body as { newPassword?: unknown; bootstrapPasscode?: unknown };
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword.trim() : '';
    const bootstrapPasscode =
      typeof body.bootstrapPasscode === 'string' ? body.bootstrapPasscode.trim() : '';

    if (ADMIN_BOOTSTRAP_PASSCODE) {
      const a = Buffer.from(bootstrapPasscode, 'utf8');
      const b = Buffer.from(ADMIN_BOOTSTRAP_PASSCODE, 'utf8');
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        res.status(403).json({ error: 'รหัสยืนยันเริ่มต้นไม่ถูกต้อง' });
        return;
      }
    }

    if (newPassword.length < 8 || newPassword.length > 72) {
      res.status(400).json({ error: 'รหัสผ่านต้องมีความยาว 8–72 ตัวอักษร' });
      return;
    }

    const { salt, passwordHash } = hashPassword(newPassword);
    adminAcc.salt = salt;
    adminAcc.passwordHash = passwordHash;
    adminAcc.mustChangePassword = false;

    const token = signToken(adminAcc);
    res.json({
      token,
      user: toPublicSummary(adminAcc),
    });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const body = req.body as { username?: unknown; password?: unknown };
    const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!username || !password) {
      res.status(400).json({ error: 'กรุณากรอกชื่อผู้ใช้ (Username) และรหัสผ่าน' });
      return;
    }

    const account = accountStore.get(username);
    if (!account) {
      res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
      return;
    }

    if (!account.passwordHash || !account.salt) {
      res.status(401).json({
        error:
          'บัญชีนี้ยังไม่ได้ออกรหัสผ่าน กรุณาติดต่อผู้ดูแลระบบหรือนักวิชาการประจำรายวิชาเพื่อออกรหัสผ่านเริ่มต้น',
      });
      return;
    }

    const valid = verifyPassword(password, account.salt, account.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
      return;
    }

    const token = signToken(account);
    res.json({
      token,
      user: toPublicSummary(account),
    });
  });

  app.post('/api/auth/logout', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    if (req.bearerToken) {
      revokedTokens.add(req.bearerToken);
    }
    res.json({ ok: true });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    if (!req.authUser) {
      res.status(401).json({ error: 'ไม่ได้เข้าสู่ระบบ' });
      return;
    }
    res.json({ user: toPublicSummary(req.authUser) });
  });

  app.post('/api/auth/change-password', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const actor = req.authUser;
    if (!actor || !actor.passwordHash || !actor.salt) {
      res.status(401).json({ error: 'ไม่ได้เข้าสู่ระบบ' });
      return;
    }
    const body = req.body as { currentPassword?: unknown; newPassword?: unknown };
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword.trim() : '';

    if (!verifyPassword(currentPassword, actor.salt, actor.passwordHash)) {
      res.status(403).json({ error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
      return;
    }
    if (newPassword.length < 8 || newPassword.length > 72) {
      res.status(400).json({ error: 'รหัสผ่านใหม่ต้องมีความยาว 8–72 ตัวอักษร' });
      return;
    }

    const { salt, passwordHash } = hashPassword(newPassword);
    actor.salt = salt;
    actor.passwordHash = passwordHash;
    actor.mustChangePassword = false;

    res.json({ user: toPublicSummary(actor) });
  });

  app.get('/api/auth/users', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const actor = req.authUser;
    if (!actor || (actor.role !== 'admin' && actor.role !== 'course_officer')) {
      res.status(403).json({ error: 'สิทธิ์ไม่เพียงพอสำหรับการจัดการบัญชีผู้ใช้' });
      return;
    }

    const users = Array.from(accountStore.values())
      .filter((target) => actor.role === 'admin' || canActorManageTarget(actor, target))
      .map(toPublicSummary);

    res.json({ users });
  });

  app.post('/api/auth/users/issue', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const actor = req.authUser;
    if (!actor || (actor.role !== 'admin' && actor.role !== 'course_officer')) {
      res.status(403).json({ error: 'สงวนสิทธิ์เฉพาะผู้ดูแลระบบหรือนักวิชาการประจำรายวิชา' });
      return;
    }

    const body = req.body as {
      username?: unknown;
      customPassword?: unknown;
      displayName?: unknown;
      role?: unknown;
      affiliation?: unknown;
      studentId?: unknown;
      assignedCourseCodes?: unknown;
    };

    const username =
      typeof body.username === 'string'
        ? body.username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '')
        : '';
    if (username.length < 3 || username.length > 40) {
      res.status(400).json({ error: 'ชื่อผู้ใช้ต้องเป็นตัวอักษรภาษาอังกฤษ/ตัวเลข 3–40 ตัวอักษร' });
      return;
    }

    let target = accountStore.get(username);
    if (!target) {
      const requestedRole: UserRole =
        body.role === 'student' ||
        body.role === 'faculty' ||
        body.role === 'course_officer' ||
        body.role === 'admin'
          ? body.role
          : 'student';

      if (actor.role === 'course_officer' && (requestedRole === 'admin' || requestedRole === 'course_officer')) {
        res.status(403).json({ error: 'นักวิชาการประจำรายวิชาไม่สามารถสร้างบัญชีแอดมินหรือนักวิชาการรายวิชาอื่นได้' });
        return;
      }

      const displayName =
        typeof body.displayName === 'string' && body.displayName.trim()
          ? body.displayName.trim().slice(0, 120)
          : username;
      const affiliation =
        typeof body.affiliation === 'string' && body.affiliation.trim()
          ? body.affiliation.trim().slice(0, 160)
          : 'ศูนย์แพทยศาสตรศึกษาชั้นคลินิก รพ.สุรินทร์';
      const studentId =
        typeof body.studentId === 'string' && body.studentId.trim()
          ? body.studentId.trim().slice(0, 20)
          : undefined;
      const assignedCourseCodes = Array.isArray(body.assignedCourseCodes)
        ? body.assignedCourseCodes.filter((c): c is string => typeof c === 'string')
        : undefined;

      target = {
        username,
        role: requestedRole,
        level: requestedRole === 'student' ? 1 : requestedRole === 'faculty' ? 2 : 3,
        displayName,
        affiliation,
        studentId,
        assignedCourseCodes:
          actor.role === 'course_officer' && requestedRole === 'faculty'
            ? actor.assignedCourseCodes
            : assignedCourseCodes,
        mustChangePassword: true,
      };
      accountStore.set(username, target);
    } else if (!canActorManageTarget(actor, target)) {
      res.status(403).json({ error: 'ไม่มีสิทธิ์ออกรหัสผ่านให้บัญชีผู้ใช้นี้' });
      return;
    }

    const customPassword = typeof body.customPassword === 'string' ? body.customPassword.trim() : '';
    if (customPassword && (customPassword.length < 8 || customPassword.length > 72)) {
      res.status(400).json({ error: 'รหัสผ่านที่กำหนดเองต้องมีอย่างน้อย 8 ตัวอักษร' });
      return;
    }

    const issuedPassword = customPassword || generateReadableTemporaryPassword();
    const { salt, passwordHash } = hashPassword(issuedPassword);
    target.salt = salt;
    target.passwordHash = passwordHash;
    target.mustChangePassword = true;

    res.json({
      user: toPublicSummary(target),
      issuedCredentials: {
        username: target.username,
        displayName: target.displayName,
        role: target.role,
        temporaryPassword: issuedPassword,
      },
    });
  });

  app.post('/api/auth/users/issue-batch', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const actor = req.authUser;
    if (!actor || (actor.role !== 'admin' && actor.role !== 'course_officer')) {
      res.status(403).json({ error: 'สงวนสิทธิ์เฉพาะผู้ดูแลระบบหรือนักวิชาการประจำรายวิชา' });
      return;
    }

    const body = req.body as { targetRole?: unknown; onlyUnset?: unknown };
    const targetRole =
      body.targetRole === 'student' ||
      body.targetRole === 'faculty' ||
      body.targetRole === 'course_officer'
        ? body.targetRole
        : 'student';
    const onlyUnset = Boolean(body.onlyUnset);

    if (actor.role === 'course_officer' && targetRole === 'course_officer') {
      res.status(403).json({ error: 'นักวิชาการประจำรายวิชาไม่สามารถออกรหัสผ่านให้กลุ่มนักวิชาการได้' });
      return;
    }

    const issuedList: {
      username: string;
      displayName: string;
      role: UserRole;
      affiliation: string;
      temporaryPassword: string;
    }[] = [];

    for (const acc of accountStore.values()) {
      if (acc.role !== targetRole) continue;
      if (!canActorManageTarget(actor, acc)) continue;
      if (onlyUnset && acc.passwordHash) continue;

      const tempPass = generateReadableTemporaryPassword();
      const { salt, passwordHash } = hashPassword(tempPass);
      acc.salt = salt;
      acc.passwordHash = passwordHash;
      acc.mustChangePassword = true;

      issuedList.push({
        username: acc.username,
        displayName: acc.displayName,
        role: acc.role,
        affiliation: acc.affiliation,
        temporaryPassword: tempPass,
      });
    }

    res.json({
      count: issuedList.length,
      credentials: issuedList,
    });
  });

  const DIGEST_CACHE_TTL_MS = 15 * 60 * 1000;
  interface CachedDigest {
    expiresAt: number;
    payload: {
      department: string;
      focusTopic?: string;
      digestTitle: string;
      summaryPoints: string[];
      bedsideTakeaways: string[];
      guidelineReferences: string[];
      rawMarkdown: string;
      sources: { title: string; uri: string; hostname: string }[];
      searchQueries: string[];
      generatedAt: string;
      model: string;
    };
  }
  const digestCache = new Map<string, CachedDigest>();

  const DEPARTMENT_EN_HINTS: Record<string, string> = {
    กลุ่มงานอายุรศาสตร์: 'Internal Medicine (Sepsis, Heart Failure, Diabetes, CKD, Stroke)',
    กลุ่มงานศัลยศาสตร์: 'General Surgery & Trauma (ATLS, Acute Abdomen, Perioperative Care)',
    กลุ่มงานกุมารเวชศาสตร์: 'Pediatrics (Pediatric Sepsis, Dengue, Bronchiolitis, Fluid Therapy)',
    'กลุ่มงานสูติศาสตร์-นรีเวชวิทยา': 'Obstetrics and Gynecology (Preeclampsia, Postpartum Hemorrhage, Labor)',
    กลุ่มงานออร์โธปิดิกส์: 'Orthopedics (Open Fracture, Hip Fracture, Compartment Syndrome)',
    กลุ่มงานเวชศาสตร์ฉุกเฉิน: 'Emergency Medicine (ACLS 2025, Sepsis Hour-1 Bundle, Acute Stroke, STEMI)',
    กลุ่มงานจิตเวชศาสตร์: 'Psychiatry (Major Depressive Disorder, Suicide Risk, Delirium)',
    'กลุ่มงานเวชศาสตร์ครอบครัวและชุมชน': 'Family & Community Medicine (Hypertension, Diabetes, Primary Care Screening)',
    กลุ่มงานจักษุวิทยา: 'Ophthalmology (Acute Angle-Closure Glaucoma, Diabetic Retinopathy, Red Eye)',
    'กลุ่มงานโสต ศอ นาสิก': 'Otolaryngology / ENT (Epistaxis, Deep Neck Infection, Acute Otitis Media)',
    กลุ่มงานวิสัญญีวิทยา: 'Anesthesiology (Airway Management, Perioperative Fasting, Pain Management)',
    กลุ่มงานรังสีวิทยา: 'Radiology (Chest X-Ray, CT Brain Stroke, Contrast Safety Guidelines)',
  };

  function sanitizeHttpUrl(rawUri: unknown): { uri: string; hostname: string } | null {
    if (typeof rawUri !== 'string' || !rawUri.trim()) return null;
    try {
      const parsed = new URL(rawUri.trim());
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
      return { uri: parsed.toString(), hostname: parsed.hostname.replace(/^www\./, '') };
    } catch {
      return null;
    }
  }

  function parseDigestSections(rawText: string, department: string): {
    digestTitle: string;
    summaryPoints: string[];
    bedsideTakeaways: string[];
    guidelineReferences: string[];
  } {
    const lines = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    let digestTitle = `สรุปแนวทางเวชปฏิบัติและอัปเดตทางคลินิก: ${department}`;
    const summaryPoints: string[] = [];
    const bedsideTakeaways: string[] = [];
    const guidelineReferences: string[] = [];

    let section: 'title' | 'updates' | 'bedside' | 'refs' = 'updates';

    for (const line of lines) {
      const clean = line.replace(/^#+\s*/, '').trim();
      if (clean.startsWith('TITLE:')) {
        digestTitle = clean.replace(/^TITLE:\s*/, '').trim() || digestTitle;
        continue;
      }
      if (
        clean.startsWith('UPDATES:') ||
        clean.includes('แนวทางเวชปฏิบัติล่าสุด') ||
        clean.includes('Guideline Updates')
      ) {
        section = 'updates';
        continue;
      }
      if (
        clean.startsWith('BEDSIDE:') ||
        clean.includes('การนำไปใช้ข้างเตียง') ||
        clean.includes('Bedside Takeaways')
      ) {
        section = 'bedside';
        continue;
      }
      if (
        clean.startsWith('REFERENCES:') ||
        clean.includes('เอกสารและแนวทางอ้างอิง') ||
        clean.includes('Guideline References')
      ) {
        section = 'refs';
        continue;
      }

      const bulletText = clean.replace(/^[-*•\d.)]+\s*/, '').trim();
      if (!bulletText) continue;

      if (section === 'updates') summaryPoints.push(bulletText);
      else if (section === 'bedside') bedsideTakeaways.push(bulletText);
      else if (section === 'refs') guidelineReferences.push(bulletText);
    }

    return {
      digestTitle,
      summaryPoints: summaryPoints.slice(0, 6),
      bedsideTakeaways: bedsideTakeaways.slice(0, 5),
      guidelineReferences: guidelineReferences.slice(0, 5),
    };
  }

  app.post('/api/medical-digest', async (req: Request, res: Response) => {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      res.status(503).json({
        error:
          'ยังไม่ได้ตั้งค่า GEMINI_API_KEY ใน Settings > Secrets กรุณาเพิ่ม API Key เพื่อดึงสรุปแนวทางเวชปฏิบัติล่าสุดผ่าน Google Search Grounding',
      });
      return;
    }

    const body = req.body as {
      department?: unknown;
      focusTopic?: unknown;
      forceRefresh?: unknown;
    };

    const rawDept =
      typeof body.department === 'string' && body.department.trim()
        ? body.department.trim().slice(0, 120)
        : 'กลุ่มงานอายุรศาสตร์';
    const focusTopic =
      typeof body.focusTopic === 'string' && body.focusTopic.trim()
        ? body.focusTopic.trim().slice(0, 160)
        : '';
    const forceRefresh = Boolean(body.forceRefresh);

    const cacheKey = `${rawDept}::${focusTopic.toLowerCase()}`;
    const cached = digestCache.get(cacheKey);
    if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
      res.json(cached.payload);
      return;
    }

    const englishHint = DEPARTMENT_EN_HINTS[rawDept] ?? rawDept;
    const topicClause = focusTopic
      ? `โดยเน้นหัวข้อเฉพาะทางคลินิก: "${focusTopic}"`
      : 'โดยคัดเลือกแนวทางเวชปฏิบัติที่สำคัญและอัปเดตล่าสุด (ปี 2024–2026) ที่นักศึกษาแพทย์ชั้นปีที่ 4–6 และ Extern ใช้บ่อยในหอผู้ป่วยและห้องฉุกเฉิน';

    const prompt = [
      `คุณคืออาจารย์แพทย์ผู้เชี่ยวชาญประจำศูนย์แพทยศาสตรศึกษาชั้นคลินิก โรงพยาบาลสุรินทร์`,
      `จงค้นหาข้อมูลล่าสุดจากแหล่งการแพทย์ที่น่าเชื่อถือ (เช่น WHO, AHA/ACC, ESC, IDSA, KDIGO, GOLD, AAP, ACOG, NICE, ราชวิทยาลัยแพทย์แห่งประเทศไทย หรือกรมการแพทย์) สำหรับ ${rawDept} (${englishHint})`,
      topicClause,
      `กรุณาสรุปเป็นภาษาไทยที่กระชับ ชัดเจน เหมาะสำหรับนักศึกษาแพทย์และ Extern โดยจัดรูปแบบคำตอบตามหัวข้อต่อไปนี้เท่านั้น:`,
      `TITLE: <หัวข้อสรุปประจำวันสั้นๆ ที่สื่อสาระสำคัญ>`,
      `UPDATES:`,
      `- <ประเด็นอัปเดตแนวทางเวชปฏิบัติล่าสุด 1 พร้อมระบุปีและเกณฑ์/ตัวเลขสำคัญ>`,
      `- <ประเด็นอัปเดตแนวทางเวชปฏิบัติล่าสุด 2 พร้อมระบุปีและเกณฑ์/ตัวเลขสำคัญ>`,
      `- <ประเด็นอัปเดตแนวทางเวชปฏิบัติล่าสุด 3 พร้อมระบุปีและเกณฑ์/ตัวเลขสำคัญ>`,
      `BEDSIDE:`,
      `- <ข้อแนะนำการนำไปปฏิบัติข้างเตียงหรือในการสอบ OSCE สำหรับนักศึกษาแพทย์ 1>`,
      `- <ข้อแนะนำการนำไปปฏิบัติข้างเตียงหรือในการสอบ OSCE สำหรับนักศึกษาแพทย์ 2>`,
      `REFERENCES:`,
      `- <ชื่อแนวทางเวชปฏิบัติ / องค์กร / ปี ที่อ้างอิง 1>`,
      `- <ชื่อแนวทางเวชปฏิบัติ / องค์กร / ปี ที่อ้างอิง 2>`,
    ].join('\n');

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const rawMarkdown = (response.text ?? '').trim();
      if (!rawMarkdown) {
        res.status(502).json({
          error: 'ไม่สามารถสร้างสรุปข้อมูลทางการแพทย์ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง',
        });
        return;
      }

      const metadata = response.candidates?.[0]?.groundingMetadata;
      const rawChunks = metadata?.groundingChunks ?? [];
      const seenUris = new Set<string>();
      const sources: { title: string; uri: string; hostname: string }[] = [];

      for (const chunk of rawChunks) {
        const web = chunk.web;
        if (!web) continue;
        const safe = sanitizeHttpUrl(web.uri);
        if (!safe || seenUris.has(safe.uri)) continue;
        seenUris.add(safe.uri);
        sources.push({
          title:
            typeof web.title === 'string' && web.title.trim()
              ? web.title.trim()
              : safe.hostname,
          uri: safe.uri,
          hostname: safe.hostname,
        });
      }

      const searchQueries = Array.isArray(metadata?.webSearchQueries)
        ? metadata.webSearchQueries.filter(
            (q): q is string => typeof q === 'string' && q.trim().length > 0
          )
        : [];

      const parsed = parseDigestSections(rawMarkdown, rawDept);
      const now = new Date();
      const generatedAt = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')} น.`;

      const payload = {
        department: rawDept,
        ...(focusTopic ? { focusTopic } : {}),
        digestTitle: parsed.digestTitle,
        summaryPoints: parsed.summaryPoints,
        bedsideTakeaways: parsed.bedsideTakeaways,
        guidelineReferences: parsed.guidelineReferences,
        rawMarkdown,
        sources: sources.slice(0, 8),
        searchQueries: searchQueries.slice(0, 4),
        generatedAt,
        model: 'gemini-4-hydrogen',
      };

      digestCache.set(cacheKey, {
        expiresAt: Date.now() + DIGEST_CACHE_TTL_MS,
        payload,
      });

      res.json(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status =
        message.includes('403') || message.includes('PERMISSION_DENIED')
          ? 403
          : message.includes('429') || message.includes('RESOURCE_EXHAUSTED')
            ? 429
            : message.includes('400') || message.includes('API_KEY_INVALID')
              ? 400
              : 502;

      const userFriendlyError =
        status === 403 || status === 400
          ? 'API Key ไม่ถูกต้องหรือไม่ได้รับสิทธิ์เข้าถึง Gemini API กรุณาตรวจสอบใน Settings > Secrets'
          : status === 429
            ? 'มีการเรียกใช้งานเกินโควตาชั่วคราว กรุณารอสักครู่แล้วลองใหม่อีกครั้ง'
            : `เกิดข้อผิดพลาดในการเชื่อมต่อแหล่งข้อมูลทางการแพทย์: ${message}`;

      res.status(status).json({ error: userFriendlyError });
    }
  });

  const QUIZ_CACHE_TTL_MS = 30 * 60 * 1000;
  interface CachedClinicalQuiz {
    expiresAt: number;
    payload: {
      quizInstanceId: string;
      department: string;
      dateKey: string;
      quizTitle: string;
      questions: {
        id: string;
        question: string;
        clinicalContext: string;
        options: [string, string, string, string];
        correctIndex: number;
        explanation: string;
        guidelineRef: string;
      }[];
      sources: { title: string; uri: string; hostname: string }[];
      searchQueries: string[];
      generatedAt: string;
      model: string;
    };
  }
  const clinicalQuizCache = new Map<string, CachedClinicalQuiz>();

  function getBangkokDateKey(timestamp = Date.now()): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(timestamp));
  }

  function extractQuizJsonPayload(rawText: string): {
    quizTitle: string;
    questions: {
      id: string;
      question: string;
      clinicalContext: string;
      options: [string, string, string, string];
      correctIndex: number;
      explanation: string;
      guidelineRef: string;
    }[];
  } | null {
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      return null;
    }

    try {
      const parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as {
        quizTitle?: unknown;
        questions?: unknown[];
      };
      if (!Array.isArray(parsed.questions) || parsed.questions.length < 3) {
        return null;
      }

      const normalizedQuestions: {
        id: string;
        question: string;
        clinicalContext: string;
        options: [string, string, string, string];
        correctIndex: number;
        explanation: string;
        guidelineRef: string;
      }[] = [];

      for (let i = 0; i < 3; i += 1) {
        const rawItem = parsed.questions[i] as Record<string, unknown> | undefined;
        if (!rawItem || typeof rawItem !== 'object') return null;

        const question =
          typeof rawItem.question === 'string' ? rawItem.question.trim() : '';
        const clinicalContext =
          typeof rawItem.clinicalContext === 'string' && rawItem.clinicalContext.trim()
            ? rawItem.clinicalContext.trim()
            : `โจทย์คลินิกข้อที่ ${i + 1}`;
        const explanation =
          typeof rawItem.explanation === 'string' ? rawItem.explanation.trim() : '';
        const guidelineRef =
          typeof rawItem.guidelineRef === 'string' && rawItem.guidelineRef.trim()
            ? rawItem.guidelineRef.trim()
            : 'แนวทางเวชปฏิบัติมาตรฐาน';
        const rawOptions = Array.isArray(rawItem.options) ? rawItem.options : [];
        const cleanOptions = rawOptions
          .slice(0, 4)
          .map((opt) => (typeof opt === 'string' ? opt.trim() : ''));
        const correctIndex =
          typeof rawItem.correctIndex === 'number' &&
          Number.isInteger(rawItem.correctIndex) &&
          rawItem.correctIndex >= 0 &&
          rawItem.correctIndex <= 3
            ? rawItem.correctIndex
            : 0;

        if (!question || !explanation || cleanOptions.length !== 4 || cleanOptions.some((o) => !o)) {
          return null;
        }

        normalizedQuestions.push({
          id: `q-${i + 1}-${Date.now()}`,
          question,
          clinicalContext,
          options: [cleanOptions[0], cleanOptions[1], cleanOptions[2], cleanOptions[3]],
          correctIndex,
          explanation,
          guidelineRef,
        });
      }

      const quizTitle =
        typeof parsed.quizTitle === 'string' && parsed.quizTitle.trim()
          ? parsed.quizTitle.trim()
          : 'แบบทดสอบความรู้ทางคลินิก 3 ข้อประจำวัน';

      return { quizTitle, questions: normalizedQuestions };
    } catch {
      return null;
    }
  }

  app.post('/api/clinical-quiz', async (req: Request, res: Response) => {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      res.status(503).json({
        error:
          'ยังไม่ได้ตั้งค่า GEMINI_API_KEY ใน Settings > Secrets กรุณาเพิ่ม API Key เพื่อสร้างแบบทดสอบความรู้คลินิกผ่าน Google Search Grounding',
      });
      return;
    }

    const body = req.body as {
      department?: unknown;
      yearLevel?: unknown;
      forceRefresh?: unknown;
    };

    const rawDept =
      typeof body.department === 'string' && body.department.trim()
        ? body.department.trim().slice(0, 120)
        : 'กลุ่มงานอายุรศาสตร์';
    const yearLevel =
      body.yearLevel === '4' || body.yearLevel === '5' || body.yearLevel === '6'
        ? body.yearLevel
        : '6';
    const forceRefresh = Boolean(body.forceRefresh);
    const dateKey = getBangkokDateKey();
    const cacheKey = `${rawDept}::${dateKey}`;

    const cached = clinicalQuizCache.get(cacheKey);
    if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
      res.json(cached.payload);
      return;
    }

    const englishHint = DEPARTMENT_EN_HINTS[rawDept] ?? rawDept;
    const practiceVariantHint = forceRefresh
      ? `กรุณาเลือกโจทย์เคสผู้ป่วยและหัวข้อโรคที่แตกต่างจากชุดก่อนหน้า (Variation seed: ${Date.now() % 10000})`
      : `ประจำวันที่ ${dateKey}`;

    const prompt = [
      `คุณคืออาจารย์แพทย์ผู้สอบ OSCE และหัวหน้ากลุ่มงานประจำศูนย์แพทยศาสตรศึกษาชั้นคลินิก โรงพยาบาลสุรินทร์`,
      `จงใช้ Google Search ค้นหาแนวทางเวชปฏิบัติและมาตรฐานการรักษาล่าสุด (ปี 2024–2026) จากองค์กรที่เชื่อถือได้ (เช่น AHA/ACC, ESC, IDSA, KDIGO, GOLD, AAP, ACOG, ATLS, ราชวิทยาลัยแพทย์แห่งประเทศไทย, กรมการแพทย์)`,
      `สำหรับนักศึกษาแพทย์ชั้นปีที่ ${yearLevel} ที่กำลังปฏิบัติงานใน ${rawDept} (${englishHint}) ${practiceVariantHint}`,
      `จากนั้นจงออกข้อสอบปรนัยสถานการณ์คลินิก (Clinical Vignette) จำนวน 3 ข้อ เป็นภาษาไทยที่ชัดเจน (คงศัพท์แพทย์ ชื่อยา และเกณฑ์ตัวเลขสากลไว้ตามมาตรฐาน) โดยห้ามมีข้อความอื่นนอกเหนือจาก JSON ที่ถูกต้องเพียงก้อนเดียวตามโครงสร้างด้านล่าง:`,
      `{`,
      `  "quizTitle": "หัวข้อชุดแบบทดสอบสั้นๆ ประจำกลุ่มงาน",`,
      `  "questions": [`,
      `    {`,
      `      "clinicalContext": "หัวข้อโรค/แนวทางสั้นๆ (ไม่เกิน 60 ตัวอักษร)",`,
      `      "question": "โจทย์สถานการณ์ผู้ป่วย พร้อมอายุ อาการสำคัญ Vital signs หรือผลตรวจเบื้องต้น และคำถามที่ชัดเจน",`,
      `      "options": ["ตัวเลือกที่ 1", "ตัวเลือกที่ 2", "ตัวเลือกที่ 3", "ตัวเลือกที่ 4"],`,
      `      "correctIndex": 0,`,
      `      "explanation": "คำอธิบายเหตุผลทางคลินิกที่ถูกต้อง และเหตุใดตัวเลือกอื่นจึงยังไม่เหมาะสม อ้างอิงเกณฑ์/ตัวเลขจากแนวทางล่าสุด",`,
      `      "guidelineRef": "ชื่อแนวทางเวชปฏิบัติ / องค์กร / ปี ค.ศ."`,
      `    }`,
      `  ]`,
      `}`,
      `เงื่อนไขสำคัญ: questions ต้องมีครบ 3 ข้อพอดี options ต้องมี 4 ข้อทุกข้อ และ correctIndex ต้องเป็นจำนวนเต็ม 0, 1, 2 หรือ 3 และกระจายตำแหน่งคำตอบที่ถูกต้องให้หลากหลาย`,
    ].join('\n');

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const rawText = (response.text ?? '').trim();
      const parsedQuiz = extractQuizJsonPayload(rawText);
      if (!parsedQuiz) {
        res.status(502).json({
          error: 'ไม่สามารถประมวลผลชุดคำถามจากแหล่งข้อมูลได้ กรุณากดลองใหม่อีกครั้ง',
        });
        return;
      }

      const metadata = response.candidates?.[0]?.groundingMetadata;
      const rawChunks = metadata?.groundingChunks ?? [];
      const seenUris = new Set<string>();
      const sources: { title: string; uri: string; hostname: string }[] = [];

      for (const chunk of rawChunks) {
        const web = chunk.web;
        if (!web) continue;
        const safe = sanitizeHttpUrl(web.uri);
        if (!safe || seenUris.has(safe.uri)) continue;
        seenUris.add(safe.uri);
        sources.push({
          title:
            typeof web.title === 'string' && web.title.trim()
              ? web.title.trim()
              : safe.hostname,
          uri: safe.uri,
          hostname: safe.hostname,
        });
      }

      const searchQueries = Array.isArray(metadata?.webSearchQueries)
        ? metadata.webSearchQueries.filter(
            (q): q is string => typeof q === 'string' && q.trim().length > 0
          )
        : [];

      const now = new Date();
      const generatedAt = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')} น.`;

      const payload = {
        quizInstanceId: `quiz-${dateKey}-${Date.now()}`,
        department: rawDept,
        dateKey,
        quizTitle: parsedQuiz.quizTitle,
        questions: parsedQuiz.questions,
        sources: sources.slice(0, 6),
        searchQueries: searchQueries.slice(0, 4),
        generatedAt,
        model: 'gemini-4-hydrogen',
      };

      clinicalQuizCache.set(cacheKey, {
        expiresAt: Date.now() + QUIZ_CACHE_TTL_MS,
        payload,
      });

      res.json(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status =
        message.includes('403') || message.includes('PERMISSION_DENIED')
          ? 403
          : message.includes('429') || message.includes('RESOURCE_EXHAUSTED')
            ? 429
            : message.includes('400') || message.includes('API_KEY_INVALID')
              ? 400
              : 502;

      const userFriendlyError =
        status === 403 || status === 400
          ? 'API Key ไม่ถูกต้องหรือไม่ได้รับสิทธิ์เข้าถึง Gemini API กรุณาตรวจสอบใน Settings > Secrets'
          : status === 429
            ? 'มีการเรียกใช้งานเกินโควตาชั่วคราว กรุณารอสักครู่แล้วลองใหม่อีกครั้ง'
            : `เกิดข้อผิดพลาดในการสร้างแบบทดสอบทางคลินิก: ${message}`;

      res.status(status).json({ error: userFriendlyError });
    }
  });

  function resolveValidatedGasUrl(raw?: unknown): string | null {
    const candidate =
      typeof raw === 'string' && raw.trim() ? raw.trim() : DEFAULT_GOOGLE_APPS_SCRIPT_URL;
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol !== 'https:' || parsed.hostname !== 'script.google.com') {
        return null;
      }
      return parsed.toString();
    } catch {
      return null;
    }
  }

  async function callGoogleAppsScriptJson(
    url: string,
    init?: RequestInit
  ): Promise<{ ok: boolean; status: number; data?: Record<string, unknown>; error?: string }> {
    try {
      const response = await fetch(url, {
        ...init,
        redirect: 'follow',
      });
      const text = await response.text();
      const trimmed = text.trim();
      if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        return {
          ok: false,
          status: 502,
          error:
            'ปลายทาง Google Apps Script ยังไม่ส่งข้อมูล JSON กลับมา (กรุณาตรวจสอบว่าได้วางโค้ด Code.gs และ Deploy Web App โดยตั้งสิทธิ์ Who has access เป็น Anyone แล้ว)',
        };
      }
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      if (parsed.ok === false) {
        return {
          ok: false,
          status: 400,
          error:
            typeof parsed.error === 'string'
              ? parsed.error
              : 'Google Apps Script ส่งข้อความแจ้งข้อผิดพลาดกลับมา',
          data: parsed,
        };
      }
      return { ok: true, status: 200, data: parsed };
    } catch (err) {
      return {
        ok: false,
        status: 502,
        error: `ไม่สามารถเชื่อมต่อ Google Apps Script ได้: ${
          err instanceof Error ? err.message : String(err)
        }`,
      };
    }
  }

  app.get('/api/sheets/config', (_req: Request, res: Response) => {
    res.json({
      spreadsheetId: DEFAULT_GOOGLE_SHEETS_ID,
      webAppUrl: DEFAULT_GOOGLE_APPS_SCRIPT_URL,
    });
  });

  app.get('/api/sheets/ping', async (req: Request, res: Response) => {
    const gasUrl = resolveValidatedGasUrl(req.query.url);
    if (!gasUrl) {
      res.status(400).json({ error: 'URL ของ Google Apps Script ไม่ถูกต้อง' });
      return;
    }
    const separator = gasUrl.includes('?') ? '&' : '?';
    const result = await callGoogleAppsScriptJson(`${gasUrl}${separator}action=ping`);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json(result.data);
  });

  app.get('/api/sheets/pull', async (req: Request, res: Response) => {
    const gasUrl = resolveValidatedGasUrl(req.query.url);
    if (!gasUrl) {
      res.status(400).json({ error: 'URL ของ Google Apps Script ไม่ถูกต้อง' });
      return;
    }
    const separator = gasUrl.includes('?') ? '&' : '?';
    const result = await callGoogleAppsScriptJson(`${gasUrl}${separator}action=getAll`);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json(result.data);
  });

  app.post('/api/sheets/push', async (req: Request, res: Response) => {
    const body = req.body as {
      webAppUrl?: unknown;
      actor?: unknown;
      data?: unknown;
    };
    const gasUrl = resolveValidatedGasUrl(body.webAppUrl);
    if (!gasUrl) {
      res.status(400).json({ error: 'URL ของ Google Apps Script ไม่ถูกต้อง' });
      return;
    }
    if (!body.data || typeof body.data !== 'object') {
      res.status(400).json({ error: 'ไม่พบข้อมูลสำหรับส่งขึ้น Google Sheets' });
      return;
    }

    const actor =
      typeof body.actor === 'string' && body.actor.trim()
        ? body.actor.trim().slice(0, 120)
        : 'Surin MEC Portal';

    const result = await callGoogleAppsScriptJson(gasUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'syncAll',
        actor,
        data: body.data,
      }),
    });

    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json(result.data);
  });

  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    });

    if (process.env.DISABLE_HMR === 'true') {
      app.get('/@vite/client', async (_req: Request, res: Response, next: NextFunction) => {
        try {
          const transformed = await vite.transformRequest('/@vite/client');
          if (!transformed) {
            next();
            return;
          }
          const patched = transformed.code.replace(
            'transport.connect(createHMRHandler(handleMessage));',
            '/* HMR disabled: skip WebSocket connection */'
          );
          res
            .status(200)
            .set({ 'Content-Type': 'application/javascript; charset=utf-8' })
            .end(patched);
        } catch (err) {
          next(err);
        }
      });
    }

    app.use(vite.middlewares);

    app.use('*', async (req: Request, res: Response, next: NextFunction) => {
      if (req.originalUrl.startsWith('/api/')) {
        next();
        return;
      }
      try {
        const indexPath = path.resolve(__dirname, 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (err) {
        next(err);
      }
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Surin MEC portal listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
