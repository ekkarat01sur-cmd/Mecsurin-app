import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpenCheck,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  Stethoscope,
} from 'lucide-react';
import { CLINICAL_DEPARTMENTS } from '../data/initialMedicalData';
import {
  DutyShift,
  LogbookEntry,
  MedicalDigestResponse,
} from '../types/medicalSchool';

interface DailyMedicalDigestPanelProps {
  currentStudentName: string;
  shifts: DutyShift[];
  logbookEntries: LogbookEntry[];
}

function renderFormattedLine(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

function isSafeExternalUrl(rawUri: string): boolean {
  try {
    const u = new URL(rawUri);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export function DailyMedicalDigestPanel({
  currentStudentName,
  shifts,
  logbookEntries,
}: DailyMedicalDigestPanelProps) {
  const detectedDepartment = useMemo(() => {
    const activeShift = shifts.find((s) => s.assignedStudent === currentStudentName);
    if (activeShift?.department) return activeShift.department;
    if (logbookEntries[0]?.department) return logbookEntries[0].department;
    return CLINICAL_DEPARTMENTS[0]?.nameTh ?? 'กลุ่มงานอายุรศาสตร์';
  }, [currentStudentName, logbookEntries, shifts]);

  const [selectedDepartment, setSelectedDepartment] = useState<string>(
    detectedDepartment
  );
  const [focusTopicInput, setFocusTopicInput] = useState<string>('');
  const [activeTopic, setActiveTopic] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [digest, setDigest] = useState<MedicalDigestResponse | null>(null);

  const clientCacheRef = useRef<Map<string, MedicalDigestResponse>>(new Map());

  useEffect(() => {
    setSelectedDepartment(detectedDepartment);
  }, [detectedDepartment]);

  const fetchDigest = useCallback(
    async (department: string, focusTopic: string, forceRefresh = false) => {
      const cacheKey = `${department}::${focusTopic.toLowerCase()}`;
      if (!forceRefresh) {
        const cached = clientCacheRef.current.get(cacheKey);
        if (cached) {
          setDigest(cached);
          setErrorMsg(null);
          return;
        }
      }

      if (
        typeof window !== 'undefined' &&
        window.location.hostname.endsWith('.github.io')
      ) {
        setErrorMsg(
          'ฟีเจอร์สรุปแนวทางเวชปฏิบัติอัตโนมัติต้องใช้งานผ่านเซิร์ฟเวอร์ Backend (Node.js + Gemini API) สำหรับ GitHub Pages สามารถใช้งานข้อมูลคลินิก ตารางเวร E-Logbook และการซิงค์ Google Sheet ได้ตามปกติ'
        );
        return;
      }

      setLoading(true);
      setErrorMsg(null);

      try {
        const res = await fetch('/api/medical-digest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            department,
            focusTopic,
            forceRefresh,
          }),
        });

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          setErrorMsg(
            'ไม่พบเซิร์ฟเวอร์ API สำหรับสรุปข้อมูลทางการแพทย์บนโฮสต์แบบ Static'
          );
          return;
        }

        const data = (await res.json()) as Partial<MedicalDigestResponse> & {
          error?: string;
        };

        if (!res.ok) {
          setErrorMsg(
            data.error ||
              'ไม่สามารถดึงสรุปแนวทางเวชปฏิบัติล่าสุดได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง'
          );
          return;
        }

        const normalized = data as MedicalDigestResponse;
        clientCacheRef.current.set(cacheKey, normalized);
        setDigest(normalized);
      } catch {
        setErrorMsg(
          'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อดึงข้อมูลทางการแพทย์ได้ กรุณาลองใหม่อีกครั้ง'
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void fetchDigest(selectedDepartment, activeTopic, false);
  }, [activeTopic, fetchDigest, selectedDepartment]);

  const handleTopicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextTopic = focusTopicInput.trim();
    if (nextTopic === activeTopic) {
      void fetchDigest(selectedDepartment, nextTopic, true);
    } else {
      setActiveTopic(nextTopic);
    }
  };

  const isCurrentRotation = selectedDepartment === detectedDepartment;

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-7 space-y-5">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#0F766E] font-semibold">
            <span>สรุปแนวทางเวชปฏิบัติประจำวัน (Daily Medical Digest)</span>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <span className="text-slate-500 font-normal">
              สืบค้นจากแหล่งข้อมูลทางการแพทย์ผ่าน Search Grounding
            </span>
          </div>

          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <BookOpenCheck className="w-5 h-5 text-[#0F2A4A] shrink-0" aria-hidden="true" />
            <span>อัปเดตความรู้คลินิก: {selectedDepartment}</span>
          </h2>

          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span>
              {isCurrentRotation
                ? `อ้างอิงตามกลุ่มงานปัจจุบันของ ${currentStudentName}`
                : `กำลังแสดงข้อมูลสำหรับ ${selectedDepartment}`}
            </span>
            {digest?.generatedAt && (
              <>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">อัปเดตเมื่อ {digest.generatedAt}</span>
              </>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          <select
            value={selectedDepartment}
            onChange={(e) => {
              setSelectedDepartment(e.target.value);
              setActiveTopic('');
              setFocusTopicInput('');
            }}
            aria-label="เลือกกลุ่มงานคลินิกสำหรับ Daily Medical Digest"
            className="px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-800"
          >
            {CLINICAL_DEPARTMENTS.map((dept) => (
              <option key={dept.id} value={dept.nameTh}>
                {dept.nameTh}
                {dept.nameTh === detectedDepartment ? ' (กลุ่มงานปัจจุบัน)' : ''}
              </option>
            ))}
          </select>

          <form onSubmit={handleTopicSubmit} className="flex items-center gap-2">
            <div className="relative">
              <Search
                className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                type="text"
                value={focusTopicInput}
                onChange={(e) => setFocusTopicInput(e.target.value)}
                placeholder="เน้นหัวข้อ เช่น Sepsis, ACS..."
                className="w-44 sm:w-48 pl-8 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={() => void fetchDigest(selectedDepartment, activeTopic, true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#0F2A4A] hover:bg-[#163B66] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>{loading ? 'กำลังสืบค้น...' : 'อัปเดตล่าสุด'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Body */}
      {loading && !digest ? (
        <div className="py-10 flex flex-col items-center justify-center text-center gap-3">
          <Loader2 className="w-6 h-6 text-[#0F2A4A] animate-spin" aria-hidden="true" />
          <div className="text-sm font-medium text-slate-800">
            กำลังสืบค้นแนวทางเวชปฏิบัติและงานวิจัยล่าสุดสำหรับ {selectedDepartment}...
          </div>
          <p className="text-xs text-slate-500">
            ระบบกำลังประมวลผลข้อมูลจากองค์กรการแพทย์มาตรฐาน (WHO, AHA, ESC, IDSA, ราชวิทยาลัยฯ)
          </p>
        </div>
      ) : errorMsg ? (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <div className="text-sm font-semibold text-rose-900">
                ไม่สามารถโหลด Daily Medical Digest ได้
              </div>
              <p className="text-xs text-rose-800 leading-relaxed">{errorMsg}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void fetchDigest(selectedDepartment, activeTopic, true)}
            className="px-3.5 py-2 text-xs font-medium text-rose-800 bg-white border border-rose-300 rounded-lg hover:bg-rose-100 cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      ) : digest ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base sm:text-lg font-semibold text-[#0F2A4A]">
              {digest.digestTitle}
            </h3>
            {digest.focusTopic && (
              <span className="text-xs text-slate-500">
                หัวข้อเจาะจง: <strong className="text-slate-800">{digest.focusTopic}</strong>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Key Guideline Updates */}
            <div className="lg:col-span-7 space-y-3">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                สาระสำคัญและเกณฑ์เวชปฏิบัติล่าสุด (Guideline Updates)
              </h4>

              {digest.summaryPoints.length > 0 ? (
                <ul className="divide-y divide-slate-200 border border-slate-200 rounded-xl px-4">
                  {digest.summaryPoints.map((point, idx) => (
                    <li
                      key={idx}
                      className="py-3.5 text-xs sm:text-sm text-slate-700 leading-relaxed flex items-start gap-2.5"
                    >
                      <span className="font-mono text-xs font-semibold text-[#0F766E] tabular-nums mt-0.5 shrink-0">
                        {String(idx + 1).padStart(2, '0')}.
                      </span>
                      <span>{renderFormattedLine(point)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="border border-slate-200 rounded-xl p-4 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {digest.rawMarkdown}
                </div>
              )}
            </div>

            {/* Bedside Takeaways & Guideline References */}
            <div className="lg:col-span-5 space-y-5">
              {digest.bedsideTakeaways.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-2.5">
                  <h4 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <Stethoscope className="w-4 h-4 text-[#0F766E]" aria-hidden="true" />
                    <span>การประยุกต์ใช้ข้างเตียงและเตรียมสอบ OSCE</span>
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-700 leading-relaxed">
                    {digest.bedsideTakeaways.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-[#0F2A4A] font-bold" aria-hidden="true">
                          •
                        </span>
                        <span>{renderFormattedLine(tip)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {digest.guidelineReferences.length > 0 && (
                <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    แนวทางเวชปฏิบัติที่อ้างอิง
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {digest.guidelineReferences.map((refName, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {renderFormattedLine(refName)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Grounded Web Sources */}
          {digest.sources.length > 0 && (
            <div className="pt-4 border-t border-slate-200 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  แหล่งข้อมูลอ้างอิงจากการสืบค้น (Verified Search Grounding Sources)
                </h4>
                {digest.searchQueries.length > 0 && (
                  <span className="text-[11px] text-slate-400 truncate max-w-full">
                    คำค้น: {digest.searchQueries.join(' · ')}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {digest.sources
                  .filter((src) => isSafeExternalUrl(src.uri))
                  .map((src) => (
                    <a
                      key={src.uri}
                      href={src.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-lg border border-slate-200 hover:border-[#0F2A4A]/40 hover:bg-slate-50 transition-colors flex flex-col justify-between gap-1.5"
                    >
                      <span className="text-xs font-medium text-slate-900 line-clamp-2 leading-snug">
                        {src.title}
                      </span>
                      <span className="text-[11px] text-[#0F766E] inline-flex items-center gap-1 truncate">
                        <span className="truncate">{src.hostname}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                      </span>
                    </a>
                  ))}
              </div>
            </div>
          )}

          <p className="text-[11px] text-slate-500">
            หมายเหตุ: ข้อมูลสรุปนี้จัดทำขึ้นเพื่อประกอบการศึกษาทางคลินิก ควรตรวจสอบเทียบกับแนวทางเวชปฏิบัติเฉพาะของโรงพยาบาลสุรินทร์ (CPG) และคำแนะนำของอาจารย์แพทย์ผู้ดูแลผู้ป่วย
          </p>
        </div>
      ) : null}
    </section>
  );
}
