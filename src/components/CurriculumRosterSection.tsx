import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BedDouble,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
  ClipboardPenLine,
  Clock,
  Copy,
  FileCheck2,
  FileText,
  LayoutList,
  List,
  Lock,
  PenLine,
  QrCode,
  RefreshCw,
  Stethoscope,
  X,
} from 'lucide-react';
import {
  AcademicYearLevel,
  BedsideCheckInRecord,
  ClinicalDepartment,
  ClinicalMilestoneBadge,
  ClinicalSkillMasteryItem,
  DutyShift,
  FacultyGeneratedQrStation,
  LeaveRequest,
  ProcedureRole,
  SbarHandoffRecord,
  StudentPhotoMap,
  UserRole,
} from '../types/medicalSchool';
import { formatSbarPlainText } from '../utils/sbarTemplate';
import { DutyRosterCalendar } from './DutyRosterCalendar';
import { DutySwapVisualizer } from './DutySwapVisualizer';
import { ClinicalMilestoneBadgesPanel } from './ClinicalMilestoneBadgesPanel';
import { ClinicalSkillsMasteryChecklist } from './ClinicalSkillsMasteryChecklist';
import { SbarHandoffModal } from './SbarHandoffModal';
import { StudentAvatar } from './StudentAvatar';
import {
  BedsideQrPayload,
  BedsideReflectionInput,
  ProcedureCheckInResult,
  ProcedureQrPayload,
  QrCheckInResult,
  WardQrPayload,
  WardQrScannerModal,
} from './WardQrScannerModal';

interface CurriculumRosterSectionProps {
  role: UserRole;
  currentStudentId?: string;
  currentStudentName?: string;
  currentUserName?: string;
  studentPhotos: StudentPhotoMap;
  departments: ClinicalDepartment[];
  shifts: DutyShift[];
  onCheckInShift: (shiftId: string) => void;
  onQrCheckIn: (payload: WardQrPayload) => QrCheckInResult | null;
  customQrStations?: FacultyGeneratedQrStation[];
  externalScanPayload?: string | null;
  onClearExternalScanPayload?: () => void;
  onOpenFacultyQrGenerator?: (kind?: 'ward' | 'procedure') => void;
  onProcedureQrCheckIn?: (payload: ProcedureQrPayload) => ProcedureCheckInResult | null;
  bedsideCheckIns: BedsideCheckInRecord[];
  onRecordBedsideCheckIn: (payload: BedsideQrPayload) => BedsideCheckInRecord;
  onSaveBedsideReflection: (
    recordId: string,
    input: BedsideReflectionInput
  ) => void;
  onSaveBedsideRoundingNote: (
    recordId: string,
    payload: {
      roundingNote: string;
      roundingKeyVitalsOrLabs?: string;
      roundingTodo?: string;
      roundingPriority: 'normal' | 'watch';
    }
  ) => void;
  onSaveBedsideSbarHandoff: (
    recordId: string,
    payload: Omit<SbarHandoffRecord, 'savedAt'>
  ) => void;
  onRequestSwap: (shiftId: string, note: string) => void;
  onApproveSwap: (shiftId: string) => void;
  leaveRequests: LeaveRequest[];
  onAddLeaveRequest: (req: Omit<LeaveRequest, 'id' | 'submittedAt' | 'status'>) => void;
  onUpdateLeaveStatus: (leaveId: string, status: LeaveRequest['status']) => void;
  clinicalSkills: ClinicalSkillMasteryItem[];
  onToggleStudentSkill: (skillId: string, practiced: boolean, note?: string) => void;
  onValidateSkillWithSignature: (
    skillId: string,
    payload: {
      signerName: string;
      signatureRef: string;
      signatureImage?: string;
    }
  ) => void;
  onRevokeSkillValidation: (skillId: string) => void;
  badges: ClinicalMilestoneBadge[];
  onOpenStudentDirectory?: () => void;
}

