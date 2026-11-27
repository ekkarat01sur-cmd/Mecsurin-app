import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  Database,
  GraduationCap,
  Stethoscope,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AcademicYearLevel,
  ClinicalPersonnelCategory,
  ClinicalPersonnelRecord,
  CohortStudentRecord,
  StudentPhotoMap,
  UserRole,
} from '../types/medicalSchool';
import { DirectoryCategoryTab } from './ClinicalPersonnelDirectoryPanel';
import { StudentAvatar } from './StudentAvatar';

interface WorkforceCohortDashboardProps {
  role: UserRole;
  cohortStudents: CohortStudentRecord[];
  clinicalPersonnel: ClinicalPersonnelRecord[];
  studentPhotos: StudentPhotoMap;
  onOpenPersonnelDirectory: (
    category: DirectoryCategoryTab,
    yearFilter?: string
  ) => void;
  onOpenAdminBackOffice?: () => void;
}

const SHORT_DEPT_LABEL: Record<string, string> = {
  'กลุ่มงานอายุรศาสตร์': 'อายุรฯ',
  'กลุ่มงานศัลยศาสตร์': 'ศัลยฯ',
  'กลุ่มงานกุมารเวชศาสตร์': 'กุมารฯ',
  'กลุ่มงานสูติศาสตร์-นรีเวชวิทยา': 'สูติ-นรีเวช',
  'กลุ่มงานเวชศาสตร์ฉุกเฉิน': 'ฉุกเฉิน (ER)',
  'กลุ่มงานออร์โธปิดิกส์': 'ออร์โธฯ',
  'กลุ่มงานเวชศาสตร์ครอบครัวและชุมชน': 'เวชฯ ชุมชน',
  'กลุ่มงานจิตเวชศาสตร์': 'จิตเวช',
};

const YEAR_META: Array<{
  year: AcademicYearLevel;
  title: string;
  subtitle: string;
  accentBg: string;
  accentText: string;
  barColor: string;
}> = [
  {
    year: '4',
    title: 'ชั้นปีที่ 4',
    subtitle: 'Junior Clinical Clerkship',
    accentBg: 'bg-indigo-50',
    accentText: 'text-[#08347A]',
    barColor: 'bg-[#08347A]',
  },
  {
    year: '5',
    title: 'ชั้นปีที่ 5',
    subtitle: 'Senior Clinical Clerkship',
    accentBg: 'bg-sky-50',
    accentText: 'text-[#0284C7]',
    barColor: 'bg-[#0284C7]',
  },
  {
    year: '6',
    title: 'ชั้นปีที่ 6 (Extern)',
    subtitle: 'Clinical Externship',
    accentBg: 'bg-amber-50',
    accentText: 'text-amber-800',
    barColor: 'bg-gradient-to-r from-[#0EA5E9] to-[#38BDF8]',
  },
];

const CATEGORY_CONFIG: Array<{
  id: ClinicalPersonnelCategory;
  title: string;
  subtitle: string;
  icon: typeof Stethoscope;
  yearOrder: string[];
}> = [
  {
    id: 'intern',
    title: 'แพทย์ Intern',
    subtitle: 'แพทย์เพิ่มพูนทักษะ / แพทย์ใช้ทุน',
    icon: Stethoscope,
    yearOrder: ['ปี 1', 'ปี 2'],
  },
  {
    id: 'preceptor',
    title: 'แพทย์พี่เลี้ยง',
    subtitle: 'อาจารย์แพทย์พี่เลี้ยงประจำวอร์ด',
    icon: UserCheck,
    yearOrder: ['ดูแลปี 4', 'ดูแลปี 5', 'ดูแลปี 6 (Extern)', 'ประจำกลุ่มงาน'],
  },
  {
    id: 'resident',
    title: 'แพทย์ประจำบ้าน',
    subtitle: 'Resident ฝึกอบรมแพทย์เฉพาะทาง',
    icon: Building2,
    yearOrder: ['ปี 1', 'ปี 2', 'ปี 3'],
  },
];

