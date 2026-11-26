import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  EyeOff,
  Lock,
  MessageSquarePlus,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  ThumbsUp,
  UserCheck,
} from 'lucide-react';
import {
  PeerReviewEntry,
  PeerReviewFeedbackInput,
  UserRole,
} from '../types/medicalSchool';
import { CLINICAL_DEPARTMENTS } from '../data/initialMedicalData';

interface LogbookPeerReviewPanelProps {
  role: UserRole;
  entries: PeerReviewEntry[];
  approvedDomains: string[];
  onSubmitPeerReview: (entryId: string, feedback: PeerReviewFeedbackInput) => void;
  onToggleHelpful: (entryId: string, commentId: string) => void;
  onToggleApprovedDomain: (departmentName: string) => void;
}

const CONSTRUCTIVE_STARTERS = [
  {
    label: '+ ชื่นชมการเชื่อมโยงอาการกับแนวทาง',
    target: 'strengths' as const,
    text: 'วิเคราะห์อาการนำและการตรวจร่างกายสอดคล้องกับเกณฑ์วินิจฉัยเบื้องต้นได้ดี',
  },
  {
    label: '+ เสนอเพิ่มเติม CPG / Red Flags',
    target: 'suggestions' as const,
    text: 'แนะนำให้ระบุเกณฑ์สัญญาณอันตราย (Red Flags) และแนวทางติดตามอาการซ้ำตาม CPG รพ.สุรินทร์เพิ่มเติม',
  },
  {
    label: '+ เสนอมุมมองสื่อสารผู้ป่วย/ญาติ',
    target: 'suggestions' as const,
    text: 'อาจเสริมประเด็นการสื่อสารแผนการดูแลต่อเนื่องและคำแนะนำก่อนกลับบ้านแก่ผู้ป่วยหรือญาติ',
  },
];

const SCORE_LEVELS = [1, 2, 3, 4, 5] as const;