export function CurriculumRosterSection({
  role,
  currentStudentId = '64104218',
  currentStudentName = 'นศพ.ธนภัทร ศรีสุรินทร์',
  currentUserName,
  studentPhotos,
  departments,
  shifts,
  onCheckInShift,
  onQrCheckIn,
  customQrStations = [],
  externalScanPayload,
  onClearExternalScanPayload,
  onOpenFacultyQrGenerator,
  onProcedureQrCheckIn,
  bedsideCheckIns,
  onRecordBedsideCheckIn,
  onSaveBedsideReflection,
  onSaveBedsideRoundingNote,
  onSaveBedsideSbarHandoff,
  onRequestSwap,
  onApproveSwap,
  leaveRequests,
  onAddLeaveRequest,
  onUpdateLeaveStatus,
  clinicalSkills,
  onToggleStudentSkill,
  onValidateSkillWithSignature,
  onRevokeSkillValidation,
  badges,
  onOpenStudentDirectory,
}: CurriculumRosterSectionProps) {
  const [selectedYear, setSelectedYear] = useState<'all' | AcademicYearLevel>('all');
  const [selectedDept, setSelectedDept] = useState<ClinicalDepartment | null>(departments[0] ?? null);
  const [rosterViewMode, setRosterViewMode] = useState<'calendar' | 'table'>('calendar');
  const [shiftScope, setShiftScope] = useState<'all' | 'mine'>('all');
  const [shiftDeptFilter, setShiftDeptFilter] = useState<string>('ทั้งหมด');
  const [qrModalOpen, setQrModalOpen] = useState(false);

  useEffect(() => {
    if (externalScanPayload) {
      setQrModalOpen(true);
    }
  }, [externalScanPayload]);
  const [swapModalShift, setSwapModalShift] = useState<DutyShift | null>(null);
  const [swapReason, setSwapReason] = useState('');
  const [editingBedsideRecord, setEditingBedsideRecord] =
    useState<BedsideCheckInRecord | null>(null);
  const [bedsideRole, setBedsideRole] = useState<ProcedureRole>('Observe');
  const [bedsideTakeaway, setBedsideTakeaway] = useState('');
  const [bedsideReflection, setBedsideReflection] = useState('');
  const [bedsideSyncLogbook, setBedsideSyncLogbook] = useState(true);

  // Patient Rounding Notes state (private clinical observations & pre-round summary mode)
  const [roundingViewMode, setRoundingViewMode] = useState<'detail' | 'summary'>('detail');
  const [roundingFilter, setRoundingFilter] = useState<'all' | 'watch'>('all');
  const [editingRoundingId, setEditingRoundingId] = useState<string | null>(null);
  const [roundingDraftVitals, setRoundingDraftVitals] = useState('');
  const [roundingDraftNote, setRoundingDraftNote] = useState('');
  const [roundingDraftTodo, setRoundingDraftTodo] = useState('');
  const [roundingDraftPriority, setRoundingDraftPriority] = useState<'normal' | 'watch'>('normal');
  const [sbarModalRecord, setSbarModalRecord] = useState<BedsideCheckInRecord | null>(null);
  const [copiedSbarId, setCopiedSbarId] = useState<string | null>(null);

  // Leave request form state
  const [leaveType, setLeaveType] = useState<LeaveRequest['leaveType']>('ลากิจ');
  const [leaveDateRange, setLeaveDateRange] = useState('');
  const [leaveDays, setLeaveDays] = useState(1);
  const [leaveDept, setLeaveDept] = useState('กลุ่มงานอายุรศาสตร์');
  const [leaveReason, setLeaveReason] = useState('');

  const filteredDepts =
    selectedYear === 'all'
      ? departments
      : departments.filter((d) => d.yearLevel === selectedYear);

  const filteredShifts = shifts.filter((s) => {
    const matchDept =
      shiftDeptFilter === 'ทั้งหมด' || s.department === shiftDeptFilter;
    const matchScope =
      shiftScope === 'all' || s.assignedStudent === currentStudentName;
    return matchDept && matchScope;
  });

  const handleSwapSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!swapModalShift || !swapReason.trim()) return;
    onRequestSwap(swapModalShift.id, swapReason.trim());
    setSwapReason('');
    setSwapModalShift(null);
  };

  return (
    <div className="space-y-10">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">
            หลักสูตรชั้นคลินิก ตารางหมุนเวียน และตารางเวรปฏิบัติงาน
          </h1>
          <p className="text-sm text-slate-600 mt-1.5">
            โครงสร้างรายวิชาตามเกณฑ์แพทยสภา 12 กลุ่มงานคลินิกหลัก พร้อมระบบลงเวลาปฏิบัติงาน (Ward Check-in) และขอแลกเวร
          </p>
        </div>

        <div className="inline-flex items-center p-1 bg-slate-200/75 rounded-lg self-start">
          {(
            [
              { id: 'all', label: 'ทุกชั้นปี (4–6)' },
              { id: '4', label: 'ชั้นปีที่ 4' },
              { id: '5', label: 'ชั้นปีที่ 5' },
              { id: '6', label: 'ชั้นปีที่ 6 (Extern)' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedYear(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedYear === tab.id
                  ? 'bg-white text-[#0F2A4A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Curriculum Table + Department Syllabus Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              รายวิชาและระยะเวลาหมุนเวียนกลุ่มงาน ({filteredDepts.length} กลุ่มงาน)
            </h2>
            <span className="text-xs text-slate-500">คลิกแถวเพื่อดูรายละเอียด</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">รหัสวิชา / กลุ่มงาน</th>
                  <th className="py-3 px-4 text-right">ชั้นปี</th>
                  <th className="py-3 px-4 text-right">สัปดาห์</th>
                  <th className="py-3 px-4 text-right">หน่วยกิต</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredDepts.map((dept) => {
                  const isSelected = selectedDept?.id === dept.id;
                  return (
                    <tr
                      key={dept.id}
                      onClick={() => setSelectedDept(dept)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#0F2A4A]/6'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-xs text-slate-500">{dept.code}</div>
                        <div className="font-medium text-slate-900">{dept.nameTh}</div>
                        <div className="text-xs text-slate-500">{dept.headPreceptor}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right tabular-nums text-slate-700">
                        ปี {dept.yearLevel}
                      </td>
                      <td className="py-3.5 px-4 text-right tabular-nums text-slate-700">
                        {dept.weeks} สัปดาห์
                      </td>
                      <td className="py-3.5 px-4 text-right tabular-nums font-medium text-slate-900">
                        {dept.credits}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Department Syllabus Panel */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          {selectedDept ? (
            <>
              <div className="border-b border-slate-200 pb-4 space-y-1.5">
                <div className="text-xs font-mono text-slate-500">
                  {selectedDept.code} · {selectedDept.nameEn}
                </div>
                <h2 className="text-xl font-semibold text-[#0F2A4A]">
                  {selectedDept.nameTh}
                </h2>
                <div className="text-xs text-slate-600">
                  ชั้นปีที่ {selectedDept.yearLevel} · {selectedDept.weeks} สัปดาห์ · {selectedDept.credits} หน่วยกิต
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  ขอบเขตการฝึกปฏิบัติ
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {selectedDept.overview}
                </p>
              </div>

              <dl className="divide-y divide-slate-200 text-sm border-t border-b border-slate-200">
                <div className="py-3 flex justify-between gap-4">
                  <dt className="text-slate-500 shrink-0">อาจารย์ผู้รับผิดชอบ</dt>
                  <dd className="font-medium text-slate-900 text-right">{selectedDept.headPreceptor}</dd>
                </div>
                <div className="py-3 flex justify-between gap-4">
                  <dt className="text-slate-500 shrink-0">หอผู้ป่วย / จุดฝึก</dt>
                  <dd className="text-slate-800 text-right">{selectedDept.wards}</dd>
                </div>
              </dl>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  หัตถการบังคับ (Required Procedures)
                </h3>
                <ul className="space-y-1.5 text-sm text-slate-700">
                  {selectedDept.requiredProcedures.map((proc) => (
                    <li key={proc} className="flex items-start gap-2">
                      <span className="text-[#0F2A4A] font-medium" aria-hidden="true">•</span>
                      <span>{proc}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  เกณฑ์สมรรถนะ EPA ที่ประเมิน
                </h3>
                <ul className="space-y-1.5 text-sm text-slate-700">
                  {selectedDept.requiredEpAs.map((epa) => (
                    <li key={epa} className="flex items-start gap-2">
                      <span className="text-emerald-700 font-medium" aria-hidden="true">•</span>
                      <span>{epa}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-500 py-8 text-center">
              เลือกกลุ่มงานจากตารางด้านซ้ายเพื่อดูรายละเอียดหลักสูตร
            </div>
          )}
        </div>
      </div>

      {/* Clinical Skills Mastery Checklist */}
      <ClinicalSkillsMasteryChecklist
        role={role}
        currentStudentName={currentStudentName}
        currentUserName={currentUserName ?? currentStudentName}
        skills={clinicalSkills}
        onToggleStudentPracticed={onToggleStudentSkill}
        onValidateWithSignature={onValidateSkillWithSignature}
        onRevokeValidation={onRevokeSkillValidation}
      />

      {/* Clinical Milestone Badges */}
      <ClinicalMilestoneBadgesPanel
        studentName={currentStudentName}
        badges={badges}
        onOpenStudentDirectory={onOpenStudentDirectory}
      />

      {/* Duty Roster & Monthly Calendar */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              ตารางเวรปฏิบัติงานหอผู้ป่วยและห้องฉุกเฉิน
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              ดูภาพรวมตารางขึ้นเวรแบบปฏิทินรายเดือน ตรวจสอบสถานะการอนุมัติการแลกเวร ลงเวลาเข้าเวร (Ward Check-in) หรือยื่นคำขอแลกเวร
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setQrModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#0F766E] hover:bg-[#0D625C] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
            >
              <QrCode className="w-4 h-4" aria-hidden="true" />
              <span>สแกน QR เข้าเวร / ข้างเตียงผู้ป่วย</span>
            </button>

            {(role === 'faculty' || role === 'course_officer' || role === 'admin') &&
              onOpenFacultyQrGenerator && (
                <button
                  type="button"
                  onClick={() => onOpenFacultyQrGenerator('ward')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#091A32] hover:bg-[#0F2A4A] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
                >
                  <QrCode className="w-4 h-4 text-[#2DD4BF]" aria-hidden="true" />
                  <span>สร้าง QR เช็กอิน (อาจารย์)</span>
                </button>
              )}

            {/* Calendar vs Table View Switcher */}
            <div className="inline-flex items-center p-1 bg-slate-100 border border-slate-200 rounded-lg">
              <button
                type="button"
                onClick={() => setRosterViewMode('calendar')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  rosterViewMode === 'calendar'
                    ? 'bg-white text-[#0F2A4A] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" aria-hidden="true" />
                <span>ปฏิทินรายเดือน</span>
              </button>
              <button
                type="button"
                onClick={() => setRosterViewMode('table')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  rosterViewMode === 'table'
                    ? 'bg-white text-[#0F2A4A] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" aria-hidden="true" />
                <span>ตารางรายการ</span>
              </button>
            </div>

            {/* Scope Filter: All vs Mine */}
            <div className="inline-flex items-center p-1 bg-slate-100 border border-slate-200 rounded-lg">
              <button
                type="button"
                onClick={() => setShiftScope('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  shiftScope === 'all'
                    ? 'bg-white text-[#0F2A4A] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ทุกเวรในศูนย์ฯ
              </button>
              <button
                type="button"
                onClick={() => setShiftScope('mine')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  shiftScope === 'mine'
                    ? 'bg-white text-[#0F2A4A] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                เฉพาะเวรของฉัน
              </button>
            </div>

            <select
              value={shiftDeptFilter}
              onChange={(e) => setShiftDeptFilter(e.target.value)}
              aria-label="กรองตารางเวรตามกลุ่มงาน"
              className="px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg"
            >
              <option value="ทั้งหมด">ทุกกลุ่มงานคลินิก</option>
              {Array.from(new Set(shifts.map((s) => s.department))).map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        {rosterViewMode === 'calendar' ? (
          <DutyRosterCalendar
            role={role}
            shifts={filteredShifts}
            studentPhotos={studentPhotos}
            currentStudentName={currentStudentName}
            onCheckInShift={onCheckInShift}
            onOpenSwapModal={(shift) => setSwapModalShift(shift)}
            onApproveSwap={onApproveSwap}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">วัน / เวลา</th>
                  <th className="py-3 px-4">กลุ่มงาน / หอผู้ป่วย</th>
                  <th className="py-3 px-4">ผู้ปฏิบัติงาน</th>
                  <th className="py-3 px-4">อาจารย์เวรควบคุม</th>
                  <th className="py-3 px-4">สถานะ</th>
                  <th className="py-3 px-4 text-right">การดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredShifts.map((shift) => (
                  <tr key={shift.id} className="hover:bg-slate-50/70">
                    <td className="py-4 px-4 align-top">
                      <div className="font-medium text-slate-900 tabular-nums">
                        {shift.dayLabel} {shift.date}
                      </div>
                      <div className="text-xs font-mono text-slate-500 mt-0.5 tabular-nums">
                        {shift.timeRange} น.
                      </div>
                    </td>
                    <td className="py-4 px-4 align-top">
                      <div className="font-medium text-slate-900">{shift.department}</div>
                      <div className="text-xs text-slate-600 mt-0.5">{shift.wardOrUnit}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{shift.shiftType}</div>
                    </td>
                    <td className="py-4 px-4 align-top">
                      <div className="flex items-center gap-2.5">
                        <StudentAvatar
                          studentName={shift.assignedStudent}
                          studentPhotos={studentPhotos}
                          size="xs"
                        />
                        <div>
                          <div className="text-slate-900 font-medium whitespace-nowrap">
                            {shift.assignedStudent}
                          </div>
                          <div className="text-xs text-slate-500">ชั้นปีที่ {shift.studentYear}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 align-top text-slate-700">
                      {shift.supervisingStaff}
                    </td>
                    <td className="py-4 px-4 align-top">
                      {shift.checkedInAt ? (
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>
                              {shift.checkInMethod === 'qr_scan'
                                ? `ลงเวลา QR ${shift.checkedInAt}`
                                : `ลงเวลา ${shift.checkedInAt}`}
                            </span>
                          </div>
                          {shift.swapStatus === 'approved' && (
                            <div className="text-xs text-emerald-700">
                              (อนุมัติแลกเวรแล้ว)
                            </div>
                          )}
                        </div>
                      ) : shift.swapStatus === 'requested' ? (
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
                            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>รอพิจารณาแลกเวร</span>
                          </div>
                          {shift.swapNote && (
                            <p className="text-xs text-slate-500 max-w-xs">{shift.swapNote}</p>
                          )}
                        </div>
                      ) : shift.swapStatus === 'approved' ? (
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>อนุมัติแลกเวรแล้ว</span>
                          </div>
                          {shift.swapNote && (
                            <p className="text-xs text-slate-500 max-w-xs">{shift.swapNote}</p>
                          )}
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>ตามกำหนดการ</span>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4 align-top text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        {!shift.checkedInAt && (
                          <button
                            type="button"
                            onClick={() => onCheckInShift(shift.id)}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-[#0F2A4A] rounded-lg hover:bg-[#163B66] cursor-pointer whitespace-nowrap shrink-0"
                          >
                            ลงเวลาขึ้นเวร
                          </button>
                        )}
                        {shift.swapStatus === 'none' && (
                          <button
                            type="button"
                            onClick={() => setSwapModalShift(shift)}
                            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0"
                          >
                            ขอแลกเวร
                          </button>
                        )}
                        {shift.swapStatus === 'requested' &&
                          (role === 'faculty' || role === 'course_officer' || role === 'admin') && (
                          <button
                            type="button"
                            onClick={() => onApproveSwap(shift.id)}
                            className="px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 cursor-pointer whitespace-nowrap shrink-0"
                          >
                            อนุมัติแลกเวร
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Duty Swap Visualizer (Interactive Horizontal Scroll Timeline) */}
      <DutySwapVisualizer
        role={role}
        shifts={shifts}
        studentPhotos={studentPhotos}
        currentStudentName={currentStudentName}
        onApproveSwap={onApproveSwap}
        onOpenSwapModal={(shift) => setSwapModalShift(shift)}
      />

      {/* Bedside Case & Ward Round Check-ins + Patient Rounding Notes */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <BedDouble className="w-5 h-5 text-[#0F766E] shrink-0" aria-hidden="true" />
              บันทึกการสแกนข้างเตียงผู้ป่วยและการราวด์วอร์ด (Bedside Check-ins & Patient Rounding Notes)
            </h2>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
              <span>จดบันทึกข้อสังเกตทางคลินิกส่วนตัว (Patient Rounding Notes) และสลับเป็นโหมดสรุปก่อนราวด์วอร์ด</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 text-[#0F766E] font-medium">
                <Lock className="w-3 h-3" aria-hidden="true" />
                บันทึกส่วนตัวของนักศึกษา (ไม่ส่งเข้า E-Logbook)
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Summary Mode vs Detail View Switcher */}
            <div className="inline-flex items-center p-1 bg-slate-100 border border-slate-200 rounded-lg">
              <button
                type="button"
                onClick={() => setRoundingViewMode('detail')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  roundingViewMode === 'detail'
                    ? 'bg-white text-[#0F2A4A] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                <span>โหมดละเอียด</span>
              </button>
              <button
                type="button"
                onClick={() => setRoundingViewMode('summary')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  roundingViewMode === 'summary'
                    ? 'bg-white text-[#0F2A4A] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" aria-hidden="true" />
                <span>โหมดสรุปก่อนราวด์ (Summary Mode)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setQrModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#0F2A4A] hover:bg-[#163B66] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" aria-hidden="true" />
              <span>สแกน QR ข้างเตียง / ราวด์วอร์ด</span>
            </button>
          </div>
        </div>

        {/* Summary KPI Strip & Watch Filter */}
        {(() => {
          const isStudentRole = role === 'student';
          const watchCount = bedsideCheckIns.filter(
            (b) => b.roundingPriority === 'watch'
          ).length;
          const notedCount = bedsideCheckIns.filter(
            (b) =>
              Boolean(b.roundingNote?.trim()) ||
              Boolean(b.roundingKeyVitalsOrLabs?.trim()) ||
              Boolean(b.roundingTodo?.trim())
          ).length;
          const displayedBedside =
            roundingFilter === 'watch'
              ? bedsideCheckIns.filter((b) => b.roundingPriority === 'watch')
              : bedsideCheckIns;

          const startEditRounding = (rec: BedsideCheckInRecord) => {
            setEditingRoundingId(rec.id);
            setRoundingDraftVitals(rec.roundingKeyVitalsOrLabs ?? '');
            setRoundingDraftNote(rec.roundingNote ?? '');
            setRoundingDraftTodo(rec.roundingTodo ?? '');
            setRoundingDraftPriority(rec.roundingPriority ?? 'normal');
          };

          const submitRoundingNote = (e: React.FormEvent, recordId: string) => {
            e.preventDefault();
            onSaveBedsideRoundingNote(recordId, {
              roundingNote: roundingDraftNote,
              roundingKeyVitalsOrLabs: roundingDraftVitals,
              roundingTodo: roundingDraftTodo,
              roundingPriority: roundingDraftPriority,
            });
            setEditingRoundingId(null);
          };

          return (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 tabular-nums">
                  <span>
                    เคสข้างเตียงทั้งหมด: <strong className="text-slate-900">{bedsideCheckIns.length} เคส</strong>
                  </span>
                  {isStudentRole && (
                    <>
                      <span>
                        มี Rounding Note แล้ว: <strong className="text-[#0F766E]">{notedCount}/{bedsideCheckIns.length} เคส</strong>
                      </span>
                      <span>
                        เคสเฝ้าระวังใกล้ชิด: <strong className="text-amber-800">{watchCount} เคส</strong>
                      </span>
                    </>
                  )}
                </div>

                {isStudentRole && (
                  <div className="inline-flex items-center p-0.5 bg-white border border-slate-200 rounded-md self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setRoundingFilter('all')}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        roundingFilter === 'all'
                          ? 'bg-[#0F2A4A] text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      ทุกเคส ({bedsideCheckIns.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoundingFilter('watch')}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        roundingFilter === 'watch'
                          ? 'bg-amber-700 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      เฉพาะเฝ้าระวัง ({watchCount})
                    </button>
                  </div>
                )}
              </div>

              {displayedBedside.length === 0 ? (
                <div className="py-10 text-center text-xs sm:text-sm text-slate-500 border border-dashed border-slate-300 rounded-xl">
                  ไม่มีรายการเคสที่ติดสถานะเฝ้าระวังใกล้ชิดในขณะนี้
                </div>
              ) : roundingViewMode === 'summary' ? (
                /* Pre-Round Summary Mode: Scannable High-Density Sheet */
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          <th className="py-3 px-4">เตียง / หอผู้ป่วย</th>
                          <th className="py-3 px-4">การวินิจฉัย &amp; อาจารย์</th>
                          <th className="py-3 px-4">Vitals / Key Labs</th>
                          <th className="py-3 px-4">ข้อสังเกตส่วนตัว &amp; แผนถามอาจารย์ก่อนราวด์</th>
                          {isStudentRole && <th className="py-3 px-4 text-right">จัดการ</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-xs">
                        {displayedBedside.map((rec) => {
                          const isEditingThis = isStudentRole && editingRoundingId === rec.id;
                          return (
                            <tr
                              key={rec.id}
                              className="hover:bg-slate-50/70 align-top"
                            >
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="font-semibold text-slate-900">{rec.bedOrRoom}</div>
                                <div className="text-[11px] text-slate-500">{rec.wardOrUnit}</div>
                                <div className="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-[#0F766E]">
                                  <span>{rec.caseCode}</span>
                                  {isStudentRole && rec.roundingPriority === 'watch' && (
                                    <span className="inline-flex items-center gap-0.5 font-sans font-semibold text-amber-800">
                                      <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                                      เฝ้าระวัง
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="py-3.5 px-4 min-w-[200px]">
                                <div className="font-semibold text-slate-900">
                                  {rec.diagnosis} ({rec.icd10})
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  {rec.department} · {rec.supervisingStaff}
                                </div>
                              </td>

                              <td className="py-3.5 px-4 min-w-[200px]">
                                {isStudentRole ? (
                                  rec.roundingKeyVitalsOrLabs ? (
                                    <div className="font-mono text-[11px] text-slate-800 tabular-nums leading-relaxed">
                                      {rec.roundingKeyVitalsOrLabs}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400">ยังไม่ได้ระบุ Vitals/Labs</span>
                                  )
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                                    <Lock className="w-3 h-3" aria-hidden="true" />
                                    ข้อมูลส่วนตัวของนักศึกษา
                                  </span>
                                )}
                              </td>

                              <td className="py-3.5 px-4 min-w-[260px]">
                                {!isStudentRole ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                                    <Lock className="w-3 h-3" aria-hidden="true" />
                                    ซ่อนบันทึกส่วนตัวในมุมมองอาจารย์/ฝ่ายวิชาการ
                                  </span>
                                ) : isEditingThis ? (
                                  <form
                                    onSubmit={(e) => submitRoundingNote(e, rec.id)}
                                    className="space-y-2 bg-slate-50 border border-slate-200 rounded-lg p-3"
                                  >
                                    <input
                                      type="text"
                                      value={roundingDraftVitals}
                                      onChange={(e) => setRoundingDraftVitals(e.target.value)}
                                      placeholder="Vitals / Labs สำคัญ เช่น BP 120/80 · Cr 1.1"
                                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md font-mono"
                                    />
                                    <textarea
                                      rows={2}
                                      value={roundingDraftNote}
                                      onChange={(e) => setRoundingDraftNote(e.target.value)}
                                      placeholder="ข้อสังเกตอาการล่าสุดก่อนราวด์..."
                                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                                    />
                                    <input
                                      type="text"
                                      value={roundingDraftTodo}
                                      onChange={(e) => setRoundingDraftTodo(e.target.value)}
                                      placeholder="สิ่งที่ต้องถามอาจารย์ / Follow-up"
                                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                                    />
                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                      <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-800 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={roundingDraftPriority === 'watch'}
                                          onChange={(e) =>
                                            setRoundingDraftPriority(
                                              e.target.checked ? 'watch' : 'normal'
                                            )
                                          }
                                          className="rounded border-slate-300 text-amber-700"
                                        />
                                        <span>ทำเครื่องหมายเฝ้าระวัง</span>
                                      </label>
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => setEditingRoundingId(null)}
                                          className="px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                                        >
                                          ยกเลิก
                                        </button>
                                        <button
                                          type="submit"
                                          className="px-2.5 py-1 text-[11px] font-medium text-white bg-[#0F766E] rounded hover:bg-[#0D625C] cursor-pointer"
                                        >
                                          บันทึก
                                        </button>
                                      </div>
                                    </div>
                                  </form>
                                ) : (
                                  <div className="space-y-1">
                                    {rec.roundingNote ? (
                                      <p className="text-slate-800 leading-relaxed">{rec.roundingNote}</p>
                                    ) : (
                                      <p className="text-slate-400">ยังไม่ได้จดข้อสังเกตก่อนราวด์</p>
                                    )}
                                    {rec.roundingTodo && (
                                      <p className="text-[11px] text-[#0F2A4A] font-medium">
                                        แผนเตรียมราวด์: {rec.roundingTodo}
                                      </p>
                                    )}
                                    {rec.roundingUpdatedAt && (
                                      <div className="text-[11px] text-slate-400 tabular-nums">
                                        อัปเดตส่วนตัว {rec.roundingUpdatedAt}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>

                              {isStudentRole && (
                                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                  <div className="inline-flex items-center justify-end gap-1.5">
                                    {!isEditingThis && (
                                      <button
                                        type="button"
                                        onClick={() => startEditRounding(rec)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#0F2A4A] bg-white border border-slate-300 rounded-md hover:bg-slate-100 cursor-pointer"
                                      >
                                        <PenLine className="w-3 h-3" aria-hidden="true" />
                                        <span>{rec.roundingNote ? 'แก้ไขโน้ต' : 'จดโน้ต'}</span>
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => setSbarModalRecord(rec)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#0F766E] bg-emerald-50/70 border border-emerald-200 rounded-md hover:bg-emerald-100 cursor-pointer"
                                    >
                                      <ClipboardList className="w-3 h-3" aria-hidden="true" />
                                      <span>{rec.sbarHandoff ? 'ดู SBAR' : 'สร้าง SBAR'}</span>
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* Detail View with Inline Private Patient Rounding Notes */
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl px-5">
                  {displayedBedside.map((rec) => {
                    const isEditingThis = isStudentRole && editingRoundingId === rec.id;
                    const hasAnyRoundingNote =
                      Boolean(rec.roundingNote) ||
                      Boolean(rec.roundingKeyVitalsOrLabs) ||
                      Boolean(rec.roundingTodo);

                    return (
                      <div key={rec.id} className="py-4 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                            <span className="font-mono font-semibold text-[#0F766E]">
                              {rec.caseCode}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-medium text-slate-800">
                              {rec.scanKind === 'ward_round' ? 'Ward Round' : 'เคสผู้ป่วยข้างเตียง'}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>
                              {rec.wardOrUnit} ({rec.bedOrRoom})
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">
                              {rec.checkedInDate} {rec.checkedInAt}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            {rec.syncedToLogbookId && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                                เชื่อมเข้า E-Logbook แล้ว
                              </span>
                            )}
                            {isStudentRole && (
                              <button
                                type="button"
                                onClick={() =>
                                  isEditingThis ? setEditingRoundingId(null) : startEditRounding(rec)
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#0F766E] bg-emerald-50/70 border border-emerald-200 rounded-md hover:bg-emerald-100 cursor-pointer whitespace-nowrap shrink-0"
                              >
                                <PenLine className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>
                                  {isEditingThis
                                    ? 'ปิดตัวจดโน้ต'
                                    : hasAnyRoundingNote
                                      ? 'แก้ไข Rounding Note'
                                      : 'จด Rounding Note ส่วนตัว'}
                                </span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setSbarModalRecord(rec)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#0F2A4A] bg-white border border-slate-300 rounded-md hover:bg-slate-100 cursor-pointer whitespace-nowrap shrink-0"
                            >
                              <ClipboardList className="w-3.5 h-3.5 text-[#0F766E]" aria-hidden="true" />
                              <span>{rec.sbarHandoff ? 'ดู / แก้ไข SBAR' : 'สร้าง SBAR ส่งเวร'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBedsideRecord(rec);
                                setBedsideRole(rec.roleInEncounter ?? 'Observe');
                                setBedsideTakeaway(rec.clinicalTakeaway ?? '');
                                setBedsideReflection(rec.reflectionNote ?? '');
                                setBedsideSyncLogbook(!rec.syncedToLogbookId);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#0F2A4A] bg-slate-50 border border-slate-300 rounded-md hover:bg-slate-100 cursor-pointer whitespace-nowrap shrink-0"
                            >
                              <ClipboardPenLine className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>
                                {rec.reflectionNote ? 'แก้ไข Reflection' : 'เขียน Reflection / Case Note'}
                              </span>
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                            <Stethoscope className="w-4 h-4 text-[#0F2A4A] shrink-0" aria-hidden="true" />
                            <span>
                              {rec.diagnosis} ({rec.icd10})
                            </span>
                          </h3>
                          <span className="text-xs text-slate-500">
                            {rec.department} · อาจารย์: {rec.supervisingStaff}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">{rec.patientSummary}</p>

                        {/* Private Patient Rounding Note Block */}
                        {isStudentRole ? (
                          isEditingThis ? (
                            <form
                              onSubmit={(e) => submitRoundingNote(e, rec.id)}
                              className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                <span className="font-semibold text-[#0F2A4A] inline-flex items-center gap-1.5">
                                  <Lock className="w-3.5 h-3.5 text-[#0F766E]" aria-hidden="true" />
                                  บันทึกส่วนตัวก่อนราวด์วอร์ด (Patient Rounding Note)
                                </span>
                                <label className="inline-flex items-center gap-1.5 font-medium text-amber-800 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={roundingDraftPriority === 'watch'}
                                    onChange={(e) =>
                                      setRoundingDraftPriority(e.target.checked ? 'watch' : 'normal')
                                    }
                                    className="rounded border-slate-300 text-amber-700"
                                  />
                                  <span>ทำเครื่องหมายเฝ้าระวังใกล้ชิด</span>
                                </label>
                              </div>

                              <div>
                                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                                  Vitals / Key Labs ล่าสุด (สำหรับทบทวนเร็ว)
                                </label>
                                <input
                                  type="text"
                                  value={roundingDraftVitals}
                                  onChange={(e) => setRoundingDraftVitals(e.target.value)}
                                  placeholder="เช่น BP 124/78 · HR 86 · SpO2 96% · Cr 1.2 · I/O -400 mL"
                                  className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                                  ข้อสังเกตอาการทางคลินิกส่วนตัว
                                </label>
                                <textarea
                                  rows={2}
                                  value={roundingDraftNote}
                                  onChange={(e) => setRoundingDraftNote(e.target.value)}
                                  placeholder="จดอาการที่ตรวจพบเอง การเปลี่ยนแปลงเทียบเมื่อวาน หรือสิ่งที่สังเกตเห็นข้างเตียง..."
                                  className="w-full px-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                                  ประเด็นเตรียมถามอาจารย์ / Follow-up ก่อนราวด์
                                </label>
                                <input
                                  type="text"
                                  value={roundingDraftTodo}
                                  onChange={(e) => setRoundingDraftTodo(e.target.value)}
                                  placeholder="เช่น ถามเรื่องลดยาขับปัสสาวะ หรือติดตามผลเพาะเชื้อ"
                                  className="w-full px-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg"
                                />
                              </div>

                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingRoundingId(null)}
                                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                                >
                                  ยกเลิก
                                </button>
                                <button
                                  type="submit"
                                  className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#0F766E] rounded-lg hover:bg-[#0D625C] cursor-pointer"
                                >
                                  บันทึกโน้ตส่วนตัว
                                </button>
                              </div>
                            </form>
                          ) : hasAnyRoundingNote ? (
                            <div className="bg-slate-50/90 border border-slate-200 rounded-lg p-3 space-y-1.5 text-xs">
                              <div className="flex flex-wrap items-center justify-between gap-2 text-slate-500">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                  <span className="inline-flex items-center gap-1 font-semibold text-[#0F766E]">
                                    <Lock className="w-3 h-3" aria-hidden="true" />
                                    Patient Rounding Note (ส่วนตัว)
                                  </span>
                                  {rec.roundingPriority === 'watch' && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span className="inline-flex items-center gap-1 font-semibold text-amber-800">
                                        <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                                        เฝ้าระวังใกล้ชิด
                                      </span>
                                    </>
                                  )}
                                  {rec.roundingUpdatedAt && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span className="tabular-nums">อัปเดต {rec.roundingUpdatedAt}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              {rec.roundingKeyVitalsOrLabs && (
                                <div className="font-mono text-[11px] text-slate-800 tabular-nums">
                                  Vitals/Labs: {rec.roundingKeyVitalsOrLabs}
                                </div>
                              )}
                              {rec.roundingNote && (
                                <p className="text-slate-800 leading-relaxed">{rec.roundingNote}</p>
                              )}
                              {rec.roundingTodo && (
                                <div className="text-[#0F2A4A] font-medium">
                                  เตรียมราวด์ / Follow-up: {rec.roundingTodo}
                                </div>
                              )}
                            </div>
                          ) : null
                        ) : (
                          <div className="text-xs text-slate-400 inline-flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>บันทึก Patient Rounding Note ส่วนตัวของนักศึกษา (ซ่อนในมุมมองอาจารย์/ฝ่ายวิชาการ)</span>
                          </div>
                        )}

                        {rec.reflectionNote ? (
                          <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1 text-xs">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-slate-500">
                              <span className="font-semibold text-[#0F2A4A]">
                                Clinical Reflection ({rec.roleInEncounter ?? 'Observe'})
                              </span>
                              {rec.clinicalTakeaway && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-slate-700">ประเด็นสำคัญ: {rec.clinicalTakeaway}</span>
                                </>
                              )}
                              {rec.reflectionSavedAt && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="tabular-nums">บันทึกเมื่อ {rec.reflectionSavedAt}</span>
                                </>
                              )}
                            </div>
                            <p className="text-slate-800 leading-relaxed">{rec.reflectionNote}</p>
                          </div>
                        ) : (
                          <div className="text-xs text-amber-700 font-medium">
                            • ยังไม่ได้บันทึก Reflection / Case Note สำหรับเคสนี้
                          </div>
                        )}

                        {/* Structured Patient Handoff (SBAR) Saved Card */}
                        {rec.sbarHandoff && (
                          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2.5 text-xs">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-slate-600">
                                <span className="inline-flex items-center gap-1.5 font-semibold text-[#0F2A4A]">
                                  <ClipboardList className="w-3.5 h-3.5 text-[#0F766E]" aria-hidden="true" />
                                  Structured Patient Handoff (SBAR)
                                </span>
                                <span aria-hidden="true">·</span>
                                <span>ผู้รับเวร: {rec.sbarHandoff.handoffRecipient}</span>
                                <span aria-hidden="true">·</span>
                                <span className="tabular-nums">บันทึกเมื่อ {rec.sbarHandoff.savedAt}</span>
                              </div>

                              <button
                                type="button"
                                onClick={async () => {
                                  if (!rec.sbarHandoff) return;
                                  try {
                                    await navigator.clipboard.writeText(
                                      formatSbarPlainText(rec, rec.sbarHandoff)
                                    );
                                    setCopiedSbarId(rec.id);
                                    window.setTimeout(() => setCopiedSbarId(null), 2000);
                                  } catch {
                                    // Clipboard unavailable
                                  }
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#0F2A4A] bg-white border border-slate-300 rounded hover:bg-slate-100 cursor-pointer whitespace-nowrap shrink-0"
                              >
                                {copiedSbarId === rec.id ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-700" aria-hidden="true" />
                                    <span className="text-emerald-700">คัดลอกแล้ว</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" aria-hidden="true" />
                                    <span>คัดลอก SBAR</span>
                                  </>
                                )}
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                              <div>
                                <div className="font-semibold text-[#0F2A4A]">S — Situation</div>
                                <p className="text-slate-700 leading-relaxed mt-0.5">
                                  {rec.sbarHandoff.situation}
                                </p>
                              </div>
                              <div>
                                <div className="font-semibold text-[#0F2A4A]">B — Background</div>
                                <p className="text-slate-700 leading-relaxed mt-0.5">
                                  {rec.sbarHandoff.background}
                                </p>
                              </div>
                              <div>
                                <div className="font-semibold text-[#0F766E]">A — Assessment</div>
                                <p className="text-slate-700 leading-relaxed mt-0.5">
                                  {rec.sbarHandoff.assessment}
                                </p>
                              </div>
                              <div>
                                <div className="font-semibold text-[#0F766E]">R — Recommendation</div>
                                <p className="text-slate-700 leading-relaxed mt-0.5">
                                  {rec.sbarHandoff.recommendation}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
      </section>

      {/* Clinical Attendance & Leave Request Management */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-[#0F2A4A]" aria-hidden="true" />
              ระบบขอลางานและสถิติเวลาปฏิบัติงานคลินิก (Clinical Attendance & Leave)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              ตามระเบียบ ศพค. รพ.สุรินทร์ นักศึกษาแพทย์ต้องมีเวลาปฏิบัติงานไม่น้อยกว่า 80% ของชั่วโมงฝึกในแต่ละรายวิชา
            </p>
          </div>
          <div className="text-xs text-slate-600 tabular-nums">
            วันลาอนุมัติแล้วของฉัน: <strong className="text-emerald-700">1 วัน</strong> (คงเหลือสิทธิ์ลาตามเกณฑ์)
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!leaveDateRange.trim() || !leaveReason.trim()) return;
              onAddLeaveRequest({
                studentId: currentStudentId,
                studentName: currentStudentName,
                leaveType,
                dateRange: leaveDateRange.trim(),
                daysCount: Math.max(1, leaveDays),
                department: leaveDept,
                reason: leaveReason.trim(),
              });
              setLeaveDateRange('');
              setLeaveReason('');
              setLeaveDays(1);
            }}
            className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3"
          >
            <h3 className="text-sm font-semibold text-slate-900">ยื่นใบลาปฏิบัติงาน / ลาประชุมวิชาการ</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">ประเภทการลา</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as LeaveRequest['leaveType'])}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg"
                >
                  <option value="ลากิจ">ลากิจ</option>
                  <option value="ลาป่วย">ลาป่วย</option>
                  <option value="ลาประชุมวิชาการ">ลาประชุมวิชาการ</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">จำนวนวัน</label>
                <input
                  type="number"
                  min={1}
                  max={14}
                  value={leaveDays}
                  onChange={(e) => setLeaveDays(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">กลุ่มงานที่ปฏิบัติงานอยู่</label>
              <select
                value={leaveDept}
                onChange={(e) => setLeaveDept(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.nameTh}>{d.nameTh}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">วันที่ขอลา</label>
              <input
                type="text"
                value={leaveDateRange}
                onChange={(e) => setLeaveDateRange(e.target.value)}
                placeholder="เช่น 29 พ.ย. 2569"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">เหตุผล / เอกสารอ้างอิง</label>
              <textarea
                rows={2}
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                placeholder="ระบุเหตุผลการลาและผู้รับช่วงต่อ..."
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 text-xs sm:text-sm font-medium text-white bg-[#0F2A4A] rounded-lg hover:bg-[#163B66] cursor-pointer"
            >
              ส่งใบลาเพื่อพิจารณาอนุมัติ
            </button>
          </form>

          <div className="lg:col-span-7 divide-y divide-slate-200 border border-slate-200 rounded-xl px-5">
            {leaveRequests.map((req) => (
              <div key={req.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <StudentAvatar
                    studentId={req.studentId}
                    studentName={req.studentName}
                    studentPhotos={studentPhotos}
                    size="sm"
                  />
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                      <span className="font-semibold text-slate-900">{req.studentName}</span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <span className="font-medium text-[#0F2A4A]">{req.leaveType} ({req.daysCount} วัน)</span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <span className="tabular-nums text-slate-500">{req.dateRange}</span>
                    </div>
                    <div className="text-xs text-slate-500">{req.department} · ยื่นเมื่อ {req.submittedAt}</div>
                    <p className="text-xs text-slate-700">{req.reason}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-xs font-semibold ${
                      req.status === 'อนุมัติแล้ว'
                        ? 'text-emerald-700'
                        : req.status === 'ไม่อนุมัติ'
                          ? 'text-rose-700'
                          : 'text-amber-700'
                    }`}
                  >
                    {req.status}
                  </span>

                  {req.status === 'รออนุมัติ' &&
                    (role === 'faculty' || role === 'course_officer' || role === 'admin') && (
                    <div className="flex items-center gap-1.5 ml-2">
                      <button
                        type="button"
                        onClick={() => onUpdateLeaveStatus(req.id, 'อนุมัติแล้ว')}
                        className="px-2.5 py-1 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 cursor-pointer"
                      >
                        อนุมัติ
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateLeaveStatus(req.id, 'ไม่อนุมัติ')}
                        className="px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-md hover:bg-rose-100 cursor-pointer"
                      >
                        ไม่อนุมัติ
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Shift Swap Modal */}
      {swapModalShift && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">ยื่นคำขอแลกเวรปฏิบัติงาน</h3>
              <button
                type="button"
                onClick={() => setSwapModalShift(null)}
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
                aria-label="ปิดหน้าต่าง"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSwapSubmit} className="p-5 space-y-4">
              <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="font-medium text-slate-900">{swapModalShift.department}</div>
                <div>{swapModalShift.date} · {swapModalShift.timeRange} น.</div>
                <div>หอผู้ป่วย: {swapModalShift.wardOrUnit}</div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  ระบุเหตุผลและชื่อนักศึกษาแพทย์ที่รับแลกเวรแทน
                </label>
                <textarea
                  rows={3}
                  value={swapReason}
                  onChange={(e) => setSwapReason(e.target.value)}
                  placeholder="เช่น ขอสลับเวรกับ นศพ.พิชญา วงศ์สุรินทร์ (ได้ตกลงกันเรียบร้อยแล้ว) เนื่องจาก..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSwapModalShift(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-[#0F2A4A] rounded-lg hover:bg-[#163B66] cursor-pointer"
                >
                  ส่งคำขอแลกเวร
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {editingBedsideRecord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">
                บันทึก Clinical Reflection / Case Note
              </h3>
              <button
                type="button"
                onClick={() => setEditingBedsideRecord(null)}
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
                aria-label="ปิดหน้าต่าง"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!bedsideReflection.trim()) return;
                onSaveBedsideReflection(editingBedsideRecord.id, {
                  roleInEncounter: bedsideRole,
                  clinicalTakeaway: bedsideTakeaway.trim(),
                  reflectionNote: bedsideReflection.trim(),
                  syncToLogbook: bedsideSyncLogbook,
                });
                setEditingBedsideRecord(null);
              }}
              className="p-5 space-y-4"
            >
              <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="font-semibold text-slate-900">
                  {editingBedsideRecord.diagnosis} ({editingBedsideRecord.icd10})
                </div>
                <div>
                  {editingBedsideRecord.wardOrUnit} · {editingBedsideRecord.bedOrRoom}
                </div>
                <div className="font-mono text-[11px] text-[#0F766E]">
                  {editingBedsideRecord.caseCode} · สแกนเมื่อ {editingBedsideRecord.checkedInAt}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    บทบาทในเคส / รอบราวด์
                  </label>
                  <select
                    value={bedsideRole}
                    onChange={(e) => setBedsideRole(e.target.value as ProcedureRole)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="Observe">Observe (สังเกตการณ์)</option>
                    <option value="Assist">Assist (ร่วมดูแล)</option>
                    <option value="Perform">Perform (ทำหัตถการ)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    ประเด็นสำคัญ / หัตถการ
                  </label>
                  <input
                    type="text"
                    value={bedsideTakeaway}
                    onChange={(e) => setBedsideTakeaway(e.target.value)}
                    placeholder="เช่น Fluid resuscitation, Wound care"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Clinical Reflection / Case Note
                </label>
                <textarea
                  rows={3}
                  required
                  value={bedsideReflection}
                  onChange={(e) => setBedsideReflection(e.target.value)}
                  placeholder="สรุปผลการเรียนรู้ ข้อค้นพบทางคลินิก หรือแผนติดตามผู้ป่วย..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                />
              </div>

              {!editingBedsideRecord.syncedToLogbookId && (
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bedsideSyncLogbook}
                    onChange={(e) => setBedsideSyncLogbook(e.target.checked)}
                    className="rounded border-slate-300 text-[#0F2A4A] focus:ring-[#0F2A4A]"
                  />
                  <span>ส่งบันทึกเคสนี้เข้าสู่ E-Logbook อัตโนมัติ</span>
                </label>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBedsideRecord(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-[#0F766E] rounded-lg hover:bg-[#0D625C] cursor-pointer"
                >
                  บันทึก Reflection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <WardQrScannerModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        role={role}
        currentStudentName={currentStudentName}
        shifts={shifts}
        customQrStations={customQrStations}
        initialScanRawPayload={externalScanPayload}
        onClearInitialScanPayload={onClearExternalScanPayload}
        onOpenFacultyQrGenerator={
          onOpenFacultyQrGenerator
            ? () => onOpenFacultyQrGenerator('ward')
            : undefined
        }
        onRecordQrCheckIn={onQrCheckIn}
        onRecordBedsideCheckIn={onRecordBedsideCheckIn}
        onRecordProcedureCheckIn={onProcedureQrCheckIn}
        onSaveBedsideReflection={onSaveBedsideReflection}
      />

      <SbarHandoffModal
        record={sbarModalRecord}
        onClose={() => setSbarModalRecord(null)}
        onSave={onSaveBedsideSbarHandoff}
      />
    </div>
  );
}
