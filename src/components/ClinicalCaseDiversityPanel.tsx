import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowRight,
  BarChart3,
  PieChart as PieChartIcon,
  Plus,
  Scale,
} from 'lucide-react';
import { CLINICAL_DEPARTMENTS } from '../data/initialMedicalData';
import { LogbookEntry } from '../types/medicalSchool';

interface ClinicalCaseDiversityPanelProps {
  logbookEntries: LogbookEntry[];
  onOpenNewLogbook: () => void;
  onNavigateLogbook: () => void;
}

interface DepartmentRow {
  department: string;
  shortTh: string;
  shortEn: string;
  axisLabel: string;
  total: number;
  approved: number;
  pendingOrRevision: number;
  pct: number;
  color: string;
}

const CORE_ROTATION_META: Array<{
  department: string;
  shortTh: string;
  shortEn: string;
  color: string;
}> = [
  {
    department: 'กลุ่มงานอายุรศาสตร์',
    shortTh: 'อายุรศาสตร์',
    shortEn: 'Medicine',
    color: '#0F2A4A',
  },
  {
    department: 'กลุ่มงานศัลยศาสตร์',
    shortTh: 'ศัลยศาสตร์',
    shortEn: 'Surgery',
    color: '#0F766E',
  },
  {
    department: 'กลุ่มงานเวชศาสตร์ฉุกเฉิน',
    shortTh: 'เวชศาสตร์ฉุกเฉิน',
    shortEn: 'ER',
    color: '#D97706',
  },
  {
    department: 'กลุ่มงานกุมารเวชศาสตร์',
    shortTh: 'กุมารเวชศาสตร์',
    shortEn: 'Pediatrics',
    color: '#1D4ED8',
  },
  {
    department: 'กลุ่มงานสูติศาสตร์-นรีเวชวิทยา',
    shortTh: 'สูติ-นรีเวชฯ',
    shortEn: 'OB-GYN',
    color: '#475569',
  },
  {
    department: 'กลุ่มงานออร์โธปิดิกส์',
    shortTh: 'ออร์โธปิดิกส์',
    shortEn: 'Ortho',
    color: '#0284C7',
  },
];

const EXTRA_PALETTE = ['#334155', '#B45309', '#0D9488', '#64748B', '#1E3A8A'];

const SETTING_META: Array<{
  key: LogbookEntry['setting'];
  label: string;
  color: string;
}> = [
  { key: 'IPD', label: 'หอผู้ป่วยใน (IPD)', color: '#0F2A4A' },
  { key: 'ER', label: 'ห้องฉุกเฉิน (ER)', color: '#D97706' },
  { key: 'OR', label: 'ห้องผ่าตัด (OR)', color: '#0F766E' },
  { key: 'LR', label: 'ห้องคลอด (LR)', color: '#475569' },
  { key: 'OPD', label: 'ผู้ป่วยนอก (OPD)', color: '#1D4ED8' },
];

const ROLE_META: Array<{
  key: LogbookEntry['role'];
  label: string;
}> = [
  { key: 'Perform', label: 'ปฏิบัติเอง (Perform)' },
  { key: 'Assist', label: 'ผู้ช่วยทำ (Assist)' },
  { key: 'Observe', label: 'สังเกตการณ์ (Observe)' },
];

function resolveDepartmentLabels(departmentName: string, fallbackIdx: number) {
  const core = CORE_ROTATION_META.find((item) => item.department === departmentName);
  if (core) return core;

  const catalog = CLINICAL_DEPARTMENTS.find((d) => d.nameTh === departmentName);
  const shortTh = departmentName.replace(/^กลุ่มงาน/, '').trim() || departmentName;
  const shortEn = catalog ? catalog.nameEn.split(' ')[0] : 'Clinical';
  return {
    department: departmentName,
    shortTh,
    shortEn,
    color: EXTRA_PALETTE[fallbackIdx % EXTRA_PALETTE.length],
  };
}

