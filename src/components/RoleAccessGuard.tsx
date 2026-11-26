import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { UserRole } from '../types/medicalSchool';

export const ADMIN_OFFICER_ROLES: readonly UserRole[] = ['admin', 'course_officer'];

export function hasRoleAccess(
  role: UserRole | null | undefined,
  isAuthenticated: boolean,
  allowedRoles: readonly UserRole[]
): boolean {
  if (!isAuthenticated || !role) return false;
  return allowedRoles.includes(role);
}

interface RoleAccessGuardProps {
  role: UserRole | null | undefined;
  isAuthenticated: boolean;
  allowedRoles: readonly UserRole[];
  restrictedTitle?: string;
  restrictedDescription?: string;
  showLockedNotice?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

export function RoleAccessGuard({
  role,
  isAuthenticated,
  allowedRoles,
  restrictedTitle = 'จำกัดสิทธิ์การเข้าถึง (Restricted Action)',
  restrictedDescription = 'การดำเนินการนี้สงวนสิทธิ์เฉพาะแอดมิน (ระดับ 3B) หรือนักวิชาการประจำรายวิชา (ระดับ 3A) เท่านั้น',
  showLockedNotice = false,
  fallback,
  children,
}: RoleAccessGuardProps) {
  if (hasRoleAccess(role, isAuthenticated, allowedRoles)) {
    return <>{children}</>;
  }

  if (fallback !== undefined) {
    return <>{fallback}</>;
  }

  if (!showLockedNotice) {
    return null;
  }

  return (
    <div
      role="status"
      className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3 text-xs text-slate-700"
    >
      <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="space-y-0.5">
        <div className="font-semibold text-slate-900">{restrictedTitle}</div>
        <p className="text-slate-600">{restrictedDescription}</p>
      </div>
    </div>
  );
}
