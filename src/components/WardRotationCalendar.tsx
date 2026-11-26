import { useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Stethoscope,
  UserCheck,
} from 'lucide-react';
import { DutyShift, StudentPhotoMap, UserRole } from '../types/medicalSchool';
import { resolveShiftIsoDate } from './DutyRosterCalendar';
import { StudentAvatar } from './StudentAvatar';

interface WardRotationCalendarProps {
  role: UserRole;
  shifts: DutyShift[];
  studentPhotos: StudentPhotoMap;
  currentStudentName?: string;
  onNavigateCurriculum: () => void;
}

interface DepartmentColorTheme {
  shortName: string;
  swatchClass: string;
  cardClass: string;
  textClass: string;
  barClass: string;
}

const DEPARTMENT_THEMES: Record<string, DepartmentColorTheme> = {
  กลุ่มงานอายุรศาสตร์: {
    shortName: 'อายุรศาสตร์',
    swatchClass: 'bg-blue-600',
    cardClass: 'bg-blue-50 border-blue-200 text-blue-950',
    textClass: 'text-blue-800',
    barClass: 'bg-blue-600',
  },
  กลุ่มงานเวชศาสตร์ฉุกเฉิน: {
    shortName: 'เวชศาสตร์ฉุกเฉิน (ER)',
    swatchClass: 'bg-rose-600',
    cardClass: 'bg-rose-50 border-rose-200 text-rose-950',
    textClass: 'text-rose-800',
    barClass: 'bg-rose-600',
  },
  กลุ่มงานศัลยศาสตร์: {
    shortName: 'ศัลยศาสตร์',
    swatchClass: 'bg-amber-600',
    cardClass: 'bg-amber-50 border-amber-200 text-amber-950',
    textClass: 'text-amber-800',
    barClass: 'bg-amber-500',
  },
  กลุ่มงานกุมารเวชศาสตร์: {
    shortName: 'กุมารเวชศาสตร์',
    swatchClass: 'bg-teal-600',
    cardClass: 'bg-teal-50 border-teal-200 text-teal-950',
    textClass: 'text-teal-800',
    barClass: 'bg-teal-600',
  },
  'กลุ่มงานสูติศาสตร์-นรีเวชวิทยา': {
    shortName: 'สูติ-นรีเวช (LR)',
    swatchClass: 'bg-violet-600',
    cardClass: 'bg-violet-50 border-violet-200 text-violet-950',
    textClass: 'text-violet-800',
    barClass: 'bg-violet-600',
  },
  กลุ่มงานออร์โธปิดิกส์: {
    shortName: 'ออร์โธปิดิกส์',
    swatchClass: 'bg-indigo-600',
    cardClass: 'bg-indigo-50 border-indigo-200 text-indigo-950',
    textClass: 'text-indigo-800',
    barClass: 'bg-indigo-600',
  },
  กลุ่มงานเวชศาสตร์ครอบครัวและชุมชน: {
    shortName: 'เวชศาสตร์ครอบครัว',
    swatchClass: 'bg-emerald-600',
    cardClass: 'bg-emerald-50 border-emerald-200 text-emerald-950',
    textClass: 'text-emerald-800',
    barClass: 'bg-emerald-600',
  },
};

const FALLBACK_THEME: DepartmentColorTheme = {
  shortName: 'กลุ่มงานคลินิก',
  swatchClass: 'bg-slate-600',
  cardClass: 'bg-slate-100 border-slate-300 text-slate-900',
  textClass: 'text-slate-700',
  barClass: 'bg-slate-600',
};

function getDepartmentTheme(department: string): DepartmentColorTheme {
  if (DEPARTMENT_THEMES[department]) {
    return DEPARTMENT_THEMES[department];
  }
  return {
    ...FALLBACK_THEME,
    shortName: department.replace('กลุ่มงาน', '').trim() || 'กลุ่มงานคลินิก',
  };
}

const THAI_MONTHS_FULL = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

const WEEKDAY_HEADERS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const WEEKDAY_FULL = [
  'อาทิตย์',
  'จันทร์',
  'อังคาร',
  'พุธ',
  'พฤหัสบดี',
  'ศุกร์',
  'เสาร์',
];

const TODAY_ISO = '2026-11-25';

function formatIsoPad(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatThaiFullDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  const dt = new Date(y, m - 1, d);
  const weekday = WEEKDAY_FULL[dt.getDay()];
  return `วัน${weekday}ที่ ${d} ${THAI_MONTHS_FULL[m - 1]} ${y + 543}`;
}

