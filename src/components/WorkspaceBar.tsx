import { useState } from 'react';
import {
  Camera,
  Check,
  FileSpreadsheet,
  KeyRound,
  Lock,
  LogIn,
  LogOut,
  Search,
  Shield,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { AuthUserProfile, StudentPhotoMap, UserRole } from '../types/medicalSchool';
import { ROLE_PERMISSION_PROFILES } from '../data/initialMedicalData';
import { PWAInstallButton } from './PWAInstallButton';
import { ADMIN_OFFICER_ROLES, hasRoleAccess } from './RoleAccessGuard';
import { StudentAvatar } from './StudentAvatar';

interface WorkspaceBarProps {
  role: UserRole;
  isAuthenticated: boolean;
  pendingCount: number;
  currentStudentId: string;
  currentStudentName?: string;
  authUser: AuthUserProfile | null;
  onOpenAuthModal: (tab: 'login' | 'manage' | 'password') => void;
  onLogout: () => void;
  studentPhotos: StudentPhotoMap;
  onOpenStudentDirectory: () => void;
  onOpenQuickSearch: () => void;
  onOpenSheetsSync: () => void;
}

export function WorkspaceBar({
  role,
  isAuthenticated,
  pendingCount,
  currentStudentId,
  currentStudentName,
  authUser,
  onOpenAuthModal,
  onLogout,
  studentPhotos,
  onOpenStudentDirectory,
  onOpenQuickSearch,
  onOpenSheetsSync,
}: WorkspaceBarProps) {
  const [showMatrix, setShowMatrix] = useState(false);
  const profile = ROLE_PERMISSION_PROFILES[role];
  const displayName = authUser ? authUser.displayName : profile.displayName;
  const affiliation = authUser ? authUser.affiliation : profile.affiliation;
  const isBackOfficeManager = hasRoleAccess(role, isAuthenticated, ADMIN_OFFICER_ROLES);
  const canSyncSheets = hasRoleAccess(role, isAuthenticated, ADMIN_OFFICER_ROLES);

  return (
    <div className="bg-white/85 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-2.5 flex flex-col gap-2.5">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
          {isAuthenticated && authUser ? (
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs sm:text-sm text-slate-600">
              {role === 'student' && (
                <StudentAvatar
                  studentId={currentStudentId}
                  studentName={currentStudentName ?? displayName}
                  studentPhotos={studentPhotos}
                  size="xs"
                />
              )}
              <span className="inline-flex items-center gap-1 font-semibold text-[#0F2A4A]">
                <Shield className="w-3.5 h-3.5 text-[#0D9488]" aria-hidden="true" />
                ระดับสิทธิ์ {profile.level}
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="font-semibold text-slate-900">{displayName}</span>
              <span className="font-mono text-xs text-[#0F766E]">
                @{authUser.username}
              </span>
              <span aria-hidden="true" className="text-slate-300 hidden sm:inline">·</span>
              <span className="hidden sm:inline">{affiliation}</span>
              {authUser.role === 'course_officer' &&
                authUser.assignedCourseCodes &&
                authUser.assignedCourseCodes.length > 0 && (
                  <>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="font-mono text-xs font-medium text-[#0F2A4A]">
                      วิชาที่รับผิดชอบ: {authUser.assignedCourseCodes.join(', ')}
                    </span>
                  </>
                )}
              {(role === 'faculty' || role === 'course_officer') && pendingCount > 0 && (
                <>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="text-amber-700 font-medium tabular-nums">
                    รอตรวจรับรอง E-Logbook {pendingCount} รายการ
                  </span>
                </>
              )}
              <span aria-hidden="true" className="text-slate-300">·</span>
              <button
                type="button"
                onClick={() => setShowMatrix((prev) => !prev)}
                className="text-xs font-medium text-[#0F2A4A] hover:underline cursor-pointer"
              >
                {showMatrix ? 'ซ่อนตารางสิทธิ์' : 'สิทธิ์เข้าถึงข้อมูล'}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs sm:text-sm text-slate-600">
              <span className="inline-flex items-center gap-1.5 font-semibold text-[#0F2A4A]">
                <Lock className="w-3.5 h-3.5 text-[#0D9488]" aria-hidden="true" />
                ระบบจำกัดสิทธิ์ตามการเข้าสู่ระบบ (Login Required)
              </span>
              <span aria-hidden="true" className="text-slate-300 hidden sm:inline">·</span>
              <span className="text-xs text-slate-500">
                กรุณาเข้าสู่ระบบเพื่อปลดล็อกข้อมูลตามบทบาทของท่าน
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <button
                type="button"
                onClick={() => setShowMatrix((prev) => !prev)}
                className="text-xs font-medium text-[#0F2A4A] hover:underline cursor-pointer"
              >
                {showMatrix ? 'ซ่อนตารางสิทธิ์' : 'ดูตารางระดับสิทธิ์'}
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 self-start xl:self-auto">
            <PWAInstallButton />

            {isAuthenticated && authUser ? (
              <>
                <button
                  type="button"
                  onClick={onOpenQuickSearch}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                  <span>ค้นหาด่วน</span>
                </button>

                {canSyncSheets && (
                  <button
                    type="button"
                    onClick={onOpenSheetsSync}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] text-xs font-medium text-[#0F766E] bg-teal-50 hover:bg-teal-100/80 border border-teal-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>ซิงค์ Sheet</span>
                  </button>
                )}

                {role !== 'student' && (
                  <button
                    type="button"
                    onClick={onOpenStudentDirectory}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isBackOfficeManager
                        ? 'bg-[#0F2A4A] text-white border-[#0F2A4A] hover:bg-[#163B66]'
                        : 'bg-white text-[#0F2A4A] border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {isBackOfficeManager ? (
                      <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : (
                      <Users className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    <span>{isBackOfficeManager ? 'อัปโหลดรูปนักศึกษา' : 'ทำเนียบนักศึกษา'}</span>
                  </button>
                )}

                {isBackOfficeManager && (
                  <button
                    type="button"
                    onClick={() => onOpenAuthModal('manage')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#0F766E] hover:bg-[#0D625C] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <UserCog className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>จัดการสมาชิก (CRUD)</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onOpenAuthModal('password')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                  <span>เปลี่ยนรหัสผ่าน</span>
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>ออกจากระบบ</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => onOpenAuthModal('login')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0F766E] hover:bg-[#0D625C] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
                <span>เข้าสู่ระบบ (Username/Password)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {showMatrix && (
        <div className="border-t border-slate-200 bg-white">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-900">
                ตารางกำหนดระดับการเข้าถึงข้อมูลและสิทธิ์การใช้งาน (Role-Based Access Control)
              </div>
              <button
                type="button"
                onClick={() => setShowMatrix(false)}
                className="text-slate-500 hover:text-slate-900 cursor-pointer"
                aria-label="ปิดตารางสิทธิ์"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-4 font-medium">สิทธิ์การเข้าถึงข้อมูล</th>
                    <th className="py-2 px-3 text-center font-medium">ระดับ 1: นักศึกษาแพทย์</th>
                    <th className="py-2 px-3 text-center font-medium">ระดับ 2: อาจารย์แพทย์</th>
                    <th className="py-2 px-3 text-center font-medium">ระดับ 3A: นักวิชาการรายวิชา</th>
                    <th className="py-2 px-3 text-center font-medium">ระดับ 3B: แอดมิน/ประธานฯ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(
                    [
                      { label: 'ดูคะแนนและผลประเมินของตนเอง / บันทึก E-Logbook', key: 'canViewOwnScores' },
                      { label: 'ดูคะแนนรายบุคคลของนักศึกษาทั้งรุ่น (Cohort)', key: 'canViewCohortScores' },
                      { label: 'กรอกแบบประเมินอาจารย์ (Form A, B, C, E, Well Baby)', key: 'canSubmitFacultyForms' },
                      { label: 'ตรวจรับรอง E-Logbook และอนุมัติแลกเวร / ใบลา', key: 'canApproveLogbook' },
                      { label: 'ติ๊กเลือกแบบประเมิน/หัวข้อรายข้อ และตั้งค่า Ward รายวิชา', key: 'canManageCourseBlueprints' },
                      { label: 'กำหนดสัดส่วน % รายวิชา และคำนวณตัดเกรด MPL', key: 'canConfigureGradingAndMpl' },
                      { label: 'เพิ่ม/แก้ไข/ลบ สมาชิก และออก Username / Password (CRUD)', key: 'canManageAccounts' },
                    ] as const
                  ).map((row) => (
                    <tr key={row.key}>
                      <td className="py-2 pr-4 text-slate-700">{row.label}</td>
                      {(['student', 'faculty', 'course_officer', 'admin'] as const).map((r) => {
                        const allowed = ROLE_PERMISSION_PROFILES[r][row.key];
                        return (
                          <td key={r} className="py-2 px-3 text-center">
                            {allowed ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                                อนุญาต
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-slate-400">
                                <Lock className="w-3 h-3" aria-hidden="true" />
                                จำกัดสิทธิ์
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
