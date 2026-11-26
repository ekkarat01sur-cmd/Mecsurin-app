import { useState } from 'react';
import { FileSpreadsheet, FileText, Printer, X } from 'lucide-react';
import {
  CourseGradingConfig,
  FacultyFormSubmission,
  LogbookEntry,
  ProcedureQuota,
  StudentCourseScore,
} from '../types/medicalSchool';
import { evaluateStudentGrade } from '../utils/gradeEvaluation';
import {
  exportGradeReportExcel,
  exportGradeReportPdf,
  exportLogbookSummaryExcel,
  exportLogbookSummaryPdf,
} from '../utils/officialReportExports';

type OfficialReportPreviewProps =
  | {
      isOpen: boolean;
      onClose: () => void;
      reportKind: 'grades';
      generatedBy: string;
      config: CourseGradingConfig;
      allConfigs: CourseGradingConfig[];
      studentScores: StudentCourseScore[];
      facultySubmissions: FacultyFormSubmission[];
      onNotify?: (msg: string) => void;
    }
  | {
      isOpen: boolean;
      onClose: () => void;
      reportKind: 'logbook';
      generatedBy: string;
      entries: LogbookEntry[];
      quotas: ProcedureQuota[];
      departmentFilter: string;
      onNotify?: (msg: string) => void;
    };