export function LogbookPeerReviewPanel({
  role,
  entries,
  approvedDomains,
  onSubmitPeerReview,
  onToggleHelpful,
  onToggleApprovedDomain,
}: LogbookPeerReviewPanelProps) {
  const [selectedDomain, setSelectedDomain] = useState<string>('ทั้งหมดที่อนุญาต');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'needs_review'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDomainManager, setShowDomainManager] = useState(false);

  const [openComposerEntryId, setOpenComposerEntryId] = useState<string | null>(null);
  const [reasoningScore, setReasoningScore] = useState<number>(4);
  const [reflectionScore, setReflectionScore] = useState<number>(4);
  const [strengthsDraft, setStrengthsDraft] = useState('');
  const [suggestionsDraft, setSuggestionsDraft] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const canManageDomains =
    role === 'faculty' || role === 'course_officer' || role === 'admin';

  const approvedSet = useMemo(() => new Set(approvedDomains), [approvedDomains]);

  // Enforce strict domain scoping: only entries in pre-approved clinical domains are accessible
  const scopedEntries = useMemo(
    () => entries.filter((entry) => approvedSet.has(entry.department)),
    [entries, approvedSet]
  );

  const excludedRestrictedCount = entries.length - scopedEntries.length;

  const activeDomainFilter =
    selectedDomain === 'ทั้งหมดที่อนุญาต' || approvedSet.has(selectedDomain)
      ? selectedDomain
      : 'ทั้งหมดที่อนุญาต';

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return scopedEntries.filter((entry) => {
      const matchDomain =
        activeDomainFilter === 'ทั้งหมดที่อนุญาต' ||
        entry.department === activeDomainFilter;
      const matchReviewState =
        reviewFilter === 'all' || entry.reviews.length === 0;
      const matchQuery =
        !q ||
        entry.anonymizedPeerCode.toLowerCase().includes(q) ||
        entry.diagnosis.toLowerCase().includes(q) ||
        entry.icd10.toLowerCase().includes(q) ||
        entry.procedure.toLowerCase().includes(q) ||
        entry.department.toLowerCase().includes(q);
      return matchDomain && matchReviewState && matchQuery;
    });
  }, [scopedEntries, activeDomainFilter, reviewFilter, searchQuery]);

  const totalFeedbackCount = useMemo(
    () => scopedEntries.reduce((sum, entry) => sum + entry.reviews.length, 0),
    [scopedEntries]
  );

  const awaitingFirstReviewCount = useMemo(
    () => scopedEntries.filter((entry) => entry.reviews.length === 0).length,
    [scopedEntries]
  );

  const handleOpenComposer = (entryId: string) => {
    if (openComposerEntryId === entryId) {
      setOpenComposerEntryId(null);
      setFormError(null);
      return;
    }
    setOpenComposerEntryId(entryId);
    setReasoningScore(4);
    setReflectionScore(4);
    setStrengthsDraft('');
    setSuggestionsDraft('');
    setFormError(null);
  };

  const handleApplyStarter = (
    target: 'strengths' | 'suggestions',
    snippet: string
  ) => {
    if (target === 'strengths') {
      setStrengthsDraft((prev) =>
        prev.trim() ? `${prev.trim()} ${snippet}` : snippet
      );
    } else {
      setSuggestionsDraft((prev) =>
        prev.trim() ? `${prev.trim()} ${snippet}` : snippet
      );
    }
    setFormError(null);
  };

  const handleSubmitForm = (entryId: string) => {
    const cleanStrengths = strengthsDraft.trim();
    const cleanSuggestions = suggestionsDraft.trim();
    if (cleanStrengths.length < 8 || cleanSuggestions.length < 8) {
      setFormError(
        'กรุณาระบุทั้ง “จุดแข็งทางคลินิก” และ “ข้อเสนอแนะเชิงสร้างสรรค์” อย่างน้อย 8 ตัวอักษร'
      );
      return;
    }
    onSubmitPeerReview(entryId, {
      clinicalReasoningScore: reasoningScore,
      reflectionDepthScore: reflectionScore,
      strengths: cleanStrengths,
      suggestions: cleanSuggestions,
    });
    setOpenComposerEntryId(null);
    setStrengthsDraft('');
    setSuggestionsDraft('');
    setFormError(null);
  };

  return (
    <div className="space-y-8">
      {/* Governance & Pre-Approved Clinical Domains Banner */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#0F766E]">
              <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>ขอบเขตกลุ่มงานคลินิกที่ได้รับอนุมัติสำหรับ Peer-Review</span>
            </div>
            <h2 className="text-lg font-semibold text-slate-900">
              ระบบแลกเปลี่ยนข้อเสนอแนะทางคลินิกโดยเพื่อนร่วมรุ่น (Anonymous Peer-Review)
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              ข้อมูลผู้ป่วยและชื่อผู้บันทึกถูกปกปิดแบบ De-identified และเปิดให้แสดงความเห็นเชิงสร้างสรรค์ได้เฉพาะกลุ่มงานที่คณะกรรมการหลักสูตรอนุญาตเท่านั้น
              {excludedRestrictedCount > 0 && (
                <span className="ml-1.5 text-slate-700 font-medium tabular-nums">
                  (ระบบซ่อนเคสในกลุ่มงานเฉพาะทางที่มีข้อมูลอ่อนไหว {excludedRestrictedCount} รายการตามนโยบายความเป็นส่วนตัว)
                </span>
              )}
            </p>
          </div>

          {canManageDomains && (
            <button
              type="button"
              onClick={() => setShowDomainManager((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-[44px] text-xs font-medium text-[#0F2A4A] bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg cursor-pointer whitespace-nowrap shrink-0 self-start"
            >
              <Settings2 className="w-4 h-4" aria-hidden="true" />
              <span>
                {showDomainManager ? 'ปิดการตั้งค่ากลุ่มงาน' : 'ตั้งค่ากลุ่มงานที่อนุญาต'}
              </span>
            </button>
          )}
        </div>

        {/* Active Approved Domains List */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-medium text-slate-500 mr-1">
            กลุ่มงานที่เปิดรับ Peer-Review:
          </span>
          {approvedDomains.length === 0 ? (
            <span className="text-xs text-red-700 font-medium">
              ยังไม่มีกลุ่มงานที่ได้รับอนุมัติในขณะนี้
            </span>
          ) : (
            approvedDomains.map((dept) => (
              <span
                key={dept}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#0F2A4A] bg-slate-50 border border-slate-200 rounded-md"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0F766E]" aria-hidden="true" />
                <span>{dept}</span>
              </span>
            ))
          )}
        </div>

        {/* Faculty / Course Officer Domain Policy Editor */}
        {canManageDomains && showDomainManager && (
          <div className="mt-2 pt-4 border-t border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <p className="text-xs font-semibold text-slate-800">
                กำหนดกลุ่มงานคลินิกที่อนุญาตให้นักศึกษาทำ Peer-Review (เฉพาะอาจารย์ / ฝ่ายวิชาการ)
              </p>
              <span className="text-xs text-slate-500 tabular-nums">
                อนุญาตแล้ว {approvedDomains.length} / {CLINICAL_DEPARTMENTS.length} กลุ่มงาน
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {CLINICAL_DEPARTMENTS.map((dept) => {
                const isApproved = approvedSet.has(dept.nameTh);
                return (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => onToggleApprovedDomain(dept.nameTh)}
                    className={`flex items-center justify-between gap-2 px-3 py-2.5 min-h-[44px] text-left text-xs rounded-lg border transition-colors cursor-pointer ${
                      isApproved
                        ? 'bg-[#0F766E]/5 border-[#0F766E] text-slate-900 font-medium'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">{dept.nameTh}</span>
                    {isApproved ? (
                      <span className="inline-flex items-center gap-1 text-[#0F766E] font-semibold shrink-0 whitespace-nowrap">
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        อนุญาต
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-400 shrink-0 whitespace-nowrap">
                        <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                        จำกัดสิทธิ์
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* 4-Column KPI Summary Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
          <div className="text-xs text-slate-500">เคสในขอบเขตที่อนุญาต</div>
          <div className="text-2xl font-bold text-[#0F2A4A] tabular-nums">
            {scopedEntries.length}
          </div>
          <div className="text-xs text-slate-500">รายการแบบไม่ระบุตัวตน</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
          <div className="text-xs text-slate-500">กลุ่มงานที่เปิดให้รีวิว</div>
          <div className="text-2xl font-bold text-[#0F766E] tabular-nums">
            {approvedDomains.length} / {CLINICAL_DEPARTMENTS.length}
          </div>
          <div className="text-xs text-slate-500">Pre-approved domains</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
          <div className="text-xs text-slate-500">ความเห็นเชิงสร้างสรรค์</div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">
            {totalFeedbackCount}
          </div>
          <div className="text-xs text-slate-500">ข้อเสนอแนะจากเพื่อนร่วมรุ่น</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
          <div className="text-xs text-slate-500">เคสรอความเห็นแรก</div>
          <div className="text-2xl font-bold text-amber-700 tabular-nums">
            {awaitingFirstReviewCount}
          </div>
          <div className="text-xs text-slate-500">พร้อมให้เพื่อนร่วมรุ่นร่วมสะท้อนคิด</div>
        </div>
      </section>

      {/* Filter Toolbar & Anonymized Peer Entries Feed */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Strict Pre-approved Domain Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedDomain('ทั้งหมดที่อนุญาต')}
                className={`px-3 py-2 min-h-[40px] text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeDomainFilter === 'ทั้งหมดที่อนุญาต'
                    ? 'bg-[#0F2A4A] text-white border-[#0F2A4A]'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                ทุกกลุ่มงานที่อนุญาต ({scopedEntries.length})
              </button>
              {approvedDomains.map((dept) => {
                const count = scopedEntries.filter((e) => e.department === dept).length;
                return (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => setSelectedDomain(dept)}
                    className={`px-3 py-2 min-h-[40px] text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      activeDomainFilter === dept
                        ? 'bg-[#0F2A4A] text-white border-[#0F2A4A]'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {dept.replace('กลุ่มงาน', '')} ({count})
                  </button>
                );
              })}
            </div>

            {/* Search & Needs-Review Toggle */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="inline-flex p-1 bg-slate-100 rounded-lg self-start">
                <button
                  type="button"
                  onClick={() => setReviewFilter('all')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
                    reviewFilter === 'all'
                      ? 'bg-white text-[#0F2A4A] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={() => setReviewFilter('needs_review')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
                    reviewFilter === 'needs_review'
                      ? 'bg-white text-[#0F2A4A] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  รอความเห็นแรก ({awaitingFirstReviewCount})
                </button>
              </div>

              <div className="relative">
                <Search
                  className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหารหัส Peer, โรค, ICD-10..."
                  className="w-full sm:w-60 pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <p className="text-sm font-medium text-slate-700">
              ไม่พบบันทึกเคสในกลุ่มงานที่ได้รับอนุมัติตามเงื่อนไขที่เลือก
            </p>
            <p className="text-xs text-slate-500">
              ลองเปลี่ยนตัวกรองกลุ่มงาน หรือล้างคำค้นหาเพื่อดูเคสทั้งหมดในขอบเขตที่อนุญาต
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredEntries.map((entry) => {
              const isComposerOpen = openComposerEntryId === entry.id;
              return (
                <article key={entry.id} className="p-5 sm:p-6 space-y-4">
                  {/* Anonymized Entry Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 font-mono font-semibold text-[#0F2A4A] bg-slate-100 border border-slate-200 rounded-md">
                          <EyeOff className="w-3 h-3" aria-hidden="true" />
                          {entry.anonymizedPeerCode}
                        </span>
                        <span className="tabular-nums">นศพ.ชั้นปีที่ {entry.cohortYear}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{entry.date}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-medium text-slate-700">{entry.department}</span>
                        <span aria-hidden="true">·</span>
                        <span>{entry.setting}</span>
                      </div>

                      <h3 className="text-base font-semibold text-slate-900">
                        <span className="font-mono text-sm text-[#0F2A4A] mr-2">
                          {entry.icd10}
                        </span>
                        {entry.diagnosis}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-slate-500 tabular-nums">
                        {entry.reviews.length} ความเห็น
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenComposer(entry.id)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          isComposerOpen
                            ? 'bg-slate-100 text-slate-800 border-slate-300'
                            : 'bg-[#0F2A4A] text-white border-[#0F2A4A] hover:bg-[#163B66]'
                        }`}
                      >
                        <MessageSquarePlus className="w-4 h-4" aria-hidden="true" />
                        <span>
                          {isComposerOpen ? 'ปิดแบบฟอร์ม' : 'ให้ Peer-Review แบบไม่ระบุตัวตน'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* De-identified Clinical Context */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="text-slate-700">
                      <span className="text-slate-500">สรุปเคส (De-identified): </span>
                      {entry.anonymizedPatientSummary}
                    </div>
                    <div className="text-slate-700">
                      <span className="text-slate-500">หัตถการ ({entry.role}): </span>
                      <span className="font-medium text-slate-900">{entry.procedure}</span>
                    </div>
                  </div>

                  {/* Peer's Reflection */}
                  <div className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-lg border border-slate-200/80">
                    <span className="font-semibold text-slate-900">
                      บันทึกสะท้อนคิดของเพื่อนร่วมรุ่น:{' '}
                    </span>
                    {entry.reflection}
                  </div>

                  {/* Constructive Anonymous Feedback Composer */}
                  {isComposerOpen && (
                    <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 sm:p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                        <div className="flex items-center gap-2 text-xs font-semibold text-[#0F2A4A]">
                          <UserCheck className="w-4 h-4 text-[#0F766E]" aria-hidden="true" />
                          <span>ส่งในนาม: เพื่อนร่วมรุ่น (ไม่ระบุตัวตน)</span>
                        </div>
                        <span className="text-xs text-slate-500">
                          เน้นข้อมูลทางคลินิกเชิงสร้างสรรค์และปลอดภัยต่อผู้เรียน
                        </span>
                      </div>

                      {/* 2-Axis Rubric Rating */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-semibold text-slate-800">
                            เหตุผลทางคลินิก (Clinical Reasoning)
                          </label>
                          <div className="flex items-center gap-1.5">
                            {SCORE_LEVELS.map((val) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setReasoningScore(val)}
                                className={`w-10 h-10 text-xs font-semibold rounded-lg border tabular-nums cursor-pointer transition-colors ${
                                  reasoningScore === val
                                    ? 'bg-[#0F2A4A] text-white border-[#0F2A4A]'
                                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                }`}
                              >
                                {val}
                              </button>
                            ))}
                            <span className="ml-2 text-xs text-slate-500 tabular-nums">
                              {reasoningScore} / 5
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-xs font-semibold text-slate-800">
                            ความลึกของการสะท้อนคิด (Reflection Depth)
                          </label>
                          <div className="flex items-center gap-1.5">
                            {SCORE_LEVELS.map((val) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setReflectionScore(val)}
                                className={`w-10 h-10 text-xs font-semibold rounded-lg border tabular-nums cursor-pointer transition-colors ${
                                  reflectionScore === val
                                    ? 'bg-[#0F766E] text-white border-[#0F766E]'
                                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                }`}
                              >
                                {val}
                              </button>
                            ))}
                            <span className="ml-2 text-xs text-slate-500 tabular-nums">
                              {reflectionScore} / 5
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Constructive Quick Starter Buttons */}
                      <div className="space-y-1.5">
                        <span className="block text-xs font-medium text-slate-600">
                          ตัวช่วยขึ้นต้นประโยคเชิงสร้างสรรค์ (คลิกเพื่อเติมข้อความ):
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {CONSTRUCTIVE_STARTERS.map((starter) => (
                            <button
                              key={starter.label}
                              type="button"
                              onClick={() =>
                                handleApplyStarter(starter.target, starter.text)
                              }
                              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 cursor-pointer whitespace-nowrap shrink-0"
                            >
                              {starter.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label
                            htmlFor={`peer-strengths-${entry.id}`}
                            className="block text-xs font-semibold text-slate-800"
                          >
                            จุดแข็งทางคลินิกที่ทำได้ดี *
                          </label>
                          <textarea
                            id={`peer-strengths-${entry.id}`}
                            rows={3}
                            value={strengthsDraft}
                            onChange={(e) => {
                              setStrengthsDraft(e.target.value);
                              setFormError(null);
                            }}
                            placeholder="ระบุสิ่งที่เพื่อนวิเคราะห์ ตรวจร่างกาย หรือสะท้อนคิดได้ดี..."
                            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label
                            htmlFor={`peer-suggestions-${entry.id}`}
                            className="block text-xs font-semibold text-slate-800"
                          >
                            ข้อเสนอแนะเชิงสร้างสรรค์เพื่อการพัฒนาต่อ *
                          </label>
                          <textarea
                            id={`peer-suggestions-${entry.id}`}
                            rows={3}
                            value={suggestionsDraft}
                            onChange={(e) => {
                              setSuggestionsDraft(e.target.value);
                              setFormError(null);
                            }}
                            placeholder="เสนอแนวทางการประเมินเพิ่มเติม หลักฐานเชิงประจักษ์ หรือประเด็นที่ควรทบทวน..."
                            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                      </div>

                      {formError && (
                        <p className="text-xs font-medium text-red-700">{formError}</p>
                      )}

                      <div className="flex flex-wrap items-center justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setOpenComposerEntryId(null);
                            setFormError(null);
                          }}
                          className="px-4 py-2 min-h-[44px] text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSubmitForm(entry.id)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] text-xs font-medium text-white bg-[#0F766E] hover:bg-[#0D625C] rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <Send className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>ส่ง Peer-Review แบบไม่ระบุตัวตน</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Existing Anonymous Peer Comments */}
                  {entry.reviews.length > 0 && (
                    <div className="space-y-2.5 pt-1">
                      <div className="text-xs font-semibold text-slate-700">
                        ข้อเสนอแนะจากเพื่อนร่วมรุ่น ({entry.reviews.length})
                      </div>
                      <div className="space-y-2.5">
                        {entry.reviews.map((rev) => (
                          <div
                            key={rev.id}
                            className="p-3.5 bg-white border border-slate-200 rounded-lg space-y-2"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="font-semibold text-slate-900">
                                  {rev.reviewerAlias}
                                </span>
                                <span className="text-slate-400" aria-hidden="true">
                                  ·
                                </span>
                                <span className="text-slate-500 tabular-nums">
                                  {rev.submittedAt}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs tabular-nums">
                                <span className="px-2 py-0.5 bg-slate-100 text-[#0F2A4A] font-medium rounded-md border border-slate-200">
                                  Clinical Reasoning {rev.clinicalReasoningScore}/5
                                </span>
                                <span className="px-2 py-0.5 bg-slate-100 text-[#0F766E] font-medium rounded-md border border-slate-200">
                                  Reflection {rev.reflectionDepthScore}/5
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs sm:text-sm text-slate-700 leading-relaxed">
                              <div>
                                <span className="font-semibold text-emerald-800">
                                  จุดแข็ง:{' '}
                                </span>
                                {rev.strengths}
                              </div>
                              <div>
                                <span className="font-semibold text-[#0F2A4A]">
                                  ข้อเสนอแนะ:{' '}
                                </span>
                                {rev.suggestions}
                              </div>
                            </div>

                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => onToggleHelpful(entry.id, rev.id)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer tabular-nums whitespace-nowrap shrink-0 ${
                                  rev.markedHelpfulByMe
                                    ? 'bg-[#0F766E]/10 text-[#0F766E] border-[#0F766E]/40'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                <ThumbsUp className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>เป็นประโยชน์ ({rev.helpfulCount})</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
