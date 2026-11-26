import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Award,
  BookCheck,
  CheckCircle2,
  ExternalLink,
  Flame,
  Loader2,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { CLINICAL_DEPARTMENTS } from '../data/initialMedicalData';
import {
  AcademicYearLevel,
  ClinicalQuizResponse,
  DutyShift,
  LearningStreakState,
  LogbookEntry,
  QuizCompletionRecord,
} from '../types/medicalSchool';

interface ClinicalKnowledgeCheckPanelProps {
  currentStudentName: string;
  yearLevel?: AcademicYearLevel;
  shifts: DutyShift[];
  logbookEntries: LogbookEntry[];
  learningStreak: LearningStreakState;
  onCompleteQuiz: (result: {
    department: string;
    score: number;
    total: number;
  }) => QuizCompletionRecord;
}

const THAI_OPTION_LABELS = ['ก.', 'ข.', 'ค.', 'ง.'] as const;

function isSafeExternalUrl(rawUri: string): boolean {
  try {
    const u = new URL(rawUri);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

function getBangkokTodayKey(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function ClinicalKnowledgeCheckPanel({
  currentStudentName,
  yearLevel = '6',
  shifts,
  logbookEntries,
  learningStreak,
  onCompleteQuiz,
}: ClinicalKnowledgeCheckPanelProps) {
  const detectedDepartment = useMemo(() => {
    const activeShift = shifts.find((s) => s.assignedStudent === currentStudentName);
    if (activeShift?.department) return activeShift.department;
    if (logbookEntries[0]?.department) return logbookEntries[0].department;
    return CLINICAL_DEPARTMENTS[0]?.nameTh ?? 'กลุ่มงานอายุรศาสตร์';
  }, [currentStudentName, logbookEntries, shifts]);

  const [selectedDepartment, setSelectedDepartment] = useState<string>(detectedDepartment);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<ClinicalQuizResponse | null>(null);

  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({});
  const [checkedQuestions, setCheckedQuestions] = useState<Record<string, boolean>>({});
  const [completedRecordByInstance, setCompletedRecordByInstance] = useState<
    Record<string, QuizCompletionRecord>
  >({});

  const clientCacheRef = useRef<Map<string, ClinicalQuizResponse>>(new Map());

  useEffect(() => {
    setSelectedDepartment(detectedDepartment);
  }, [detectedDepartment]);

  const resetInteractionForQuiz = useCallback((nextQuiz: ClinicalQuizResponse) => {
    setQuiz(nextQuiz);
    setActiveIndex(0);
    setSelectedOptions({});
    setCheckedQuestions({});
  }, []);

  const fetchQuiz = useCallback(
    async (department: string, forceRefresh = false) => {
      const todayKey = getBangkokTodayKey();
      const cacheKey = `${department}::${todayKey}`;

      if (!forceRefresh) {
        const cached = clientCacheRef.current.get(cacheKey);
        if (cached) {
          resetInteractionForQuiz(cached);
          setErrorMsg(null);
          return;
        }
      }

      if (
        typeof window !== 'undefined' &&
        window.location.hostname.endsWith('.github.io')
      ) {
        setErrorMsg(
          'แบบทดสอบความรู้ทางคลินิกประจำวัน (Gemini Search) ต้องใช้งานผ่านเซิร์ฟเวอร์ Backend ส่วนสถิติ Streak และข้อมูลคลินิกอื่นๆ ใช้งานบน GitHub Pages ได้ตามปกติ'
        );
        return;
      }

      setLoading(true);
      setErrorMsg(null);

      try {
        const res = await fetch('/api/clinical-quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            department,
            yearLevel,
            forceRefresh,
          }),
        });

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          setErrorMsg(
            'ไม่พบเซิร์ฟเวอร์ API สำหรับสร้างแบบทดสอบคลินิกบนโฮสต์แบบ Static'
          );
          return;
        }

        const data = (await res.json()) as Partial<ClinicalQuizResponse> & {
          error?: string;
        };

        if (!res.ok) {
          setErrorMsg(
            data.error ||
              'ไม่สามารถสร้างแบบทดสอบความรู้คลินิกได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง'
          );
          return;
        }

        const normalized = data as ClinicalQuizResponse;
        clientCacheRef.current.set(cacheKey, normalized);
        resetInteractionForQuiz(normalized);
      } catch {
        setErrorMsg(
          'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อสร้างแบบทดสอบความรู้คลินิกได้ กรุณาลองใหม่อีกครั้ง'
        );
      } finally {
        setLoading(false);
      }
    },
    [resetInteractionForQuiz, yearLevel]
  );

  useEffect(() => {
    void fetchQuiz(selectedDepartment, false);
  }, [fetchQuiz, selectedDepartment]);

  const todayKey = getBangkokTodayKey();
  const hasCompletedToday = learningStreak.completedDates.includes(todayKey);

  const questions = quiz?.questions ?? [];
  const activeQuestion = questions[activeIndex] ?? null;

  const checkedCount = useMemo(
    () => questions.filter((q) => Boolean(checkedQuestions[q.id])).length,
    [checkedQuestions, questions]
  );

  const correctCount = useMemo(
    () =>
      questions.filter(
        (q) => checkedQuestions[q.id] && selectedOptions[q.id] === q.correctIndex
      ).length,
    [checkedQuestions, questions, selectedOptions]
  );

  const activeInstanceCompletion = quiz
    ? completedRecordByInstance[quiz.quizInstanceId] ?? null
    : null;

  const handleSelectOption = (questionId: string, optionIdx: number) => {
    if (checkedQuestions[questionId]) return;
    setSelectedOptions((prev) => ({ ...prev, [questionId]: optionIdx }));
  };

  const handleCheckQuestion = (questionId: string) => {
    if (selectedOptions[questionId] === undefined || checkedQuestions[questionId]) return;

    const nextChecked = { ...checkedQuestions, [questionId]: true };
    setCheckedQuestions(nextChecked);

    if (quiz && quiz.questions.length > 0) {
      const allNowChecked = quiz.questions.every((q) => Boolean(nextChecked[q.id]));
      if (allNowChecked && !completedRecordByInstance[quiz.quizInstanceId]) {
        const finalScore = quiz.questions.reduce(
          (sum, q) => sum + (selectedOptions[q.id] === q.correctIndex ? 1 : 0),
          0
        );
        const record = onCompleteQuiz({
          department: quiz.department,
          score: finalScore,
          total: quiz.questions.length,
        });
        setCompletedRecordByInstance((prev) => ({
          ...prev,
          [quiz.quizInstanceId]: record,
        }));
      }
    }
  };

  const isCurrentRotation = selectedDepartment === detectedDepartment;

  return (
    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-6 sm:p-7 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#0F766E] font-semibold">
            <span>แบบทดสอบความรู้ทางคลินิกประจำวัน (Clinical Knowledge Check)</span>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <span className="text-slate-500 font-normal">
              สร้างโจทย์ 3 ข้อจากแนวทางเวชปฏิบัติล่าสุดผ่าน Google Search Grounding
            </span>
          </div>

          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <BookCheck className="w-5 h-5 text-[#0F2A4A] shrink-0" aria-hidden="true" />
            <span>ทบทวนความรู้คลินิกประจำวัน: {selectedDepartment}</span>
          </h2>

          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span>
              {isCurrentRotation
                ? `ปรับโจทย์อัตโนมัติตามกลุ่มงานปัจจุบันของ ${currentStudentName}`
                : `ชุดคำถามสำหรับ ${selectedDepartment}`}
            </span>
            {quiz?.generatedAt && (
              <>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">สร้างชุดข้อสอบเมื่อ {quiz.generatedAt}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            aria-label="เลือกกลุ่มงานคลินิกสำหรับ Clinical Knowledge Check"
            className="px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-800"
          >
            {CLINICAL_DEPARTMENTS.map((dept) => (
              <option key={dept.id} value={dept.nameTh}>
                {dept.nameTh}
                {dept.nameTh === detectedDepartment ? ' (กลุ่มงานปัจจุบัน)' : ''}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={loading}
            onClick={() => void fetchQuiz(selectedDepartment, true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#0F2A4A] hover:bg-[#163B66] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>{loading ? 'กำลังออกข้อสอบ...' : 'สร้างชุดคำถามใหม่'}</span>
          </button>
        </div>
      </div>

      {/* Learning Streak & Daily Progress Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-slate-200 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 bg-slate-50/70">
        <div className="p-4 sm:px-6">
          <div className="text-xs text-slate-500">Learning Streak ต่อเนื่อง</div>
          <div className="mt-1 flex items-center gap-2">
            <Flame
              className={`w-5 h-5 shrink-0 ${
                learningStreak.currentStreakDays > 0 ? 'text-amber-600' : 'text-slate-400'
              }`}
              aria-hidden="true"
            />
            <span className="text-xl sm:text-2xl font-semibold text-slate-900 tabular-nums">
              {learningStreak.currentStreakDays} วัน
            </span>
          </div>
          <div className="mt-1 text-xs flex items-center gap-1">
            {hasCompletedToday ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                บันทึก Streak วันนี้แล้ว
              </span>
            ) : (
              <span className="text-amber-800 font-medium">
                ทำครบ 3 ข้อวันนี้เพื่อต่อ Streak
              </span>
            )}
          </div>
        </div>

        <div className="p-4 sm:px-6 border-l border-slate-200 lg:border-l-0">
          <div className="text-xs text-slate-500">คะแนนสะสม (Learning Points)</div>
          <div className="mt-1 flex items-center gap-2">
            <Award className="w-5 h-5 text-[#0F766E] shrink-0" aria-hidden="true" />
            <span className="text-xl sm:text-2xl font-semibold text-[#0F2A4A] tabular-nums">
              {learningStreak.totalPoints.toLocaleString('th-TH')}
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500">คะแนนสะสมตลอดภาคการศึกษา</div>
        </div>

        <div className="p-4 sm:px-6">
          <div className="text-xs text-slate-500">สถิติต่อเนื่องสูงสุด (Best Streak)</div>
          <div className="mt-1 text-xl sm:text-2xl font-semibold text-slate-900 tabular-nums">
            {learningStreak.bestStreakDays} วัน
          </div>
          <div className="mt-1 text-xs text-slate-500 tabular-nums">
            ทำแบบทดสอบแล้ว {learningStreak.completedDates.length} วัน
          </div>
        </div>

        <div className="p-4 sm:px-6 border-l border-slate-200 lg:border-l-0">
          <div className="text-xs text-slate-500">ความก้าวหน้าชุดปัจจุบัน</div>
          <div className="mt-1 text-xl sm:text-2xl font-semibold text-slate-900 tabular-nums">
            {checkedCount} / {questions.length || 3} ข้อ
          </div>
          <div className="mt-1 text-xs text-slate-600 tabular-nums">
            ตอบถูก <strong className="text-emerald-700">{correctCount}</strong> ข้อ
          </div>
        </div>
      </div>

      {/* Main Quiz Body */}
      <div className="p-6 sm:p-7">
        {loading && !quiz ? (
          <div className="py-10 flex flex-col items-center justify-center text-center gap-3">
            <Loader2 className="w-6 h-6 text-[#0F2A4A] animate-spin" aria-hidden="true" />
            <div className="text-sm font-medium text-slate-800">
              กำลังสืบค้นแนวทางเวชปฏิบัติล่าสุดและสร้างโจทย์คลินิก 3 ข้อสำหรับ {selectedDepartment}...
            </div>
            <p className="text-xs text-slate-500">
              อ้างอิงจากแนวทางการรักษามาตรฐาน (AHA, ESC, IDSA, KDIGO, GOLD, ราชวิทยาลัยฯ)
            </p>
          </div>
        ) : errorMsg ? (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-1">
                <div className="text-sm font-semibold text-rose-900">
                  ไม่สามารถโหลด Clinical Knowledge Check ได้
                </div>
                <p className="text-xs text-rose-800 leading-relaxed">{errorMsg}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void fetchQuiz(selectedDepartment, true)}
              className="px-3.5 py-2 text-xs font-medium text-rose-800 bg-white border border-rose-300 rounded-lg hover:bg-rose-100 cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
            >
              ลองใหม่อีกครั้ง
            </button>
          </div>
        ) : quiz && activeQuestion ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 8 Cols: Interactive 3-Question Vignette */}
            <div className="lg:col-span-8 space-y-5">
              {/* Quiz Title & Step Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-[#0F2A4A]">{quiz.quizTitle}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{activeQuestion.clinicalContext}</p>
                </div>

                <div className="inline-flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-lg self-start">
                  {questions.map((q, idx) => {
                    const isChecked = Boolean(checkedQuestions[q.id]);
                    const isCorrect = isChecked && selectedOptions[q.id] === q.correctIndex;
                    const isActive = idx === activeIndex;
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setActiveIndex(idx)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          isActive
                            ? 'bg-white text-[#0F2A4A] shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {isChecked ? (
                          isCorrect ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-rose-600" aria-hidden="true" />
                          )
                        ) : null}
                        <span className="tabular-nums">ข้อที่ {idx + 1}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Question Stem & Options */}
              <div className="border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
                <div className="space-y-2">
                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1 tabular-nums">
                    <span className="font-semibold text-[#0F766E]">
                      คำถามที่ {activeIndex + 1} จาก {questions.length}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{activeQuestion.clinicalContext}</span>
                  </div>
                  <p className="text-sm sm:text-base font-medium text-slate-900 leading-relaxed">
                    {activeQuestion.question}
                  </p>
                </div>

                <div className="space-y-2.5" role="radiogroup" aria-label={`ตัวเลือกคำถามข้อที่ ${activeIndex + 1}`}>
                  {activeQuestion.options.map((optionText, optIdx) => {
                    const isSelected = selectedOptions[activeQuestion.id] === optIdx;
                    const isChecked = Boolean(checkedQuestions[activeQuestion.id]);
                    const isRightAnswer = optIdx === activeQuestion.correctIndex;

                    let cardStyle =
                      'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 text-slate-800';
                    if (isChecked) {
                      if (isRightAnswer) {
                        cardStyle = 'border-emerald-300 bg-emerald-50/70 text-emerald-950';
                      } else if (isSelected) {
                        cardStyle = 'border-rose-300 bg-rose-50/70 text-rose-950';
                      } else {
                        cardStyle = 'border-slate-200 bg-slate-50/40 text-slate-500';
                      }
                    } else if (isSelected) {
                      cardStyle = 'border-[#0F2A4A] bg-[#0F2A4A]/5 text-[#0F2A4A]';
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        disabled={isChecked}
                        onClick={() => handleSelectOption(activeQuestion.id, optIdx)}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition-colors flex items-start justify-between gap-3 ${cardStyle} ${
                          isChecked ? 'cursor-default' : 'cursor-pointer'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="font-mono text-xs font-semibold mt-0.5 shrink-0">
                            {THAI_OPTION_LABELS[optIdx]}
                          </span>
                          <span className="text-xs sm:text-sm leading-relaxed">{optionText}</span>
                        </div>

                        {isChecked && isRightAnswer && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 shrink-0 mt-0.5 whitespace-nowrap">
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>คำตอบที่ถูกต้อง</span>
                          </span>
                        )}
                        {isChecked && isSelected && !isRightAnswer && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 shrink-0 mt-0.5 whitespace-nowrap">
                            <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>คำตอบที่เลือก</span>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Clinical Rationale After Checking */}
                {checkedQuestions[activeQuestion.id] && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-slate-900">
                        คำอธิบายเชิงคลินิก (Clinical Rationale)
                      </span>
                      <span className="text-[#0F766E] font-medium">
                        อ้างอิง: {activeQuestion.guidelineRef}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                      {activeQuestion.explanation}
                    </p>
                  </div>
                )}

                {/* Navigation & Check Bar */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={activeIndex === 0}
                      onClick={() => setActiveIndex((prev) => Math.max(0, prev - 1))}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>ข้อก่อนหน้า</span>
                    </button>

                    <button
                      type="button"
                      disabled={activeIndex >= questions.length - 1}
                      onClick={() =>
                        setActiveIndex((prev) => Math.min(questions.length - 1, prev + 1))
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <span>ข้อถัดไป</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>

                  {!checkedQuestions[activeQuestion.id] ? (
                    <button
                      type="button"
                      disabled={selectedOptions[activeQuestion.id] === undefined}
                      onClick={() => handleCheckQuestion(activeQuestion.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#0F766E] hover:bg-[#0D625C] disabled:opacity-45 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>
                        {checkedCount === questions.length - 1
                          ? 'ตรวจคำตอบและสรุปคะแนน'
                          : 'ตรวจคำตอบข้อนี้'}
                      </span>
                    </button>
                  ) : activeIndex < questions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setActiveIndex((prev) => prev + 1)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#0F2A4A] hover:bg-[#163B66] rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <span>ไปข้อถัดไป</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Completion Summary Card */}
              {activeInstanceCompletion && (
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-950">
                      <Award className="w-4 h-4 text-[#0F766E] shrink-0" aria-hidden="true" />
                      <span className="tabular-nums">
                        สรุปผลคะแนน: ตอบถูก {activeInstanceCompletion.score} / {activeInstanceCompletion.total} ข้อ · ได้รับ +{activeInstanceCompletion.pointsEarned} Learning Points
                      </span>
                    </div>
                    <p className="text-xs text-emerald-900">
                      {activeInstanceCompletion.isDailyStreakAwarded
                        ? `บันทึก Learning Streak ประจำวันสำเร็จ! ต่อเนื่อง ${learningStreak.currentStreakDays} วันแล้ว`
                        : 'บันทึกคะแนนฝึกหัดเพิ่มเติมเข้าสู่คะแนนสะสมเรียบร้อยแล้ว'}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void fetchQuiz(selectedDepartment, true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#0F2A4A] bg-white border border-emerald-300 rounded-lg hover:bg-emerald-100/70 cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
                  >
                    <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>ทำชุดฝึกหัดใหม่ (3 ข้อ)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Right 4 Cols: Streak Scoring Rules, History & Search Grounding Sources */}
            <div className="lg:col-span-4 space-y-5">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-2.5">
                <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
                  <span>เกณฑ์การสะสม Learning Streak</span>
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-700 tabular-nums">
                  <li className="flex items-center justify-between gap-2">
                    <span>ตอบถูกประจำวัน (ข้อละ)</span>
                    <span className="font-mono font-semibold text-[#0F2A4A]">+10 คะแนน</span>
                  </li>
                  <li className="flex items-center justify-between gap-2">
                    <span>ทำครบ 3 ข้อประจำวัน</span>
                    <span className="font-mono font-semibold text-[#0F766E]">+20 คะแนน · +1 วัน</span>
                  </li>
                  <li className="flex items-center justify-between gap-2">
                    <span>โบนัสคะแนนเต็ม 3/3 ข้อ</span>
                    <span className="font-mono font-semibold text-amber-800">+10 คะแนน</span>
                  </li>
                  <li className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-200 text-slate-500">
                    <span>ชุดฝึกหัดเพิ่มเติม (ข้อละ)</span>
                    <span className="font-mono font-semibold text-slate-700">+5 คะแนน</span>
                  </li>
                </ul>
              </div>

              {learningStreak.recentHistory.length > 0 && (
                <div className="border border-slate-200 rounded-xl p-4 space-y-2.5">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    ประวัติการทำแบบทดสอบล่าสุด
                  </h4>
                  <ul className="divide-y divide-slate-100 text-xs">
                    {learningStreak.recentHistory.slice(0, 3).map((rec) => (
                      <li key={rec.id} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium text-slate-800 truncate">
                            {rec.department}
                          </div>
                          <div className="text-[11px] text-slate-500 tabular-nums">
                            {rec.completedAt} · ได้ {rec.score}/{rec.total} ข้อ
                          </div>
                        </div>
                        <span className="font-mono font-semibold text-[#0F766E] tabular-nums shrink-0">
                          +{rec.pointsEarned}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {quiz.sources.length > 0 && (
                <div className="border border-slate-200 rounded-xl p-4 space-y-2.5">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    แหล่งข้อมูลอ้างอิงจาก Search Grounding
                  </h4>
                  <div className="space-y-2">
                    {quiz.sources
                      .filter((src) => isSafeExternalUrl(src.uri))
                      .slice(0, 4)
                      .map((src) => (
                        <a
                          key={src.uri}
                          href={src.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-2.5 rounded-lg border border-slate-200 hover:border-[#0F2A4A]/40 hover:bg-slate-50 transition-colors"
                        >
                          <div className="text-xs font-medium text-slate-900 line-clamp-2 leading-snug">
                            {src.title}
                          </div>
                          <div className="mt-1 text-[11px] text-[#0F766E] inline-flex items-center gap-1 max-w-full">
                            <span className="truncate">{src.hostname}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                          </div>
                        </a>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
