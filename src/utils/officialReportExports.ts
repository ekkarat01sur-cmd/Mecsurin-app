import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import {
  CourseGradingConfig,
  FacultyFormSubmission,
  LogbookEntry,
  ProcedureQuota,
  StudentCourseScore,
} from '../types/medicalSchool';
import { COHORT_STUDENTS } from '../data/initialMedicalData';
import { evaluateStudentGrade } from './gradeEvaluation';

const PAGE_W = 1240;
const PAGE_H = 1754;
const MARGIN_X = 72;
const MARGIN_TOP = 68;
const MARGIN_BOTTOM = 84;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const FONT_SANS = '"IBM Plex Sans Thai", "Plus Jakarta Sans", system-ui, sans-serif';
const FONT_MONO = '"JetBrains Mono", monospace';

function formatThaiTimestamp(): string {
  const now = new Date();
  const months = [
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
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear() + 543} เวลา ${hh}:${mm} น.`;
}

function createA4Canvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = PAGE_W;
  canvas.height = PAGE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('ไม่สามารถสร้าง Canvas สำหรับเอกสาร PDF ได้');
  }
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);
  return { canvas, ctx };
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  const clean = String(text ?? '');
  if (ctx.measureText(clean).width <= maxWidth) return clean;
  let trimmed = clean;
  while (trimmed.length > 1 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}…`;
}

function drawInstitutionalBanner(
  ctx: CanvasRenderingContext2D,
  title: string,
  subtitle: string,
  metaRight: string
): number {
  let y = MARGIN_TOP;

  // Navy top accent bar
  ctx.fillStyle = '#0F2A4A';
  ctx.fillRect(MARGIN_X, y, CONTENT_W, 8);
  y += 28;

  ctx.fillStyle = '#0F766E';
  ctx.font = `600 18px ${FONT_SANS}`;
  ctx.textAlign = 'left';
  ctx.fillText(
    'ศูนย์แพทยศาสตรศึกษาชั้นคลินิก โรงพยาบาลสุรินทร์ · โครงการผลิตแพทย์เพิ่มเพื่อชาวชนบท (CPIRD)',
    MARGIN_X,
    y
  );

  ctx.fillStyle = '#475569';
  ctx.font = `500 17px ${FONT_SANS}`;
  ctx.textAlign = 'right';
  ctx.fillText(metaRight, PAGE_W - MARGIN_X, y);
  ctx.textAlign = 'left';
  y += 38;

  ctx.fillStyle = '#0F172A';
  ctx.font = `700 28px ${FONT_SANS}`;
  ctx.fillText(fitText(ctx, title, CONTENT_W), MARGIN_X, y);
  y += 30;

  ctx.fillStyle = '#475569';
  ctx.font = `400 19px ${FONT_SANS}`;
  ctx.fillText(fitText(ctx, subtitle, CONTENT_W), MARGIN_X, y);
  y += 20;

  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(MARGIN_X, y);
  ctx.lineTo(PAGE_W - MARGIN_X, y);
  ctx.stroke();

  return y + 26;
}

function drawPageFooter(
  ctx: CanvasRenderingContext2D,
  pageIndex: number,
  totalPages: number,
  generatedBy: string,
  timestampLabel: string
) {
  const y = PAGE_H - 42;
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(MARGIN_X, y - 18);
  ctx.lineTo(PAGE_W - MARGIN_X, y - 18);
  ctx.stroke();

  ctx.fillStyle = '#64748B';
  ctx.font = `400 15px ${FONT_SANS}`;
  ctx.textAlign = 'left';
  ctx.fillText(
    fitText(ctx, `เอกสารราชการภายใน · ออกรายงานโดย ${generatedBy} (${timestampLabel})`, CONTENT_W - 140),
    MARGIN_X,
    y
  );

  ctx.textAlign = 'right';
  ctx.fillText(`หน้า ${pageIndex} / ${totalPages}`, PAGE_W - MARGIN_X, y);
  ctx.textAlign = 'left';
}

