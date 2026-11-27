import { useMemo, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Lock,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import {
  AcademicYearLevel,
  ClinicalMilestoneBadge,
  CohortStudentRecord,
  StudentCourseScore,
  StudentPhotoMap,
  UserRole,
} from '../types/medicalSchool';
import { COHORT_STUDENTS, CohortStudent } from '../data/initialMedicalData';
import { computePeerCohortBadges } from '../utils/clinicalBadges';
import { BadgeGlyph } from './ClinicalMilestoneBadgesPanel';
import { StudentAvatar } from './StudentAvatar';

interface StudentDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: UserRole;
  activeStudentId: string;
  activeBadges: ClinicalMilestoneBadge[];
  cohortStudents?: CohortStudentRecord[];
  studentScores: StudentCourseScore[];
  studentPhotos: StudentPhotoMap;
  onUploadStudentPhoto: (studentId: string, dataUrl: string) => void;
  onRemoveStudentPhoto: (studentId: string) => void;
  onResetAllPhotos: () => void;
}

function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 360;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const targetW = Math.max(1, Math.round(img.width * scale));
        const targetH = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('เกิดข้อผิดพลาดในการอ่านไฟล์'));
    reader.readAsDataURL(file);
  });
}

export function StudentDirectoryModal({
  isOpen,
  onClose,
  role,
  activeStudentId,
  activeBadges,
  cohortStudents = COHORT_STUDENTS,
  studentScores,
  studentPhotos,
  onUploadStudentPhoto,
  onRemoveStudentPhoto,
  onResetAllPhotos,
}: StudentDirectoryModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState<'all' | AcademicYearLevel>('all');
  const [groupFilter, setGroupFilter] = useState<'ทั้งหมด' | 'กลุ่ม A' | 'กลุ่ม B' | 'กลุ่ม C'>('ทั้งหมด');
  const [activeUploadStudent, setActiveUploadStudent] = useState<CohortStudent | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isAdmin = role === 'admin' || role === 'course_officer';

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return cohortStudents.filter((student) => {
      const matchYear = yearFilter === 'all' || student.yearLevel === yearFilter;
      const matchGroup = groupFilter === 'ทั้งหมด' || student.group === groupFilter;
      const matchSearch =
        !q ||
        student.studentName.toLowerCase().includes(q) ||
        student.studentId.includes(q);
      return matchYear && matchGroup && matchSearch;
    });
  }, [cohortStudents, searchQuery, yearFilter, groupFilter]);

  const uploadedCount = cohortStudents.filter((s) => Boolean(studentPhotos[s.studentId])).length;

  if (!isOpen) return null;

  const handleFileSelected = async (student: CohortStudent, file: File) => {
    setUploadError(null);
    if (!file.type.startsWith('image/')) {
      setUploadError('กรุณาเลือกไฟล์รูปภาพ (JPG, PNG หรือ WEBP)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('ขนาดไฟล์ใหญ่เกินไป กรุณาเลือกไฟล์ไม่เกิน 10 MB');
      return;
    }
    try {
      const compressed = await compressImageToDataUrl(file);
      onUploadStudentPhoto(student.studentId, compressed);
      setActiveUploadStudent(null);
    } catch {
      setUploadError('ไม่สามารถประมวลผลรูปภาพได้ กรุณาลองใหม่อีกครั้ง');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="ทำเนียบนักศึกษาแพทย์และระบบอัปโหลดรูปถ่าย"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-[#0F2A4A] text-white flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-900 truncate">
                ทำเนียบนักศึกษาแพทย์และจัดการรูปถ่ายประจำตัว
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                มีรูปถ่ายประจำตัวแล้ว {uploadedCount} / {cohortStudents.length} คน · แสดงผลอัตโนมัติพร้อมเหรียญความสำเร็จทางคลินิก (Milestone Badges)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && (
              <button
                type="button"
                onClick={onResetAllPhotos}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>คืนค่ารูปเริ่มต้น</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/70 cursor-pointer"
              aria-label="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Role Permission Banner */}
        <div
          className={`px-6 py-2.5 border-b text-xs flex flex-wrap items-center justify-between gap-2 ${
            isAdmin
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}
        >
          {isAdmin ? (
            <span className="inline-flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
              โหมดผู้ดูแลระบบ / นักวิชาการประจำรายวิชา (ระดับ 3): สามารถอัปโหลด เปลี่ยน หรือลบรูปถ่ายนักศึกษาแพทย์ได้ทุกคน
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
              โหมดดูข้อมูลทำเนียบนักศึกษา (การอัปโหลดหรือเปลี่ยนรูปถ่ายสงวนสิทธิ์เฉพาะระดับ 3: นักวิชาการรายวิชา/แอดมิน)
            </span>
          )}
        </div>

        {/* Filters */}
        <div className="px-6 py-3.5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อ หรือรหัสนักศึกษา (เช่น 64104218)..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'all', label: 'ทุกชั้นปี' },
                  { id: '4', label: 'ปี 4' },
                  { id: '5', label: 'ปี 5' },
                  { id: '6', label: 'ปี 6' },
                ] as const
              ).map((y) => (
                <button
                  key={y.id}
                  type="button"
                  onClick={() => setYearFilter(y.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer whitespace-nowrap shrink-0 ${
                    yearFilter === y.id
                      ? 'bg-white text-[#0F2A4A] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {y.label}
                </button>
              ))}
            </div>

            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value as typeof groupFilter)}
              aria-label="กรองตามกลุ่ม"
              className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
            >
              <option value="ทั้งหมด">ทุกกลุ่ม (A / B / C)</option>
              <option value="กลุ่ม A">กลุ่ม A</option>
              <option value="กลุ่ม B">กลุ่ม B</option>
              <option value="กลุ่ม C">กลุ่ม C</option>
            </select>
          </div>
        </div>

        {/* Active Upload Drawer (when Admin selects a student to upload photo) */}
        {isAdmin && activeUploadStudent && (
          <div className="px-6 py-4 bg-[#0F2A4A]/5 border-b border-[#0F2A4A]/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <StudentAvatar
                  studentId={activeUploadStudent.studentId}
                  studentName={activeUploadStudent.studentName}
                  studentPhotos={studentPhotos}
                  size="lg"
                />
                <div>
                  <div className="text-xs font-medium text-[#0F2A4A]">
                    อัปโหลดรูปประจำตัวนักศึกษา
                  </div>
                  <div className="text-sm font-semibold text-slate-900">
                    {activeUploadStudent.studentName}
                  </div>
                  <div className="text-xs text-slate-600 tabular-nums">
                    รหัส {activeUploadStudent.studentId} · ชั้นปีที่ {activeUploadStudent.yearLevel} · {activeUploadStudent.group}
                  </div>
                </div>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) void handleFileSelected(activeUploadStudent, file);
                }}
                className={`flex-1 max-w-md border-2 border-dashed rounded-lg px-4 py-3 text-center transition-colors ${
                  isDragging
                    ? 'border-[#0F2A4A] bg-white'
                    : 'border-slate-300 bg-white/80'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFileSelected(activeUploadStudent, file);
                    e.target.value = '';
                  }}
                />
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#0F2A4A] rounded-lg hover:bg-[#163B66] cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                    เลือกไฟล์รูปจากเครื่อง
                  </button>
                  <span className="text-xs text-slate-500">
                    หรือลากไฟล์มาวางที่นี่ (JPG, PNG)
                  </span>
                </div>
                {uploadError && (
                  <p className="text-xs text-rose-700 mt-1.5">{uploadError}</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveUploadStudent(null);
                  setUploadError(null);
                }}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer self-start sm:self-center"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        )}

        {/* Student Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredStudents.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              ไม่พบข้อมูลนักศึกษาแพทย์ตามเงื่อนไขที่ค้นหา
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStudents.map((student) => {
                const hasPhoto = Boolean(studentPhotos[student.studentId]);
                const studentEarnedBadges = computePeerCohortBadges({
                  studentId: student.studentId,
                  yearLevel: student.yearLevel,
                  scores: studentScores,
                  activeStudentId,
                  activeBadges,
                }).filter((b) => b.earned);

                return (
                  <div
                    key={student.studentId}
                    className="border border-slate-200 rounded-xl p-4 bg-white hover:border-slate-300 transition-colors flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start gap-3.5">
                        <StudentAvatar
                          studentId={student.studentId}
                          studentName={student.studentName}
                          studentPhotos={studentPhotos}
                          size="lg"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-mono text-xs text-slate-500 tabular-nums">
                            {student.studentId}
                          </div>
                          <div className="text-sm font-semibold text-slate-900 truncate">
                            {student.studentName}
                          </div>
                          <div className="text-xs text-slate-600 mt-0.5">
                            ชั้นปีที่ {student.yearLevel} · {student.group}
                          </div>
                          <div className="text-[11px] mt-1 font-medium">
                            {hasPhoto ? (
                              <span className="text-emerald-700">บันทึกภาพถ่ายแล้ว</span>
                            ) : (
                              <span className="text-slate-400">ยังไม่มีภาพถ่ายประจำตัว</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Earned Clinical Milestone Seals */}
                      <div className="pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                          <span>เหรียญความสำเร็จทางคลินิก</span>
                          <span className="font-mono font-semibold text-slate-700 tabular-nums">
                            {studentEarnedBadges.length} รายการ
                          </span>
                        </div>
                        {studentEarnedBadges.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {studentEarnedBadges.map((badge) => (
                              <span
                                key={badge.id}
                                title={`${badge.title} — ${badge.criteriaText}`}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium ${
                                  badge.tier === 'gold'
                                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                                    : badge.tier === 'teal'
                                      ? 'bg-emerald-50/70 border-emerald-200 text-[#0F766E]'
                                      : 'bg-slate-50 border-slate-200 text-[#0F2A4A]'
                                }`}
                              >
                                <BadgeGlyph iconKey={badge.iconKey} className="w-3 h-3 shrink-0" />
                                <span>{badge.shortTitle}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400">
                            อยู่ระหว่างสะสมเกณฑ์ความสำเร็จทางคลินิก
                          </div>
                        )}
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveUploadStudent(student);
                            setUploadError(null);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0F2A4A] bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{hasPhoto ? 'เปลี่ยนรูปถ่าย' : 'อัปโหลดรูปถ่าย'}</span>
                        </button>

                        {hasPhoto && (
                          <button
                            type="button"
                            onClick={() => onRemoveStudentPhoto(student.studentId)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                            title="ลบรูปถ่าย"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>ลบ</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
