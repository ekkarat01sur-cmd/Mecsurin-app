import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, ClipboardCheck, GraduationCap, XCircle } from 'lucide-react';
import {
  CourseGrade,
  CourseGradingConfig,
  EpaMilestone,
  FacultyFormSubmission,
  OsceEvaluationRecord,
  OsceExam,
  PreceptorFeedback,
  StudentCourseScore,
  StudentPhotoMap,
  UserRole,
} from '../types/medicalSchool';
import { COHORT_STUDENTS } from '../data/initialMedicalData';
import { CourseEvaluationConfigPanel } from './CourseEvaluationConfigPanel';
import { FacultyEvaluationForms } from './FacultyEvaluationForms';
import { evaluateStudentGrade, MplGradingStudio } from './MplGradingStudio';
import { PreceptorFeedbackPanel } from './PreceptorFeedbackPanel';
import { ADMIN_OFFICER_ROLES, RoleAccessGuard, hasRoleAccess } from './RoleAccessGuard';
import { StudentAvatar } from './StudentAvatar';
import { StudentScoreChart } from './StudentScoreChart';

interface AssessmentSectionProps {
  role: UserRole;
  currentStudentId: string;
  currentStudentName?: string;
  authenticatedDisplayName?: string;
  assignedCourseCodes?: string[];
  studentPhotos: StudentPhotoMap;
  epas: EpaMilestone[];
  onUpdateEpaLevel: (epaId: string, level: number) => void;
  exams: OsceExam[];
  evaluations: OsceEvaluationRecord[];
  onAddEvaluation: (record: Omit<OsceEvaluationRecord, 'id' | 'date'>) => void;
  grades: CourseGrade[];
  gradingConfigs: CourseGradingConfig[];
  onUpdateGradingConfig: (updated: CourseGradingConfig) => void;
  studentScores: StudentCourseScore[];
  onUpdateStudentScore: (updated: StudentCourseScore) => void;
  facultySubmissions: FacultyFormSubmission[];
  onSubmitBatchForms: (submissions: Omit<FacultyFormSubmission, 'id' | 'date'>[]) => void;
  preceptorFeedbacks: PreceptorFeedback[];
  onAddPreceptorFeedback: (item: Omit<PreceptorFeedback, 'id' | 'submittedAt'>) => void;
  onNotify?: (msg: string) => void;
}

const OSCE_STATIONS = [
  'สถานีที่ 1: Acute Chest Pain & STEMI Fast Track',
  'สถานีที่ 2: Pediatric Febrile Seizure & Fluid Calculation',
  'สถานีที่ 3: Blunt Abdominal Trauma Primary Survey (ATLS)',
  'สถานีที่ 4: Postpartum Hemorrhage (4T) Management',
  'สถานีที่ 5: Breaking Bad News & Medical Ethics',
];

const ENTRUSTMENT_LABELS: Record<number, string> = {
  1: 'ระดับ 1: สังเกตการณ์เท่านั้น',
  2: 'ระดับ 2: ปฏิบัติภายใต้การควบคุมใกล้ชิด',
  3: 'ระดับ 3: ปฏิบัติได้โดยมีอาจารย์ตรวจสอบซ้ำ',
  4: 'ระดับ 4: ปฏิบัติได้ด้วยตนเอง (มีอาจารย์ปรึกษา)',
  5: 'ระดับ 5: ปฏิบัติได้อิสระและสอนรุ่นน้องได้',
};

type AssessmentSubTab =
  | 'my_grades'
  | 'forms'
  | 'course_blueprint'
  | 'mpl_grading'
  | 'osce_epa'
  | 'preceptor_feedback';