function drawSignatureBlock(
  ctx: CanvasRenderingContext2D,
  yStart: number,
  generatedBy: string
): number {
  const boxTop = yStart + 18;
  const colW = (CONTENT_W - 40) / 2;

  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(MARGIN_X, boxTop, CONTENT_W, 132);
  ctx.strokeRect(MARGIN_X, boxTop, CONTENT_W, 132);

  // Left signature
  const leftCenter = MARGIN_X + colW / 2;
  ctx.fillStyle = '#0F172A';
  ctx.font = `500 17px ${FONT_SANS}`;
  ctx.textAlign = 'center';
  ctx.fillText('ลงชื่อ ....................................................... ผู้จัดทำ/ตรวจสอบรายงาน', leftCenter, boxTop + 56);
  ctx.fillText(`(${fitText(ctx, generatedBy, colW - 24)})`, leftCenter, boxTop + 84);
  ctx.fillStyle = '#475569';
  ctx.font = `400 15px ${FONT_SANS}`;
  ctx.fillText('อาจารย์ผู้รับผิดชอบรายวิชา / นักวิชาการศึกษา ศพค.', leftCenter, boxTop + 108);

  // Right signature
  const rightCenter = MARGIN_X + colW + 40 + colW / 2;
  ctx.fillStyle = '#0F172A';
  ctx.font = `500 17px ${FONT_SANS}`;
  ctx.fillText('ลงชื่อ ....................................................... ผู้อนุมัติผลการประเมิน', rightCenter, boxTop + 56);
  ctx.fillText('(.......................................................)', rightCenter, boxTop + 84);
  ctx.fillStyle = '#475569';
  ctx.font = `400 15px ${FONT_SANS}`;
  ctx.fillText('ผู้อำนวยการศูนย์แพทยศาสตรศึกษาชั้นคลินิก โรงพยาบาลสุรินทร์', rightCenter, boxTop + 108);

  ctx.textAlign = 'left';
  return boxTop + 144;
}

function saveCanvasesAsPdf(canvases: HTMLCanvasElement[], filename: string) {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  canvases.forEach((canvas, idx) => {
    if (idx > 0) pdf.addPage();
    const imgData = canvas.toDataURL('image/jpeg', 0.94);
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
  });

  pdf.save(filename);
}

interface TableColumn<T> {
  header: string;
  width: number;
  align?: 'left' | 'right' | 'center';
  mono?: boolean;
  getValue: (row: T, index: number) => string;
  getColor?: (row: T) => string;
}

