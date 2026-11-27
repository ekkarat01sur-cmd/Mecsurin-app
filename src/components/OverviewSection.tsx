import { useState } from 'react';
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock,
  Plus,
  Users,
} from 'lucide-react';
import {
  ActiveTab,
  Announcement,
  BedsideCheckInRecord,
  ClinicalMilestoneBadge,
  ClinicalPersonnelRecord,
  CohortStudentRecord,
  ConferenceEvent,
  CourseGrade,
  CourseGradingConfig,
  DutyShift,
  LearningStreakState,
  LogbookEntry,
  OsceEvaluationRecord,
  OsceExam,
  QuizCompletionRecord,
  StudentCourseScore,
  StudentPhotoMap,
  UserRole,
} from '../types/medicalSchool';
import { IMAGE_ASSETS } from '../data/initialMedicalData';
import { AcademicPortfolioSnapshot } from './AcademicPortfolioSnapshot';
import { DirectoryCategoryTab } from './ClinicalPersonnelDirectoryPanel';
import { BadgeGlyph } from './ClinicalMilestoneBadgesPanel';
import { ClinicalCaseDensityMap } from './ClinicalCaseDensityMap';
import { ClinicalCaseDiversityPanel } from './ClinicalCaseDiversityPanel';
import { ClinicalKnowledgeCheckPanel } from './ClinicalKnowledgeCheckPanel';
import { DailyMedicalDigestPanel } from './DailyMedicalDigestPanel';
import { NotificationsPanel } from './NotificationsPanel';
import { ResilientImage } from './ResilientImage';
import { StudentAvatar } from './StudentAvatar';
import { WardRotationCalendar } from './WardRotationCalendar';
import { WorkforceCohortDashboard } from './WorkforceCohortDashboard';

interface OverviewSectionProps {
  role: UserRole;
  currentStudentId: string;
  currentStudentName?: string;
  authenticatedDisplayName?: string;
  cohortStudents: CohortStudentRecord[];
  clinicalPersonnel: ClinicalPersonnelRecord[];
  studentPhotos: StudentPhotoMap;
  onOpenStudentDirectory: () => void;
  onOpenPersonnelDirectory: (category: DirectoryCategoryTab, yearFilter?: string) => void;
  onOpenAdminBackOffice?: () => void;
  conferences: ConferenceEvent[];
  onToggleConferenceCheckIn: (id: string) => void;
  announcements: Announcement[];
  onAddAnnouncement: (ann: Omit<Announcement, 'id' | 'date'>) => void;
  exams: OsceExam[];
  evaluations: OsceEvaluationRecord[];
  courseGrades: CourseGrade[];
  studentScores: StudentCourseScore[];
  gradingConfigs: CourseGradingConfig[];
  bedsideCheckIns: BedsideCheckInRecord[];
  logbookEntries: LogbookEntry[];
  shifts: DutyShift[];
  badges: ClinicalMilestoneBadge[];
  learningStreak: LearningStreakState;
  onCompleteClinicalQuiz: (result: {
    department: string;
    score: number;
    total: number;
  }) => QuizCompletionRecord;
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenNewLogbook: () => void;
}

