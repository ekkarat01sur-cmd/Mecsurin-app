import { Users, X } from 'lucide-react';
import {
  ClinicalPersonnelRecord,
  CohortStudentRecord,
  StudentPhotoMap,
  UserRole,
} from '../types/medicalSchool';
import {
  ClinicalPersonnelDirectoryPanel,
  DirectoryCategoryTab,
} from './ClinicalPersonnelDirectoryPanel';

interface PersonnelDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: UserRole;
  personnel: ClinicalPersonnelRecord[];
  cohortStudents: CohortStudentRecord[];
  studentPhotos: StudentPhotoMap;
  initialCategory: DirectoryCategoryTab;
  initialYearFilter: string;
  onOpenAdminBackOffice?: () => void;
  onOpenStudentPhotoDirectory?: () => void;
}

export function PersonnelDirectoryModal({
  isOpen,
  onClose,
  role,
  personnel,
  cohortStudents,
  studentPhotos,
  initialCategory,
  initialYearFilter,
  onOpenAdminBackOffice,
  onOpenStudentPhotoDirectory,
}: PersonnelDirectoryModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="ทำเนียบรายชื่อแพทย์ Intern แพทย์พี่เลี้ยง แพทย์ประจำบ้าน และนักศึกษาแพทย์"
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 bg-[#091A32] text-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-white/10 text-[#5EEAD4] flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold truncate">
                ทำเนียบรายชื่อแต่ละปีและข้อมูลพื้นฐาน (แพทย์ Intern · แพทย์พี่เลี้ยง · แพทย์ประจำบ้าน · นศพ.)
              </h2>
              <p className="text-xs text-slate-300 mt-0.5 tabular-nums">
                แพทย์และพี่เลี้ยง {personnel.length} ท่าน · นักศึกษาแพทย์ชั้นคลินิก {cohortStudents.length} คน
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 cursor-pointer shrink-0"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          <ClinicalPersonnelDirectoryPanel
            key={`${initialCategory}-${initialYearFilter}`}
            role={role}
            personnel={personnel}
            cohortStudents={cohortStudents}
            studentPhotos={studentPhotos}
            initialCategory={initialCategory}
            initialYearFilter={initialYearFilter}
            onOpenAdminBackOffice={
              onOpenAdminBackOffice
                ? () => {
                    onClose();
                    onOpenAdminBackOffice();
                  }
                : undefined
            }
            onOpenStudentPhotoDirectory={
              onOpenStudentPhotoDirectory
                ? () => {
                    onClose();
                    onOpenStudentPhotoDirectory();
                  }
                : undefined
            }
          />
        </div>
      </div>
    </div>
  );
}
