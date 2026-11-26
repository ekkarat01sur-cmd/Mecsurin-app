import { useMemo, useState } from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';
import { CourseGradingConfig, StudentCourseScore } from '../types/medicalSchool';
import { evaluateStudentGrade } from './MplGradingStudio';

interface StudentScoreChartProps {
  studentId: string;
  configs: CourseGradingConfig[];
  studentScores: StudentCourseScore[];
}

type ChartMode = 'line' | 'bar';

interface CourseSeries {
  courseCode: string;
  courseName: string;
  shortName: string;
  color: string;
  mpl: number;
  weightedTotal: number;
  rounds: {
    label: string;
    shortLabel: string;
    score: number | null;
  }[];
}

const COURSE_PALETTE = [
  '#0F2A4A', // Deep Medical Navy
  '#0F766E', // Clinical Teal
  '#B45309', // Warm Amber Ochre
  '#4338CA', // Academic Indigo
];

const SHORT_COURSE_NAMES: Record<string, string> = {
  'SUR-PED-502': 'กุมารเวชศาสตร์',
  'SUR-MED-401': 'อายุรศาสตร์',
  'SUR-SURG-402': 'ศัลยศาสตร์',
  'SUR-OBG-501': 'สูติศาสตร์-นรีเวชฯ',
};