export function OverviewSection({
  role,
  currentStudentId,
  currentStudentName = 'นศพ.ธนภัทร ศรีสุรินทร์',
  authenticatedDisplayName,
  cohortStudents,
  clinicalPersonnel,
  studentPhotos,
  onOpenStudentDirectory,
  onOpenPersonnelDirectory,
  onOpenAdminBackOffice,
  conferences,
  onToggleConferenceCheckIn,
  announcements,
  onAddAnnouncement,
  exams,
  evaluations,
  courseGrades,
  studentScores,
  gradingConfigs,
  bedsideCheckIns,
  logbookEntries,
  shifts,
  badges,
  learningStreak,
  onCompleteClinicalQuiz,
  onNavigateTab,
  onOpenNewLogbook,
}: OverviewSectionProps) {
  const [annFilter, setAnnFilter] = useState<'ทั้งหมด' | Announcement['category']>('ทั้งหมด');
  const [showNewAnnForm, setShowNewAnnForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCat, setNewCat] = useState<Announcement['category']>('วิชาการ');
  const [newSummary, setNewSummary] = useState('');

  const filteredAnnouncements =
    annFilter === 'ทั้งหมด'
      ? announcements
      : announcements.filter((a) => a.category === annFilter);

  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSummary.trim()) return;
    onAddAnnouncement({
      title: newTitle.trim(),
      category: newCat,
      author:
        authenticatedDisplayName ??
        (role === 'faculty'
          ? 'นพ. เอกรัตน์ วัฒนสุรินทร์'
          : role === 'course_officer'
            ? 'นักวิชาการประจำรายวิชา ศพค. รพ.สุรินทร์'
            : 'สำนักงานศูนย์แพทยศาสตรศึกษาชั้นคลินิก รพ.สุรินทร์'),
      summary: newSummary.trim(),
    });
    setNewTitle('');
    setNewSummary('');
    setShowNewAnnForm(false);
  };

  const approvedLogbookCount = logbookEntries.filter((e) => e.status === 'approved').length;
  const uploadedPhotoCount = cohortStudents.filter((s) => Boolean(studentPhotos[s.studentId])).length;
  const spotlightStudents = cohortStudents.filter((s) => Boolean(studentPhotos[s.studentId])).slice(0, 6);
  const activeStudent = cohortStudents.find((s) => s.studentId === currentStudentId);
  const isBackOfficeManager = role === 'admin' || role === 'course_officer';
  const earnedBadges = badges.filter((b) => b.earned);

  const year4Count = cohortStudents.filter((s) => s.yearLevel === '4').length;
  const year5Count = cohortStudents.filter((s) => s.yearLevel === '5').length;
  const year6Count = cohortStudents.filter((s) => s.yearLevel === '6').length;
  const internCount = clinicalPersonnel.filter((p) => p.category === 'intern').length;
  const preceptorCount = clinicalPersonnel.filter((p) => p.category === 'preceptor').length;
  const residentCount = clinicalPersonnel.filter((p) => p.category === 'resident').length;

  return (
    <div className="space-y-10">
      {/* Institutional Hero Split — Precision Midnight Navy & Surgical Teal */}
      <section className="rounded-2xl overflow-hidden border border-[#0F2A4A]/20 shadow-[0_18px_45px_-22px_rgba(9,26,50,0.45)] bg-white">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch bg-[#091A32]">
          <div className="lg:col-span-6 p-6 sm:p-10 lg:p-12 flex flex-col justify-between bg-gradient-to-br from-[#08172E] via-[#0B2240] to-[#0F3153] text-white relative">
            <div className="space-y-5">
              <div className="text-xs font-semibold text-[#5EEAD4] tracking-wide">
                โครงการผลิตแพทย์เพิ่มเพื่อชาวชนบท (CPIRD) · โรงพยาบาลสุรินทร์
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl lg:text-[2.65rem] font-bold leading-[1.2] text-white [text-wrap:balance]">
                ศูนย์แพทยศาสตรศึกษาชั้นคลินิก โรงพยาบาลสุรินทร์
              </h1>

              <p className="text-base text-slate-200 leading-relaxed max-w-xl">
                ศูนย์กลางการเรียนการสอนชั้นคลินิก (ชั้นปีที่ 4–6) มุ่งผลิตบัณฑิตแพทย์ที่มีความเชี่ยวชาญทางคลินิกตามมาตรฐานแพทยสภา ยึดมั่นในจริยธรรมวิชาชีพ และเข้าใจบริบทสุขภาพชุมชนอีสานใต้
              </p>
            </div>

            <div className="pt-8 flex flex-wrap items-center gap-3.5">
              <button
                type="button"
                onClick={onOpenNewLogbook}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#06202A] bg-[#2DD4BF] rounded-lg hover:bg-[#5EEAD4] transition-colors shadow-xs cursor-pointer whitespace-nowrap shrink-0"
              >
                บันทึกเคส E-Logbook
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('curriculum')}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-white/10 border border-white/25 rounded-lg hover:bg-white/15 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                ดูปฏิทินตารางเวร
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 relative min-h-[280px] lg:min-h-[430px] bg-[#0B2240]">
            <ResilientImage
              src={IMAGE_ASSETS.heroSurinMec}
              alt="อาคารศูนย์แพทยศาสตรศึกษาชั้นคลินิก โรงพยาบาลสุรินทร์ และนักศึกษาแพทย์ขณะปฏิบัติงาน"
              className="w-full h-full lg:h-full object-cover"
            />
            <div
              className="hidden lg:block absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#0F3153] to-transparent pointer-events-none"
              aria-hidden="true"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#08172E]/90 via-[#08172E]/45 to-transparent p-6 text-white">
              <p className="text-xs text-slate-200">
                ศูนย์การเรียนรู้ทางคลินิกและหุ่นจำลองอัจฉริยะ · โรงพยาบาลศูนย์ระดับตติยภูมิขนาด 1,000+ เตียง จังหวัดสุรินทร์
              </p>
            </div>
          </div>
        </div>

        {/* 4-Column Institutional Metrics Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-slate-200 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 bg-white">
          <button
            type="button"
            onClick={() => onOpenPersonnelDirectory('student', 'ทั้งหมด')}
            className="p-5 sm:p-6 text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
          >
            <div className="text-xs font-medium text-slate-500">นักศึกษาแพทย์ชั้นคลินิก</div>
            <div className="mt-1 text-2xl sm:text-3xl font-semibold text-[#091A32] tabular-nums">
              {cohortStudents.length} คน
            </div>
            <div className="mt-1 text-xs text-slate-500 tabular-nums">
              ปี 4: {year4Count} · ปี 5: {year5Count} · ปี 6: {year6Count}
            </div>
          </button>
          <button
            type="button"
            onClick={() => onOpenPersonnelDirectory('preceptor', 'ทั้งหมด')}
            className="p-5 sm:p-6 text-left border-l border-slate-200 lg:border-l-0 hover:bg-slate-50/80 transition-colors cursor-pointer"
          >
            <div className="text-xs font-medium text-slate-500">แพทย์พี่เลี้ยง (Preceptors)</div>
            <div className="mt-1 text-2xl sm:text-3xl font-semibold text-[#091A32] tabular-nums">
              {preceptorCount} ท่าน
            </div>
            <div className="mt-1 text-xs text-slate-500">ครอบคลุมทุกกลุ่มงานคลินิกหลัก</div>
          </button>
          <button
            type="button"
            onClick={() => onOpenPersonnelDirectory('intern', 'ทั้งหมด')}
            className="p-5 sm:p-6 text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
          >
            <div className="text-xs font-medium text-slate-500">แพทย์ Intern & แพทย์ประจำบ้าน</div>
            <div className="mt-1 text-2xl sm:text-3xl font-semibold text-[#091A32] tabular-nums">
              {internCount + residentCount} ท่าน
            </div>
            <div className="mt-1 text-xs text-slate-500 tabular-nums">
              Intern {internCount} ท่าน · ประจำบ้าน {residentCount} ท่าน
            </div>
          </button>
          <div className="p-5 sm:p-6 border-l border-slate-200 lg:border-l-0">
            <div className="text-xs font-medium text-slate-500">ผลสอบประมวลความรู้ ศรว. ขั้นที่ 3</div>
            <div className="mt-1 text-2xl sm:text-3xl font-semibold text-[#0F766E] tabular-nums">
              98.6%
            </div>
            <div className="mt-1 text-xs text-slate-500">อัตราการสอบผ่านรุ่นปีการศึกษา 2568</div>
          </div>
        </div>
      </section>

      {/* Student Profile Card & Cohort Portrait Directory Strip */}
      <section className="clinical-surface rounded-2xl p-6 sm:p-7">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4 sm:gap-5">
            <StudentAvatar
              studentId={currentStudentId}
              studentName={currentStudentName}
              studentPhotos={studentPhotos}
              size="xl"
            />
            <div className="space-y-1">
              <div className="text-xs font-medium text-[#0F766E]">
                {isBackOfficeManager
                  ? 'ฐานข้อมูลทำเนียบนักศึกษาและรูปถ่ายประจำตัว'
                  : 'ข้อมูลนักศึกษาแพทย์ประจำตัว (Clinical Student Profile)'}
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
                {currentStudentName}
              </h2>
              <div className="text-xs sm:text-sm text-slate-600 flex flex-wrap items-center gap-x-2.5 gap-y-1 tabular-nums">
                <span>รหัสนักศึกษา {currentStudentId}</span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span>
                  {activeStudent
                    ? `ชั้นปีที่ ${activeStudent.yearLevel}${activeStudent.yearLevel === '6' ? ' (Extern)' : ''} ${activeStudent.group}`
                    : 'ชั้นปีที่ 6 (Extern) กลุ่ม A'}
                </span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span>อาจารย์ที่ปรึกษา: นพ.เอกรัตน์ วัฒนสุรินทร์</span>
              </div>
              <div className="pt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 tabular-nums">
                <span>GPAX สะสม: <strong className="text-[#0F2A4A]">3.82</strong></span>
                <span>E-Logbook รับรองแล้ว: <strong className="text-emerald-700">{approvedLogbookCount} เคส</strong></span>
                <span>Learning Streak: <strong className="text-amber-800">{learningStreak.currentStreakDays} วัน ({learningStreak.totalPoints.toLocaleString('th-TH')} คะแนน)</strong></span>
                <span>รูปถ่ายนักศึกษาในระบบ: <strong className="text-slate-900">{uploadedPhotoCount}/{cohortStudents.length} คน</strong></span>
              </div>

              {/* Earned Clinical Milestone Seals */}
              <div className="pt-2.5 flex flex-wrap items-center gap-2">
                {earnedBadges.map((badge) => (
                  <div
                    key={badge.id}
                    title={`${badge.title} — ${badge.criteriaText}`}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium ${
                      badge.tier === 'gold'
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : badge.tier === 'teal'
                          ? 'bg-emerald-50/70 border-emerald-200 text-[#0F766E]'
                          : 'bg-slate-50 border-slate-200 text-[#0F2A4A]'
                    }`}
                  >
                    <BadgeGlyph iconKey={badge.iconKey} className="w-3.5 h-3.5 shrink-0" />
                    <span>{badge.shortTitle}</span>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => onNavigateTab('curriculum')}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#0F766E] hover:text-[#0D625C] underline underline-offset-2 cursor-pointer tabular-nums"
                >
                  <span>ดูเหรียญความสำเร็จ ({earnedBadges.length}/{badges.length})</span>
                  <ArrowRight className="w-3 h-3" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0">
            <div className="flex items-center -space-x-2">
              {spotlightStudents.map((st) => (
                <StudentAvatar
                  key={st.studentId}
                  studentId={st.studentId}
                  studentName={st.studentName}
                  studentPhotos={studentPhotos}
                  size="sm"
                  className="ring-2 ring-white"
                />
              ))}
            </div>

            <button
              type="button"
              onClick={onOpenStudentDirectory}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                isBackOfficeManager
                  ? 'bg-[#0F2A4A] text-white hover:bg-[#163B66] shadow-xs'
                  : 'bg-slate-50 text-[#0F2A4A] border border-slate-300 hover:bg-slate-100'
              }`}
            >
              {isBackOfficeManager ? (
                <Camera className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Users className="w-4 h-4" aria-hidden="true" />
              )}
              <span>
                {isBackOfficeManager
                  ? 'อัปโหลดและจัดการรูปนักศึกษา'
                  : 'ดูทำเนียบนักศึกษาทั้งหมด'}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Workforce & Student Cohort Summary Dashboard (Total + By Year + Intern/Preceptor/Resident) */}
      <WorkforceCohortDashboard
        role={role}
        cohortStudents={cohortStudents}
        clinicalPersonnel={clinicalPersonnel}
        studentPhotos={studentPhotos}
        onOpenPersonnelDirectory={onOpenPersonnelDirectory}
        onOpenAdminBackOffice={onOpenAdminBackOffice}
      />

      {/* Student Notifications Panel (OSCE deadlines, Logbook feedback, Shift swap updates) */}
      <NotificationsPanel
        exams={exams}
        logbookEntries={logbookEntries}
        shifts={shifts}
        currentStudentName={currentStudentName}
        onNavigateTab={onNavigateTab}
      />

      {/* Ward Rotation Calendar (Monthly Color-Coded Ward & Department Overview) */}
      <WardRotationCalendar
        role={role}
        shifts={shifts}
        studentPhotos={studentPhotos}
        currentStudentName={currentStudentName}
        onNavigateCurriculum={() => onNavigateTab('curriculum')}
      />

      {/* Daily Medical Digest (Department-Specific Updates via Google Search Grounding) */}
      <DailyMedicalDigestPanel
        currentStudentName={currentStudentName}
        shifts={shifts}
        logbookEntries={logbookEntries}
      />

      {/* Clinical Knowledge Check (Daily 3-Question Grounded Quiz + Learning Streak) */}
      <ClinicalKnowledgeCheckPanel
        currentStudentName={currentStudentName}
        yearLevel={activeStudent?.yearLevel ?? '6'}
        shifts={shifts}
        logbookEntries={logbookEntries}
        learningStreak={learningStreak}
        onCompleteQuiz={onCompleteClinicalQuiz}
      />

      {/* Clinical Case Diversity (Recharts E-Logbook Exposure Balance) */}
      <ClinicalCaseDiversityPanel
        logbookEntries={logbookEntries}
        onOpenNewLogbook={onOpenNewLogbook}
        onNavigateLogbook={() => onNavigateTab('logbook')}
      />

      {/* Clinical Case Density Map (Treemap & Ward-Level Exposure Heatmap) */}
      <ClinicalCaseDensityMap
        currentStudentName={currentStudentName}
        shifts={shifts}
        logbookEntries={logbookEntries}
        bedsideCheckIns={bedsideCheckIns}
        conferences={conferences}
        onOpenNewLogbook={onOpenNewLogbook}
        onNavigateTab={onNavigateTab}
      />

      {/* Academic Portfolio Snapshot (Course Stats, Cumulative OSCE, Clinical Hours Pie Chart) */}
      <AcademicPortfolioSnapshot
        role={role}
        currentStudentId={currentStudentId}
        currentStudentName={currentStudentName}
        courseGrades={courseGrades}
        studentScores={studentScores}
        gradingConfigs={gradingConfigs}
        evaluations={evaluations}
        exams={exams}
        shifts={shifts}
        conferences={conferences}
        bedsideCheckIns={bedsideCheckIns}
        onNavigateTab={onNavigateTab}
      />

      {/* Two-column Operational & Announcements Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Today's Clinical Academic Conferences (Left 7 cols) */}
        <div className="lg:col-span-7 clinical-surface rounded-2xl p-6 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                กิจกรรมวิชาการทางคลินิกประจำวัน
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Morning Report, Grand Round และ M&M Conference วันอังคารที่ 24 พฤศจิกายน 2569
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('curriculum')}
              className="text-sm font-medium text-[#0F2A4A] hover:underline cursor-pointer whitespace-nowrap shrink-0"
            >
              ดูตารางเวรทั้งหมด
            </button>
          </div>

          <div className="divide-y divide-slate-200">
            {conferences.map((conf) => (
              <div
                key={conf.id}
                className="py-5 first:pt-5 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                    <span className="font-mono font-medium text-slate-900 tabular-nums">
                      {conf.time}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{conf.type}</span>
                    <span aria-hidden="true">·</span>
                    <span>{conf.department}</span>
                  </div>
                  <h3 className="text-base font-medium text-slate-900 leading-snug">
                    {conf.title}
                  </h3>
                  <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span>วิทยากร: {conf.speaker}</span>
                    <span aria-hidden="true">·</span>
                    <span>สถานที่: {conf.location}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">ผู้ลงชื่อแล้ว {conf.attendeeCount} คน</span>
                  </div>
                </div>

                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={() => onToggleConferenceCheckIn(conf.id)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      conf.checkedIn
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-[#0F2A4A] text-white hover:bg-[#163B66]'
                    }`}
                  >
                    {conf.checkedIn ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        ลงชื่อเข้าร่วมแล้ว
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                        ลงชื่อเข้าร่วม (Check-in)
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Announcements & Academic Bulletins (Right 5 cols) */}
        <div className="lg:col-span-5 clinical-surface rounded-2xl p-6 sm:p-7">
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">
              ประกาศศูนย์แพทยฯ
            </h2>
            {(role === 'faculty' || role === 'course_officer' || role === 'admin') && (
              <button
                type="button"
                onClick={() => setShowNewAnnForm((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0F2A4A] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                เพิ่มประกาศ
              </button>
            )}
          </div>

          {showNewAnnForm && (
            <form
              onSubmit={handleCreateAnnouncement}
              className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3"
            >
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="หัวข้อประกาศ..."
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              />
              <select
                value={newCat}
                onChange={(e) => setNewCat(e.target.value as Announcement['category'])}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              >
                <option value="วิชาการ">วิชาการ</option>
                <option value="ตารางสอบ">ตารางสอบ</option>
                <option value="หอพักและสวัสดิการ">หอพักและสวัสดิการ</option>
              </select>
              <textarea
                rows={2}
                value={newSummary}
                onChange={(e) => setNewSummary(e.target.value)}
                placeholder="รายละเอียดประกาศ..."
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewAnnForm(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#0F2A4A] rounded-lg hover:bg-[#163B66] cursor-pointer"
                >
                  เผยแพร่ประกาศ
                </button>
              </div>
            </form>
          )}

          {/* Filter tabs */}
          <div className="mt-4 flex flex-wrap gap-1 p-1 bg-slate-100 rounded-lg">
            {(['ทั้งหมด', 'วิชาการ', 'ตารางสอบ', 'หอพักและสวัสดิการ'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setAnnFilter(cat)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  annFilter === cat
                    ? 'bg-white text-[#0F2A4A] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="mt-2 divide-y divide-slate-200">
            {filteredAnnouncements.map((ann) => (
              <article key={ann.id} className="py-4 last:pb-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                  <span className={ann.urgent ? 'text-amber-700 font-semibold' : 'font-medium text-slate-700'}>
                    {ann.category}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{ann.date}</span>
                  {ann.urgent && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-amber-700 font-medium">เร่งด่วน</span>
                    </>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-slate-900 leading-snug">
                  {ann.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">{ann.summary}</p>
                <div className="text-xs text-slate-400">โดย {ann.author}</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Clinical Learning Facilities & Training Environment */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl font-bold text-slate-900">
              สภาพแวดล้อมการเรียนรู้และทักษะทางคลินิก
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              บูรณาการการเรียนรู้จากสถานการณ์จำลองมาตรฐานสูงสู่การดูแลผู้ป่วยจริง ณ หอผู้ป่วยโรงพยาบาลสุรินทร์
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('assessment')}
            className="text-sm font-medium text-[#0F2A4A] hover:underline cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            เข้าสู่ระบบประเมิน OSCE และ EPA
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="clinical-surface rounded-2xl overflow-hidden flex flex-col transition-transform duration-200 hover:-translate-y-0.5">
            <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
              <ResilientImage
                src={IMAGE_ASSETS.clinicalSkillsSim}
                alt="ศูนย์ทักษะทางคลินิกและหุ่นจำลองทางการแพทย์ (Simulation Center)"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-5 space-y-2 flex-1 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-[#0F766E]">ชั้น 3 อาคารศูนย์แพทยฯ · 12 ห้องสถานีสอบ</div>
                <h3 className="text-base font-semibold text-slate-900">
                  ศูนย์ทักษะทางคลินิกและสถานการณ์จำลอง (Simulation & OSCE Center)
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  ฝึกหัตถการช่วยชีวิตขั้นสูง ACLS, การใส่ท่อช่วยหายใจ, การทำคลอดจำลอง และการสอบ OSCE แบบ Real-time
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('assessment')}
                className="mt-4 pt-3 border-t border-slate-100 text-left text-xs font-semibold text-[#0F2A4A] hover:text-[#0F766E] transition-colors cursor-pointer"
              >
                ดูตารางสอบ OSCE และเกณฑ์ประเมิน →
              </button>
            </div>
          </div>

          <div className="clinical-surface rounded-2xl overflow-hidden flex flex-col transition-transform duration-200 hover:-translate-y-0.5">
            <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
              <ResilientImage
                src={IMAGE_ASSETS.wardRoundTeaching}
                alt="การสอนข้างเตียงผู้ป่วย (Bedside Teaching) โดยอาจารย์แพทย์โรงพยาบาลสุรินทร์"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-5 space-y-2 flex-1 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-[#0F766E]">12 กลุ่มงานคลินิก · Bedside Teaching</div>
                <h3 className="text-base font-semibold text-slate-900">
                  การฝึกปฏิบัติงานบนหอผู้ป่วยและโรงพยาบาลชุมชนเครือข่าย
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  เรียนรู้การดูแลผู้ป่วยจริงอย่างใกล้ชิดภายใต้การกำกับของอาจารย์แพทย์ผู้เชี่ยวชาญ พร้อมระบบบันทึก E-Logbook
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('logbook')}
                className="mt-4 pt-3 border-t border-slate-100 text-left text-xs font-semibold text-[#0F2A4A] hover:text-[#0F766E] transition-colors cursor-pointer"
              >
                เปิดสมุดบันทึกประสบการณ์ E-Logbook →
              </button>
            </div>
          </div>

          <div className="clinical-surface rounded-2xl overflow-hidden flex flex-col transition-transform duration-200 hover:-translate-y-0.5">
            <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
              <ResilientImage
                src={IMAGE_ASSETS.medicalLibraryStudy}
                alt="ห้องสมุดทางการแพทย์และศูนย์วิจัยคลินิก รพ.สุรินทร์"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-5 space-y-2 flex-1 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-[#0F766E]">เปิดบริการ 24 ชั่วโมง · UpToDate & ClinicalKey</div>
                <h3 className="text-base font-semibold text-slate-900">
                  ห้องสมุดวิทยาศาสตร์การแพทย์และศูนย์สนับสนุนการวิจัย R2R
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  เข้าถึงฐานข้อมูลวารสารการแพทย์ แนวทางเวชปฏิบัติเฉพาะของ รพ.สุรินทร์ (CPG) และทุนวิจัยนักศึกษาแพทย์
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('library')}
                className="mt-4 pt-3 border-t border-slate-100 text-left text-xs font-semibold text-[#0F2A4A] hover:text-[#0F766E] transition-colors cursor-pointer"
              >
                เข้าสู่คลังแนวทางเวชปฏิบัติและวิจัย →
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
