import { useMemo, useState } from 'react';
import { BookOpen, Building2, ClipboardList, Search, Users, X } from 'lucide-react';
import {
  ActiveTab,
  ClinicalDepartment,
  CpgProtocol,
  OsceExam,
  StudentPhotoMap,
} from '../types/medicalSchool';
import { COHORT_STUDENTS } from '../data/initialMedicalData';
import { StudentAvatar } from './StudentAvatar';

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentPhotos: StudentPhotoMap;
  departments: ClinicalDepartment[];
  cpgProtocols: CpgProtocol[];
  exams: OsceExam[];
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenStudentDirectory: () => void;
}

export function QuickSearchModal({
  isOpen,
  onClose,
  studentPhotos,
  departments,
  cpgProtocols,
  exams,
  onNavigateTab,
  onOpenStudentDirectory,
}: QuickSearchModalProps) {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return {
      students: COHORT_STUDENTS.filter(
        (s) =>
          !q ||
          s.studentName.toLowerCase().includes(q) ||
          s.studentId.includes(q) ||
          s.group.toLowerCase().includes(q)
      ).slice(0, 5),
      cpgs: cpgProtocols
        .filter(
          (c) =>
            !q ||
            c.title.toLowerCase().includes(q) ||
            c.department.toLowerCase().includes(q) ||
            c.code.toLowerCase().includes(q)
        )
        .slice(0, 4),
      depts: departments
        .filter(
          (d) =>
            !q ||
            d.nameTh.toLowerCase().includes(q) ||
            d.nameEn.toLowerCase().includes(q) ||
            d.code.toLowerCase().includes(q)
        )
        .slice(0, 4),
      exams: exams
        .filter(
          (e) =>
            !q ||
            e.title.toLowerCase().includes(q) ||
            e.cohort.toLowerCase().includes(q)
        )
        .slice(0, 3),
    };
  }, [query, departments, cpgProtocols, exams]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/55 backdrop-blur-xs pt-14 sm:pt-20 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="ค้นหาด่วนทั่วทั้งระบบ"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden">
        <div className="px-4 py-3.5 border-b border-slate-200 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหานักศึกษา (ชื่อ/รหัส), แนวทาง CPG (Sepsis/STEMI), กลุ่มงาน, หรือตารางสอบ..."
            className="flex-1 text-sm text-slate-900 bg-transparent focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
            aria-label="ปิดหน้าต่างค้นหา"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto divide-y divide-slate-100 p-4 space-y-4">
          {/* Students */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" aria-hidden="true" />
                ทำเนียบนักศึกษาแพทย์
              </span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenStudentDirectory();
                }}
                className="text-[#0F2A4A] hover:underline cursor-pointer"
              >
                ดูทั้งหมด →
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {results.students.map((st) => (
                <button
                  key={st.studentId}
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenStudentDirectory();
                  }}
                  className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-left cursor-pointer"
                >
                  <StudentAvatar
                    studentId={st.studentId}
                    studentName={st.studentName}
                    studentPhotos={studentPhotos}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 truncate">
                      {st.studentName}
                    </div>
                    <div className="text-[11px] text-slate-500 tabular-nums">
                      {st.studentId} · ปี {st.yearLevel} · {st.group}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* CPG Protocols */}
          {results.cpgs.length > 0 && (
            <div className="pt-3 space-y-2">
              <div className="text-xs font-semibold text-slate-500 inline-flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                แนวทางเวชปฏิบัติ รพ.สุรินทร์ (CPG)
              </div>
              <div className="space-y-1.5">
                {results.cpgs.map((cpg) => (
                  <button
                    key={cpg.id}
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateTab('library');
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer"
                  >
                    <div className="text-xs font-semibold text-slate-900">{cpg.title}</div>
                    <div className="text-[11px] text-slate-500">
                      {cpg.code} · {cpg.department}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Clinical Departments */}
          {results.depts.length > 0 && (
            <div className="pt-3 space-y-2">
              <div className="text-xs font-semibold text-slate-500 inline-flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
                กลุ่มงานคลินิกและตารางเวร
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {results.depts.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateTab('curriculum');
                    }}
                    className="text-left px-3 py-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer"
                  >
                    <div className="text-xs font-semibold text-slate-900">{d.nameTh}</div>
                    <div className="text-[11px] text-slate-500">
                      {d.code} · ปี {d.yearLevel} · {d.weeks} สัปดาห์
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Exams */}
          {results.exams.length > 0 && (
            <div className="pt-3 space-y-2">
              <div className="text-xs font-semibold text-slate-500 inline-flex items-center gap-1.5">
                <ClipboardList className="w-3.5 h-3.5" aria-hidden="true" />
                การสอบ OSCE / MEQ
              </div>
              <div className="space-y-1">
                {results.exams.map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateTab('assessment');
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    <div className="text-xs font-semibold text-slate-900">{ex.title}</div>
                    <div className="text-[11px] text-slate-500">
                      {ex.date} · {ex.cohort}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
