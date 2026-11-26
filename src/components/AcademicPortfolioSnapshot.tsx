import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock,
  GraduationCap,
  Target,
} from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import {
  ActiveTab,
  BedsideCheckInRecord,
  ConferenceEvent,
  CourseGrade,
  CourseGradingConfig,
  DutyShift,
  OsceEvaluationRecord,
  OsceExam,
  StudentCourseScore,
  UserRole,
} from '../types/medicalSchool';
import { evaluateStudentGrade } from '../utils/gradeEvaluation';

interface AcademicPortfolioSnapshotProps {
  role: UserRole;
  currentStudentId: string;
  currentStudentName: string;
  courseGrades: CourseGrade[];
  studentScores: StudentCourseScore[];
  gradingConfigs: CourseGradingConfig[];
  evaluations: OsceEvaluationRecord[];
  exams: OsceExam[];
  shifts: DutyShift[];
  conferences: ConferenceEvent[];
  bedsideCheckIns: BedsideCheckInRecord[];
  onNavigateTab: (tab: ActiveTab) => void;
}

type SnapshotChartMode = 'hours' | 'courses' | 'osce';

interface PieSliceItem {
  key: string;
  label: string;
  sublabel: string;
  value: number;
  unit: string;
  color: string;
}

function normalizeThaiName(name: string): string {
  return name.replace(/\s+/g, '').trim();
}

function parseShiftDurationHours(timeRange: string): number {
  const match = timeRange.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!match) return 8;
  const startMin = Number(match[1]) * 60 + Number(match[2]);
  let endMin = Number(match[3]) * 60 + Number(match[4]);
  if (endMin <= startMin) {
    endMin += 24 * 60;
  }
  return Math.round(((endMin - startMin) / 60) * 10) / 10;
}

function parseClockSpanHours(timeRange: string): number {
  const match = timeRange.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!match) return 1;
  const startMin = Number(match[1]) * 60 + Number(match[2]);
  let endMin = Number(match[3]) * 60 + Number(match[4]);
  if (endMin <= startMin) {
    endMin += 24 * 60;
  }
  return Math.max(0.5, Math.round(((endMin - startMin) / 60) * 10) / 10);
}

const DEPT_COLORS: Record<string, string> = {
  กลุ่มงานอายุรศาสตร์: '#0F2A4A',
  กลุ่มงานเวชศาสตร์ฉุกเฉิน: '#D97706',
  กลุ่มงานกุมารเวชศาสตร์: '#0F766E',
  กลุ่มงานศัลยศาสตร์: '#1D4ED8',
  กลุ่มงานสูติศาสตร์_นรีเวชวิทยา: '#475569',
};

