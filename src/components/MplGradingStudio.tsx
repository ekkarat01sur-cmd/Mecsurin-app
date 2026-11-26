import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calculator,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Lock,
  Printer,
  SlidersHorizontal,
} from 'lucide-react';
import {
  CourseGradingConfig,
  CourseWeightConfig,
  EvaluationFormType,
  FacultyFormSubmission,
  StudentCourseScore,
  StudentPhotoMap,
  UserRole,
} from '../types/medicalSchool';
import {
  computeMplCutoffs,
  evaluateStudentGrade,
  getTotalConfiguredWeight,
} from '../utils/gradeEvaluation';
import {
  exportGradeReportExcel,
  exportGradeReportPdf,
} from '../utils/officialReportExports';
import { OfficialReportPreviewModal } from './OfficialReportPreviewModal';
import { StudentAvatar } from './StudentAvatar';

export { evaluateStudentGrade };

interface MplGradingStudioProps {
  role: UserRole;
  currentStudentId: string;
  currentUserName?: string;
  assignedCourseCodes?: string[];
  studentPhotos: StudentPhotoMap;
  configs: CourseGradingConfig[];
  onUpdateConfig: (updated: CourseGradingConfig) => void;
  studentScores: StudentCourseScore[];
  onUpdateStudentScore: (updated: StudentCourseScore) => void;
  facultySubmissions?: FacultyFormSubmission[];
  onNotify?: (msg: string) => void;
}

