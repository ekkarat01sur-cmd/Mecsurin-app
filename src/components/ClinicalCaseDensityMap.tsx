import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  Compass,
  Grid2x2,
  LayoutGrid,
  MapPin,
  Plus,
} from 'lucide-react';
import { ResponsiveContainer, Tooltip, Treemap, type TreemapNode } from 'recharts';
import { CLINICAL_DEPARTMENTS } from '../data/initialMedicalData';
import {
  ActiveTab,
  BedsideCheckInRecord,
  ConferenceEvent,
  DutyShift,
  LogbookEntry,
} from '../types/medicalSchool';

interface ClinicalCaseDensityMapProps {
  currentStudentName: string;
  shifts: DutyShift[];
  logbookEntries: LogbookEntry[];
  bedsideCheckIns: BedsideCheckInRecord[];
  conferences: ConferenceEvent[];
  onOpenNewLogbook: () => void;
  onNavigateTab: (tab: ActiveTab) => void;
}

type DensityMetric = 'combined' | 'hours' | 'cases';
type MapViewMode = 'treemap' | 'matrix';

interface WardExposureItem {
  wardName: string;
  hours: number;
  shiftCount: number;
  bedsideCount: number;
  visited: boolean;
}

interface DepartmentDensityRecord {
  id: string;
  department: string;
  shortTh: string;
  nameEn: string;
  yearLevel: string;
  expectedWeeks: number;
  loggedShiftHours: number;
  scheduledShiftHours: number;
  bedsideHours: number;
  conferenceHours: number;
  totalTimeHours: number;
  caseCount: number;
  approvedCaseCount: number;
  bedsideCount: number;
  conferenceCount: number;
  densityIndex: number;
  treemapSize: number;
  tier: 'high' | 'moderate' | 'low' | 'none';
  tierLabel: string;
  fillColor: string;
  textColor: string;
  wards: WardExposureItem[];
  visitedWardCount: number;
  totalWardCount: number;
  [key: string]: unknown;
}

function normalizeThaiName(name: string): string {
  return name.replace(/\s+/g, '').trim();
}

function parseDurationHours(timeRange: string, fallbackHours: number): number {
  const match = timeRange.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!match) return fallbackHours;
  const startMin = Number(match[1]) * 60 + Number(match[2]);
  let endMin = Number(match[3]) * 60 + Number(match[4]);
  if (endMin <= startMin) {
    endMin += 24 * 60;
  }
  return Math.round(((endMin - startMin) / 60) * 10) / 10;
}

function getDensityVisuals(densityIndex: number): {
  tier: DepartmentDensityRecord['tier'];
  tierLabel: string;
  fillColor: string;
  textColor: string;
} {
  if (densityIndex >= 35) {
    return {
      tier: 'high',
      tierLabel: 'ความหนาแน่นสูง',
      fillColor: '#0F2A4A',
      textColor: '#FFFFFF',
    };
  }
  if (densityIndex >= 16) {
    return {
      tier: 'moderate',
      tierLabel: 'ความหนาแน่นปานกลาง',
      fillColor: '#0F766E',
      textColor: '#FFFFFF',
    };
  }
  if (densityIndex > 0) {
    return {
      tier: 'low',
      tierLabel: 'ประสบการณ์เริ่มต้น',
      fillColor: '#0284C7',
      textColor: '#FFFFFF',
    };
  }
  return {
    tier: 'none',
    tierLabel: 'ยังไม่มีการบันทึก',
    fillColor: '#F1F5F9',
    textColor: '#334155',
  };
}