export function AcademicPortfolioSnapshot({
  role,
  currentStudentId,
  currentStudentName,
  courseGrades,
  studentScores,
  gradingConfigs,
  evaluations,
  exams,
  shifts,
  conferences,
  bedsideCheckIns,
  onNavigateTab,
}: AcademicPortfolioSnapshotProps) {
  const [chartMode, setChartMode] = useState<SnapshotChartMode>('hours');

  const normalizedStudentName = normalizeThaiName(currentStudentName);

  // 1. End-of-Rotation Course Summary (merged CourseGrades + live studentScores via gradingEngine)
  const courseAnalytics = useMemo(() => {
    const configMap = new Map(gradingConfigs.map((c) => [c.courseCode, c]));
    const myScores = studentScores.filter((s) => s.studentId === currentStudentId);
    const liveEvalByCourse = new Map(
      myScores
        .map((score) => {
          const cfg = configMap.get(score.courseCode);
          if (!cfg) return null;
          return [
            score.courseCode,
            { score, cfg, result: evaluateStudentGrade(score, cfg) },
          ] as const;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
    );

    const enrichedCourses = courseGrades.map((cg) => {
      const live = liveEvalByCourse.get(cg.courseCode);
      if (!live) {
        return {
          ...cg,
          weightedTotal: null as number | null,
          writtenExam: null as number | null,
          courseOsce: null as number | null,
          passed: cg.status === 'ผ่านเกณฑ์',
        };
      }
      return {
        ...cg,
        grade: live.result.grade,
        gradePoint: live.result.gradePoint,
        status: live.result.passed ? ('ผ่านเกณฑ์' as const) : ('กำลังศึกษา' as const),
        weightedTotal: live.result.weightedTotal,
        writtenExam: live.score.writtenExam,
        courseOsce: live.score.osce,
        passed: live.result.passed,
      };
    });

    const letterCourses = enrichedCourses.filter(
      (c) => c.grade !== 'S' && c.grade !== 'U' && c.status === 'ผ่านเกณฑ์'
    );
    const letterCredits = letterCourses.reduce((sum, c) => sum + c.credits, 0);
    const weightedPoints = letterCourses.reduce(
      (sum, c) => sum + c.gradePoint * c.credits,
      0
    );
    const gpax =
      letterCredits > 0 ? Math.round((weightedPoints / letterCredits) * 100) / 100 : 3.82;

    const totalCredits = enrichedCourses.reduce((sum, c) => sum + c.credits, 0);
    const completedCredits = enrichedCourses
      .filter((c) => c.status === 'ผ่านเกณฑ์')
      .reduce((sum, c) => sum + c.credits, 0);
    const inProgressCredits = totalCredits - completedCredits;
    const passedCourseCount = enrichedCourses.filter((c) => c.status === 'ผ่านเกณฑ์').length;

    const scoredCourses = enrichedCourses.filter((c) => c.weightedTotal !== null);
    const avgWeightedPercent =
      scoredCourses.length > 0
        ? Math.round(
            (scoredCourses.reduce((sum, c) => sum + (c.weightedTotal ?? 0), 0) /
              scoredCourses.length) *
              10
          ) / 10
        : 0;

    const lowestScoredCourse =
      scoredCourses.length > 0
        ? [...scoredCourses].sort(
            (a, b) => (a.weightedTotal ?? 100) - (b.weightedTotal ?? 100)
          )[0]
        : null;

    // Credits by grade bucket for PieChart
    const creditsA = enrichedCourses
      .filter((c) => c.status === 'ผ่านเกณฑ์' && c.grade === 'A')
      .reduce((s, c) => s + c.credits, 0);
    const creditsBPlus = enrichedCourses
      .filter((c) => c.status === 'ผ่านเกณฑ์' && c.grade === 'B+')
      .reduce((s, c) => s + c.credits, 0);
    const creditsOtherPassed = enrichedCourses
      .filter(
        (c) => c.status === 'ผ่านเกณฑ์' && c.grade !== 'A' && c.grade !== 'B+'
      )
      .reduce((s, c) => s + c.credits, 0);

    const courseSlices: PieSliceItem[] = [
      {
        key: 'grade-a',
        label: 'เกรด A (4.00)',
        sublabel: `${enrichedCourses.filter((c) => c.status === 'ผ่านเกณฑ์' && c.grade === 'A').length} รายวิชา`,
        value: creditsA,
        unit: 'หน่วยกิต',
        color: '#0F2A4A',
      },
      {
        key: 'grade-bplus',
        label: 'เกรด B+ (3.50)',
        sublabel: `${enrichedCourses.filter((c) => c.status === 'ผ่านเกณฑ์' && c.grade === 'B+').length} รายวิชา`,
        value: creditsBPlus,
        unit: 'หน่วยกิต',
        color: '#0F766E',
      },
      {
        key: 'grade-other',
        label: 'ผ่านเกณฑ์ระดับอื่น (B / C+ / C)',
        sublabel: `${enrichedCourses.filter((c) => c.status === 'ผ่านเกณฑ์' && c.grade !== 'A' && c.grade !== 'B+').length} รายวิชา`,
        value: creditsOtherPassed,
        unit: 'หน่วยกิต',
        color: '#1D4ED8',
      },
      {
        key: 'in-progress',
        label: 'กำลังศึกษา / รอสอบประมวลผล',
        sublabel: `${enrichedCourses.filter((c) => c.status === 'กำลังศึกษา').length} รายวิชา (Extern)`,
        value: inProgressCredits,
        unit: 'หน่วยกิต',
        color: '#D97706',
      },
    ].filter((s) => s.value > 0);

    return {
      enrichedCourses,
      gpax,
      totalCredits,
      completedCredits,
      inProgressCredits,
      passedCourseCount,
      totalCourseCount: enrichedCourses.length,
      avgWeightedPercent,
      lowestScoredCourse,
      courseSlices,
    };
  }, [courseGrades, studentScores, gradingConfigs, currentStudentId]);

  // 2. Cumulative OSCE Score (Station Evaluations + Course OSCE Scores)
  const osceAnalytics = useMemo(() => {
    const myEvals = evaluations.filter(
      (ev) => normalizeThaiName(ev.studentName) === normalizedStudentName
    );
    const activeEvals = myEvals.length > 0 ? myEvals : evaluations;

    const totalStationScore = activeEvals.reduce((sum, ev) => sum + ev.totalScore, 0);
    const maxStationScore = activeEvals.length * 20;
    const stationPercent =
      maxStationScore > 0
        ? Math.round((totalStationScore / maxStationScore) * 1000) / 10
        : 0;
    const passedStations = activeEvals.filter((ev) => ev.passed).length;

    const myCourseOsce = studentScores
      .filter((s) => s.studentId === currentStudentId && s.osce !== null)
      .map((s) => s.osce as number);
    const courseOsceAvg =
      myCourseOsce.length > 0
        ? Math.round(
            (myCourseOsce.reduce((sum, v) => sum + v, 0) / myCourseOsce.length) * 10
          ) / 10
        : stationPercent;

    const domainDefs = [
      {
        key: 'historyTaking' as const,
        label: 'ซักประวัติ (History Taking)',
        color: '#0F2A4A',
      },
      {
        key: 'physicalExam' as const,
        label: 'ตรวจร่างกาย (Physical Exam)',
        color: '#D97706',
      },
      {
        key: 'clinicalReasoning' as const,
        label: 'เหตุผลทางคลินิก (Clinical Reasoning)',
        color: '#0F766E',
      },
      {
        key: 'communication' as const,
        label: 'การสื่อสาร (Communication)',
        color: '#1D4ED8',
      },
      {
        key: 'professionalism' as const,
        label: 'ความเป็นวิชาชีพ (Professionalism)',
        color: '#475569',
      },
    ];

    const domainTotals = domainDefs.map((d) => {
      const earned = activeEvals.reduce((sum, ev) => sum + ev.scores[d.key], 0);
      const maxPts = activeEvals.length * 4;
      const pct = maxPts > 0 ? Math.round((earned / maxPts) * 1000) / 10 : 0;
      return {
        ...d,
        earned,
        maxPts,
        pct,
      };
    });

    const lowestDomain =
      domainTotals.length > 0
        ? [...domainTotals].sort((a, b) => a.pct - b.pct)[0]
        : null;

    const osceSlices: PieSliceItem[] = domainTotals.map((d) => ({
      key: d.key,
      label: d.label,
      sublabel: `${d.earned}/${d.maxPts} คะแนน (${d.pct.toFixed(0)}%)`,
      value: d.earned,
      unit: 'คะแนน',
      color: d.color,
    }));

    const upcomingExam =
      exams.find((e) => e.status === 'กำลังจะมาถึง') ??
      exams.find((e) => e.status === 'เปิดลงทะเบียน') ??
      exams[0] ??
      null;

    return {
      stationCount: activeEvals.length,
      passedStations,
      totalStationScore,
      maxStationScore,
      stationPercent,
      courseOsceAvg,
      courseOsceCount: myCourseOsce.length,
      lowestDomain,
      osceSlices: osceSlices.filter((s) => s.value > 0),
      upcomingExam,
    };
  }, [evaluations, normalizedStudentName, studentScores, currentStudentId, exams]);

  // 3. Clinical Duty & Practice Hours (Shifts + Conferences + Bedside Check-Ins)
  const hoursAnalytics = useMemo(() => {
    const myShifts = shifts.filter(
      (s) => normalizeThaiName(s.assignedStudent) === normalizedStudentName
    );
    const activeShifts = myShifts.length > 0 ? myShifts : shifts;

    const completedShifts = activeShifts.filter((s) => Boolean(s.checkedInAt));
    const scheduledShifts = activeShifts.filter((s) => !s.checkedInAt);

    const completedShiftHours = completedShifts.reduce(
      (sum, s) => sum + parseShiftDurationHours(s.timeRange),
      0
    );
    const scheduledShiftHours = scheduledShifts.reduce(
      (sum, s) => sum + parseShiftDurationHours(s.timeRange),
      0
    );

    const conferenceHours = conferences
      .filter((c) => c.checkedIn)
      .reduce((sum, c) => sum + parseClockSpanHours(c.time), 0);

    const myBedsideCount = bedsideCheckIns.filter(
      (b) => normalizeThaiName(b.studentName) === normalizedStudentName
    ).length;
    const bedsideHours = Math.round(myBedsideCount * 1.5 * 10) / 10;

    const totalLoggedHours =
      Math.round((completedShiftHours + conferenceHours + bedsideHours) * 10) / 10;
    const totalPlannedAndLoggedHours =
      Math.round((totalLoggedHours + scheduledShiftHours) * 10) / 10;

    // Group completed shift hours by department for pie slices
    const deptHoursMap = new Map<string, number>();
    completedShifts.forEach((s) => {
      const hrs = parseShiftDurationHours(s.timeRange);
      deptHoursMap.set(s.department, (deptHoursMap.get(s.department) ?? 0) + hrs);
    });

    const deptPalette = ['#0F2A4A', '#0F766E', '#1D4ED8', '#334155'];
    const completedDeptSlices: PieSliceItem[] = Array.from(deptHoursMap.entries()).map(
      ([dept, hrs], idx) => ({
        key: `dept-${dept}`,
        label: `ลงเวลาแล้ว: ${dept.replace('กลุ่มงาน', '')}`,
        sublabel: `${completedShifts.filter((s) => s.department === dept).length} เวรที่ลงเวลา`,
        value: hrs,
        unit: 'ชม.',
        color:
          DEPT_COLORS[dept] ??
          DEPT_COLORS[dept.replace('-', '_')] ??
          deptPalette[idx % deptPalette.length],
      })
    );

    const extraSlices: PieSliceItem[] = [];
    if (conferenceHours + bedsideHours > 0) {
      extraSlices.push({
        key: 'academic-bedside',
        label: 'ประชุมวิชาการ & Bedside Round',
        sublabel: `Conference ${conferenceHours} ชม. · Bedside ${bedsideHours} ชม.`,
        value: Math.round((conferenceHours + bedsideHours) * 10) / 10,
        unit: 'ชม.',
        color: '#0284C7',
      });
    }
    if (scheduledShiftHours > 0) {
      extraSlices.push({
        key: 'scheduled-upcoming',
        label: 'เวรตามตารางที่กำลังจะถึง',
        sublabel: `${scheduledShifts.length} เวรรอลงเวลา`,
        value: scheduledShiftHours,
        unit: 'ชม.',
        color: '#D97706',
      });
    }

    return {
      completedShiftCount: completedShifts.length,
      scheduledShiftCount: scheduledShifts.length,
      completedShiftHours,
      scheduledShiftHours,
      academicAndBedsideHours: Math.round((conferenceHours + bedsideHours) * 10) / 10,
      totalLoggedHours,
      totalPlannedAndLoggedHours,
      hourSlices: [...completedDeptSlices, ...extraSlices].filter((s) => s.value > 0),
    };
  }, [shifts, conferences, bedsideCheckIns, normalizedStudentName]);

  const activeChartMeta = useMemo(() => {
    if (chartMode === 'courses') {
      return {
        title: 'สัดส่วนผลสัมฤทธิ์ท้ายรายวิชา (หน่วยกิตตามระดับเกรด)',
        subtitle:
          'สรุปหน่วยกิตรายวิชาที่ผ่านเกณฑ์และรายวิชาที่กำลังศึกษาเพื่อวางแผนเกรดเฉลี่ยสะสม',
        centerValue: courseAnalytics.gpax.toFixed(2),
        centerLabel: 'GPAX สะสม',
        slices: courseAnalytics.courseSlices,
      };
    }
    if (chartMode === 'osce') {
      return {
        title: 'องค์ประกอบคะแนน OSCE รวมแยกตาม 5 สมรรถนะสถานีสอบ',
        subtitle:
          'สัดส่วนคะแนนจากการประเมินสถานีสอบ OSCE จริงเพื่อระบุทักษะที่ควรทบทวนก่อนสอบรอบถัดไป',
        centerValue: `${osceAnalytics.stationPercent.toFixed(1)}%`,
        centerLabel: `${osceAnalytics.totalStationScore}/${osceAnalytics.maxStationScore} คะแนน`,
        slices: osceAnalytics.osceSlices,
      };
    }
    return {
      title: 'สัดส่วนชั่วโมงเข้าปฏิบัติงานคลินิกและตารางเวร',
      subtitle:
        'เปรียบเทียบชั่วโมงเวรที่ลงเวลาแล้ว กิจกรรมวิชาการ/ข้างเตียง และชั่วโมงเวรที่รอปฏิบัติ',
      centerValue: `${hoursAnalytics.totalLoggedHours}`,
      centerLabel: 'ชม. ปฏิบัติจริง',
      slices: hoursAnalytics.hourSlices,
    };
  }, [chartMode, courseAnalytics, osceAnalytics, hoursAnalytics]);

  const totalSliceSum = activeChartMeta.slices.reduce((s, item) => s + item.value, 0);

  return (
    <section
      className="bg-white border border-slate-200 rounded-xl p-6 sm:p-7 space-y-6"
      aria-label="สรุปพอร์ตโฟลิโอวิชาการและเตรียมสอบ (Academic Portfolio Snapshot)"
    >
      {/* Header & Interactive Chart Mode Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F766E]">
            <GraduationCap className="w-4 h-4" aria-hidden="true" />
            <span>ACADEMIC PORTFOLIO SNAPSHOT</span>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mt-1">
            สรุปสถิติท้ายรายวิชา คะแนน OSCE รวม และชั่วโมงปฏิบัติงานคลินิก
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            ภาพรวมผลสัมฤทธิ์ทางการเรียนและชั่วโมงปฏิบัติงานของ{' '}
            <span className="font-medium text-slate-700">{currentStudentName}</span>{' '}
            {role !== 'student' && '(แสดงข้อมูลตัวแทนนักศึกษาชั้นปีที่ 6 สำหรับตรวจติดตาม)'}{' '}
            เพื่อช่วยวางแผนเตรียมตัวสอบรายวิชาถัดไป
          </p>
        </div>

        <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setChartMode('hours')}
            className={`px-3 py-2 min-h-[40px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              chartMode === 'hours'
                ? 'bg-white text-[#0F2A4A] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ชั่วโมงปฏิบัติงาน
          </button>
          <button
            type="button"
            onClick={() => setChartMode('courses')}
            className={`px-3 py-2 min-h-[40px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              chartMode === 'courses'
                ? 'bg-white text-[#0F2A4A] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            สถิติท้ายรายวิชา
          </button>
          <button
            type="button"
            onClick={() => setChartMode('osce')}
            className={`px-3 py-2 min-h-[40px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              chartMode === 'osce'
                ? 'bg-white text-[#0F2A4A] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            คะแนน OSCE รวม
          </button>
        </div>
      </div>

      {/* 3 Core Summary Metric Strips (End-of-Rotation, Cumulative OSCE, Clinical Hours) */}
      <div className="grid grid-cols-1 md:grid-cols-3 border border-slate-200 rounded-xl divide-y md:divide-y-0 md:divide-x divide-slate-200 bg-slate-50/60">
        {/* 1. End-of-Rotation Course Summary */}
        <div className="p-5 space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
              <BookOpen className="w-3.5 h-3.5 text-[#0F2A4A]" aria-hidden="true" />
              สถิติท้ายรายวิชา (End-of-Rotation)
            </span>
            <span className="font-mono tabular-nums">
              {courseAnalytics.passedCourseCount}/{courseAnalytics.totalCourseCount} วิชา
            </span>
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-2xl sm:text-3xl font-bold text-[#0F2A4A] tabular-nums">
              GPAX {courseAnalytics.gpax.toFixed(2)}
            </span>
            <span className="text-xs font-semibold text-emerald-700 tabular-nums">
              เฉลี่ย {courseAnalytics.avgWeightedPercent.toFixed(1)}%
            </span>
          </div>
          <div className="text-xs text-slate-600 tabular-nums">
            ผ่านเกณฑ์แล้ว {courseAnalytics.completedCredits} หน่วยกิต · กำลังศึกษา{' '}
            {courseAnalytics.inProgressCredits} หน่วยกิต
          </div>
        </div>

        {/* 2. Cumulative OSCE Score */}
        <div className="p-5 space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
              <Award className="w-3.5 h-3.5 text-[#0F766E]" aria-hidden="true" />
              คะแนน OSCE รวม (Cumulative)
            </span>
            <span className="font-mono tabular-nums">
              ผ่าน {osceAnalytics.passedStations}/{osceAnalytics.stationCount} สถานี
            </span>
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-2xl sm:text-3xl font-bold text-[#0F766E] tabular-nums">
              {osceAnalytics.totalStationScore}/{osceAnalytics.maxStationScore}
            </span>
            <span className="text-xs font-semibold text-slate-700 tabular-nums">
              ({osceAnalytics.stationPercent.toFixed(1)}%)
            </span>
          </div>
          <div className="text-xs text-slate-600 tabular-nums">
            ค่าเฉลี่ย OSCE รายวิชา {osceAnalytics.courseOsceAvg.toFixed(1)}% (เกณฑ์ขั้นต่ำ MPL ≥ 60%)
          </div>
        </div>

        {/* 3. Clinical Practice Hours */}
        <div className="p-5 space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
              <Clock className="w-3.5 h-3.5 text-amber-700" aria-hidden="true" />
              ชั่วโมงเข้าปฏิบัติงานสะสม
            </span>
            <span className="font-mono tabular-nums">
              {hoursAnalytics.completedShiftCount} เวรที่ลงเวลาแล้ว
            </span>
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">
              {hoursAnalytics.totalLoggedHours} ชม.
            </span>
            <span className="text-xs font-medium text-amber-800 tabular-nums">
              + รอขึ้นเวร {hoursAnalytics.scheduledShiftHours} ชม.
            </span>
          </div>
          <div className="text-xs text-slate-600 tabular-nums">
            ขึ้นเวร {hoursAnalytics.completedShiftHours} ชม. · วิชาการ/ข้างเตียง{' '}
            {hoursAnalytics.academicAndBedsideHours} ชม.
          </div>
        </div>
      </div>

      {/* Pie Chart Visualization + Exam Readiness Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 cols: Donut Pie Chart & Legend Breakdown */}
        <div className="lg:col-span-7 border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                {activeChartMeta.title}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeChartMeta.subtitle}
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500 tabular-nums">
              รวม {totalSliceSum}{' '}
              {activeChartMeta.slices[0]?.unit ?? ''}
            </span>
          </div>

          {activeChartMeta.slices.length === 0 ? (
            <div className="h-60 flex items-center justify-center text-sm text-slate-500">
              ยังไม่มีข้อมูลเพียงพอสำหรับแสดงผลกราฟในหมวดนี้
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
              <div className="sm:col-span-6 h-60 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={activeChartMeta.slices}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={56}
                      outerRadius={86}
                      paddingAngle={2}
                      stroke="#FFFFFF"
                      strokeWidth={2}
                    >
                      {activeChartMeta.slices.map((slice) => (
                        <Cell key={slice.key} fill={slice.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: unknown, name: unknown, item: { payload?: PieSliceItem }) => [
                        `${String(val)} ${item?.payload?.unit ?? ''}`,
                        String(name),
                      ]}
                      contentStyle={{
                        borderRadius: '8px',
                        borderColor: '#CBD5E1',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-2">
                  <span className="text-2xl font-bold text-slate-900 tabular-nums leading-tight">
                    {activeChartMeta.centerValue}
                  </span>
                  <span className="text-[11px] text-slate-500 tabular-nums">
                    {activeChartMeta.centerLabel}
                  </span>
                </div>
              </div>

              <div className="sm:col-span-6 divide-y divide-slate-200 text-xs">
                {activeChartMeta.slices.map((slice) => {
                  const pct =
                    totalSliceSum > 0
                      ? Math.round((slice.value / totalSliceSum) * 1000) / 10
                      : 0;
                  return (
                    <div
                      key={slice.key}
                      className="py-2.5 first:pt-0 last:pb-0 space-y-0.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-2 font-medium text-slate-900 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-xs shrink-0"
                            style={{ backgroundColor: slice.color }}
                            aria-hidden="true"
                          />
                          <span className="truncate">{slice.label}</span>
                        </span>
                        <span className="font-mono font-semibold text-slate-900 tabular-nums shrink-0">
                          {slice.value} {slice.unit} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 pl-4.5 tabular-nums">
                        {slice.sublabel}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right 5 cols: Next Rotation & Exam Preparation Summary */}
        <div className="lg:col-span-5 border border-slate-200 rounded-xl p-5 space-y-4 bg-slate-50/60">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-[#0F2A4A]" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-slate-900">
                สรุปจุดเน้นเตรียมตัวสอบรายวิชาถัดไป
              </h3>
            </div>
          </div>

          {/* Upcoming Exam Callout */}
          {osceAnalytics.upcomingExam && (
            <div className="p-3.5 bg-white border border-slate-200 rounded-lg space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0F766E]">
                <CalendarClock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>การสอบที่กำลังจะมาถึง</span>
              </div>
              <div className="text-sm font-semibold text-slate-900">
                {osceAnalytics.upcomingExam.title}
              </div>
              <div className="text-xs text-slate-600 tabular-nums">
                {osceAnalytics.upcomingExam.date} · {osceAnalytics.upcomingExam.time} น. ·{' '}
                {osceAnalytics.upcomingExam.stations} สถานี
              </div>
            </div>
          )}

          {/* Actionable Key Takeaways */}
          <div className="space-y-2.5 text-xs text-slate-700 leading-relaxed">
            <div className="flex items-start gap-2">
              <CheckCircle2
                className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div>
                <span className="font-semibold text-slate-900">
                  รายวิชาที่คะแนนต่ำสุดในช่วงที่ผ่านมา:{' '}
                </span>
                {courseAnalytics.lowestScoredCourse ? (
                  <span className="tabular-nums">
                    {courseAnalytics.lowestScoredCourse.courseCode}{' '}
                    {courseAnalytics.lowestScoredCourse.courseName} (รวม{' '}
                    {courseAnalytics.lowestScoredCourse.weightedTotal?.toFixed(1)}% · ข้อเขียน{' '}
                    {courseAnalytics.lowestScoredCourse.writtenExam ?? '-'}%) —
                    ควรทบทวนข้อสอบ MEQ/MCQ เพิ่มเติม
                  </span>
                ) : (
                  <span>ผ่านเกณฑ์ MPL ทุกรายวิชา</span>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle2
                className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div>
                <span className="font-semibold text-slate-900">
                  สมรรถนะ OSCE ที่ควรเสริม:{' '}
                </span>
                {osceAnalytics.lowestDomain ? (
                  <span className="tabular-nums">
                    {osceAnalytics.lowestDomain.label} ({osceAnalytics.lowestDomain.pct.toFixed(0)}
                    %) — แนะนำฝึกซ้อมจับเวลาสถานีตรวจร่างกายและสรุปเหตุผลทางคลินิก
                  </span>
                ) : (
                  <span>สมดุลทุกสมรรถนะ</span>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle2
                className="w-4 h-4 text-[#0F2A4A] shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div className="tabular-nums">
                <span className="font-semibold text-slate-900">
                  ความพร้อมชั่วโมงปฏิบัติงาน:{' '}
                </span>
                ลงเวลาขึ้นเวรแล้ว {hoursAnalytics.completedShiftHours} ชม. และมีตารางเวรล่วงหน้าอีก{' '}
                {hoursAnalytics.scheduledShiftHours} ชม. ({hoursAnalytics.scheduledShiftCount}{' '}
                เวร) อย่าลืมจัดตารางอ่านหนังสือล่วงหน้าก่อนขึ้นเวร
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onNavigateTab('assessment')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] text-xs font-medium text-white bg-[#0F2A4A] hover:bg-[#163B66] rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>ดูผลสอบและเกรดรายวิชา</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('curriculum')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] text-xs font-medium text-[#0F2A4A] bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>เช็กตารางเวรและชั่วโมงฝึก</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
