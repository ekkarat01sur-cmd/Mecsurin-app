import { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Plus,
  Printer,
  QrCode,
  Search,
  Users,
} from 'lucide-react';
import {
  LogbookEntry,
  LogbookStatus,
  PeerReviewEntry,
  PeerReviewFeedbackInput,
  ProcedureQuota,
  UserRole,
} from '../types/medicalSchool';
import {
  exportLogbookSummaryExcel,
  exportLogbookSummaryPdf,
} from '../utils/officialReportExports';
import { OfficialReportPreviewModal } from './OfficialReportPreviewModal';
import { LogbookPeerReviewPanel } from './LogbookPeerReviewPanel';

interface LogbookSectionProps {
  role: UserRole;
  currentUserName?: string;
  entries: LogbookEntry[];
  quotas: ProcedureQuota[];
  peerReviewEntries: PeerReviewEntry[];
  approvedPeerReviewDomains: string[];
  onOpenNewLogbook: () => void;
  onOpenFacultyQrGenerator?: () => void;
  onUpdateStatus: (id: string, status: LogbookStatus, feedback?: string) => void;
  onSubmitPeerReview: (entryId: string, feedback: PeerReviewFeedbackInput) => void;
  onTogglePeerReviewHelpful: (entryId: string, commentId: string) => void;
  onToggleApprovedPeerDomain: (departmentName: string) => void;
  onNotify?: (msg: string) => void;
}