export function ClinicalCaseDensityMap({
  currentStudentName,
  shifts,
  logbookEntries,
  bedsideCheckIns,
  conferences,
  onOpenNewLogbook,
  onNavigateTab,
}: ClinicalCaseDensityMapProps) {
  const [metricMode, setMetricMode] = useState<DensityMetric>('combined');
  const [viewMode, setViewMode] = useState<MapViewMode>('treemap');
  const [selectedDeptName, setSelectedDeptName] = useState<string>(
    'กลุ่มงานอายุรศาสตร์'
  );

  const normalizedStudent = normalizeThaiName(currentStudentName);

  const departmentRecords = useMemo<DepartmentDensityRecord[]>(() => {
    const myShifts = shifts.filter(
      (s) => normalizeThaiName(s.assignedStudent) === normalizedStudent
    );
    const activeShifts = myShifts.length > 0 ? myShifts : shifts;

    const myBedside = bedsideCheckIns.filter(
      (b) => normalizeThaiName(b.studentName) === normalizedStudent
    );
    const activeBedside = myBedside.length > 0 ? myBedside : bedsideCheckIns;

    const records = CLINICAL_DEPARTMENTS.map((dept) => {
      const deptShifts = activeShifts.filter((s) => s.department === dept.nameTh);
      const loggedShifts = deptShifts.filter((s) => Boolean(s.checkedInAt));
      const scheduledShifts = deptShifts.filter((s) => !s.checkedInAt);

      const loggedShiftHours = loggedShifts.reduce(
        (sum, s) => sum + parseDurationHours(s.timeRange, 8),
        0
      );
      const scheduledShiftHours = scheduledShifts.reduce(
        (sum, s) => sum + parseDurationHours(s.timeRange, 8),
        0
      );

      const deptCases = logbookEntries.filter((e) => e.department === dept.nameTh);
      const approvedCaseCount = deptCases.filter(
        (e) => e.status === 'approved'
      ).length;

      const deptBedside = activeBedside.filter((b) => b.department === dept.nameTh);
      const bedsideHours = Math.round(deptBedside.length * 1.5 * 10) / 10;

      const deptConfs = conferences.filter(
        (c) => c.checkedIn && c.department === dept.nameTh
      );
      const conferenceHours = deptConfs.reduce(
        (sum, c) => sum + parseDurationHours(c.time, 1),
        0
      );

      const totalTimeHours =
        Math.round((loggedShiftHours + bedsideHours + conferenceHours) * 10) / 10;
      const caseCount = deptCases.length;
      const densityIndex = Math.round(
        totalTimeHours * 1.5 + caseCount * 10 + deptBedside.length * 6
      );

      // Ward-level exposure breakdown (merging observed wards + department ward catalog)
      const wardMap = new Map<string, WardExposureItem>();
      const catalogWards = dept.wards
        .split(',')
        .map((w) => w.trim())
        .filter(Boolean);

      for (const w of catalogWards) {
        wardMap.set(w, {
          wardName: w,
          hours: 0,
          shiftCount: 0,
          bedsideCount: 0,
          visited: false,
        });
      }

      for (const s of loggedShifts) {
        const hrs = parseDurationHours(s.timeRange, 8);
        const prev = wardMap.get(s.wardOrUnit) ?? {
          wardName: s.wardOrUnit,
          hours: 0,
          shiftCount: 0,
          bedsideCount: 0,
          visited: false,
        };
        wardMap.set(s.wardOrUnit, {
          ...prev,
          hours: Math.round((prev.hours + hrs) * 10) / 10,
          shiftCount: prev.shiftCount + 1,
          visited: true,
        });
      }

      for (const b of deptBedside) {
        const prev = wardMap.get(b.wardOrUnit) ?? {
          wardName: b.wardOrUnit,
          hours: 0,
          shiftCount: 0,
          bedsideCount: 0,
          visited: false,
        };
        wardMap.set(b.wardOrUnit, {
          ...prev,
          hours: Math.round((prev.hours + 1.5) * 10) / 10,
          bedsideCount: prev.bedsideCount + 1,
          visited: true,
        });
      }

      const wards = Array.from(wardMap.values()).sort(
        (a, b) => b.hours - a.hours || b.bedsideCount - a.bedsideCount
      );
      const visitedWardCount = wards.filter((w) => w.visited).length;

      const rawMetric =
        metricMode === 'hours'
          ? totalTimeHours
          : metricMode === 'cases'
            ? caseCount
            : densityIndex;

      const visuals = getDensityVisuals(densityIndex);

      return {
        id: dept.id,
        department: dept.nameTh,
        shortTh: dept.nameTh.replace(/^กลุ่มงาน/, ''),
        nameEn: dept.nameEn,
        yearLevel: dept.yearLevel,
        expectedWeeks: dept.weeks,
        loggedShiftHours,
        scheduledShiftHours,
        bedsideHours,
        conferenceHours,
        totalTimeHours,
        caseCount,
        approvedCaseCount,
        bedsideCount: deptBedside.length,
        conferenceCount: deptConfs.length,
        densityIndex,
        // Keep zero-exposure departments visible with compact baseline tiles so gaps stand out
        treemapSize: rawMetric > 0 ? Math.max(18, rawMetric * 2.4) : 10,
        ...visuals,
        wards,
        visitedWardCount,
        totalWardCount: wards.length,
      };
    });

    return records.sort(
      (a, b) =>
        b.densityIndex - a.densityIndex ||
        b.totalTimeHours - a.totalTimeHours ||
        b.caseCount - a.caseCount
    );
  }, [
    shifts,
    logbookEntries,
    bedsideCheckIns,
    conferences,
    normalizedStudent,
    metricMode,
  ]);

  const selectedRecord = useMemo(
    () =>
      departmentRecords.find((r) => r.department === selectedDeptName) ??
      departmentRecords[0],
    [departmentRecords, selectedDeptName]
  );

  const summaryStats = useMemo(() => {
    const activeDepts = departmentRecords.filter((r) => r.densityIndex > 0);
    const gapDepts = departmentRecords.filter((r) => r.densityIndex === 0);
    const topDept = departmentRecords[0];

    const allVisitedWards = departmentRecords
      .flatMap((d) =>
        d.wards
          .filter((w) => w.visited)
          .map((w) => ({ ...w, deptShort: d.shortTh, department: d.department }))
      )
      .sort((a, b) => b.hours - a.hours);

    const topWard = allVisitedWards[0] ?? null;

    return {
      coveredDeptCount: activeDepts.length,
      gapDeptCount: gapDepts.length,
      topDept,
      topWard,
      gapDepts,
    };
  }, [departmentRecords]);

  const treemapData = useMemo(
    () =>
      departmentRecords.map((rec) => ({
        name: rec.shortTh,
        size: rec.treemapSize,
        record: rec,
      })),
    [departmentRecords]
  );

  const renderTreemapCell = (node: TreemapNode) => {
    if (node.depth === 0) return <g />;
    const rec = node.record as DepartmentDensityRecord | undefined;
    if (!rec || node.width < 8 || node.height < 8) return <g />;

    const isSelected = rec.department === selectedRecord?.department;
    const isZero = rec.densityIndex === 0;
    const showDetails = node.width >= 96 && node.height >= 54;
    const showCompactLabel = node.width >= 58 && node.height >= 30;

    const metricLabel =
      metricMode === 'hours'
        ? `${rec.totalTimeHours} ชม.`
        : metricMode === 'cases'
          ? `${rec.caseCount} เคส`
          : `${rec.totalTimeHours} ชม. · ${rec.caseCount} เคส`;

    return (
      <g
        onClick={() => setSelectedDeptName(rec.department)}
        style={{ cursor: 'pointer' }}
      >
        <rect
          x={node.x + 2}
          y={node.y + 2}
          width={Math.max(0, node.width - 4)}
          height={Math.max(0, node.height - 4)}
          rx={6}
          ry={6}
          fill={rec.fillColor}
          stroke={isSelected ? '#F59E0B' : isZero ? '#CBD5E1' : '#FFFFFF'}
          strokeWidth={isSelected ? 2.5 : 1.5}
          strokeDasharray={isZero && !isSelected ? '4 3' : undefined}
        />
        {showCompactLabel && (
          <text
            x={node.x + 10}
            y={node.y + 22}
            fill={rec.textColor}
            fontSize={node.width >= 130 ? 12 : 10}
            fontWeight={600}
            style={{ pointerEvents: 'none' }}
          >
            {rec.shortTh.length > 14 && node.width < 125
              ? `${rec.shortTh.slice(0, 12)}…`
              : rec.shortTh}
          </text>
        )}
        {showDetails && (
          <text
            x={node.x + 10}
            y={node.y + 40}
            fill={isZero ? '#64748B' : 'rgba(255,255,255,0.88)'}
            fontSize={11}
            style={{ pointerEvents: 'none', fontVariantNumeric: 'tabular-nums' }}
          >
            {metricLabel}
          </text>
        )}
      </g>
    );
  };

  return (
    <section
      className="bg-white border border-slate-200 rounded-xl p-6 sm:p-7 space-y-6"
      aria-label="แผนผังความหนาแน่นเคสและเวลาปฏิบัติงานรายกลุ่มงานและหอผู้ป่วย (Clinical Case Density Map)"
    >
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F766E]">
            <Compass className="w-4 h-4" aria-hidden="true" />
            <span>CLINICAL CASE DENSITY MAP</span>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mt-1">
            แผนผังความหนาแน่นเวลาปฏิบัติงานและเคสทางคลินิกตามกลุ่มงานและหอผู้ป่วย
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            วิเคราะห์กลุ่มงานและหอผู้ป่วยที่นักศึกษาใช้เวลาและบันทึกเคสมากที่สุด เพื่อระบุสาขาที่ยังขาดประสบการณ์คลินิก
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setMetricMode('combined')}
              className={`px-3 py-1.5 min-h-[38px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                metricMode === 'combined'
                  ? 'bg-white text-[#0F2A4A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              เวลา + เคสรวม
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('hours')}
              className={`px-3 py-1.5 min-h-[38px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                metricMode === 'hours'
                  ? 'bg-white text-[#0F2A4A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ชั่วโมงปฏิบัติงาน
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('cases')}
              className={`px-3 py-1.5 min-h-[38px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                metricMode === 'cases'
                  ? 'bg-white text-[#0F2A4A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              จำนวนเคส
            </button>
          </div>

          <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('treemap')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                viewMode === 'treemap'
                  ? 'bg-white text-[#0F2A4A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Treemap</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                viewMode === 'matrix'
                  ? 'bg-white text-[#0F2A4A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid2x2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Heat Grid</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4-Column Exposure Density Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border border-slate-200 rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-slate-200 bg-slate-50/60">
        <div className="p-4 sm:p-5">
          <div className="text-xs text-slate-500">กลุ่มงานที่มีเวลาและเคสสูงสุด</div>
          <div className="mt-1 text-base sm:text-lg font-bold text-[#0F2A4A] leading-snug">
            {summaryStats.topDept?.shortTh ?? '-'}
          </div>
          <div className="mt-1 text-xs text-slate-600 tabular-nums">
            {summaryStats.topDept
              ? `${summaryStats.topDept.totalTimeHours} ชม. · ${summaryStats.topDept.caseCount} เคส`
              : 'ยังไม่มีข้อมูล'}
          </div>
        </div>

        <div className="p-4 sm:p-5 border-l border-slate-200 lg:border-l-0">
          <div className="text-xs text-slate-500">หอผู้ป่วยที่ปฏิบัติงานมากที่สุด</div>
          <div className="mt-1 text-sm sm:text-base font-bold text-[#0F766E] leading-snug truncate">
            {summaryStats.topWard?.wardName ?? 'ยังไม่มีการลงเวลา'}
          </div>
          <div className="mt-1 text-xs text-slate-600 tabular-nums">
            {summaryStats.topWard
              ? `${summaryStats.topWard.hours} ชม. · ${summaryStats.topWard.deptShort}`
              : 'สแกน QR เข้าเวรเพื่อเริ่มบันทึก'}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="text-xs text-slate-500">ความครอบคลุมกลุ่มงานทั้งหมด</div>
          <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
            {summaryStats.coveredDeptCount} / {CLINICAL_DEPARTMENTS.length}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            กลุ่มงานที่มีการบันทึกจริง
          </div>
        </div>

        <div className="p-4 sm:p-5 border-l border-slate-200 lg:border-l-0">
          <div className="text-xs text-slate-500">กลุ่มงานที่ควรเพิ่มประสบการณ์</div>
          <div className="mt-1 text-2xl font-bold text-amber-800 tabular-nums">
            {summaryStats.gapDeptCount} กลุ่มงาน
          </div>
          <div className="mt-1 text-xs text-slate-500 truncate">
            {summaryStats.gapDepts.length > 0
              ? `เช่น ${summaryStats.gapDepts
                  .slice(0, 2)
                  .map((d) => d.shortTh)
                  .join(', ')}`
              : 'ครบทุกกลุ่มงานแล้ว'}
          </div>
        </div>
      </div>

      {/* Main Visualization (7 cols) + Ward Drilldown Inspector (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                {viewMode === 'treemap'
                  ? 'แผนผังสัดส่วนความหนาแน่น 12 กลุ่มงานคลินิก (คลิกเพื่อดูหอผู้ป่วย)'
                  : 'ตารางระดับความเข้มข้นรายกลุ่มงาน (12-Department Exposure Matrix)'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                ขนาดพื้นที่และสีแสดงความหนาแน่นของชั่วโมงปฏิบัติงานและจำนวนเคสในแต่ละกลุ่มงาน
              </p>
            </div>
          </div>

          {viewMode === 'treemap' ? (
            <div className="h-[310px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <Treemap
                  data={treemapData}
                  dataKey="size"
                  nameKey="name"
                  aspectRatio={4 / 3}
                  isAnimationActive={false}
                  content={renderTreemapCell}
                >
                  <Tooltip
                    content={({ payload }) => {
                      const node = payload?.[0]?.payload as
                        | { record?: DepartmentDensityRecord }
                        | undefined;
                      const rec = node?.record;
                      if (!rec) return null;
                      return (
                        <div className="bg-white border border-slate-300 rounded-lg p-3 shadow-sm text-xs space-y-1">
                          <div className="font-semibold text-slate-900">
                            {rec.department}
                          </div>
                          <div className="text-slate-600 tabular-nums">
                            เวลาสะสม: <strong className="text-slate-900">{rec.totalTimeHours} ชม.</strong> · E-Logbook:{' '}
                            <strong className="text-slate-900">{rec.caseCount} เคส</strong>
                          </div>
                          <div className="text-slate-500 tabular-nums">
                            เช็กอินข้างเตียง {rec.bedsideCount} ครั้ง · หอผู้ป่วย{' '}
                            {rec.visitedWardCount}/{rec.totalWardCount} แห่ง
                          </div>
                        </div>
                      );
                    }}
                  />
                </Treemap>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {departmentRecords.map((rec) => {
                const isSelected = rec.department === selectedRecord?.department;
                const isZero = rec.densityIndex === 0;
                return (
                  <button
                    key={rec.id}
                    type="button"
                    onClick={() => setSelectedDeptName(rec.department)}
                    className={`p-3 rounded-lg border text-left transition-colors cursor-pointer space-y-1.5 ${
                      isSelected
                        ? 'ring-2 ring-amber-500 border-amber-500'
                        : isZero
                          ? 'border-dashed border-slate-300 hover:border-slate-400'
                          : 'border-slate-200 hover:border-slate-400'
                    }`}
                    style={{
                      backgroundColor: isZero ? '#F8FAFC' : rec.fillColor,
                      color: rec.textColor,
                    }}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <span className="text-xs font-semibold leading-snug">
                        {rec.shortTh}
                      </span>
                      <span
                        className={`text-[11px] font-mono tabular-nums shrink-0 ${
                          isZero ? 'text-amber-800 font-semibold' : 'opacity-90'
                        }`}
                      >
                        {rec.totalTimeHours} ชม.
                      </span>
                    </div>
                    <div
                      className={`text-[11px] tabular-nums ${
                        isZero ? 'text-slate-500' : 'opacity-85'
                      }`}
                    >
                      {rec.caseCount} เคส · {rec.bedsideCount} ข้างเตียง ·{' '}
                      {rec.visitedWardCount}/{rec.totalWardCount} วอร์ด
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Color Intensity Legend */}
          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-200 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-[#0F2A4A]" aria-hidden="true" />
              <span>ความหนาแน่นสูง</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-[#0F766E]" aria-hidden="true" />
              <span>ปานกลาง</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-[#0284C7]" aria-hidden="true" />
              <span>เริ่มต้น</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-xs bg-slate-100 border border-dashed border-slate-400"
                aria-hidden="true"
              />
              <span>ยังไม่มีบันทึก (ควรเพิ่มประสบการณ์)</span>
            </span>
          </div>
        </div>

        {/* Right 5 cols: Selected Department & Ward Drilldown Inspector */}
        {selectedRecord && (
          <div className="lg:col-span-5 border border-slate-200 rounded-xl p-5 space-y-4 bg-slate-50/60">
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-200">
              <div>
                <div className="text-xs font-medium text-[#0F766E]">
                  ชั้นปีที่ {selectedRecord.yearLevel} · เกณฑ์หมุนเวียน{' '}
                  {selectedRecord.expectedWeeks} สัปดาห์
                </div>
                <h3 className="text-base font-semibold text-slate-900 mt-0.5">
                  {selectedRecord.department}
                </h3>
                <div className="text-xs text-slate-500">{selectedRecord.nameEn}</div>
              </div>
              <span
                className={`text-xs font-semibold whitespace-nowrap shrink-0 ${
                  selectedRecord.densityIndex === 0
                    ? 'text-amber-800'
                    : 'text-[#0F2A4A]'
                }`}
              >
                {selectedRecord.tierLabel}
              </span>
            </div>

            {/* Department Numeric Breakdown */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                <div className="text-base font-bold text-[#0F2A4A] tabular-nums">
                  {selectedRecord.totalTimeHours} ชม.
                </div>
                <div className="text-[11px] text-slate-500">เวลาปฏิบัติจริง</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                <div className="text-base font-bold text-[#0F766E] tabular-nums">
                  {selectedRecord.caseCount} เคส
                </div>
                <div className="text-[11px] text-slate-500">
                  รับรองแล้ว {selectedRecord.approvedCaseCount}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                <div className="text-base font-bold text-slate-900 tabular-nums">
                  {selectedRecord.visitedWardCount}/{selectedRecord.totalWardCount}
                </div>
                <div className="text-[11px] text-slate-500">หอผู้ป่วยที่เข้าฝึก</div>
              </div>
            </div>

            {/* Ward-Level Time & Check-In Breakdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#0F2A4A]" aria-hidden="true" />
                  หอผู้ป่วยและจุดฝึกปฏิบัติงานในกลุ่มงานนี้
                </span>
                <span className="text-slate-500 font-normal tabular-nums">
                  รอขึ้นเวรล่วงหน้า {selectedRecord.scheduledShiftHours} ชม.
                </span>
              </div>

              <div className="divide-y divide-slate-200 bg-white border border-slate-200 rounded-lg overflow-hidden">
                {selectedRecord.wards.map((ward) => (
                  <div
                    key={ward.wardName}
                    className="px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin
                        className={`w-3.5 h-3.5 shrink-0 ${
                          ward.visited ? 'text-[#0F766E]' : 'text-slate-300'
                        }`}
                        aria-hidden="true"
                      />
                      <span
                        className={`truncate ${
                          ward.visited
                            ? 'font-medium text-slate-900'
                            : 'text-slate-500'
                        }`}
                      >
                        {ward.wardName}
                      </span>
                    </div>
                    <span
                      className={`font-mono tabular-nums shrink-0 ${
                        ward.visited
                          ? 'font-semibold text-[#0F2A4A]'
                          : 'text-amber-700'
                      }`}
                    >
                      {ward.visited
                        ? `${ward.hours} ชม. (${ward.shiftCount + ward.bedsideCount} ครั้ง)`
                        : 'ยังไม่เคยเข้าฝึก'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Exposure Recommendation + Quick Actions */}
            <div className="pt-1 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={onOpenNewLogbook}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] text-xs font-medium text-white bg-[#0F2A4A] hover:bg-[#163B66] rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>บันทึกเคสในกลุ่มงานนี้</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('curriculum')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] text-xs font-medium text-[#0F2A4A] bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>ดูตารางเวรและข้างเตียง</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
