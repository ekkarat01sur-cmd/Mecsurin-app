import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  KeyRound,
  Lock,
  LogIn,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { AuthUserProfile, UserRole } from '../types/medicalSchool';

interface BootstrapDirectoryEntry {
  username: string;
  role: UserRole;
  displayName: string;
  affiliation: string;
  studentId?: string;
  assignedCourseCodes?: string[];
  hasPasswordSet: boolean;
}

interface IssuedCredentialSlip {
  username: string;
  displayName: string;
  role: UserRole;
  affiliation?: string;
  temporaryPassword: string;
}

interface AuthPortalModalProps {
  isOpen: boolean;
  initialTab?: 'login' | 'manage' | 'password';
  onClose: () => void;
  authToken: string | null;
  authUser: AuthUserProfile | null;
  onAuthenticated: (token: string, user: AuthUserProfile) => void;
  onUpdatedProfile: (user: AuthUserProfile) => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  student: 'ระดับ 1: นักศึกษาแพทย์',
  faculty: 'ระดับ 2: อาจารย์แพทย์',
  course_officer: 'ระดับ 3A: นักวิชาการประจำรายวิชา',
  admin: 'ระดับ 3B: แอดมิน / ประธานหลักสูตร',
};

export function AuthPortalModal({
  isOpen,
  initialTab = 'login',
  onClose,
  authToken,
  authUser,
  onAuthenticated,
  onUpdatedProfile,
}: AuthPortalModalProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'manage' | 'password'>(initialTab);
  const [adminConfigured, setAdminConfigured] = useState(true);
  const [requiresBootstrapPasscode, setRequiresBootstrapPasscode] = useState(false);
  const [directory, setDirectory] = useState<BootstrapDirectoryEntry[]>([]);
  const [managedUsers, setManagedUsers] = useState<AuthUserProfile[]>([]);

  // Login form
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [roleQuickFilter, setRoleQuickFilter] = useState<'all' | UserRole>('all');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // First-run Admin Setup
  const [bootstrapPasscode, setBootstrapPasscode] = useState('');
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [setupError, setSetupError] = useState<string | null>(null);

  // Account & Credential Issuance (Admin / Course Officer)
  const [manageRoleFilter, setManageRoleFilter] = useState<'all' | UserRole>('all');
  const [manageSearch, setManageSearch] = useState('');
  const [issuedSlips, setIssuedSlips] = useState<IssuedCredentialSlip[]>([]);
  const [customIssueUsername, setCustomIssueUsername] = useState('');
  const [customIssuePassword, setCustomIssuePassword] = useState('');
  const [newUserDisplayName, setNewUserDisplayName] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('student');
  const [newUserAffiliation, setNewUserAffiliation] = useState('');
  const [manageMessage, setManageMessage] = useState<string | null>(null);
  const [manageError, setManageError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Change own password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newOwnPassword, setNewOwnPassword] = useState('');
  const [pwMessage, setPwMessage] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);

  const canManageAccounts =
    authUser?.role === 'admin' || authUser?.role === 'course_officer';

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab);
    setLoginError(null);
    setSetupError(null);
    setManageError(null);
    setPwError(null);
    setPwMessage(null);
    void loadBootstrapStatus();
    if (authToken && canManageAccounts) {
      void loadManagedUsers(authToken);
    }
  }, [isOpen, initialTab, authToken, canManageAccounts]);

  const loadBootstrapStatus = async () => {
    try {
      const res = await fetch('/api/auth/bootstrap-status');
      if (!res.ok) return;
      const data = (await res.json()) as {
        adminConfigured: boolean;
        requiresBootstrapPasscode: boolean;
        accounts: BootstrapDirectoryEntry[];
      };
      setAdminConfigured(data.adminConfigured);
      setRequiresBootstrapPasscode(data.requiresBootstrapPasscode);
      setDirectory(data.accounts);
    } catch {
      // Ignore transient network errors
    }
  };

  const loadManagedUsers = async (token: string) => {
    try {
      const res = await fetch('/api/auth/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = (await res.json()) as { users: AuthUserProfile[] };
      setManagedUsers(data.users);
    } catch {
      // Ignore transient errors
    }
  };

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
      await loadBootstrapStatus();
      await loadManagedUsers(data.token);
      setActiveTab('manage');
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
        body: JSON.stringify({ username, password }),
      });
      const data = (await res.json()) as {
        token?: string;
        user?: AuthUserProfile;
        error?: string;
      };
      if (!res.ok || !data.token || !data.user) {
        setLoginError(data.error ?? 'เข้าสู่ระบบไม่สำเร็จ');
        return;
      }
      setPassword('');
      onAuthenticated(data.token, data.user);
      onClose();
    } catch {
      setLoginError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setSubmitting(false);
    }
  };

  const handleIssueCredential = async (
    targetUsername: string,
    optionalCustomPassword?: string,
    extraUser?: {
      displayName?: string;
      role?: UserRole;
      affiliation?: string;
    }
  ) => {
    if (!authToken) return;
    setManageError(null);
    setManageMessage(null);
    try {
      const res = await fetch('/api/auth/users/issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          username: targetUsername,
          customPassword: optionalCustomPassword || undefined,
          displayName: extraUser?.displayName || undefined,
          role: extraUser?.role || undefined,
          affiliation: extraUser?.affiliation || undefined,
        }),
      });
      const data = (await res.json()) as {
        user?: AuthUserProfile;
        issuedCredentials?: IssuedCredentialSlip;
        error?: string;
      };
      if (!res.ok || !data.issuedCredentials) {
        setManageError(data.error ?? 'ไม่สามารถออกรหัสผ่านได้');
        return;
      }
      setIssuedSlips((prev) => [
        data.issuedCredentials!,
        ...prev.filter((s) => s.username !== data.issuedCredentials!.username),
      ]);
      setManageMessage(
        `ออก Username / Password สำหรับ ${data.issuedCredentials.displayName} เรียบร้อยแล้ว`
      );
      await loadManagedUsers(authToken);
      await loadBootstrapStatus();
    } catch {
      setManageError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  const handleBatchIssue = async (targetRole: 'student' | 'faculty' | 'course_officer') => {
    if (!authToken) return;
    setManageError(null);
    setManageMessage(null);
    try {
      const res = await fetch('/api/auth/users/issue-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ targetRole, onlyUnset: true }),
      });
      const data = (await res.json()) as {
        count?: number;
        credentials?: IssuedCredentialSlip[];
        error?: string;
      };
      if (!res.ok || !data.credentials) {
        setManageError(data.error ?? 'ไม่สามารถออกรหัสผ่านแบบกลุ่มได้');
        return;
      }
      if (data.credentials.length === 0) {
        setManageMessage('บัญชีทั้งหมดในกลุ่มนี้มีรหัสผ่านเรียบร้อยแล้ว (สามารถกดรีเซ็ตรายบุคคลได้)');
        return;
      }
      setIssuedSlips((prev) => {
        const byUsername = new Map(prev.map((p) => [p.username, p]));
        data.credentials!.forEach((c) => byUsername.set(c.username, c));
        return Array.from(byUsername.values());
      });
      setManageMessage(`ออกรหัสผ่านเริ่มต้นเรียบร้อยแล้ว ${data.count} บัญชี`);
      await loadManagedUsers(authToken);
      await loadBootstrapStatus();
    } catch {
      setManageError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  const handleCreateCustomAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customIssueUsername.trim()) return;
    await handleIssueCredential(customIssueUsername.trim(), customIssuePassword.trim(), {
      displayName: newUserDisplayName.trim() || customIssueUsername.trim(),
      role: newUserRole,
      affiliation: newUserAffiliation.trim() || undefined,
    });
    setCustomIssueUsername('');
    setCustomIssuePassword('');
    setNewUserDisplayName('');
    setNewUserAffiliation('');
  };

  const handleChangeOwnPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    setPwError(null);
    setPwMessage(null);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword: newOwnPassword,
        }),
      });
      const data = (await res.json()) as { user?: AuthUserProfile; error?: string };
      if (!res.ok || !data.user) {
        setPwError(data.error ?? 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
        return;
      }
      setCurrentPassword('');
      setNewOwnPassword('');
      setPwMessage('อัปเดตรหัสผ่านส่วนตัวเรียบร้อยแล้ว');
      onUpdatedProfile(data.user);
    } catch {
      setPwError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  const handleCopySlip = (slip: IssuedCredentialSlip) => {
    const text = `บัญชีผู้ใช้งาน ศพค. รพ.สุรินทร์\nชื่อ: ${slip.displayName}\nUsername: ${slip.username}\nPassword: ${slip.temporaryPassword}`;
    void navigator.clipboard?.writeText(text);
    setCopiedKey(slip.username);
    window.setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleExportSlipsCsv = () => {
    if (issuedSlips.length === 0) return;
    const headers = ['Username', 'Password', 'ชื่อ-สกุล', 'บทบาท', 'สังกัด'];
    const rows = issuedSlips.map((s) => [
      s.username,
      s.temporaryPassword,
      `"${s.displayName.replace(/"/g, '""')}"`,
      ROLE_LABELS[s.role],
      `"${(s.affiliation ?? '').replace(/"/g, '""')}"`,
    ]);
    const csv = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'surin_mec_credentials.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredDirectory = useMemo(() => {
    return directory.filter((item) =>
      roleQuickFilter === 'all' ? true : item.role === roleQuickFilter
    );
  }, [directory, roleQuickFilter]);

  const filteredManagedUsers = useMemo(() => {
    const q = manageSearch.trim().toLowerCase();
    return managedUsers.filter((u) => {
      const matchRole = manageRoleFilter === 'all' || u.role === manageRoleFilter;
      const matchQuery =
        !q ||
        u.username.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q) ||
        (u.studentId && u.studentId.includes(q));
      return matchRole && matchQuery;
    });
  }, [managedUsers, manageRoleFilter, manageSearch]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="ระบบเข้าสู่ระบบและจัดการบัญชีผู้ใช้ ศพค. รพ.สุรินทร์"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-[#0F2A4A] text-white flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-900 truncate">
                ระบบบัญชีผู้ใช้งานรายบุคคล (Username / Password) ศพค. รพ.สุรินทร์
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {authUser
                  ? `เข้าสู่ระบบในนาม ${authUser.displayName} (${authUser.username})`
                  : 'เข้าสู่ระบบด้วย Username และ Password รายบุคคลสำหรับนักศึกษาแพทย์ อาจารย์แพทย์ นักวิชาการรายวิชา และแอดมิน'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่าง"
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/70 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-nav tabs */}
        <div className="px-6 py-2.5 border-b border-slate-200 bg-white flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('login')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer ${
              activeTab === 'login'
                ? 'bg-[#0F2A4A] text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
            เข้าสู่ระบบ / ตั้งค่าเริ่มต้น
          </button>

          {canManageAccounts && (
            <button
              type="button"
              onClick={() => setActiveTab('manage')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer ${
                activeTab === 'manage'
                  ? 'bg-[#0F2A4A] text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Users className="w-3.5 h-3.5" aria-hidden="true" />
              จัดการบัญชี & ออก Username/Password
            </button>
          )}

          {authUser && (
            <button
              type="button"
              onClick={() => setActiveTab('password')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer ${
                activeTab === 'password'
                  ? 'bg-[#0F2A4A] text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Lock className="w-3.5 h-3.5" aria-hidden="true" />
              เปลี่ยนรหัสผ่านของฉัน
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'login' && (
            <div className="space-y-6">
              {!adminConfigured && (
                <form
                  onSubmit={handleFirstRunAdminSetup}
                  className="p-5 bg-teal-50/70 border border-teal-200 rounded-xl space-y-4"
                >
                  <div>
                    <div className="text-xs font-semibold text-[#0F766E]">
                      ตั้งค่าความปลอดภัยเริ่มต้น (First-Run Administrator Setup)
                    </div>
                    <h3 className="text-base font-semibold text-slate-900 mt-0.5">
                      กำหนดรหัสผ่านผู้ดูแลระบบ (Username: admin) เพื่อเปิดใช้งานระบบออกบัญชีรายบุคคล
                    </h3>
                    <p className="text-xs text-slate-600 mt-1">
                      เมื่อกำหนดรหัสผ่านของ <span className="font-mono font-semibold">admin</span> เรียบร้อยแล้ว ท่านสามารถออก Username / Password ให้กับนักศึกษาแพทย์ อาจารย์แพทย์ และนักวิชาการประจำรายวิชาทั้งศูนย์ฯ ได้ทันที
                    </p>
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
                        กำหนดรหัสผ่านสำหรับ admin (อย่างน้อย 8 ตัวอักษร)
                      </label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={adminNewPassword}
                        onChange={(e) => setAdminNewPassword(e.target.value)}
                        placeholder="ตั้งรหัสผ่านผู้ดูแลระบบ..."
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  {setupError && (
                    <div className="text-xs text-rose-700 font-medium">{setupError}</div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-xs sm:text-sm font-medium text-white bg-[#0F766E] rounded-lg hover:bg-[#0D625B] cursor-pointer disabled:opacity-60"
                  >
                    {submitting ? 'กำลังตั้งค่า...' : 'เปิดใช้งาน admin และเข้าสู่ระบบทันที'}
                  </button>
                </form>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <form
                  onSubmit={handleLogin}
                  className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4"
                >
                  <h3 className="text-base font-semibold text-slate-900">
                    ลงชื่อเข้าใช้งาน (Sign In)
                  </h3>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      ชื่อผู้ใช้ (Username)
                    </label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="เช่น std_64104218, dr_pinyada, off_ped, admin"
                      className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      รหัสผ่าน (Password)
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="กรอกรหัสผ่านของท่าน..."
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                    />
                  </div>

                  {loginError && (
                    <div className="text-xs text-rose-700 font-medium">{loginError}</div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 text-sm font-medium text-white bg-[#0F2A4A] rounded-lg hover:bg-[#163B66] cursor-pointer disabled:opacity-60"
                  >
                    {submitting ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
                  </button>
                </form>

                {/* Directory Username Lookup */}
                <div className="lg:col-span-7 border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-slate-800">
                      ทำเนียบ Username ประจำบุคคล (คลิกเพื่อกรอก Username)
                    </div>
                    <select
                      value={roleQuickFilter}
                      onChange={(e) => setRoleQuickFilter(e.target.value as 'all' | UserRole)}
                      className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-md"
                    >
                      <option value="all">ทุกบทบาท ({directory.length})</option>
                      <option value="student">นักศึกษาแพทย์</option>
                      <option value="faculty">อาจารย์แพทย์</option>
                      <option value="course_officer">นักวิชาการประจำรายวิชา</option>
                      <option value="admin">แอดมิน / ประธานฯ</option>
                    </select>
                  </div>
                  <div className="divide-y divide-slate-200 max-h-[300px] overflow-y-auto">
                    {filteredDirectory.map((item) => (
                      <button
                        key={item.username}
                        type="button"
                        onClick={() => setUsername(item.username)}
                        className="w-full px-4 py-2.5 text-left hover:bg-slate-50 flex items-center justify-between gap-3 cursor-pointer"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-900 truncate">
                            {item.displayName}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {item.affiliation}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono text-xs font-semibold text-[#0F2A4A]">
                            {item.username}
                          </div>
                          <div className="text-[11px]">
                            {item.hasPasswordSet ? (
                              <span className="text-emerald-700">ตั้งรหัสแล้ว</span>
                            ) : (
                              <span className="text-amber-700">รอออกรหัส</span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'manage' && canManageAccounts && (
            <div className="space-y-6">
              {/* Batch Issuance Strip */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#0F766E]" aria-hidden="true" />
                    ออก Username / Password ทั้งกลุ่ม (Batch Credential Generator)
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    สร้างรหัสผ่านเริ่มต้นแบบสุ่มที่ปลอดภัยให้ผู้ที่ยังไม่มีรหัสผ่าน พร้อมใบแจ้งรหัสผ่านสำหรับแจกจ่าย
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleBatchIssue('student')}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-[#0F2A4A] rounded-lg hover:bg-[#163B66] cursor-pointer whitespace-nowrap shrink-0"
                  >
                    ออกรหัสให้นักศึกษาที่ยังไม่มีรหัส
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleBatchIssue('faculty')}
                    className="px-3 py-1.5 text-xs font-medium text-[#0F2A4A] bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    ออกรหัสให้อาจารย์แพทย์
                  </button>
                  {authUser?.role === 'admin' && (
                    <button
                      type="button"
                      onClick={() => void handleBatchIssue('course_officer')}
                      className="px-3 py-1.5 text-xs font-medium text-[#0F766E] bg-white border border-teal-300 rounded-lg hover:bg-teal-50 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      ออกรหัสให้นักวิชาการรายวิชา
                    </button>
                  )}
                </div>
              </div>

              {manageMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-800">
                  {manageMessage}
                </div>
              )}
              {manageError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium text-rose-800">
                  {manageError}
                </div>
              )}

              {/* Issued Credentials Slips */}
              {issuedSlips.length > 0 && (
                <div className="border border-teal-200 bg-teal-50/40 rounded-xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-slate-900">
                      ใบแจ้ง Username / Password ที่ออกล่าสุด ({issuedSlips.length} บัญชี — แสดงครั้งเดียวเพื่อความปลอดภัย)
                    </div>
                    <button
                      type="button"
                      onClick={handleExportSlipsCsv}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0F2A4A] bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" aria-hidden="true" />
                      ส่งออก CSV แจกจ่าย
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[220px] overflow-y-auto">
                    {issuedSlips.map((slip) => (
                      <div
                        key={slip.username}
                        className="bg-white border border-slate-200 rounded-lg p-3 flex items-start justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="font-semibold text-slate-900 truncate">
                            {slip.displayName}
                          </div>
                          <div className="font-mono text-slate-700">
                            User: <span className="font-bold">{slip.username}</span>
                          </div>
                          <div className="font-mono text-[#0F766E]">
                            Pass: <span className="font-bold">{slip.temporaryPassword}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopySlip(slip)}
                          aria-label={`คัดลอกรหัสผ่านของ ${slip.username}`}
                          className="p-1.5 text-slate-500 hover:text-[#0F2A4A] cursor-pointer shrink-0"
                        >
                          {copiedKey === slip.username ? (
                            <Check className="w-4 h-4 text-emerald-700" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add New Account Form */}
              <form
                onSubmit={handleCreateCustomAccount}
                className="border border-slate-200 rounded-xl p-4 space-y-3"
              >
                <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-[#0F2A4A]" aria-hidden="true" />
                  เพิ่มบัญชีผู้ใช้งานใหม่ / กำหนดรหัสผ่านเอง
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                  <input
                    type="text"
                    required
                    value={customIssueUsername}
                    onChange={(e) => setCustomIssueUsername(e.target.value)}
                    placeholder="Username (เช่น dr_wichai)"
                    className="px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                  />
                  <input
                    type="text"
                    value={newUserDisplayName}
                    onChange={(e) => setNewUserDisplayName(e.target.value)}
                    placeholder="ชื่อ-สกุล"
                    className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="student">นักศึกษาแพทย์</option>
                    <option value="faculty">อาจารย์แพทย์</option>
                    {authUser?.role === 'admin' && (
                      <option value="course_officer">นักวิชาการประจำรายวิชา</option>
                    )}
                  </select>
                  <input
                    type="text"
                    value={customIssuePassword}
                    onChange={(e) => setCustomIssuePassword(e.target.value)}
                    placeholder="รหัสผ่าน (เว้นว่างเพื่อสุ่ม)"
                    className="px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-xs font-medium text-white bg-[#0F2A4A] rounded-lg hover:bg-[#163B66] cursor-pointer whitespace-nowrap"
                  >
                    สร้างและออกรหัส
                  </button>
                </div>
              </form>

              {/* Existing User Directory */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="relative flex-1 max-w-xs">
                    <Search
                      className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                      aria-hidden="true"
                    />
                    <input
                      type="text"
                      value={manageSearch}
                      onChange={(e) => setManageSearch(e.target.value)}
                      placeholder="ค้นหาชื่อ หรือ Username..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <select
                    value={manageRoleFilter}
                    onChange={(e) => setManageRoleFilter(e.target.value as 'all' | UserRole)}
                    className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="all">ทุกบทบาท ({managedUsers.length})</option>
                    <option value="student">นักศึกษาแพทย์</option>
                    <option value="faculty">อาจารย์แพทย์</option>
                    <option value="course_officer">นักวิชาการประจำรายวิชา</option>
                    <option value="admin">แอดมิน</option>
                  </select>
                </div>

                <div className="divide-y divide-slate-200 max-h-[260px] overflow-y-auto">
                  {filteredManagedUsers.map((u) => (
                    <div
                      key={u.username}
                      className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">
                          {u.displayName}{' '}
                          <span className="font-mono text-[#0F2A4A]">({u.username})</span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {ROLE_LABELS[u.role]} · {u.affiliation}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`text-[11px] font-medium ${
                            u.hasPasswordSet ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {u.hasPasswordSet ? 'มีรหัสผ่านแล้ว' : 'ยังไม่ตั้งรหัส'}
                        </span>
                        <button
                          type="button"
                          onClick={() => void handleIssueCredential(u.username)}
                          className="px-2.5 py-1 text-xs font-medium text-[#0F2A4A] bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer whitespace-nowrap"
                        >
                          {u.hasPasswordSet ? 'รีเซ็ตรหัสผ่าน' : 'ออกรหัสผ่าน'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'password' && authUser && (
            <form
              onSubmit={handleChangeOwnPassword}
              className="max-w-md mx-auto bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-4"
            >
              <h3 className="text-base font-semibold text-slate-900">
                เปลี่ยนรหัสผ่านส่วนตัว ({authUser.username})
              </h3>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  รหัสผ่านปัจจุบัน
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newOwnPassword}
                  onChange={(e) => setNewOwnPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                />
              </div>
              {pwError && <div className="text-xs text-rose-700 font-medium">{pwError}</div>}
              {pwMessage && (
                <div className="text-xs text-emerald-700 font-medium">{pwMessage}</div>
              )}
              <button
                type="submit"
                className="w-full py-2.5 text-sm font-medium text-white bg-[#0F2A4A] rounded-lg hover:bg-[#163B66] cursor-pointer"
              >
                บันทึกรหัสผ่านใหม่
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