export function OfficialReportPreviewModal(props: OfficialReportPreviewProps) {
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  if (!props.isOpen) return null;

  const { reportKind, generatedBy, onClose, onNotify } = props;

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      if (props.reportKind === 'grades') {
        await exportGradeReportPdf({
          config: props.config,
          studentScores: props.studentScores,
          generatedBy,
        });
        onNotify?.(`ส่งออกรายงานผลเกรด ${props.config.courseCode} เป็น PDF เรียบร้อยแล้ว`);
      } else {
        await exportLogbookSummaryPdf({
          entries: props.entries,
          quotas: props.quotas,
          generatedBy,
          departmentFilter: props.departmentFilter,
        });
        onNotify?.('ส่งออกรายงานสรุป E-Logbook เป็น PDF เรียบร้อยแล้ว');
      }
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDownloadExcel = (allCourses = false) => {
    if (props.reportKind === 'grades') {
      exportGradeReportExcel({
        config: props.config,
        allConfigs: props.allConfigs,
        studentScores: props.studentScores,
        facultySubmissions: props.facultySubmissions,
        generatedBy,
        includeAllCourses: allCourses,
      });
      onNotify?.(
        allCourses
          ? 'ส่งออกรายงานผลเกรดทุกรายวิชาเป็น Excel (.xlsx) เรียบร้อยแล้ว'
          : `ส่งออกรายงานผลเกรด ${props.config.courseCode} เป็น Excel (.xlsx) เรียบร้อยแล้ว`
      );
    } else {
      exportLogbookSummaryExcel({
        entries: props.entries,
        quotas: props.quotas,
        generatedBy,
        departmentFilter: props.departmentFilter,
      });
      onNotify?.('ส่งออกรายงานสรุป E-Logbook เป็น Excel (.xlsx) เรียบร้อยแล้ว');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-5 print:static print:bg-white print:p-0"
      role="dialog"
      aria-modal="true"
      aria-label="ตัวอย่างเอกสารรายงานราชการ ศูนย์แพทยศาสตรศึกษาชั้นคลินิก"
    >
      <div className="bg-slate-100 border border-slate-200 rounded-xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden print:border-0 print:shadow-none print:max-h-none print:bg-white">
        {/* Top Action Bar (hidden when printing) */}
        <div className="px-5 py-3.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900 truncate">
              {reportKind === 'grades'
                ? `ตัวอย่างรายงานผลการศึกษาและตัดเกรด (${props.config.courseCode})`
                : 'ตัวอย่างรายงานสรุปประสบการณ์ทางคลินิก (E-Logbook Summary)'}
            </h2>
            <p className="text-xs text-slate-500">
              รูปแบบเอกสารราชการสำหรับเสนอคณะกรรมการการศึกษาแพทยศาสตร์และกลุ่มงานคลินิก รพ.สุรินทร์
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isExportingPdf}
              onClick={() => void handleDownloadPdf()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#0F2A4A] hover:bg-[#163B66] disabled:opacity-60 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
            >
              <FileText className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{isExportingPdf ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลด PDF (.pdf)'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleDownloadExcel(false)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#0F766E] hover:bg-[#0D625C] rounded-lg cursor-pointer whitespace-nowrap shrink-0"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" aria-hidden="true" />
              <span>ดาวน์โหลด Excel (.xlsx)</span>
            </button>

            {reportKind === 'grades' && props.allConfigs.length > 1 && (
              <button
                type="button"
                onClick={() => handleDownloadExcel(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#0F766E] bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Excel รวมทุกรายวิชา</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
            >
              <Printer className="w-3.5 h-3.5" aria-hidden="true" />
              <span>พิมพ์ A4</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
              aria-label="ปิดหน้าต่างตัวอย่างรายงาน"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable A4 Sheet Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 print:overflow-visible print:p-0">
          <div className="official-report-printable bg-white border border-slate-200 shadow-sm max-w-[900px] mx-auto p-6 sm:p-10 space-y-6 text-slate-900 print:border-0 print:shadow-none print:max-w-none print:p-0">
            {/* Official Header */}
            <div className="border-t-4 border-[#0F2A4A] pt-4 pb-4 border-b border-slate-300 flex flex-col sm:flex-row sm:items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-[#0F766E]">
                  ศูนย์แพทยศาสตรศึกษาชั้นคลินิก โรงพยาบาลสุรินทร์ · โครงการผลิตแพทย์เพิ่มเพื่อชาวชนบท (CPIRD)
                </div>
                <h3 className="font-serif text-xl font-bold text-slate-900">
                  {reportKind === 'grades'
                    ? `รายงานผลการประเมินและการตัดเกรดรายวิชา ${props.config.courseCode} ${props.config.courseName}`
                    : 'รายงานสรุปสมุดบันทึกประสบการณ์ทางคลินิก (E-Logbook Summary)'}
                </h3>
                <p className="text-xs text-slate-600">
                  {reportKind === 'grades'
                    ? `เกณฑ์ผ่านขั้นต่ำ (MPL): ${props.config.mplPercent}% · หน่วยกิต: ${props.config.credits} หน่วยกิต · กติกา: ${
                        props.config.strictMedicalMpl
                          ? 'แพทยศาสตร์เข้มข้น (ต่ำกว่า MPL = F)'
                          : 'เกณฑ์ผ่อนผัน 8 ระดับ'
                      }`
                    : `ขอบเขตข้อมูล: ${
                        props.departmentFilter === 'ทั้งหมด'
                          ? 'ทุกกลุ่มงานคลินิก'
                          : props.departmentFilter
                      } · เกณฑ์แพทยสภา พ.ศ. 2569`}
                </p>
              </div>
              <div className="text-xs text-slate-500 text-left sm:text-right shrink-0">
                <div>เอกสารราชการภายใน</div>
                <div>ผู้ออกรายงาน: {generatedBy}</div>
              </div>
            </div>

            {reportKind === 'grades' ? (
              (() => {
                const courseRows = props.studentScores.filter(
                  (s) => s.courseCode === props.config.courseCode
                );
                const evaluated = courseRows.map((sc) => ({
                  sc,
                  res: evaluateStudentGrade(sc, props.config),
                }));
                const passedCount = evaluated.filter((e) => e.res.passed).length;
                const avg =
                  evaluated.length > 0
                    ? (
                        evaluated.reduce((sum, e) => sum + e.res.weightedTotal, 0) /
                        evaluated.length
                      ).toFixed(1)
                    : '0.0';

                return (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <div className="text-slate-500">นักศึกษาในรายวิชา</div>
                        <div className="text-lg font-bold tabular-nums text-slate-900 mt-0.5">
                          {evaluated.length} คน
                        </div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <div className="text-slate-500">สอบผ่านเกณฑ์ MPL</div>
                        <div className="text-lg font-bold tabular-nums text-emerald-700 mt-0.5">
                          {passedCount} คน
                        </div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <div className="text-slate-500">ไม่ผ่านเกณฑ์</div>
                        <div className="text-lg font-bold tabular-nums text-rose-700 mt-0.5">
                          {evaluated.length - passedCount} คน
                        </div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <div className="text-slate-500">คะแนนเฉลี่ยรวม</div>
                        <div className="text-lg font-bold tabular-nums text-[#0F2A4A] mt-0.5">
                          {avg}%
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-[#0F2A4A] text-white">
                            <th className="py-2.5 px-3">รหัสนักศึกษา</th>
                            <th className="py-2.5 px-3">ชื่อ-สกุล</th>
                            <th className="py-2.5 px-2 text-right">A ({props.config.weights.formA}%)</th>
                            <th className="py-2.5 px-2 text-right">B ({props.config.weights.formB}%)</th>
                            <th className="py-2.5 px-2 text-right">C ({props.config.weights.formC}%)</th>
                            <th className="py-2.5 px-2 text-right">WB ({props.config.weights.wellBaby}%)</th>
                            <th className="py-2.5 px-2 text-right">E ({props.config.weights.formE}%)</th>
                            <th className="py-2.5 px-2 text-right">OSCE</th>
                            <th className="py-2.5 px-2 text-right">ข้อเขียน</th>
                            <th className="py-2.5 px-2.5 text-right">รวม%</th>
                            <th className="py-2.5 px-2.5 text-center">เกรด</th>
                            <th className="py-2.5 px-3">ผลการพิจารณา</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {evaluated.map(({ sc, res }) => (
                            <tr key={sc.id} className="even:bg-slate-50/70">
                              <td className="py-2 px-3 font-mono tabular-nums">{sc.studentId}</td>
                              <td className="py-2 px-3 font-medium">{sc.studentName}</td>
                              <td className="py-2 px-2 text-right font-mono tabular-nums">{sc.formA ?? '-'}</td>
                              <td className="py-2 px-2 text-right font-mono tabular-nums">{sc.formB ?? '-'}</td>
                              <td className="py-2 px-2 text-right font-mono tabular-nums">{sc.formC ?? '-'}</td>
                              <td className="py-2 px-2 text-right font-mono tabular-nums">{sc.wellBaby ?? '-'}</td>
                              <td className="py-2 px-2 text-right font-mono tabular-nums">{sc.formE ?? '-'}</td>
                              <td className="py-2 px-2 text-right font-mono tabular-nums">{sc.osce ?? '-'}</td>
                              <td className="py-2 px-2 text-right font-mono tabular-nums">{sc.writtenExam ?? '-'}</td>
                              <td className="py-2 px-2.5 text-right font-mono font-semibold tabular-nums">
                                {res.weightedTotal.toFixed(1)}%
                              </td>
                              <td
                                className={`py-2 px-2.5 text-center font-mono font-bold ${
                                  res.passed ? 'text-[#0F2A4A]' : 'text-rose-700'
                                }`}
                              >
                                {res.grade}
                              </td>
                              <td
                                className={`py-2 px-3 ${
                                  res.passed ? 'text-emerald-700' : 'text-rose-700'
                                }`}
                              >
                                {res.reason}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()
            ) : (
              (() => {
                const approvedCount = props.entries.filter(
                  (e) => e.status === 'approved'
                ).length;
                const pendingCount = props.entries.filter(
                  (e) => e.status === 'pending'
                ).length;
                const revisionCount = props.entries.filter(
                  (e) => e.status === 'revision'
                ).length;

                return (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <div className="text-slate-500">เคสในรายงาน</div>
                        <div className="text-lg font-bold tabular-nums text-slate-900 mt-0.5">
                          {props.entries.length} เคส
                        </div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <div className="text-slate-500">อาจารย์รับรองแล้ว</div>
                        <div className="text-lg font-bold tabular-nums text-emerald-700 mt-0.5">
                          {approvedCount} เคส
                        </div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <div className="text-slate-500">รอรับรอง</div>
                        <div className="text-lg font-bold tabular-nums text-amber-700 mt-0.5">
                          {pendingCount} เคส
                        </div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <div className="text-slate-500">ส่งกลับแก้ไข</div>
                        <div className="text-lg font-bold tabular-nums text-rose-700 mt-0.5">
                          {revisionCount} เคส
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-slate-700">
                        สรุปโควตาหัตถการบังคับ (Procedure Quotas)
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {props.quotas.map((q) => (
                          <div
                            key={q.id}
                            className="flex items-center justify-between border border-slate-200 rounded-md px-3 py-2 bg-slate-50/70"
                          >
                            <span className="font-medium text-slate-800">{q.name}</span>
                            <span className="font-mono tabular-nums text-slate-700">
                              {q.completed} / {q.target} ({q.roleRequirement})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-[#0F2A4A] text-white">
                            <th className="py-2.5 px-3">วันที่</th>
                            <th className="py-2.5 px-3">รหัสเคส</th>
                            <th className="py-2.5 px-3">กลุ่มงาน / จุดฝึก</th>
                            <th className="py-2.5 px-3">ICD-10 / การวินิจฉัย</th>
                            <th className="py-2.5 px-3">หัตถการ (บทบาท)</th>
                            <th className="py-2.5 px-3">อาจารย์ผู้ควบคุม</th>
                            <th className="py-2.5 px-3 text-center">สถานะ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {props.entries.map((e) => (
                            <tr key={e.id} className="even:bg-slate-50/70">
                              <td className="py-2 px-3 font-mono tabular-nums whitespace-nowrap">{e.date}</td>
                              <td className="py-2 px-3 font-mono">{e.caseCode}</td>
                              <td className="py-2 px-3">
                                {e.department} ({e.setting})
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-mono mr-1.5 text-[#0F2A4A]">{e.icd10}</span>
                                {e.diagnosis}
                              </td>
                              <td className="py-2 px-3">
                                {e.procedure} ({e.role})
                              </td>
                              <td className="py-2 px-3">{e.preceptor}</td>
                              <td className="py-2 px-3 text-center font-medium">
                                {e.status === 'approved' ? (
                                  <span className="text-emerald-700">รับรองแล้ว</span>
                                ) : e.status === 'revision' ? (
                                  <span className="text-rose-700">ส่งกลับแก้ไข</span>
                                ) : (
                                  <span className="text-amber-700">รอรับรอง</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()
            )}

            {/* Official Signature Block */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-slate-200 text-xs text-center">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-2">
                <div className="pt-4">ลงชื่อ ....................................................... ผู้จัดทำ/ตรวจสอบรายงาน</div>
                <div className="font-medium text-slate-900">({generatedBy})</div>
                <div className="text-slate-500">อาจารย์ผู้รับผิดชอบรายวิชา / นักวิชาการศึกษา ศพค.</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-2">
                <div className="pt-4">ลงชื่อ ....................................................... ผู้อนุมัติผลการประเมิน</div>
                <div className="font-medium text-slate-900">(.......................................................)</div>
                <div className="text-slate-500">ผู้อำนวยการศูนย์แพทยศาสตรศึกษาชั้นคลินิก โรงพยาบาลสุรินทร์</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