function renderPaginatedTablePdf<T>(options: {
  title: string;
  subtitle: string;
  metaRight: string;
  generatedBy: string;
  summaryBoxes: { label: string; value: string; accent?: string }[];
  columns: TableColumn<T>[];
  rows: T[];
  filename: string;
  extraNotes?: string[];
}) {
  const {
    title,
    subtitle,
    metaRight,
    generatedBy,
    summaryBoxes,
    columns,
    rows,
    filename,
    extraNotes = [],
  } = options;

  const timestampLabel = formatThaiTimestamp();
  const pages: HTMLCanvasElement[] = [];

  let { canvas, ctx } = createA4Canvas();
  pages.push(canvas);
  let y = drawInstitutionalBanner(ctx, title, subtitle, metaRight);

  // Summary boxes row
  if (summaryBoxes.length > 0) {
    const gap = 14;
    const boxW = (CONTENT_W - gap * (summaryBoxes.length - 1)) / summaryBoxes.length;
    const boxH = 74;
    summaryBoxes.forEach((box, idx) => {
      const bx = MARGIN_X + idx * (boxW + gap);
      ctx.fillStyle = '#F8FAFC';
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 1;
      ctx.fillRect(bx, y, boxW, boxH);
      ctx.strokeRect(bx, y, boxW, boxH);

      ctx.fillStyle = '#64748B';
      ctx.font = `500 15px ${FONT_SANS}`;
      ctx.fillText(fitText(ctx, box.label, boxW - 24), bx + 14, y + 25);

      ctx.fillStyle = box.accent ?? '#0F2A4A';
      ctx.font = `700 24px ${FONT_SANS}`;
      ctx.fillText(fitText(ctx, box.value, boxW - 24), bx + 14, y + 57);
    });
    y += boxH + 22;
  }

  if (extraNotes.length > 0) {
    ctx.fillStyle = '#334155';
    ctx.font = `400 16px ${FONT_SANS}`;
    extraNotes.forEach((note) => {
      ctx.fillText(fitText(ctx, note, CONTENT_W), MARGIN_X, y);
      y += 23;
    });
    y += 8;
  }

  const drawTableHeader = (currentCtx: CanvasRenderingContext2D, topY: number): number => {
    const headerH = 40;
    currentCtx.fillStyle = '#0F2A4A';
    currentCtx.fillRect(MARGIN_X, topY, CONTENT_W, headerH);

    currentCtx.fillStyle = '#FFFFFF';
    currentCtx.font = `600 15px ${FONT_SANS}`;
    let x = MARGIN_X;
    columns.forEach((col) => {
      const pad = 10;
      const align = col.align ?? 'left';
      currentCtx.textAlign = align;
      const tx =
        align === 'right'
          ? x + col.width - pad
          : align === 'center'
            ? x + col.width / 2
            : x + pad;
      currentCtx.fillText(fitText(currentCtx, col.header, col.width - pad * 2), tx, topY + 25);
      x += col.width;
    });
    currentCtx.textAlign = 'left';
    return topY + headerH;
  };

  y = drawTableHeader(ctx, y);
  const rowH = 38;

  rows.forEach((row, idx) => {
    if (y + rowH > PAGE_H - MARGIN_BOTTOM - 20) {
      const next = createA4Canvas();
      canvas = next.canvas;
      ctx = next.ctx;
      pages.push(canvas);
      y = drawInstitutionalBanner(ctx, title, `${subtitle} (ต่อ)`, metaRight);
      y = drawTableHeader(ctx, y);
    }

    ctx.fillStyle = idx % 2 === 1 ? '#F8FAFC' : '#FFFFFF';
    ctx.fillRect(MARGIN_X, y, CONTENT_W, rowH);

    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(MARGIN_X, y + rowH);
    ctx.lineTo(PAGE_W - MARGIN_X, y + rowH);
    ctx.stroke();

    let x = MARGIN_X;
    columns.forEach((col) => {
      const pad = 10;
      const align = col.align ?? 'left';
      ctx.textAlign = align;
      ctx.fillStyle = col.getColor ? col.getColor(row) : '#0F172A';
      ctx.font = col.mono ? `500 15px ${FONT_MONO}` : `400 15px ${FONT_SANS}`;
      const tx =
        align === 'right'
          ? x + col.width - pad
          : align === 'center'
            ? x + col.width / 2
            : x + pad;
      const val = col.getValue(row, idx);
      ctx.fillText(fitText(ctx, val, col.width - pad * 2), tx, y + 24);
      x += col.width;
    });
    ctx.textAlign = 'left';
    y += rowH;
  });

  // Signature block at end
  if (y + 165 > PAGE_H - MARGIN_BOTTOM) {
    const next = createA4Canvas();
    canvas = next.canvas;
    ctx = next.ctx;
    pages.push(canvas);
    y = drawInstitutionalBanner(ctx, title, `${subtitle} (ส่วนรับรองผล)`, metaRight);
  }
  drawSignatureBlock(ctx, y, generatedBy);

  const totalPages = pages.length;
  pages.forEach((pageCanvas, idx) => {
    const pCtx = pageCanvas.getContext('2d');
    if (pCtx) {
      drawPageFooter(pCtx, idx + 1, totalPages, generatedBy, timestampLabel);
    }
  });

  saveCanvasesAsPdf(pages, filename);
}

