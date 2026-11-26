import { useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  Eraser,
  Lock,
  PenTool,
  RotateCcw,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  AcademicYearLevel,
  ClinicalSkillMasteryItem,
  UserRole,
} from '../types/medicalSchool';

interface ClinicalSkillsMasteryChecklistProps {
  role: UserRole;
  currentStudentName: string;
  currentUserName: string;
  skills: ClinicalSkillMasteryItem[];
  onToggleStudentPracticed: (skillId: string, practiced: boolean, note?: string) => void;
  onValidateWithSignature: (
    skillId: string,
    payload: {
      signerName: string;
      signatureRef: string;
      signatureImage?: string;
    }
  ) => void;
  onRevokeValidation: (skillId: string) => void;
}

const REQUIRED_LEVEL_LABELS: Record<ClinicalSkillMasteryItem['requiredLevel'], string> = {
  'Perform Independently': 'ปฏิบัติได้ด้วยตนเอง',
  'Perform under Supervision': 'ปฏิบัติภายใต้การควบคุม',
  Assist: 'ผู้ช่วยหัตถการ',
};

export function ClinicalSkillsMasteryChecklist({
  role,
  currentStudentName,
  currentUserName,
  skills,
  onToggleStudentPracticed,
  onValidateWithSignature,
  onRevokeValidation,
}: ClinicalSkillsMasteryChecklistProps) {
  const [yearFilter, setYearFilter] = useState<'all' | AcademicYearLevel>('all');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'validated' | 'awaiting_faculty' | 'not_started'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

  // Signature modal state
  const [signingSkill, setSigningSkill] = useState<ClinicalSkillMasteryItem | null>(null);
  const [signerName, setSignerName] = useState(
    role === 'faculty' || role === 'course_officer' || role === 'admin'
      ? currentUserName
      : 'นพ.เอกรัตน์ วัฒนสุรินทร์'
  );
  const [signatureRef, setSignatureRef] = useState('MD-SUR-2569');
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);
  const [signatureError, setSignatureError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  const canValidate =
    role === 'faculty' || role === 'course_officer' || role === 'admin';

  const summary = useMemo(() => {
    const total = skills.length;
    const validated = skills.filter((s) => s.facultyValidated).length;
    const awaitingFaculty = skills.filter(
      (s) => s.studentPracticed && !s.facultyValidated
    ).length;
    const practicedTotal = skills.filter((s) => s.studentPracticed || s.facultyValidated).length;
    const masteryPct = total > 0 ? Math.round((validated / total) * 100) : 0;
    return {
      total,
      validated,
      awaitingFaculty,
      notStarted: total - practicedTotal,
      masteryPct,
    };
  }, [skills]);

  const filteredSkills = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return skills.filter((skill) => {
      const matchYear = yearFilter === 'all' || skill.yearLevel === yearFilter;
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'validated' && skill.facultyValidated) ||
        (statusFilter === 'awaiting_faculty' &&
          skill.studentPracticed &&
          !skill.facultyValidated) ||
        (statusFilter === 'not_started' &&
          !skill.studentPracticed &&
          !skill.facultyValidated);
      const matchSearch =
        !q ||
        skill.procedureName.toLowerCase().includes(q) ||
        skill.procedureNameEn.toLowerCase().includes(q) ||
        skill.department.toLowerCase().includes(q) ||
        skill.code.toLowerCase().includes(q);
      return matchYear && matchStatus && matchSearch;
    });
  }, [skills, yearFilter, statusFilter, searchQuery]);

  const openSignatureModal = (skill: ClinicalSkillMasteryItem) => {
    setSigningSkill(skill);
    setSignerName(
      canValidate && currentUserName ? currentUserName : 'นพ.เอกรัตน์ วัฒนสุรินทร์'
    );
    setSignatureRef(`MD-SUR-${skill.yearLevel}0${Math.floor(100 + Math.random() * 899)}`);
    setHasDrawnSignature(false);
    setSignatureError(null);
    window.setTimeout(() => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
    }, 30);
  };

  const getPointerPos = (
    e: React.PointerEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.setPointerCapture(e.pointerId);
    const { x, y } = getPointerPos(e, canvas);
    ctx.strokeStyle = '#0F2A4A';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawingRef.current = true;
    setHasDrawnSignature(true);
    setSignatureError(null);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPointerPos(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawnSignature(false);
  };

  const handleStampAutoSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw clean calligraphic verification signature stroke
    ctx.strokeStyle = '#0F2A4A';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(46, 86);
    ctx.bezierCurveTo(75, 42, 110, 108, 148, 66);
    ctx.bezierCurveTo(175, 40, 198, 96, 236, 70);
    ctx.bezierCurveTo(265, 52, 295, 84, 340, 74);
    ctx.stroke();

    ctx.fillStyle = '#0F766E';
    ctx.font = '600 13px "IBM Plex Sans Thai", sans-serif';
    ctx.fillText(`ยืนยันลายมือชื่ออิเล็กทรอนิกส์ · ${signerName.trim()}`, 44, 114);
    setHasDrawnSignature(true);
    setSignatureError(null);
  };

  const handleConfirmValidation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signingSkill) return;
    if (!signerName.trim()) {
      setSignatureError('กรุณาระบุชื่ออาจารย์แพทย์ผู้ลงนามรับรอง');
      return;
    }
    if (!hasDrawnSignature) {
      setSignatureError('กรุณาลงลายมือชื่อในกรอบ หรือกด “ใช้ลายเซ็นรับรองอิเล็กทรอนิกส์”');
      return;
    }
    const sigDataUrl = canvasRef.current?.toDataURL('image/png');
    onValidateWithSignature(signingSkill.id, {
      signerName: signerName.trim(),
      signatureRef: signatureRef.trim() || 'MD-SUR-2569',
      signatureImage: sigDataUrl,
    });
    setSigningSkill(null);
  };

  return (
    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header + Progress Bar */}
      <div className="p-6 border-b border-slate-200 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-[#0F2A4A]" aria-hidden="true" />
              รายการตรวจสอบทักษะหัตถการทางคลินิก (Clinical Skills Mastery Checklist)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              นักศึกษา ({currentStudentName}) ติดตามการฝึกปฏิบัติหัตถการบังคับรายข้อ พร้อมระบบลงนามลายเซ็นอาจารย์แพทย์รับรองผล
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs tabular-nums">
            <div>
              <span className="text-slate-500">ผ่านรับรองจากอาจารย์: </span>
              <strong className="text-emerald-700">
                {summary.validated} / {summary.total} หัตถการ
              </strong>
            </div>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <div>
              <span className="text-slate-500">รอลายเซ็นอาจารย์: </span>
              <strong className="text-amber-700">{summary.awaitingFaculty} รายการ</strong>
            </div>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <div>
              <span className="text-slate-500">ความคืบหน้า: </span>
              <strong className="text-[#0F2A4A]">{summary.masteryPct}%</strong>
            </div>
          </div>
        </div>

        {/* Overall Progress Track */}
        <div className="space-y-1.5">
          <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0F766E] rounded-full transition-all"
              style={{ width: `${summary.masteryPct}%` }}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
            <span>
              {canValidate
                ? 'สิทธิ์อาจารย์ / ฝ่ายวิชาการ: สามารถกดช่องรับรองเพื่อลงลายมือชื่อรับรองหัตถการให้นักศึกษาได้'
                : 'สิทธิ์นักศึกษา: ติ๊กช่อง “ฝึกปฏิบัติแล้ว” เมื่อทำหัตถการครบ เพื่อให้อาจารย์แพทย์ลงนามรับรองในช่องถัดไป'}
            </span>
            <span className="tabular-nums">เกณฑ์สำเร็จหลักสูตรชั้นคลินิก: 100% ของหัตถการบังคับ</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'all', label: 'ทุกชั้นปี' },
                  { id: '4', label: 'ปี 4' },
                  { id: '5', label: 'ปี 5' },
                  { id: '6', label: 'ปี 6' },
                ] as const
              ).map((yr) => (
                <button
                  key={yr.id}
                  type="button"
                  onClick={() => setYearFilter(yr.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    yearFilter === yr.id
                      ? 'bg-white text-[#0F2A4A] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {yr.label}
                </button>
              ))}
            </div>

            <div className="inline-flex flex-wrap items-center p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'all', label: `ทั้งหมด (${skills.length})` },
                  { id: 'validated', label: `รับรองแล้ว (${summary.validated})` },
                  { id: 'awaiting_faculty', label: `รอลายเซ็น (${summary.awaitingFaculty})` },
                  { id: 'not_started', label: `ยังไม่ฝึก (${summary.notStarted})` },
                ] as const
              ).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    statusFilter === st.id
                      ? 'bg-white text-[#0F2A4A] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
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
              placeholder="ค้นหาหัตถการ หรือกลุ่มงาน..."
              className="w-full lg:w-64 pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Checklist Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
              <th className="py-3 px-4">หัตถการทางคลินิก (Required Procedure)</th>
              <th className="py-3 px-4">กลุ่มงาน / ระดับเกณฑ์</th>
              <th className="py-3 px-4 text-center">1. นักศึกษาฝึกปฏิบัติ</th>
              <th className="py-3 px-4">2. อาจารย์แพทย์ลงนามรับรอง</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
            {filteredSkills.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-10 text-center text-sm text-slate-500">
                  ไม่พบรายการหัตถการตามเงื่อนไขที่เลือก
                </td>
              </tr>
            ) : (
              filteredSkills.map((skill) => {
                const isEditingNote = editingNoteId === skill.id;
                return (
                  <tr key={skill.id} className="hover:bg-slate-50/60 align-top">
                    <td className="py-4 px-4 space-y-1.5 max-w-md">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                        <span className="font-mono font-semibold text-[#0F2A4A]">
                          {skill.code}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>ชั้นปีที่ {skill.yearLevel}</span>
                      </div>
                      <div className="font-medium text-slate-900 leading-snug">
                        {skill.procedureName}
                      </div>
                      <div className="text-xs text-slate-500">{skill.procedureNameEn}</div>

                      {skill.studentSelfNote && !isEditingNote && (
                        <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200/80 rounded-md px-2.5 py-1.5 mt-1">
                          บันทึกนักศึกษา: {skill.studentSelfNote}
                        </div>
                      )}

                      {isEditingNote ? (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <input
                            type="text"
                            value={noteDraft}
                            onChange={(e) => setNoteDraft(e.target.value)}
                            placeholder="ระบุหอผู้ป่วย/จำนวนเคสที่ฝึก..."
                            className="flex-1 min-w-[180px] px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-md"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              onToggleStudentPracticed(skill.id, true, noteDraft.trim());
                              setEditingNoteId(null);
                            }}
                            className="px-2.5 py-1 text-xs font-medium text-white bg-[#0F2A4A] rounded-md cursor-pointer whitespace-nowrap shrink-0"
                          >
                            บันทึก
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingNoteId(null)}
                            className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNoteId(skill.id);
                            setNoteDraft(skill.studentSelfNote ?? '');
                          }}
                          className="text-[11px] font-medium text-[#0F2A4A] hover:underline cursor-pointer"
                        >
                          {skill.studentSelfNote ? 'แก้ไขบันทึกการฝึก' : '+ เพิ่มบันทึกหอผู้ป่วย/จำนวนเคส'}
                        </button>
                      )}
                    </td>

                    <td className="py-4 px-4 text-xs space-y-1">
                      <div className="font-medium text-slate-800">{skill.department}</div>
                      <div className="text-slate-500">
                        {REQUIRED_LEVEL_LABELS[skill.requiredLevel]}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {skill.requiredLevel}
                      </div>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <label className="inline-flex flex-col items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={skill.studentPracticed}
                          disabled={skill.facultyValidated && role === 'student'}
                          onChange={(e) =>
                            onToggleStudentPracticed(
                              skill.id,
                              e.target.checked,
                              skill.studentSelfNote
                            )
                          }
                          aria-label={`นักศึกษาฝึกปฏิบัติ ${skill.procedureName}`}
                          className="w-4 h-4 accent-[#0F2A4A] cursor-pointer disabled:cursor-not-allowed"
                        />
                        <span
                          className={`text-xs font-medium ${
                            skill.studentPracticed ? 'text-[#0F2A4A]' : 'text-slate-400'
                          }`}
                        >
                          {skill.studentPracticed ? 'ฝึกปฏิบัติแล้ว' : 'ยังไม่ฝึก'}
                        </span>
                        {skill.studentMarkedAt && (
                          <span className="text-[11px] text-slate-400 tabular-nums">
                            {skill.studentMarkedAt}
                          </span>
                        )}
                      </label>
                    </td>

                    <td className="py-4 px-4 min-w-[260px]">
                      {skill.facultyValidated ? (
                        <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <label className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-800">
                              <input
                                type="checkbox"
                                checked
                                disabled={!canValidate}
                                onChange={() => {
                                  if (canValidate) onRevokeValidation(skill.id);
                                }}
                                aria-label={`รับรองโดยอาจารย์ ${skill.procedureName}`}
                                className="w-4 h-4 accent-emerald-700 cursor-pointer disabled:cursor-default"
                              />
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
                              <span>รับรองผลโดยอาจารย์แล้ว</span>
                            </label>

                            {canValidate && (
                              <button
                                type="button"
                                onClick={() => onRevokeValidation(skill.id)}
                                title="ยกเลิกการลงนามรับรอง"
                                className="text-[11px] text-slate-500 hover:text-rose-700 inline-flex items-center gap-1 cursor-pointer shrink-0"
                              >
                                <RotateCcw className="w-3 h-3" aria-hidden="true" />
                                <span>ยกเลิก</span>
                              </button>
                            )}
                          </div>

                          {skill.facultySignatureImage && (
                            <div className="bg-white border border-emerald-200/80 rounded px-2 py-1 inline-block">
                              <img
                                src={skill.facultySignatureImage}
                                alt={`ลายเซ็นรับรองของ ${skill.facultySignerName ?? 'อาจารย์แพทย์'}`}
                                className="h-9 w-auto object-contain"
                              />
                            </div>
                          )}

                          <div className="text-xs text-emerald-950 space-y-0.5">
                            <div className="font-medium flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
                              <span>ลงนาม: {skill.facultySignerName}</span>
                            </div>
                            <div className="text-[11px] text-emerald-800 font-mono tabular-nums">
                              Ref: {skill.facultySignatureRef ?? 'MD-SUR'} · {skill.validatedAt}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <label
                              className={`inline-flex items-center gap-2 text-xs font-medium ${
                                canValidate ? 'cursor-pointer text-slate-800' : 'text-slate-500'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={false}
                                disabled={!canValidate}
                                onChange={() => {
                                  if (canValidate) openSignatureModal(skill);
                                }}
                                aria-label={`ลงนามรับรอง ${skill.procedureName}`}
                                className="w-4 h-4 accent-[#0F766E] cursor-pointer disabled:cursor-not-allowed"
                              />
                              {skill.studentPracticed ? (
                                <span className="inline-flex items-center gap-1 text-amber-700">
                                  <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                  รออาจารย์ลงนามรับรอง
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-slate-500">
                                  {!canValidate && <Lock className="w-3 h-3 shrink-0" aria-hidden="true" />}
                                  ยังไม่รับรอง
                                </span>
                              )}
                            </label>

                            {canValidate && (
                              <button
                                type="button"
                                onClick={() => openSignatureModal(skill)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-[#0F766E] hover:bg-[#0D625C] rounded-md cursor-pointer whitespace-nowrap shrink-0"
                              >
                                <PenTool className="w-3 h-3" aria-hidden="true" />
                                <span>ลงนามรับรอง</span>
                              </button>
                            )}
                          </div>
                          {!canValidate && (
                            <div className="text-[11px] text-slate-500">
                              ช่องรับรองนี้เปิดให้เฉพาะอาจารย์แพทย์ / นักวิชาการเป็นผู้ลงลายเซ็นยืนยัน
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Faculty Signature Validation Modal */}
      {signingSkill && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-label="ลงลายมือชื่ออาจารย์แพทย์เพื่อรับรองทักษะหัตถการ"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50/70">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  ลงลายมือชื่อรับรองหัตถการทางคลินิก
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {signingSkill.code} · {signingSkill.procedureName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSigningSkill(null)}
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/70 cursor-pointer shrink-0"
                aria-label="ปิดหน้าต่างลงนาม"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmValidation} className="p-5 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 space-y-1">
                <div>
                  นักศึกษาผู้ปฏิบัติ: <strong className="text-slate-900">{currentStudentName}</strong>
                </div>
                <div>
                  กลุ่มงาน: <strong className="text-slate-900">{signingSkill.department}</strong> · เกณฑ์:{' '}
                  {REQUIRED_LEVEL_LABELS[signingSkill.requiredLevel]}
                </div>
                {signingSkill.studentSelfNote && (
                  <div className="text-slate-600">บันทึกนักศึกษา: {signingSkill.studentSelfNote}</div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    ชื่ออาจารย์แพทย์ผู้ลงนาม
                  </label>
                  <input
                    type="text"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    เลขที่อ้างอิง / ว.แพทย์
                  </label>
                  <input
                    type="text"
                    value={signatureRef}
                    onChange={(e) => setSignatureRef(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-medium text-slate-700">
                    วาดลายมือชื่ออาจารย์ผู้ควบคุม (Signature Pad)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleStampAutoSignature}
                      className="text-xs font-medium text-[#0F766E] hover:underline cursor-pointer"
                    >
                      ใช้ลายเซ็นรับรองอิเล็กทรอนิกส์
                    </button>
                    <button
                      type="button"
                      onClick={handleClearCanvas}
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
                    >
                      <Eraser className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>ล้าง</span>
                    </button>
                  </div>
                </div>

                <div className="border-2 border-dashed border-slate-300 rounded-lg overflow-hidden bg-white">
                  <canvas
                    ref={canvasRef}
                    width={460}
                    height={136}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    className="w-full h-32 touch-none cursor-crosshair block"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  ใช้นิ้วหรือเมาส์เซ็นชื่อลงในกรอบด้านบน หรือกด “ใช้ลายเซ็นรับรองอิเล็กทรอนิกส์”
                </p>
                {signatureError && (
                  <p className="text-xs text-rose-700 font-medium">{signatureError}</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSigningSkill(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#0F2A4A] rounded-lg hover:bg-[#163B66] cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                  <span>ลงนามและติ๊กรับรองหัตถการ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
