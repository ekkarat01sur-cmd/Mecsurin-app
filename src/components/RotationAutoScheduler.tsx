import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Download,
  Lock,
  RefreshCw,
  Send,
  Sparkles,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  AcademicYearLevel,
  ClinicalDepartment,
  DutyShift,
  RotationScheduleBlock,
  UserRole,
} from '../types/medicalSchool';
import { COHORT_STUDENTS } from '../data/initialMedicalData';
import { ADMIN_OFFICER_ROLES, hasRoleAccess } from './RoleAccessGuard';

interface RotationAutoSchedulerProps {
  role: UserRole;
  departments: ClinicalDepartment[];
  rotationBlocks: RotationScheduleBlock[];
  onSaveRotationBlocks: (blocks: RotationScheduleBlock[]) => void;
  shifts: DutyShift[];
  onPublishBlocksToShifts: (newShifts: DutyShift[], year: AcademicYearLevel) => void;
  onNotify?: (msg: string) => void;
}

const THAI_PUBLIC_HOLIDAYS: Record<string, string> = {
  '12-05': 'วันชาติ / วันพ่อแห่งชาติ',
  '12-10': 'วันรัฐธรรมนูญ',
  '12-31': 'วันสิ้นปี',
  '01-01': 'วันขึ้นปีใหม่',
  '04-06': 'วันจักรี',
  '04-13': 'วันสงกรานต์',
  '04-14': 'วันสงกรานต์',
  '04-15': 'วันสงกรานต์',
  '05-01': 'วันแรงงานแห่งชาติ',
  '05-04': 'วันฉัตรมงคล',
  '06-03': 'วันเฉลิมพระชนมพรรษาฯ',
  '07-28': 'วันเฉลิมพระชนมพรรษาฯ',
  '08-12': 'วันแม่แห่งชาติ',
  '10-13': 'วันนวมินทรมหาราช',
  '10-23': 'วันปิยมหาราช',
};