export async function exportGradeReportPdf(params: {
  config: CourseGradingConfig;
  studentScores: StudentCourseScore[];
  generatedBy: string;
}) {
  if (typeof document !== 'undefined' && 'fonts' in document) {
    await document.fonts.ready;
  }

  const { config, studentScores, generatedBy } = params;
  const courseRows = studentScores.filter((s) => s.courseCode === config.courseCode);
  const evaluated = courseRows.map((sc) => ({
    sc,
    res: evaluateStudentGrade(sc, config),
  }));
  const passCount = evaluated.filter((e) => e.res.passed).length;
  const avgScore =
    evaluated.length > 0
      ? (
          evaluated.reduce((sum, e) => sum + e.res.weightedTotal, 0) / evaluated.length
        ).toFixed(1)
      : '0.0';

  type GradePdfRow = (typeof evaluated)[number];

  const columns: TableColumn<GradePdfRow>[] = [
    { header: 'รหัสนักศึกษา', width: 112, mono: true, getValue: (r) => r.sc.studentId },
    { header: 'ชื่อ-สกุล นักศึกษาแพทย์', width: 230, getValue: (r) => r.sc.studentName },
    { header: `A(${config.weights.formA}%)`, width: 64, align: 'right', mono: true, getValue: (r) => (r.sc.formA ?? '-').toString() },
    { header: `B(${config.weights.formB}%)`, width: 64, align: 'right', mono: true, getValue: (r) => (r.sc.formB ?? '-').toString() },
    { header: `C(${config.weights.formC}%)`, width: 64, align: 'right', mono: true, getValue: (r) => (r.sc.formC ?? '-').toString() },
    { header: `WB(${config.weights.wellBaby}%)`, width: 64, align: 'right', mono: true, getValue: (r) => (r.sc.wellBaby ?? '-').toString() },
    { header: `E(${config.weights.formE}%)`, width: 64, align: 'right', mono: true, getValue: (r) => (r.sc.formE ?? '-').toString() },
    { header: `OSCE`, width: 66, align: 'right', mono: true, getValue: (r) => (r.sc.osce ?? '-').toString() },
    { header: `สอบ`, width: 64, align: 'right', mono: true, getValue: (r) => (r.sc.writtenExam ?? '-').toString() },
    { header: 'รวม%', width: 82, align: 'right', mono: true, getValue: (r) => `${r.res.weightedTotal.toFixed(1)}%` },
    {
      header: 'เกรด',
      width: 66,
      align: 'center',
      mono: true,
      getValue: (r) => r.res.grade,
      getColor: (r) => (r.res.passed ? '#0F2A4A' : '#B91C1C'),
    },
    {
      header: 'ผลการพิจารณา MPL',
      width: 156,
      getValue: (r) => (r.res.passed ? 'ผ่านเกณฑ์ MPL' : r.res.reason),
      getColor: (r) => (r.res.passed ? '#047857' : '#B91C1C'),
    },
  ];

  renderPaginatedTablePdf({
    title: `รายงานผลคะแนนและตัดเกรดรายวิชา ${config.courseCode} ${config.courseName}`,
    subtitle: `เกณฑ์ผ่านขั้นต่ำ (MPL): ${config.mplPercent}% · หน่วยกิต: ${config.credits} หน่วยกิต · กติกา: ${
      config.strictMedicalMpl ? 'แพทยศาสตร์เข้มข้น (ต่ำกว่า MPL = F)' : 'เกณฑ์ 8 ระดับ'
    }`,
    metaRight: 'รายงานผลการศึกษาอย่างเป็นทางการ',
    generatedBy,
    summaryBoxes: [
      { label: 'จำนวนนักศึกษาในรายวิชา', value: `${evaluated.length} คน` },
      { label: 'สอบผ่านเกณฑ์ MPL', value: `${passCount} คน`, accent: '#047857' },
      {
        label: 'ไม่ผ่านเกณฑ์ / แก้ไข',
        value: `${evaluated.length - passCount} คน`,
        accent: evaluated.length - passCount > 0 ? '#B91C1C' : '#0F2A4A',
      },
      { label: 'คะแนนเฉลี่ยรวมทั้งกลุ่ม', value: `${avgScore}%` },
    ],
    extraNotes: [
      `เกณฑ์ขั้นต่ำรายองค์ประกอบ: Form E (เจตคติ) ≥ ${config.formEMinPercent}% · OSCE ≥ ${config.osceMinPercent}% · ข้อเขียน ≥ ${config.writtenMinPercent}%`,
    ],
    columns,
    rows: evaluated,
    filename: `SurinMEC_GradeReport_${config.courseCode}.pdf`,
  });
}