function estimateShiftHours(timeRange: string): number {
  const match = timeRange.match(/(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})/);
  if (!match) return 8;
  const startMin = Number(match[1]) * 60 + Number(match[2]);
  let endMin = Number(match[3]) * 60 + Number(match[4]);
  if (endMin <= startMin) {
    endMin += 24 * 60;
  }
  return Math.max(1, Math.round(((endMin - startMin) / 60) * 10) / 10);
}

export function WardRotationCalendar({
  role,
  shifts,
  studentPhotos,
  currentStudentName = 'นศพ.ธนภัทร ศรีสุรินทร์',
  onNavigateCurriculum,
}: WardRotationCalendarProps) {
  const [viewYear, setViewYear] = useState<number>(2026);
  const [viewMonthIndex, setViewMonthIndex] = useState<number>(10); // Nov 2026
  const [selectedIsoDate, setSelectedIsoDate] = useState<string>(TODAY_ISO);
  const [scope, setScope] = useState<'mine' | 'all'>(
    role === 'student' ? 'mine' : 'all'
  );
  const [departmentFilter, setDepartmentFilter] = useState<string>('ทั้งหมด');

  const scopedShifts = useMemo(() => {
    return shifts.filter((shift) => {
      if (scope === 'mine' && shift.assignedStudent !== currentStudentName) {
        return false;
      }
      if (departmentFilter !== 'ทั้งหมด' && shift.department !== departmentFilter) {
        return false;
      }
      return true;
    });
  }, [shifts, scope, currentStudentName, departmentFilter]);

  const shiftsByDate = useMemo(() => {
    const map = new Map<string, DutyShift[]>();
    scopedShifts.forEach((shift) => {
      const iso = resolveShiftIsoDate(shift);
      const list = map.get(iso) ?? [];
      list.push(shift);
      map.set(iso, list);
    });
    return map;
  }, [scopedShifts]);

  const monthPrefix = `${viewYear}-${String(viewMonthIndex + 1).padStart(2, '0')}`;

  // Shifts in the viewed month (respecting scope, before department filter for legend counts)
  const monthAllDeptShifts = useMemo(() => {
    return shifts.filter((shift) => {
      if (scope === 'mine' && shift.assignedStudent !== currentStudentName) {
        return false;
      }
      return resolveShiftIsoDate(shift).startsWith(monthPrefix);
    });
  }, [shifts, scope, currentStudentName, monthPrefix]);

  const monthVisibleShifts = useMemo(() => {
    return scopedShifts
      .filter((s) => resolveShiftIsoDate(s).startsWith(monthPrefix))
      .sort((a, b) => resolveShiftIsoDate(a).localeCompare(resolveShiftIsoDate(b)));
  }, [scopedShifts, monthPrefix]);

  // All departments present across shifts for consistent legend ordering
  const availableDepartments = useMemo(() => {
    const set = new Set<string>();
    shifts.forEach((s) => set.add(s.department));
    return Array.from(set);
  }, [shifts]);

  const departmentBreakdown = useMemo(() => {
    const counts = new Map<string, { count: number; hours: number; wards: Set<string> }>();
    monthAllDeptShifts.forEach((shift) => {
      const entry = counts.get(shift.department) ?? {
        count: 0,
        hours: 0,
        wards: new Set<string>(),
      };
      entry.count += 1;
      entry.hours += estimateShiftHours(shift.timeRange);
      entry.wards.add(shift.wardOrUnit);
      counts.set(shift.department, entry);
    });
    return Array.from(counts.entries())
      .map(([department, info]) => ({
        department,
        theme: getDepartmentTheme(department),
        count: info.count,
        hours: info.hours,
        wardCount: info.wards.size,
      }))
      .sort((a, b) => b.count - a.count || b.hours - a.hours);
  }, [monthAllDeptShifts]);

  const totalMonthHours = useMemo(
    () => monthVisibleShifts.reduce((sum, s) => sum + estimateShiftHours(s.timeRange), 0),
    [monthVisibleShifts]
  );

  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonthIndex, 1);
    const startWeekday = firstDayOfMonth.getDay();
    const daysInMonth = new Date(viewYear, viewMonthIndex + 1, 0).getDate();
    const prevMonthLastDay = new Date(viewYear, viewMonthIndex, 0).getDate();
    const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;

    const cells: { isoDate: string; dayNumber: number; inCurrentMonth: boolean }[] = [];
    for (let i = 0; i < totalCells; i += 1) {
      if (i < startWeekday) {
        const dayNum = prevMonthLastDay - startWeekday + 1 + i;
        const dt = new Date(viewYear, viewMonthIndex - 1, dayNum);
        cells.push({
          isoDate: formatIsoPad(dt.getFullYear(), dt.getMonth(), dayNum),
          dayNumber: dayNum,
          inCurrentMonth: false,
        });
      } else if (i < startWeekday + daysInMonth) {
        const dayNum = i - startWeekday + 1;
        cells.push({
          isoDate: formatIsoPad(viewYear, viewMonthIndex, dayNum),
          dayNumber: dayNum,
          inCurrentMonth: true,
        });
      } else {
        const dayNum = i - (startWeekday + daysInMonth) + 1;
        const dt = new Date(viewYear, viewMonthIndex + 1, dayNum);
        cells.push({
          isoDate: formatIsoPad(dt.getFullYear(), dt.getMonth(), dayNum),
          dayNumber: dayNum,
          inCurrentMonth: false,
        });
      }
    }
    return cells;
  }, [viewYear, viewMonthIndex]);

  const handlePrevMonth = () => {
    if (viewMonthIndex === 0) {
      setViewYear((y) => y - 1);
      setViewMonthIndex(11);
    } else {
      setViewMonthIndex((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonthIndex === 11) {
      setViewYear((y) => y + 1);
      setViewMonthIndex(0);
    } else {
      setViewMonthIndex((m) => m + 1);
    }
  };

  const handleResetToCurrentMonth = () => {
    setViewYear(2026);
    setViewMonthIndex(10);
    setSelectedIsoDate(TODAY_ISO);
  };

  const selectedDayShifts = shiftsByDate.get(selectedIsoDate) ?? [];

  return (
    <section className="clinical-surface rounded-2xl p-6 sm:p-7 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="text-xs font-semibold text-[#0F766E] flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Ward Rotation Calendar</span>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mt-1">
            ปฏิทินการหมุนเวียนหอผู้ป่วยและตารางเวรรายเดือน
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            แสดงการกระจายตัวของเวรปฏิบัติงานแยกตามสีของกลุ่มงานและหอผู้ป่วย เพื่อวางแผนการเรียนรู้และการเตรียมตัวตลอดเดือน
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          <div className="inline-flex p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setScope('mine')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                scope === 'mine'
                  ? 'bg-white text-[#0F2A4A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              เวรของฉัน
            </button>
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                scope === 'all'
                  ? 'bg-white text-[#0F2A4A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ภาพรวมทั้งรุ่น
            </button>
          </div>

          <button
            type="button"
            onClick={onNavigateCurriculum}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#0F2A4A] bg-slate-50 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>จัดการเวร / แลกเวร</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Month Navigator & Ward Color Legend Strip */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            aria-label="เดือนก่อนหน้า"
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="min-w-[165px] text-center">
            <span className="text-base font-semibold text-slate-900 tabular-nums">
              {THAI_MONTHS_FULL[viewMonthIndex]} {viewYear + 543}
            </span>
          </div>
          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="เดือนถัดไป"
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer shrink-0"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleResetToCurrentMonth}
            className="px-3 py-2 text-xs font-medium text-[#0F2A4A] bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
          >
            พ.ย. 2569
          </button>
          <span className="text-xs text-slate-500 pl-1 tabular-nums">
            รวม {monthVisibleShifts.length} เวร ({totalMonthHours} ชม.)
          </span>
        </div>

        {/* Interactive Ward / Department Color Legend Filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setDepartmentFilter('ทั้งหมด')}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              departmentFilter === 'ทั้งหมด'
                ? 'bg-[#0F2A4A] text-white border-[#0F2A4A]'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            ทุกกลุ่มงาน
          </button>
          {availableDepartments.map((dept) => {
            const theme = getDepartmentTheme(dept);
            const active = departmentFilter === dept;
            const monthCount = monthAllDeptShifts.filter(
              (s) => s.department === dept
            ).length;
            return (
              <button
                key={dept}
                type="button"
                onClick={() =>
                  setDepartmentFilter((prev) => (prev === dept ? 'ทั้งหมด' : dept))
                }
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-xs shrink-0 ${theme.swatchClass}`}
                  aria-hidden="true"
                />
                <span>{theme.shortName}</span>
                {monthCount > 0 && (
                  <span
                    className={`font-mono text-[11px] tabular-nums ${
                      active ? 'text-white/80' : 'text-slate-400'
                    }`}
                  >
                    ({monthCount})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Split: Calendar Grid + Ward Summary & Selected Day */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Monthly Calendar Grid (scroll-safe on narrow mobile screens) */}
        <div className="xl:col-span-8 border border-slate-200 rounded-xl overflow-x-auto bg-white">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
              {WEEKDAY_HEADERS.map((day, idx) => (
                <div
                  key={day}
                  className={`py-2.5 px-2 text-center text-xs font-semibold ${
                    idx === 0 || idx === 6 ? 'text-rose-700' : 'text-slate-600'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 divide-x divide-y divide-slate-200">
              {calendarCells.map((cell) => {
                const dayShifts = shiftsByDate.get(cell.isoDate) ?? [];
                const isSelected = cell.isoDate === selectedIsoDate;
                const isToday = cell.isoDate === TODAY_ISO;

                return (
                  <div
                    key={cell.isoDate}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setSelectedIsoDate(cell.isoDate);
                      if (!cell.inCurrentMonth) {
                        const [y, m] = cell.isoDate.split('-').map(Number);
                        if (y && m) {
                          setViewYear(y);
                          setViewMonthIndex(m - 1);
                        }
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedIsoDate(cell.isoDate);
                      }
                    }}
                    className={`min-h-[106px] p-1.5 sm:p-2 text-left transition-colors cursor-pointer flex flex-col gap-1 focus:outline-none ${
                      !cell.inCurrentMonth
                        ? 'bg-slate-50/70 text-slate-400'
                        : isSelected
                          ? 'bg-[#0F2A4A]/[0.04] ring-2 ring-inset ring-[#0F2A4A]'
                          : 'bg-white hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-xs font-semibold tabular-nums inline-flex items-center justify-center w-6 h-6 rounded-md ${
                          isToday
                            ? 'bg-[#0F2A4A] text-white'
                            : isSelected
                              ? 'text-[#0F2A4A] font-bold'
                              : cell.inCurrentMonth
                                ? 'text-slate-800'
                                : 'text-slate-400'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>
                      {isToday && (
                        <span className="text-[10px] font-medium text-[#0F2A4A]">
                          วันนี้
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 flex-1">
                      {dayShifts.slice(0, 2).map((shift) => {
                        const theme = getDepartmentTheme(shift.department);
                        const isMine = shift.assignedStudent === currentStudentName;
                        return (
                          <div
                            key={shift.id}
                            title={`${shift.department} · ${shift.wardOrUnit} (${shift.timeRange})`}
                            className={`border rounded-md px-1.5 py-1 text-[11px] leading-tight ${theme.cardClass}`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="inline-flex items-center gap-1 min-w-0">
                                <span
                                  className={`w-2 h-2 rounded-xs shrink-0 ${theme.swatchClass}`}
                                  aria-hidden="true"
                                />
                                <span className="font-semibold truncate">
                                  {theme.shortName}
                                </span>
                              </span>
                              {isMine && (
                                <UserCheck
                                  className="w-3 h-3 shrink-0 opacity-80"
                                  aria-label="เวรของฉัน"
                                />
                              )}
                            </div>
                            <div className="text-[10px] opacity-85 truncate mt-0.5">
                              {shift.wardOrUnit}
                            </div>
                            <div className="text-[10px] font-mono tabular-nums opacity-75 truncate">
                              {shift.timeRange}
                            </div>
                          </div>
                        );
                      })}

                      {dayShifts.length > 2 && (
                        <div className="text-[10px] font-medium text-[#0F2A4A] px-1 pt-0.5 tabular-nums">
                          + อีก {dayShifts.length - 2} เวร
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Monthly Ward Distribution + Selected Date Detail */}
        <div className="xl:col-span-4 space-y-5">
          {/* Monthly Department / Ward Rotation Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-[#0F2A4A]" aria-hidden="true" />
                <span>สรุปการหมุนเวียนเดือน{THAI_MONTHS_FULL[viewMonthIndex]}</span>
              </h3>
              <span className="text-xs font-mono text-slate-500 tabular-nums">
                {departmentBreakdown.length} กลุ่มงาน
              </span>
            </div>

            {departmentBreakdown.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">
                ไม่มีตารางเวรในเดือน{THAI_MONTHS_FULL[viewMonthIndex]} สำหรับขอบเขตที่เลือก
              </p>
            ) : (
              <div className="space-y-2.5">
                {departmentBreakdown.map((item) => {
                  const maxCount = departmentBreakdown[0]?.count || 1;
                  const barWidthPct = Math.max(
                    12,
                    Math.round((item.count / maxCount) * 100)
                  );
                  return (
                    <button
                      key={item.department}
                      type="button"
                      onClick={() =>
                        setDepartmentFilter((prev) =>
                          prev === item.department ? 'ทั้งหมด' : item.department
                        )
                      }
                      className={`w-full text-left bg-white border rounded-lg p-2.5 transition-colors cursor-pointer space-y-1.5 ${
                        departmentFilter === item.department
                          ? 'border-[#0F2A4A] ring-1 ring-[#0F2A4A]'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="inline-flex items-center gap-2 font-semibold text-slate-900 min-w-0">
                          <span
                            className={`w-2.5 h-2.5 rounded-xs shrink-0 ${item.theme.swatchClass}`}
                            aria-hidden="true"
                          />
                          <span className="truncate">{item.theme.shortName}</span>
                        </span>
                        <span className="font-mono text-slate-700 tabular-nums shrink-0">
                          {item.count} เวร · {item.hours} ชม.
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-xs overflow-hidden">
                        <div
                          className={`h-full ${item.theme.barClass}`}
                          style={{ width: `${barWidthPct}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Day Ward Detail */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3.5">
            <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <div className="text-[11px] font-medium text-slate-500">
                  รายละเอียดการหมุนเวียนประจำวัน
                </div>
                <h3 className="text-sm font-semibold text-slate-900 mt-0.5">
                  {formatThaiFullDate(selectedIsoDate)}
                </h3>
              </div>
              <span className="text-xs font-mono font-medium text-slate-600 tabular-nums shrink-0">
                {selectedDayShifts.length} เวร
              </span>
            </div>

            {selectedDayShifts.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-lg p-4 text-center space-y-1">
                <p className="text-xs font-medium text-slate-700">
                  ไม่มีตารางเวรในวันที่เลือก
                </p>
                <p className="text-[11px] text-slate-500">
                  คลิกวันที่ที่มีแถบสีบนปฏิทินเพื่อดูรายละเอียดหอผู้ป่วยและอาจารย์เวร
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {selectedDayShifts.map((shift) => {
                  const theme = getDepartmentTheme(shift.department);
                  const isMine = shift.assignedStudent === currentStudentName;
                  return (
                    <div
                      key={shift.id}
                      className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                            <span
                              className={`w-2.5 h-2.5 rounded-xs shrink-0 ${theme.swatchClass}`}
                              aria-hidden="true"
                            />
                            <span className="truncate">{shift.department}</span>
                          </div>
                          <div className="text-xs text-slate-600 flex items-start gap-1">
                            <MapPin
                              className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0"
                              aria-hidden="true"
                            />
                            <span>{shift.wardOrUnit}</span>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-[#0F2A4A] tabular-nums shrink-0">
                          <Clock className="w-3 h-3" aria-hidden="true" />
                          {shift.timeRange} น.
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                        <div className="inline-flex items-center gap-2 min-w-0">
                          <StudentAvatar
                            studentName={shift.assignedStudent}
                            studentPhotos={studentPhotos}
                            size="xs"
                          />
                          <span className="font-medium text-slate-800 truncate">
                            {shift.assignedStudent}
                            {isMine ? ' (คุณ)' : ''}
                          </span>
                        </div>
                        <span
                          className={`text-[11px] font-medium shrink-0 ${
                            shift.swapStatus === 'requested'
                              ? 'text-amber-700'
                              : shift.swapStatus === 'approved'
                                ? 'text-emerald-700'
                                : shift.checkedInAt
                                  ? 'text-sky-700'
                                  : 'text-slate-500'
                          }`}
                        >
                          {shift.swapStatus === 'requested'
                            ? 'รออนุมัติแลกเวร'
                            : shift.swapStatus === 'approved'
                              ? 'อนุมัติแลกเวร'
                              : shift.checkedInAt
                                ? `ลงเวลาแล้ว (${shift.checkedInAt})`
                                : shift.shiftType}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500">
                        อาจารย์เวรควบคุม: <span className="text-slate-700">{shift.supervisingStaff}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
