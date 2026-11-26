import { useEffect, useState } from 'react';
import { Check, ClipboardList, Copy, RefreshCw, Save, X } from 'lucide-react';
import { BedsideCheckInRecord, SbarHandoffRecord } from '../types/medicalSchool';
import {
  buildStandardizedSbarTemplate,
  formatSbarPlainText,
} from '../utils/sbarTemplate';

interface SbarHandoffModalProps {
  record: BedsideCheckInRecord | null;
  onClose: () => void;
  onSave: (
    recordId: string,
    payload: Omit<SbarHandoffRecord, 'savedAt'>
  ) => void;
}

export function SbarHandoffModal({
  record,
  onClose,
  onSave,
}: SbarHandoffModalProps) {
  const [situation, setSituation] = useState('');
  const [background, setBackground] = useState('');
  const [assessment, setAssessment] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [handoffRecipient, setHandoffRecipient] = useState('');
  const [shiftWindow, setShiftWindow] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!record) return;
    const base = record.sbarHandoff ?? buildStandardizedSbarTemplate(record);
    setSituation(base.situation);
    setBackground(base.background);
    setAssessment(base.assessment);
    setRecommendation(base.recommendation);
    setHandoffRecipient(base.handoffRecipient);
    setShiftWindow(base.shiftWindow);
    setCopied(false);
  }, [record]);

  if (!record) return null;

  const handleRegenerateTemplate = () => {
    const generated = buildStandardizedSbarTemplate(record);
    setSituation(generated.situation);
    setBackground(generated.background);
    setAssessment(generated.assessment);
    setRecommendation(generated.recommendation);
    setHandoffRecipient(generated.handoffRecipient);
    setShiftWindow(generated.shiftWindow);
  };

  const handleCopyText = async () => {
    const text = formatSbarPlainText(record, {
      situation,
      background,
      assessment,
      recommendation,
      handoffRecipient,
      shiftWindow,
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback ignored if clipboard permissions are blocked
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!situation.trim() || !assessment.trim() || !recommendation.trim()) return;
    onSave(record.id, {
      situation: situation.trim(),
      background: background.trim(),
      assessment: assessment.trim(),
      recommendation: recommendation.trim(),
      handoffRecipient: handoffRecipient.trim() || 'ทีมแพทย์เวรรับช่วงต่อ',
      shiftWindow: shiftWindow.trim() || 'รอบส่งเวรประจำวัน',
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="แบบฟอร์มส่งเวรผู้ป่วยมาตรฐาน SBAR (Structured Patient Handoff)"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[#0F2A4A] text-white flex items-center justify-center shrink-0">
              <ClipboardList className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-slate-900 truncate">
                Structured Patient Handoff (SBAR)
              </h3>
              <p className="text-xs text-slate-500 truncate tabular-nums">
                {record.caseCode} · {record.wardOrUnit} ({record.bedOrRoom})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/70 cursor-pointer shrink-0"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3.5">
            <div className="text-xs text-slate-600 space-y-0.5">
              <div className="font-semibold text-slate-900">
                {record.diagnosis} ({record.icd10})
              </div>
              <div>
                อาจารย์ผู้ดูแล: {record.supervisingStaff} · เช็กอิน {record.checkedInDate} {record.checkedInAt}
              </div>
            </div>

            <button
              type="button"
              onClick={handleRegenerateTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0F2A4A] bg-white border border-slate-300 rounded-md hover:bg-slate-100 cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>สร้างเทมเพลต SBAR จากข้อมูลเคสล่าสุด</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                ผู้รับเวร / ทีมปลายทาง
              </label>
              <input
                type="text"
                value={handoffRecipient}
                onChange={(e) => setHandoffRecipient(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                รอบส่งเวร (Shift Handoff Window)
              </label>
              <select
                value={shiftWindow}
                onChange={(e) => setShiftWindow(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg"
              >
                <option value="ส่งเวรเช้า (07:30–08:00 น.)">ส่งเวรเช้า (07:30–08:00 น.)</option>
                <option value="ส่งเวรบ่าย–ดึก (16:00 น. / 24:00 น.)">
                  ส่งเวรบ่าย–ดึก (16:00 น. / 24:00 น.)
                </option>
                <option value="ส่งต่อระหว่างหอผู้ป่วย / ICU">ส่งต่อระหว่างหอผู้ป่วย / ICU</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#0F2A4A] mb-1">
                S — Situation (สถานการณ์ปัจจุบันและปัญหาหลัก)
              </label>
              <textarea
                rows={2}
                required
                value={situation}
                onChange={(e) => setSituation(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F2A4A] mb-1">
                B — Background (ประวัติสำคัญ ผลตรวจ และ Vitals/Labs ล่าสุด)
              </label>
              <textarea
                rows={2}
                required
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F766E] mb-1">
                A — Assessment (การประเมินอาการทางคลินิกและข้อสังเกตสำคัญ)
              </label>
              <textarea
                rows={2}
                required
                value={assessment}
                onChange={(e) => setAssessment(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F766E] mb-1">
                R — Recommendation (ข้อเสนอแนะ แผนติดตาม และสิ่งที่ต้องเฝ้าระวัง)
              </label>
              <textarea
                rows={2}
                required
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg leading-relaxed"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => void handleCopyText()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer whitespace-nowrap shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                  <span className="text-emerald-700">คัดลอกข้อความ SBAR แล้ว</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>คัดลอกข้อความ SBAR</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#0F2A4A] rounded-lg hover:bg-[#163B66] cursor-pointer whitespace-nowrap shrink-0"
              >
                <Save className="w-3.5 h-3.5" aria-hidden="true" />
                <span>บันทึก SBAR ลงประวัติเคส</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