export function ClinicalCaseDiversityPanel({
  logbookEntries,
  onOpenNewLogbook,
  onNavigateLogbook,
}: ClinicalCaseDiversityPanelProps) {
  const [statusScope, setStatusScope] = useState<'all' | 'approved'>('all');
  const [chartMode, setChartMode] = useState<'pie' | 'bar'>('pie');

  const scopedEntries = useMemo(() => {
    if (statusScope === 'approved') {
      return logbookEntries.filter((entry) => entry.status === 'approved');
    }
    return logbookEntries;
  }, [logbookEntries, statusScope]);

  const {
    pieSlices,
    barRows,
    coveredCoreCount,
    missingCoreRotations,
    lowestCoreRotation,
    topRotation,
    settingRows,
    roleRows,
    balanceScore,
  } = useMemo(() => {
    const total = scopedEntries.length;
    const deptMap = new Map<
      string,
      { total: number; approved: number; pendingOrRevision: number }
    >();

    for (const core of CORE_ROTATION_META) {
      deptMap.set(core.department, { total: 0, approved: 0, pendingOrRevision: 0 });
    }

    for (const entry of scopedEntries) {
      const prev = deptMap.get(entry.department) ?? {
        total: 0,
        approved: 0,
        pendingOrRevision: 0,
      };
      prev.total += 1;
      if (entry.status === 'approved') {
        prev.approved += 1;
      } else {
        prev.pendingOrRevision += 1;
      }
      deptMap.set(entry.department, prev);
    }

    const allRows: DepartmentRow[] = Array.from(deptMap.entries()).map(
      ([dept, counts], idx) => {
        const meta = resolveDepartmentLabels(dept, idx);
        return {
          department: dept,
          shortTh: meta.shortTh,
          shortEn: meta.shortEn,
          axisLabel: meta.shortEn,
          total: counts.total,
          approved: counts.approved,
          pendingOrRevision: counts.pendingOrRevision,
          pct: total > 0 ? Math.round((counts.total / total) * 1000) / 10 : 0,
          color: meta.color,
        };
      }
    );

    const activePieSlices = allRows
      .filter((row) => row.total > 0)
      .sort((a, b) => b.total - a.total);

    // Show core rotations + any extra recorded departments in the bar comparison
    const comparisonRows = allRows.filter(
      (row) =>
        row.total > 0 ||
        CORE_ROTATION_META.some((core) => core.department === row.department)
    );

    const coreRows = CORE_ROTATION_META.map((core) => {
      const found = allRows.find((r) => r.department === core.department);
      return (
        found ?? {
          department: core.department,
          shortTh: core.shortTh,
          shortEn: core.shortEn,
          axisLabel: core.shortEn,
          total: 0,
          approved: 0,
          pendingOrRevision: 0,
          pct: 0,
          color: core.color,
        }
      );
    });

    const coveredCore = coreRows.filter((r) => r.total > 0).length;
    const missingCore = coreRows.filter((r) => r.total === 0);
    const sortedActive = [...activePieSlices];
    const top = sortedActive[0] ?? null;
    const lowestNonZero =
      missingCore.length === 0 && coreRows.length > 0
        ? [...coreRows].sort((a, b) => a.total - b.total)[0]
        : null;

    // Normalized Shannon evenness across covered + core rotations to give an intuitive 0-100% balance score
    let computedBalance = 0;
    if (total > 0 && activePieSlices.length > 0) {
      const k = Math.max(CORE_ROTATION_META.length, activePieSlices.length);
      const entropy = activePieSlices.reduce((acc, row) => {
        const p = row.total / total;
        return acc - (p > 0 ? p * Math.log(p) : 0);
      }, 0);
      computedBalance = Math.round((entropy / Math.log(k)) * 100);
    }

    const sRows = SETTING_META.map((s) => {
      const count = scopedEntries.filter((e) => e.setting === s.key).length;
      return {
        ...s,
        count,
        pct: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      };
    });

    const rRows = ROLE_META.map((r) => {
      const count = scopedEntries.filter((e) => e.role === r.key).length;
      return {
        ...r,
        count,
        pct: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      };
    });

    return {
      pieSlices: activePieSlices,
      barRows: comparisonRows,
      coveredCoreCount: coveredCore,
      missingCoreRotations: missingCore,
      lowestCoreRotation: lowestNonZero,
      topRotation: top,
      settingRows: sRows,
      roleRows: rRows,
      balanceScore: computedBalance,
    };
  }, [scopedEntries]);

  const underrepresentedText =
    missingCoreRotations.length > 0
      ? missingCoreRotations.map((r) => `${r.shortTh} (${r.shortEn})`).join(', ')
      : lowestCoreRotation
        ? `${lowestCoreRotation.shortTh} (${lowestCoreRotation.total} เคส)`
        : 'ครบทุกกลุ่มงานหลักแล้ว';

  const missingSettings = settingRows.filter((s) => s.count === 0).map((s) => s.key);

  return (
    <section
      className="bg-white border border-slate-200 rounded-xl p-6 sm:p-7 space-y-6"
      aria-label="ความหลากหลายของประสบการณ์เคสทางคลินิก (Clinical Case Diversity)"
    >
      {/* Header + Interactive Scope/Chart Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F766E]">
            <Scale className="w-3.5 h-3.5" aria-hidden="true" />
            <span>E-LOGBOOK EXPOSURE BALANCE</span>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mt-1">
            ความหลากหลายของเคสทางคลินิก (Clinical Case Diversity)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            ติดตามสัดส่วนการบันทึกเคสจาก E-Logbook แยกตามกลุ่มงานหลักและบริบทการดูแลผู้ป่วย เพื่อปรับสมดุลประสบการณ์ทางคลินิก
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setStatusScope('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                statusScope === 'all'
                  ? 'bg-white text-[#0F2A4A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ทุกเคส ({logbookEntries.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusScope('approved')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                statusScope === 'approved'
                  ? 'bg-white text-[#0F2A4A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              รับรองแล้ว (
              {logbookEntries.filter((e) => e.status === 'approved').length})
            </button>
          </div>

          <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setChartMode('pie')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                chartMode === 'pie'
                  ? 'bg-white text-[#0F2A4A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PieChartIcon className="w-3.5 h-3.5" aria-hidden="true" />
              <span>สัดส่วนวงกลม</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMode('bar')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                chartMode === 'bar'
                  ? 'bg-white text-[#0F2A4A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>เทียบรายกลุ่มงาน</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4-Column Exposure Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border border-slate-200 rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-slate-200 bg-slate-50/60">
        <div className="p-4 sm:p-5">
          <div className="text-xs text-slate-500">
            เคสทางคลินิกที่บันทึก ({statusScope === 'all' ? 'ทั้งหมด' : 'รับรองแล้ว'})
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
            {scopedEntries.length} เคส
          </div>
          <div className="mt-1 text-xs text-slate-500 tabular-nums">
            กระจายใน {pieSlices.length} กลุ่มงานคลินิก
          </div>
        </div>

        <div className="p-4 sm:p-5 border-l border-slate-200 lg:border-l-0">
          <div className="text-xs text-slate-500">ความครอบคลุมกลุ่มงานหลัก</div>
          <div className="mt-1 text-2xl font-bold text-[#0F2A4A] tabular-nums">
            {coveredCoreCount} / {CORE_ROTATION_META.length} กลุ่มงาน
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Med · Surg · ER · Ped · OB-GYN · Ortho
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="text-xs text-slate-500">ดัชนีสมดุลความหลากหลาย</div>
          <div className="mt-1 text-2xl font-bold text-[#0F766E] tabular-nums">
            {balanceScore}%
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {topRotation
              ? `สูงสุด: ${topRotation.shortEn} (${topRotation.total} เคส)`
              : 'ยังไม่มีเคสในตัวกรองนี้'}
          </div>
        </div>

        <div className="p-4 sm:p-5 border-l border-slate-200 lg:border-l-0">
          <div className="text-xs text-slate-500">กลุ่มงานที่ควรเพิ่มประสบการณ์</div>
          <div className="mt-1 text-sm sm:text-base font-semibold text-amber-800 leading-snug">
            {missingCoreRotations.length > 0
              ? `${missingCoreRotations[0].shortTh} (0 เคส)`
              : lowestCoreRotation
                ? `${lowestCoreRotation.shortTh} (${lowestCoreRotation.total} เคส)`
                : 'สมดุลครบถ้วน'}
          </div>
          <div className="mt-1 text-xs text-slate-500 tabular-nums">
            {missingCoreRotations.length > 1
              ? `และอีก ${missingCoreRotations.length - 1} กลุ่มงานที่ยังไม่มีบันทึก`
              : 'แนะนำให้บันทึกเคสเพิ่มเพื่อความสมดุล'}
          </div>
        </div>
      </div>

      {/* Main Chart + Setting & Balance Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 cols: Recharts Pie / Bar Visualization */}
        <div className="lg:col-span-7 border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                {chartMode === 'pie'
                  ? 'สัดส่วนเคสทางคลินิกแยกตามกลุ่มงาน (Department Distribution)'
                  : 'เปรียบเทียบจำนวนเคสและสถานะการรับรองรายกลุ่มงาน'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {chartMode === 'pie'
                  ? 'แสดงร้อยละของประสบการณ์ผู้ป่วยในแต่ละสาขาวิชาหลัก'
                  : 'แสดงจำนวนเคสทั้งหมดเทียบเคียงระหว่างกลุ่มงานหลัก (รวมสาขาที่ยังเป็น 0 เคส)'}
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500 tabular-nums">
              N = {scopedEntries.length}
            </span>
          </div>

          {scopedEntries.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-center px-4">
              <p className="text-sm text-slate-500">
                ยังไม่มีข้อมูลเคสในตัวกรอง &ldquo;รับรองแล้ว&rdquo; สำหรับแสดงผลกราฟ
              </p>
              <button
                type="button"
                onClick={() => setStatusScope('all')}
                className="px-3 py-1.5 text-xs font-medium text-[#0F2A4A] bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                แสดงทุกเคสใน E-Logbook
              </button>
            </div>
          ) : chartMode === 'pie' ? (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
              <div className="sm:col-span-6 h-64 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieSlices}
                      dataKey="total"
                      nameKey="shortTh"
                      cx="50%"
                      cy="50%"
                      innerRadius={56}
                      outerRadius={88}
                      paddingAngle={2}
                      stroke="#FFFFFF"
                      strokeWidth={2}
                    >
                      {pieSlices.map((slice) => (
                        <Cell key={slice.department} fill={slice.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: unknown, name: unknown) => [
                        `${String(val)} เคส`,
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
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-slate-900 tabular-nums">
                    {scopedEntries.length}
                  </span>
                  <span className="text-[11px] text-slate-500">เคสทั้งหมด</span>
                </div>
              </div>

              <div className="sm:col-span-6 divide-y divide-slate-200 text-xs">
                {pieSlices.map((slice) => (
                  <div
                    key={slice.department}
                    className="py-2.5 first:pt-0 last:pb-0 space-y-0.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 font-medium text-slate-900 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: slice.color }}
                          aria-hidden="true"
                        />
                        <span className="truncate">{slice.shortTh}</span>
                        <span className="text-slate-400 font-normal shrink-0">
                          ({slice.shortEn})
                        </span>
                      </span>
                      <span className="font-mono font-semibold text-slate-900 tabular-nums shrink-0">
                        {slice.total} ({slice.pct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 pl-4.5 tabular-nums">
                      รับรองแล้ว {slice.approved} · รอประเมิน/แก้ไข {slice.pendingOrRevision} เคส
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={barRows}
                    margin={{ top: 10, right: 12, left: -16, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#E2E8F0"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="axisLabel"
                      tick={{ fontSize: 11, fill: '#475569' }}
                      axisLine={{ stroke: '#CBD5E1' }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(val: unknown, name: unknown) => [
                        `${String(val)} เคส`,
                        String(name),
                      ]}
                      contentStyle={{
                        borderRadius: '8px',
                        borderColor: '#CBD5E1',
                        fontSize: '12px',
                      }}
                    />
                    <Bar
                      dataKey="approved"
                      name="รับรองแล้ว (Approved)"
                      stackId="cases"
                      fill="#0F2A4A"
                      radius={[0, 0, 0, 0]}
                      barSize={28}
                    />
                    <Bar
                      dataKey="pendingOrRevision"
                      name="รอรับรอง / ปรับปรุง (Pending/Revision)"
                      stackId="cases"
                      fill="#D97706"
                      radius={[4, 4, 0, 0]}
                      barSize={28}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-xs bg-[#0F2A4A]"
                    aria-hidden="true"
                  />
                  <span>รับรองแล้ว (Approved)</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-xs bg-[#D97706]"
                    aria-hidden="true"
                  />
                  <span>รอรับรอง / ปรับปรุง</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right 5 cols: Setting Breakdown, Role Mix & Exposure Balance Guidance */}
        <div className="lg:col-span-5 space-y-4">
          {/* Setting Distribution */}
          <div className="border border-slate-200 rounded-xl p-5 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                การกระจายตามบริบทการดูแล (Clinical Setting)
              </h3>
              <span className="text-xs text-slate-500 tabular-nums">
                {settingRows.filter((s) => s.count > 0).length} / {settingRows.length} บริบท
              </span>
            </div>

            <div className="space-y-2.5">
              {settingRows.map((setting) => (
                <div key={setting.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">
                      {setting.label}
                    </span>
                    <span className="font-mono text-slate-900 tabular-nums">
                      {setting.count} เคส ({setting.pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-sm overflow-hidden">
                    <div
                      className="h-full rounded-sm transition-all duration-300"
                      style={{
                        width: `${setting.pct}%`,
                        backgroundColor: setting.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-200 grid grid-cols-3 gap-2 text-center">
              {roleRows.map((roleItem) => (
                <div
                  key={roleItem.key}
                  className="bg-slate-50 border border-slate-200/80 rounded-lg py-2 px-1.5"
                >
                  <div className="text-sm font-semibold text-slate-900 tabular-nums">
                    {roleItem.count}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {roleItem.key}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Exposure Balance Guidance & Quick Actions */}
          <div className="border border-slate-200 bg-slate-50/70 rounded-xl p-5 space-y-3">
            <div className="text-xs font-semibold text-[#0F2A4A]">
              ข้อเสนอแนะเพื่อสมดุลประสบการณ์คลินิก
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {missingCoreRotations.length > 0 ? (
                <>
                  ยังไม่มีบันทึกเคสในกลุ่มงาน:{' '}
                  <strong className="text-slate-900">{underrepresentedText}</strong>
                  {missingSettings.length > 0 && (
                    <>
                      {' '}
                      และบริบท{' '}
                      <strong className="text-slate-900">
                        {missingSettings.join(', ')}
                      </strong>
                    </>
                  )}{' '}
                  ควรวางแผนเก็บเคสเพิ่มเติมระหว่างขึ้นวอร์ดเพื่อครอบคลุมเกณฑ์แพทยสภา
                </>
              ) : (
                <>
                  บันทึกเคสครบทุกกลุ่มงานหลักแล้ว แนะนำให้เสริมเคสใน{' '}
                  <strong className="text-slate-900">{underrepresentedText}</strong>
                  {missingSettings.length > 0
                    ? ` และเพิ่มประสบการณ์ในบริบท ${missingSettings.join(', ')}`
                    : ' เพื่อรักษาความสมดุลต่อเนื่อง'}
                </>
              )}
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={onOpenNewLogbook}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#0F2A4A] hover:bg-[#163B66] rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>บันทึกเคสเพิ่มใน E-Logbook</span>
              </button>
              <button
                type="button"
                onClick={onNavigateLogbook}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#0F2A4A] bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>เปิดดูสมุด E-Logbook</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