export function WorkforceCohortDashboard({
  role,
  cohortStudents,
  clinicalPersonnel,
  studentPhotos,
  onOpenPersonnelDirectory,
  onOpenAdminBackOffice,
}: WorkforceCohortDashboardProps) {
  const [previewTab, setPreviewTab] = useState<ClinicalPersonnelCategory | 'student'>('intern');
  const [previewYear, setPreviewYear] = useState<string>('ทั้งหมด');

  const totalStudents = cohortStudents.length;
  const studentsWithPhoto = cohortStudents.filter((s) =>
    Boolean(studentPhotos[s.studentId])
  ).length;

  const studentByYear = useMemo(() => {
    return YEAR_META.map((meta) => {
      const list = cohortStudents.filter((s) => s.yearLevel === meta.year);
      const count = list.length;
      const pct = totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0;
      const groupA = list.filter((s) => s.group.includes('A')).length;
      const groupB = list.filter((s) => s.group.includes('B')).length;
      const groupC = list.filter((s) => s.group.includes('C')).length;
      return {
        ...meta,
        count,
        pct,
        groupA,
        groupB,
        groupC,
      };
    });
  }, [cohortStudents, totalStudents]);

  const groupTotals = useMemo(() => {
    return {
      A: cohortStudents.filter((s) => s.group.includes('A')).length,
      B: cohortStudents.filter((s) => s.group.includes('B')).length,
      C: cohortStudents.filter((s) => s.group.includes('C')).length,
    };
  }, [cohortStudents]);

  const personnelByCategory = useMemo(() => {
    return CATEGORY_CONFIG.map((cfg) => {
      const members = clinicalPersonnel.filter((p) => p.category === cfg.id);
      const yearMap = new Map<string, number>();
      for (const y of cfg.yearOrder) yearMap.set(y, 0);
      for (const m of members) {
        yearMap.set(m.yearLevel, (yearMap.get(m.yearLevel) ?? 0) + 1);
      }
      const yearBreakdown = Array.from(yearMap.entries())
        .filter(([, count]) => count > 0)
        .map(([year, count]) => ({ year, count }));
      const activeNormal = members.filter((m) => m.status === 'ปฏิบัติงานปกติ').length;
      return {
        ...cfg,
        total: members.length,
        activeNormal,
        yearBreakdown,
      };
    });
  }, [clinicalPersonnel]);

  const totalPersonnelCount = clinicalPersonnel.length;

  const deptChartData = useMemo(() => {
    const deptSet = new Set<string>();
    for (const p of clinicalPersonnel) {
      deptSet.add(p.department);
    }
    return Array.from(deptSet).map((dept) => {
      const members = clinicalPersonnel.filter((p) => p.department === dept);
      return {
        department: SHORT_DEPT_LABEL[dept] ?? dept.replace('กลุ่มงาน', ''),
        fullDept: dept,
        Intern: members.filter((m) => m.category === 'intern').length,
        'แพทย์พี่เลี้ยง': members.filter((m) => m.category === 'preceptor').length,
        'แพทย์ประจำบ้าน': members.filter((m) => m.category === 'resident').length,
      };
    });
  }, [clinicalPersonnel]);

  const previewYearOptions = useMemo(() => {
    if (previewTab === 'student') {
      return ['ทั้งหมด', 'ชั้นปีที่ 4', 'ชั้นปีที่ 5', 'ชั้นปีที่ 6 (Extern)'];
    }
    const cfg = CATEGORY_CONFIG.find((c) => c.id === previewTab);
    return ['ทั้งหมด', ...(cfg?.yearOrder ?? [])];
  }, [previewTab]);

  const previewRows = useMemo(() => {
    if (previewTab === 'student') {
      return cohortStudents
        .filter((s) => {
          if (previewYear === 'ทั้งหมด') return true;
          const label = s.yearLevel === '6' ? 'ชั้นปีที่ 6 (Extern)' : `ชั้นปีที่ ${s.yearLevel}`;
          return label === previewYear;
        })
        .slice(0, 6);
    }
    return clinicalPersonnel
      .filter((p) => {
        if (p.category !== previewTab) return false;
        if (previewYear === 'ทั้งหมด') return true;
        return p.yearLevel === previewYear;
      })
      .slice(0, 6);
  }, [previewTab, previewYear, cohortStudents, clinicalPersonnel]);

  const handlePreviewTabChange = (next: ClinicalPersonnelCategory | 'student') => {
    setPreviewTab(next);
    setPreviewYear('ทั้งหมด');
  };

  return (
    <section className="clinical-surface rounded-2xl p-6 sm:p-7 space-y-8 animate-med-fade-up-delay-1">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-sky-100">
        <div>
          <div className="text-xs font-semibold text-[#0284C7]">
            แดชบอร์ดกำลังคนทางการแพทย์และนักศึกษา · ปีการศึกษา 2569
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#04183B] mt-1">
            สรุปยอดนักศึกษาแพทย์ทั้งหมด แยกตามชั้นปี และทำเนียบแพทย์ผู้ปฏิบัติงาน
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            ภาพรวมจำนวนนักศึกษาแพทย์ชั้นปีที่ 4–6 พร้อมรายชื่อและข้อมูลพื้นฐานของแพทย์ Intern แพทย์พี่เลี้ยง และแพทย์ประจำบ้านแต่ละชั้นปี
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onOpenPersonnelDirectory('intern', 'ทั้งหมด')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#08347A] hover:bg-[#0D58CF] rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 shadow-xs"
          >
            <Users className="w-3.5 h-3.5 text-[#38BDF8]" aria-hidden="true" />
            <span>เปิดทำเนียบรายชื่อแพทย์ & นศพ.</span>
          </button>

          {role === 'admin' && onOpenAdminBackOffice && (
            <button
              type="button"
              onClick={onOpenAdminBackOffice}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#0284C7] bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Database className="w-3.5 h-3.5" aria-hidden="true" />
              <span>เพิ่ม / แก้ไขรายชื่อ</span>
            </button>
          )}
        </div>
      </div>

      {/* Part 1: Total Medical Students + Year 4 / 5 / 6 Breakdown */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-[#04183B] flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-[#08347A]" aria-hidden="true" />
            <span>สรุปยอดนักศึกษาแพทย์ชั้นคลินิกทั้งหมด และแยกตามชั้นปี</span>
          </h3>
          <button
            type="button"
            onClick={() => onOpenPersonnelDirectory('student', 'ทั้งหมด')}
            className="text-xs font-medium text-[#0284C7] hover:underline cursor-pointer whitespace-nowrap shrink-0"
          >
            ดูรายชื่อนักศึกษาทั้งหมด ({totalStudents} คน) →
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Total Students Card */}
          <div className="lg:col-span-4 rounded-xl med-hero-surface text-white p-5 flex flex-col justify-between gap-4 relative overflow-hidden shadow-[0_14px_30px_-14px_rgba(8,52,122,0.55)]">
            <div className="absolute inset-0 med-hex-grid opacity-55 pointer-events-none" aria-hidden="true" />
            <div
              className="absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-transparent via-[#38BDF8]/15 to-transparent pointer-events-none animate-med-scan"
              aria-hidden="true"
            />

            <div className="space-y-2 relative z-10">
              <div className="text-xs font-medium text-[#7DD3FC]">
                นักศึกษาแพทย์ชั้นคลินิกทั้งหมด (ปี 4–6)
              </div>
              <div className="text-3xl sm:text-4xl font-bold tabular-nums">
                {totalStudents} <span className="text-base font-normal text-sky-200">คน</span>
              </div>
              <div className="text-xs text-sky-100/90 tabular-nums">
                กลุ่ม A: {groupTotals.A} คน · กลุ่ม B: {groupTotals.B} คน · กลุ่ม C: {groupTotals.C} คน
              </div>
            </div>

            {/* Combined proportional strip */}
            <div className="space-y-2 pt-3 border-t border-white/15 relative z-10">
              <div className="h-2.5 w-full rounded-md bg-white/10 overflow-hidden flex">
                {studentByYear.map((yr) => (
                  <div
                    key={yr.year}
                    style={{ width: `${yr.pct}%` }}
                    className={
                      yr.year === '4'
                        ? 'bg-[#38BDF8] transition-all duration-500'
                        : yr.year === '5'
                          ? 'bg-[#22D3EE] transition-all duration-500'
                          : 'bg-[#FBBF24] transition-all duration-500'
                    }
                    title={`${yr.title}: ${yr.count} คน (${yr.pct}%)`}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between text-[11px] text-sky-100/90 tabular-nums">
                <span>มีรูปถ่ายประจำตัวในระบบ {studentsWithPhoto}/{totalStudents} คน</span>
                <button
                  type="button"
                  onClick={() => onOpenPersonnelDirectory('student', 'ทั้งหมด')}
                  className="text-[#7DD3FC] hover:text-white hover:underline font-medium cursor-pointer"
                >
                  ดูทั้งหมด →
                </button>
              </div>
            </div>
          </div>

          {/* Per-Year Student Cards (Year 4, Year 5, Year 6) */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {studentByYear.map((yr) => (
              <div
                key={yr.year}
                className="rounded-xl border border-sky-200/80 bg-white p-5 flex flex-col justify-between gap-4 clinical-surface-interactive"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${yr.accentBg} ${yr.accentText}`}>
                      {yr.title}
                    </span>
                    <span className="font-mono text-xs font-semibold text-slate-500 tabular-nums">
                      {yr.pct}%
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-[#04183B] tabular-nums">
                    {yr.count} <span className="text-sm font-normal text-slate-500">คน</span>
                  </div>
                  <div className="text-xs text-slate-500">{yr.subtitle}</div>
                </div>

                <div className="space-y-2.5 pt-3 border-t border-sky-100">
                  <div className="h-1.5 w-full rounded bg-sky-50 overflow-hidden">
                    <div className={`h-full ${yr.barColor} transition-all duration-500`} style={{ width: `${yr.pct}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600 tabular-nums">
                    <span>A: {yr.groupA} · B: {yr.groupB} · C: {yr.groupC}</span>
                    <button
                      type="button"
                      onClick={() =>
                        onOpenPersonnelDirectory(
                          'student',
                          yr.year === '6' ? 'ชั้นปีที่ 6 (Extern)' : `ชั้นปีที่ ${yr.year}`
                        )
                      }
                      className="inline-flex items-center gap-1 font-medium text-[#08347A] hover:text-[#0284C7] cursor-pointer whitespace-nowrap"
                    >
                      <span>รายชื่อ</span>
                      <ArrowRight className="w-3 h-3" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Part 2: Intern, Preceptor, Resident Summary + Department Chart */}
      <div className="pt-6 border-t border-sky-100 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-[#04183B] flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-[#0284C7]" aria-hidden="true" />
            <span>
              สรุปยอดแพทย์ Intern · แพทย์พี่เลี้ยง · แพทย์ประจำบ้าน ({totalPersonnelCount} ท่าน)
            </span>
          </h3>
          <span className="text-xs text-slate-500">
            คลิกที่ชั้นปีเพื่อเปิดดูรายชื่อและข้อมูลพื้นฐาน
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* 3 Category Summary Cards */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {personnelByCategory.map((cat) => {
              const Icon = cat.icon;
              return (
                <div
                  key={cat.id}
                  className="rounded-xl border border-sky-200/80 bg-gradient-to-b from-sky-50/70 to-white p-4 sm:p-5 flex flex-col justify-between gap-4 clinical-surface-interactive"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#08347A]">
                        {cat.title}
                      </span>
                      <Icon className="w-4 h-4 text-[#0284C7] shrink-0" aria-hidden="true" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-[#04183B] tabular-nums">
                      {cat.total}{' '}
                      <span className="text-xs font-normal text-slate-500">ท่าน</span>
                    </div>
                    <div className="text-[11px] text-slate-500 leading-snug">
                      {cat.subtitle}
                    </div>
                  </div>

                  {/* Per-year clickable breakdown */}
                  <div className="space-y-1.5 pt-3 border-t border-sky-100">
                    {cat.yearBreakdown.map((yb) => (
                      <button
                        key={yb.year}
                        type="button"
                        onClick={() => onOpenPersonnelDirectory(cat.id, yb.year)}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md bg-white border border-sky-100 hover:border-[#0EA5E9] hover:bg-sky-50/60 text-xs transition-colors cursor-pointer tabular-nums"
                      >
                        <span className="text-slate-700 font-medium">{yb.year}</span>
                        <span className="font-semibold text-[#0284C7]">
                          {yb.count} ท่าน →
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Department Workforce Distribution Chart */}
          <div className="lg:col-span-5 rounded-xl border border-sky-200/80 bg-white p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <h4 className="text-xs font-semibold text-[#04183B]">
                  สัดส่วนแพทย์ผู้ปฏิบัติงานแยกตามกลุ่มงานคลินิก
                </h4>
                <p className="text-[11px] text-slate-500">
                  แพทย์ Intern · แพทย์พี่เลี้ยง · แพทย์ประจำบ้าน (ท่าน)
                </p>
              </div>
            </div>

            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={deptChartData}
                  margin={{ top: 6, right: 8, left: -22, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E0F2FE" vertical={false} />
                  <XAxis
                    dataKey="department"
                    tick={{ fontSize: 10, fill: '#475569' }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={44}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: '12px',
                      borderRadius: '8px',
                      border: '1px solid #BAE6FD',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="Intern" stackId="a" fill="#38BDF8" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="แพทย์พี่เลี้ยง" stackId="a" fill="#08347A" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="แพทย์ประจำบ้าน" stackId="a" fill="#0284C7" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Part 3: Live Quick-Browse Roster & Basic Info Preview on Home Page */}
      <div className="pt-6 border-t border-sky-100 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-sky-50/80 rounded-lg border border-sky-100">
            {(
              [
                { id: 'intern', label: 'รายชื่อแพทย์ Intern' },
                { id: 'preceptor', label: 'รายชื่อแพทย์พี่เลี้ยง' },
                { id: 'resident', label: 'รายชื่อแพทย์ประจำบ้าน' },
                { id: 'student', label: 'รายชื่อนักศึกษาแพทย์' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handlePreviewTabChange(t.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  previewTab === t.id
                    ? 'bg-white text-[#08347A] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {previewYearOptions.map((yr) => (
              <button
                key={yr}
                type="button"
                onClick={() => setPreviewYear(yr)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  previewYear === yr
                    ? 'bg-[#08347A] text-white border-[#08347A]'
                    : 'bg-white text-slate-600 border-sky-200 hover:border-sky-300'
                }`}
              >
                {yr === 'ทั้งหมด' ? 'ทุกปี' : yr}
              </button>
            ))}
          </div>
        </div>

        {/* Preview Table */}
        <div className="border border-sky-200/80 rounded-xl overflow-hidden bg-white">
          <div className="overflow-x-auto">
            {previewTab === 'student' ? (
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-sky-50/80 border-b border-sky-100 text-xs font-medium text-[#08347A]">
                    <th className="py-2.5 px-4">รหัสนักศึกษา</th>
                    <th className="py-2.5 px-4">ชื่อ-สกุล</th>
                    <th className="py-2.5 px-4">ชั้นปี / กลุ่ม</th>
                    <th className="py-2.5 px-4">อาจารย์ที่ปรึกษา</th>
                    <th className="py-2.5 px-4">ข้อมูลพื้นฐาน / ติดต่อ</th>
                    <th className="py-2.5 px-4">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-100">
                  {(previewRows as CohortStudentRecord[]).map((s) => (
                    <tr key={s.studentId} className="hover:bg-sky-50/50 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-xs text-slate-600 tabular-nums">
                        {s.studentId}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <StudentAvatar
                            studentId={s.studentId}
                            studentName={s.studentName}
                            studentPhotos={studentPhotos}
                            size="xs"
                          />
                          <span>{s.studentName}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-slate-700 tabular-nums whitespace-nowrap">
                        {s.yearLevel === '6' ? 'ปี 6 (Extern)' : `ปี ${s.yearLevel}`} · {s.group}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-slate-600">
                        {s.advisorName ?? 'นพ.เอกรัตน์ วัฒนสุรินทร์'}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-slate-600 tabular-nums">
                        {s.contactInfo ?? 'หอพักนักศึกษาแพทย์ ศพค.'}
                      </td>
                      <td className="py-2.5 px-4 text-xs font-medium text-[#0284C7] whitespace-nowrap">
                        {s.status ?? 'ฝึกปฏิบัติคลินิก'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-sky-50/80 border-b border-sky-100 text-xs font-medium text-[#08347A]">
                    <th className="py-2.5 px-4">รหัส / เลข ว.</th>
                    <th className="py-2.5 px-4">ชื่อ-สกุล</th>
                    <th className="py-2.5 px-4">ชั้นปี / ระดับ</th>
                    <th className="py-2.5 px-4">กลุ่มงาน / วอร์ด</th>
                    <th className="py-2.5 px-4">สถาบัน / วุฒิบัตร</th>
                    <th className="py-2.5 px-4">เบอร์ติดต่อ / สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-100">
                  {(previewRows as ClinicalPersonnelRecord[]).map((p) => (
                    <tr key={p.id} className="hover:bg-sky-50/50 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                        <div>{p.personnelCode}</div>
                        <div className="text-[#0284C7]">{p.medicalLicenseNo}</div>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-slate-900">{p.fullName}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">
                          {p.supervisingNote}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-xs font-medium text-[#08347A] whitespace-nowrap">
                        {p.yearLevel}
                      </td>
                      <td className="py-2.5 px-4 text-xs">
                        <div className="text-slate-800 font-medium">{p.department}</div>
                        <div className="text-slate-500">{p.currentWard}</div>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-slate-600 max-w-[240px]">
                        {p.institutionOrBoard}
                      </td>
                      <td className="py-2.5 px-4 text-xs tabular-nums">
                        <div className="text-slate-700">{p.phoneOrPager}</div>
                        <div
                          className={`font-medium ${
                            p.status === 'ปฏิบัติงานปกติ'
                              ? 'text-[#0284C7]'
                              : p.status === 'ลาศึกษาต่อ/ประชุม'
                                ? 'text-amber-700'
                                : 'text-[#08347A]'
                          }`}
                        >
                          {p.status}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="px-4 py-3 bg-sky-50/60 border-t border-sky-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <span className="tabular-nums">
              แสดงตัวอย่างรายชื่อ ({previewRows.length} รายการ) · ค้นหาและส่งออก CSV ได้ในหน้าต่างทำเนียบเต็ม
            </span>
            <button
              type="button"
              onClick={() => onOpenPersonnelDirectory(previewTab, previewYear)}
              className="inline-flex items-center gap-1 font-semibold text-[#08347A] hover:text-[#0284C7] cursor-pointer"
            >
              <span>ดูรายชื่อทั้งหมดและข้อมูลพื้นฐานครบถ้วน</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
