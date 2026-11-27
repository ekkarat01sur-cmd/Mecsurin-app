import { useRef, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Clock,
  Database,
  Download,
  GraduationCap,
  Lock,
  QrCode,
  RotateCcw,
  Shield,
  Upload,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import {
  AcademicYearLevel,
  Announcement,
  BedsideCheckInRecord,
  ClinicalDepartment,
  ClinicalPersonnelCategory,
  ClinicalPersonnelRecord,
  ClinicalReferenceMaterial,
  ClinicalSetting,
  ClinicalSkillMasteryItem,
  CohortStudentRecord,
  ConferenceEvent,
  CourseGrade,
  CourseGradingConfig,
  CpgProtocol,
  DutyShift,
  EpaMilestone,
  FacultyGeneratedQrStation,
  LeaveRequest,
  LogbookEntry,
  LogbookStatus,
  OsceEvaluationRecord,
  OsceExam,
  PersonnelYearTag,
  PreceptorFeedback,
  ProcedureQuota,
  ProcedureRole,
  ResearchProject,
  RoomBooking,
  RoomResource,
  StudentCourseScore,
  StudentPhotoMap,
  UserRole,
  WelfareRequest,
} from '../types/medicalSchool';
import { PRESET_MEMBER_PORTRAITS } from '../data/initialMedicalData';
import { createDefaultEnabledItemsMap } from '../data/evaluationFormsSchema';
import { sanitizeAvatarUrlInput } from '../utils/imageUtils';
import { AdminEntityCrudList } from './admin/AdminEntityCrudList';

type BackOfficeDomain =
  | 'assessments'
  | 'calendar'
  | 'shifts'
  | 'courses'
  | 'resources'
  | 'personnel'
  | 'system';

interface AdminBackOfficeModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: UserRole;
  currentUserName: string;
  departments: ClinicalDepartment[];
  onSaveDepartments: (next: ClinicalDepartment[]) => void;
  gradingConfigs: CourseGradingConfig[];
  onSaveGradingConfigs: (next: CourseGradingConfig[]) => void;
  exams: OsceExam[];
  onSaveExams: (next: OsceExam[]) => void;
  evaluations: OsceEvaluationRecord[];
  onSaveEvaluations: (next: OsceEvaluationRecord[]) => void;
  studentScores: StudentCourseScore[];
  onSaveStudentScores: (next: StudentCourseScore[]) => void;
  epas: EpaMilestone[];
  onSaveEpas: (next: EpaMilestone[]) => void;
  courseGrades: CourseGrade[];
  onSaveCourseGrades: (next: CourseGrade[]) => void;
  conferences: ConferenceEvent[];
  onSaveConferences: (next: ConferenceEvent[]) => void;
  announcements: Announcement[];
  onSaveAnnouncements: (next: Announcement[]) => void;
  shifts: DutyShift[];
  onSaveShifts: (next: DutyShift[]) => void;
  leaveRequests: LeaveRequest[];
  onSaveLeaveRequests: (next: LeaveRequest[]) => void;
  roomBookings: RoomBooking[];
  onSaveRoomBookings: (next: RoomBooking[]) => void;
  rooms: RoomResource[];
  onSaveRooms: (next: RoomResource[]) => void;
  quotas: ProcedureQuota[];
  onSaveQuotas: (next: ProcedureQuota[]) => void;
  clinicalSkills: ClinicalSkillMasteryItem[];
  onSaveClinicalSkills: (next: ClinicalSkillMasteryItem[]) => void;
  logbookEntries: LogbookEntry[];
  onSaveLogbookEntries: (next: LogbookEntry[]) => void;
  cpgProtocols: CpgProtocol[];
  onSaveCpgProtocols: (next: CpgProtocol[]) => void;
  referenceMaterials: ClinicalReferenceMaterial[];
  onSaveReferenceMaterials: (next: ClinicalReferenceMaterial[]) => void;
  researchProjects: ResearchProject[];
  onSaveResearchProjects: (next: ResearchProject[]) => void;
  welfareRequests: WelfareRequest[];
  onSaveWelfareRequests: (next: WelfareRequest[]) => void;
  preceptorFeedbacks: PreceptorFeedback[];
  onSavePreceptorFeedbacks: (next: PreceptorFeedback[]) => void;
  bedsideCheckIns: BedsideCheckInRecord[];
  onSaveBedsideCheckIns: (next: BedsideCheckInRecord[]) => void;
  customQrStations: FacultyGeneratedQrStation[];
  onSaveCustomQrStations: (next: FacultyGeneratedQrStation[]) => void;
  clinicalPersonnel: ClinicalPersonnelRecord[];
  onSaveClinicalPersonnel: (next: ClinicalPersonnelRecord[]) => void;
  cohortStudents: CohortStudentRecord[];
  onSaveCohortStudents: (next: CohortStudentRecord[]) => void;
  studentPhotos?: StudentPhotoMap;
  onSyncStudentPhoto?: (studentId: string, photoUrl: string) => void;
  onOpenAuthManage: () => void;
  onOpenQrGenerator: () => void;
  onOpenSheetsSync: () => void;
  onExportFullBackup: () => void;
  onImportFullBackup: (rawJson: string) => void;
  onResetFactoryDefaults: () => void;
  onNotify: (msg: string) => void;
}

const DOMAIN_TABS: Array<{
  id: BackOfficeDomain;
  label: string;
  icon: typeof ClipboardCheck;
}> = [
  { id: 'assessments', label: 'แบบประเมิน & เกรด', icon: ClipboardCheck },
  { id: 'calendar', label: 'ปฏิทิน & ประกาศ', icon: CalendarDays },
  { id: 'shifts', label: 'ตารางเวร ลา & ห้อง', icon: Clock },
  { id: 'courses', label: 'รายวิชา & ทักษะ', icon: GraduationCap },
  { id: 'resources', label: 'Logbook CPG วิจัย', icon: BookOpen },
  { id: 'personnel', label: 'บุคลากร & นศพ.', icon: Users },
  { id: 'system', label: 'สมาชิก QR & สำรองข้อมูล', icon: Database },
];