export async function exportLogbookSummaryPdf(params: {
  entries: LogbookEntry[];
  quotas: ProcedureQuota[];
  generatedBy: string;
  departmentFilter?: string;
}) {
  if (typeof document !== 'undefined' && 'fonts' in document) {
    await document.fonts.ready;
  }

  const { entries, quotas, generatedBy, departmentFilter = 'ทั้งหมด' } = params;
  const approvedCount = entries.filter((e) => e.status === 'approved').length;
  const pendingCount = entries.filter((e) => e.status === 'pending').length;
  const revisionCount = entries.filter((e) => e.status === 'revision').length;
  const quotaCompletedSum = quotas.reduce((sum, q) => sum + Math.min(q.completed, q.target), 0);
  const quotaTargetSum = quotas.reduce((sum, q) => sum + q.target, 0);
  const quotaPct = quotaTargetSum > 0 ? Math.round((quotaCompletedSum / quotaTargetSum) * 100) : 0;

  const columns: TableColumn<LogbookEntry>[] = [
    { header: 'วันที่', width: 105, mono: true, getValue: (e) => e.date },
    { header: 'รหัสเคส', width: 95, mono: true, getValue: (e) => e.caseCode },
    { header: 'กลุ่มงาน / จุดฝึก', width: 175, getValue: (e) => `${e.department.replace('กลุ่มงาน', '')} (${e.setting})` },
    { header: 'ICD-10 & การวินิจฉัย', width: 255, getValue: (e) => `${e.icd10} ${e.diagnosis}` },
    { header: 'หัตถการ (บทบาท)', width: 215, getValue: (e) => `${e.procedure} (${e.role})` },
    { header: 'อาจารย์ผู้รับรอง', width: 155, getValue: (e) => e.preceptor },
    {
      header: 'สถานะ',
      width: 96,
      align: 'center',
      getValue: (e) =>
        e.status === 'approved' ? 'รับรองแล้ว' : e.status === 'revision' ? 'แก้ไข' : 'รอรับรอง',
      getColor: (e) =>
        e.status === 'approved' ? '#047857' : e.status === 'revision' ? '#B91C1C' : '#B45309',
    },
  ];

  const quotaHighlights = quotas
    .slice(0, 4)
    .map((q) => `${q.name}: ${q.completed}/${q.target}`)
    .join(' · ');

  renderPaginatedTablePdf({
    title: 'รายงานสรุปสมุดบันทึกประสบการณ์ทางคลินิก (E-Logbook Summary)',
    subtitle: `ขอบเขตข้อมูล: ${departmentFilter === 'ทั้งหมด' ? 'ทุกกลุ่มงานคลินิก' : departmentFilter} · เกณฑ์แพทยสภา พ.ศ. 2569`,
    metaRight: 'รายงานสรุปฝึกปฏิบัติทางคลินิก',
    generatedBy,
    summaryBoxes: [
      { label: 'จำนวนเคสทั้งหมด', value: `${entries.length} เคส` },
      { label: 'อาจารย์รับรองแล้ว', value: `${approvedCount} เคส`, accent: '#047857' },
      { label: 'รอรับรอง / ส่งกลับแก้ไข', value: `${pendingCount} / ${revisionCount}`, accent: '#B45309' },
      { label: 'ความคืบหน้าหัตถการบังคับ', value: `${quotaPct}% (${quotaCompletedSum}/${quotaTargetSum})` },
    ],
    extraNotes: [
      `สรุปโควตาหัตถการสำคัญ: ${quotaHighlights}`,
    ],
    columns,
    rows: entries,
    filename: 'SurinMEC_ELogbook_Summary.pdf',
  });
}

