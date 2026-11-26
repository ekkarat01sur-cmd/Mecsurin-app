import { useState } from 'react';
import { X } from 'lucide-react';
import {
  ClinicalSetting,
  LogbookEntry,
  ProcedureRole,
} from '../types/medicalSchool';
import { CLINICAL_DEPARTMENTS } from '../data/initialMedicalData';

interface LogbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddEntry: (entry: Omit<LogbookEntry, 'id' | 'status'>) => void;
}

const COMMON_PROCEDURES = [
  'Venipuncture & Blood Culture',
  'Arterial Blood Gas (ABG)',
  'Nasogastric (NG) Tube Insertion',
  'Urethral Catheterization (Foley)',
  'Simple Interrupted Suturing',
  'Endotracheal Intubation',
  'Normal Labor Delivery',
  '12-Lead ECG Interpretation',
  'Lumbar Puncture',
  'Wound Debridement & Dressing',
];

export function LogbookModal({ isOpen, onClose, onAddEntry }: LogbookModalProps) {
  const [department, setDepartment] = useState(CLINICAL_DEPARTMENTS[0].nameTh);
  const [date, setDate] = useState('2026-11-24');
  const [setting, setSetting] = useState<ClinicalSetting>('IPD');
  const [caseCode, setCaseCode] = useState('SUR-69-1124');
  const [patientSummary, setPatientSummary] = useState('');
  const [icd10, setIcd10] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [procedure, setProcedure] = useState(COMMON_PROCEDURES[0]);
  const [role, setRole] = useState<ProcedureRole>('Perform');
  const [preceptor, setPreceptor] = useState('นพ.เอกรัตน์ วัฒนสุรินทร์');
  const [reflection, setReflection] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientSummary.trim() || !diagnosis.trim() || !reflection.trim()) {
      setErrorMsg('กรุณากรอกข้อมูลผู้ป่วยเบื้องต้น การวินิจฉัย และบันทึกสะท้อนคิดทางคลินิกให้ครบถ้วน');
      return;
    }

    onAddEntry({
      date,
      department,
      setting,
      caseCode: caseCode.trim() || `SUR-69-${Math.floor(1000 + Math.random() * 9000)}`,
      patientSummary: patientSummary.trim(),
      icd10: icd10.trim() || 'Z00.0',
      diagnosis: diagnosis.trim(),
      procedure,
      role,
      preceptor: preceptor.trim(),
      reflection: reflection.trim(),
    });

    setPatientSummary('');
    setIcd10('');
    setDiagnosis('');
    setReflection('');
    setErrorMsg('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logbook-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 id="logbook-modal-title" className="text-lg font-semibold text-slate-900">
              บันทึกเคสและหัตถการทางคลินิก (E-Logbook)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ห้ามระบุชื่อ-สกุลจริง หรือเลขประจำตัวประชาชนของผู้ป่วยเพื่อคุ้มครองข้อมูลส่วนบุคคล (PDPA)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                กลุ่มงานที่ปฏิบัติงาน
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              >
                {CLINICAL_DEPARTMENTS.map((d) => (
                  <option key={d.id} value={d.nameTh}>
                    {d.nameTh}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                วันที่ปฏิบัติงาน
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                สถานที่ / หน่วยบริการ (Setting)
              </label>
              <select
                value={setting}
                onChange={(e) => setSetting(e.target.value as ClinicalSetting)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              >
                <option value="IPD">หอผู้ป่วยใน (IPD)</option>
                <option value="OPD">ผู้ป่วยนอก (OPD)</option>
                <option value="ER">ห้องฉุกเฉิน (ER)</option>
                <option value="OR">ห้องผ่าตัด (OR)</option>
                <option value="LR">ห้องคลอด (LR)</option>
                <option value="Community">โรงพยาบาลชุมชน / เยี่ยมบ้าน</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                รหัสอ้างอิงเคส (Case Code แบบนิรนาม)
              </label>
              <input
                type="text"
                value={caseCode}
                onChange={(e) => setCaseCode(e.target.value)}
                placeholder="เช่น SUR-MED-691124"
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              ข้อมูลทางคลินิกโดยสังเขป (เพศ อายุ อาการสำคัญ)
            </label>
            <input
              type="text"
              value={patientSummary}
              onChange={(e) => setPatientSummary(e.target.value)}
              placeholder="เช่น ชายไทย อายุ 54 ปี ไข้สูง ไอมีเสมหะ หอบเหนื่อย 2 วัน"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                รหัส ICD-10
              </label>
              <input
                type="text"
                value={icd10}
                onChange={(e) => setIcd10(e.target.value)}
                placeholder="เช่น J18.9"
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                การวินิจฉัยโรค (Diagnosis)
              </label>
              <input
                type="text"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="เช่น Community-Acquired Pneumonia"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                หัตถการที่ปฏิบัติ (Procedure)
              </label>
              <select
                value={procedure}
                onChange={(e) => setProcedure(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              >
                {COMMON_PROCEDURES.map((proc) => (
                  <option key={proc} value={proc}>
                    {proc}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                บทบาทการปฏิบัติ (Role)
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as ProcedureRole)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              >
                <option value="Perform">ผู้ทำเอง (Perform)</option>
                <option value="Assist">ผู้ช่วย (Assist)</option>
                <option value="Observe">สังเกตการณ์ (Observe)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              อาจารย์แพทย์ผู้ควบคุม / รับรอง (Preceptor)
            </label>
            <input
              type="text"
              value={preceptor}
              onChange={(e) => setPreceptor(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              บันทึกการเรียนรู้และสะท้อนคิดทางคลินิก (Clinical Reflection)
            </label>
            <textarea
              rows={3}
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="สรุปสิ่งที่ได้เรียนรู้ ข้อควรระวังในการทำหัตถการ หรือแนวทางการดูแลผู้ป่วยเพิ่มเติม..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium text-white bg-[#0F2A4A] rounded-lg hover:bg-[#163B66] cursor-pointer"
            >
              ส่งบันทึกให้อาจารย์รับรอง
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