function parseLines(raw: string | number | boolean): string[] {
  return String(raw ?? '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseCommaList(raw: string | number | boolean): string[] {
  return String(raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function AdminBackOfficeModal({
  isOpen,
  onClose,
  role,
  currentUserName,
  departments,
  onSaveDepartments,
  gradingConfigs,
  onSaveGradingConfigs,
  exams,
  onSaveExams,
  evaluations,
  onSaveEvaluations,
  studentScores,
  onSaveStudentScores,
  epas,
  onSaveEpas,
  courseGrades,
  onSaveCourseGrades,
  conferences,
  onSaveConferences,
  announcements,
  onSaveAnnouncements,
  shifts,
  onSaveShifts,
  leaveRequests,
  onSaveLeaveRequests,
  roomBookings,
  onSaveRoomBookings,
  rooms,
  onSaveRooms,
  quotas,
  onSaveQuotas,
  clinicalSkills,
  onSaveClinicalSkills,
  logbookEntries,
  onSaveLogbookEntries,
  cpgProtocols,
  onSaveCpgProtocols,
  referenceMaterials,
  onSaveReferenceMaterials,
  researchProjects,
  onSaveResearchProjects,
  welfareRequests,
  onSaveWelfareRequests,
  preceptorFeedbacks,
  onSavePreceptorFeedbacks,
  bedsideCheckIns,
  onSaveBedsideCheckIns,
  customQrStations,
  onSaveCustomQrStations,
  clinicalPersonnel,
  onSaveClinicalPersonnel,
  cohortStudents,
  onSaveCohortStudents,
  studentPhotos = {},
  onSyncStudentPhoto,
  onOpenAuthManage,
  onOpenQrGenerator,
  onOpenSheetsSync,
  onExportFullBackup,
  onImportFullBackup,
  onResetFactoryDefaults,
  onNotify,
}: AdminBackOfficeModalProps) {
  const [domain, setDomain] = useState<BackOfficeDomain>('assessments');
  const [subEntity, setSubEntity] = useState<string>('gradingConfigs');
  const [confirmFactoryReset, setConfirmFactoryReset] = useState(false);
  const backupFileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  if (role !== 'admin') {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
        role="dialog"
        aria-modal="true"
      >
        <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
          <div className="flex items-center gap-2 text-slate-900 font-semibold">
            <Lock className="w-5 h-5 text-rose-700" aria-hidden="true" />
            <span>จำกัดสิทธิ์เฉพาะผู้ดูแลระบบ (Admin ระดับ 3B เท่านั้น)</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            ระบบหลังบ้านจัดการข้อมูลทุกส่วนของพอร์ทัล (CRUD) สงวนสิทธิ์เฉพาะบัญชีแอดมิน (ระดับ 3B) เท่านั้น
          </p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-white bg-[#091A32] rounded-lg cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>
    );
  }

  const switchDomain = (nextDomain: BackOfficeDomain) => {
    setDomain(nextDomain);
    if (nextDomain === 'assessments') setSubEntity('gradingConfigs');
    else if (nextDomain === 'calendar') setSubEntity('conferences');
    else if (nextDomain === 'shifts') setSubEntity('shifts');
    else if (nextDomain === 'courses') setSubEntity('departments');
    else if (nextDomain === 'resources') setSubEntity('logbookEntries');
    else if (nextDomain === 'personnel') setSubEntity('clinicalPersonnel');
    else setSubEntity('system');
  };

  const deptOptions = departments.map((d) => ({ value: d.nameTh, label: d.nameTh }));
  const courseOptions = gradingConfigs.map((c) => ({
    value: c.courseCode,
    label: `${c.courseCode} · ${c.courseName}`,
  }));
  const roomOptions = rooms.map((r) => ({ value: r.id, label: `${r.name} (${r.location})` }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-2 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="ระบบหลังบ้านสำหรับผู้ดูแลระบบ (Admin Back-Office CMS)"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Admin Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-white/10 flex items-center justify-between gap-4 bg-[#091A32] text-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-[#0D9488] text-white flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold truncate">
                ระบบหลังบ้านจัดการข้อมูลทุกส่วน (Admin Back-Office CMS)
              </h2>
              <p className="text-xs text-slate-300 mt-0.5 truncate">
                ผู้ดูแลระบบ: {currentUserName} (ระดับ 3B) · เพิ่ม แก้ไข ลบข้อมูลได้ทุกหมวดในพอร์ทัล
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดระบบหลังบ้าน"
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Domain Navigation */}
        <div className="px-5 sm:px-6 py-2.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center gap-1.5">
          {DOMAIN_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = domain === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => switchDomain(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#091A32] text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sub-Entity Selector Bar */}
        {domain !== 'system' && (
          <div className="px-5 sm:px-6 py-2.5 border-b border-slate-200 bg-white flex flex-wrap items-center gap-1.5">
            {domain === 'assessments' && (
              <>
                {[
                  { id: 'gradingConfigs', label: `โครงสร้างแบบประเมิน & MPL (${gradingConfigs.length})` },
                  { id: 'exams', label: `ตารางสอบ OSCE / MEQ (${exams.length})` },
                  { id: 'evaluations', label: `ผลคะแนน OSCE (${evaluations.length})` },
                  { id: 'studentScores', label: `คะแนนรายวิชานักศึกษา (${studentScores.length})` },
                  { id: 'epas', label: `สมรรถนะ EPA (${epas.length})` },
                  { id: 'courseGrades', label: `เกรดสรุปผล (${courseGrades.length})` },
                  { id: 'preceptorFeedbacks', label: `ผลประเมินอาจารย์ (${preceptorFeedbacks.length})` },
                ].map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSubEntity(sub.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                      subEntity === sub.id
                        ? 'bg-[#0F766E] text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </>
            )}

            {domain === 'calendar' && (
              <>
                {[
                  { id: 'conferences', label: `ปฏิทินกิจกรรมวิชาการ (${conferences.length})` },
                  { id: 'announcements', label: `ประกาศข่าวสารศูนย์ฯ (${announcements.length})` },
                ].map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSubEntity(sub.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                      subEntity === sub.id
                        ? 'bg-[#0F766E] text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </>
            )}

            {domain === 'shifts' && (
              <>
                {[
                  { id: 'shifts', label: `ตารางเวร & การจองเวร (${shifts.length})` },
                  { id: 'leaveRequests', label: `ใบลาปฏิบัติงาน (${leaveRequests.length})` },
                  { id: 'roomBookings', label: `การจองห้องประชุม (${roomBookings.length})` },
                  { id: 'rooms', label: `ห้องประชุม/ห้องฝึกทักษะ (${rooms.length})` },
                ].map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSubEntity(sub.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                      subEntity === sub.id
                        ? 'bg-[#0F766E] text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </>
            )}

            {domain === 'courses' && (
              <>
                {[
                  { id: 'departments', label: `รายละเอียดรายวิชา/กลุ่มงาน (${departments.length})` },
                  { id: 'quotas', label: `เกณฑ์หัตถการบังคับ (${quotas.length})` },
                  { id: 'clinicalSkills', label: `ทักษะทางคลินิก (${clinicalSkills.length})` },
                ].map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSubEntity(sub.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                      subEntity === sub.id
                        ? 'bg-[#0F766E] text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </>
            )}

            {domain === 'resources' && (
              <>
                {[
                  { id: 'logbookEntries', label: `บันทึก E-Logbook (${logbookEntries.length})` },
                  { id: 'cpgProtocols', label: `แนวทาง CPG (${cpgProtocols.length})` },
                  { id: 'referenceMaterials', label: `ตำรา/อุปกรณ์ห้องสมุด (${referenceMaterials.length})` },
                  { id: 'researchProjects', label: `โครงการวิจัย IRB (${researchProjects.length})` },
                  { id: 'welfareRequests', label: `สวัสดิการ/นัดที่ปรึกษา (${welfareRequests.length})` },
                  { id: 'bedsideCheckIns', label: `บันทึกสแกนข้างเตียง (${bedsideCheckIns.length})` },
                ].map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSubEntity(sub.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                      subEntity === sub.id
                        ? 'bg-[#0F766E] text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>{sub.label}</span>
                  </button>
                ))}
              </>
            )}

            {domain === 'personnel' && (
              <>
                {[
                  {
                    id: 'clinicalPersonnel',
                    label: `แพทย์ Intern · พี่เลี้ยง · ประจำบ้าน (${clinicalPersonnel.length})`,
                  },
                  {
                    id: 'cohortStudents',
                    label: `นักศึกษาแพทย์ชั้นคลินิก ปี 4–6 (${cohortStudents.length})`,
                  },
                ].map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSubEntity(sub.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                      subEntity === sub.id
                        ? 'bg-[#0F766E] text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {/* 1. ASSESSMENTS */}
          {domain === 'assessments' && subEntity === 'gradingConfigs' && (
            <AdminEntityCrudList<CourseGradingConfig>
              title="โครงสร้างแบบประเมินรายวิชาและเกณฑ์ตัดเกรด (MPL & Weights)"
              subtitle="เพิ่ม แก้ไข หรือลบรายวิชาที่ประเมิน พร้อมกำหนดเกณฑ์ MPL ค่าน้ำหนัก และหอผู้ป่วยย่อย"
              items={gradingConfigs}
              getId={(c) => c.courseCode}
              getBadge={(c) => c.courseCode}
              getTitle={(c) => c.courseName}
              getMeta={(c) =>
                `${c.credits} หน่วยกิต · MPL ${c.mplPercent}% · Form E ≥ ${c.formEMinPercent}% · OSCE ≥ ${c.osceMinPercent}% · สอบข้อเขียน ≥ ${c.writtenMinPercent}%`
              }
              fields={[
                { key: 'courseCode', label: 'รหัสวิชา (เช่น SUR-MED-401)', type: 'text', required: true, readOnlyOnEdit: true },
                { key: 'courseName', label: 'ชื่อรายวิชา', type: 'text', required: true },
                { key: 'credits', label: 'หน่วยกิต', type: 'number', required: true, min: 1, max: 24 },
                { key: 'mplPercent', label: 'เกณฑ์ผ่านขั้นต่ำ MPL (%)', type: 'number', required: true, min: 0, max: 100 },
                { key: 'formEMinPercent', label: 'เกณฑ์ขั้นต่ำ Form E (%)', type: 'number', required: true, min: 0, max: 100 },
                { key: 'osceMinPercent', label: 'เกณฑ์ขั้นต่ำ OSCE (%)', type: 'number', required: true, min: 0, max: 100 },
                { key: 'writtenMinPercent', label: 'เกณฑ์ขั้นต่ำข้อเขียน (%)', type: 'number', required: true, min: 0, max: 100 },
                { key: 'weightFormA', label: 'น้ำหนัก Form A (%)', type: 'number', min: 0, max: 100 },
                { key: 'weightFormB', label: 'น้ำหนัก Form B (%)', type: 'number', min: 0, max: 100 },
                { key: 'weightFormC', label: 'น้ำหนัก Form C (%)', type: 'number', min: 0, max: 100 },
                { key: 'weightWellBaby', label: 'น้ำหนัก Well Baby (%)', type: 'number', min: 0, max: 100 },
                { key: 'weightFormE', label: 'น้ำหนัก Form E (%)', type: 'number', min: 0, max: 100 },
                { key: 'weightOsce', label: 'น้ำหนัก OSCE (%)', type: 'number', min: 0, max: 100 },
                { key: 'weightWritten', label: 'น้ำหนักข้อเขียน (%)', type: 'number', min: 0, max: 100 },
                { key: 'subrotations', label: 'จุดฝึก / หอผู้ป่วยย่อย (คั่นด้วยจุลภาค ,)', type: 'text', colSpan: 2 },
                { key: 'strictMedicalMpl', label: 'บังคับเกณฑ์ Strict MPL (< MPL ได้เกรด F)', type: 'checkbox' },
                { key: 'enforceAttitudeGate', label: 'บังคับ Attitude Gate (ไม่ผ่านเจตคติได้เกรด F)', type: 'checkbox' },
              ]}
              createDefaults={() => ({
                courseCode: `SUR-NEW-${String(gradingConfigs.length + 1).padStart(2, '0')}`,
                courseName: '',
                credits: 4,
                mplPercent: 60,
                formEMinPercent: 60,
                osceMinPercent: 60,
                writtenMinPercent: 60,
                weightFormA: 15,
                weightFormB: 15,
                weightFormC: 10,
                weightWellBaby: 0,
                weightFormE: 10,
                weightOsce: 25,
                weightWritten: 25,
                subrotations: 'OPD, IPD สามัญ',
                strictMedicalMpl: true,
                enforceAttitudeGate: true,
              })}
              toFormValues={(c) => ({
                courseCode: c.courseCode,
                courseName: c.courseName,
                credits: c.credits,
                mplPercent: c.mplPercent,
                formEMinPercent: c.formEMinPercent,
                osceMinPercent: c.osceMinPercent,
                writtenMinPercent: c.writtenMinPercent,
                weightFormA: c.weights.formA,
                weightFormB: c.weights.formB,
                weightFormC: c.weights.formC,
                weightWellBaby: c.weights.wellBaby,
                weightFormE: c.weights.formE,
                weightOsce: c.weights.osce,
                weightWritten: c.weights.writtenExam,
                subrotations: c.subrotations.join(', '),
                strictMedicalMpl: c.strictMedicalMpl,
                enforceAttitudeGate: c.enforceAttitudeGate,
              })}
              fromFormValues={(v, existing) => ({
                courseCode: String(v.courseCode).trim().toUpperCase(),
                courseName: String(v.courseName).trim(),
                credits: Number(v.credits) || 4,
                enabledForms: existing?.enabledForms ?? ['form_a', 'form_b', 'form_c', 'form_e'],
                enabledItems: existing?.enabledItems ?? createDefaultEnabledItemsMap(),
                customItems: existing?.customItems ?? {},
                itemGradeMapping: existing?.itemGradeMapping ?? {},
                customGradeGroups: existing?.customGradeGroups ?? [],
                subrotations: parseCommaList(v.subrotations),
                weights: {
                  formA: Number(v.weightFormA) || 0,
                  formB: Number(v.weightFormB) || 0,
                  formC: Number(v.weightFormC) || 0,
                  wellBaby: Number(v.weightWellBaby) || 0,
                  formE: Number(v.weightFormE) || 0,
                  osce: Number(v.weightOsce) || 0,
                  writtenExam: Number(v.weightWritten) || 0,
                },
                mplPercent: Number(v.mplPercent) || 60,
                formEMinPercent: Number(v.formEMinPercent) || 60,
                osceMinPercent: Number(v.osceMinPercent) || 60,
                writtenMinPercent: Number(v.writtenMinPercent) || 60,
                strictMedicalMpl: Boolean(v.strictMedicalMpl),
                enforceAttitudeGate: Boolean(v.enforceAttitudeGate),
              })}
              onCreate={(item) => {
                if (gradingConfigs.some((c) => c.courseCode === item.courseCode)) {
                  onNotify(`รหัสวิชา ${item.courseCode} มีอยู่ในระบบแล้ว`);
                  return;
                }
                onSaveGradingConfigs([...gradingConfigs, item]);
                onNotify(`เพิ่มโครงสร้างประเมินรายวิชา ${item.courseCode} แล้ว`);
              }}
              onUpdate={(item) => {
                onSaveGradingConfigs(
                  gradingConfigs.map((c) => (c.courseCode === item.courseCode ? item : c))
                );
                onNotify(`อัปเดตโครงสร้างรายวิชา ${item.courseCode} แล้ว`);
              }}
              onDelete={(code) => {
                onSaveGradingConfigs(gradingConfigs.filter((c) => c.courseCode !== code));
                onNotify(`ลบโครงสร้างประเมินรายวิชา ${code} แล้ว`);
              }}
            />
          )}

          {domain === 'assessments' && subEntity === 'exams' && (
            <AdminEntityCrudList<OsceExam>
              title="กำหนดการสอบ OSCE / MEQ / MCQ / Long Case"
              subtitle="จัดการตารางสอบ วัน-เวลา สถานที่ จำนวนสถานี และสถานะการสอบ"
              items={exams}
              getId={(e) => e.id}
              getBadge={(e) => `${e.format} · ${e.date}`}
              getTitle={(e) => e.title}
              getMeta={(e) => `${e.cohort} · ${e.time} · ${e.location} · ${e.stations} สถานี (${e.status})`}
              fields={[
                { key: 'title', label: 'ชื่อรอบการสอบ', type: 'text', required: true, colSpan: 2 },
                { key: 'cohort', label: 'ชั้นปี / รุ่นนักศึกษา', type: 'text', required: true },
                {
                  key: 'format',
                  label: 'รูปแบบการสอบ',
                  type: 'select',
                  options: [
                    { value: 'OSCE', label: 'OSCE' },
                    { value: 'MEQ', label: 'MEQ' },
                    { value: 'MCQ', label: 'MCQ' },
                    { value: 'Long Case', label: 'Long Case' },
                  ],
                },
                { key: 'date', label: 'วันที่สอบ', type: 'text', required: true, placeholder: 'เช่น 28 พ.ย. 2569' },
                { key: 'time', label: 'ช่วงเวลา', type: 'text', required: true, placeholder: 'เช่น 08:30 - 12:00 น.' },
                { key: 'location', label: 'สถานที่สอบ', type: 'text', required: true },
                { key: 'stations', label: 'จำนวนสถานี', type: 'number', required: true, min: 1, max: 30 },
                {
                  key: 'status',
                  label: 'สถานะการสอบ',
                  type: 'select',
                  options: [
                    { value: 'กำลังจะมาถึง', label: 'กำลังจะมาถึง' },
                    { value: 'เปิดลงทะเบียน', label: 'เปิดลงทะเบียน' },
                    { value: 'ประกาศผลแล้ว', label: 'ประกาศผลแล้ว' },
                  ],
                },
              ]}
              createDefaults={() => ({
                title: '',
                cohort: 'ชั้นปีที่ 6 (Extern)',
                format: 'OSCE',
                date: '30 พ.ย. 2569',
                time: '08:30 - 12:00 น.',
                location: 'ศูนย์ทักษะทางคลินิก อาคารศูนย์แพทยฯ',
                stations: 8,
                status: 'กำลังจะมาถึง',
              })}
              toFormValues={(e) => ({ ...e })}
              fromFormValues={(v, existing) => ({
                id: existing?.id ?? `exam-${Date.now()}`,
                title: String(v.title).trim(),
                cohort: String(v.cohort).trim(),
                date: String(v.date).trim(),
                time: String(v.time).trim(),
                location: String(v.location).trim(),
                stations: Number(v.stations) || 1,
                format: v.format as OsceExam['format'],
                status: v.status as OsceExam['status'],
              })}
              onCreate={(item) => {
                onSaveExams([item, ...exams]);
                onNotify('เพิ่มตารางสอบใหม่เรียบร้อยแล้ว');
              }}
              onUpdate={(item) => {
                onSaveExams(exams.map((x) => (x.id === item.id ? item : x)));
                onNotify('แก้ไขตารางสอบเรียบร้อยแล้ว');
              }}
              onDelete={(id) => {
                onSaveExams(exams.filter((x) => x.id !== id));
                onNotify('ลบรายการตารางสอบแล้ว');
              }}
            />
          )}

          {domain === 'assessments' && subEntity === 'evaluations' && (
            <AdminEntityCrudList<OsceEvaluationRecord>
              title="บันทึกผลคะแนนประเมิน OSCE / Mini-CEX"
              subtitle="เพิ่ม แก้ไข หรือลบคะแนนประเมินรายสถานีของนักศึกษา"
              items={evaluations}
              getId={(e) => e.id}
              getBadge={(e) => `${e.date} · ${e.totalScore}/25`}
              getTitle={(e) => `${e.studentName} — ${e.stationName}`}
              getMeta={(e) => `ผู้ประเมิน: ${e.evaluatorName} · ${e.passed ? 'ผ่านเกณฑ์' : 'ไม่ผ่านเกณฑ์'} · ${e.comments}`}
              fields={[
                { key: 'stationName', label: 'ชื่อสถานีประเมิน', type: 'text', required: true, colSpan: 2 },
                { key: 'studentName', label: 'ชื่อนักศึกษาแพทย์', type: 'text', required: true },
                { key: 'evaluatorName', label: 'อาจารย์ผู้ประเมิน', type: 'text', required: true },
                { key: 'date', label: 'วันที่ประเมิน', type: 'text', required: true },
                { key: 'historyTaking', label: 'History Taking (0-5)', type: 'number', min: 0, max: 5 },
                { key: 'physicalExam', label: 'Physical Exam (0-5)', type: 'number', min: 0, max: 5 },
                { key: 'clinicalReasoning', label: 'Clinical Reasoning (0-5)', type: 'number', min: 0, max: 5 },
                { key: 'communication', label: 'Communication (0-5)', type: 'number', min: 0, max: 5 },
                { key: 'professionalism', label: 'Professionalism (0-5)', type: 'number', min: 0, max: 5 },
                { key: 'passed', label: 'ผ่านเกณฑ์การประเมิน (Passed)', type: 'checkbox' },
                { key: 'comments', label: 'ข้อเสนอแนะอาจารย์', type: 'textarea', colSpan: 2 },
              ]}
              createDefaults={() => ({
                stationName: 'สถานีที่ 1: Acute Chest Pain & STEMI Fast Track',
                studentName: 'นศพ.ธนภัทร ศรีสุรินทร์',
                evaluatorName: currentUserName,
                date: '24 พ.ย. 2569',
                historyTaking: 4,
                physicalExam: 4,
                clinicalReasoning: 4,
                communication: 4,
                professionalism: 4,
                passed: true,
                comments: 'ประเมินผลเป็นไปตามเกณฑ์มาตรฐาน',
              })}
              toFormValues={(e) => ({
                stationName: e.stationName,
                studentName: e.studentName,
                evaluatorName: e.evaluatorName,
                date: e.date,
                historyTaking: e.scores.historyTaking,
                physicalExam: e.scores.physicalExam,
                clinicalReasoning: e.scores.clinicalReasoning,
                communication: e.scores.communication,
                professionalism: e.scores.professionalism,
                passed: e.passed,
                comments: e.comments,
              })}
              fromFormValues={(v, existing) => {
                const h = Number(v.historyTaking) || 0;
                const p = Number(v.physicalExam) || 0;
                const r = Number(v.clinicalReasoning) || 0;
                const c = Number(v.communication) || 0;
                const pr = Number(v.professionalism) || 0;
                return {
                  id: existing?.id ?? `eval-${Date.now()}`,
                  stationName: String(v.stationName).trim(),
                  studentName: String(v.studentName).trim(),
                  evaluatorName: String(v.evaluatorName).trim(),
                  date: String(v.date).trim(),
                  scores: {
                    historyTaking: h,
                    physicalExam: p,
                    clinicalReasoning: r,
                    communication: c,
                    professionalism: pr,
                  },
                  totalScore: h + p + r + c + pr,
                  passed: Boolean(v.passed),
                  comments: String(v.comments ?? '').trim(),
                };
              }}
              onCreate={(item) => {
                onSaveEvaluations([item, ...evaluations]);
                onNotify('เพิ่มผลคะแนน OSCE เรียบร้อยแล้ว');
              }}
              onUpdate={(item) => {
                onSaveEvaluations(evaluations.map((x) => (x.id === item.id ? item : x)));
                onNotify('อัปเดตผลคะแนน OSCE เรียบร้อยแล้ว');
              }}
              onDelete={(id) => {
                onSaveEvaluations(evaluations.filter((x) => x.id !== id));
                onNotify('ลบผลคะแนน OSCE แล้ว');
              }}
            />
          )}

          {domain === 'assessments' && subEntity === 'studentScores' && (
            <AdminEntityCrudList<StudentCourseScore>
              title="ตารางคะแนนรายวิชาของนักศึกษา (Student Course Scores)"
              subtitle="เพิ่ม แก้ไข หรือลบคะแนน Form A–E, OSCE, ข้อเขียน และวันลาขาดของนักศึกษาแต่ละคน"
              items={studentScores}
              getId={(s) => s.id}
              getBadge={(s) => `${s.courseCode} · ${s.studentId}`}
              getTitle={(s) => `${s.studentName} (ปี ${s.yearLevel})`}
              getMeta={(s) =>
                `A:${s.formA ?? '-'}% B:${s.formB ?? '-'}% C:${s.formC ?? '-'}% E:${s.formE ?? '-'}% · OSCE:${s.osce ?? '-'}% · ข้อเขียน:${s.writtenExam ?? '-'}% · ขาด ${s.absenceDays} วัน`
              }
              fields={[
                { key: 'studentId', label: 'รหัสนักศึกษา', type: 'text', required: true },
                { key: 'studentName', label: 'ชื่อ-สกุลนักศึกษา', type: 'text', required: true },
                {
                  key: 'yearLevel',
                  label: 'ชั้นปี',
                  type: 'select',
                  options: [
                    { value: '4', label: 'ชั้นปีที่ 4' },
                    { value: '5', label: 'ชั้นปีที่ 5' },
                    { value: '6', label: 'ชั้นปีที่ 6' },
                  ],
                },
                {
                  key: 'courseCode',
                  label: 'รายวิชา',
                  type: courseOptions.length > 0 ? 'select' : 'text',
                  options: courseOptions,
                  required: true,
                },
                { key: 'formA', label: 'คะแนน Form A (%)', type: 'number', min: 0, max: 100 },
                { key: 'formB', label: 'คะแนน Form B (%)', type: 'number', min: 0, max: 100 },
                { key: 'formC', label: 'คะแนน Form C (%)', type: 'number', min: 0, max: 100 },
                { key: 'formE', label: 'คะแนน Form E (%)', type: 'number', min: 0, max: 100 },
                { key: 'osce', label: 'คะแนน OSCE (%)', type: 'number', min: 0, max: 100 },
                { key: 'writtenExam', label: 'คะแนนข้อเขียน (%)', type: 'number', min: 0, max: 100 },
                { key: 'absenceDays', label: 'จำนวนวันลา/ขาด (วัน)', type: 'number', min: 0, max: 60 },
                { key: 'attitudeGatePassed', label: 'ผ่านเกณฑ์เจตคติ (Attitude Gate)', type: 'checkbox' },
              ]}
              createDefaults={() => ({
                studentId: '64104218',
                studentName: 'นศพ. ธนภัทร ศรีสุรินทร์',
                yearLevel: '6',
                courseCode: gradingConfigs[0]?.courseCode ?? 'SUR-PED-502',
                formA: 80,
                formB: 80,
                formC: 80,
                formE: 85,
                osce: 78,
                writtenExam: 75,
                absenceDays: 0,
                attitudeGatePassed: true,
              })}
              toFormValues={(s) => ({
                studentId: s.studentId,
                studentName: s.studentName,
                yearLevel: s.yearLevel,
                courseCode: s.courseCode,
                formA: s.formA ?? 0,
                formB: s.formB ?? 0,
                formC: s.formC ?? 0,
                formE: s.formE ?? 0,
                osce: s.osce ?? 0,
                writtenExam: s.writtenExam ?? 0,
                absenceDays: s.absenceDays,
                attitudeGatePassed: s.attitudeGatePassed,
              })}
              fromFormValues={(v, existing) => ({
                id: existing?.id ?? `sc-${Date.now()}`,
                studentId: String(v.studentId).trim(),
                studentName: String(v.studentName).trim(),
                yearLevel: v.yearLevel as AcademicYearLevel,
                courseCode: String(v.courseCode).trim(),
                formA: Number(v.formA),
                formB: Number(v.formB),
                formC: Number(v.formC),
                wellBaby: existing?.wellBaby ?? null,
                formE: Number(v.formE),
                osce: Number(v.osce),
                writtenExam: Number(v.writtenExam),
                customGroupScores: existing?.customGroupScores,
                attitudeGatePassed: Boolean(v.attitudeGatePassed),
                absenceDays: Number(v.absenceDays) || 0,
              })}
              onCreate={(item) => {
                onSaveStudentScores([item, ...studentScores]);
                onNotify(`เพิ่มคะแนนรายวิชา ${item.courseCode} สำหรับ ${item.studentName} แล้ว`);
              }}
              onUpdate={(item) => {
                onSaveStudentScores(studentScores.map((x) => (x.id === item.id ? item : x)));
                onNotify(`อัปเดตคะแนนของ ${item.studentName} แล้ว`);
              }}
              onDelete={(id) => {
                onSaveStudentScores(studentScores.filter((x) => x.id !== id));
                onNotify('ลบรายการคะแนนนักศึกษาแล้ว');
              }}
            />
          )}

          {domain === 'assessments' && subEntity === 'epas' && (
            <AdminEntityCrudList<EpaMilestone>
              title="สมรรถนะหลัก EPA (Entrustable Professional Activities)"
              subtitle="เพิ่ม แก้ไข หรือลบหัวข้อสมรรถนะ EPA และระดับ Entrustment"
              items={epas}
              getId={(e) => e.id}
              getBadge={(e) => e.code}
              getTitle={(e) => e.title}
              getMeta={(e) => `ระดับปัจจุบัน ${e.currentLevel}/${e.targetLevel} · ประเมินล่าสุดโดย ${e.lastAssessedBy} (${e.lastAssessedDate})`}
              fields={[
                { key: 'code', label: 'รหัส EPA (เช่น EPA 1)', type: 'text', required: true },
                { key: 'title', label: 'ชื่อสมรรถนะ EPA', type: 'text', required: true },
                { key: 'description', label: 'รายละเอียดสมรรถนะ', type: 'textarea', required: true, colSpan: 2 },
                { key: 'currentLevel', label: 'ระดับปัจจุบัน (1-5)', type: 'number', min: 1, max: 5 },
                { key: 'targetLevel', label: 'ระดับเป้าหมาย (1-5)', type: 'number', min: 1, max: 5 },
                { key: 'lastAssessedBy', label: 'อาจารย์ผู้ประเมิน', type: 'text', required: true },
                { key: 'lastAssessedDate', label: 'วันที่ประเมินล่าสุด', type: 'text', required: true },
              ]}
              createDefaults={() => ({
                code: `EPA ${epas.length + 1}`,
                title: '',
                description: '',
                currentLevel: 3,
                targetLevel: 4,
                lastAssessedBy: currentUserName,
                lastAssessedDate: '24 พ.ย. 2569',
              })}
              toFormValues={(e) => ({ ...e })}
              fromFormValues={(v, existing) => ({
                id: existing?.id ?? `epa-${Date.now()}`,
                code: String(v.code).trim(),
                title: String(v.title).trim(),
                description: String(v.description).trim(),
                currentLevel: Number(v.currentLevel) || 1,
                targetLevel: Number(v.targetLevel) || 4,
                lastAssessedBy: String(v.lastAssessedBy).trim(),
                lastAssessedDate: String(v.lastAssessedDate).trim(),
              })}
              onCreate={(item) => {
                onSaveEpas([...epas, item]);
                onNotify(`เพิ่ม ${item.code} เรียบร้อยแล้ว`);
              }}
              onUpdate={(item) => {
                onSaveEpas(epas.map((x) => (x.id === item.id ? item : x)));
                onNotify(`อัปเดต ${item.code} เรียบร้อยแล้ว`);
              }}
              onDelete={(id) => {
                onSaveEpas(epas.filter((x) => x.id !== id));
                onNotify('ลบรายการ EPA แล้ว');
              }}
            />
          )}

          {domain === 'assessments' && subEntity === 'courseGrades' && (
            <AdminEntityCrudList<CourseGrade>
              title="สรุปผลเกรดรายวิชา (Course Grade Transcript)"
              subtitle="เพิ่ม แก้ไข หรือลบเกรดสรุปผลรายวิชาในพอร์ทัล"
              items={courseGrades}
              getId={(g) => g.id}
              getBadge={(g) => `${g.courseCode} · เกรด ${g.grade}`}
              getTitle={(g) => g.courseName}
              getMeta={(g) => `ชั้นปี ${g.yearLevel} · ${g.credits} หน่วยกิต · GPA ${g.gradePoint} · ${g.status}`}
              fields={[
                { key: 'courseCode', label: 'รหัสวิชา', type: 'text', required: true },
                { key: 'courseName', label: 'ชื่อรายวิชา', type: 'text', required: true },
                {
                  key: 'yearLevel',
                  label: 'ชั้นปี',
                  type: 'select',
                  options: [
                    { value: '4', label: 'ปี 4' },
                    { value: '5', label: 'ปี 5' },
                    { value: '6', label: 'ปี 6' },
                  ],
                },
                { key: 'credits', label: 'หน่วยกิต', type: 'number', min: 1, max: 24 },
                { key: 'grade', label: 'เกรด (A, B+, B, C+, C, ...)', type: 'text', required: true },
                { key: 'gradePoint', label: 'ค่าระดับคะแนน (0.0 - 4.0)', type: 'number', min: 0, max: 4, step: 0.5 },
                {
                  key: 'status',
                  label: 'สถานะ',
                  type: 'select',
                  options: [
                    { value: 'ผ่านเกณฑ์', label: 'ผ่านเกณฑ์' },
                    { value: 'กำลังศึกษา', label: 'กำลังศึกษา' },
                  ],
                },
              ]}
              createDefaults={() => ({
                courseCode: 'SUR-NEW-401',
                courseName: '',
                yearLevel: '4',
                credits: 6,
                grade: 'A',
                gradePoint: 4.0,
                status: 'ผ่านเกณฑ์',
              })}
              toFormValues={(g) => ({ ...g })}
              fromFormValues={(v, existing) => ({
                id: existing?.id ?? `cg-${Date.now()}`,
                courseCode: String(v.courseCode).trim(),
                courseName: String(v.courseName).trim(),
                yearLevel: v.yearLevel as AcademicYearLevel,
                credits: Number(v.credits) || 4,
                grade: String(v.grade).trim(),
                gradePoint: Number(v.gradePoint) || 0,
                status: v.status as CourseGrade['status'],
              })}
              onCreate={(item) => {
                onSaveCourseGrades([...courseGrades, item]);
                onNotify('เพิ่มเกรดรายวิชาเรียบร้อยแล้ว');
              }}
              onUpdate={(item) => {
                onSaveCourseGrades(courseGrades.map((x) => (x.id === item.id ? item : x)));
                onNotify('อัปเดตเกรดรายวิชาเรียบร้อยแล้ว');
              }}
              onDelete={(id) => {
                onSaveCourseGrades(courseGrades.filter((x) => x.id !== id));
                onNotify('ลบรายการเกรดรายวิชาแล้ว');
              }}
            />
          )}

          {domain === 'assessments' && subEntity === 'preceptorFeedbacks' && (
            <AdminEntityCrudList<PreceptorFeedback>
              title="ผลประเมินอาจารย์แพทย์และบรรยากาศการสอน"
              subtitle="ตรวจสอบ แก้ไข หรือลบข้อความประเมินอาจารย์แพทย์"
              items={preceptorFeedbacks}
              getId={(f) => f.id}
              getBadge={(f) => `${f.submittedAt} · ${f.department}`}
              getTitle={(f) => `${f.preceptorName} (${f.rotationPeriod})`}
              getMeta={(f) => `สอน ${f.teachingScore}/5 · Feedback ${f.feedbackScore}/5 · บรรยากาศ ${f.atmosphereScore}/5 — ${f.comment}`}
              fields={[
                { key: 'preceptorName', label: 'ชื่ออาจารย์แพทย์', type: 'text', required: true },
                {
                  key: 'department',
                  label: 'กลุ่มงาน',
                  type: deptOptions.length > 0 ? 'select' : 'text',
                  options: deptOptions,
                  required: true,
                },
                { key: 'rotationPeriod', label: 'ช่วงผลัดฝึกปฏิบัติ', type: 'text', required: true },
                { key: 'submittedAt', label: 'วันที่ส่ง', type: 'text', required: true },
                { key: 'teachingScore', label: 'คะแนนการสอน (1-5)', type: 'number', min: 1, max: 5 },
                { key: 'feedbackScore', label: 'คะแนน Feedback (1-5)', type: 'number', min: 1, max: 5 },
                { key: 'atmosphereScore', label: 'คะแนนบรรยากาศ (1-5)', type: 'number', min: 1, max: 5 },
                { key: 'comment', label: 'ความคิดเห็น', type: 'textarea', colSpan: 2 },
              ]}
              createDefaults={() => ({
                preceptorName: 'นพ.เอกรัตน์ วัฒนสุรินทร์',
                department: departments[0]?.nameTh ?? 'กลุ่มงานอายุรศาสตร์',
                rotationPeriod: 'พ.ย. 2569',
                submittedAt: '24 พ.ย. 2569',
                teachingScore: 5,
                feedbackScore: 5,
                atmosphereScore: 5,
                comment: '',
              })}
              toFormValues={(f) => ({ ...f })}
              fromFormValues={(v, existing) => ({
                id: existing?.id ?? `pfb-${Date.now()}`,
                preceptorName: String(v.preceptorName).trim(),
                department: String(v.department).trim(),
                rotationPeriod: String(v.rotationPeriod).trim(),
                submittedAt: String(v.submittedAt).trim(),
                teachingScore: Number(v.teachingScore) || 5,
                feedbackScore: Number(v.feedbackScore) || 5,
                atmosphereScore: Number(v.atmosphereScore) || 5,
                comment: String(v.comment ?? '').trim(),
              })}
              onCreate={(item) => {
                onSavePreceptorFeedbacks([item, ...preceptorFeedbacks]);
                onNotify('เพิ่มบันทึกประเมินอาจารย์แล้ว');
              }}
              onUpdate={(item) => {
                onSavePreceptorFeedbacks(preceptorFeedbacks.map((x) => (x.id === item.id ? item : x)));
                onNotify('อัปเดตบันทึกประเมินอาจารย์แล้ว');
              }}
              onDelete={(id) => {
                onSavePreceptorFeedbacks(preceptorFeedbacks.filter((x) => x.id !== id));
                onNotify('ลบบันทึกประเมินอาจารย์แล้ว');
              }}
            />
          )}

          {/* 2. CALENDAR & ANNOUNCEMENTS */}
          {domain === 'calendar' && subEntity === 'conferences' && (
            <AdminEntityCrudList<ConferenceEvent>
              title="ปฏิทินกิจกรรมวิชาการ (Morning Report / Grand Round / M&M)"
              subtitle="เพิ่ม แก้ไข หรือลบกิจกรรมวิชาการประจำวันและปฏิทินการสอนของศูนย์แพทยฯ"
              items={conferences}
              getId={(c) => c.id}
              getBadge={(c) => `${c.type} · ${c.time}`}
              getTitle={(c) => c.title}
              getMeta={(c) => `${c.department} · วิทยากร: ${c.speaker} · สถานที่: ${c.location} · ผู้เข้าร่วม ${c.attendeeCount} คน`}
              fields={[
                { key: 'title', label: 'หัวข้อกิจกรรมวิชาการ', type: 'text', required: true, colSpan: 2 },
                { key: 'type', label: 'ประเภทกิจกรรม (Morning Report, Grand Round, M&M Conference, ...)', type: 'text', required: true },
                { key: 'time', label: 'ช่วงเวลา', type: 'text', required: true, placeholder: 'เช่น 07:30 - 08:30' },
                {
                  key: 'department',
                  label: 'กลุ่มงาน',
                  type: deptOptions.length > 0 ? 'select' : 'text',
                  options: deptOptions,
                  required: true,
                },
                { key: 'speaker', label: 'วิทยากร / ผู้นำเสนอ', type: 'text', required: true },
                { key: 'location', label: 'ห้องประชุม / สถานที่', type: 'text', required: true },
                { key: 'attendeeCount', label: 'จำนวนผู้ลงชื่อ', type: 'number', min: 0 },
              ]}
              createDefaults={() => ({
                title: '',
                type: 'Morning Report',
                time: '07:30 - 08:30',
                department: departments[0]?.nameTh ?? 'กลุ่มงานอายุรศาสตร์',
                speaker: currentUserName,
                location: 'ห้องประชุมชั้น 4 อาคารศูนย์แพทยฯ รพ.สุรินทร์',
                attendeeCount: 0,
              })}
              toFormValues={(c) => ({ ...c })}
              fromFormValues={(v, existing) => ({
                id: existing?.id ?? `conf-${Date.now()}`,
                title: String(v.title).trim(),
                type: String(v.type).trim(),
                time: String(v.time).trim(),
                department: String(v.department).trim(),
                speaker: String(v.speaker).trim(),
                location: String(v.location).trim(),
                checkedIn: existing?.checkedIn ?? false,
                attendeeCount: Number(v.attendeeCount) || 0,
              })}
              onCreate={(item) => {
                onSaveConferences([item, ...conferences]);
                onNotify('เพิ่มกิจกรรมวิชาการในปฏิทินแล้ว');
              }}
              onUpdate={(item) => {
                onSaveConferences(conferences.map((x) => (x.id === item.id ? item : x)));
                onNotify('แก้ไขกิจกรรมวิชาการเรียบร้อยแล้ว');
              }}
              onDelete={(id) => {
                onSaveConferences(conferences.filter((x) => x.id !== id));
                onNotify('ลบกิจกรรมวิชาการออกจากปฏิทินแล้ว');
              }}
            />
          )}

          {domain === 'calendar' && subEntity === 'announcements' && (
            <AdminEntityCrudList<Announcement>
              title="ประกาศข่าวสารและปฏิทินแจ้งเตือนศูนย์แพทยฯ"
              subtitle="เพิ่ม แก้ไข ตั้งสถานะเร่งด่วน หรือลบประกาศในหน้าแรก"
              items={announcements}
              getId={(a) => a.id}
              getBadge={(a) => `${a.category} · ${a.date}${a.urgent ? ' · ด่วน' : ''}`}
              getTitle={(a) => a.title}
              getMeta={(a) => `${a.author} — ${a.summary}`}
              fields={[
                { key: 'title', label: 'หัวข้อประกาศ', type: 'text', required: true, colSpan: 2 },
                {
                  key: 'category',
                  label: 'หมวดหมู่',
                  type: 'select',
                  options: [
                    { value: 'วิชาการ', label: 'วิชาการ' },
                    { value: 'ตารางสอบ', label: 'ตารางสอบ' },
                    { value: 'หอพักและสวัสดิการ', label: 'หอพักและสวัสดิการ' },
                  ],
                },
                { key: 'date', label: 'วันที่ประกาศ', type: 'text', required: true },
                { key: 'author', label: 'หน่วยงาน / ผู้ประกาศ', type: 'text', required: true },
                { key: 'urgent', label: 'ทำเครื่องหมายเป็นประกาศด่วน (Urgent)', type: 'checkbox' },
                { key: 'summary', label: 'เนื้อหาประกาศ', type: 'textarea', required: true, colSpan: 2 },
              ]}
              createDefaults={() => ({
                title: '',
                category: 'วิชาการ',
                date: '24 พ.ย. 2569',
                author: 'ฝ่ายวิชาการ ศพค. รพ.สุรินทร์',
                urgent: false,
                summary: '',
              })}
              toFormValues={(a) => ({
                ...a,
                urgent: Boolean(a.urgent),
              })}
              fromFormValues={(v, existing) => ({
                id: existing?.id ?? `ann-${Date.now()}`,
                title: String(v.title).trim(),
                category: v.category as Announcement['category'],
                date: String(v.date).trim(),
                author: String(v.author).trim(),
                summary: String(v.summary).trim(),
                urgent: Boolean(v.urgent),
              })}
              onCreate={(item) => {
                onSaveAnnouncements([item, ...announcements]);
                onNotify('เผยแพร่ประกาศใหม่เรียบร้อยแล้ว');
              }}
              onUpdate={(item) => {
                onSaveAnnouncements(announcements.map((x) => (x.id === item.id ? item : x)));
                onNotify('อัปเดตประกาศเรียบร้อยแล้ว');
              }}
              onDelete={(id) => {
                onSaveAnnouncements(announcements.filter((x) => x.id !== id));
                onNotify('ลบประกาศเรียบร้อยแล้ว');
              }}
            />
          )}

          {/* 3. SHIFTS, LEAVE & ROOMS */}
          {domain === 'shifts' && subEntity === 'shifts' && (
            <AdminEntityCrudList<DutyShift>
              title="ตารางเวรและการจัดสรรเวรปฏิบัติงาน (Duty Shifts)"
              subtitle="สร้าง แก้ไข สับเปลี่ยนผู้ขึ้นเวร อนุมัติแลกเวร หรือลบกะเวรได้โดยตรง"
              items={shifts}
              getId={(s) => s.id}
              getBadge={(s) => `${s.isoDate ?? s.date} · ${s.timeRange}`}
              getTitle={(s) => `${s.department} — ${s.wardOrUnit} (${s.assignedStudent})`}
              getMeta={(s) =>
                `${s.shiftType} · อาจารย์เวร: ${s.supervisingStaff} · ${
                  s.checkedInAt ? `เช็กอินแล้ว ${s.checkedInAt}` : 'ยังไม่เช็กอิน'
                } · แลกเวร: ${s.swapStatus ?? 'none'}`
              }
              fields={[
                { key: 'isoDate', label: 'วันที่ (ISO YYYY-MM-DD)', type: 'date', required: true },
                { key: 'date', label: 'วันที่แสดงผล (เช่น 24 พ.ย. 2569)', type: 'text', required: true },
                { key: 'dayLabel', label: 'วันในสัปดาห์ (เช่น จันทร์)', type: 'text', required: true },
                {
                  key: 'department',
                  label: 'กลุ่มงาน',
                  type: deptOptions.length > 0 ? 'select' : 'text',
                  options: deptOptions,
                  required: true,
                },
                { key: 'wardOrUnit', label: 'หอผู้ป่วย / จุดปฏิบัติงาน', type: 'text', required: true },
                { key: 'shiftType', label: 'ประเภทเวร', type: 'text', required: true },
                { key: 'timeRange', label: 'ช่วงเวลา (เช่น 16:00 - 24:00)', type: 'text', required: true },
                { key: 'assignedStudent', label: 'นักศึกษาแพทย์ผู้ขึ้นเวร', type: 'text', required: true },
                {
                  key: 'studentYear',
                  label: 'ชั้นปี',
                  type: 'select',
                  options: [
                    { value: '4', label: 'ปี 4' },
                    { value: '5', label: 'ปี 5' },
                    { value: '6', label: 'ปี 6' },
                  ],
                },
                { key: 'supervisingStaff', label: 'อาจารย์เวรควบคุม', type: 'text', required: true },
                {
                  key: 'swapStatus',
                  label: 'สถานะแลกเวร',
                  type: 'select',
                  options: [
                    { value: 'none', label: 'ปกติ (none)' },
                    { value: 'requested', label: 'รออนุมัติแลกเวร (requested)' },
                    { value: 'approved', label: 'อนุมัติแลกเวรแล้ว (approved)' },
                  ],
                },
                { key: 'checkedInAt', label: 'เวลาที่เช็กอินแล้ว (เว้นว่างหากยังไม่เช็กอิน)', type: 'text' },
                { key: 'swapNote', label: 'หมายเหตุการแลกเวร', type: 'text', colSpan: 2 },
              ]}
              createDefaults={() => ({
                isoDate: '2026-11-26',
                date: '26 พ.ย. 2569',
                dayLabel: 'พฤหัสบดี',
                department: departments[0]?.nameTh ?? 'กลุ่มงานอายุรศาสตร์',
                wardOrUnit: 'หอผู้ป่วยอายุรกรรมชาย 1',
                shiftType: 'เวรบ่าย (หอผู้ป่วยใน)',
                timeRange: '16:00 - 24:00',
                assignedStudent: 'นศพ.ธนภัทร ศรีสุรินทร์',
                studentYear: '6',
                supervisingStaff: 'นพ.เอกรัตน์ วัฒนสุรินทร์',
                swapStatus: 'none',
                checkedInAt: '',
                swapNote: '',
              })}
              toFormValues={(s) => ({
                isoDate: s.isoDate ?? '2026-11-26',
                date: s.date,
                dayLabel: s.dayLabel,
                department: s.department,
                wardOrUnit: s.wardOrUnit,
                shiftType: s.shiftType,
                timeRange: s.timeRange,
                assignedStudent: s.assignedStudent,
                studentYear: s.studentYear,
                supervisingStaff: s.supervisingStaff,
                swapStatus: s.swapStatus ?? 'none',
                checkedInAt: s.checkedInAt ?? '',
                swapNote: s.swapNote ?? '',
              })}
              fromFormValues={(v, existing) => ({
                id: existing?.id ?? `shift-${Date.now()}`,
                isoDate: String(v.isoDate).trim() || undefined,
                date: String(v.date).trim(),
                dayLabel: String(v.dayLabel).trim(),
                department: String(v.department).trim(),
                wardOrUnit: String(v.wardOrUnit).trim(),
                shiftType: String(v.shiftType).trim(),
                timeRange: String(v.timeRange).trim(),
                assignedStudent: String(v.assignedStudent).trim(),
                studentYear: v.studentYear as AcademicYearLevel,
                supervisingStaff: String(v.supervisingStaff).trim(),
                swapStatus: v.swapStatus as DutyShift['swapStatus'],
                checkedInAt: String(v.checkedInAt ?? '').trim() || undefined,
                checkInMethod: String(v.checkedInAt ?? '').trim()
                  ? existing?.checkInMethod ?? 'manual'
                  : undefined,
                checkInWardCode: existing?.checkInWardCode,
                swapNote: String(v.swapNote ?? '').trim() || undefined,
              })}
              onCreate={(item) => {
                onSaveShifts([item, ...shifts]);
                onNotify('เพิ่มรายการเวรปฏิบัติงานใหม่แล้ว');
              }}
              onUpdate={(item) => {
                onSaveShifts(shifts.map((x) => (x.id === item.id ? item : x)));
                onNotify('อัปเดตรายการเวรปฏิบัติงานแล้ว');
              }}
              onDelete={(id) => {
                onSaveShifts(shifts.filter((x) => x.id !== id));
                onNotify('ลบรายการเวรปฏิบัติงานแล้ว');
              }}
            />
          )}

          {domain === 'shifts' && subEntity === 'leaveRequests' && (
            <AdminEntityCrudList<LeaveRequest>
              title="คำร้องขอลาปฏิบัติงานคลินิก (Leave Requests)"
              subtitle="เพิ่ม แก้ไข อนุมัติ/ไม่อนุมัติ หรือลบใบลาของนักศึกษา"
              items={leaveRequests}
              getId={(l) => l.id}
              getBadge={(l) => `${l.leaveType} · ${l.status}`}
              getTitle={(l) => `${l.studentName} (${l.studentId}) — ${l.dateRange}`}
              getMeta={(l) => `${l.department} · ${l.daysCount} วัน · เหตุผล: ${l.reason}`}
              fields={[
                { key: 'studentId', label: 'รหัสนักศึกษา', type: 'text', required: true },
                { key: 'studentName', label: 'ชื่อนักศึกษา', type: 'text', required: true },
                {
                  key: 'leaveType',
                  label: 'ประเภทการลา',
                  type: 'select',
                  options: [
                    { value: 'ลาป่วย', label: 'ลาป่วย' },
                    { value: 'ลากิจ', label: 'ลากิจ' },
                    { value: 'ลาประชุมวิชาการ', label: 'ลาประชุมวิชาการ' },
                  ],
                },
                {
                  key: 'status',
                  label: 'สถานะการอนุมัติ',
                  type: 'select',
                  options: [
                    { value: 'รออนุมัติ', label: 'รออนุมัติ' },
                    { value: 'อนุมัติแล้ว', label: 'อนุมัติแล้ว' },
                    { value: 'ไม่อนุมัติ', label: 'ไม่อนุมัติ' },
                  ],
                },
                { key: 'dateRange', label: 'ช่วงวันที่ลา', type: 'text', required: true },
                { key: 'daysCount', label: 'จำนวนวัน', type: 'number', min: 1, max: 30 },
                {
                  key: 'department',
                  label: 'กลุ่มงาน',
                  type: deptOptions.length > 0 ? 'select' : 'text',
                  options: deptOptions,
                  required: true,
                },
                { key: 'submittedAt', label: 'วันที่ยื่นใบลา', type: 'text', required: true },
                { key: 'reason', label: 'เหตุผลการลา', type: 'textarea', required: true, colSpan: 2 },
              ]}
              createDefaults={() => ({
                studentId: '64104218',
                studentName: 'นศพ.ธนภัทร ศรีสุรินทร์',
                leaveType: 'ลากิจ',
                status: 'รออนุมัติ',
                dateRange: '28 พ.ย. 2569',
                daysCount: 1,
                department: departments[0]?.nameTh ?? 'กลุ่มงานอายุรศาสตร์',
                submittedAt: '24 พ.ย. 2569',
                reason: '',
              })}
              toFormValues={(l) => ({ ...l })}
              fromFormValues={(v, existing) => ({
                id: existing?.id ?? `leave-${Date.now()}`,
                studentId: String(v.studentId).trim(),
                studentName: String(v.studentName).trim(),
                leaveType: v.leaveType as LeaveRequest['leaveType'],
                dateRange: String(v.dateRange).trim(),
                daysCount: Number(v.daysCount) || 1,
                department: String(v.department).trim(),
                reason: String(v.reason).trim(),
                status: v.status as LeaveRequest['status'],
                submittedAt: String(v.submittedAt).trim(),
              })}
              onCreate={(item) => {
                onSaveLeaveRequests([item, ...leaveRequests]);
                onNotify('เพิ่มรายการใบลาแล้ว');
              }}
              onUpdate={(item) => {
                onSaveLeaveRequests(leaveRequests.map((x) => (x.id === item.id ? item : x)));
                onNotify('อัปเดตข้อมูลใบลาแล้ว');
              }}
              onDelete={(id) => {
                onSaveLeaveRequests(leaveRequests.filter((x) => x.id !== id));
                onNotify('ลบรายการใบลาแล้ว');
              }}
            />
          )}

          {domain === 'shifts' && subEntity === 'roomBookings' && (
            <AdminEntityCrudList<RoomBooking>
              title="การจองห้องประชุม ห้องติว และห้อง Simulation"
              subtitle="เพิ่ม แก้ไข เปลี่ยนสถานะ หรือลบรายการจองห้องทั้งหมดในระบบ"
              items={roomBookings}
              getId={(b) => b.id}
              getBadge={(b) => `${b.dateIso} · ${b.timeSlot}`}
              getTitle={(b) => b.title}
              getMeta={(b) =>
                `${rooms.find((r) => r.id === b.roomId)?.name ?? b.roomId} · ผู้จอง: ${b.bookedBy} · ${b.attendeesCount} คน (${b.status})`
              }
              fields={[
                {
                  key: 'roomId',
                  label: 'ห้องที่จอง',
                  type: roomOptions.length > 0 ? 'select' : 'text',
                  options: roomOptions,
                  required: true,
                },
                { key: 'dateIso', label: 'วันที่ (YYYY-MM-DD)', type: 'date', required: true },
                { key: 'timeSlot', label: 'ช่วงเวลา (เช่น 13:00 - 15:00)', type: 'text', required: true },
                { key: 'title', label: 'หัวข้อการจอง', type: 'text', required: true },
                { key: 'bookedBy', label: 'ผู้จอง', type: 'text', required: true },
                { key: 'attendeesCount', label: 'จำนวนผู้เข้าร่วม', type: 'number', min: 1, max: 200 },
                {
                  key: 'purpose',
                  label: 'วัตถุประสงค์',
                  type: 'select',
                  options: [
                    { value: 'กลุ่มติว / Study Group', label: 'กลุ่มติว / Study Group' },
                    { value: 'ประชุมวิชาการ / Journal Club', label: 'ประชุมวิชาการ / Journal Club' },
                    { value: 'เตรียมสอบ OSCE / Case Review', label: 'เตรียมสอบ OSCE / Case Review' },
                  ],
                },
                {
                  key: 'status',
                  label: 'สถานะการจอง',
                  type: 'select',
                  options: [
                    { value: 'ยืนยันการจอง', label: 'ยืนยันการจอง' },
                    { value: 'ยกเลิกแล้ว', label: 'ยกเลิกแล้ว' },
                  ],
                },
              ]}
              createDefaults={() => ({
                roomId: rooms[0]?.id ?? 'room-1',
                dateIso: '2026-11-26',
                timeSlot: '13:00 - 15:00',
                title: '',
                bookedBy: currentUserName,
                attendeesCount: 8,
                purpose: 'ประชุมวิชาการ / Journal Club',
                status: 'ยืนยันการจอง',
              })}
              toFormValues={(b) => ({ ...b })}
              fromFormValues={(v, existing) => ({
                id: existing?.id ?? `book-${Date.now()}`,
                roomId: String(v.roomId).trim(),
                dateIso: String(v.dateIso).trim(),
                timeSlot: String(v.timeSlot).trim(),
                title: String(v.title).trim(),
                bookedBy: String(v.bookedBy).trim(),
                bookedByRole: existing?.bookedByRole ?? 'admin',
                attendeesCount: Number(v.attendeesCount) || 1,
                purpose: v.purpose as RoomBooking['purpose'],
                status: v.status as RoomBooking['status'],
              })}
              onCreate={(item) => {
                onSaveRoomBookings([item, ...roomBookings]);
                onNotify('เพิ่มการจองห้องเรียบร้อยแล้ว');
              }}
              onUpdate={(item) => {
                onSaveRoomBookings(roomBookings.map((x) => (x.id === item.id ? item : x)));
                onNotify('อัปเดตการจองห้องเรียบร้อยแล้ว');
              }}
              onDelete={(id) => {
                onSaveRoomBookings(roomBookings.filter((x) => x.id !== id));
                onNotify('ลบรายการจองห้องแล้ว');
              }}
            />
          )}

          {domain === 'shifts' && subEntity === 'rooms' && (
            <AdminEntityCrudList<RoomResource>
              title="ข้อมูลห้องประชุมและห้องฝึกทักษะ (Clinical Rooms)"
              subtitle="เพิ่ม แก้ไข หรือลบห้องที่เปิดให้จองในระบบจองทรัพยากร"
              items={rooms}
              getId={(r) => r.id}
              getBadge={(r) => `${r.roomType} · ${r.capacity} ที่นั่ง`}
              getTitle={(r) => r.name}
              getMeta={(r) => `${r.location} · อุปกรณ์: ${r.equipment.join(', ')}`}
              fields={[
                { key: 'name', label: 'ชื่อห้อง', type: 'text', required: true },
                { key: 'location', label: 'อาคาร / ชั้น', type: 'text', required: true },
                { key: 'capacity', label: 'ความจุ (คน)', type: 'number', min: 1, max: 300 },
                {
                  key: 'roomType',
                  label: 'ประเภทห้อง',
                  type: 'select',
                  options: [
                    { value: 'Conference Room', label: 'Conference Room' },
                    { value: 'Study Group Room', label: 'Study Group Room' },
                    { value: 'Simulation Briefing', label: 'Simulation Briefing' },
                  ],
                },
                { key: 'equipment', label: 'อุปกรณ์ภายในห้อง (คั่นด้วยจุลภาค ,)', type: 'text', colSpan: 2 },
              ]}
              createDefaults={() => ({
                name: '',
                location: 'อาคารศูนย์แพทยฯ ชั้น 2',
                capacity: 20,
                roomType: 'Conference Room',
                equipment: 'Projector, Whiteboard, Wi-Fi',
              })}
              toFormValues={(r) => ({
                ...r,
                equipment: r.equipment.join(', '),
              })}
              fromFormValues={(v, existing) => ({
                id: existing?.id ?? `room-${Date.now()}`,
                name: String(v.name).trim(),
                location: String(v.location).trim(),
                capacity: Number(v.capacity) || 10,
                roomType: v.roomType as RoomResource['roomType'],
                equipment: parseCommaList(v.equipment),
              })}
              onCreate={(item) => {
                onSaveRooms([...rooms, item]);
                onNotify('เพิ่มห้องประชุมใหม่เรียบร้อยแล้ว');
              }}
              onUpdate={(item) => {
                onSaveRooms(rooms.map((x) => (x.id === item.id ? item : x)));
                onNotify('อัปเดตข้อมูลห้องประชุมเรียบร้อยแล้ว');
              }}
              onDelete={(id) => {
                onSaveRooms(rooms.filter((x) => x.id !== id));
                onNotify('ลบข้อมูลห้องประชุมแล้ว');
              }}
            />
          )}

          {/* 4. COURSES, QUOTAS & SKILLS */}
          {domain === 'courses' && subEntity === 'departments' && (
            <AdminEntityCrudList<ClinicalDepartment>
              title="รายละเอียดรายวิชาและกลุ่มงานคลินิก (Course & Department Syllabus)"
              subtitle="เพิ่ม แก้ไข หรือลบโครงสร้างรายวิชา จำนวนสัปดาห์ หน่วยกิต อาจารย์ผู้รับผิดชอบ และเกณฑ์หัตถการ/EPA"
              items={departments}
              getId={(d) => d.id}
              getBadge={(d) => `${d.code} · ปี ${d.yearLevel}`}
              getTitle={(d) => `${d.nameTh} (${d.nameEn})`}
              getMeta={(d) => `${d.weeks} สัปดาห์ · ${d.credits} หน่วยกิต · ${d.headPreceptor} · ${d.wards}`}
              fields={[
                { key: 'code', label: 'รหัสรายวิชา (เช่น SUR-MED-401)', type: 'text', required: true },
                {
                  key: 'yearLevel',
                  label: 'ชั้นปี',
                  type: 'select',
                  options: [
                    { value: '4', label: 'ชั้นปีที่ 4' },
                    { value: '5', label: 'ชั้นปีที่ 5' },
                    { value: '6', label: 'ชั้นปีที่ 6' },
                  ],
                },
                { key: 'nameTh', label: 'ชื่อกลุ่มงาน/รายวิชา (ภาษาไทย)', type: 'text', required: true },
                { key: 'nameEn', label: 'ชื่อภาษาอังกฤษ', type: 'text', required: true },
                { key: 'weeks', label: 'ระยะเวลาฝึก (สัปดาห์)', type: 'number', min: 1, max: 52 },
                { key: 'credits', label: 'หน่วยกิต', type: 'number', min: 1, max: 24 },
                { key: 'headPreceptor', label: 'อาจารย์ผู้รับผิดชอบรายวิชา', type: 'text', required: true },
                { key: 'wards', label: 'หอผู้ป่วย / จุดฝึก (คั่นด้วยจุลภาค ,)', type: 'text', required: true },
                { key: 'overview', label: 'คำอธิบายรายวิชา / ขอบเขตการฝึกปฏิบัติ', type: 'textarea', required: true, colSpan: 2 },
                { key: 'requiredProcedures', label: 'หัตถการบังคับ (บรรทัดละ 1 รายการ)', type: 'lines' },
                { key: 'requiredEpAs', label: 'เกณฑ์สมรรถนะ EPA ที่ประเมิน (บรรทัดละ 1 รายการ)', type: 'lines' },
              ]}
              createDefaults={() => ({
                code: 'SUR-NEW-401',
                yearLevel: '4',
                nameTh: '',
                nameEn: '',
                weeks: 4,
                credits: 4,
                headPreceptor: '',
                wards: '',
                overview: '',
                requiredProcedures: '',
                requiredEpAs: '',
              })}
              toFormValues={(d) => ({
                code: d.code,
                yearLevel: d.yearLevel,
                nameTh: d.nameTh,
                nameEn: d.nameEn,
                weeks: d.weeks,
                credits: d.credits,
                headPreceptor: d.headPreceptor,
                wards: d.wards,
                overview: d.overview,
                requiredProcedures: d.requiredProcedures.join('\n'),
                requiredEpAs: d.requiredEpAs.join('\n'),
              })}
              fromFormValues={(v, existing) => ({
                id: existing?.id ?? `dept-${Date.now()}`,
                code: String(v.code).trim(),
                yearLevel: v.yearLevel as AcademicYearLevel,
                nameTh: String(v.nameTh).trim(),
                nameEn: String(v.nameEn).trim(),
                weeks: Number(v.weeks) || 4,
                credits: Number(v.credits) || 4,
                headPreceptor: String(v.headPreceptor).trim(),
                wards: String(v.wards).trim(),
                overview: String(v.overview).trim(),
                requiredProcedures: parseLines(v.requiredProcedures),
                requiredEpAs: parseLines(v.requiredEpAs),
              })}
              onCreate={(item) => {
                onSaveDepartments([...departments, item]);
                onNotify(`เพิ่มรายละเอียดรายวิชา ${item.code} แล้ว`);
              }}
              onUpdate={(item) => {
                onSaveDepartments(departments.map((x) => (x.id === item.id ? item : x)));
                onNotify(`อัปเดตรายละเอียดรายวิชา ${item.code} แล้ว`);
              }}
              onDelete={(id) => {
                onSaveDepartments(departments.filter((x) => x.id !== id));
                onNotify('ลบรายวิชาออกจากหลักสูตรแล้ว');
              }}
            />
          )}

          {domain === 'courses' && subEntity === 'quotas' && (
            <AdminEntityCrudList<ProcedureQuota>
              title="เกณฑ์หัตถการบังคับก่อนสำเร็จการศึกษา (Procedure Quotas)"
              subtitle="เพิ่ม แก้ไข จำนวนเป้าหมาย หรือลบรายการหัตถการบังคับ"
              items={quotas}
              getId={(q) => q.id}
              getBadge={(q) => `${q.completed}/${q.target} · ${q.roleRequirement}`}
              getTitle={(q) => q.name}
              getMeta={(q) => q.department}
              fields={[
                { key: 'name', label: 'ชื่อหัตถการ', type: 'text', required: true, colSpan: 2 },
                {
                  key: 'department',
                  label: 'กลุ่มงาน',
                  type: deptOptions.length > 0 ? 'select' : 'text',
                  options: deptOptions,
                  required: true,
                },
                {
                  key: 'roleRequirement',
                  label: 'บทบาทที่กำหนด',
                  type: 'select',
                  options: [
                    { value: 'Perform', label: 'Perform (ทำเอง)' },
                    { value: 'Assist', label: 'Assist (ผู้ช่วย)' },
                    { value: 'Observe', label: 'Observe (สังเกตการณ์)' },
                  ],
                },
                { key: 'completed', label: 'จำนวนที่ทำแล้ว', type: 'number', min: 0 },
                { key: 'target', label: 'เป้าหมายที่ต้องทำ (ครั้ง)', type: 'number', min: 1 },
              ]}
              createDefaults={() => ({
                name: '',
                department: departments[0]?.nameTh ?? 'กลุ่มงานอายุรศาสตร์',
                roleRequirement: 'Perform',
                completed: 0,
                target: 3,
              })}
              toFormValues={(q) => ({ ...q })}
              fromFormValues={(v, existing) => ({
                id: existing?.id ?? `quota-${Date.now()}`,
                name: String(v.name).trim(),
                department: String(v.department).trim(),
                roleRequirement: v.roleRequirement as ProcedureRole,
                completed: Number(v.completed) || 0,
                target: Number(v.target) || 1,
              })}
              onCreate={(item) => {
                onSaveQuotas([...quotas, item]);
                onNotify('เพิ่มเกณฑ์หัตถการบังคับแล้ว');
              }}
              onUpdate={(item) => {
                onSaveQuotas(quotas.map((x) => (x.id === item.id ? item : x)));
                onNotify('อัปเดตเกณฑ์หัตถการบังคับแล้ว');
              }}
              onDelete={(id) => {
                onSaveQuotas(quotas.filter((x) => x.id !== id));
                onNotify('ลบเกณฑ์หัตถการบังคับแล้ว');
              }}
            />
          )}

          {domain === 'courses' && subEntity === 'clinicalSkills' && (
            <AdminEntityCrudList<ClinicalSkillMasteryItem>
              title="รายการทักษะทางคลินิก (Clinical Skills Mastery Checklist)"
              subtitle="เพิ่ม แก้ไข หรือลบทักษะทางคลินิกและระดับความชำนาญตามเกณฑ์แพทยสภา"
              items={clinicalSkills}
              getId={(s) => s.id}
              getBadge={(s) => `${s.code} · ปี ${s.yearLevel}`}
              getTitle={(s) => `${s.procedureName} (${s.procedureNameEn})`}
              getMeta={(s) => `${s.department} · เกณฑ์: ${s.requiredLevel} · ${s.facultyValidated ? 'อาจารย์รับรองแล้ว' : 'รอรับรอง'}`}
              fields={[
                { key: 'code', label: 'รหัสทักษะ', type: 'text', required: true },
                {
                  key: 'yearLevel',
                  label: 'ชั้นปี',
                  type: 'select',
                  options: [
                    { value: '4', label: 'ปี 4' },
                    { value: '5', label: 'ปี 5' },
                    { value: '6', label: 'ปี 6' },
                  ],
                },
                { key: 'procedureName', label: 'ชื่อทักษะ (ภาษาไทย)', type: 'text', required: true },
                { key: 'procedureNameEn', label: 'ชื่อทักษะ (ภาษาอังกฤษ)', type: 'text', required: true },
                {
                  key: 'department',
                  label: 'กลุ่มงาน',
                  type: deptOptions.length > 0 ? 'select' : 'text',
                  options: deptOptions,
                  required: true,
                },
                {
                  key: 'requiredLevel',
                  label: 'ระดับความสามารถที่กำหนด',
                  type: 'select',
                  options: [
                    { value: 'Perform Independently', label: 'Perform Independently' },
                    { value: 'Perform under Supervision', label: 'Perform under Supervision' },
                    { value: 'Assist', label: 'Assist' },
                  ],
                },
                { key: 'studentPracticed', label: 'ฝึกปฏิบัติแล้ว', type: 'checkbox' },
                { key: 'facultyValidated', label: 'อาจารย์รับรองแล้ว', type: 'checkbox' },
              ]}
              createDefaults={() => ({
                code: `SKILL-${clinicalSkills.length + 1}`,
                yearLevel: '5',
                procedureName: '',
                procedureNameEn: '',
                department: departments[0]?.nameTh ?? 'กลุ่มงานอายุรศาสตร์',
                requiredLevel: 'Perform under Supervision',
                studentPracticed: false,
                facultyValidated: false,
              })}
              toFormValues={(s) => ({ ...s })}
              fromFormValues={(v, existing) => ({
                id: existing?.id ?? `skill-${Date.now()}`,
                code: String(v.code).trim(),
                yearLevel: v.yearLevel as AcademicYearLevel,
                procedureName: String(v.procedureName).trim(),
                procedureNameEn: String(v.procedureNameEn).trim(),
                department: String(v.department).trim(),
                requiredLevel: v.requiredLevel as ClinicalSkillMasteryItem['requiredLevel'],
                studentPracticed: Boolean(v.studentPracticed),
                facultyValidated: Boolean(v.facultyValidated),
                studentMarkedAt: existing?.studentMarkedAt,
                studentSelfNote: existing?.studentSelfNote,
                facultySignerName: existing?.facultySignerName,
                facultySignatureRef: existing?.facultySignatureRef,
                facultySignatureImage: existing?.facultySignatureImage,
                validatedAt: existing?.validatedAt,
              })}
              onCreate={(item) => {
                onSaveClinicalSkills([...clinicalSkills, item]);
                onNotify('เพิ่มทักษะทางคลินิกใหม่แล้ว');
              }}
              onUpdate={(item) => {
                onSaveClinicalSkills(clinicalSkills.map((x) => (x.id === item.id ? item : x)));
                onNotify('อัปเดตทักษะทางคลินิกแล้ว');
              }}
              onDelete={(id) => {
                onSaveClinicalSkills(clinicalSkills.filter((x) => x.id !== id));
                onNotify('ลบทักษะทางคลินิกแล้ว');
              }}
            />
          )}

          {/* 5. LOGBOOK, CPG, LIBRARY, RESEARCH & WELFARE */}
          {domain === 'resources' && subEntity === 'logbookEntries' && (
            <AdminEntityCrudList<LogbookEntry>
              title="รายการบันทึกประสบการณ์ทางคลินิก (E-Logbook)"
              subtitle="เพิ่ม แก้ไข อนุมัติ/ส่งกลับแก้ไข หรือลบรายการ E-Logbook ในระบบ"
              items={logbookEntries}
              getId={(e) => e.id}
              getBadge={(e) => `${e.caseCode} · ${e.status}`}
              getTitle={(e) => `${e.icd10} ${e.diagnosis} — ${e.procedure}`}
              getMeta={(e) => `${e.date} · ${e.department} (${e.setting}) · บทบาท: ${e.role} · อาจารย์: ${e.preceptor}`}
              fields={[
                { key: 'date', label: 'วันที่', type: 'text', required: true },
                { key: 'caseCode', label: 'รหัสเคส', type: 'text', required: true },
                {
                  key: 'department',
                  label: 'กลุ่มงาน',
                  type: deptOptions.length > 0 ? 'select' : 'text',
                  options: deptOptions,
                  required: true,
                },
                {
                  key: 'setting',
                  label: 'สถานที่ (Setting)',
                  type: 'select',
                  options: (['IPD', 'OPD', 'ER', 'OR', 'LR', 'Community'] as ClinicalSetting[]).map((s) => ({
                    value: s,
                    label: s,
                  })),
                },
                { key: 'icd10', label: 'รหัส ICD-10', type: 'text', required: true },
                { key: 'diagnosis', label: 'การวินิจฉัย', type: 'text', required: true },
                { key: 'procedure', label: 'หัตถการ', type: 'text', required: true },
                {
                  key: 'role',
                  label: 'บทบาท',
                  type: 'select',
                  options: [
                    { value: 'Perform', label: 'Perform' },
                    { value: 'Assist', label: 'Assist' },
                    { value: 'Observe', label: 'Observe' },
                  ],
                },
                { key: 'preceptor', label: 'อาจารย์ผู้ควบคุม', type: 'text', required: true },
                {
                  key: 'status',
                  label: 'สถานะการรับรอง',
                  type: 'select',
                  options: [
                    { value: 'approved', label: 'รับรองแล้ว (approved)' },
                    { value: 'pending', label: 'รอรับรอง (pending)' },
                    { value: 'revision', label: 'ส่งกลับแก้ไข (revision)' },
                  ],
                },
                { key: 'patientSummary', label: 'ข้อมูลผู้ป่วยโดยสรุป', type: 'textarea', colSpan: 2 },
                { key: 'reflection', label: 'บันทึกสะท้อนคิด', type: 'textarea', colSpan: 2 },
              ]}
              createDefaults={() => ({
                date: '24 พ.ย. 2569',
                caseCode: `CASE-${Date.now().toString().slice(-4)}`,
                department: departments[0]?.nameTh ?? 'กลุ่มงานอายุรศาสตร์',
                setting: 'IPD',
                icd10: 'J18.9',
                diagnosis: '',
                procedure: '',
                role: 'Perform',
                preceptor: currentUserName,
                status: 'approved',
                patientSummary: '',
                reflection: '',
              })}
              toFormValues={(e) => ({ ...e })}
              fromFormValues={(v, existing) => ({
                id: existing?.id ?? `log-${Date.now()}`,
                date: String(v.date).trim(),
                caseCode: String(v.caseCode).trim(),
                department: String(v.department).trim(),
                setting: v.setting as ClinicalSetting,
                icd10: String(v.icd10).trim(),
                diagnosis: String(v.diagnosis).trim(),
                procedure: String(v.procedure).trim(),
                role: v.role as ProcedureRole,
                preceptor: String(v.preceptor).trim(),
                status: v.status as LogbookStatus,
                patientSummary: String(v.patientSummary ?? '').trim(),
                reflection: String(v.reflection ?? '').trim(),
                feedback: existing?.feedback,
              })}
              onCreate={(item) => {
                onSaveLogbookEntries([item, ...logbookEntries]);
                onNotify('เพิ่มรายการ E-Logbook เรียบร้อยแล้ว');
              }}
              onUpdate={(item) => {
                onSaveLogbookEntries(logbookEntries.map((x) => (x.id === item.id ? item : x)));
                onNotify('อัปเดตรายการ E-Logbook เรียบร้อยแล้ว');
              }}
              onDelete={(id) => {
                onSaveLogbookEntries(logbookEntries.filter((x) => x.id !== id));
                onNotify('ลบรายการ E-Logbook แล้ว');
              }}
            />
          )}

          {domain === 'resources' && subEntity === 'cpgProtocols' && (
            <AdminEntityCrudList<CpgProtocol>
              title="แนวทางเวชปฏิบัติ รพ.สุรินทร์ (Surin CPG Protocols)"
              subtitle="เพิ่ม แก้ไข หรือลบคู่มือ CPG ประจำศูนย์แพทยฯ"
              items={cpgProtocols}
              getId={(c) => c.id}
              getBadge={(c) => `${c.code} · อัปเดต ${c.updatedAt}`}
              getTitle={(c) => c.title}
              getMeta={(c) => `${c.department} — ${c.summary}`}
              fields={[
                { key: 'code', label: 'รหัส CPG', type: 'text', required: true },
                {
                  key: 'department',
                  label: 'กลุ่มงาน',
                  type: deptOptions.length > 0 ? 'select' : 'text',
                  options: deptOptions,
                  required: true,
                },
                { key: 'title', label: 'ชื่อแนวทางเวชปฏิบัติ', type: 'text', required: true },
                { key: 'updatedAt', label: 'วันที่ปรับปรุงล่าสุด', type: 'text', required: true },
                { key: 'summary', label: 'สรุปสาระสำคัญ', type: 'textarea', required: true, colSpan: 2 },
                { key: 'keyCriteria', label: 'เกณฑ์วินิจฉัยสำคัญ (บรรทัดละ 1 ข้อ)', type: 'lines' },
                { key: 'immediateOrders', label: 'คำสั่งการรักษาเร่งด่วน (บรรทัดละ 1 ข้อ)', type: 'lines' },
                { key: 'referralOrEscalation', label: 'เกณฑ์ปรึกษาผู้เชี่ยวชาญ / ส่งต่อ', type: 'textarea', colSpan: 2 },
              ]}
              createDefaults={() => ({
                code: `CPG-SUR-${cpgProtocols.length + 1}`,
                department: departments[0]?.nameTh ?? 'กลุ่มงานอายุรศาสตร์',
                title: '',
                updatedAt: 'พ.ย. 2569',
                summary: '',
                keyCriteria: '',
                immediateOrders: '',
                referralOrEscalation: '',
              })}
              toFormValues={(c) => ({
                code: c.code,
                department: c.department,
                title: c.title,
                updatedAt: c.updatedAt,
                summary: c.summary,
                keyCriteria: c.keyCriteria.join('\n'),
                immediateOrders: c.immediateOrders.join('\n'),
                referralOrEscalation: c.referralOrEscalation,
              })}
              fromFormValues={(v, existing) => ({
                id: existing?.id ?? `cpg-${Date.now()}`,
                code: String(v.code).trim(),
                department: String(v.department).trim(),
                title: String(v.title).trim(),
                updatedAt: String(v.updatedAt).trim(),
                summary: String(v.summary).trim(),
                keyCriteria: parseLines(v.keyCriteria),
                immediateOrders: parseLines(v.immediateOrders),
                referralOrEscalation: String(v.referralOrEscalation ?? '').trim(),
              })}
              onCreate={(item) => {
                onSaveCpgProtocols([item, ...cpgProtocols]);
                onNotify('เพิ่มแนวทาง CPG ใหม่เรียบร้อยแล้ว');
              }}
              onUpdate={(item) => {
                onSaveCpgProtocols(cpgProtocols.map((x) => (x.id === item.id ? item : x)));
                onNotify('อัปเดตแนวทาง CPG เรียบร้อยแล้ว');
              }}
              onDelete={(id) => {
                onSaveCpgProtocols(cpgProtocols.filter((x) => x.id !== id));
                onNotify('ลบแนวทาง CPG แล้ว');
              }}
            />
          )}

          {domain === 'resources' && subEntity === 'referenceMaterials' && (
            <AdminEntityCrudList<ClinicalReferenceMaterial>
              title="ตำราแพทย์ คู่มือ และอุปกรณ์ห้องสมุดศูนย์แพทยฯ"
              subtitle="เพิ่ม แก้ไข จำนวนเล่ม/ชุด หรือลบสื่อการเรียนรู้"
              items={referenceMaterials}
              getId={(m) => m.id}
              getBadge={(m) => `${m.callNumber} · คงเหลือ ${m.availableCopies}/${m.totalCopies}`}
              getTitle={(m) => m.title}
              getMeta={(m) => `${m.category} · ${m.department} · ${m.shelfLocation} (ยืมได้ ${m.loanDays} วัน)`}
              fields={[
                { key: 'callNumber', label: 'รหัสเลขหมู่ (Call Number)', type: 'text', required: true },
                {
                  key: 'category',
                  label: 'ประเภทสื่อ',
                  type: 'select',
                  options: [
                    { value: 'ตำราแพทย์มาตรฐาน', label: 'ตำราแพทย์มาตรฐาน' },
                    { value: 'คู่มือแนวทางเวชปฏิบัติ', label: 'คู่มือแนวทางเวชปฏิบัติ' },
                    { value: 'อุปกรณ์ฝึกทักษะ / ชุดตรวจ', label: 'อุปกรณ์ฝึกทักษะ / ชุดตรวจ' },
                  ],
                },
                { key: 'title', label: 'ชื่อหนังสือ / อุปกรณ์', type: 'text', required: true, colSpan: 2 },
                {
                  key: 'department',
                  label: 'กลุ่มงาน',
                  type: deptOptions.length > 0 ? 'select' : 'text',
                  options: deptOptions,
                  required: true,
                },
                { key: 'shelfLocation', label: 'ตำแหน่งชั้นวาง', type: 'text', required: true },
                { key: 'totalCopies', label: 'จำนวนทั้งหมด', type: 'number', min: 1 },
                { key: 'availableCopies', label: 'คงเหลือให้ยืม', type: 'number', min: 0 },
                { key: 'loanDays', label: 'ระยะเวลายืม (วัน)', type: 'number', min: 1, max: 60 },
              ]}
              createDefaults={() => ({
                callNumber: `WB-${100 + referenceMaterials.length}`,
                category: 'ตำราแพทย์มาตรฐาน',
                title: '',
                department: departments[0]?.nameTh ?? 'กลุ่มงานอายุรศาสตร์',
                shelfLocation: 'ชั้น A2 · ห้องสมุด ศพค.',
                totalCopies: 3,
                availableCopies: 3,
                loanDays: 7,
              })}
              toFormValues={(m) => ({ ...m })}
              fromFormValues={(v, existing) => ({
                id: existing?.id ?? `ref-${Date.now()}`,
                callNumber: String(v.callNumber).trim(),
                category: v.category as ClinicalReferenceMaterial['category'],
                title: String(v.title).trim(),
                department: String(v.department).trim(),
                shelfLocation: String(v.shelfLocation).trim(),
                totalCopies: Number(v.totalCopies) || 1,
                availableCopies: Number(v.availableCopies) || 0,
                loanDays: Number(v.loanDays) || 7,
              })}
              onCreate={(item) => {
                onSaveReferenceMaterials([item, ...referenceMaterials]);
                onNotify('เพิ่มรายการสื่อการเรียนรู้แล้ว');
              }}
              onUpdate={(item) => {
                onSaveReferenceMaterials(referenceMaterials.map((x) => (x.id === item.id ? item : x)));
                onNotify('อัปเดตสื่อการเรียนรู้แล้ว');
              }}
              onDelete={(id) => {
                onSaveReferenceMaterials(referenceMaterials.filter((x) => x.id !== id));
                onNotify('ลบรายการสื่อการเรียนรู้แล้ว');
              }}
            />
          )}

          {domain === 'resources' && subEntity === 'researchProjects' && (
            <AdminEntityCrudList<ResearchProject>
              title="โครงการวิจัยและงานวิชาการ (IRB & Research)"
              subtitle="เพิ่ม แก้ไข ปรับสถานะ IRB หรือลบโครงการวิจัย"
              items={researchProjects}
              getId={(p) => p.id}
              getBadge={(p) => `${p.year} · ${p.status}`}
              getTitle={(p) => p.title}
              getMeta={(p) => `ผู้วิจัยหลัก: ${p.leadInvestigator} · ที่ปรึกษา: ${p.advisor} · ${p.department}`}
              fields={[
                { key: 'title', label: 'ชื่อโครงการวิจัย', type: 'text', required: true, colSpan: 2 },
                { key: 'leadInvestigator', label: 'ผู้วิจัยหลัก', type: 'text', required: true },
                { key: 'advisor', label: 'อาจารย์ที่ปรึกษา', type: 'text', required: true },
                {
                  key: 'department',
                  label: 'กลุ่มงาน',
                  type: deptOptions.length > 0 ? 'select' : 'text',
                  options: deptOptions,
                  required: true,
                },
                { key: 'year', label: 'ปี พ.ศ.', type: 'text', required: true },
                {
                  key: 'status',
                  label: 'สถานะ IRB',
                  type: 'select',
                  options: [
                    { value: 'กำลังเก็บข้อมูล', label: 'กำลังเก็บข้อมูล' },
                    { value: 'ผ่านจริยธรรมการวิจัย (IRB)', label: 'ผ่านจริยธรรมการวิจัย (IRB)' },
                    { value: 'ตีพิมพ์/นำเสนอแล้ว', label: 'ตีพิมพ์/นำเสนอแล้ว' },
                  ],
                },
                { key: 'abstract', label: 'บทคัดย่อโดยสังเขป', type: 'textarea', colSpan: 2 },
              ]}
              createDefaults={() => ({
                title: '',
                leadInvestigator: 'นศพ.ธนภัทร ศรีสุรินทร์',
                advisor: 'นพ.เอกรัตน์ วัฒนสุรินทร์',
                department: departments[0]?.nameTh ?? 'กลุ่มงานอายุรศาสตร์',
                year: '2569',
                status: 'กำลังเก็บข้อมูล',
                abstract: '',
              })}
              toFormValues={(p) => ({ ...p })}
              fromFormValues={(v, existing) => ({
                id: existing?.id ?? `res-${Date.now()}`,
                title: String(v.title).trim(),
                leadInvestigator: String(v.leadInvestigator).trim(),
                advisor: String(v.advisor).trim(),
                department: String(v.department).trim(),
                year: String(v.year).trim(),
                status: v.status as ResearchProject['status'],
                abstract: String(v.abstract ?? '').trim(),
              })}
              onCreate={(item) => {
                onSaveResearchProjects([item, ...researchProjects]);
                onNotify('เพิ่มโครงการวิจัยใหม่แล้ว');
              }}
              onUpdate={(item) => {
                onSaveResearchProjects(researchProjects.map((x) => (x.id === item.id ? item : x)));
                onNotify('อัปเดตโครงการวิจัยแล้ว');
              }}
              onDelete={(id) => {
                onSaveResearchProjects(researchProjects.filter((x) => x.id !== id));
                onNotify('ลบโครงการวิจัยแล้ว');
              }}
            />
          )}

          {domain === 'resources' && subEntity === 'welfareRequests' && (
            <AdminEntityCrudList<WelfareRequest>
              title="คำร้องสวัสดิการ หอพัก และนัดพบอาจารย์ที่ปรึกษา"
              subtitle="เพิ่ม แก้ไข ปรับสถานะ หรือลบคำร้องสวัสดิการ"
              items={welfareRequests}
              getId={(w) => w.id}
              getBadge={(w) => `${w.type} · ${w.status}`}
              getTitle={(w) => w.subject}
              getMeta={(w) => `${w.submittedAt} · นัดหมาย/ห้อง: ${w.preferredDateOrRoom} · ${w.detail}`}
              fields={[
                {
                  key: 'type',
                  label: 'ประเภทคำร้อง',
                  type: 'select',
                  options: [
                    { value: 'นัดพบอาจารย์ที่ปรึกษา', label: 'นัดพบอาจารย์ที่ปรึกษา' },
                    { value: 'แจ้งซ่อมหอพัก', label: 'แจ้งซ่อมหอพัก' },
                  ],
                },
                {
                  key: 'status',
                  label: 'สถานะดำเนินการ',
                  type: 'select',
                  options: [
                    { value: 'รอดำเนินการ', label: 'รอดำเนินการ' },
                    { value: 'นัดหมายแล้ว', label: 'นัดหมายแล้ว' },
                  ],
                },
                { key: 'subject', label: 'หัวข้อเรื่อง', type: 'text', required: true },
                { key: 'preferredDateOrRoom', label: 'วันเวลาที่สะดวก / เลขห้องพัก', type: 'text', required: true },
                { key: 'submittedAt', label: 'วันที่ส่งคำร้อง', type: 'text', required: true },
                { key: 'detail', label: 'รายละเอียด', type: 'textarea', required: true, colSpan: 2 },
              ]}
              createDefaults={() => ({
                type: 'นัดพบอาจารย์ที่ปรึกษา',
                status: 'รอดำเนินการ',
                subject: '',
                preferredDateOrRoom: 'ตามเวลาที่สะดวก',
                submittedAt: '24 พ.ย. 2569',
                detail: '',
              })}
              toFormValues={(w) => ({ ...w })}
              fromFormValues={(v, existing) => ({
                id: existing?.id ?? `wel-${Date.now()}`,
                type: v.type as WelfareRequest['type'],
                status: v.status as WelfareRequest['status'],
                subject: String(v.subject).trim(),
                preferredDateOrRoom: String(v.preferredDateOrRoom).trim(),
                submittedAt: String(v.submittedAt).trim(),
                detail: String(v.detail).trim(),
              })}
              onCreate={(item) => {
                onSaveWelfareRequests([item, ...welfareRequests]);
                onNotify('เพิ่มคำร้องสวัสดิการแล้ว');
              }}
              onUpdate={(item) => {
                onSaveWelfareRequests(welfareRequests.map((x) => (x.id === item.id ? item : x)));
                onNotify('อัปเดตคำร้องสวัสดิการแล้ว');
              }}
              onDelete={(id) => {
                onSaveWelfareRequests(welfareRequests.filter((x) => x.id !== id));
                onNotify('ลบคำร้องสวัสดิการแล้ว');
              }}
            />
          )}

          {domain === 'resources' && subEntity === 'bedsideCheckIns' && (
            <AdminEntityCrudList<BedsideCheckInRecord>
              title="ประวัติการสแกน QR ข้างเตียงและราวด์วอร์ด (Bedside Check-ins)"
              subtitle="แก้ไขหรือลบบันทึกเคสข้างเตียงผู้ป่วยในระบบ"
              items={bedsideCheckIns}
              getId={(b) => b.id}
              getBadge={(b) => `${b.caseCode} · ${b.icd10}`}
              getTitle={(b) => `${b.diagnosis} (${b.bedOrRoom})`}
              getMeta={(b) => `${b.studentName} · ${b.department} · ${b.checkedInDate} ${b.checkedInAt} · ${b.supervisingStaff}`}
              fields={[
                { key: 'caseCode', label: 'รหัสเคส', type: 'text', required: true },
                { key: 'studentName', label: 'นักศึกษาแพทย์', type: 'text', required: true },
                { key: 'department', label: 'กลุ่มงาน', type: 'text', required: true },
                { key: 'wardOrUnit', label: 'หอผู้ป่วย', type: 'text', required: true },
                { key: 'bedOrRoom', label: 'เตียง / ห้อง', type: 'text', required: true },
                { key: 'diagnosis', label: 'การวินิจฉัย', type: 'text', required: true },
                { key: 'icd10', label: 'ICD-10', type: 'text', required: true },
                { key: 'supervisingStaff', label: 'อาจารย์ผู้กำกับ', type: 'text', required: true },
                { key: 'patientSummary', label: 'ข้อมูลผู้ป่วยโดยย่อ', type: 'textarea', colSpan: 2 },
              ]}
              createDefaults={() => ({
                caseCode: `CASE-${Date.now().toString().slice(-4)}`,
                studentName: 'นศพ.ธนภัทร ศรีสุรินทร์',
                department: departments[0]?.nameTh ?? 'กลุ่มงานอายุรศาสตร์',
                wardOrUnit: 'หอผู้ป่วยอายุรกรรมชาย 1',
                bedOrRoom: 'เตียง 1',
                diagnosis: '',
                icd10: 'A41.9',
                supervisingStaff: currentUserName,
                patientSummary: '',
              })}
              toFormValues={(b) => ({
                caseCode: b.caseCode,
                studentName: b.studentName,
                department: b.department,
                wardOrUnit: b.wardOrUnit,
                bedOrRoom: b.bedOrRoom,
                diagnosis: b.diagnosis,
                icd10: b.icd10,
                supervisingStaff: b.supervisingStaff,
                patientSummary: b.patientSummary ?? '',
              })}
              fromFormValues={(v, existing) => ({
                id: existing?.id ?? `bed-${Date.now()}`,
                bedsideCode: existing?.bedsideCode ?? 'BED-ADMIN',
                scanKind: existing?.scanKind ?? 'patient_case',
                caseCode: String(v.caseCode).trim(),
                studentName: String(v.studentName).trim(),
                department: String(v.department).trim(),
                wardOrUnit: String(v.wardOrUnit).trim(),
                bedOrRoom: String(v.bedOrRoom).trim(),
                diagnosis: String(v.diagnosis).trim(),
                icd10: String(v.icd10).trim(),
                supervisingStaff: String(v.supervisingStaff).trim(),
                patientSummary: String(v.patientSummary ?? '').trim(),
                checkedInAt: existing?.checkedInAt ?? '08:30 น.',
                checkedInDate: existing?.checkedInDate ?? '24 พ.ย. 2569',
                reflectionNote: existing?.reflectionNote,
                clinicalTakeaway: existing?.clinicalTakeaway,
                roleInEncounter: existing?.roleInEncounter,
                syncedToLogbookId: existing?.syncedToLogbookId,
                reflectionSavedAt: existing?.reflectionSavedAt,
                roundingNote: existing?.roundingNote,
                roundingKeyVitalsOrLabs: existing?.roundingKeyVitalsOrLabs,
                roundingTodo: existing?.roundingTodo,
                roundingPriority: existing?.roundingPriority,
                roundingUpdatedAt: existing?.roundingUpdatedAt,
                sbarHandoff: existing?.sbarHandoff,
              })}
              onCreate={(item) => {
                onSaveBedsideCheckIns([item, ...bedsideCheckIns]);
                onNotify('เพิ่มบันทึกเคสข้างเตียงแล้ว');
              }}
              onUpdate={(item) => {
                onSaveBedsideCheckIns(bedsideCheckIns.map((x) => (x.id === item.id ? item : x)));
                onNotify('อัปเดตบันทึกเคสข้างเตียงแล้ว');
              }}
              onDelete={(id) => {
                onSaveBedsideCheckIns(bedsideCheckIns.filter((x) => x.id !== id));
                onNotify('ลบบันทึกเคสข้างเตียงแล้ว');
              }}
            />
          )}

          {/* 5B. CLINICAL PERSONNEL & COHORT STUDENTS */}
          {domain === 'personnel' && subEntity === 'clinicalPersonnel' && (
            <AdminEntityCrudList<ClinicalPersonnelRecord>
              title="ทำเนียบแพทย์ Intern · แพทย์พี่เลี้ยง · แพทย์ประจำบ้าน"
              subtitle="เพิ่ม แก้ไข หรือลบรูปถ่ายและข้อมูลแพทย์แต่ละชั้นปี วอร์ดปัจจุบัน เลขที่ใบประกอบวิชาชีพ และข้อมูลพื้นฐาน"
              items={clinicalPersonnel}
              getId={(p) => p.id}
              getAvatarUrl={(p) => p.photoUrl}
              getAvatarName={(p) => p.fullName}
              getBadge={(p) =>
                `${
                  p.category === 'intern'
                    ? 'แพทย์ Intern'
                    : p.category === 'preceptor'
                      ? 'แพทย์พี่เลี้ยง'
                      : 'แพทย์ประจำบ้าน'
                } · ${p.yearLevel} · ${p.medicalLicenseNo}`
              }
              getTitle={(p) => p.fullName}
              getMeta={(p) =>
                `${p.department} · ${p.currentWard} · ${p.phoneOrPager} · ${p.status}`
              }
              fields={[
                { key: 'photoUrl', label: 'รูปประจำตัวสมาชิก', type: 'image', colSpan: 2 },
                { key: 'personnelCode', label: 'รหัสประจำตัว (เช่น INT-6906)', type: 'text', required: true },
                { key: 'fullName', label: 'ชื่อ-สกุล', type: 'text', required: true },
                {
                  key: 'category',
                  label: 'ประเภทบุคลากร',
                  type: 'select',
                  options: [
                    { value: 'intern', label: 'แพทย์ Intern' },
                    { value: 'preceptor', label: 'แพทย์พี่เลี้ยง (Preceptor)' },
                    { value: 'resident', label: 'แพทย์ประจำบ้าน (Resident)' },
                  ],
                },
                {
                  key: 'yearLevel',
                  label: 'ชั้นปี / ระดับที่รับผิดชอบ',
                  type: 'select',
                  options: [
                    { value: 'ปี 1', label: 'ปี 1 (Intern 1 / R1)' },
                    { value: 'ปี 2', label: 'ปี 2 (Intern 2 / R2)' },
                    { value: 'ปี 3', label: 'ปี 3 (R3 Chief/Senior)' },
                    { value: 'ดูแลปี 4', label: 'แพทย์พี่เลี้ยงดูแลปี 4' },
                    { value: 'ดูแลปี 5', label: 'แพทย์พี่เลี้ยงดูแลปี 5' },
                    { value: 'ดูแลปี 6 (Extern)', label: 'แพทย์พี่เลี้ยงดูแลปี 6 (Extern)' },
                    { value: 'ประจำกลุ่มงาน', label: 'แพทย์พี่เลี้ยงประจำกลุ่มงาน' },
                  ],
                },
                { key: 'department', label: 'กลุ่มงานคลินิก', type: 'select', options: deptOptions },
                { key: 'currentWard', label: 'หอผู้ป่วย / จุดปฏิบัติงานปัจจุบัน', type: 'text', required: true },
                { key: 'medicalLicenseNo', label: 'เลขที่ใบประกอบวิชาชีพ (ว.)', type: 'text', required: true },
                { key: 'institutionOrBoard', label: 'สถาบันที่จบ / วุฒิบัตรเฉพาะทาง', type: 'text', required: true },
                { key: 'phoneOrPager', label: 'เบอร์ภายใน / วิทยุสื่อสาร', type: 'text', required: true },
                { key: 'email', label: 'อีเมล (ถ้ามี)', type: 'text' },
                {
                  key: 'status',
                  label: 'สถานะปฏิบัติงาน',
                  type: 'select',
                  options: [
                    { value: 'ปฏิบัติงานปกติ', label: 'ปฏิบัติงานปกติ' },
                    { value: 'หมุนเวียน รพ.ชุมชน', label: 'หมุนเวียน รพ.ชุมชน' },
                    { value: 'ออกตรวจ OPD / OR', label: 'ออกตรวจ OPD / OR' },
                    { value: 'ลาศึกษาต่อ/ประชุม', label: 'ลาศึกษาต่อ/ประชุม' },
                  ],
                },
                { key: 'supervisingNote', label: 'บทบาทหน้าที่ / ข้อมูลเพิ่มเติม', type: 'textarea' },
              ]}
              createDefaults={() => ({
                photoUrl: PRESET_MEMBER_PORTRAITS[0]?.url ?? '',
                personnelCode: `DOC-${Date.now().toString().slice(-4)}`,
                fullName: '',
                category: 'intern',
                yearLevel: 'ปี 1',
                department: departments[0]?.nameTh ?? 'กลุ่มงานอายุรศาสตร์',
                currentWard: 'อายุรกรรมชาย 1',
                medicalLicenseNo: 'ว.',
                institutionOrBoard: 'แพทยศาสตรบัณฑิต',
                phoneOrPager: 'ภายใน ',
                email: '',
                status: 'ปฏิบัติงานปกติ',
                supervisingNote: '',
              })}
              toFormValues={(p) => ({
                photoUrl: p.photoUrl ?? '',
                personnelCode: p.personnelCode,
                fullName: p.fullName,
                category: p.category,
                yearLevel: p.yearLevel,
                department: p.department,
                currentWard: p.currentWard,
                medicalLicenseNo: p.medicalLicenseNo,
                institutionOrBoard: p.institutionOrBoard,
                phoneOrPager: p.phoneOrPager,
                email: p.email ?? '',
                status: p.status,
                supervisingNote: p.supervisingNote,
              })}
              fromFormValues={(v, existing) => ({
                id: existing?.id ?? `pers-${Date.now()}`,
                photoUrl: sanitizeAvatarUrlInput(String(v.photoUrl ?? '')) ?? undefined,
                personnelCode: String(v.personnelCode).trim(),
                fullName: String(v.fullName).trim(),
                category: v.category as ClinicalPersonnelCategory,
                yearLevel: v.yearLevel as PersonnelYearTag,
                department: String(v.department).trim(),
                currentWard: String(v.currentWard).trim(),
                medicalLicenseNo: String(v.medicalLicenseNo).trim(),
                institutionOrBoard: String(v.institutionOrBoard).trim(),
                phoneOrPager: String(v.phoneOrPager).trim(),
                email: String(v.email ?? '').trim() || undefined,
                status: v.status as ClinicalPersonnelRecord['status'],
                supervisingNote: String(v.supervisingNote ?? '').trim(),
              })}
              onCreate={(item) => {
                onSaveClinicalPersonnel([item, ...clinicalPersonnel]);
                onNotify(`เพิ่มข้อมูล ${item.fullName} เรียบร้อยแล้ว`);
              }}
              onUpdate={(item) => {
                onSaveClinicalPersonnel(
                  clinicalPersonnel.map((x) => (x.id === item.id ? item : x))
                );
                onNotify(`อัปเดตข้อมูล ${item.fullName} เรียบร้อยแล้ว`);
              }}
              onDelete={(id) => {
                onSaveClinicalPersonnel(clinicalPersonnel.filter((x) => x.id !== id));
                onNotify('ลบรายชื่อบุคลากรแล้ว');
              }}
            />
          )}

          {domain === 'personnel' && subEntity === 'cohortStudents' && (
            <AdminEntityCrudList<CohortStudentRecord>
              title="ทำเนียบรายชื่อนักศึกษาแพทย์ชั้นคลินิก (ชั้นปีที่ 4–6)"
              subtitle="เพิ่ม แก้ไข หรือลบรูปถ่ายและรายชื่อนักศึกษาแพทย์แต่ละชั้นปี ยอดรวมบนแดชบอร์ดหน้าหลักจะอัปเดตอัตโนมัติ"
              items={cohortStudents}
              getId={(s) => s.studentId}
              getAvatarUrl={(s) => s.photoUrl || studentPhotos[s.studentId]}
              getAvatarName={(s) => s.studentName}
              getBadge={(s) =>
                `ชั้นปีที่ ${s.yearLevel}${s.yearLevel === '6' ? ' (Extern)' : ''} · ${s.group}`
              }
              getTitle={(s) => `${s.studentId} · ${s.studentName}`}
              getMeta={(s) =>
                `ที่ปรึกษา: ${s.advisorName ?? '-'} · ติดต่อ: ${s.contactInfo ?? '-'} · ${s.status ?? 'ฝึกปฏิบัติคลินิก'}`
              }
              fields={[
                { key: 'photoUrl', label: 'รูปประจำตัวนักศึกษา', type: 'image', colSpan: 2 },
                { key: 'studentId', label: 'รหัสนักศึกษา (เช่น 66104040)', type: 'text', required: true, readOnlyOnEdit: true },
                { key: 'studentName', label: 'ชื่อ-สกุลนักศึกษาแพทย์', type: 'text', required: true },
                {
                  key: 'yearLevel',
                  label: 'ชั้นปี',
                  type: 'select',
                  options: [
                    { value: '4', label: 'ชั้นปีที่ 4' },
                    { value: '5', label: 'ชั้นปีที่ 5' },
                    { value: '6', label: 'ชั้นปีที่ 6 (Extern)' },
                  ],
                },
                {
                  key: 'group',
                  label: 'กลุ่มปฏิบัติงาน',
                  type: 'select',
                  options: [
                    { value: 'กลุ่ม A', label: 'กลุ่ม A' },
                    { value: 'กลุ่ม B', label: 'กลุ่ม B' },
                    { value: 'กลุ่ม C', label: 'กลุ่ม C' },
                  ],
                },
                { key: 'advisorName', label: 'อาจารย์ที่ปรึกษา', type: 'text' },
                { key: 'contactInfo', label: 'ข้อมูลติดต่อ / หอพัก', type: 'text' },
                {
                  key: 'status',
                  label: 'สถานะการศึกษา',
                  type: 'select',
                  options: [
                    { value: 'ฝึกปฏิบัติคลินิก', label: 'ฝึกปฏิบัติคลินิก' },
                    { value: 'กำลังศึกษา', label: 'กำลังศึกษา' },
                    { value: 'พักการศึกษา', label: 'พักการศึกษา' },
                  ],
                },
              ]}
              createDefaults={() => ({
                photoUrl: PRESET_MEMBER_PORTRAITS[0]?.url ?? '',
                studentId: `66104${Date.now().toString().slice(-3)}`,
                studentName: 'นศพ. ',
                yearLevel: '4',
                group: 'กลุ่ม A',
                advisorName: 'นพ.เอกรัตน์ วัฒนสุรินทร์',
                contactInfo: 'หอพักนักศึกษาแพทย์ ศพค.',
                status: 'ฝึกปฏิบัติคลินิก',
              })}
              toFormValues={(s) => ({
                photoUrl: s.photoUrl ?? studentPhotos[s.studentId] ?? '',
                studentId: s.studentId,
                studentName: s.studentName,
                yearLevel: s.yearLevel,
                group: s.group,
                advisorName: s.advisorName ?? '',
                contactInfo: s.contactInfo ?? '',
                status: s.status ?? 'ฝึกปฏิบัติคลินิก',
              })}
              fromFormValues={(v, existing) => ({
                photoUrl: sanitizeAvatarUrlInput(String(v.photoUrl ?? '')) ?? '',
                studentId: existing?.studentId ?? String(v.studentId).trim(),
                studentName: String(v.studentName).trim(),
                yearLevel: v.yearLevel as AcademicYearLevel,
                group: String(v.group).trim(),
                advisorName: String(v.advisorName ?? '').trim() || undefined,
                contactInfo: String(v.contactInfo ?? '').trim() || undefined,
                status: v.status as CohortStudentRecord['status'],
              })}
              onCreate={(item) => {
                if (cohortStudents.some((s) => s.studentId === item.studentId)) {
                  onNotify(`รหัสนักศึกษา ${item.studentId} มีอยู่ในระบบแล้ว`);
                  return;
                }
                onSaveCohortStudents([item, ...cohortStudents]);
                onSyncStudentPhoto?.(item.studentId, item.photoUrl ?? '');
                onNotify(`เพิ่มนักศึกษา ${item.studentName} เรียบร้อยแล้ว`);
              }}
              onUpdate={(item) => {
                onSaveCohortStudents(
                  cohortStudents.map((x) => (x.studentId === item.studentId ? item : x))
                );
                onSyncStudentPhoto?.(item.studentId, item.photoUrl ?? '');
                onNotify(`อัปเดตข้อมูล ${item.studentName} เรียบร้อยแล้ว`);
              }}
              onDelete={(id) => {
                onSaveCohortStudents(cohortStudents.filter((x) => x.studentId !== id));
                onSyncStudentPhoto?.(id, '');
                onNotify('ลบรายชื่อนักศึกษาแพทย์แล้ว');
              }}
            />
          )}

          {/* 6. SYSTEM, MEMBERS, QR & BACKUP */}
          {domain === 'system' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuthManage();
                  }}
                  className="p-5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left space-y-2 cursor-pointer transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#091A32] text-[#2DD4BF] flex items-center justify-center">
                    <UserCog className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div className="text-sm font-semibold text-slate-900">
                    จัดการสมาชิกและออกรหัสผ่าน (Member CRUD)
                  </div>
                  <p className="text-xs text-slate-600">
                    เพิ่ม แก้ไข ลบ บัญชีนักศึกษา อาจารย์ นักวิชาการ และแอดมิน พร้อมออกรหัสผ่านเริ่มต้น
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenQrGenerator();
                  }}
                  className="p-5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left space-y-2 cursor-pointer transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#0F766E] text-white flex items-center justify-center">
                    <QrCode className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div className="text-sm font-semibold text-slate-900">
                    จัดการ QR Code หอผู้ป่วยและหัตถการ ({customQrStations.length})
                  </div>
                  <p className="text-xs text-slate-600">
                    สร้าง พิมพ์ป้าย เปิด/ปิดใช้งานชั่วคราว และลบจุดเช็กอิน QR Code
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSheetsSync();
                  }}
                  className="p-5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left space-y-2 cursor-pointer transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#0F2A4A] text-white flex items-center justify-center">
                    <Database className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div className="text-sm font-semibold text-slate-900">
                    ซิงค์ฐานข้อมูล Google Sheets (Cloud Sync)
                  </div>
                  <p className="text-xs text-slate-600">
                    Push / Pull ข้อมูลทั้งหมดไปยัง Google Apps Script & Google Sheets ของศูนย์แพทยฯ
                  </p>
                </button>
              </div>

              {/* QR Stations inline quick toggle/delete */}
              <AdminEntityCrudList<FacultyGeneratedQrStation>
                title="รายการ QR Code เช็กอินทั้งหมดในระบบ"
                subtitle="แอดมินสามารถแก้ไข ปิดใช้งานชั่วคราว หรือลบ QR Code หอผู้ป่วยและหัตถการได้โดยตรง"
                items={customQrStations}
                getId={(q) => q.id}
                getBadge={(q) => `${q.code} · ${q.isActive ? 'เปิดใช้งาน' : 'ปิดชั่วคราว'}`}
                getTitle={(q) => (q.kind === 'procedure' ? q.procedureName ?? q.wardOrUnit : q.wardOrUnit)}
                getMeta={(q) => `${q.department} · ผู้กำกับ: ${q.supervisingStaff} · สแกนแล้ว ${q.checkInCount} ครั้ง`}
                fields={[
                  { key: 'code', label: 'รหัส QR', type: 'text', required: true, readOnlyOnEdit: true },
                  {
                    key: 'kind',
                    label: 'ประเภท',
                    type: 'select',
                    options: [
                      { value: 'ward', label: 'หอผู้ป่วย / เวร' },
                      { value: 'procedure', label: 'หัตถการทางคลินิก' },
                    ],
                  },
                  { key: 'department', label: 'กลุ่มงาน', type: 'text', required: true },
                  { key: 'wardOrUnit', label: 'หอผู้ป่วย / จุดปฏิบัติงาน', type: 'text', required: true },
                  { key: 'procedureName', label: 'ชื่อหัตถการ (กรณีเป็น QR หัตถการ)', type: 'text' },
                  { key: 'supervisingStaff', label: 'อาจารย์ผู้กำกับ', type: 'text', required: true },
                  { key: 'isActive', label: 'เปิดใช้งานให้สแกนได้ (Active)', type: 'checkbox' },
                ]}
                createDefaults={() => ({
                  code: `ADMIN-${Date.now().toString().slice(-4)}`,
                  kind: 'ward',
                  department: departments[0]?.nameTh ?? 'กลุ่มงานอายุรศาสตร์',
                  wardOrUnit: 'หอผู้ป่วยอายุรกรรมชาย 1',
                  procedureName: '',
                  supervisingStaff: currentUserName,
                  isActive: true,
                })}
                toFormValues={(q) => ({
                  code: q.code,
                  kind: q.kind,
                  department: q.department,
                  wardOrUnit: q.wardOrUnit,
                  procedureName: q.procedureName ?? '',
                  supervisingStaff: q.supervisingStaff,
                  isActive: q.isActive,
                })}
                fromFormValues={(v, existing) => ({
                  id: existing?.id ?? `fq-${Date.now()}`,
                  code: String(v.code).trim(),
                  kind: v.kind as FacultyGeneratedQrStation['kind'],
                  department: String(v.department).trim(),
                  wardOrUnit: String(v.wardOrUnit).trim(),
                  procedureName: String(v.procedureName ?? '').trim() || undefined,
                  clinicalSetting: existing?.clinicalSetting ?? 'IPD',
                  defaultRole: existing?.defaultRole ?? 'Perform',
                  shiftType: existing?.shiftType ?? 'เวรปฏิบัติงานหอผู้ป่วย (QR Check-in)',
                  supervisingStaff: String(v.supervisingStaff).trim(),
                  createdBy: existing?.createdBy ?? currentUserName,
                  createdAt: existing?.createdAt ?? '24 พ.ย. 2569',
                  isActive: Boolean(v.isActive),
                  checkInCount: existing?.checkInCount ?? 0,
                })}
                onCreate={(item) => {
                  onSaveCustomQrStations([item, ...customQrStations]);
                  onNotify(`สร้าง QR ${item.code} เรียบร้อยแล้ว`);
                }}
                onUpdate={(item) => {
                  onSaveCustomQrStations(customQrStations.map((x) => (x.id === item.id ? item : x)));
                  onNotify(`อัปเดตสถานะ QR ${item.code} เรียบร้อยแล้ว`);
                }}
                onDelete={(id) => {
                  onSaveCustomQrStations(customQrStations.filter((x) => x.id !== id));
                  onNotify('ลบรายการ QR Code แล้ว');
                }}
              />

              {/* Backup / Restore / Factory Reset */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    สำรองข้อมูล กู้คืน และรีเซ็ตระบบ (Portal Backup & Restore)
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    ส่งออกข้อมูลทั้งหมดในพอร์ทัลเป็นไฟล์ JSON เพื่อสำรองไว้ หรือนำเข้าไฟล์ JSON เพื่อกู้คืนข้อมูลทั้งระบบ
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={onExportFullBackup}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#091A32] hover:bg-[#0F2A4A] rounded-lg cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>ส่งออก Backup ทั้งระบบ (.json)</span>
                  </button>

                  <input
                    ref={backupFileInputRef}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        onImportFullBackup(String(reader.result ?? ''));
                      };
                      reader.readAsText(file);
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => backupFileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#0F2A4A] bg-white border border-slate-300 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>นำเข้า Backup (.json)</span>
                  </button>

                  {!confirmFactoryReset ? (
                    <button
                      type="button"
                      onClick={() => setConfirmFactoryReset(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>รีเซ็ตข้อมูลกลับค่าเริ่มต้นทั้งหมด</span>
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-lg px-3 py-1.5">
                      <span className="text-xs font-medium text-rose-800">
                        ยืนยันรีเซ็ตข้อมูลทั้งหมด?
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onResetFactoryDefaults();
                          setConfirmFactoryReset(false);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded cursor-pointer"
                      >
                        ยืนยันรีเซ็ต
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmFactoryReset(false)}
                        className="px-2.5 py-1 text-xs text-slate-700 bg-white border border-slate-300 rounded cursor-pointer"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