export function MplGradingStudio({
  role,
  currentStudentId,
  currentUserName = 'อาจารย์แพทย์ / ฝ่ายวิชาการ ศพค. รพ.สุรินทร์',
  assignedCourseCodes,
  studentPhotos,
  configs,
  onUpdateConfig,
  studentScores,
  onUpdateStudentScore,
  facultySubmissions = [],
  onNotify,
}: MplGradingStudioProps) {
  const selectableConfigs = useMemo(() => {
    if (role === 'course_officer' && assignedCourseCodes && assignedCourseCodes.length > 0) {
      const scoped = configs.filter((c) => assignedCourseCodes.includes(c.courseCode));
      return scoped.length > 0 ? scoped : configs;
    }
    return configs;
  }, [role, assignedCourseCodes, configs]);

  const [selectedCourseCode, setSelectedCourseCode] = useState(
    selectableConfigs[0]?.courseCode ?? 'SUR-PED-502'
  );

  useEffect(() => {
    if (
      selectableConfigs.length > 0 &&
      !selectableConfigs.some((c) => c.courseCode === selectedCourseCode)
    ) {
      setSelectedCourseCode(selectableConfigs[0].courseCode);
    }
  }, [selectableConfigs, selectedCourseCode]);

  // Angoff Standard Setting Helper state
  const [angoffEasyPct, setAngoffEasyPct] = useState(80);
  const [angoffEasyRatio, setAngoffEasyRatio] = useState(30);
  const [angoffModPct, setAngoffModPct] = useState(60);
  const [angoffModRatio, setAngoffModRatio] = useState(50);
  const [angoffHardPct, setAngoffHardPct] = useState(40);
  const [angoffHardRatio, setAngoffHardRatio] = useState(20);
  const [reportPreviewOpen, setReportPreviewOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const config =
    selectableConfigs.find((c) => c.courseCode === selectedCourseCode) ??
    selectableConfigs[0] ??
    configs[0];

  const canConfigure =
    role === 'admin' ||
    role === 'faculty' ||
    (role === 'course_officer' &&
      (!assignedCourseCodes ||
        assignedCourseCodes.length === 0 ||
        assignedCourseCodes.includes(config.courseCode)));
  const canViewCohort =
    role === 'faculty' || role === 'course_officer' || role === 'admin';
  const customGradeGroups = config.customGradeGroups ?? [];
  const weightSum = getTotalConfiguredWeight(config);

  const cutoffs = computeMplCutoffs(config.mplPercent, config.strictMedicalMpl);

  const ratioSum = angoffEasyRatio + angoffModRatio + angoffHardRatio;
  const suggestedAngoffMpl =
    ratioSum > 0
      ? Math.round(
          ((angoffEasyPct * angoffEasyRatio +
            angoffModPct * angoffModRatio +
            angoffHardPct * angoffHardRatio) /
            ratioSum) *
            10
        ) / 10
      : 60;

  const courseScores = studentScores.filter((s) => s.courseCode === config.courseCode);
  const visibleScores = canViewCohort
    ? courseScores
    : courseScores.filter((s) => s.studentId === currentStudentId);

  const handleWeightChange = (key: keyof CourseWeightConfig, val: number) => {
    if (!canConfigure) return;
    onUpdateConfig({
      ...config,
      weights: {
        ...config.weights,
        [key]: Math.max(0, Math.min(100, val)),
      },
    });
  };

  const handleCustomGroupWeightChange = (groupId: string, val: number) => {
    if (!canConfigure) return;
    onUpdateConfig({
      ...config,
      customGradeGroups: customGradeGroups.map((grp) =>
        grp.id === groupId
          ? { ...grp, weightPercent: Math.max(0, Math.min(100, val)) }
          : grp
      ),
    });
  };

  const handleNormalizeWeights = () => {
    if (!canConfigure || weightSum === 0) return;
    const keys = Object.keys(config.weights) as (keyof CourseWeightConfig)[];
    const totalSlots = keys.length + customGradeGroups.length;
    const scaled: Partial<CourseWeightConfig> = {};
    let running = 0;

    keys.forEach((k, idx) => {
      if (idx === totalSlots - 1) {
        scaled[k] = Math.max(0, 100 - running);
      } else {
        const nextVal = Math.round((config.weights[k] / weightSum) * 100);
        scaled[k] = nextVal;
        running += nextVal;
      }
    });

    const scaledGroups = customGradeGroups.map((grp, idx) => {
      const slotIndex = keys.length + idx;
      if (slotIndex === totalSlots - 1) {
        return { ...grp, weightPercent: Math.max(0, 100 - running) };
      }
      const nextVal = Math.round((grp.weightPercent / weightSum) * 100);
      running += nextVal;
      return { ...grp, weightPercent: nextVal };
    });

    onUpdateConfig({
      ...config,
      weights: scaled as CourseWeightConfig,
      customGradeGroups: scaledGroups,
    });
  };

  const handleExportGradeCsv = () => {
    const headers = [
      'รหัสนักศึกษา',
      'ชื่อ-สกุล',
      'รหัสวิชา',
      `Form A (${config.weights.formA}%)`,
      `Form B (${config.weights.formB}%)`,
      `Form C (${config.weights.formC}%)`,
      `Well Baby (${config.weights.wellBaby}%)`,
      `Form E (${config.weights.formE}%)`,
      `OSCE (${config.weights.osce}%)`,
      `ข้อเขียน (${config.weights.writtenExam}%)`,
      ...customGradeGroups.map((grp) => `${grp.name} (${grp.weightPercent}%)`),
      'คะแนนรวมสุทธิ (%)',
      `เกณฑ์ MPL (${config.mplPercent}%)`,
      'เกรดที่ได้',
      'หมายเหตุ',
    ];
    const rows = visibleScores.map((sc) => {
      const res = evaluateStudentGrade(sc, config);
      return [
        sc.studentId,
        sc.studentName,
        sc.courseCode,
        sc.formA ?? '-',
        sc.formB ?? '-',
        sc.formC ?? '-',
        sc.wellBaby ?? '-',
        sc.formE ?? '-',
        sc.osce ?? '-',
        sc.writtenExam ?? '-',
        ...customGradeGroups.map((grp) => sc.customGroupScores?.[grp.id] ?? '-'),
        res.weightedTotal.toFixed(2),
        config.mplPercent,
        res.grade,
        `"${res.reason}"`,
      ];
    });
    const csv = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `grade_mpl_${config.courseCode}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Header & Course Selector */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-[#0F2A4A]" aria-hidden="true" />
              ระบบกำหนดสัดส่วนร้อยละรายวิชา และการตัดเกรดตามเกณฑ์ Minimal Passing Level (MPL)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              กำหนดน้ำหนักคะแนนแต่ละองค์ประกอบ (รวม 100%) และจุดตัดเกรดอิงเกณฑ์มาตรฐาน (MPL) แยกตามรายวิชาคลินิก
            </p>
          </div>

          <select
            value={config.courseCode}
            onChange={(e) => setSelectedCourseCode(e.target.value)}
            aria-label="เลือกรายวิชาเพื่อตั้งค่าเกรด"
            className="px-3.5 py-2 text-sm font-medium bg-white border border-slate-300 rounded-lg"
          >
            {selectableConfigs.map((c) => (
              <option key={c.courseCode} value={c.courseCode}>
                {c.courseCode} · {c.courseName} ({c.credits} หน่วยกิต)
              </option>
            ))}
          </select>
        </div>

        {!canConfigure && (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2.5 text-xs text-slate-700">
            <Lock className="w-4 h-4 mt-0.5 text-slate-500 shrink-0" aria-hidden="true" />
            <div>
              <span className="font-semibold text-slate-900">สิทธิ์การตั้งค่าสัดส่วนและ MPL: </span>
              การแก้ไขร้อยละน้ำหนักคะแนนและจุดตัด MPL สงวนสิทธิ์เฉพาะ{' '}
              <span className="font-semibold">
                อาจารย์แพทย์ นักวิชาการประจำรายวิชา หรือ แอดมิน
              </span>{' '}
              เท่านั้น
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Weighting Percentage Configuration */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                1. กำหนดร้อยละน้ำหนักคะแนนรายวิชา ({config.courseCode})
              </h3>
              <span
                className={`text-xs font-mono font-bold tabular-nums ${
                  weightSum === 100 ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                ผลรวม: {weightSum}% / 100%
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl divide-y divide-slate-200">
              {(
                [
                  { key: 'formA', formType: 'form_a' as EvaluationFormType, label: 'Form A (Cross-Sectional OPD/BST)' },
                  { key: 'formB', formType: 'form_b' as EvaluationFormType, label: 'แบบประเมิน B (No Inter / SDL / OPL)' },
                  { key: 'formC', formType: 'form_c' as EvaluationFormType, label: 'Form C (Longitudinal Observation)' },
                  { key: 'wellBaby', formType: 'well_baby' as EvaluationFormType, label: 'แบบประเมิน Well Baby Clinic' },
                  { key: 'formE', formType: 'form_e' as EvaluationFormType, label: 'Form E (เจตคติและสัมพันธภาพ)' },
                  { key: 'osce', formType: null, label: 'การสอบปฏิบัติทางคลินิก (OSCE / Long Case)' },
                  { key: 'writtenExam', formType: null, label: 'การสอบข้อเขียน (MCQ / MEQ)' },
                ] as const
              ).map((item) => {
                const val = config.weights[item.key];
                const isFormDisabled =
                  item.formType !== null &&
                  Array.isArray(config.enabledForms) &&
                  !config.enabledForms.includes(item.formType);
                return (
                  <div
                    key={item.key}
                    className={`p-3.5 flex items-center justify-between gap-4 ${
                      isFormDisabled ? 'bg-slate-50/80 opacity-65' : ''
                    }`}
                  >
                    <div>
                      <span className="text-xs sm:text-sm text-slate-800">{item.label}</span>
                      {isFormDisabled && (
                        <div className="text-[11px] text-slate-500">
                          ไม่ได้เปิดใช้แบบประเมินนี้ในรายวิชา {config.courseCode}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        disabled={!canConfigure || isFormDisabled}
                        value={isFormDisabled ? 0 : val}
                        onChange={(e) => handleWeightChange(item.key, Number(e.target.value))}
                        className="w-16 px-2 py-1 text-sm font-mono text-right bg-white border border-slate-300 rounded-md tabular-nums disabled:bg-slate-100"
                      />
                      <span className="text-xs text-slate-500">%</span>
                    </div>
                  </div>
                );
              })}

              {customGradeGroups.map((grp) => (
                <div
                  key={grp.id}
                  className="p-3.5 flex items-center justify-between gap-4 bg-teal-50/40"
                >
                  <div>
                    <div className="text-xs sm:text-sm font-semibold text-[#0F2A4A]">
                      กลุ่มรวม: {grp.name}
                    </div>
                    <div className="text-[11px] text-[#0F766E] tabular-nums">
                      รวม {grp.includedItemIds.length} หัวข้อข้ามแบบฟอร์ม
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      disabled={!canConfigure}
                      value={grp.weightPercent}
                      onChange={(e) =>
                        handleCustomGroupWeightChange(grp.id, Number(e.target.value))
                      }
                      className="w-16 px-2 py-1 text-sm font-mono text-right bg-white border border-slate-300 rounded-md tabular-nums disabled:bg-slate-100"
                    />
                    <span className="text-xs text-slate-500">%</span>
                  </div>
                </div>
              ))}
            </div>

            {weightSum !== 100 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between gap-3 text-xs text-red-800">
                <span>น้ำหนักคะแนนรวมต้องเท่ากับ 100% (ปัจจุบัน {weightSum}%)</span>
                {canConfigure && (
                  <button
                    type="button"
                    onClick={handleNormalizeWeights}
                    className="px-3 py-1 bg-red-700 text-white font-medium rounded-md hover:bg-red-800 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    ปรับสมดุลให้ครบ 100%
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right: Minimal Passing Level (MPL) Configuration & Cutoffs */}
          <div className="lg:col-span-6 space-y-5">
            <h3 className="text-sm font-semibold text-slate-900">
              2. เกณฑ์ Minimal Passing Level (MPL) และจุดตัดเกรด
            </h3>

            <div className="p-4 border border-slate-200 rounded-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    จุดผ่านขั้นต่ำรวมรายวิชา (Course MPL)
                  </div>
                  <div className="text-xs text-slate-500">
                    คะแนนรวมร้อยละขั้นต่ำที่นักศึกษาต้องทำได้เพื่อผ่านรายวิชา
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={40}
                    max={85}
                    step={0.5}
                    disabled={!canConfigure}
                    value={config.mplPercent}
                    onChange={(e) =>
                      onUpdateConfig({
                        ...config,
                        mplPercent: Math.min(85, Math.max(40, Number(e.target.value))),
                      })
                    }
                    className="w-20 px-2.5 py-1.5 text-base font-mono font-bold text-right text-[#0F2A4A] bg-white border border-slate-300 rounded-lg tabular-nums disabled:bg-slate-100"
                  />
                  <span className="text-sm font-semibold text-slate-700">%</span>
                </div>
              </div>

              {/* Modified Angoff MPL Helper */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Calculator className="w-3.5 h-3.5 text-[#0F2A4A]" aria-hidden="true" />
                    ตัวช่วยคำนวณ MPL ตามวิธี Modified Angoff
                  </span>
                  <span className="font-mono font-semibold text-[#0F2A4A] tabular-nums">
                    MPL แนะนำ: {suggestedAngoffMpl}%
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-slate-500 mb-1">ข้อสอบง่าย ({angoffEasyRatio}%)</div>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      disabled={!canConfigure}
                      value={angoffEasyPct}
                      onChange={(e) => setAngoffEasyPct(Number(e.target.value))}
                      className="w-full px-2 py-1 font-mono bg-white border border-slate-300 rounded-md tabular-nums"
                    />
                  </div>
                  <div>
                    <div className="text-slate-500 mb-1">ปานกลาง ({angoffModRatio}%)</div>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      disabled={!canConfigure}
                      value={angoffModPct}
                      onChange={(e) => setAngoffModPct(Number(e.target.value))}
                      className="w-full px-2 py-1 font-mono bg-white border border-slate-300 rounded-md tabular-nums"
                    />
                  </div>
                  <div>
                    <div className="text-slate-500 mb-1">ข้อยาก ({angoffHardRatio}%)</div>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      disabled={!canConfigure}
                      value={angoffHardPct}
                      onChange={(e) => setAngoffHardPct(Number(e.target.value))}
                      className="w-full px-2 py-1 font-mono bg-white border border-slate-300 rounded-md tabular-nums"
                    />
                  </div>
                </div>
                {canConfigure && (
                  <div className="flex justify-between items-center pt-1">
                    <div className="flex gap-2 text-[11px] text-slate-500">
                      <span>สัดส่วน 30 / 50 / 20</span>
                      <button
                        type="button"
                        onClick={() => {
                          setAngoffEasyRatio(30);
                          setAngoffModRatio(50);
                          setAngoffHardRatio(20);
                        }}
                        className="underline hover:text-slate-800 cursor-pointer"
                      >
                        รีเซ็ต
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateConfig({ ...config, mplPercent: suggestedAngoffMpl })
                      }
                      className="px-3 py-1 text-xs font-medium text-white bg-[#0F2A4A] rounded-md hover:bg-[#163B66] cursor-pointer"
                    >
                      ใช้ค่า MPL {suggestedAngoffMpl}%
                    </button>
                  </div>
                )}
              </div>

              {/* Component Min Gates */}
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-500 mb-1">Form E ขั้นต่ำ (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    disabled={!canConfigure}
                    value={config.formEMinPercent}
                    onChange={(e) =>
                      onUpdateConfig({ ...config, formEMinPercent: Number(e.target.value) })
                    }
                    className="w-full px-2.5 py-1.5 font-mono bg-white border border-slate-300 rounded-md tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">OSCE ขั้นต่ำ (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    disabled={!canConfigure}
                    value={config.osceMinPercent}
                    onChange={(e) =>
                      onUpdateConfig({ ...config, osceMinPercent: Number(e.target.value) })
                    }
                    className="w-full px-2.5 py-1.5 font-mono bg-white border border-slate-300 rounded-md tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">ข้อเขียน ขั้นต่ำ (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    disabled={!canConfigure}
                    value={config.writtenMinPercent}
                    onChange={(e) =>
                      onUpdateConfig({ ...config, writtenMinPercent: Number(e.target.value) })
                    }
                    className="w-full px-2.5 py-1.5 font-mono bg-white border border-slate-300 rounded-md tabular-nums"
                  />
                </div>
              </div>

              {/* Grading Rules Toggles */}
              <div className="space-y-2 pt-1 text-xs text-slate-700">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!canConfigure}
                    checked={config.strictMedicalMpl}
                    onChange={(e) =>
                      onUpdateConfig({ ...config, strictMedicalMpl: e.target.checked })
                    }
                    className="w-4 h-4 accent-[#0F2A4A]"
                  />
                  <span>เกณฑ์แพทยศาสตร์เข้มข้น: คะแนนรวมต่ำกว่า MPL ({config.mplPercent}%) ให้เกรด F ทันที (ไม่ให้ D/D+)</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!canConfigure}
                    checked={config.enforceAttitudeGate}
                    onChange={(e) =>
                      onUpdateConfig({ ...config, enforceAttitudeGate: e.target.checked })
                    }
                    className="w-4 h-4 accent-[#0F2A4A]"
                  />
                  <span>บังคับเกณฑ์เจตคติ (Form E / Form C): ไม่ผ่านเจตคติหรือจริยธรรม = เกรด F</span>
                </label>
              </div>
            </div>

            {/* Live Grade Scale Preview */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-xs font-semibold text-slate-700 mb-2.5">
                ช่วงเกณฑ์ตัดเกรดที่คำนวณจาก MPL {config.mplPercent}%
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center font-mono text-xs tabular-nums">
                <div className="p-2 bg-white border border-slate-200 rounded-md">
                  <div className="font-bold text-emerald-700">A</div>
                  <div className="text-slate-600 mt-0.5">≥ {cutoffs.cutA}</div>
                </div>
                <div className="p-2 bg-white border border-slate-200 rounded-md">
                  <div className="font-bold text-emerald-700">B+</div>
                  <div className="text-slate-600 mt-0.5">≥ {cutoffs.cutBPlus}</div>
                </div>
                <div className="p-2 bg-white border border-slate-200 rounded-md">
                  <div className="font-bold text-[#0F2A4A]">B</div>
                  <div className="text-slate-600 mt-0.5">≥ {cutoffs.cutB}</div>
                </div>
                <div className="p-2 bg-white border border-slate-200 rounded-md">
                  <div className="font-bold text-[#0F2A4A]">C+</div>
                  <div className="text-slate-600 mt-0.5">≥ {cutoffs.cutCPlus}</div>
                </div>
                <div className="p-2 bg-white border border-slate-200 rounded-md">
                  <div className="font-bold text-slate-900">C (MPL)</div>
                  <div className="text-slate-600 mt-0.5">≥ {cutoffs.cutC}</div>
                </div>
                <div className="p-2 bg-white border border-slate-200 rounded-md">
                  <div className="font-bold text-red-700">
                    {config.strictMedicalMpl ? 'F' : 'D+/D/F'}
                  </div>
                  <div className="text-slate-600 mt-0.5">&lt; {cutoffs.cutC}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Cohort MPL Gradebook */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              ตารางคำนวณเกรดรายวิชา {config.courseCode} ตามเกณฑ์ MPL ({visibleScores.length} คน)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {canViewCohort
                ? 'คะแนนจากการประเมินแบบฟอร์ม A, B, C, Well Baby, Form E จะเชื่อมโยงเข้าตารางนี้โดยอัตโนมัติ พร้อมส่งออกรายงานราชการ PDF / Excel'
                : 'ระดับสิทธิ์ 1 (นักศึกษาแพทย์): ระบบแสดงผลเฉพาะคะแนนและเกรดของท่านเท่านั้น'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            {canViewCohort && (
              <>
                <button
                  type="button"
                  onClick={() => setReportPreviewOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#0F2A4A] bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>ตัวอย่างรายงาน A4</span>
                </button>
                <button
                  type="button"
                  disabled={isExportingPdf}
                  onClick={() => {
                    setIsExportingPdf(true);
                    void exportGradeReportPdf({
                      config,
                      studentScores,
                      generatedBy: currentUserName,
                    })
                      .then(() => {
                        onNotify?.(`ส่งออกรายงานผลเกรด ${config.courseCode} เป็น PDF เรียบร้อยแล้ว`);
                      })
                      .finally(() => setIsExportingPdf(false));
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-[#0F2A4A] hover:bg-[#163B66] disabled:opacity-60 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                >
                  <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{isExportingPdf ? 'กำลังสร้าง PDF...' : 'ส่งออก PDF (.pdf)'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportGradeReportExcel({
                      config,
                      allConfigs: selectableConfigs,
                      studentScores,
                      facultySubmissions,
                      generatedBy: currentUserName,
                      includeAllCourses: false,
                    });
                    onNotify?.(`ส่งออกรายงานผลเกรด ${config.courseCode} เป็น Excel (.xlsx) เรียบร้อยแล้ว`);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-[#0F766E] hover:bg-[#0D625C] rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>ส่งออก Excel (.xlsx)</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={handleExportGradeCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                <th className="py-3 px-4">นักศึกษาแพทย์</th>
                <th className="py-3 px-2.5 text-right tabular-nums">Form A<br />({config.weights.formA}%)</th>
                <th className="py-3 px-2.5 text-right tabular-nums">Form B<br />({config.weights.formB}%)</th>
                <th className="py-3 px-2.5 text-right tabular-nums">Form C<br />({config.weights.formC}%)</th>
                <th className="py-3 px-2.5 text-right tabular-nums">Well Baby<br />({config.weights.wellBaby}%)</th>
                <th className="py-3 px-2.5 text-right tabular-nums">Form E<br />({config.weights.formE}%)</th>
                <th className="py-3 px-2.5 text-right tabular-nums">OSCE<br />({config.weights.osce}%)</th>
                <th className="py-3 px-2.5 text-right tabular-nums">ข้อเขียน<br />({config.weights.writtenExam}%)</th>
                {customGradeGroups.map((grp) => (
                  <th
                    key={grp.id}
                    className="py-3 px-2.5 text-right tabular-nums text-[#0F2A4A] bg-teal-50/50"
                  >
                    <span className="block truncate max-w-[110px] ml-auto" title={grp.name}>
                      {grp.name}
                    </span>
                    ({grp.weightPercent}%)
                  </th>
                ))}
                <th className="py-3 px-3 text-right tabular-nums">รวมสุทธิ</th>
                <th className="py-3 px-3 text-center">เกรด MPL</th>
                <th className="py-3 px-4">ผลการพิจารณา</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {visibleScores.map((sc) => {
                const res = evaluateStudentGrade(sc, config);
                return (
                  <tr key={sc.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <StudentAvatar
                          studentId={sc.studentId}
                          studentName={sc.studentName}
                          studentPhotos={studentPhotos}
                          size="xs"
                        />
                        <div>
                          <div className="font-medium text-slate-900 whitespace-nowrap">{sc.studentName}</div>
                          <div className="text-xs font-mono text-slate-500 tabular-nums">
                            {sc.studentId} · ปี {sc.yearLevel}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-2.5 text-right font-mono text-xs tabular-nums text-slate-700">
                      {sc.formA !== null ? `${sc.formA}` : '-'}
                    </td>
                    <td className="py-3.5 px-2.5 text-right font-mono text-xs tabular-nums text-slate-700">
                      {sc.formB !== null ? `${sc.formB}` : '-'}
                    </td>
                    <td className="py-3.5 px-2.5 text-right font-mono text-xs tabular-nums text-slate-700">
                      {sc.formC !== null ? `${sc.formC}` : '-'}
                    </td>
                    <td className="py-3.5 px-2.5 text-right font-mono text-xs tabular-nums text-slate-700">
                      {sc.wellBaby !== null ? `${sc.wellBaby}` : '-'}
                    </td>
                    <td className="py-3.5 px-2.5 text-right font-mono text-xs tabular-nums">
                      <span
                        className={
                          sc.formE !== null && sc.formE < config.formEMinPercent
                            ? 'text-red-700 font-semibold'
                            : 'text-slate-700'
                        }
                      >
                        {sc.formE !== null ? `${sc.formE}` : '-'}
                      </span>
                    </td>
                    <td className="py-3.5 px-2.5 text-right font-mono text-xs tabular-nums">
                      {canConfigure ? (
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={sc.osce ?? 0}
                          onChange={(e) =>
                            onUpdateStudentScore({
                              ...sc,
                              osce: Math.min(100, Math.max(0, Number(e.target.value))),
                            })
                          }
                          className="w-14 px-1.5 py-0.5 text-right bg-white border border-slate-300 rounded font-mono text-xs"
                        />
                      ) : (
                        <span>{sc.osce !== null ? `${sc.osce}` : '-'}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-2.5 text-right font-mono text-xs tabular-nums">
                      {canConfigure ? (
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={sc.writtenExam ?? 0}
                          onChange={(e) =>
                            onUpdateStudentScore({
                              ...sc,
                              writtenExam: Math.min(100, Math.max(0, Number(e.target.value))),
                            })
                          }
                          className="w-14 px-1.5 py-0.5 text-right bg-white border border-slate-300 rounded font-mono text-xs"
                        />
                      ) : (
                        <span>{sc.writtenExam !== null ? `${sc.writtenExam}` : '-'}</span>
                      )}
                    </td>
                    {customGradeGroups.map((grp) => {
                      const val = sc.customGroupScores?.[grp.id] ?? null;
                      return (
                        <td
                          key={grp.id}
                          className="py-3.5 px-2.5 text-right font-mono text-xs tabular-nums bg-teal-50/30"
                        >
                          {canConfigure ? (
                            <input
                              type="number"
                              min={0}
                              max={100}
                              placeholder="-"
                              value={val ?? ''}
                              onChange={(e) =>
                                onUpdateStudentScore({
                                  ...sc,
                                  customGroupScores: {
                                    ...(sc.customGroupScores ?? {}),
                                    [grp.id]:
                                      e.target.value === ''
                                        ? null
                                        : Math.min(100, Math.max(0, Number(e.target.value))),
                                  },
                                })
                              }
                              className="w-14 px-1.5 py-0.5 text-right bg-white border border-slate-300 rounded font-mono text-xs"
                            />
                          ) : (
                            <span>{val !== null ? `${val}` : '-'}</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {res.weightedTotal.toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`font-mono text-base font-bold ${
                          res.passed ? 'text-[#0F2A4A]' : 'text-red-700'
                        }`}
                      >
                        {res.grade}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      {res.passed ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          {res.reason}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-700 font-medium">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          {res.reason}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <OfficialReportPreviewModal
        isOpen={reportPreviewOpen}
        onClose={() => setReportPreviewOpen(false)}
        reportKind="grades"
        generatedBy={currentUserName}
        config={config}
        allConfigs={selectableConfigs}
        studentScores={studentScores}
        facultySubmissions={facultySubmissions}
        onNotify={onNotify}
      />
    </div>
  );
}