export function AssessmentSection({
  role,
  currentStudentId,
  currentStudentName,
  authenticatedDisplayName,
  assignedCourseCodes,
  studentPhotos,
  epas,
  onUpdateEpaLevel,
  exams,
  evaluations,
  onAddEvaluation,
  grades,
  gradingConfigs,
  onUpdateGradingConfig,
  studentScores,
  onUpdateStudentScore,
  facultySubmissions,
  onSubmitBatchForms,
  preceptorFeedbacks,
  onAddPreceptorFeedback,
  onNotify,
}: AssessmentSectionProps) {
  const activeStudent =
    COHORT_STUDENTS.find((s) => s.studentId === currentStudentId) ?? COHORT_STUDENTS[17];
  const resolvedStudentName = currentStudentName || activeStudent.studentName;

  const [subTab, setSubTab] = useState<AssessmentSubTab>(
    role === 'student' ? 'my_grades' : role === 'course_officer' ? 'course_blueprint' : 'forms'
  );

  useEffect(() => {
    if (role === 'student') {
      setSubTab((prev) =>
        prev === 'forms' || prev === 'mpl_grading' || prev === 'course_blueprint'
          ? 'my_grades'
          : prev
      );
    } else {
      setSubTab((prev) => (prev === 'my_grades' ? 'forms' : prev));
    }
  }, [role]);

  const [stationName, setStationName] = useState(OSCE_STATIONS[0]);
  const [studentName, setStudentName] = useState('นศพ.ธนภัทร ศรีสุรินทร์');
  const [historyTaking, setHistoryTaking] = useState(4);
  const [physicalExam, setPhysicalExam] = useState(3);
  const [clinicalReasoning, setClinicalReasoning] = useState(4);
  const [communication, setCommunication] = useState(4);
  const [professionalism, setProfessionalism] = useState(4);
  const [comments, setComments] = useState('');

  const totalScore =
    historyTaking + physicalExam + clinicalReasoning + communication + professionalism;
  const passed = totalScore >= 14;

  // GPAX Calculation (excluding S/U pass-fail grades)
  const gradedCourses = grades.filter((g) => g.grade !== 'S' && g.grade !== 'U');
  const totalGradedCredits = gradedCourses.reduce((sum, g) => sum + g.credits, 0);
  const totalGradePoints = gradedCourses.reduce(
    (sum, g) => sum + g.gradePoint * g.credits,
    0
  );
  const gpax =
    totalGradedCredits > 0 ? (totalGradePoints / totalGradedCredits).toFixed(2) : '0.00';
  const totalCreditsAll = grades.reduce((sum, g) => sum + g.credits, 0);

  const handleSaveEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    onAddEvaluation({
      stationName,
      studentName: studentName.trim() || 'นศพ.ธนภัทร ศรีสุรินทร์',
      evaluatorName:
        role === 'faculty'
          ? 'นพ.เอกรัตน์ วัฒนสุรินทร์'
          : 'แบบประเมินตนเอง / อาจารย์ประจำสถานี',
      scores: {
        historyTaking,
        physicalExam,
        clinicalReasoning,
        communication,
        professionalism,
      },
      totalScore,
      passed,
      comments:
        comments.trim() ||
        (passed
          ? 'ปฏิบัติขั้นตอนทางคลินิกได้ครบถ้วนตามมาตรฐานความปลอดภัยผู้ป่วย'
          : 'ควรทบทวนขั้นตอนการตรวจร่างกายและการให้เหตุผลทางคลินิกเพิ่มเติม'),
    });
    setComments('');
  };

  return (
    <div className="space-y-8">
      {/* Header + Sub-module Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">
            ระบบประเมินผลอาจารย์แพทย์ การตัดเกรด MPL และ OSCE / EPA
          </h1>
          <p className="text-sm text-slate-600 mt-1.5">
            แบบประเมิน MEC_Surin (Form A, B, C, E, Well Baby), การตั้งค่าน้ำหนัก % รายวิชา, ตัดเกรดตาม Minimal Passing Level และประเมิน OSCE
          </p>
        </div>

        <div className="inline-flex flex-wrap items-center p-1 bg-slate-200/75 rounded-lg self-start">
          {(role === 'student'
            ? ([
                { id: 'my_grades', label: 'ผลการเรียนของฉัน (Transcript & MPL)' },
                { id: 'osce_epa', label: 'OSCE / EPA และตารางสอบ' },
                { id: 'preceptor_feedback', label: 'ประเมินอาจารย์และรายวิชา' },
                { id: 'forms', label: 'ดูโครงสร้างแบบประเมิน' },
              ] as const)
            : ([
                { id: 'forms', label: 'แบบประเมินอาจารย์ (ตามรายวิชา)' },
                ...(hasRoleAccess(role, true, ADMIN_OFFICER_ROLES)
                  ? ([{ id: 'course_blueprint', label: 'ตั้งค่าแบบฟอร์ม & หัวข้อรายวิชา' }] as const)
                  : []),
                { id: 'mpl_grading', label: 'ตัดเกรด % และเกณฑ์ MPL' },
                { id: 'osce_epa', label: 'OSCE / EPA และผลการเรียน' },
                { id: 'preceptor_feedback', label: 'ผลประเมินการสอน (QA)' },
              ] as const)
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                subTab === t.id
                  ? 'bg-white text-[#0F2A4A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {subTab === 'my_grades' && (
        <div className="space-y-8">
          {/* Student Academic Identity Header with Portrait */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <StudentAvatar
                studentId={currentStudentId}
                studentName={resolvedStudentName}
                studentPhotos={studentPhotos}
                size="lg"
              />
              <div>
                <div className="text-xs font-medium text-[#0F766E]">
                  ระเบียนผลการเรียนนักศึกษาแพทย์ (Student Academic Profile)
                </div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {resolvedStudentName}
                </h2>
                <div className="text-xs text-slate-600 tabular-nums mt-0.5">
                  รหัส {currentStudentId} · ชั้นปีที่ {activeStudent.yearLevel} {activeStudent.group} · ศูนย์แพทยศาสตรศึกษาชั้นคลินิก รพ.สุรินทร์
                </div>
              </div>
            </div>
            <div className="text-left sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
              <div className="text-xs text-slate-500">เกรดเฉลี่ยสะสม (GPAX)</div>
              <div className="text-2xl font-bold text-[#0F2A4A] tabular-nums">{gpax}</div>
            </div>
          </section>

          {/* Student GPAX & National License Summary */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="text-xs text-slate-500">เกรดเฉลี่ยสะสมชั้นคลินิก (GPAX)</div>
              <div className="mt-1 text-2xl font-bold text-[#0F2A4A] tabular-nums">{gpax}</div>
              <div className="mt-1 text-xs text-slate-500 tabular-nums">
                หน่วยกิตรวม {totalCreditsAll} หน่วยกิต
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="text-xs text-slate-500">ศรว. ขั้นตอนที่ 1 (Basic Science)</div>
              <div className="mt-1 text-2xl font-bold text-emerald-700">สอบผ่าน</div>
              <div className="mt-1 text-xs text-slate-500">รับรองผลโดย ศรว.</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="text-xs text-slate-500">ศรว. ขั้นตอนที่ 2 (Clinical Science)</div>
              <div className="mt-1 text-2xl font-bold text-emerald-700">สอบผ่าน</div>
              <div className="mt-1 text-xs text-slate-500">สูงกว่าค่าเฉลี่ยประเทศ</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="text-xs text-slate-500">ศรว. ขั้นตอนที่ 3 (OSCE & MEQ)</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">เตรียมสอบ มี.ค. 2570</div>
              <div className="mt-1 text-xs text-slate-500">อยู่ระหว่างฝึกสอบจำลอง Mock OSCE</div>
            </div>
          </section>

          {/* Interactive Score Progression Data Visualization */}
          <StudentScoreChart
            studentId={currentStudentId}
            configs={gradingConfigs}
            studentScores={studentScores}
          />

          {/* Live MPL Course Grades & Component Breakdown */}
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-[#0F2A4A]" aria-hidden="true" />
                  คะแนนแยกองค์ประกอบและเกรดรายวิชาตามเกณฑ์ MPL (เฉพาะของท่าน)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  อัปเดตอัตโนมัติเมื่ออาจารย์แพทย์บันทึกแบบประเมิน Form A, B, C, Well Baby, Form E และคะแนนสอบ
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500">รหัส {currentStudentId}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                    <th className="py-3 px-4">รายวิชา</th>
                    <th className="py-3 px-2.5 text-right">Form A</th>
                    <th className="py-3 px-2.5 text-right">Form B</th>
                    <th className="py-3 px-2.5 text-right">Form C</th>
                    <th className="py-3 px-2.5 text-right">Well Baby</th>
                    <th className="py-3 px-2.5 text-right">Form E</th>
                    <th className="py-3 px-2.5 text-right">OSCE</th>
                    <th className="py-3 px-2.5 text-right">ข้อเขียน</th>
                    <th className="py-3 px-3 text-right">รวมสุทธิ / MPL</th>
                    <th className="py-3 px-3 text-center">เกรด</th>
                    <th className="py-3 px-4">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {gradingConfigs.map((cfg) => {
                    const myRow = studentScores.find(
                      (s) => s.studentId === currentStudentId && s.courseCode === cfg.courseCode
                    );
                    if (!myRow) return null;
                    const res = evaluateStudentGrade(myRow, cfg);
                    return (
                      <tr key={cfg.courseCode} className="hover:bg-slate-50/70">
                        <td className="py-3.5 px-4">
                          <div className="font-mono text-xs text-slate-500">{cfg.courseCode}</div>
                          <div className="font-medium text-slate-900">{cfg.courseName}</div>
                          {(cfg.customGradeGroups ?? []).length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] font-mono text-[#0F766E] tabular-nums">
                              {(cfg.customGradeGroups ?? []).map((grp) => {
                                const val = myRow.customGroupScores?.[grp.id];
                                return (
                                  <span
                                    key={grp.id}
                                    className="px-1.5 py-0.5 bg-teal-50 border border-teal-200 rounded"
                                  >
                                    {grp.name} ({grp.weightPercent}%):{' '}
                                    {val !== null && val !== undefined ? `${val}%` : '-'}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-2.5 text-right font-mono text-xs tabular-nums text-slate-700">
                          {myRow.formA !== null ? `${myRow.formA}%` : '-'}
                        </td>
                        <td className="py-3.5 px-2.5 text-right font-mono text-xs tabular-nums text-slate-700">
                          {myRow.formB !== null ? `${myRow.formB}%` : '-'}
                        </td>
                        <td className="py-3.5 px-2.5 text-right font-mono text-xs tabular-nums text-slate-700">
                          {myRow.formC !== null ? `${myRow.formC}%` : '-'}
                        </td>
                        <td className="py-3.5 px-2.5 text-right font-mono text-xs tabular-nums text-slate-700">
                          {myRow.wellBaby !== null ? `${myRow.wellBaby}%` : '-'}
                        </td>
                        <td className="py-3.5 px-2.5 text-right font-mono text-xs tabular-nums text-slate-700">
                          {myRow.formE !== null ? `${myRow.formE}%` : '-'}
                        </td>
                        <td className="py-3.5 px-2.5 text-right font-mono text-xs tabular-nums text-slate-700">
                          {myRow.osce !== null ? `${myRow.osce}%` : '-'}
                        </td>
                        <td className="py-3.5 px-2.5 text-right font-mono text-xs tabular-nums text-slate-700">
                          {myRow.writtenExam !== null ? `${myRow.writtenExam}%` : '-'}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-xs tabular-nums">
                          <span className="font-bold text-slate-900 text-sm">
                            {res.weightedTotal.toFixed(1)}%
                          </span>
                          <span className="text-slate-400"> / {cfg.mplPercent}%</span>
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono text-base font-bold text-[#0F2A4A]">
                          {res.grade}
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          {res.passed ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                              {res.reason}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-700 font-medium">
                              <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                              {res.reason}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Official Clinical Academic Transcript */}
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900">
                ใบแสดงผลการศึกษาชั้นคลินิก (Clinical Academic Transcript)
              </h2>
              <span className="text-xs font-mono text-slate-600 tabular-nums">
                GPAX: {gpax} · รวม {totalCreditsAll} หน่วยกิต
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                    <th className="py-3 px-4">รหัสวิชา</th>
                    <th className="py-3 px-4">ชื่อรายวิชา</th>
                    <th className="py-3 px-4 text-right">ชั้นปี</th>
                    <th className="py-3 px-4 text-right">หน่วยกิต</th>
                    <th className="py-3 px-4 text-right">ระดับคะแนน</th>
                    <th className="py-3 px-4 text-right">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {grades.map((g) => (
                    <tr key={g.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono text-xs text-slate-600">{g.courseCode}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">{g.courseName}</td>
                      <td className="py-3 px-4 text-right tabular-nums text-slate-600">ปี {g.yearLevel}</td>
                      <td className="py-3 px-4 text-right tabular-nums text-slate-700">{g.credits}</td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-[#0F2A4A] tabular-nums">
                        {g.grade}
                      </td>
                      <td className="py-3 px-4 text-right text-xs font-medium">
                        <span className={g.status === 'ผ่านเกณฑ์' ? 'text-emerald-700' : 'text-slate-600'}>
                          {g.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Faculty Evaluation Feedback Received */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-900 border-b border-slate-200 pb-3">
              ผลประเมินและข้อเสนอแนะจากอาจารย์แพทย์ที่ได้รับ
            </h2>
            <div className="divide-y divide-slate-200">
              {facultySubmissions
                .filter((s) => s.studentId === currentStudentId)
                .map((sub) => (
                  <div key={sub.id} className="py-4 first:pt-1 last:pb-1 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <span>
                        <span className="font-mono font-semibold text-[#0F2A4A]">{sub.courseCode}</span>
                        {' · '}
                        Ward: {sub.wardOrSubrotation || 'ไม่ระบุ'}
                        {' · '}
                        <span className="tabular-nums">
                          {sub.rotationStartDate} ถึง {sub.rotationEndDate}
                        </span>
                        {' · โดย '}
                        {sub.evaluatorName}
                      </span>
                      <span className="font-mono font-bold text-slate-900 tabular-nums">
                        {sub.rawScore}/{sub.maxScore} ({sub.percentage}%) · {sub.ratingLabel}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-slate-900">{sub.formTitle}</div>
                    <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                      ข้อเสนอแนะ: {sub.feedback}
                    </p>
                  </div>
                ))}
            </div>
          </section>
        </div>
      )}

      {subTab === 'forms' && (
        <FacultyEvaluationForms
          role={role}
          currentStudentId={currentStudentId}
          authenticatedDisplayName={authenticatedDisplayName}
          assignedCourseCodes={assignedCourseCodes}
          studentPhotos={studentPhotos}
          courses={gradingConfigs}
          submissions={facultySubmissions}
          onSubmitBatchForms={onSubmitBatchForms}
        />
      )}

      {subTab === 'course_blueprint' && (
        <RoleAccessGuard
          role={role}
          isAuthenticated={true}
          allowedRoles={ADMIN_OFFICER_ROLES}
          showLockedNotice={true}
          restrictedTitle="จำกัดสิทธิ์การตั้งค่าโครงสร้างแบบประเมินและเกณฑ์เกรด"
          restrictedDescription="เฉพาะแอดมิน (ระดับ 3B) หรือนักวิชาการประจำรายวิชา (ระดับ 3A) เท่านั้นที่สามารถแก้ไขแบบประเมินและหัวข้อคิดเกรดได้"
        >
          <CourseEvaluationConfigPanel
            role={role}
            assignedCourseCodes={assignedCourseCodes}
            authenticatedDisplayName={authenticatedDisplayName}
            configs={gradingConfigs}
            onUpdateConfig={onUpdateGradingConfig}
          />
        </RoleAccessGuard>
      )}

      {subTab === 'mpl_grading' && (
        <MplGradingStudio
          role={role}
          currentStudentId={currentStudentId}
          currentUserName={
            authenticatedDisplayName ??
            (role === 'faculty'
              ? 'นพ. เอกรัตน์ วัฒนสุรินทร์'
              : role === 'course_officer'
                ? 'นักวิชาการประจำรายวิชา ศพค. รพ.สุรินทร์'
                : 'ผู้บริหารศูนย์แพทยฯ รพ.สุรินทร์')
          }
          assignedCourseCodes={assignedCourseCodes}
          studentPhotos={studentPhotos}
          configs={gradingConfigs}
          onUpdateConfig={onUpdateGradingConfig}
          studentScores={studentScores}
          onUpdateStudentScore={onUpdateStudentScore}
          facultySubmissions={facultySubmissions}
          onNotify={onNotify}
        />
      )}

      {subTab === 'preceptor_feedback' && (
        <PreceptorFeedbackPanel
          role={role}
          feedbacks={preceptorFeedbacks}
          onAddFeedback={onAddPreceptorFeedback}
        />
      )}

      {subTab === 'osce_epa' && (
        <div className="space-y-10">

      {/* National Licensing (ศรว.) & GPAX Summary Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500">เกรดเฉลี่ยสะสมชั้นคลินิก (GPAX)</div>
          <div className="mt-1 text-2xl font-bold text-[#0F2A4A] tabular-nums">{gpax}</div>
          <div className="mt-1 text-xs text-slate-500 tabular-nums">
            หน่วยกิตรวม {totalCreditsAll} หน่วยกิต
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500">ศรว. ขั้นตอนที่ 1 (Basic Science)</div>
          <div className="mt-1 text-2xl font-bold text-emerald-700">สอบผ่าน</div>
          <div className="mt-1 text-xs text-slate-500">รับรองผลโดย ศรว.</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500">ศรว. ขั้นตอนที่ 2 (Clinical Science)</div>
          <div className="mt-1 text-2xl font-bold text-emerald-700">สอบผ่าน</div>
          <div className="mt-1 text-xs text-slate-500">ผลคะแนนสูงกว่าค่าเฉลี่ยประเทศ</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500">ศรว. ขั้นตอนที่ 3 (OSCE & MEQ)</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">เตรียมสอบ มี.ค. 2570</div>
          <div className="mt-1 text-xs text-slate-500">อยู่ระหว่างฝึกสอบจำลอง Mock OSCE</div>
        </div>
      </section>

      {/* EPA Competency Matrix */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              ตารางพัฒนาการสมรรถนะวิชาชีพ (Entrustable Professional Activities: EPA)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              เกณฑ์ประเมินความไว้วางใจในการปฏิบัติงานทางคลินิก ระดับ 1–5 ตามมาตรฐานแพทยสภา
            </p>
          </div>
          {role === 'faculty' && (
            <span className="text-xs font-medium text-[#0F2A4A]">
              โหมดอาจารย์: สามารถปรับระดับสมรรถนะ EPA ได้โดยตรง
            </span>
          )}
        </div>

        <div className="divide-y divide-slate-200">
          {epas.map((epa) => {
            const pct = (epa.currentLevel / 5) * 100;
            const metTarget = epa.currentLevel >= epa.targetLevel;
            return (
              <div
                key={epa.id}
                className="py-4 first:pt-2 last:pb-1 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center"
              >
                <div className="lg:col-span-6 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                    <span className="font-mono font-semibold text-[#0F2A4A]">{epa.code}</span>
                    <span aria-hidden="true">·</span>
                    <span>ประเมินล่าสุด {epa.lastAssessedDate} โดย {epa.lastAssessedBy}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">{epa.title}</h3>
                  <p className="text-xs text-slate-600">{epa.description}</p>
                </div>

                <div className="lg:col-span-4 space-y-1.5">
                  <div className="flex justify-between text-xs tabular-nums">
                    <span className={metTarget ? 'font-semibold text-emerald-700' : 'font-medium text-amber-700'}>
                      {ENTRUSTMENT_LABELS[epa.currentLevel]}
                    </span>
                    <span className="text-slate-500">เป้าหมายระดับ {epa.targetLevel}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        metTarget ? 'bg-emerald-600' : 'bg-[#0F2A4A]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="lg:col-span-2 flex justify-start lg:justify-end">
                  {role === 'faculty' || role === 'course_officer' || role === 'admin' ? (
                    <select
                      value={epa.currentLevel}
                      onChange={(e) => onUpdateEpaLevel(epa.id, Number(e.target.value))}
                      aria-label={`ปรับระดับ ${epa.code}`}
                      className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg tabular-nums"
                    >
                      {[1, 2, 3, 4, 5].map((lvl) => (
                        <option key={lvl} value={lvl}>
                          ระดับ {lvl}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs font-mono font-semibold text-slate-700 tabular-nums">
                      Level {epa.currentLevel} / 5
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* OSCE Rubric Evaluator + Exam Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Interactive OSCE / Mini-CEX Rubric Form */}
        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-[#0F2A4A]" aria-hidden="true" />
              แบบประเมินทักษะทางคลินิก (OSCE & Mini-CEX Rubric)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {role === 'faculty'
                ? 'บันทึกคะแนนประเมินนักศึกษาแพทย์ตามเกณฑ์รูบริก 5 ด้าน (คะแนนผ่านเกณฑ์ 14/20)'
                : 'ทดลองคำนวณและบันทึกผลประเมินทักษะทางคลินิก (โหมดฝึกซ้อม / อาจารย์บันทึกผล)'}
            </p>
          </div>

          <form onSubmit={handleSaveEvaluation} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  สถานีสอบ / สถานการณ์คลินิก
                </label>
                <select
                  value={stationName}
                  onChange={(e) => setStationName(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg"
                >
                  {OSCE_STATIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  ชื่อนักศึกษาแพทย์ผู้รับการประเมิน
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {(
                [
                  { label: '1. การซักประวัติทางคลินิก (History Taking)', val: historyTaking, set: setHistoryTaking },
                  { label: '2. การตรวจร่างกายเฉพาะระบบ (Physical Exam)', val: physicalExam, set: setPhysicalExam },
                  { label: '3. การให้เหตุผลและวินิจฉัยแยกโรค (Clinical Reasoning)', val: clinicalReasoning, set: setClinicalReasoning },
                  { label: '4. การสื่อสารกับผู้ป่วยและให้คำแนะนำ (Communication)', val: communication, set: setCommunication },
                  { label: '5. เจตคติและจริยธรรมวิชาชีพ (Professionalism)', val: professionalism, set: setProfessionalism },
                ] as const
              ).map((criterion) => (
                <div
                  key={criterion.label}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-slate-100"
                >
                  <span className="text-xs sm:text-sm text-slate-700">{criterion.label}</span>
                  <div className="inline-flex items-center gap-1 shrink-0">
                    {[0, 1, 2, 3, 4].map((score) => (
                      <button
                        key={score}
                        type="button"
                        onClick={() => criterion.set(score)}
                        className={`w-8 h-8 text-xs font-mono font-medium rounded-md transition-colors cursor-pointer tabular-nums ${
                          criterion.val === score
                            ? 'bg-[#0F2A4A] text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <div>
                <div className="text-xs text-slate-500">คะแนนรวมสุทธิ (เกณฑ์ผ่าน ≥ 14)</div>
                <div className="text-xl font-bold font-mono text-slate-900 tabular-nums">
                  {totalScore} / 20
                </div>
              </div>
              <div
                className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
                  passed ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                {passed ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    <span>ผ่านเกณฑ์ (Pass)</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" aria-hidden="true" />
                    <span>ไม่ผ่านเกณฑ์ (Needs Remediation)</span>
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                ข้อเสนอแนะเชิงสร้างสรรค์ (Constructive Feedback)
              </label>
              <textarea
                rows={2}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="จุดเด่นและประเด็นที่นักศึกษาควรพัฒนาเพิ่มเติม..."
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 text-sm font-medium text-white bg-[#0F2A4A] rounded-lg hover:bg-[#163B66] transition-colors cursor-pointer"
            >
              บันทึกผลประเมินเข้าสู่ระบบ
            </button>
          </form>
        </section>

        {/* Right Column: Exam Schedule & Recorded OSCE History */}
        <div className="lg:col-span-6 space-y-8">
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-3">
              กำหนดการสอบ OSCE, MEQ และ Long Case
            </h2>
            <div className="divide-y divide-slate-200">
              {exams.map((ex) => (
                <div key={ex.id} className="py-3.5 first:pt-1 last:pb-1 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="font-mono tabular-nums">
                      {ex.date} · {ex.time} น. · {ex.format} ({ex.stations} สถานี)
                    </span>
                    <span
                      className={`font-semibold ${
                        ex.status === 'ประกาศผลแล้ว'
                          ? 'text-emerald-700'
                          : ex.status === 'กำลังจะมาถึง'
                          ? 'text-amber-700'
                          : 'text-[#0F2A4A]'
                      }`}
                    >
                      {ex.status}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">{ex.title}</h3>
                  <div className="text-xs text-slate-600">
                    {ex.cohort} · {ex.location}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-3">
              ประวัติผลการประเมิน OSCE / Mini-CEX ล่าสุด
            </h2>
            <div className="divide-y divide-slate-200">
              {evaluations.map((ev) => (
                <div key={ev.id} className="py-3.5 first:pt-1 last:pb-1 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 tabular-nums">
                      {ev.date} · ผู้ประเมิน: {ev.evaluatorName}
                    </span>
                    <span
                      className={`text-xs font-mono font-bold tabular-nums ${
                        ev.passed ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {ev.totalScore}/20 ({ev.passed ? 'ผ่าน' : 'ไม่ผ่าน'})
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-slate-900">{ev.stationName}</div>
                  <div className="text-xs text-slate-600">ผู้รับการประเมิน: {ev.studentName}</div>
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                    {ev.comments}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Academic Transcript Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900">
            ใบแสดงผลการศึกษาชั้นคลินิก (Clinical Academic Transcript)
          </h2>
          <span className="text-xs font-mono text-slate-600 tabular-nums">
            GPAX: {gpax} · รวม {totalCreditsAll} หน่วยกิต
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                <th className="py-3 px-4">รหัสวิชา</th>
                <th className="py-3 px-4">ชื่อรายวิชา</th>
                <th className="py-3 px-4 text-right">ชั้นปี</th>
                <th className="py-3 px-4 text-right">หน่วยกิต</th>
                <th className="py-3 px-4 text-right">ระดับคะแนน</th>
                <th className="py-3 px-4 text-right">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {grades.map((g) => (
                <tr key={g.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-mono text-xs text-slate-600">{g.courseCode}</td>
                  <td className="py-3 px-4 font-medium text-slate-900">{g.courseName}</td>
                  <td className="py-3 px-4 text-right tabular-nums text-slate-600">ปี {g.yearLevel}</td>
                  <td className="py-3 px-4 text-right tabular-nums text-slate-700">{g.credits}</td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-[#0F2A4A] tabular-nums">
                    {g.grade}
                  </td>
                  <td className="py-3 px-4 text-right text-xs font-medium">
                    <span className={g.status === 'ผ่านเกณฑ์' ? 'text-emerald-700' : 'text-slate-600'}>
                      {g.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
        </div>
      )}
    </div>
  );
}
