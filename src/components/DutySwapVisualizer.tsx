import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  RefreshCw,
  UserCheck,
} from 'lucide-react';
import { COHORT_STUDENTS } from '../data/initialMedicalData';
import { DutyShift, StudentPhotoMap, UserRole } from '../types/medicalSchool';
import { resolveShiftIsoDate } from './DutyRosterCalendar';
import { StudentAvatar } from './StudentAvatar';

interface DutySwapVisualizerProps {
  role: UserRole;
  shifts: DutyShift[];
  studentPhotos: StudentPhotoMap;
  currentStudentName?: string;
  onApproveSwap: (shiftId: string) => void;
  onOpenSwapModal: (shift: DutyShift) => void;
}

type SwapStatusFilter = 'all' | 'requested' | 'approved';
type SwapScopeFilter = 'all' | 'mine';

const TODAY_ISO = '2026-11-24';

function normalizeThaiName(name: string): string {
  return name.replace(/^นศพ\.\s*/, '').replace(/\s+/g, '').trim();
}

function shortenDepartment(dept: string): string {
  return dept.replace(/^กลุ่มงาน/, '').trim();
}

function resolveSwapPartner(
  shift: DutyShift
): { name: string; yearLevel?: string; matched: boolean } {
  const note = shift.swapNote ?? '';
  const assignedNorm = normalizeThaiName(shift.assignedStudent);

  // Try matching full or partial student names from COHORT_STUDENTS inside swapNote
  const noteNoSpaces = note.replace(/\s+/g, '');
  for (const st of COHORT_STUDENTS) {
    const cleanFull = normalizeThaiName(st.studentName);
    if (cleanFull === assignedNorm) continue;
    const firstName = st.studentName.replace(/^นศพ\.\s*/, '').trim().split(/\s+/)[0];
    if (
      noteNoSpaces.includes(cleanFull) ||
      (firstName && note.includes(`นศพ.${firstName}`)) ||
      (firstName && note.includes(`นศพ. ${firstName}`))
    ) {
      return {
        name: st.studentName,
        yearLevel: st.yearLevel,
        matched: true,
      };
    }
  }

  // Fallback regex for free-text student names in swap notes
  const match = note.match(/นศพ\.?\s*([^\s(,]+(?:\s+[^\s(,]+)?)/);
  if (match && match[1]) {
    const extracted = `นศพ.${match[1].trim()}`;
    if (normalizeThaiName(extracted) !== assignedNorm) {
      return { name: extracted, matched: false };
    }
  }

  return { name: 'ผู้รับแลกเวร (รอระบุ)', matched: false };
}

function isShiftInvolvingStudent(shift: DutyShift, studentName?: string): boolean {
  if (!studentName) return false;
  const targetNorm = normalizeThaiName(studentName);
  if (normalizeThaiName(shift.assignedStudent) === targetNorm) return true;
  const noteNoSpaces = (shift.swapNote ?? '').replace(/\s+/g, '');
  const firstName = studentName.replace(/^นศพ\.\s*/, '').trim().split(/\s+/)[0];
  return (
    noteNoSpaces.includes(targetNorm) ||
    (Boolean(firstName) && (shift.swapNote ?? '').includes(firstName))
  );
}

export function DutySwapVisualizer({
  role,
  shifts,
  studentPhotos,
  currentStudentName,
  onApproveSwap,
  onOpenSwapModal,
}: DutySwapVisualizerProps) {
  const [statusFilter, setStatusFilter] = useState<SwapStatusFilter>('all');
  const [scopeFilter, setScopeFilter] = useState<SwapScopeFilter>('all');
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [showNewSwapPicker, setShowNewSwapPicker] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const canApproveSwaps =
    role === 'faculty' || role === 'course_officer' || role === 'admin';

  // All shifts that have an active or completed swap exchange, ordered chronologically
  const allSwapShifts = useMemo(() => {
    return shifts
      .filter((s) => s.swapStatus === 'requested' || s.swapStatus === 'approved')
      .sort((a, b) => resolveShiftIsoDate(a).localeCompare(resolveShiftIsoDate(b)));
  }, [shifts]);

  const eligibleForNewSwap = useMemo(() => {
    return shifts
      .filter((s) => !s.swapStatus || s.swapStatus === 'none')
      .sort((a, b) => resolveShiftIsoDate(a).localeCompare(resolveShiftIsoDate(b)));
  }, [shifts]);

  const summary = useMemo(() => {
    let requested = 0;
    let approved = 0;
    let involvingMe = 0;
    for (const s of allSwapShifts) {
      if (s.swapStatus === 'requested') requested += 1;
      if (s.swapStatus === 'approved') approved += 1;
      if (isShiftInvolvingStudent(s, currentStudentName)) involvingMe += 1;
    }
    return {
      total: allSwapShifts.length,
      requested,
      approved,
      involvingMe,
    };
  }, [allSwapShifts, currentStudentName]);

  const filteredSwapShifts = useMemo(() => {
    return allSwapShifts.filter((s) => {
      if (statusFilter !== 'all' && s.swapStatus !== statusFilter) return false;
      if (
        scopeFilter === 'mine' &&
        !isShiftInvolvingStudent(s, currentStudentName)
      ) {
        return false;
      }
      return true;
    });
  }, [allSwapShifts, statusFilter, scopeFilter, currentStudentName]);

  const activeSelectedShift = useMemo(() => {
    if (filteredSwapShifts.length === 0) return null;
    if (selectedShiftId) {
      const found = filteredSwapShifts.find((s) => s.id === selectedShiftId);
      if (found) return found;
    }
    // Prefer first pending swap near today, otherwise first item
    return (
      filteredSwapShifts.find((s) => s.swapStatus === 'requested') ??
      filteredSwapShifts[0]
    );
  }, [filteredSwapShifts, selectedShiftId]);

  const updateScrollButtons = () => {
    const el = scrollContainerRef.current;
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

  useEffect(() => {
    updateScrollButtons();
    const el = scrollContainerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => updateScrollButtons());
    observer.observe(el);
    return () => observer.disconnect();
  }, [filteredSwapShifts]);

  const scrollTimelineBy = (delta: number) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  const scrollToPendingOrLatest = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const pendingIdx = filteredSwapShifts.findIndex(
      (s) => s.swapStatus === 'requested'
    );
    if (pendingIdx >= 0) {
      const cardEl = el.querySelector<HTMLElement>(
        `[data-swap-index="${pendingIdx}"]`
      );
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        setSelectedShiftId(filteredSwapShifts[pendingIdx].id);
        return;
      }
    }
    el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
  };

  return (
    <section
      className="bg-white border border-slate-200 rounded-xl overflow-hidden"
      aria-label="ไทม์ไลน์ติดตามการแลกเวรปฏิบัติงาน (Duty Swap Visualizer)"
    >
      {/* Header & Interactive Controls */}
      <div className="px-6 py-5 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F766E]">
            <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Duty Shift Exchange Timeline</span>
          </div>
          <h2 className="text-lg font-semibold text-slate-900">
            ไทม์ไลน์ติดตามคำขอและประวัติการแลกเวร (Duty Swap Visualizer)
          </h2>
          <p className="text-xs text-slate-500">
            เลื่อนดูลำดับเหตุการณ์การแลกเวรที่รออนุมัติและอนุมัติแล้วในแนวนอน คลิกที่รายการเพื่อตรวจคู่แลกเวรหรือกดอนุมัติได้ทันที
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start xl:self-auto">
          {/* Status Filter */}
          <div className="inline-flex items-center p-1 bg-slate-100 border border-slate-200 rounded-lg">
            {(
              [
                { id: 'all', label: `ทั้งหมด (${summary.total})` },
                { id: 'requested', label: `รออนุมัติ (${summary.requested})` },
                { id: 'approved', label: `อนุมัติแล้ว (${summary.approved})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                  statusFilter === tab.id
                    ? 'bg-white text-[#0F2A4A] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Scope Filter */}
          {currentStudentName && (
            <div className="inline-flex items-center p-1 bg-slate-100 border border-slate-200 rounded-lg">
              <button
                type="button"
                onClick={() => setScopeFilter('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  scopeFilter === 'all'
                    ? 'bg-white text-[#0F2A4A] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ทั้งศูนย์ฯ
              </button>
              <button
                type="button"
                onClick={() => setScopeFilter('mine')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                  scopeFilter === 'mine'
                    ? 'bg-white text-[#0F2A4A] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                เกี่ยวข้องกับฉัน ({summary.involvingMe})
              </button>
            </div>
          )}

          {/* New Swap Request Picker Trigger */}
          {eligibleForNewSwap.length > 0 && (
            <button
              type="button"
              onClick={() => setShowNewSwapPicker((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#0F2A4A] hover:bg-[#163B66] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>ยื่นขอแลกเวรใหม่</span>
            </button>
          )}
        </div>
      </div>

      {/* Optional Quick Picker for initiating a new swap right from the Visualizer */}
      {showNewSwapPicker && eligibleForNewSwap.length > 0 && (
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-800">
              เลือกเวรปฏิบัติงานที่ต้องการยื่นคำขอแลกเวร ({eligibleForNewSwap.length} เวรที่ว่าง)
            </span>
            <button
              type="button"
              onClick={() => setShowNewSwapPicker(false)}
              className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              ปิดแถบเลือก
            </button>
          </div>
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
            {eligibleForNewSwap.map((shift) => (
              <button
                key={shift.id}
                type="button"
                onClick={() => {
                  setShowNewSwapPicker(false);
                  onOpenSwapModal(shift);
                }}
                className="shrink-0 text-left bg-white border border-slate-200 hover:border-[#0F2A4A] rounded-lg px-3 py-2 text-xs space-y-0.5 transition-colors cursor-pointer"
              >
                <div className="font-semibold text-slate-900 tabular-nums">
                  {shift.date} · {shortenDepartment(shift.department)}
                </div>
                <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                  {shift.timeRange} น. · {shift.assignedStudent}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4-Column Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-slate-200 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 bg-slate-50/60">
        <div className="px-5 py-3.5">
          <div className="text-xs text-slate-500">รายการแลกเวรในไทม์ไลน์</div>
          <div className="mt-0.5 text-xl font-bold text-slate-900 tabular-nums">
            {summary.total} รายการ
          </div>
        </div>
        <div className="px-5 py-3.5 border-l border-slate-200 lg:border-l-0">
          <div className="text-xs text-slate-500">รอพิจารณาอนุมัติ</div>
          <div className="mt-0.5 text-xl font-bold text-amber-700 tabular-nums">
            {summary.requested} รายการ
          </div>
        </div>
        <div className="px-5 py-3.5">
          <div className="text-xs text-slate-500">อนุมัติแลกเวรแล้ว</div>
          <div className="mt-0.5 text-xl font-bold text-emerald-700 tabular-nums">
            {summary.approved} รายการ
          </div>
        </div>
        <div className="px-5 py-3.5 border-l border-slate-200 lg:border-l-0">
          <div className="text-xs text-slate-500">เวรแลกเปลี่ยนที่เกี่ยวข้องกับฉัน</div>
          <div className="mt-0.5 text-xl font-bold text-[#0F2A4A] tabular-nums">
            {summary.involvingMe} รายการ
          </div>
        </div>
      </div>

      {/* Horizontal Scroll Timeline Workspace */}
      <div className="p-5 sm:p-6 space-y-5">
        {/* Timeline Toolbar: Chronological range & Horizontal scroll buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
              <CalendarClock className="w-3.5 h-3.5 text-[#0F2A4A]" aria-hidden="true" />
              <span>เรียงลำดับตามวันขึ้นเวร (ซ้าย → ขวา)</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" aria-hidden="true" />
              <span>รอพิจารณาอนุมัติ</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" aria-hidden="true" />
              <span>อนุมัติแลกเวรแล้ว</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {filteredSwapShifts.some((s) => s.swapStatus === 'requested') && (
              <button
                type="button"
                onClick={scrollToPendingOrLatest}
                className="px-2.5 py-1.5 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                ไปยังรายการรออนุมัติ
              </button>
            )}
            <button
              type="button"
              onClick={() => scrollTimelineBy(-350)}
              disabled={!canScrollLeft}
              aria-label="เลื่อนไทม์ไลน์ไปทางซ้าย"
              className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollTimelineBy(350)}
              disabled={!canScrollRight}
              aria-label="เลื่อนไทม์ไลน์ไปทางขวา"
              className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {filteredSwapShifts.length === 0 ? (
          <div className="py-10 px-4 text-center border border-dashed border-slate-300 rounded-xl space-y-2.5">
            <p className="text-sm font-medium text-slate-700">
              ไม่พบรายการแลกเวรที่ตรงกับตัวกรองที่เลือก
            </p>
            <p className="text-xs text-slate-500">
              ลองเปลี่ยนตัวกรองสถานะ หรือยื่นคำขอแลกเวรใหม่จากเวรปฏิบัติงานที่ว่างอยู่
            </p>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setScopeFilter('all');
              }}
              className="px-3.5 py-1.5 text-xs font-medium text-[#0F2A4A] bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              แสดงรายการแลกเวรทั้งหมด
            </button>
          </div>
        ) : (
          <>
            {/* Interactive Horizontal Scroll Track */}
            <div
              ref={scrollContainerRef}
              onScroll={updateScrollButtons}
              className="overflow-x-auto pb-3 scroll-smooth snap-x snap-mandatory"
            >
              <div className="relative inline-flex items-stretch gap-5 min-w-full px-1">
                {filteredSwapShifts.map((shift, index) => {
                  const isoDate = resolveShiftIsoDate(shift);
                  const isRequested = shift.swapStatus === 'requested';
                  const isSelected = activeSelectedShift?.id === shift.id;
                  const isUpcoming = isoDate >= TODAY_ISO;
                  const involvesMe = isShiftInvolvingStudent(
                    shift,
                    currentStudentName
                  );
                  const partner = resolveSwapPartner(shift);

                  return (
                    <div
                      key={shift.id}
                      data-swap-index={index}
                      className="w-[300px] sm:w-[336px] shrink-0 snap-start flex flex-col"
                    >
                      {/* Chronological Rail & Date Node */}
                      <div className="relative flex items-center gap-2.5 pb-3.5">
                        {/* Continuous horizontal connector line */}
                        <div
                          aria-hidden="true"
                          className={`absolute top-2.5 h-px bg-slate-200 ${
                            index === 0
                              ? 'left-2.5 right-[-20px]'
                              : index === filteredSwapShifts.length - 1
                                ? 'left-0 w-2.5'
                                : 'left-0 right-[-20px]'
                          }`}
                        />
                        <span
                          aria-hidden="true"
                          className={`relative z-10 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                            isRequested
                              ? 'bg-amber-50 border-amber-400 text-amber-700'
                              : 'bg-emerald-50 border-emerald-400 text-emerald-700'
                          }`}
                        >
                          {isRequested ? (
                            <RefreshCw className="w-3 h-3" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3" />
                          )}
                        </span>

                        <div className="relative z-10 bg-white pr-2 flex items-center gap-1.5 text-xs tabular-nums">
                          <span className="font-semibold text-slate-900">
                            {shift.date}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-500">
                            {shift.dayLabel}
                          </span>
                          {isUpcoming && (
                            <>
                              <span className="text-slate-400">·</span>
                              <span className="font-medium text-[#0F766E]">
                                กำลังจะถึง
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Timeline Exchange Card */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedShiftId(shift.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedShiftId(shift.id);
                          }
                        }}
                        className={`flex-1 flex flex-col justify-between rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'border-[#0F2A4A] ring-1 ring-[#0F2A4A] bg-white'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-3">
                          {/* Top Metadata Row (Zero-pill discipline) */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-[#0F2A4A] truncate">
                                {shortenDepartment(shift.department)}
                              </div>
                              <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                {shift.wardOrUnit}
                              </div>
                            </div>

                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-semibold shrink-0 ${
                                isRequested
                                  ? 'text-amber-800'
                                  : 'text-emerald-800'
                              }`}
                            >
                              {isRequested ? (
                                <>
                                  <Clock className="w-3 h-3" aria-hidden="true" />
                                  <span>รออนุมัติ</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                                  <span>อนุมัติแล้ว</span>
                                </>
                              )}
                            </span>
                          </div>

                          {/* Student A <-> Student B Exchange Pairing */}
                          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              {/* Student 1 */}
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <StudentAvatar
                                  studentName={shift.assignedStudent}
                                  studentPhotos={studentPhotos}
                                  size="xs"
                                />
                                <div className="min-w-0">
                                  <div className="text-xs font-medium text-slate-900 truncate">
                                    {shift.assignedStudent}
                                  </div>
                                  <div className="text-[10px] text-slate-500 tabular-nums">
                                    ผู้ถือเวร · ปี {shift.studentYear}
                                  </div>
                                </div>
                              </div>

                              <ArrowLeftRight
                                className="w-4 h-4 text-[#0F766E] shrink-0"
                                aria-hidden="true"
                              />

                              {/* Student 2 (Swap Partner) */}
                              <div className="flex items-center justify-end gap-2 min-w-0 flex-1 text-right">
                                <div className="min-w-0">
                                  <div className="text-xs font-medium text-slate-900 truncate">
                                    {partner.name}
                                  </div>
                                  <div className="text-[10px] text-slate-500 tabular-nums">
                                    {partner.yearLevel
                                      ? `คู่แลกเวร · ปี ${partner.yearLevel}`
                                      : 'คู่แลกเวร'}
                                  </div>
                                </div>
                                <StudentAvatar
                                  studentName={partner.name}
                                  studentPhotos={studentPhotos}
                                  size="xs"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-200/70 font-mono tabular-nums">
                              <span>{shift.timeRange} น.</span>
                              <span className="font-sans truncate max-w-[160px]">
                                {shift.shiftType}
                              </span>
                            </div>
                          </div>

                          {/* Reason / Note */}
                          {shift.swapNote && (
                            <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                              {shift.swapNote}
                            </p>
                          )}
                        </div>

                        {/* Card Footer */}
                        <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <div className="text-[11px] text-slate-500 truncate inline-flex items-center gap-1">
                            {involvesMe && (
                              <UserCheck
                                className="w-3.5 h-3.5 text-[#0F2A4A] shrink-0"
                                aria-label="เกี่ยวข้องกับคุณ"
                              />
                            )}
                            <span className="truncate">
                              คุมเวร: {shift.supervisingStaff}
                            </span>
                          </div>

                          {isRequested && canApproveSwaps ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onApproveSwap(shift.id);
                              }}
                              className="px-2.5 py-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              อนุมัติแลกเวร
                            </button>
                          ) : (
                            <span className="text-[11px] font-medium text-[#0F2A4A] whitespace-nowrap shrink-0">
                              {isSelected ? 'กำลังแสดงรายละเอียด' : 'ดูไทม์ไลน์ →'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Swap Detail Inspector */}
            {activeSelectedShift && (() => {
              const partner = resolveSwapPartner(activeSelectedShift);
              const isRequested = activeSelectedShift.swapStatus === 'requested';
              return (
                <div className="border border-slate-200 bg-slate-50/70 rounded-xl p-5 space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200 pb-3.5">
                    <div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 tabular-nums">
                        <span className="font-semibold text-[#0F2A4A]">
                          {activeSelectedShift.department}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{activeSelectedShift.wardOrUnit}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {activeSelectedShift.dayLabel} {activeSelectedShift.date} ({activeSelectedShift.timeRange} น.)
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-slate-900 mt-1">
                        รายละเอียดคำขอแลกเวร: {activeSelectedShift.assignedStudent} ↔ {partner.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                          isRequested ? 'text-amber-800' : 'text-emerald-800'
                        }`}
                      >
                        {isRequested ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>สถานะ: รอพิจารณาอนุมัติ</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>สถานะ: อนุมัติแลกเวรแล้ว</span>
                          </>
                        )}
                      </span>

                      {isRequested && canApproveSwaps && (
                        <button
                          type="button"
                          onClick={() => onApproveSwap(activeSelectedShift.id)}
                          className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#0F766E] hover:bg-[#0D625C] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          อนุมัติคำขอแลกเวรนี้
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 3-Step Approval Timeline Bar */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-start gap-2.5">
                      <CheckCircle2
                        className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <div>
                        <div className="font-semibold text-slate-900">
                          1. ยื่นคำขอแลกเวรและระบุคู่แลกเปลี่ยน
                        </div>
                        <div className="text-slate-500 mt-0.5">
                          {activeSelectedShift.assignedStudent} ↔ {partner.name}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`border rounded-lg p-3 flex items-start gap-2.5 ${
                        isRequested
                          ? 'bg-amber-50/70 border-amber-200'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      {isRequested ? (
                        <Clock
                          className="w-4 h-4 text-amber-700 shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                      ) : (
                        <CheckCircle2
                          className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                      )}
                      <div>
                        <div className="font-semibold text-slate-900">
                          2. อาจารย์เวรควบคุมและฝ่ายวิชาการตรวจสอบ
                        </div>
                        <div className="text-slate-600 mt-0.5">
                          ผู้รับผิดชอบ: {activeSelectedShift.supervisingStaff}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`border rounded-lg p-3 flex items-start gap-2.5 ${
                        isRequested
                          ? 'bg-slate-100/70 border-slate-200 text-slate-500'
                          : 'bg-emerald-50/70 border-emerald-200'
                      }`}
                    >
                      {isRequested ? (
                        <Clock
                          className="w-4 h-4 text-slate-400 shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                      ) : (
                        <CheckCircle2
                          className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                      )}
                      <div>
                        <div className="font-semibold text-slate-900">
                          3. อนุมัติและบันทึกผลลงตารางเวร
                        </div>
                        <div className="text-slate-600 mt-0.5">
                          {isRequested
                            ? 'รอกดยืนยันอนุมัติจากอาจารย์หรือฝ่ายวิชาการ'
                            : 'ปรับปรุงสิทธิ์ลงเวลาขึ้นเวรในปฏิทินเรียบร้อยแล้ว'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {activeSelectedShift.swapNote && (
                    <div className="text-xs text-slate-700 bg-white border border-slate-200 rounded-lg px-4 py-3 leading-relaxed">
                      <span className="font-semibold text-slate-900">
                        บันทึกเหตุผลและข้อมูลการแลกเวร:{' '}
                      </span>
                      {activeSelectedShift.swapNote}
                    </div>
                  )}
                </div>
              );
            })()}
          </>
        )}
      </div>
    </section>
  );
}
