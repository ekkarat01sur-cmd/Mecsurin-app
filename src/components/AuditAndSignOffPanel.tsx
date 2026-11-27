import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileCheck2,
  History,
  Lock,
  Search,
  ShieldCheck,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  AuditLogCategory,
  AuditLogEntry,
  CourseGradeSignOff,
  CourseGradingConfig,
  StudentCourseScore,
  UserRole,
} from '../types/medicalSchool';
import { evaluateStudentGrade } from './MplGradingStudio';
import { exportGradeReportPdf } from '../utils/officialReportExports';

interface AuditAndSignOffPanelProps {
  role: UserRole;
  currentUserName: string;
  gradingConfigs: CourseGradingConfig[];
  studentScores: StudentCourseScore[];
  gradeSignOffs: CourseGradeSignOff[];
  onVerifyCourseGrades: (courseCode: string) => void;
  onChairSignCourseGrades: (courseCode: string) => void;
  onReopenCourseGrades: (courseCode: string) => void;
  auditLogs: AuditLogEntry[];
  onNotify?: (msg: string) => void;
}

const AUDIT_CATEGORY_LABELS: Record<'all' | AuditLogCategory, string> = {
  all: 'ทุกหมวดหมู่',
  grading: 'ตัดเกรด & แบบประเมิน',
  logbook: 'E-Logbook',
  roster: 'ตารางเวร & ใบลา',
  rotation: 'จัดตารางหมุนเวียน',
  admin_crud: 'ระบบหลังบ้าน',
  auth: 'บัญชีสมาชิก & สิทธิ์',
};

const ROLE_LABELS: Record<UserRole, string> = {
  student: 'นักศึกษา (1)',
  faculty: 'อาจารย์แพทย์ (2)',
  course_officer: 'นักวิชาการ (3A)',
  admin: 'แอดมิน/ประธานฯ (3B)',
};