function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
    dt.getDate()
  ).padStart(2, '0')}`;
}

function formatThaiShortDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const thaiMonths = [
    'ม.ค.',
    'ก.พ.',
    'มี.ค.',
    'เม.ย.',
    'พ.ค.',
    'มิ.ย.',
    'ก.ค.',
    'ส.ค.',
    'ก.ย.',
    'ต.ค.',
    'พ.ย.',
    'ธ.ค.',
  ];
  return `${d} ${thaiMonths[(m || 1) - 1]} ${(y || 2026) + 543}`;
}

function getThaiDayLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  return days[dt.getDay()] ?? 'จันทร์';
}

function findHolidayInRange(startIso: string, endIso: string): string | null {
  let cursor = startIso;
  for (let i = 0; i < 65; i += 1) {
    const mmdd = cursor.slice(5);
    if (THAI_PUBLIC_HOLIDAYS[mmdd]) {
      return `${formatThaiShortDate(cursor)} (${THAI_PUBLIC_HOLIDAYS[mmdd]})`;
    }
    if (cursor >= endIso) break;
    cursor = addDaysIso(cursor, 1);
  }
  return null;
}

export function RotationAutoScheduler({
  role,
  departments,
  rotationBlocks,
  onSaveRotationBlocks,
  shifts,
  onPublishBlocksToShifts,
  onNotify,
}: RotationAutoSchedulerProps) {
  const canManage = hasRoleAccess(role, true, ADMIN_OFFICER_ROLES);
  const [selectedYear, setSelectedYear] = useState<AcademicYearLevel>('6');
  const [startDateIso, setStartDateIso] = useState('2026-11-30');
  const [weeksPerBlock, setWeeksPerBlock] = useState(4);

  const yearDepartments = useMemo(() => {
    const matching = departments.filter((d) => d.yearLevel === selectedYear);
    return matching.length >= 3 ? matching : departments.slice(0, 4);
  }, [departments, selectedYear]);

  const yearGroups = useMemo(() => {
    const students = COHORT_STUDENTS.filter((s) => s.yearLevel === selectedYear);
    const groupMap = new Map<string, string[]>();
    for (const s of students) {
      const list = groupMap.get(s.group) ?? [];
      list.push(s.studentName);
      groupMap.set(s.group, list);
    }
    if (groupMap.size === 0) {
      groupMap.set('กลุ่ม A', ['นศพ.ธนภัทร ศรีสุรินทร์']);
      groupMap.set('กลุ่ม B', ['นศพ.รัชชานนท์ ทองคำ']);
      groupMap.set('กลุ่ม C', ['นศพ.เอกชัย ชื่นชม']);
    }
    return Array.from(groupMap.entries()).map(([groupName, studentNames]) => ({
      groupName,
      studentNames,
    }));
  }, [selectedYear]);

  const activeBlocks = useMemo(
    () => rotationBlocks.filter((b) => b.academicYear === selectedYear),
    [rotationBlocks, selectedYear]
  );

  const conflictKeys = useMemo(() => {
    const seen = new Map<string, number>();
    for (const b of activeBlocks) {
      const key = `${b.blockIndex}::${b.departmentCode}`;
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    const conflicts = new Set<string>();
    for (const [key, count] of seen.entries()) {
      if (count > 1) conflicts.add(key);
    }
    return conflicts;
  }, [activeBlocks]);

  const blockIndices = useMemo(() => {
    const indices = Array.from(new Set(activeBlocks.map((b) => b.blockIndex))).sort(
      (a, b) => a - b
    );
    return indices;
  }, [activeBlocks]);

  const handleAutoGenerate = () => {
    if (!canManage) {
      onNotify?.('จำกัดสิทธิ์: เฉพาะแอดมินหรือนักวิชาการประจำรายวิชาจึงจะจัดตารางหมุนเวียนได้');
      return;
    }
    const depts = yearDepartments;
    if (depts.length === 0 || yearGroups.length === 0) return;

    const totalBlocks = Math.max(depts.length, yearGroups.length);
    const generated: RotationScheduleBlock[] = [];
    const safeWeeks = Math.max(1, Math.min(12, weeksPerBlock || 4));

    for (let blockIdx = 0; blockIdx < totalBlocks; blockIdx += 1) {
      const blockStart = addDaysIso(startDateIso, blockIdx * safeWeeks * 7);
      const blockEnd = addDaysIso(blockStart, safeWeeks * 7 - 1);
      const holiday = findHolidayInRange(blockStart, blockEnd);

      yearGroups.forEach((grp, groupIdx) => {
        const dept = depts[(groupIdx + blockIdx) % depts.length];
        generated.push({
          id: `rot-${selectedYear}-${grp.groupName}-${blockIdx + 1}`,
          academicYear: selectedYear,
          groupName: grp.groupName,
          departmentCode: dept.code,
          departmentName: dept.nameTh,
          blockIndex: blockIdx + 1,
          startDateIso: blockStart,
          endDateIso: blockEnd,
          weeks: safeWeeks,
          supervisingStaff: dept.headPreceptor,
          studentNames: grp.studentNames,
          hasHolidayOverlap: Boolean(holiday),
          holidayNote: holiday ?? undefined,
        });
      });
    }

    const otherYearBlocks = rotationBlocks.filter((b) => b.academicYear !== selectedYear);
    onSaveRotationBlocks([...otherYearBlocks, ...generated]);
    onNotify?.(
      `จัดตารางหมุนเวียนอัตโนมัติชั้นปีที่ ${selectedYear} (${yearGroups.length} กลุ่ม × ${totalBlocks} รอบ) เรียบร้อยแล้ว`
    );
  };

  const handleChangeCellDepartment = (blockId: string, nextDeptCode: string) => {
    if (!canManage) return;
    const dept = departments.find((d) => d.code === nextDeptCode);
    if (!dept) return;
    onSaveRotationBlocks(
      rotationBlocks.map((b) =>
        b.id === blockId
          ? {
              ...b,
              departmentCode: dept.code,
              departmentName: dept.nameTh,
              supervisingStaff: dept.headPreceptor,
            }
          : b
      )
    );
  };

  const handlePublishFirstBlockToShifts = () => {
    if (!canManage) {
      onNotify?.('จำกัดสิทธิ์: เฉพาะแอดมินหรือนักวิชาการประจำรายวิชาจึงจะเผยแพร่เวรได้');
      return;
    }
    if (activeBlocks.length === 0) {
      onNotify?.('กรุณากดจัดตารางหมุนเวียนอัตโนมัติก่อนเผยแพร่');
      return;
    }
    const existingKeys = new Set(
      shifts.map((s) => `${s.isoDate ?? s.date}::${s.assignedStudent}::${s.department}`)
    );
    const createdShifts: DutyShift[] = [];

    activeBlocks.forEach((blk) => {
      const dept = departments.find((d) => d.code === blk.departmentCode);
      const firstWard = dept?.wards.split(',')[0]?.trim() || 'หอผู้ป่วยสามัญ';
      blk.studentNames.forEach((studentName, idx) => {
        const shiftDateIso = addDaysIso(blk.startDateIso, idx % 5);
        const key = `${shiftDateIso}::${studentName}::${blk.departmentName}`;
        if (existingKeys.has(key)) return;
        existingKeys.add(key);
        createdShifts.push({
          id: `shift-rot-${blk.id}-${idx}-${Date.now()}`,
          isoDate: shiftDateIso,
          date: formatThaiShortDate(shiftDateIso),
          dayLabel: getThaiDayLabel(shiftDateIso),
          department: blk.departmentName,
          wardOrUnit: firstWard,
          shiftType: `Rotation รอบที่ ${blk.blockIndex} (เวรเช้า)`,
          timeRange: '08:00 - 16:00',
          assignedStudent: studentName,
          studentYear: blk.academicYear,
          supervisingStaff: blk.supervisingStaff,
          swapStatus: 'none',
        });
      });
    });

    if (createdShifts.length === 0) {
      onNotify?.('ตารางเวรของรอบหมุนเวียนนี้ถูกเผยแพร่ลงปฏิทินเวรครบแล้ว');
      return;
    }
    onPublishBlocksToShifts(createdShifts, selectedYear);
  };

  const handleExportExcel = () => {
    if (activeBlocks.length === 0) {
      onNotify?.('ยังไม่มีข้อมูลตารางหมุนเวียนสำหรับส่งออก');
      return;
    }
    const rows = activeBlocks.map((b) => ({
      ชั้นปี: `ปีที่ ${b.academicYear}`,
      รอบหมุนเวียน: `รอบที่ ${b.blockIndex}`,
      กลุ่มนักศึกษา: b.groupName,
      รหัสรายวิชา: b.departmentCode,
      กลุ่มงานคลินิก: b.departmentName,
      วันเริ่มต้น: formatThaiShortDate(b.startDateIso),
      วันสิ้นสุด: formatThaiShortDate(b.endDateIso),
      ระยะเวลา_สัปดาห์: b.weeks,
      อาจารย์หัวหน้ากลุ่มงาน: b.supervisingStaff,
      รายชื่อนักศึกษา: b.studentNames.join(', '),
      หมายเหตุวันหยุด: b.holidayNote ?? '-',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Rotation_Year${selectedYear}`);
    XLSX.writeFile(wb, `Surin_MEC_Rotation_Year${selectedYear}.xlsx`);
    onNotify?.(`ส่งออกไฟล์ Excel ตารางหมุนเวียนชั้นปีที่ ${selectedYear} เรียบร้อยแล้ว`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-[#0D9488]" aria-hidden="true" />
              ตัวจัดตารางหมุนเวียนรายวิชาอัตโนมัติ (Rotation Auto-Scheduler)
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              จัดสรรนักศึกษาแพทย์แต่ละกลุ่มเข้า 12 กลุ่มงานคลินิกแบบสมดุลไม่ชนกัน พร้อมตรวจสอบวันหยุดราชการและเผยแพร่ลงตารางเวรจริง
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>ส่งออก Excel</span>
            </button>
            {canManage ? (
              <>
                <button
                  type="button"
                  onClick={handleAutoGenerate}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0F2A4A] hover:bg-[#163B66] rounded-lg cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#5EEAD4]" aria-hidden="true" />
                  <span>จัดตารางอัตโนมัติ (Round-Robin)</span>
                </button>
                <button
                  type="button"
                  onClick={handlePublishFirstBlockToShifts}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-lg cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>เผยแพร่ลงตารางเวร</span>
                </button>
              </>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                ดูตารางหมุนเวียน (เฉพาะฝ่ายวิชาการ/แอดมินจึงจัดตารางได้)
              </span>
            )}
          </div>
        </div>

        {/* Parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">ชั้นปีนักศึกษา</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value as AcademicYearLevel)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
            >
              <option value="4">ชั้นปีที่ 4 (Junior Clerk)</option>
              <option value="5">ชั้นปีที่ 5 (Senior Clerk)</option>
              <option value="6">ชั้นปีที่ 6 (Extern)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">วันเริ่มรอบหมุนเวียนแรก</label>
            <input
              type="date"
              value={startDateIso}
              onChange={(e) => setStartDateIso(e.target.value)}
              disabled={!canManage}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg tabular-nums disabled:bg-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">จำนวนสัปดาห์ต่อรอบ (บล็อก)</label>
            <input
              type="number"
              min={1}
              max={12}
              value={weeksPerBlock}
              onChange={(e) => setWeeksPerBlock(Number(e.target.value))}
              disabled={!canManage}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg tabular-nums disabled:bg-slate-100"
            />
          </div>
        </div>

        {/* Conflict & Summary Bar */}
        {activeBlocks.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
            <div className="flex flex-wrap items-center gap-3 text-slate-600 tabular-nums">
              <span>จำนวนกลุ่ม: <strong className="text-slate-900">{yearGroups.length}</strong> กลุ่ม</span>
              <span aria-hidden="true">·</span>
              <span>จำนวนรอบ: <strong className="text-slate-900">{blockIndices.length}</strong> รอบ</span>
              <span aria-hidden="true">·</span>
              <span>รายวิชาหมุนเวียน: <strong className="text-slate-900">{yearDepartments.length}</strong> กลุ่มงาน</span>
            </div>

            {conflictKeys.size === 0 ? (
              <div className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                <span>ไม่พบกลุ่มงานซ้ำซ้อนกันในแต่ละรอบ (Collision-Free)</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 text-amber-700 font-medium">
                <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                <span>พบกลุ่มซ้ำในกลุ่มงานเดียวกัน {conflictKeys.size} ช่อง — กรุณาปรับเปลี่ยนรายวิชา</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rotation Matrix */}
      {activeBlocks.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
          <div className="text-sm font-semibold text-slate-900">
            ยังไม่มีตารางหมุนเวียนสำหรับนักศึกษาชั้นปีที่ {selectedYear}
          </div>
          <p className="text-xs text-slate-500 max-w-lg mx-auto">
            กดปุ่ม “จัดตารางอัตโนมัติ (Round-Robin)” ด้านบนเพื่อสร้างเมทริกซ์ตารางหมุนเวียนระหว่างกลุ่มงานคลินิกแบบไม่ชนกัน
          </p>
          {canManage && (
            <button
              type="button"
              onClick={handleAutoGenerate}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0F2A4A] hover:bg-[#163B66] rounded-lg cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>สร้างตารางหมุนเวียนชั้นปีที่ {selectedYear}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th className="py-3 px-4 font-semibold whitespace-nowrap">กลุ่ม / นักศึกษา</th>
                  {blockIndices.map((idx) => {
                    const sample = activeBlocks.find((b) => b.blockIndex === idx);
                    return (
                      <th key={idx} className="py-3 px-4 font-semibold min-w-[210px]">
                        <div className="text-slate-900 tabular-nums">รอบที่ {idx}</div>
                        {sample && (
                          <div className="text-[11px] font-normal text-slate-500 tabular-nums">
                            {formatThaiShortDate(sample.startDateIso)} – {formatThaiShortDate(sample.endDateIso)}
                          </div>
                        )}
                        {sample?.hasHolidayOverlap && (
                          <div className="text-[11px] font-medium text-amber-700 mt-0.5">
                            มีวันหยุด: {sample.holidayNote}
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {yearGroups.map((grp) => (
                  <tr key={grp.groupName} className="hover:bg-slate-50/70 align-top">
                    <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                      <div className="font-semibold text-[#0F2A4A]">{grp.groupName}</div>
                      <div className="text-[11px] text-slate-500 tabular-nums mt-0.5">
                        {grp.studentNames.length} คน
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 max-w-[180px] whitespace-normal leading-relaxed">
                        {grp.studentNames.join(', ')}
                      </div>
                    </td>

                    {blockIndices.map((idx) => {
                      const cell = activeBlocks.find(
                        (b) => b.groupName === grp.groupName && b.blockIndex === idx
                      );
                      if (!cell) {
                        return <td key={idx} className="py-3 px-4 text-slate-400">-</td>;
                      }
                      const isConflict = conflictKeys.has(`${cell.blockIndex}::${cell.departmentCode}`);
                      return (
                        <td
                          key={cell.id}
                          className={`py-3 px-4 ${isConflict ? 'bg-amber-50/70' : ''}`}
                        >
                          {canManage ? (
                            <select
                              value={cell.departmentCode}
                              onChange={(e) => handleChangeCellDepartment(cell.id, e.target.value)}
                              className={`w-full px-2.5 py-1.5 text-xs font-medium rounded-md border bg-white ${
                                isConflict
                                  ? 'border-amber-400 text-amber-900'
                                  : 'border-slate-300 text-slate-900'
                              }`}
                            >
                              {departments.map((d) => (
                                <option key={d.code} value={d.code}>
                                  {d.code} · {d.nameTh}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="font-semibold text-slate-900">
                              {cell.departmentName}
                            </div>
                          )}
                          <div className="text-[11px] text-slate-500 mt-1.5">
                            อ.{cell.supervisingStaff.replace(/^อ\./, '')}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
