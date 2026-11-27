import { useMemo, useState } from 'react';
import {
  Building2,
  Database,
  Download,
  GraduationCap,
  LayoutGrid,
  List,
  Mail,
  Phone,
  Search,
  Stethoscope,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {
  AcademicYearLevel,
  ClinicalPersonnelCategory,
  ClinicalPersonnelRecord,
  CohortStudentRecord,
  StudentPhotoMap,
  UserRole,
} from '../types/medicalSchool';
import { StudentAvatar } from './StudentAvatar';

export type DirectoryCategoryTab =
  | 'all'
  | ClinicalPersonnelCategory
  | 'student';

interface ClinicalPersonnelDirectoryPanelProps {
  role: UserRole;
  personnel: ClinicalPersonnelRecord[];
  cohortStudents: CohortStudentRecord[];
  studentPhotos: StudentPhotoMap;
  initialCategory?: DirectoryCategoryTab;
  initialYearFilter?: string;
  onOpenAdminBackOffice?: () => void;
  onOpenStudentPhotoDirectory?: () => void;
}

const CATEGORY_LABELS: Record<ClinicalPersonnelCategory, string> = {
  intern: 'แพทย์ Intern',
  preceptor: 'แพทย์พี่เลี้ยง',
  resident: 'แพทย์ประจำบ้าน',
};

const YEAR_OPTIONS_BY_CAT: Record<DirectoryCategoryTab, string[]> = {
  all: ['ทั้งหมด', 'ปี 1', 'ปี 2', 'ปี 3', 'ดูแลปี 4', 'ดูแลปี 5', 'ดูแลปี 6 (Extern)', 'ประจำกลุ่มงาน'],
  intern: ['ทั้งหมด', 'ปี 1', 'ปี 2'],
  resident: ['ทั้งหมด', 'ปี 1', 'ปี 2', 'ปี 3'],
  preceptor: ['ทั้งหมด', 'ดูแลปี 4', 'ดูแลปี 5', 'ดูแลปี 6 (Extern)', 'ประจำกลุ่มงาน'],
  student: ['ทั้งหมด', 'ชั้นปีที่ 4', 'ชั้นปีที่ 5', 'ชั้นปีที่ 6 (Extern)'],
};

function studentYearLabel(year: AcademicYearLevel): string {
  if (year === '6') return 'ชั้นปีที่ 6 (Extern)';
  return `ชั้นปีที่ ${year}`;
}

function escapeCsvCell(val: string): string {
  const safe = val.replace(/"/g, '""');
  return `"${safe}"`;
}

export function ClinicalPersonnelDirectoryPanel({
  role,
  personnel,
  cohortStudents,
  studentPhotos,
  initialCategory = 'intern',
  initialYearFilter = 'ทั้งหมด',
  onOpenAdminBackOffice,
  onOpenStudentPhotoDirectory,
}: ClinicalPersonnelDirectoryPanelProps) {
  const [categoryTab, setCategoryTab] = useState<DirectoryCategoryTab>(initialCategory);
  const [yearFilter, setYearFilter] = useState<string>(initialYearFilter);
  const [deptFilter, setDeptFilter] = useState<string>('ทั้งหมด');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const intern = personnel.filter((p) => p.category === 'intern');
    const preceptor = personnel.filter((p) => p.category === 'preceptor');
    const resident = personnel.filter((p) => p.category === 'resident');
    return {
      allPersonnel: personnel.length,
      intern: intern.length,
      preceptor: preceptor.length,
      resident: resident.length,
      student: cohortStudents.length,
    };
  }, [personnel, cohortStudents]);

  const departments = useMemo(() => {
    const set = new Set(personnel.map((p) => p.department));
    return ['ทั้งหมด', ...Array.from(set)];
  }, [personnel]);

  const yearOptions = YEAR_OPTIONS_BY_CAT[categoryTab];

  const handleCategoryChange = (next: DirectoryCategoryTab) => {
    setCategoryTab(next);
    setYearFilter('ทั้งหมด');
    setSelectedPersonId(null);
  };

  const filteredPersonnel = useMemo(() => {
    if (categoryTab === 'student') return [];
    const q = searchQuery.trim().toLowerCase();
    return personnel.filter((p) => {
      const matchCat = categoryTab === 'all' || p.category === categoryTab;
      const matchYear = yearFilter === 'ทั้งหมด' || p.yearLevel === yearFilter;
      const matchDept = deptFilter === 'ทั้งหมด' || p.department === deptFilter;
      const matchQuery =
        !q ||
        p.fullName.toLowerCase().includes(q) ||
        p.personnelCode.toLowerCase().includes(q) ||
        p.medicalLicenseNo.toLowerCase().includes(q) ||
        p.department.toLowerCase().includes(q) ||
        p.currentWard.toLowerCase().includes(q) ||
        p.institutionOrBoard.toLowerCase().includes(q) ||
        p.supervisingNote.toLowerCase().includes(q);
      return matchCat && matchYear && matchDept && matchQuery;
    });
  }, [personnel, categoryTab, yearFilter, deptFilter, searchQuery]);

  const filteredStudents = useMemo(() => {
    if (categoryTab !== 'student') return [];
    const q = searchQuery.trim().toLowerCase();
    return cohortStudents.filter((s) => {
      const yLabel = studentYearLabel(s.yearLevel);
      const matchYear = yearFilter === 'ทั้งหมด' || yLabel === yearFilter;
      const matchQuery =
        !q ||
        s.studentName.toLowerCase().includes(q) ||
        s.studentId.toLowerCase().includes(q) ||
        s.group.toLowerCase().includes(q) ||
        (s.advisorName ?? '').toLowerCase().includes(q);
      return matchYear && matchQuery;
    });
  }, [cohortStudents, categoryTab, yearFilter, searchQuery]);

  const groupedYearSummary = useMemo(() => {
    if (categoryTab === 'student') {
      return (['4', '5', '6'] as AcademicYearLevel[]).map((yr) => ({
        label: studentYearLabel(yr),
        count: cohortStudents.filter((s) => s.yearLevel === yr).length,
      }));
    }
    const targetList =
      categoryTab === 'all'
        ? personnel
        : personnel.filter((p) => p.category === categoryTab);
    const map = new Map<string, number>();
    for (const item of targetList) {
      map.set(item.yearLevel, (map.get(item.yearLevel) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([label, count]) => ({ label, count }));
  }, [categoryTab, personnel, cohortStudents]);

  const selectedPerson = useMemo(
    () => filteredPersonnel.find((p) => p.id === selectedPersonId) ?? null,
    [filteredPersonnel, selectedPersonId]
  );

  const handleExportCsv = () => {
    const bom = '\uFEFF';
    if (categoryTab === 'student') {
      const headers = ['รหัสนักศึกษา', 'ชื่อ-สกุล', 'ชั้นปี', 'กลุ่ม', 'อาจารย์ที่ปรึกษา', 'ข้อมูลติดต่อ/หอพัก', 'สถานะ'];
      const rows = filteredStudents.map((s) => [
        s.studentId,
        s.studentName,
        studentYearLabel(s.yearLevel),
        s.group,
        s.advisorName ?? '-',
        s.contactInfo ?? '-',
        s.status ?? 'ฝึกปฏิบัติคลินิก',
      ]);
      const csv = bom + [headers, ...rows].map((r) => r.map(escapeCsvCell).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'surin-mec-students-roster.csv';
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    const headers = [
      'รหัส',
      'ประเภท',
      'ชั้นปี/ระดับ',
      'ชื่อ-สกุล',
      'เลขที่ใบประกอบวิชาชีพ',
      'กลุ่มงาน',
      'วอร์ด/หน่วยปัจจุบัน',
      'สถาบันที่จบ/วุฒิบัตร',
      'เบอร์ติดต่อ/วิทยุ',
      'อีเมล',
      'สถานะ',
      'หน้าที่รับผิดชอบ',
    ];
    const rows = filteredPersonnel.map((p) => [
      p.personnelCode,
      CATEGORY_LABELS[p.category],
      p.yearLevel,
      p.fullName,
      p.medicalLicenseNo,
      p.department,
      p.currentWard,
      p.institutionOrBoard,
      p.phoneOrPager,
      p.email ?? '-',
      p.status,
      p.supervisingNote,
    ]);
    const csv = bom + [headers, ...rows].map((r) => r.map(escapeCsvCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `surin-mec-${categoryTab}-roster.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Category Switcher + Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
          {(
            [
              { id: 'intern', label: 'แพทย์ Intern', count: counts.intern, icon: Stethoscope },
              { id: 'preceptor', label: 'แพทย์พี่เลี้ยง', count: counts.preceptor, icon: UserCheck },
              { id: 'resident', label: 'แพทย์ประจำบ้าน', count: counts.resident, icon: Building2 },
              { id: 'student', label: 'นักศึกษาแพทย์ ปี 4–6', count: counts.student, icon: GraduationCap },
              { id: 'all', label: 'แพทย์ทั้งหมด', count: counts.allPersonnel, icon: Users },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = categoryTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleCategoryChange(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#091A32] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{tab.label}</span>
                <span
                  className={`font-mono text-[11px] tabular-nums ${
                    active ? 'text-[#5EEAD4]' : 'text-slate-500'
                  }`}
                >
                  ({tab.count})
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#0F2A4A] bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>ส่งออกรายชื่อ CSV</span>
          </button>

          {categoryTab === 'student' && onOpenStudentPhotoDirectory && (
            <button
              type="button"
              onClick={onOpenStudentPhotoDirectory}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#0F766E] bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Users className="w-3.5 h-3.5" aria-hidden="true" />
              <span>จัดการรูปถ่ายนักศึกษา</span>
            </button>
          )}

          {role === 'admin' && onOpenAdminBackOffice && (
            <button
              type="button"
              onClick={onOpenAdminBackOffice}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#0F766E] hover:bg-[#0D625C] rounded-lg cursor-pointer whitespace-nowrap shrink-0"
            >
              <Database className="w-3.5 h-3.5" aria-hidden="true" />
              <span>จัดการรายชื่อ (หลังบ้าน)</span>
            </button>
          )}
        </div>
      </div>

      {/* Year Summary Breakdown Bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs font-medium text-slate-600">
          สรุปยอดแยกแต่ละปีในหมวดที่เลือก:
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs tabular-nums">
          {groupedYearSummary.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() =>
                setYearFilter((prev) => (prev === item.label ? 'ทั้งหมด' : item.label))
              }
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                yearFilter === item.label
                  ? 'bg-[#091A32] text-white border-[#091A32]'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <span>{item.label}</span>
              <span className={`font-semibold ${yearFilter === item.label ? 'text-[#5EEAD4]' : 'text-[#0F766E]'}`}>
                {item.count} {categoryTab === 'student' ? 'คน' : 'ท่าน'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              categoryTab === 'student'
                ? 'ค้นหาชื่อ, รหัสนักศึกษา, กลุ่ม, หรืออาจารย์ที่ปรึกษา...'
                : 'ค้นหาชื่อแพทย์, เลข ว., รหัส, วอร์ด, กลุ่มงาน, หรือสถาบัน...'
            }
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            aria-label="กรองตามชั้นปี"
            className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
          >
            {yearOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt === 'ทั้งหมด' ? 'ทุกชั้นปี / ทุกระดับ' : opt}
              </option>
            ))}
          </select>

          {categoryTab !== 'student' && (
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              aria-label="กรองตามกลุ่มงาน"
              className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d === 'ทั้งหมด' ? 'ทุกกลุ่มงานคลินิก' : d}
                </option>
              ))}
            </select>
          )}

          <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200/70">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer ${
                viewMode === 'cards' ? 'bg-white text-[#0F2A4A] shadow-xs' : 'text-slate-600'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
              <span>การ์ด</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-[#0F2A4A] shadow-xs' : 'text-slate-600'
              }`}
            >
              <List className="w-3.5 h-3.5" aria-hidden="true" />
              <span>ตาราง</span>
            </button>
          </div>
        </div>
      </div>

      {/* Selected Person Basic Info Inspector */}
      {selectedPerson && (
        <div className="bg-[#091A32] text-white rounded-xl p-5 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-medium text-[#5EEAD4] flex flex-wrap items-center gap-x-2 gap-y-1 tabular-nums">
                <span>{CATEGORY_LABELS[selectedPerson.category]}</span>
                <span aria-hidden="true">·</span>
                <span>{selectedPerson.yearLevel}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{selectedPerson.personnelCode}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{selectedPerson.medicalLicenseNo}</span>
              </div>
              <h3 className="text-lg font-semibold text-white">{selectedPerson.fullName}</h3>
              <p className="text-xs text-slate-300">
                {selectedPerson.department} · {selectedPerson.currentWard}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedPersonId(null)}
              className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 cursor-pointer"
              aria-label="ปิดรายละเอียด"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-3 border-t border-white/15 text-xs">
            <div>
              <div className="text-slate-400">สถาบันที่จบ / วุฒิบัตร</div>
              <div className="mt-0.5 text-slate-100 font-medium">
                {selectedPerson.institutionOrBoard}
              </div>
            </div>
            <div>
              <div className="text-slate-400">เบอร์ติดต่อภายใน / วิทยุ</div>
              <div className="mt-0.5 text-slate-100 font-medium tabular-nums">
                {selectedPerson.phoneOrPager}
              </div>
              {selectedPerson.email && (
                <div className="text-slate-300 mt-0.5">{selectedPerson.email}</div>
              )}
            </div>
            <div>
              <div className="text-slate-400">บทบาทและสถานะปฏิบัติงาน</div>
              <div className="mt-0.5 text-[#5EEAD4] font-medium">{selectedPerson.status}</div>
              <div className="text-slate-200 mt-0.5">{selectedPerson.supervisingNote}</div>
            </div>
          </div>
        </div>
      )}

      {/* Results View */}
      {categoryTab === 'student' ? (
        filteredStudents.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-xl">
            ไม่พบรายชื่อนักศึกษาแพทย์ตามเงื่อนไขที่ค้นหา
          </div>
        ) : viewMode === 'table' ? (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                    <th className="py-3 px-4">รหัสนักศึกษา</th>
                    <th className="py-3 px-4">ชื่อ-สกุล</th>
                    <th className="py-3 px-4">ชั้นปี</th>
                    <th className="py-3 px-4">กลุ่ม</th>
                    <th className="py-3 px-4">อาจารย์ที่ปรึกษา</th>
                    <th className="py-3 px-4">ข้อมูลติดต่อ / หอพัก</th>
                    <th className="py-3 px-4">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredStudents.map((s) => (
                    <tr key={s.studentId} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono text-xs text-slate-600 tabular-nums">
                        {s.studentId}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <StudentAvatar
                            studentId={s.studentId}
                            studentName={s.studentName}
                            studentPhotos={studentPhotos}
                            size="xs"
                          />
                          <span>{s.studentName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700 tabular-nums">
                        {studentYearLabel(s.yearLevel)}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700">{s.group}</td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {s.advisorName ?? 'นพ.เอกรัตน์ วัฒนสุรินทร์'}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 tabular-nums">
                        {s.contactInfo ?? 'หอพักนักศึกษาแพทย์ ศพค.'}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-[#0F766E]">
                        {s.status ?? 'ฝึกปฏิบัติคลินิก'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStudents.map((s) => (
              <div
                key={s.studentId}
                className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <StudentAvatar
                    studentId={s.studentId}
                    studentName={s.studentName}
                    studentPhotos={studentPhotos}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-slate-500 font-mono tabular-nums">
                      {s.studentId} · {s.group}
                    </div>
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {s.studentName}
                    </div>
                    <div className="text-xs font-medium text-[#0F766E] mt-0.5">
                      {studentYearLabel(s.yearLevel)}
                    </div>
                  </div>
                </div>
                <div className="pt-2.5 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                  <div>ที่ปรึกษา: {s.advisorName ?? 'นพ.เอกรัตน์ วัฒนสุรินทร์'}</div>
                  <div className="tabular-nums">ติดต่อ: {s.contactInfo ?? 'หอพักนักศึกษาแพทย์ ศพค.'}</div>
                  <div className="text-emerald-700 font-medium">
                    สถานะ: {s.status ?? 'ฝึกปฏิบัติคลินิก'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : filteredPersonnel.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-xl">
          ไม่พบรายชื่อบุคลากรทางการแพทย์ตามเงื่อนไขที่ค้นหา
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">รหัส / เลข ว.</th>
                  <th className="py-3 px-4">ชื่อ-สกุล</th>
                  <th className="py-3 px-4">ประเภท / ชั้นปี</th>
                  <th className="py-3 px-4">กลุ่มงาน / วอร์ดปัจจุบัน</th>
                  <th className="py-3 px-4">สถาบัน / วุฒิบัตร</th>
                  <th className="py-3 px-4">ติดต่อ</th>
                  <th className="py-3 px-4">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredPersonnel.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedPersonId(p.id)}
                    className={`cursor-pointer transition-colors ${
                      selectedPersonId === p.id ? 'bg-[#0F2A4A]/6' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      <div>{p.personnelCode}</div>
                      <div className="text-[#0F766E]">{p.medicalLicenseNo}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{p.fullName}</div>
                      <div className="text-xs text-slate-500 line-clamp-1">
                        {p.supervisingNote}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs whitespace-nowrap">
                      <div className="font-medium text-[#0F2A4A]">
                        {CATEGORY_LABELS[p.category]}
                      </div>
                      <div className="text-slate-600">{p.yearLevel}</div>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <div className="font-medium text-slate-800">{p.department}</div>
                      <div className="text-slate-500">{p.currentWard}</div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 max-w-[220px]">
                      {p.institutionOrBoard}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      <div>{p.phoneOrPager}</div>
                      {p.email && <div className="text-slate-400">{p.email}</div>}
                    </td>
                    <td className="py-3 px-4 text-xs font-medium whitespace-nowrap">
                      <span
                        className={
                          p.status === 'ปฏิบัติงานปกติ'
                            ? 'text-emerald-700'
                            : p.status === 'หมุนเวียน รพ.ชุมชน'
                              ? 'text-[#0F766E]'
                              : p.status === 'ลาศึกษาต่อ/ประชุม'
                                ? 'text-amber-700'
                                : 'text-[#0F2A4A]'
                        }
                      >
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPersonnel.map((p) => {
            const isSelected = selectedPersonId === p.id;
            return (
              <div
                key={p.id}
                onClick={() => setSelectedPersonId(isSelected ? null : p.id)}
                className={`bg-white border rounded-xl p-4 space-y-3 cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-[#091A32] ring-1 ring-[#091A32]/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 tabular-nums">
                    <span className="font-medium text-[#0F766E]">
                      {CATEGORY_LABELS[p.category]} · {p.yearLevel}
                    </span>
                    <span className="font-mono">{p.medicalLicenseNo}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 leading-snug">
                    {p.fullName}
                  </h3>
                  <div className="text-xs text-slate-600">
                    {p.department} · {p.currentWard}
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div className="line-clamp-2 text-slate-700">{p.institutionOrBoard}</div>
                  <div className="flex items-center gap-1.5 tabular-nums">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                    <span className="truncate">{p.phoneOrPager}</span>
                  </div>
                  {p.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                      <span className="truncate">{p.email}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500 truncate">{p.supervisingNote}</span>
                  <span
                    className={`font-medium shrink-0 ${
                      p.status === 'ปฏิบัติงานปกติ'
                        ? 'text-emerald-700'
                        : p.status === 'ลาศึกษาต่อ/ประชุม'
                          ? 'text-amber-700'
                          : 'text-[#0F766E]'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
