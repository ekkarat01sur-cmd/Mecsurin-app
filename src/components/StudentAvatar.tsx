import { useEffect, useState } from 'react';
import { COHORT_STUDENTS } from '../data/initialMedicalData';
import { StudentPhotoMap } from '../types/medicalSchool';

interface StudentAvatarProps {
  studentId?: string;
  studentName: string;
  studentPhotos?: StudentPhotoMap;
  photoUrl?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<StudentAvatarProps['size']>, string> = {
  xs: 'w-7 h-7 text-[10px] rounded-md',
  sm: 'w-9 h-9 text-xs rounded-lg',
  md: 'w-11 h-11 text-sm rounded-lg',
  lg: 'w-14 h-14 text-base rounded-xl',
  xl: 'w-20 h-20 text-lg rounded-xl',
};

const THAI_TITLE_PREFIX_REGEX =
  /^(?:ศ\.พญ\.|ศ\.นพ\.|รศ\.พญ\.|รศ\.นพ\.|ผศ\.พญ\.|ผศ\.นพ\.|อ\.พญ\.|อ\.นพ\.|นศพ\.|พญ\.|นพ\.|ดร\.|อ\.|นางสาว|น\.ส\.|นาย|นาง)\s*/;

function normalizeThaiName(name: string): string {
  return name.replace(THAI_TITLE_PREFIX_REGEX, '').replace(/\s+/g, '').trim();
}

export function resolveStudentIdByName(studentName: string): string | undefined {
  const target = normalizeThaiName(studentName);
  const match = COHORT_STUDENTS.find(
    (s) => normalizeThaiName(s.studentName) === target
  );
  return match?.studentId;
}

function getThaiInitials(name: string): string {
  const clean = name.replace(THAI_TITLE_PREFIX_REGEX, '').trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`;
  }
  return clean.slice(0, 2) || 'นศ';
}

export function StudentAvatar({
  studentId,
  studentName,
  studentPhotos = {},
  photoUrl,
  size = 'sm',
  className = '',
}: StudentAvatarProps) {
  const [imgError, setImgError] = useState(false);

  const resolvedId = studentId ?? resolveStudentIdByName(studentName);
  const directUrl = photoUrl?.trim();
  const photoSrc = directUrl || (resolvedId ? studentPhotos[resolvedId] : undefined);
  const sizeClass = SIZE_CLASSES[size];

  useEffect(() => {
    setImgError(false);
  }, [photoSrc]);

  if (photoSrc && !imgError) {
    return (
      <img
        src={photoSrc}
        alt={`รูปประจำตัว ${studentName}`}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={`${sizeClass} object-cover object-top border border-slate-200 bg-slate-100 shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      aria-label={studentName}
      className={`${sizeClass} bg-gradient-to-br from-[#0F2A4A] to-[#1E4A7A] text-white font-semibold flex items-center justify-center border border-[#0F2A4A]/20 shrink-0 select-none ${className}`}
    >
      {getThaiInitials(studentName)}
    </div>
  );
}
