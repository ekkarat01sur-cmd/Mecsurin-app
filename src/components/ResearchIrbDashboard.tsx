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
import { BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { ResearchProject } from '../types/medicalSchool';

interface ResearchIrbDashboardProps {
  projects: ResearchProject[];
  selectedYear: string;
  onSelectYear: (year: string) => void;
}

interface StatusSlice {
  name: string;
  key: ResearchProject['status'];
  value: number;
  pct: number;
  color: string;
}

interface YearSummaryRow {
  year: string;
  yearLabel: string;
  total: number;
  irbApprovedOnly: number;
  published: number;
  irbPassedTotal: number;
  pendingData: number;
  irbPassRate: number;
  color: string;
}

const STATUS_META: Record<
  ResearchProject['status'],
  { label: string; shortLabel: string; color: string }
> = {
  'ผ่านจริยธรรมการวิจัย (IRB)': {
    label: 'ผ่านจริยธรรมการวิจัย (IRB)',
    shortLabel: 'ผ่าน IRB แล้ว',
    color: '#0F2A4A',
  },
  'ตีพิมพ์/นำเสนอแล้ว': {
    label: 'ตีพิมพ์/นำเสนอแล้ว (ผ่าน IRB)',
    shortLabel: 'ตีพิมพ์/นำเสนอ',
    color: '#0F766E',
  },
  'กำลังเก็บข้อมูล': {
    label: 'อยู่ระหว่างพิจารณา IRB / เก็บข้อมูล',
    shortLabel: 'กำลังดำเนินการ',
    color: '#D97706',
  },
};

const YEAR_COLORS = ['#0F2A4A', '#0F766E', '#475569', '#B45309', '#334155'];

export function ResearchIrbDashboard({
  projects,
  selectedYear,
  onSelectYear,
}: ResearchIrbDashboardProps) {
  const [annualChartMode, setAnnualChartMode] = useState<'pie' | 'bar'>('pie');

  const availableYears = useMemo(() => {
    const set = new Set(projects.map((p) => p.year));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [projects]);

  const scopedProjects = useMemo(() => {
    if (selectedYear === 'ทั้งหมด') return projects;
    return projects.filter((p) => p.year === selectedYear);
  }, [projects, selectedYear]);

  const stats = useMemo(() => {
    const total = scopedProjects.length;
    const irbOnly = scopedProjects.filter(
      (p) => p.status === 'ผ่านจริยธรรมการวิจัย (IRB)'
    ).length;
    const published = scopedProjects.filter(
      (p) => p.status === 'ตีพิมพ์/นำเสนอแล้ว'
    ).length;
    const pending = scopedProjects.filter(
      (p) => p.status === 'กำลังเก็บข้อมูล'
    ).length;
    const totalIrbApproved = irbOnly + published;
    const irbPassRate = total > 0 ? Math.round((totalIrbApproved / total) * 1000) / 10 : 0;

    return {
      total,
      irbOnly,
      published,
      pending,
      totalIrbApproved,
      irbPassRate,
    };
  }, [scopedProjects]);

  const statusPieData: StatusSlice[] = useMemo(() => {
    const statuses: ResearchProject['status'][] = [
      'ผ่านจริยธรรมการวิจัย (IRB)',
      'ตีพิมพ์/นำเสนอแล้ว',
      'กำลังเก็บข้อมูล',
    ];
    const total = Math.max(1, scopedProjects.length);
    return statuses
      .map((st) => {
        const count = scopedProjects.filter((p) => p.status === st).length;
        return {
          name: STATUS_META[st].label,
          key: st,
          value: count,
          pct: scopedProjects.length > 0 ? Math.round((count / total) * 1000) / 10 : 0,
          color: STATUS_META[st].color,
        };
      })
      .filter((item) => item.value > 0);
  }, [scopedProjects]);

  const yearlyRows: YearSummaryRow[] = useMemo(() => {
    const ascYears = [...availableYears].sort((a, b) => a.localeCompare(b));
    return ascYears.map((yr, idx) => {
      const list = projects.filter((p) => p.year === yr);
      const irbApprovedOnly = list.filter(
        (p) => p.status === 'ผ่านจริยธรรมการวิจัย (IRB)'
      ).length;
      const published = list.filter((p) => p.status === 'ตีพิมพ์/นำเสนอแล้ว').length;
      const pendingData = list.filter((p) => p.status === 'กำลังเก็บข้อมูล').length;
      const irbPassedTotal = irbApprovedOnly + published;
      const total = list.length;
      return {
        year: yr,
        yearLabel: `ปี ${yr}`,
        total,
        irbApprovedOnly,
        published,
        irbPassedTotal,
        pendingData,
        irbPassRate: total > 0 ? Math.round((irbPassedTotal / total) * 1000) / 10 : 0,
        color: YEAR_COLORS[idx % YEAR_COLORS.length],
      };
    });
  }, [availableYears, projects]);

  const totalAllYears = Math.max(1, projects.length);

  return (
    <section
      className="bg-white border border-slate-200 rounded-xl p-6 space-y-6"
      aria-label="แดชบอร์ดสถิติโครงการวิจัยและการอนุมัติจริยธรรมการวิจัย IRB"
    >
      {/* Dashboard Header + Year Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            แดชบอร์ดสถิติการส่งโครงการวิจัยรายปีและการอนุมัติจริยธรรม (IRB Analytics)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ติดตามจำนวนโครงการวิจัย R2R และงานวิจัยนักศึกษาแพทย์ที่ยื่นขอรับรองจริยธรรมการวิจัยในมนุษย์ โรงพยาบาลสุรินทร์
          </p>
        </div>

        <div className="inline-flex flex-wrap items-center p-1 bg-slate-100 rounded-lg self-start lg:self-auto">
          {(['ทั้งหมด', ...availableYears] as const).map((yr) => (
            <button
              key={yr}
              type="button"
              onClick={() => onSelectYear(yr)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                selectedYear === yr
                  ? 'bg-white text-[#0F2A4A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {yr === 'ทั้งหมด' ? 'ทุกปีการศึกษา' : `ปี ${yr}`}
            </button>
          ))}
        </div>
      </div>

      {/* 4 KPI Summary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border border-slate-200 rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-slate-200 bg-slate-50/60">
        <div className="p-4 sm:p-5">
          <div className="text-xs text-slate-500">
            โครงการวิจัยทั้งหมด ({selectedYear === 'ทั้งหมด' ? 'สะสมทุกปี' : `ปี ${selectedYear}`})
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
            {stats.total} โครงการ
          </div>
          <div className="mt-1 text-xs text-slate-500">รวมทุกกลุ่มงานคลินิกและชุมชน</div>
        </div>

        <div className="p-4 sm:p-5 border-l border-slate-200 lg:border-l-0">
          <div className="text-xs text-slate-500">ผ่านการอนุมัติ IRB แล้ว</div>
          <div className="mt-1 text-2xl font-bold text-[#0F2A4A] tabular-nums">
            {stats.totalIrbApproved} โครงการ
          </div>
          <div className="mt-1 text-xs text-slate-500 tabular-nums">
            อนุมัติ IRB {stats.irbOnly} · ตีพิมพ์/นำเสนอแล้ว {stats.published}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="text-xs text-slate-500">กำลังเก็บข้อมูล / รอพิจารณา</div>
          <div className="mt-1 text-2xl font-bold text-amber-700 tabular-nums">
            {stats.pending} โครงการ
          </div>
          <div className="mt-1 text-xs text-slate-500">อยู่ระหว่างดำเนินการวิจัย</div>
        </div>

        <div className="p-4 sm:p-5 border-l border-slate-200 lg:border-l-0">
          <div className="text-xs text-slate-500">อัตราการผ่านอนุมัติ IRB</div>
          <div className="mt-1 text-2xl font-bold text-emerald-700 tabular-nums">
            {stats.irbPassRate.toFixed(1)}%
          </div>
          <div className="mt-1 text-xs text-slate-500">สัดส่วนโครงการที่ผ่านเกณฑ์จริยธรรม</div>
        </div>
      </div>

      {/* Dual Recharts Visualization Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Recharts PieChart for IRB Approval Status */}
        <div className="lg:col-span-6 border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                สัดส่วนสถานะการอนุมัติ IRB ของโครงการวิจัย
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedYear === 'ทั้งหมด'
                  ? `ข้อมูลสะสมทั้งหมด ${stats.total} โครงการ`
                  : `เฉพาะปีการศึกษา ${selectedYear} (${stats.total} โครงการ)`}
              </p>
            </div>
            <span className="text-xs font-mono text-[#0F766E] tabular-nums">
              IRB Pass {stats.irbPassRate.toFixed(1)}%
            </span>
          </div>

          {statusPieData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-500">
              ยังไม่มีข้อมูลโครงการวิจัยในปีการศึกษาที่เลือก
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <div className="sm:col-span-6 h-60 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={84}
                      paddingAngle={2}
                      stroke="#FFFFFF"
                      strokeWidth={2}
                    >
                      {statusPieData.map((entry) => (
                        <Cell key={entry.key} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: unknown, name: unknown) => [
                        `${String(val)} โครงการ`,
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
                    {stats.total}
                  </span>
                  <span className="text-[11px] text-slate-500">โครงการ</span>
                </div>
              </div>

              <div className="sm:col-span-6 divide-y divide-slate-200 text-xs">
                {statusPieData.map((item) => (
                  <div key={item.key} className="py-2.5 first:pt-0 last:pb-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 font-medium text-slate-800">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: item.color }}
                          aria-hidden="true"
                        />
                        <span>{STATUS_META[item.key].shortLabel}</span>
                      </span>
                      <span className="font-mono font-semibold text-slate-900 tabular-nums">
                        {item.value} ({item.pct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 pl-4.5">
                      {STATUS_META[item.key].label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Yearly Submissions & IRB Approval Chart (Recharts PieChart + BarChart Toggle) */}
        <div className="lg:col-span-6 border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                สถิติการส่งโครงการวิจัยรายปี และจำนวนที่ผ่าน IRB
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                เปรียบเทียบปริมาณงานวิจัยที่ส่งเข้าสู่ระบบในแต่ละปีการศึกษา
              </p>
            </div>

            <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setAnnualChartMode('pie')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer whitespace-nowrap shrink-0 ${
                  annualChartMode === 'pie'
                    ? 'bg-white text-[#0F2A4A] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PieChartIcon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>กราฟวงกลม</span>
              </button>
              <button
                type="button"
                onClick={() => setAnnualChartMode('bar')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer whitespace-nowrap shrink-0 ${
                  annualChartMode === 'bar'
                    ? 'bg-white text-[#0F2A4A] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>เทียบผ่าน IRB รายปี</span>
              </button>
            </div>
          </div>

          {yearlyRows.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-500">
              ยังไม่มีข้อมูลโครงการวิจัย
            </div>
          ) : annualChartMode === 'pie' ? (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <div className="sm:col-span-6 h-60 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={yearlyRows}
                      dataKey="total"
                      nameKey="yearLabel"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={84}
                      paddingAngle={2}
                      stroke="#FFFFFF"
                      strokeWidth={2}
                    >
                      {yearlyRows.map((entry) => (
                        <Cell
                          key={entry.year}
                          fill={entry.color}
                          opacity={
                            selectedYear === 'ทั้งหมด' || selectedYear === entry.year ? 1 : 0.4
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: unknown, name: unknown) => [
                        `ส่งทั้งหมด ${String(val)} โครงการ`,
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
                    {projects.length}
                  </span>
                  <span className="text-[11px] text-slate-500">รวมทุกปี</span>
                </div>
              </div>

              <div className="sm:col-span-6 divide-y divide-slate-200 text-xs">
                {yearlyRows.map((yr) => {
                  const sharePct = Math.round((yr.total / totalAllYears) * 1000) / 10;
                  return (
                    <button
                      key={yr.year}
                      type="button"
                      onClick={() =>
                        onSelectYear(selectedYear === yr.year ? 'ทั้งหมด' : yr.year)
                      }
                      className="w-full text-left py-2.5 first:pt-0 last:pb-0 space-y-0.5 hover:bg-slate-50 rounded px-1.5 -mx-1.5 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-2 font-semibold text-slate-900">
                          <span
                            className="w-2.5 h-2.5 rounded-xs shrink-0"
                            style={{ backgroundColor: yr.color }}
                            aria-hidden="true"
                          />
                          <span>ปีการศึกษา {yr.year}</span>
                        </span>
                        <span className="font-mono font-semibold text-slate-900 tabular-nums">
                          {yr.total} โครงการ ({sharePct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 pl-4.5 tabular-nums">
                        ผ่าน IRB {yr.irbPassedTotal} / {yr.total} โครงการ ({yr.irbPassRate.toFixed(0)}%)
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={yearlyRows}
                  margin={{ top: 10, right: 12, left: -16, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="yearLabel"
                    tick={{ fontSize: 12, fill: '#475569' }}
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
                    contentStyle={{
                      borderRadius: '8px',
                      borderColor: '#CBD5E1',
                      fontSize: '12px',
                    }}
                  />
                  <Bar
                    dataKey="total"
                    name="โครงการที่ส่งทั้งหมด"
                    fill="#94A3B8"
                    radius={[4, 4, 0, 0]}
                    barSize={26}
                  />
                  <Bar
                    dataKey="irbPassedTotal"
                    name="ผ่านอนุมัติ IRB / ตีพิมพ์แล้ว"
                    fill="#0F766E"
                    radius={[4, 4, 0, 0]}
                    barSize={26}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Yearly Breakdown Summary Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
              <th className="py-2.5 px-4">ปีการศึกษา</th>
              <th className="py-2.5 px-3 text-right">ส่งโครงการทั้งหมด</th>
              <th className="py-2.5 px-3 text-right">ผ่านจริยธรรม (IRB)</th>
              <th className="py-2.5 px-3 text-right">ตีพิมพ์ / นำเสนอแล้ว</th>
              <th className="py-2.5 px-3 text-right">กำลังเก็บข้อมูล</th>
              <th className="py-2.5 px-4 text-right">อัตราผ่าน IRB รวม (%)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {yearlyRows.map((row) => (
              <tr key={row.year} className="hover:bg-slate-50/70">
                <td className="py-2.5 px-4 font-semibold text-slate-900 tabular-nums">
                  ปีการศึกษา {row.year}
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-900">
                  {row.total}
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#0F2A4A] font-medium">
                  {row.irbApprovedOnly}
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#0F766E] font-medium">
                  {row.published}
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-amber-700">
                  {row.pendingData}
                </td>
                <td className="py-2.5 px-4 text-right font-mono font-semibold tabular-nums text-emerald-700">
                  {row.irbPassRate.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