export function LogbookSection({
  role,
  currentUserName = 'อาจารย์แพทย์ / ฝ่ายวิชาการ ศพค. รพ.สุรินทร์',
  entries,
  quotas,
  peerReviewEntries,
  approvedPeerReviewDomains,
  onOpenNewLogbook,
  onOpenFacultyQrGenerator,
  onUpdateStatus,
  onSubmitPeerReview,
  onTogglePeerReviewHelpful,
  onToggleApprovedPeerDomain,
  onNotify,
}: LogbookSectionProps) {
  const [subView, setSubView] = useState<'logbook' | 'peer_review'>('logbook');
  const [statusFilter, setStatusFilter] = useState<'all' | LogbookStatus>('all');
  const [deptFilter, setDeptFilter] = useState<string>('ทั้งหมด');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>({});
  const [reportPreviewOpen, setReportPreviewOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const canExportOfficialReports =
    role === 'faculty' || role === 'course_officer' || role === 'admin';

  const scopedPeerCount = peerReviewEntries.filter((entry) =>
    approvedPeerReviewDomains.includes(entry.department)
  ).length;

  const filteredEntries = entries.filter((entry) => {
    const matchStatus = statusFilter === 'all' || entry.status === statusFilter;
    const matchDept = deptFilter === 'ทั้งหมด' || entry.department === deptFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      entry.diagnosis.toLowerCase().includes(q) ||
      entry.procedure.toLowerCase().includes(q) ||
      entry.icd10.toLowerCase().includes(q) ||
      entry.caseCode.toLowerCase().includes(q);
    return matchStatus && matchDept && matchSearch;
  });

  const handleExportCsv = () => {
    const headers = [
      'วันที่',
      'รหัสเคส',
      'กลุ่มงาน',
      'สถานที่',
      'ICD-10',
      'การวินิจฉัย',
      'หัตถการ',
      'บทบาท',
      'อาจารย์ผู้รับรอง',
      'สถานะ',
    ];
    const rows = filteredEntries.map((e) => [
      e.date,
      e.caseCode,
      e.department,
      e.setting,
      e.icd10,
      `"${e.diagnosis.replace(/"/g, '""')}"`,
      `"${e.procedure.replace(/"/g, '""')}"`,
      e.role,
      e.preceptor,
      e.status === 'approved'
        ? 'รับรองแล้ว'
        : e.status === 'revision'
        ? 'ส่งกลับแก้ไข'
        : 'รอรับรอง',
    ]);
    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'surin_mec_elogbook_2569.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const approvedCount = entries.filter((e) => e.status === 'approved').length;
  const pendingCount = entries.filter((e) => e.status === 'pending').length;

  return (
    <div className="space-y-10">
      {/* Header & Primary Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">
            สมุดบันทึกประสบการณ์ทางคลินิก (E-Logbook)
          </h1>
          <p className="text-sm text-slate-600 mt-1.5">
            บันทึกหัตถการและผู้ป่วยตามเกณฑ์แพทยสภา พร้อมระบบตรวจรับรองโดยอาจารย์แพทย์ รพ.สุรินทร์
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {subView === 'logbook' && canExportOfficialReports && (
            <>
              {onOpenFacultyQrGenerator && (
                <button
                  type="button"
                  onClick={onOpenFacultyQrGenerator}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-white bg-[#091A32] hover:bg-[#0F2A4A] rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                >
                  <QrCode className="w-4 h-4 text-[#2DD4BF]" aria-hidden="true" />
                  <span>สร้าง QR หัตถการ (อาจารย์)</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setReportPreviewOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-[#0F2A4A] bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
              >
                <Printer className="w-4 h-4" aria-hidden="true" />
                <span>ตัวอย่างรายงาน A4</span>
              </button>
              <button
                type="button"
                disabled={isExportingPdf}
                onClick={() => {
                  setIsExportingPdf(true);
                  void exportLogbookSummaryPdf({
                    entries: filteredEntries,
                    quotas,
                    generatedBy: currentUserName,
                    departmentFilter: deptFilter,
                  })
                    .then(() => {
                      onNotify?.('ส่งออกรายงานสรุป E-Logbook เป็น PDF เรียบร้อยแล้ว');
                    })
                    .finally(() => setIsExportingPdf(false));
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-white bg-[#0F2A4A] hover:bg-[#163B66] disabled:opacity-60 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
              >
                <FileText className="w-4 h-4" aria-hidden="true" />
                <span>{isExportingPdf ? 'กำลังสร้าง PDF...' : 'ส่งออก PDF (.pdf)'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  exportLogbookSummaryExcel({
                    entries: filteredEntries,
                    quotas,
                    generatedBy: currentUserName,
                    departmentFilter: deptFilter,
                  });
                  onNotify?.('ส่งออกรายงานสรุป E-Logbook เป็น Excel (.xlsx) เรียบร้อยแล้ว');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-white bg-[#0F766E] hover:bg-[#0D625C] rounded-lg cursor-pointer whitespace-nowrap shrink-0"
              >
                <FileSpreadsheet className="w-4 h-4" aria-hidden="true" />
                <span>ส่งออก Excel (.xlsx)</span>
              </button>
            </>
          )}
          {subView === 'logbook' && (
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>CSV</span>
            </button>
          )}
          <button
            type="button"
            onClick={onOpenNewLogbook}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-[#0F2A4A] rounded-lg hover:bg-[#163B66] cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>เพิ่มรายการใหม่</span>
          </button>
        </div>
      </div>

      {/* Mode Switcher: Personal E-Logbook vs Anonymized Peer-Review */}
      <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-xl">
        <button
          type="button"
          onClick={() => setSubView('logbook')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            subView === 'logbook'
              ? 'bg-white text-[#0F2A4A] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ClipboardList className="w-4 h-4" aria-hidden="true" />
          <span className="tabular-nums">สมุดบันทึก E-Logbook ({entries.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setSubView('peer_review')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            subView === 'peer_review'
              ? 'bg-white text-[#0F2A4A] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4 text-[#0F766E]" aria-hidden="true" />
          <span className="tabular-nums">
            Peer-Review เพื่อนร่วมรุ่น ({scopedPeerCount})
          </span>
        </button>
      </div>

      {subView === 'peer_review' ? (
        <LogbookPeerReviewPanel
          role={role}
          entries={peerReviewEntries}
          approvedDomains={approvedPeerReviewDomains}
          onSubmitPeerReview={onSubmitPeerReview}
          onToggleHelpful={onTogglePeerReviewHelpful}
          onToggleApprovedDomain={onToggleApprovedPeerDomain}
        />
      ) : (
        <>
          {/* Procedure Quotas Summary Grid */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              ความคืบหน้าหัตถการบังคับก่อนสำเร็จการศึกษา (Procedure Quotas)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              รับรองผลแล้ว {approvedCount} เคส · รออาจารย์รับรอง {pendingCount} เคส
            </p>
          </div>
          <span className="text-xs text-slate-500 tabular-nums">
            เกณฑ์แพทยสภา พ.ศ. 2569
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quotas.map((q) => {
            const pct = Math.min(100, Math.round((q.completed / q.target) * 100));
            const isComplete = q.completed >= q.target;
            return (
              <div
                key={q.id}
                className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-medium text-slate-900 leading-snug">
                    {q.name}
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  {q.department} · {q.roleRequirement}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs tabular-nums">
                    <span className={isComplete ? 'text-emerald-700 font-semibold' : 'text-slate-700 font-medium'}>
                      {q.completed} / {q.target} ครั้ง
                    </span>
                    <span className="text-slate-500">{pct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        isComplete ? 'bg-emerald-600' : 'bg-[#0F2A4A]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Filter Toolbar & Logbook Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="inline-flex flex-wrap items-center p-1 bg-slate-100 rounded-lg self-start">
            {(
              [
                { id: 'all', label: `ทั้งหมด (${entries.length})` },
                { id: 'pending', label: `รอรับรอง (${pendingCount})` },
                { id: 'approved', label: `รับรองแล้ว (${approvedCount})` },
                { id: 'revision', label: 'ส่งกลับแก้ไข' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-white text-[#0F2A4A] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาโรค, ICD-10, หัตถการ..."
                className="w-full sm:w-64 pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              aria-label="กรองตามกลุ่มงาน"
              className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
            >
              <option value="ทั้งหมด">ทุกกลุ่มงาน</option>
              {Array.from(new Set(entries.map((e) => e.department))).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm text-slate-600">ไม่พบรายการบันทึกที่ตรงกับเงื่อนไขการค้นหา</p>
            <button
              type="button"
              onClick={onOpenNewLogbook}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#0F2A4A] rounded-lg hover:bg-[#163B66] cursor-pointer"
            >
              บันทึกเคสแรกของคุณ
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredEntries.map((entry) => (
              <div key={entry.id} className="p-5 sm:p-6 space-y-3 hover:bg-slate-50/50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                      <span className="font-mono text-slate-700 tabular-nums">{entry.date}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{entry.caseCode}</span>
                      <span aria-hidden="true">·</span>
                      <span>{entry.department}</span>
                      <span aria-hidden="true">·</span>
                      <span>{entry.setting}</span>
                    </div>

                    <h3 className="text-base font-semibold text-slate-900">
                      <span className="font-mono text-sm text-[#0F2A4A] mr-2">{entry.icd10}</span>
                      {entry.diagnosis}
                    </h3>
                  </div>

                  {/* Semantic Status with explicit text + icon (Zero-Pill) */}
                  <div className="shrink-0">
                    {entry.status === 'approved' && (
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                        <span>อาจารย์รับรองแล้ว</span>
                      </div>
                    )}
                    {entry.status === 'pending' && (
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                        <Clock className="w-4 h-4" aria-hidden="true" />
                        <span>รออาจารย์รับรอง</span>
                      </div>
                    )}
                    {entry.status === 'revision' && (
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700">
                        <AlertCircle className="w-4 h-4" aria-hidden="true" />
                        <span>ส่งกลับแก้ไข</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="text-slate-700">
                    <span className="text-slate-500">ข้อมูลผู้ป่วย: </span>
                    {entry.patientSummary}
                  </div>
                  <div className="text-slate-700">
                    <span className="text-slate-500">หัตถการ ({entry.role}): </span>
                    <span className="font-medium text-slate-900">{entry.procedure}</span>
                  </div>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-lg border border-slate-200/80">
                  <span className="font-medium text-slate-800">บันทึกสะท้อนคิด: </span>
                  {entry.reflection}
                </p>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs text-slate-500">
                  <div>
                    อาจารย์ผู้ควบคุม: <span className="font-medium text-slate-800">{entry.preceptor}</span>
                    {entry.feedback && (
                      <span className="ml-2 text-slate-600">· ข้อเสนอแนะ: {entry.feedback}</span>
                    )}
                  </div>

                  {/* Preceptor Approval Actions */}
                  {(role === 'faculty' || role === 'course_officer' || role === 'admin') && entry.status !== 'approved' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={feedbackDrafts[entry.id] ?? ''}
                        onChange={(e) =>
                          setFeedbackDrafts((prev) => ({
                            ...prev,
                            [entry.id]: e.target.value,
                          }))
                        }
                        placeholder="ความเห็นอาจารย์ (ถ้ามี)..."
                        className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg w-52"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateStatus(
                            entry.id,
                            'approved',
                            feedbackDrafts[entry.id] || 'ผ่านเกณฑ์การประเมินทางคลินิก'
                          )
                        }
                        className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        รับรองผล
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateStatus(
                            entry.id,
                            'revision',
                            feedbackDrafts[entry.id] || 'กรุณาเพิ่มเติมรายละเอียดการวางแผนรักษา'
                          )
                        }
                        className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        ส่งกลับแก้ไข
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
        </>
      )}

      <OfficialReportPreviewModal
        isOpen={reportPreviewOpen}
        onClose={() => setReportPreviewOpen(false)}
        reportKind="logbook"
        generatedBy={currentUserName}
        entries={filteredEntries}
        quotas={quotas}
        departmentFilter={deptFilter}
        onNotify={onNotify}
      />
    </div>
  );
}
