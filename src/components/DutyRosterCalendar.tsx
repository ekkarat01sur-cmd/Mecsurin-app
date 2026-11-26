import { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCw,
  UserCheck,
} from 'lucide-react';
import { DutyShift, StudentPhotoMap, UserRole } from '../types/medicalSchool';
import { StudentAvatar } from './StudentAvatar';

interface DutyRosterCalendarProps {
  role: UserRole;
  shifts: DutyShift[];
  studentPhotos: StudentPhotoMap;
  currentStudentName?: string;
  onCheckInShift: (shiftId: string) => void;
  onOpenSwapModal: (shift: DutyShift) => void;
  onApproveSwap: (shiftId: string) => void;
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

const THAI_MONTHS_SHORT: Record<string, number> = {
  'ม.ค.': 1,
  'ก.พ.': 2,
  'มี.ค.': 3,
  'เม.ย.': 4,
  'พ.ค.': 5,
  'มิ.ย.': 6,
  'ก.ค.': 7,
  'ส.ค.': 8,
  'ก.ย.': 9,
  'ต.ค.': 10,
  'พ.ย.': 11,
  'ธ.ค.': 12,
};

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

const TODAY_ISO = '2026-11-23';

export function resolveShiftIsoDate(shift: DutyShift): string {
  if (shift.isoDate && /^\d{4}-\d{2}-\d{2}$/.test(shift.isoDate)) {
    return shift.isoDate;
  }
  const parts = shift.date.trim().split(/\s+/);
  if (parts.length === 3) {
    const day = Number(parts[0]);
    const month = THAI_MONTHS_SHORT[parts[1]];
    const beYear = Number(parts[2]);
    if (!Number.isNaN(day) && month && !Number.isNaN(beYear)) {
      const adYear = beYear > 2400 ? beYear - 543 : beYear;
      return `${adYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  return TODAY_ISO;
}

function formatIsoToPad(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatThaiFullDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  const dt = new Date(y, m - 1, d);
  const weekday = WEEKDAY_FULL[dt.getDay()];
  return `วัน${weekday}ที่ ${d} ${THAI_MONTHS_FULL[m - 1]} ${y + 543}`;
}

function shortenDepartment(dept: string): string {
  return dept.replace('กลุ่มงาน', '').trim();
}

function shortenStudentName(name: string): string {
  const firstPart = name.trim().split(/\s+/)[0] ?? name;
  return firstPart;
}

export function DutyRosterCalendar({
  role,
  shifts,
  studentPhotos,
  currentStudentName,
  onCheckInShift,
  onOpenSwapModal,
  onApproveSwap,
}: DutyRosterCalendarProps) {
  const [viewYear, setViewYear] = useState<number>(2026);
  const [viewMonthIndex, setViewMonthIndex] = useState<number>(10); // 10 = November (0-indexed)
  const [selectedIsoDate, setSelectedIsoDate] = useState<string>(TODAY_ISO);

  const shiftsByDate = useMemo(() => {
    const map = new Map<string, DutyShift[]>();
    shifts.forEach((shift) => {
      const iso = resolveShiftIsoDate(shift);
      const list = map.get(iso) ?? [];
      list.push(shift);
      map.set(iso, list);
    });
    return map;
  }, [shifts]);

  const monthPrefix = `${viewYear}-${String(viewMonthIndex + 1).padStart(2, '0')}`;

  const monthShifts = useMemo(() => {
    return shifts
      .filter((s) => resolveShiftIsoDate(s).startsWith(monthPrefix))
      .sort((a, b) => resolveShiftIsoDate(a).localeCompare(resolveShiftIsoDate(b)));
  }, [shifts, monthPrefix]);

  const monthSummary = useMemo(() => {
    let checkedIn = 0;
    let swapRequested = 0;
    let swapApproved = 0;
    monthShifts.forEach((s) => {
      if (s.checkedInAt) checkedIn += 1;
      if (s.swapStatus === 'requested') swapRequested += 1;
      if (s.swapStatus === 'approved') swapApproved += 1;
    });
    return {
      total: monthShifts.length,
      checkedIn,
      swapRequested,
      swapApproved,
    };
  }, [monthShifts]);

  const swapActivityInMonth = useMemo(() => {
    return monthShifts.filter(
      (s) => s.swapStatus === 'requested' || s.swapStatus === 'approved'
    );
  }, [monthShifts]);

  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonthIndex, 1);
    const startWeekday = firstDayOfMonth.getDay(); // 0 = Sunday
    const daysInMonth = new Date(viewYear, viewMonthIndex + 1, 0).getDate();
    const prevMonthLastDay = new Date(viewYear, viewMonthIndex, 0).getDate();

    const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;
    const cells: {
      isoDate: string;
      dayNumber: number;
      inCurrentMonth: boolean;
    }[] = [];

    for (let i = 0; i < totalCells; i += 1) {
      if (i < startWeekday) {
        const dayNum = prevMonthLastDay - startWeekday + 1 + i;
        const prevMonthDate = new Date(viewYear, viewMonthIndex - 1, dayNum);
        cells.push({
          isoDate: formatIsoToPad(
            prevMonthDate.getFullYear(),
            prevMonthDate.getMonth(),
            dayNum
          ),
          dayNumber: dayNum,
          inCurrentMonth: false,
        });
      } else if (i < startWeekday + daysInMonth) {
        const dayNum = i - startWeekday + 1;
        cells.push({
          isoDate: formatIsoToPad(viewYear, viewMonthIndex, dayNum),
          dayNumber: dayNum,
          inCurrentMonth: true,
        });
      } else {
        const dayNum = i - (startWeekday + daysInMonth) + 1;
        const nextMonthDate = new Date(viewYear, viewMonthIndex + 1, dayNum);
        cells.push({
          isoDate: formatIsoToPad(
            nextMonthDate.getFullYear(),
            nextMonthDate.getMonth(),
            dayNum
          ),
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

  const handleGoToCurrentMonth = () => {
    setViewYear(2026);
    setViewMonthIndex(10);
    setSelectedIsoDate(TODAY_ISO);
  };

  const handleJumpToShiftDate = (shift: DutyShift) => {
    const iso = resolveShiftIsoDate(shift);
    const [y, m] = iso.split('-').map(Number);
    if (y && m) {
      setViewYear(y);
      setViewMonthIndex(m - 1);
    }
    setSelectedIsoDate(iso);
  };

  const selectedDayShifts = shiftsByDate.get(selectedIsoDate) ?? [];

  return (
    <div className="p-5 sm:p-6 space-y-6">
      {/* Monthly Summary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
          <div className="text-xs text-slate-500">เวรในเดือน{THAI_MONTHS_FULL[viewMonthIndex]}</div>
          <div className="text-xl font-bold text-slate-900 tabular-nums mt-0.5">
            {monthSummary.total} <span className="text-xs font-normal text-slate-500">เวร</span>
          </div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
          <div className="text-xs text-slate-500">ลงเวลาขึ้นเวรแล้ว</div>
          <div className="text-xl font-bold text-emerald-700 tabular-nums mt-0.5">
            {monthSummary.checkedIn} <span className="text-xs font-normal text-slate-500">เวร</span>
          </div>
        </div>
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg px-4 py-3">
          <div className="text-xs text-amber-800">รอพิจารณาอนุมัติแลกเวร</div>
          <div className="text-xl font-bold text-amber-800 tabular-nums mt-0.5">
            {monthSummary.swapRequested} <span className="text-xs font-normal text-amber-700">คำขอ</span>
          </div>
        </div>
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-lg px-4 py-3">
          <div className="text-xs text-emerald-800">อนุมัติแลกเวรแล้ว</div>
          <div className="text-xl font-bold text-emerald-800 tabular-nums mt-0.5">
            {monthSummary.swapApproved} <span className="text-xs font-normal text-emerald-700">รายการ</span>
          </div>
        </div>
      </div>

      {/* Month Navigator & Status Legend */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            aria-label="เดือนก่อนหน้า"
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="min-w-[170px] text-center">
            <span className="text-base font-semibold text-slate-900 tabular-nums">
              {THAI_MONTHS_FULL[viewMonthIndex]} {viewYear + 543}
            </span>
          </div>
          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="เดือนถัดไป"
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleGoToCurrentMonth}
            className="ml-1 px-3 py-1.5 text-xs font-medium text-[#0F2A4A] bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
          >
            เดือนปัจจุบัน
          </button>
        </div>

        {/* Status Legend (flat text + icons, no pill capsules) */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600">
          <div className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-slate-300 inline-block" aria-hidden="true" />
            <span>ตามกำหนดการ</span>
          </div>
          <div className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-sky-500 inline-block" aria-hidden="true" />
            <span>ลงเวลาแล้ว</span>
          </div>
          <div className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" aria-hidden="true" />
            <span>รอพิจารณาแลกเวร</span>
          </div>
          <div className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" aria-hidden="true" />
            <span>อนุมัติแลกเวรแล้ว</span>
          </div>
        </div>
      </div>

      {/* Main Calendar + Selected Day Detail Split */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* 7-Column Calendar Grid */}
        <div className="xl:col-span-8 border border-slate-200 rounded-xl overflow-hidden bg-white">
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
                  className={`min-h-[108px] sm:min-h-[122px] p-1.5 sm:p-2 text-left transition-colors cursor-pointer flex flex-col gap-1 focus:outline-none ${
                    !cell.inCurrentMonth
                      ? 'bg-slate-50/70 text-slate-400'
                      : isSelected
                        ? 'bg-[#0F2A4A]/5 ring-2 ring-inset ring-[#0F2A4A]'
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
                      <span className="text-[10px] font-medium text-[#0F2A4A] hidden sm:inline">
                        วันนี้
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 flex-1">
                    {dayShifts.slice(0, 2).map((shift) => {
                      const isMine =
                        currentStudentName &&
                        shift.assignedStudent === currentStudentName;

                      let cardStyle =
                        'bg-slate-50 border-slate-200 text-slate-800';
                      let statusText = 'ตามกำหนดการ';
                      let statusColor = 'text-slate-500';

                      if (shift.swapStatus === 'requested') {
                        cardStyle =
                          'bg-amber-50/90 border-amber-300 text-amber-950';
                        statusText = 'รอแลกเวร';
                        statusColor = 'text-amber-700';
                      } else if (shift.swapStatus === 'approved') {
                        cardStyle =
                          'bg-emerald-50/90 border-emerald-300 text-emerald-950';
                        statusText = 'อนุมัติแลกเวร';
                        statusColor = 'text-emerald-700';
                      } else if (shift.checkedInAt) {
                        cardStyle = 'bg-sky-50/80 border-sky-200 text-sky-950';
                        statusText = 'ลงเวลาแล้ว';
                        statusColor = 'text-sky-700';
                      }

                      return (
                        <div
                          key={shift.id}
                          className={`border rounded-md px-1.5 py-1 text-[11px] leading-tight ${cardStyle}`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold truncate">
                              {shortenDepartment(shift.department)}
                            </span>
                            {isMine && (
                              <UserCheck
                                className="w-3 h-3 shrink-0 text-[#0F2A4A]"
                                aria-label="เวรของฉัน"
                              />
                            )}
                          </div>
                          <div className="text-[10px] font-mono tabular-nums text-slate-600 truncate">
                            {shift.timeRange}
                          </div>
                          <div className="flex items-center justify-between gap-1 mt-0.5">
                            <span className="text-[10px] text-slate-600 truncate">
                              {shortenStudentName(shift.assignedStudent)}
                            </span>
                            <span
                              className={`text-[10px] font-medium shrink-0 ${statusColor}`}
                            >
                              {statusText}
                            </span>
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

        {/* Selected Day Shift Detail Panel */}
        <div className="xl:col-span-4 bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3.5">
            <div>
              <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-[#0F2A4A]" />
                <span>รายละเอียดเวรปฏิบัติงานรายวัน</span>
              </div>
              <h3 className="text-base font-semibold text-slate-900 mt-1">
                {formatThaiFullDate(selectedIsoDate)}
              </h3>
            </div>
            <span className="text-xs font-medium text-slate-600 tabular-nums shrink-0">
              {selectedDayShifts.length} เวร
            </span>
          </div>

          {selectedDayShifts.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-6 text-center space-y-1.5">
              <p className="text-sm font-medium text-slate-700">
                ไม่มีตารางเวรปฏิบัติงานในวันที่เลือก
              </p>
              <p className="text-xs text-slate-500">
                คลิกวันที่ที่มีรายการเวรบนปฏิทินเพื่อตรวจสอบรายละเอียดและการอนุมัติแลกเวร
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDayShifts.map((shift) => {
                const isMine =
                  currentStudentName &&
                  shift.assignedStudent === currentStudentName;

                return (
                  <div
                    key={shift.id}
                    className="bg-white border border-slate-200 rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {shift.department}
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5">
                          {shift.wardOrUnit}
                        </div>
                      </div>
                      <div className="text-xs font-mono font-medium text-[#0F2A4A] tabular-nums shrink-0">
                        {shift.timeRange} น.
                      </div>
                    </div>

                    <dl className="grid grid-cols-1 gap-1.5 text-xs border-t border-slate-100 pt-2.5">
                      <div className="flex justify-between gap-2">
                        <dt className="text-slate-500">ประเภทเวร</dt>
                        <dd className="text-slate-800 text-right font-medium">
                          {shift.shiftType}
                        </dd>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <dt className="text-slate-500">นักศึกษาผู้รับผิดชอบ</dt>
                        <dd className="text-slate-900 text-right font-medium inline-flex items-center gap-2">
                          <StudentAvatar
                            studentName={shift.assignedStudent}
                            studentPhotos={studentPhotos}
                            size="xs"
                          />
                          <span>
                            {shift.assignedStudent} (ปี {shift.studentYear})
                            {isMine ? ' · คุณ' : ''}
                          </span>
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-slate-500">อาจารย์เวรควบคุม</dt>
                        <dd className="text-slate-800 text-right">
                          {shift.supervisingStaff}
                        </dd>
                      </div>
                    </dl>

                    {/* Swap Approval & Check-in Status Box */}
                    <div
                      className={`rounded-lg p-3 text-xs space-y-1 border ${
                        shift.swapStatus === 'requested'
                          ? 'bg-amber-50 border-amber-200 text-amber-900'
                          : shift.swapStatus === 'approved'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : shift.checkedInAt
                              ? 'bg-sky-50 border-sky-200 text-sky-900'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 font-semibold">
                        <span className="inline-flex items-center gap-1.5">
                          {shift.swapStatus === 'requested' ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 text-amber-700" />
                              <span>สถานะแลกเวร: รอพิจารณาอนุมัติ</span>
                            </>
                          ) : shift.swapStatus === 'approved' ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                              <span>สถานะแลกเวร: อนุมัติแล้ว</span>
                            </>
                          ) : shift.checkedInAt ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-sky-700" />
                              <span>
                                {shift.checkInMethod === 'qr_scan'
                                  ? `ลงเวลาผ่าน QR แล้ว (${shift.checkedInAt})`
                                  : `ลงเวลาเข้าเวรแล้ว (${shift.checkedInAt})`}
                              </span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              <span>สถานะ: ตามกำหนดการปกติ</span>
                            </>
                          )}
                        </span>
                      </div>

                      {shift.swapNote && (
                        <p className="text-xs leading-relaxed opacity-90 pt-0.5">
                          {shift.swapNote}
                        </p>
                      )}

                      {shift.checkedInAt && shift.swapStatus === 'approved' && (
                        <p className="text-xs text-emerald-800 pt-0.5">
                          {shift.checkInMethod === 'qr_scan'
                            ? `สแกน QR เข้าจุดปฏิบัติงานแล้วเมื่อ ${shift.checkedInAt}`
                            : `บันทึกเวลาขึ้นเวรแล้วเมื่อ ${shift.checkedInAt}`}
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
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
                          onClick={() => onOpenSwapModal(shift)}
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
                  </div>
                );
              })}
            </div>
          )}

          {/* Monthly Swap Approval Tracker */}
          <div className="border-t border-slate-200 pt-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                ติดตามสถานะคำขอแลกเวรเดือนนี้
              </h4>
              <span className="text-xs text-slate-500 tabular-nums">
                {swapActivityInMonth.length} รายการ
              </span>
            </div>

            {swapActivityInMonth.length === 0 ? (
              <p className="text-xs text-slate-500">
                ไม่มีรายการขอแลกเวรในเดือน{THAI_MONTHS_FULL[viewMonthIndex]}
              </p>
            ) : (
              <div className="space-y-2">
                {swapActivityInMonth.map((swapShift) => (
                  <button
                    key={swapShift.id}
                    type="button"
                    onClick={() => handleJumpToShiftDate(swapShift)}
                    className="w-full text-left bg-white border border-slate-200 hover:border-[#0F2A4A]/40 rounded-lg p-2.5 transition-colors cursor-pointer space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900 tabular-nums">
                        {swapShift.date} · {shortenDepartment(swapShift.department)}
                      </span>
                      {swapShift.swapStatus === 'requested' ? (
                        <span className="text-[11px] font-medium text-amber-700 shrink-0">
                          รอพิจารณา
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-emerald-700 shrink-0">
                          อนุมัติแล้ว
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-600 truncate">
                      {swapShift.assignedStudent}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