export function exportGradeReportExcel(params: {
  config: CourseGradingConfig;
  allConfigs?: CourseGradingConfig[];
  studentScores: StudentCourseScore[];
  facultySubmissions: FacultyFormSubmission[];
  generatedBy: string;
  includeAllCourses?: boolean;
}) {
  const {
    config,
    allConfigs = [config],
    studentScores,
    facultySubmissions,
    generatedBy,
    includeAllCourses = false,
  } = params;

  const targetConfigs = includeAllCourses ? allConfigs : [config];
  const targetCodes = new Set(targetConfigs.map((c) => c.courseCode));
  const studentMetaById = new Map(COHORT_STUDENTS.map((s) => [s.studentId, s]));
  const configByCode = new Map(targetConfigs.map((c) => [c.courseCode, c]));
  const timestamp = formatThaiTimestamp();

  const wb = XLSX.utils.book_new();

  // Sheet 1: Institutional Metadata & Course MPL Rules
  const summaryRows: (string | number)[][] = [
    ['ศูนย์แพทยศาสตรศึกษาชั้นคลินิก โรงพยาบาลสุรินทร์ (Surin MEC)'],
    ['รายงานสรุปเกณฑ์การตัดเกรดตาม Minimal Passing Level (MPL) และผลการศึกษา'],
    ['วันที่ออกรายงาน', timestamp, 'ผู้ออกรายงาน', generatedBy],
    [],
    [
      'รหัสวิชา',
      'ชื่อรายวิชา',
      'หน่วยกิต',
      'เกณฑ์ MPL (%)',
      'ขั้นต่ำ Form E (%)',
      'ขั้นต่ำ OSCE (%)',
      'ขั้นต่ำ ข้อเขียน (%)',
      'จำนวนนักศึกษา',
      'ผ่านเกณฑ์',
      'ไม่ผ่านเกณฑ์',
      'คะแนนเฉลี่ย (%)',
    ],
  ];

  targetConfigs.forEach((cfg) => {
    const rows = studentScores.filter((s) => s.courseCode === cfg.courseCode);
    const evals = rows.map((r) => evaluateStudentGrade(r, cfg));
    const passed = evals.filter((e) => e.passed).length;
    const avg =
      evals.length > 0
        ? Number((evals.reduce((sum, e) => sum + e.weightedTotal, 0) / evals.length).toFixed(2))
        : 0;
    summaryRows.push([
      cfg.courseCode,
      cfg.courseName,
      cfg.credits,
      cfg.mplPercent,
      cfg.formEMinPercent,
      cfg.osceMinPercent,
      cfg.writtenMinPercent,
      rows.length,
      passed,
      rows.length - passed,
      avg,
    ]);
  });

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [
    { wch: 16 },
    { wch: 40 },
    { wch: 10 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'สรุปเกณฑ์_MPL');

  // Sheet 2: Student Grades Table
  const gradeSheetRows: (string | number)[][] = [
    [
      'รหัสนักศึกษา',
      'ชื่อ-สกุล',
      'ชั้นปี',
      'กลุ่ม',
      'รหัสวิชา',
      'ชื่อรายวิชา',
      'Form A (%)',
      'Form B (%)',
      'Form C (%)',
      'Well Baby (%)',
      'Form E (%)',
      'OSCE (%)',
      'ข้อเขียน (%)',
      'คะแนนรวมสุทธิ (%)',
      'ผ่านเจตคติ',
      'วันลา/ขาด',
      'เกรดสุทธิ',
      'สถานะ MPL',
      'หมายเหตุการพิจารณา',
    ],
  ];

  studentScores
    .filter((s) => targetCodes.has(s.courseCode))
    .forEach((sc) => {
      const cfg = configByCode.get(sc.courseCode);
      if (!cfg) return;
      const res = evaluateStudentGrade(sc, cfg);
      const st = studentMetaById.get(sc.studentId);
      gradeSheetRows.push([
        sc.studentId,
        sc.studentName,
        `ปี ${sc.yearLevel}`,
        st?.group ?? '-',
        sc.courseCode,
        cfg.courseName,
        sc.formA ?? '-',
        sc.formB ?? '-',
        sc.formC ?? '-',
        sc.wellBaby ?? '-',
        sc.formE ?? '-',
        sc.osce ?? '-',
        sc.writtenExam ?? '-',
        Number(res.weightedTotal.toFixed(2)),
        sc.attitudeGatePassed ? 'ผ่าน' : 'ไม่ผ่าน',
        sc.absenceDays,
        res.grade,
        res.passed ? 'ผ่านเกณฑ์' : 'ไม่ผ่านเกณฑ์',
        res.reason,
      ]);
    });

  const wsGrades = XLSX.utils.aoa_to_sheet(gradeSheetRows);
  wsGrades['!cols'] = [
    { wch: 14 },
    { wch: 28 },
    { wch: 8 },
    { wch: 10 },
    { wch: 14 },
    { wch: 32 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 13 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 18 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 14 },
    { wch: 34 },
  ];
  XLSX.utils.book_append_sheet(wb, wsGrades, 'ตารางเกรดรายบุคคล');

  // Sheet 3: Faculty Evaluation History
  const evalRows: (string | number)[][] = [
    [
      'วันที่บันทึก',
      'รหัสวิชา',
      'แบบประเมิน',
      'Ward / Sub-rotation',
      'วันที่เริ่มปฏิบัติงาน',
      'จนถึงวันที่',
      'รหัสนักศึกษา',
      'ชื่อนักศึกษา',
      'อาจารย์ผู้ประเมิน',
      'คะแนนที่ได้',
      'คะแนนเต็ม',
      'ร้อยละ (%)',
      'ระดับผลประเมิน',
      'ข้อเสนอแนะ',
    ],
  ];

  facultySubmissions
    .filter((f) => targetCodes.has(f.courseCode))
    .forEach((f) => {
      evalRows.push([
        f.date,
        f.courseCode,
        f.formTitle,
        f.wardOrSubrotation,
        f.rotationStartDate,
        f.rotationEndDate,
        f.studentId,
        f.studentName,
        f.evaluatorName,
        f.rawScore,
        f.maxScore,
        f.percentage,
        f.ratingLabel,
        f.feedback,
      ]);
    });

  const wsFaculty = XLSX.utils.aoa_to_sheet(evalRows);
  wsFaculty['!cols'] = [
    { wch: 14 },
    { wch: 14 },
    { wch: 28 },
    { wch: 28 },
    { wch: 16 },
    { wch: 16 },
    { wch: 14 },
    { wch: 26 },
    { wch: 24 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 22 },
    { wch: 38 },
  ];
  XLSX.utils.book_append_sheet(wb, wsFaculty, 'ประวัติประเมินอาจารย์');

  const suffix = includeAllCourses ? 'ALL_COURSES' : config.courseCode;
  XLSX.writeFile(wb, `SurinMEC_GradeReport_${suffix}.xlsx`);
}

export function exportLogbookSummaryExcel(params: {
  entries: LogbookEntry[];
  quotas: ProcedureQuota[];
  generatedBy: string;
  departmentFilter?: string;
}) {
  const { entries, quotas, generatedBy, departmentFilter = 'ทั้งหมด' } = params;
  const timestamp = formatThaiTimestamp();
  const approvedCount = entries.filter((e) => e.status === 'approved').length;
  const pendingCount = entries.filter((e) => e.status === 'pending').length;
  const revisionCount = entries.filter((e) => e.status === 'revision').length;

  const wb = XLSX.utils.book_new();

  // Sheet 1: Summary & Quotas
  const quotaRows: (string | number)[][] = [
    ['ศูนย์แพทยศาสตรศึกษาชั้นคลินิก โรงพยาบาลสุรินทร์ (Surin MEC)'],
    ['รายงานสรุปสมุดบันทึกประสบการณ์ทางคลินิก (E-Logbook) และโควตาหัตถการบังคับ'],
    ['วันที่ออกรายงาน', timestamp, 'ผู้ออกรายงาน', generatedBy],
    ['ขอบเขตกลุ่มงาน', departmentFilter, 'จำนวนเคสรวม', entries.length],
    ['รับรองแล้ว', approvedCount, 'รอรับรอง / ส่งกลับแก้ไข', `${pendingCount} / ${revisionCount}`],
    [],
    [
      'รหัสโควตา',
      'ชื่อหัตถการบังคับ',
      'กลุ่มงานคลินิก',
      'บทบาทตามเกณฑ์',
      'ดำเนินการแล้ว (ครั้ง)',
      'เป้าหมายตามเกณฑ์ (ครั้ง)',
      'ความคืบหน้า (%)',
      'สถานะ',
    ],
  ];

  quotas.forEach((q) => {
    const pct = q.target > 0 ? Math.min(100, Math.round((q.completed / q.target) * 100)) : 0;
    quotaRows.push([
      q.id,
      q.name,
      q.department,
      q.roleRequirement,
      q.completed,
      q.target,
      pct,
      q.completed >= q.target ? 'ครบตามเกณฑ์' : 'อยู่ระหว่างดำเนินการ',
    ]);
  });

  const wsQuotas = XLSX.utils.aoa_to_sheet(quotaRows);
  wsQuotas['!cols'] = [
    { wch: 14 },
    { wch: 36 },
    { wch: 28 },
    { wch: 16 },
    { wch: 20 },
    { wch: 22 },
    { wch: 16 },
    { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, wsQuotas, 'สรุปโควตาหัตถการ');

  // Sheet 2: Detailed Logbook Entries
  const entryRows: (string | number)[][] = [
    [
      'วันที่',
      'รหัสเคส',
      'กลุ่มงาน',
      'สถานที่',
      'รหัส ICD-10',
      'การวินิจฉัย',
      'หัตถการ',
      'บทบาท',
      'ข้อมูลผู้ป่วย',
      'อาจารย์ผู้ควบคุม',
      'สถานะรับรอง',
      'ข้อเสนอแนะอาจารย์',
    ],
  ];

  entries.forEach((e) => {
    entryRows.push([
      e.date,
      e.caseCode,
      e.department,
      e.setting,
      e.icd10,
      e.diagnosis,
      e.procedure,
      e.role,
      e.patientSummary,
      e.preceptor,
      e.status === 'approved'
        ? 'รับรองแล้ว'
        : e.status === 'revision'
          ? 'ส่งกลับแก้ไข'
          : 'รอรับรอง',
      e.feedback ?? '-',
    ]);
  });

  const wsEntries = XLSX.utils.aoa_to_sheet(entryRows);
  wsEntries['!cols'] = [
    { wch: 14 },
    { wch: 14 },
    { wch: 26 },
    { wch: 10 },
    { wch: 12 },
    { wch: 30 },
    { wch: 28 },
    { wch: 10 },
    { wch: 28 },
    { wch: 24 },
    { wch: 14 },
    { wch: 34 },
  ];
  XLSX.utils.book_append_sheet(wb, wsEntries, 'รายการเคส_Logbook');

  XLSX.writeFile(wb, 'SurinMEC_ELogbook_Summary.xlsx');
}
