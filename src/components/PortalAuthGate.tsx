import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  KeyRound,
  Lock,
  LogIn,
  Search,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { AuthUserProfile, UserRole } from '../types/medicalSchool';

interface BootstrapDirectoryEntry {
  username: string;
  role: UserRole;
  displayName: string;
  affiliation: string;
  hasPasswordSet: boolean;
}

interface PortalAuthGateProps {
  onAuthenticated: (token: string, user: AuthUserProfile) => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  student: 'ระดับ 1: นักศึกษาแพทย์',
  faculty: 'ระดับ 2: อาจารย์แพทย์',
  course_officer: 'ระดับ 3A: นักวิชาการประจำรายวิชา',
  admin: 'ระดับ 3B: แอดมิน / ประธานหลักสูตร',
};

const ACCESS_TIERS: Array<{
  role: UserRole;
  level: string;
  title: string;
  scope: string;
}> = [
  {
    role: 'student',
    level: 'ระดับ 1',
    title: 'นักศึกษาแพทย์ (ปี 4–6)',
    scope: 'เข้าถึงตารางเวร คะแนนประเมิน และบันทึก E-Logbook เฉพาะของตนเองเท่านั้น',
  },
  {
    role: 'faculty',
    level: 'ระดับ 2',
    title: 'อาจารย์แพทย์',
    scope: 'กรอกแบบประเมิน Form A–E ตรวจรับรอง E-Logbook และอนุมัติแลกเวร/ใบลา',
  },
  {
    role: 'course_officer',
    level: 'ระดับ 3A',
    title: 'นักวิชาการประจำรายวิชา',
    scope: 'ตั้งค่าหัวข้อประเมิน จัดการรายชื่อนักศึกษา-อาจารย์ในรายวิชาที่รับผิดชอบ',
  },
  {
    role: 'admin',
    level: 'ระดับ 3B',
    title: 'แอดมิน / ประธานหลักสูตร',
    scope: 'กำหนดสัดส่วนเกรด MPL ควบคุมสิทธิ์ทั้งศูนย์ฯ และจัดการสมาชิก (CRUD) ทุกระดับ',
  },
];