export function AuditAndSignOffPanel({
  role,
  currentUserName,
  gradingConfigs,
  studentScores,
  gradeSignOffs,
  onVerifyCourseGrades,
  onChairSignCourseGrades,
  onReopenCourseGrades,
  auditLogs,
  onNotify,
}: AuditAndSignOffPanelProps) {
  const [auditCategory, setAuditCategory] = useState<'all' | AuditLogCategory>('all');
  const [auditQuery, setAuditQuery] = useState('');
  const [exportingCourse, setExportingCourse] = useState<string | null>(null);

  const isChairAdmin = role === 'admin';
  const canOfficerVerify = role === 'admin' || role === 'course_officer';

  const courseSummaries = useMemo(() => {
    return gradingConfigs.map((cfg) => {
      const rows = studentScores.filter((s) => s.courseCode === cfg.courseCode);
      const evaluated = rows.map((row) => ({
        row,
        evalResult: evaluateStudentGrade(row, cfg),
      }));
      const passCount = evaluated.filter((x) => x.evalResult.passed).length;
      const avgPct =
        evaluated.length > 0
          ? (
              evaluated.reduce((sum, x) => sum + x.evalResult.weightedTotal, 0) /
              evaluated.length
            ).toFixed(1)
          : '0.0';
      const signOff =
        gradeSignOffs.find((s) => s.courseCode === cfg.courseCode) ?? {
          courseCode: cfg.courseCode,
          courseName: cfg.courseName,
          status: 'draft' as const,
        };
      return { cfg, rows, evaluated, passCount, avgPct, signOff };
    });
  }, [gradingConfigs, studentScores, gradeSignOffs]);

  const filteredLogs = useMemo(() => {
    const q = auditQuery.trim().toLowerCase();
    return auditLogs.filter((entry) => {
      if (auditCategory !== 'all' && entry.category !== auditCategory) return false;
      if (!q) return true;
      return (
        entry.actorName.toLowerCase().includes(q) ||
        entry.actorUsername.toLowerCase().includes(q) ||
        entry.action.toLowerCase().includes(q) ||
        entry.targetLabel.toLowerCase().includes(q) ||
        entry.detail.toLowerCase().includes(q)
      );
    });
  }, [auditLogs, auditCategory, auditQuery]);

  const handleExportUniversityExcel = (courseCode: string) => {
    const target = courseSummaries.find((c) => c.cfg.courseCode === courseCode);
    if (!target || target.evaluated.length === 0) {
      onNotify?.('ไม่พบข้อมูลคะแนนนักศึกษาในรายวิชานี้');
      return;
    }
    const rows = target.evaluated.map(({ row, evalResult }) => ({
      รหัสนักศึกษา: row.studentId,
      ชื่อนักศึกษาแพทย์: row.studentName,
      ชั้นปี: row.yearLevel,
      รหัสวิชา: row.courseCode,
      คะแนนรวม_เปอร์เซ็นต์: evalResult.weightedTotal.toFixed(2),
      เกรดสุทธิ: evalResult.grade,
      ผ่านเกณฑ์_MPL: evalResult.passed ? 'ผ่าน' : 'ไม่ผ่าน',
      เจตคติ_Attitude: row.attitudeGatePassed ? 'ผ่าน' : 'ไม่ผ่าน',
      สถานะรับรองเกรด:
        target.signOff.status === 'chair_signed'
          ? `ลงนามรับรองแล้ว (${target.signOff.verificationCode ?? '-'})`
          : target.signOff.status === 'officer_verified'
            ? 'นักวิชาการตรวจสอบแล้ว'
            : 'ฉบับร่าง',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, courseCode);
    XLSX.writeFile(wb, `SUT_GradeSheet_${courseCode}.xlsx`);
    onNotify?.(`ส่งออกใบส่งเกรดมาตรฐานมหาวิทยาลัย (${courseCode}) เรียบร้อยแล้ว`);
  };

  const handleExportOfficialPdf = async (courseCode: string) => {
    const target = courseSummaries.find((c) => c.cfg.courseCode === courseCode);
    if (!target) return;
    setExportingCourse(courseCode);
    try {
      await exportGradeReportPdf({
        config: target.cfg,
        studentScores: target.rows,
        generatedBy: `${currentUserName} (${target.signOff.verificationCode ?? 'DRAFT'})`,
      });
      onNotify?.(`สร้างรายงาน PDF ผลการศึกษา ${courseCode} เรียบร้อยแล้ว`);
    } finally {
      setExportingCourse(null);
    }
  };

  const handleExportAuditCsv = () => {
    const header = [
      'Timestamp',
      'ActorName',
      'Username',
      'Role',
      'Category',
      'Action',
      'Target',
      'Detail',
    ];
    const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [
      header.join(','),
      ...filteredLogs.map((l) =>
        [
          l.isoTimestamp,
          l.actorName,
          l.actorUsername,
          l.actorRole,
          l.category,
          l.action,
          l.targetLabel,
          l.detail,
        ]
          .map(escape)
          .join(',')
      ),
    ];
    const blob = new Blob(['\uFEFF' + lines.join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `surin-mec-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    onNotify?.('ส่งออกไฟล์บันทึกประวัติการแก้ไข (Audit Trail CSV) เรียบร้อยแล้ว');
  };

  return (
    <div className="space-y-8">
      {/* Part A: Official Course Grade Sign-Off */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-[#0D9488]" aria-hidden="true" />
              ระบบลงนามรับรองเกรดและส่งออกผลกลับมหาวิทยาลัยคู่ร่วมผลิต (SUT / CPIRD)
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              ลำดับรับรองผล 2 ขั้นตอน: นักวิชาการรายวิชาตรวจสอบคะแนน (ระดับ 3A) → ประธานศูนย์แพทยฯ ลงนามรับรองฉบับสมบูรณ์ (ระดับ 3B)
            </p>
          </div>
          {!isChairAdmin && (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <Lock className="w-3.5 h-3.5" aria-hidden="true" />
              การลงนามขั้นสุดท้ายสงวนสิทธิ์เฉพาะแอดมิน / ประธานศูนย์ฯ (3B)
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                <th className="py-2.5 px-3 font-semibold">รหัส / รายวิชา</th>
                <th className="py-2.5 px-3 font-semibold text-right">นักศึกษา</th>
                <th className="py-2.5 px-3 font-semibold text-right">ผ่าน MPL</th>
                <th className="py-2.5 px-3 font-semibold text-right">เฉลี่ย (%)</th>
                <th className="py-2.5 px-3 font-semibold">สถานะรับรอง & รหัสอ้างอิง</th>
                <th className="py-2.5 px-3 font-semibold text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {courseSummaries.map(({ cfg, rows, passCount, avgPct, signOff }) => (
                <tr key={cfg.courseCode} className="hover:bg-slate-50/70">
                  <td className="py-3 px-3">
                    <div className="font-mono font-semibold text-[#0F2A4A]">{cfg.courseCode}</div>
                    <div className="text-slate-700">{cfg.courseName}</div>
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-slate-700">
                    {rows.length} คน
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-slate-700">
                    {passCount}/{rows.length}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums font-semibold text-slate-900">
                    {avgPct}%
                  </td>
                  <td className="py-3 px-3">
                    {signOff.status === 'chair_signed' ? (
                      <div className="space-y-0.5">
                        <div className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                          <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                          ลงนามรับรองสมบูรณ์ (Final)
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Ref: {signOff.verificationCode} · {signOff.signedBy} ({signOff.signedAt})
                        </div>
                      </div>
                    ) : signOff.status === 'officer_verified' ? (
                      <div className="space-y-0.5">
                        <div className="inline-flex items-center gap-1 font-semibold text-[#0F766E]">
                          <ClipboardCheck className="w-3.5 h-3.5" aria-hidden="true" />
                          ตรวจสอบแล้ว รอประธานฯ ลงนาม
                        </div>
                        <div className="text-[11px] text-slate-500">
                          โดย {signOff.verifiedBy} · {signOff.verifiedAt}
                        </div>
                      </div>
                    ) : (
                      <span className="text-amber-700 font-medium">ฉบับร่าง (รอตรวจสอบคะแนน)</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                      {canOfficerVerify && signOff.status === 'draft' && (
                        <button
                          type="button"
                          onClick={() => onVerifyCourseGrades(cfg.courseCode)}
                          className="px-2.5 py-1.5 text-[11px] font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-md cursor-pointer"
                        >
                          ยืนยันตรวจคะแนน
                        </button>
                      )}
                      {isChairAdmin && signOff.status !== 'chair_signed' && (
                        <button
                          type="button"
                          onClick={() => onChairSignCourseGrades(cfg.courseCode)}
                          className="px-2.5 py-1.5 text-[11px] font-semibold text-white bg-[#091A32] hover:bg-[#13294B] rounded-md cursor-pointer"
                        >
                          ลงนามรับรอง (3B)
                        </button>
                      )}
                      {isChairAdmin && signOff.status === 'chair_signed' && (
                        <button
                          type="button"
                          onClick={() => onReopenCourseGrades(cfg.courseCode)}
                          className="px-2.5 py-1.5 text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-md cursor-pointer"
                        >
                          เปิดแก้ไขใหม่
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleExportUniversityExcel(cfg.courseCode)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md cursor-pointer"
                      >
                        <Download className="w-3 h-3" aria-hidden="true" />
                        SUT Excel
                      </button>
                      <button
                        type="button"
                        disabled={exportingCourse === cfg.courseCode}
                        onClick={() => void handleExportOfficialPdf(cfg.courseCode)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-[#0F2A4A] bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                      >
                        <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                        {exportingCourse === cfg.courseCode ? 'กำลังสร้าง...' : 'PDF'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Part B: Immutable Audit Log */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <History className="w-4.5 h-4.5 text-[#0F2A4A]" aria-hidden="true" />
              บันทึกประวัติการแก้ไขข้อมูลสำคัญ (Audit Trail สำหรับ WFME / แพทยสภา)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              บันทึกทุกการเปลี่ยนแปลงคะแนน เกรด แบบประเมิน E-Logbook ตารางเวร และข้อมูลหลังบ้านแบบตรวจสอบย้อนหลังได้
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportAuditCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer self-start"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>ส่งออก Audit CSV</span>
          </button>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search
              className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="search"
              value={auditQuery}
              onChange={(e) => setAuditQuery(e.target.value)}
              placeholder="ค้นหาชื่อผู้ดำเนินการ รหัสวิชา กิจกรรม..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(Object.keys(AUDIT_CATEGORY_LABELS) as Array<'all' | AuditLogCategory>).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setAuditCategory(cat)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  auditCategory === cat
                    ? 'bg-white text-[#0F2A4A] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {AUDIT_CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-lg">
            ยังไม่มีบันทึกประวัติการแก้ไขที่ตรงกับตัวกรอง (ระบบจะบันทึกอัตโนมัติเมื่อมีการแก้ไขคะแนน เกรด หรือข้อมูลสำคัญ)
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[380px] overflow-y-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">วัน-เวลา</th>
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">ผู้ดำเนินการ</th>
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">หมวดหมู่</th>
                  <th className="py-2.5 px-3 font-semibold">การดำเนินการ</th>
                  <th className="py-2.5 px-3 font-semibold">รายละเอียด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 text-slate-500 tabular-nums whitespace-nowrap">
                      {log.timestampLabel}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-900">{log.actorName}</div>
                      <div className="text-[11px] text-slate-500">
                        @{log.actorUsername} · {ROLE_LABELS[log.actorRole]}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-[#0F766E] font-medium whitespace-nowrap">
                      {AUDIT_CATEGORY_LABELS[log.category] ?? log.category}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {log.action}
                      {log.targetLabel && log.targetLabel !== '-' && (
                        <span className="ml-1.5 font-mono text-[11px] text-[#0F2A4A]">
                          [{log.targetLabel}]
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{log.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