export function StudentScoreChart({
  studentId,
  configs,
  studentScores,
}: StudentScoreChartProps) {
  const [chartMode, setChartMode] = useState<ChartMode>('line');
  const [hiddenCourses, setHiddenCourses] = useState<Record<string, boolean>>({});
  const [hoveredPoint, setHoveredPoint] = useState<{
    courseName: string;
    roundLabel: string;
    score: number;
    mpl: number;
    x: number;
    y: number;
  } | null>(null);
  const [hoveredBar, setHoveredBar] = useState<{
    courseName: string;
    metricLabel: string;
    score: number;
    mpl: number;
  } | null>(null);

  const seriesList: CourseSeries[] = useMemo(() => {
    return configs
      .map((cfg, idx) => {
        const row = studentScores.find(
          (s) => s.studentId === studentId && s.courseCode === cfg.courseCode
        );
        if (!row) return null;
        const evaluated = evaluateStudentGrade(row, cfg);

        // Derive realistic round-by-round progression from live component scores
        const round1 = row.formA; // รอบ 1: Cross-Sectional (OPD/BST)
        const round2 =
          row.formA !== null && row.formB !== null
            ? Math.round(((row.formA + row.formB) / 2) * 10) / 10
            : row.formB; // รอบ 2: Mid-Rotation (SDL/OPL)
        const round3 =
          row.wellBaby !== null && row.formC !== null
            ? Math.round(((row.formC + row.wellBaby) / 2) * 10) / 10
            : row.formC; // รอบ 3: Longitudinal / คลินิกเฉพาะทาง
        const round4 = row.formE; // รอบ 4: เจตคติและสัมพันธภาพ
        const round5 =
          row.osce !== null && row.writtenExam !== null
            ? Math.round(((row.osce + row.writtenExam) / 2) * 10) / 10
            : row.osce ?? row.writtenExam; // รอบ 5: สอบปลายสายงาน (OSCE + ข้อเขียน)

        return {
          courseCode: cfg.courseCode,
          courseName: cfg.courseName,
          shortName: SHORT_COURSE_NAMES[cfg.courseCode] ?? cfg.courseCode,
          color: COURSE_PALETTE[idx % COURSE_PALETTE.length],
          mpl: cfg.mplPercent,
          weightedTotal: evaluated.weightedTotal,
          rounds: [
            { label: 'รอบ 1: สัปดาห์ต้น (Form A)', shortLabel: 'รอบ 1 (Form A)', score: round1 },
            { label: 'รอบ 2: กลางสายงาน (Form B)', shortLabel: 'รอบ 2 (Form B)', score: round2 },
            { label: 'รอบ 3: ต่อเนื่อง (Form C/คลินิก)', shortLabel: 'รอบ 3 (Form C)', score: round3 },
            { label: 'รอบ 4: เจตคติ (Form E)', shortLabel: 'รอบ 4 (Form E)', score: round4 },
            { label: 'รอบ 5: สอบปลายภาค (OSCE/ข้อเขียน)', shortLabel: 'รอบ 5 (OSCE/สอบ)', score: round5 },
            { label: 'สรุปคะแนนรวมสุทธิ (%)', shortLabel: 'รวมสุทธิ', score: evaluated.weightedTotal },
          ],
        };
      })
      .filter((item): item is CourseSeries => item !== null);
  }, [configs, studentScores, studentId]);

  const visibleSeries = seriesList.filter((s) => !hiddenCourses[s.courseCode]);

  const toggleCourse = (code: string) => {
    setHiddenCourses((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  if (seriesList.length === 0) {
    return null;
  }

  // SVG Geometry for Line Chart
  const svgW = 860;
  const svgH = 310;
  const padL = 48;
  const padR = 28;
  const padT = 24;
  const padB = 46;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;
  const yMin = 40;
  const yMax = 100;

  const mapY = (val: number) => {
    const clamped = Math.max(yMin, Math.min(yMax, val));
    return padT + plotH - ((clamped - yMin) / (yMax - yMin)) * plotH;
  };

  const roundCount = seriesList[0].rounds.length;
  const mapX = (idx: number) => {
    if (roundCount <= 1) return padL + plotW / 2;
    return padL + (idx / (roundCount - 1)) * plotW;
  };

  const avgMpl =
    Math.round(
      (seriesList.reduce((sum, s) => sum + s.mpl, 0) / seriesList.length) * 10
    ) / 10;
  const mplY = mapY(avgMpl);

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
      {/* Chart Header & Mode Toggle */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            {chartMode === 'line' ? (
              <TrendingUp className="w-5 h-5 text-[#0F2A4A]" aria-hidden="true" />
            ) : (
              <BarChart3 className="w-5 h-5 text-[#0F2A4A]" aria-hidden="true" />
            )}
            พัฒนาการคะแนนรายวิชาตามรอบการประเมิน (Score Progression Visualization)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            เปรียบเทียบคะแนนตั้งแต่รอบสังเกตการณ์ต้นสายงานจนถึงสอบปลายภาค เทียบกับจุดตัดเกณฑ์ขั้นต่ำ MPL
          </p>
        </div>

        <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setChartMode('line')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              chartMode === 'line'
                ? 'bg-white text-[#0F2A4A] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
            กราฟเส้นพัฒนาการ
          </button>
          <button
            type="button"
            onClick={() => setChartMode('bar')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              chartMode === 'bar'
                ? 'bg-white text-[#0F2A4A] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" />
            กราฟแท่งเปรียบเทียบ
          </button>
        </div>
      </div>

      {/* Interactive Course Legend Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {seriesList.map((series) => {
            const isHidden = !!hiddenCourses[series.courseCode];
            return (
              <button
                key={series.courseCode}
                type="button"
                onClick={() => toggleCourse(series.courseCode)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                  isHidden
                    ? 'bg-slate-50 text-slate-400 border-slate-200'
                    : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-xs shrink-0"
                  style={{ backgroundColor: isHidden ? '#CBD5E1' : series.color }}
                  aria-hidden="true"
                />
                <span>{series.shortName}</span>
                <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                  ({series.weightedTotal.toFixed(1)}%)
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="inline-block w-5 border-t-2 border-dashed border-red-600" aria-hidden="true" />
          <span className="tabular-nums">เส้นอ้างอิงเกณฑ์ MPL เฉลี่ย ({avgMpl}%)</span>
        </div>
      </div>

      {/* LINE CHART VIEW */}
      {chartMode === 'line' && (
        <div className="relative">
          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${svgW} ${svgH}`}
              className="w-full min-w-[640px] h-auto select-none"
              role="img"
              aria-label="กราฟเส้นแสดงพัฒนาการคะแนนรายวิชาตามรอบการประเมิน"
            >
              {/* Horizontal Grid Lines & Y-Axis Ticks */}
              {[40, 50, 60, 70, 80, 90, 100].map((tick) => {
                const y = mapY(tick);
                return (
                  <g key={tick}>
                    <line
                      x1={padL}
                      y1={y}
                      x2={svgW - padR}
                      y2={y}
                      stroke="#E2E8F0"
                      strokeWidth={1}
                    />
                    <text
                      x={padL - 8}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-slate-500 text-[11px] font-mono tabular-nums"
                    >
                      {tick}%
                    </text>
                  </g>
                );
              })}

              {/* MPL Dashed Reference Line */}
              <line
                x1={padL}
                y1={mplY}
                x2={svgW - padR}
                y2={mplY}
                stroke="#DC2626"
                strokeWidth={1.5}
                strokeDasharray="6 4"
              />
              <text
                x={svgW - padR}
                y={mplY - 6}
                textAnchor="end"
                className="fill-red-700 text-[10px] font-semibold font-mono tabular-nums"
              >
                MPL {avgMpl}%
              </text>

              {/* X-Axis Round Labels */}
              {seriesList[0].rounds.map((r, idx) => {
                const x = mapX(idx);
                return (
                  <g key={r.shortLabel}>
                    <line
                      x1={x}
                      y1={padT}
                      x2={x}
                      y2={padT + plotH}
                      stroke="#F1F5F9"
                      strokeWidth={1}
                    />
                    <text
                      x={x}
                      y={svgH - 16}
                      textAnchor="middle"
                      className="fill-slate-600 text-[11px] font-medium"
                    >
                      {r.shortLabel}
                    </text>
                  </g>
                );
              })}

              {/* Course Polylines & Data Points */}
              {visibleSeries.map((series) => {
                const validPoints = series.rounds
                  .map((r, idx) =>
                    r.score !== null ? { x: mapX(idx), y: mapY(r.score), score: r.score, label: r.label } : null
                  )
                  .filter((p): p is { x: number; y: number; score: number; label: string } => p !== null);

                const polylinePts = validPoints.map((p) => `${p.x},${p.y}`).join(' ');

                return (
                  <g key={series.courseCode}>
                    <polyline
                      fill="none"
                      stroke={series.color}
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={polylinePts}
                    />
                    {validPoints.map((pt) => {
                      const isHovered =
                        hoveredPoint?.courseName === series.shortName &&
                        hoveredPoint?.roundLabel === pt.label;
                      return (
                        <g
                          key={`${series.courseCode}-${pt.label}`}
                          className="cursor-pointer"
                          onMouseEnter={() =>
                            setHoveredPoint({
                              courseName: series.shortName,
                              roundLabel: pt.label,
                              score: pt.score,
                              mpl: series.mpl,
                              x: pt.x,
                              y: pt.y,
                            })
                          }
                          onMouseLeave={() => setHoveredPoint(null)}
                        >
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={isHovered ? 6.5 : 4.5}
                            fill="#FFFFFF"
                            stroke={series.color}
                            strokeWidth={2.5}
                          />
                          <circle cx={pt.x} cy={pt.y} r={14} fill="transparent" />
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Interactive Readout Strip */}
          <div className="mt-2 min-h-[36px] px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
            {hoveredPoint ? (
              <>
                <div className="font-medium text-slate-900">
                  {hoveredPoint.courseName} · <span className="text-slate-600">{hoveredPoint.roundLabel}</span>
                </div>
                <div className="font-mono font-bold text-[#0F2A4A] tabular-nums">
                  คะแนน: {hoveredPoint.score.toFixed(1)}% (สูงกว่า MPL {hoveredPoint.mpl}% อยู่ +
                  {(hoveredPoint.score - hoveredPoint.mpl).toFixed(1)}%)
                </div>
              </>
            ) : (
              <span className="text-slate-500">
                วางเมาส์บนจุดข้อมูลในกราฟเพื่อดูรายละเอียดคะแนนแต่ละรอบการประเมินเทียบกับเกณฑ์ MPL
              </span>
            )}
          </div>
        </div>
      )}

      {/* GROUPED BAR CHART VIEW */}
      {chartMode === 'bar' && (
        <div className="space-y-4">
          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${svgW} ${svgH}`}
              className="w-full min-w-[640px] h-auto select-none"
              role="img"
              aria-label="กราฟแท่งเปรียบเทียบคะแนนแต่ละองค์ประกอบในรายวิชา"
            >
              {/* Y-Axis Grid */}
              {[40, 50, 60, 70, 80, 90, 100].map((tick) => {
                const y = mapY(tick);
                return (
                  <g key={tick}>
                    <line
                      x1={padL}
                      y1={y}
                      x2={svgW - padR}
                      y2={y}
                      stroke="#E2E8F0"
                      strokeWidth={1}
                    />
                    <text
                      x={padL - 8}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-slate-500 text-[11px] font-mono tabular-nums"
                    >
                      {tick}%
                    </text>
                  </g>
                );
              })}

              {/* MPL Line */}
              <line
                x1={padL}
                y1={mplY}
                x2={svgW - padR}
                y2={mplY}
                stroke="#DC2626"
                strokeWidth={1.5}
                strokeDasharray="6 4"
              />

              {/* Grouped Bars per Round */}
              {seriesList[0].rounds.map((r, rIdx) => {
                const groupWidth = plotW / roundCount;
                const groupLeft = padL + rIdx * groupWidth;
                const barCount = Math.max(1, visibleSeries.length);
                const innerGap = 4;
                const usableGroupW = groupWidth - 22;
                const barW = Math.min(26, Math.max(10, (usableGroupW - innerGap * (barCount - 1)) / barCount));
                const totalBarsW = barCount * barW + (barCount - 1) * innerGap;
                const startX = groupLeft + (groupWidth - totalBarsW) / 2;

                return (
                  <g key={r.shortLabel}>
                    {visibleSeries.map((series, sIdx) => {
                      const val = series.rounds[rIdx]?.score;
                      if (val === null || val === undefined) return null;
                      const x = startX + sIdx * (barW + innerGap);
                      const y = mapY(val);
                      const h = Math.max(2, padT + plotH - y);
                      return (
                        <g
                          key={`${series.courseCode}-${r.shortLabel}`}
                          className="cursor-pointer"
                          onMouseEnter={() =>
                            setHoveredBar({
                              courseName: series.shortName,
                              metricLabel: r.label,
                              score: val,
                              mpl: series.mpl,
                            })
                          }
                          onMouseLeave={() => setHoveredBar(null)}
                        >
                          <rect
                            x={x}
                            y={y}
                            width={barW}
                            height={h}
                            rx={3}
                            fill={series.color}
                            opacity={
                              hoveredBar &&
                              hoveredBar.courseName === series.shortName &&
                              hoveredBar.metricLabel === r.label
                                ? 1
                                : 0.88
                            }
                          />
                        </g>
                      );
                    })}
                    <text
                      x={groupLeft + groupWidth / 2}
                      y={svgH - 16}
                      textAnchor="middle"
                      className="fill-slate-600 text-[11px] font-medium"
                    >
                      {r.shortLabel}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs min-h-[36px]">
            {hoveredBar ? (
              <>
                <div className="font-medium text-slate-900">
                  {hoveredBar.courseName} · <span className="text-slate-600">{hoveredBar.metricLabel}</span>
                </div>
                <div className="font-mono font-bold text-[#0F2A4A] tabular-nums">
                  คะแนน: {hoveredBar.score.toFixed(1)}% (MPL {hoveredBar.mpl}%)
                </div>
              </>
            ) : (
              <span className="text-slate-500">
                วางเมาส์บนแท่งกราฟเพื่อดูคะแนนเปรียบเทียบรายวิชาในแต่ละรอบการประเมิน
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