export function PortalAuthGate({ onAuthenticated }: PortalAuthGateProps) {
  const [adminConfigured, setAdminConfigured] = useState(true);
  const [requiresBootstrapPasscode, setRequiresBootstrapPasscode] = useState(false);
  const [directory, setDirectory] = useState<BootstrapDirectoryEntry[]>([]);
  const [serverUnavailable, setServerUnavailable] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [bootstrapPasscode, setBootstrapPasscode] = useState('');
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [setupError, setSetupError] = useState<string | null>(null);

  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [directorySearch, setDirectorySearch] = useState('');

  useEffect(() => {
    let active = true;
    const loadStatus = async () => {
      setLoadingStatus(true);
      try {
        const res = await fetch('/api/auth/bootstrap-status');
        const contentType = res.headers.get('content-type') ?? '';
        if (!res.ok || !contentType.includes('application/json')) {
          if (active) setServerUnavailable(true);
          return;
        }
        const data = (await res.json()) as {
          adminConfigured: boolean;
          requiresBootstrapPasscode: boolean;
          accounts: BootstrapDirectoryEntry[];
        };
        if (!active) return;
        setServerUnavailable(false);
        setAdminConfigured(data.adminConfigured);
        setRequiresBootstrapPasscode(data.requiresBootstrapPasscode);
        setDirectory(data.accounts);
      } catch {
        if (active) setServerUnavailable(true);
      } finally {
        if (active) setLoadingStatus(false);
      }
    };
    void loadStatus();
    return () => {
      active = false;
    };
  }, []);

  const handleFirstRunAdminSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/setup-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPassword: adminNewPassword,
          bootstrapPasscode: bootstrapPasscode || undefined,
        }),
      });
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        setSetupError('ไม่พบเซิร์ฟเวอร์ยืนยันตัวตน กรุณาเปิดผ่านโหมด Full-Stack Node Server');
        return;
      }
      const data = (await res.json()) as {
        token?: string;
        user?: AuthUserProfile;
        error?: string;
      };
      if (!res.ok || !data.token || !data.user) {
        setSetupError(data.error ?? 'ไม่สามารถตั้งค่ารหัสผ่านผู้ดูแลระบบได้');
        return;
      }
      setAdminNewPassword('');
      setBootstrapPasscode('');
      onAuthenticated(data.token, data.user);
    } catch {
      setSetupError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        setLoginError('ไม่พบเซิร์ฟเวอร์ยืนยันตัวตน กรุณาใช้งานผ่าน Full-Stack Node Server');
        return;
      }
      const data = (await res.json()) as {
        token?: string;
        user?: AuthUserProfile;
        error?: string;
      };
      if (!res.ok || !data.token || !data.user) {
        setLoginError(data.error ?? 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        return;
      }
      setPassword('');
      onAuthenticated(data.token, data.user);
    } catch {
      setLoginError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredDirectory = useMemo(() => {
    const q = directorySearch.trim().toLowerCase();
    return directory.filter((item) => {
      const matchRole = roleFilter === 'all' ? true : item.role === roleFilter;
      const matchQuery =
        !q ||
        item.username.toLowerCase().includes(q) ||
        item.displayName.toLowerCase().includes(q) ||
        item.affiliation.toLowerCase().includes(q);
      return matchRole && matchQuery;
    });
  }, [directory, roleFilter, directorySearch]);

  return (
    <div className="space-y-8">
      {/* Institutional Auth Banner */}
      <section className="rounded-2xl bg-[#091A32] text-white p-6 sm:p-8 border border-[#0F2A4A] shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-[#5EEAD4]">
              <Lock className="w-4 h-4" aria-hidden="true" />
              <span>การเข้าถึงข้อมูลแบบจำกัดสิทธิ์ตามตัวตน (Login-Gated Access Control)</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-white">
              ศูนย์แพทยศาสตรศึกษาชั้นคลินิก โรงพยาบาลสุรินทร์
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              ข้อมูลผลประเมิน คะแนนเกรด E-Logbook ตารางเวรหอผู้ป่วย และระบบจัดการสมาชิกถูกแยกตามระดับสิทธิ์อย่างเคร่งครัด
              กรุณาลงชื่อเข้าสู่ระบบด้วย Username และ Password ประจำบุคคลเพื่อเข้าถึงข้อมูลในระดับสิทธิ์ของท่าน
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 shrink-0 lg:w-[340px]">
            <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
              <div className="text-[11px] text-slate-400">การแยกสิทธิ์</div>
              <div className="text-base font-bold text-white mt-0.5 tabular-nums">4 ระดับ</div>
              <div className="text-[11px] text-[#5EEAD4] mt-0.5">ระดับ 1 – 3B</div>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
              <div className="text-[11px] text-slate-400">บัญชีในระบบ</div>
              <div className="text-base font-bold text-white mt-0.5 tabular-nums">
                {loadingStatus ? '...' : `${directory.length} บัญชี`}
              </div>
              <div className="text-[11px] text-[#5EEAD4] mt-0.5">ยืนยันตัวตนก่อนใช้งาน</div>
            </div>
          </div>
        </div>
      </section>

      {/* Static Host Warning if /api/auth/* is unavailable */}
      {serverUnavailable && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1 text-xs sm:text-sm text-amber-900">
            <div className="font-semibold">
              กำลังทำงานบนโฮสต์แบบ Static — ไม่พบเซิร์ฟเวอร์ยืนยันตัวตน (/api/auth/*)
            </div>
            <p className="text-amber-800 leading-relaxed">
              ระบบเข้าสู่ระบบและจัดการสมาชิก (CRUD) จำเป็นต้องทำงานร่วมกับ Full-Stack Server (Node.js / Express)
              เพื่อตรวจสอบรหัสผ่านและแยกสิทธิ์อย่างปลอดภัย หากต้องการเข้าสู่ระบบเต็มรูปแบบ กรุณาเปิดผ่านเซิร์ฟเวอร์แอปพลิเคชันหลัก
            </p>
          </div>
        </div>
      )}

      {/* First-Run Admin Setup (shown only when admin has not been initialized yet) */}
      {!serverUnavailable && !adminConfigured && (
        <form
          onSubmit={handleFirstRunAdminSetup}
          className="clinical-surface rounded-2xl p-6 bg-teal-50/60 border border-teal-200 space-y-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F766E] text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#0F766E]">
                ตั้งค่าความปลอดภัยเริ่มต้น (First-Run Administrator Setup)
              </div>
              <h2 className="text-base sm:text-lg font-semibold text-slate-900 mt-0.5">
                กำหนดรหัสผ่านแรกเข้าสำหรับผู้ดูแลระบบ (Username: <span className="font-mono">admin</span>)
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                เมื่อตั้งรหัสผ่าน <span className="font-mono font-semibold">admin</span> เสร็จสิ้น ระบบจะเข้าสู่ระบบในระดับ 3B ทันที เพื่อให้ท่านเพิ่ม/แก้ไข/ลบสมาชิกและออกรหัสผ่านให้บุคลากรในศูนย์ฯ ได้
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {requiresBootstrapPasscode && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  รหัสยืนยันเริ่มต้น (Bootstrap Passcode)
                </label>
                <input
                  type="password"
                  required
                  value={bootstrapPasscode}
                  onChange={(e) => setBootstrapPasscode(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                />
              </div>
            )}
            <div className={requiresBootstrapPasscode ? '' : 'sm:col-span-2'}>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                กำหนดรหัสผ่านใหม่สำหรับ admin (อย่างน้อย 8 ตัวอักษร)
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={adminNewPassword}
                onChange={(e) => setAdminNewPassword(e.target.value)}
                placeholder="ตั้งรหัสผ่านผู้ดูแลระบบอย่างน้อย 8 ตัวอักษร..."
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {setupError && <div className="text-xs text-rose-700 font-medium">{setupError}</div>}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#0F766E] rounded-lg hover:bg-[#0D625B] cursor-pointer disabled:opacity-60"
          >
            <KeyRound className="w-4 h-4" aria-hidden="true" />
            <span>{submitting ? 'กำลังตั้งค่า...' : 'ตั้งรหัส admin และเข้าสู่ระบบ'}</span>
          </button>
        </form>
      )}

      {/* Main Sign-In Card + Username Directory Lookup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleLogin}
          className="lg:col-span-5 clinical-surface rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#091A32] text-[#5EEAD4] flex items-center justify-center shrink-0">
              <LogIn className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                เข้าสู่ระบบ (Sign In)
              </h2>
              <p className="text-xs text-slate-500">
                สิทธิ์การเข้าถึงข้อมูลจะเปิดตามบัญชีที่เข้าสู่ระบบเท่านั้น
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="gate-username"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              ชื่อผู้ใช้ (Username)
            </label>
            <input
              id="gate-username"
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="เช่น admin, off_ped, dr_ekkarat, std_64104218"
              className="w-full px-3 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label
              htmlFor="gate-password"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              รหัสผ่าน (Password)
            </label>
            <input
              id="gate-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="กรอกรหัสผ่านของท่าน..."
              className="w-full px-3 py-2.5 text-sm bg-white border border-slate-300 rounded-lg"
            />
          </div>

          {loginError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {loginError}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || serverUnavailable}
            className="w-full py-2.5 text-sm font-semibold text-white bg-[#091A32] rounded-lg hover:bg-[#0F2A4A] transition-colors cursor-pointer disabled:opacity-50"
          >
            {submitting ? 'กำลังตรวจสอบสิทธิ์...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        {/* Public Username Directory (no clinical/score data exposed) */}
        <div className="lg:col-span-7 clinical-surface rounded-2xl overflow-hidden">
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-[#0D9488]" aria-hidden="true" />
                <span>รายชื่อ Username ในระบบ (คลิกเพื่อกรอกชื่อผู้ใช้)</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                แสดงเฉพาะชื่อผู้ใช้และบทบาทเพื่อช่วยกรอก Username (ไม่แสดงข้อมูลคลินิกหรือผลคะแนน)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search
                  className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={directorySearch}
                  onChange={(e) => setDirectorySearch(e.target.value)}
                  placeholder="ค้นหาชื่อ..."
                  className="pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg w-36 sm:w-44"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as 'all' | UserRole)}
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
              >
                <option value="all">ทุกบทบาท</option>
                <option value="admin">แอดมิน (3B)</option>
                <option value="course_officer">นักวิชาการ (3A)</option>
                <option value="faculty">อาจารย์แพทย์ (2)</option>
                <option value="student">นักศึกษาแพทย์ (1)</option>
              </select>
            </div>
          </div>

          <div className="divide-y divide-slate-200 max-h-[300px] overflow-y-auto">
            {filteredDirectory.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-slate-500">
                {loadingStatus
                  ? 'กำลังโหลดรายชื่อบัญชี...'
                  : serverUnavailable
                    ? 'ไม่สามารถโหลดรายชื่อบัญชีบนโฮสต์ Static ได้'
                    : 'ไม่พบบัญชีที่ตรงกับคำค้นหา'}
              </div>
            ) : (
              filteredDirectory.map((item) => (
                <button
                  key={item.username}
                  type="button"
                  onClick={() => setUsername(item.username)}
                  className="w-full px-5 py-2.5 text-left hover:bg-slate-50 flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 truncate">
                      {item.displayName}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {ROLE_LABELS[item.role]} · {item.affiliation}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-xs font-semibold text-[#0F2A4A]">
                      {item.username}
                    </div>
                    <div className="text-[11px]">
                      {item.hasPasswordSet ? (
                        <span className="text-emerald-700 font-medium">ตั้งรหัสแล้ว</span>
                      ) : (
                        <span className="text-amber-700 font-medium">รอออกรหัส</span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 4 Access Levels Overview */}
      <section className="clinical-surface rounded-2xl p-6 space-y-4">
        <div className="text-sm font-semibold text-slate-900">
          โครงสร้างการแบ่งระดับการเข้าถึงข้อมูลหลังเข้าสู่ระบบ (Role-Based Access Control)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {ACCESS_TIERS.map((tier) => (
            <div
              key={tier.role}
              className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-1.5"
            >
              <div className="text-xs font-semibold text-[#0F766E]">{tier.level}</div>
              <div className="text-sm font-semibold text-slate-900">{tier.title}</div>
              <p className="text-xs text-slate-600 leading-relaxed">{tier.scope}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
