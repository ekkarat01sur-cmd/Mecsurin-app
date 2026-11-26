import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import {
  AcademicYearLevel,
  CourseGradingConfig,
  CustomEvaluationItem,
  EvaluationFormType,
  FacultyFormSubmission,
  StudentPhotoMap,
  UserRole,
} from '../types/medicalSchool';
import { COHORT_STUDENTS, CohortStudent } from '../data/initialMedicalData';
import { StudentAvatar } from './StudentAvatar';
import {
  BUILT_IN_GRADE_BUCKETS,
  FORM_A_DOMAINS,
  FORM_B_ITEMS,
  FORM_C_DOMAINS,
  FORM_DEFAULT_GRADE_TARGET,
  FORM_E_ATTITUDE_OBJECTS,
  FORM_E_COMM_OBJECTS,
  FORM_METADATA,
  getAllMergedFormItemIds,
  WELL_BABY_ITEMS,
} from '../data/evaluationFormsSchema';
import { resolveTopicGradeTarget } from '../utils/gradeEvaluation';

interface FacultyEvaluationFormsProps {
  role: UserRole;
  currentStudentId: string;
  authenticatedDisplayName?: string;
  assignedCourseCodes?: string[];
  studentPhotos: StudentPhotoMap;
  courses: CourseGradingConfig[];
  submissions: FacultyFormSubmission[];
  onSubmitBatchForms: (submissions: Omit<FacultyFormSubmission, 'id' | 'date'>[]) => void;
}

interface WellBabyRowState {
  scores: Record<string, number>;
  feedback: string;
}

interface FormBRowState {
  scores: Record<string, number>;
  feedback: string;
}

interface FormARowState {
  scores: Record<string, number | null>;
  overall: string;
  feedback: string;
}

interface FormCRowState {
  scores: Record<string, number | null>;
  overall: string;
  leaveDays: number;
  absentDays: number;
  feedback: string;
}

interface FormERowState {
  attitude: number[];
  comm: number[];
  severeMisconduct: boolean;
  feedback: string;
}

const WELL_BABY_SHORT_HEADERS: Record<string, string> = {
  'wb-1': '1. เตรียมพร้อม/ทักทาย (4)',
  'wb-2': '2. ซักประวัติ (4)',
  'wb-3-1': '3.1 ตรวจร่างกาย (1)',
  'wb-3-2': '3.2 Growth Chart (1)',
  'wb-3-3': '3.3 พัฒนาการ (1)',
  'wb-3-4': '3.4 โภชนาการ (1)',
  'wb-3-5': '3.5 คัดกรองเสี่ยง (1)',
  'wb-4': '4. วัคซีน (4)',
  'wb-5': '5. คำแนะนำสุขภาพ (3)',
};

const FORM_B_SHORT_HEADERS: Record<string, string> = {
  'fb-1-1': '1.1 ซัก/ตรวจ/Dx',
  'fb-1-2': '1.2 แผนตรวจ/รักษา',
  'fb-1-3': '1.3 หัตถการพื้นฐาน',
  'fb-1-4': '1.4 เวชระเบียน/SOAP',
  'fb-2-1': '2.1 ค้นคว้า EBM',
  'fb-2-2': '2.2 ประยุกต์แก้ปัญหา',
  'fb-3-1': '3.1 ความรับผิดชอบ',
  'fb-3-2': '3.2 ตรงเวลา/ราวด์',
  'fb-4-1': '4.1 มนุษยสัมพันธ์',
  'fb-4-2': '4.2 จริยธรรม/ความลับ',
};

const FORM_A_SHORT_HEADERS: Record<string, string> = {
  'fa-1': '1. History',
  'fa-2': '2. PE',
  'fa-3': '3. Diagnosis',
  'fa-4': '4. Rational Lab',
  'fa-5': '5. Management',
  'fa-6': '6. Education',
  'fa-7': '7. Med Record',
  'fa-8': '8. Manner',
};

const FORM_C_SHORT_HEADERS: Record<string, string> = {
  'fc-1': '1. Clin Skills',
  'fc-2': '2. Knowledge',
  'fc-3': '3. Diagnosis',
  'fc-4': '4. Inv & Mgmt',
  'fc-5': '5. Education',
  'fc-6': '6. Med Record',
  'fc-7': '7. Ethics Gate',
  'fc-8': '8. Presentation',
  'fc-9': '9. Manner',
  'fc-10': '10. Punctuality',
  'fc-11': '11. Responsibility',
  'fc-12': '12. Honesty Gate',
  'fc-13': '13. Info Search',
  'fc-14': '14. Participation',
  'fc-15': '15. Teamwork',
  'fc-16': '16. Human Rel.',
};

function formatThaiIsoDate(iso: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split('-').map(Number);
  const months = [
    'ม.ค.',
    'ก.พ.',
    'มี.ค.',
    'เม.ย.',
    'พ.ค.',
    'มิ.ย.',
    'ก.ค.',
    'ส.ค.',
    'ก.ย.',
    'ต.ค.',
    'พ.ย.',
    'ธ.ค.',
  ];
  return `${d} ${months[m - 1] ?? ''} ${y + 543}`;
}

function createDefaultWellBabyRow(): WellBabyRowState {
  const scores: Record<string, number> = {};
  WELL_BABY_ITEMS.forEach((i) => {
    scores[i.id] = i.maxScore;
  });
  return { scores, feedback: '' };
}

function createDefaultFormBRow(): FormBRowState {
  const scores: Record<string, number> = {};
  FORM_B_ITEMS.forEach((i) => {
    scores[i.id] = 8;
  });
  return { scores, feedback: '' };
}

function createDefaultFormARow(): FormARowState {
  const scores: Record<string, number | null> = {};
  FORM_A_DOMAINS.forEach((d) => {
    scores[d.id] = 8;
  });
  return { scores, overall: 'very satisfactory', feedback: '' };
}

function createDefaultFormCRow(): FormCRowState {
  const scores: Record<string, number | null> = {};
  FORM_C_DOMAINS.forEach((d) => {
    scores[d.id] = d.isPassFailGate ? 1 : 8;
  });
  return { scores, overall: 'very satisfactory', leaveDays: 0, absentDays: 0, feedback: '' };
}

function createDefaultFormERow(): FormERowState {
  return {
    attitude: [4, 4, 4, 4, 5, 5],
    comm: [2, 2, 2, 2, 2],
    severeMisconduct: false,
    feedback: '',
  };
}

export function FacultyEvaluationForms({
  role,
  currentStudentId,
  authenticatedDisplayName,
  assignedCourseCodes,
  studentPhotos,
  courses,
  submissions,
  onSubmitBatchForms,
}: FacultyEvaluationFormsProps) {
  const availableCourses = useMemo(() => {
    if (role === 'course_officer' && assignedCourseCodes && assignedCourseCodes.length > 0) {
      const scoped = courses.filter((c) => assignedCourseCodes.includes(c.courseCode));
      return scoped.length > 0 ? scoped : courses;
    }
    return courses;
  }, [role, assignedCourseCodes, courses]);

  const [selectedCourseCode, setSelectedCourseCode] = useState(
    availableCourses[0]?.courseCode ?? 'SUR-PED-502'
  );
  const selectedCourse =
    availableCourses.find((c) => c.courseCode === selectedCourseCode) ??
    availableCourses[0] ??
    courses[0];

  const enabledFormsForCourse: EvaluationFormType[] = useMemo(() => {
    return selectedCourse.enabledForms && selectedCourse.enabledForms.length > 0
      ? selectedCourse.enabledForms
      : ['form_a', 'form_b', 'form_c', 'well_baby', 'form_e'];
  }, [selectedCourse]);

  const [selectedForm, setSelectedForm] = useState<EvaluationFormType>(
    enabledFormsForCourse[0] ?? 'well_baby'
  );
  const [selectedYear, setSelectedYear] = useState<AcademicYearLevel>('5');
  const [selectedGroup, setSelectedGroup] = useState<string>('กลุ่ม B');
  const [evaluatorName, setEvaluatorName] = useState(
    authenticatedDisplayName ||
      (role === 'faculty' ? 'อ.ภิญญดา แก้วปลั่ง' : 'นพ.เอกรัตน์ วัฒนสุรินทร์')
  );
  const [wardOrUnit, setWardOrUnit] = useState(
    selectedCourse.subrotations?.[0] ?? 'คลินิกสุขภาพเด็กดี (Well Baby Clinic)'
  );
  const [customWardText, setCustomWardText] = useState('');
  const [rotationStartDate, setRotationStartDate] = useState('2026-11-02');
  const [rotationEndDate, setRotationEndDate] = useState('2026-11-29');
  const [showRubricGuide, setShowRubricGuide] = useState(false);

  // Sync course selection when scoped courses change
  useEffect(() => {
    if (
      availableCourses.length > 0 &&
      !availableCourses.some((c) => c.courseCode === selectedCourseCode)
    ) {
      setSelectedCourseCode(availableCourses[0].courseCode);
    }
  }, [availableCourses, selectedCourseCode]);

  // Keep selectedForm valid for the selected course
  useEffect(() => {
    if (!enabledFormsForCourse.includes(selectedForm)) {
      setSelectedForm(enabledFormsForCourse[0] ?? 'form_a');
    }
  }, [enabledFormsForCourse, selectedForm]);

  // Update default ward when switching course
  useEffect(() => {
    if (selectedCourse.subrotations && selectedCourse.subrotations.length > 0) {
      setWardOrUnit(selectedCourse.subrotations[0]);
      setCustomWardText('');
    }
  }, [selectedCourse.courseCode]);

  // Sync evaluator name when logging in as a specific faculty/staff user
  useEffect(() => {
    if (authenticatedDisplayName && role !== 'student') {
      setEvaluatorName(authenticatedDisplayName);
    }
  }, [authenticatedDisplayName, role]);

  // Per-student state maps keyed by studentId so switching groups/years preserves edits
  const [wbMap, setWbMap] = useState<Record<string, WellBabyRowState>>({});
  const [fbMap, setFbMap] = useState<Record<string, FormBRowState>>({});
  const [faMap, setFaMap] = useState<Record<string, FormARowState>>({});
  const [fcMap, setFcMap] = useState<Record<string, FormCRowState>>({});
  const [feMap, setFeMap] = useState<Record<string, FormERowState>>({});
  const [customScoreMap, setCustomScoreMap] = useState<Record<string, number | null>>({});

  const canSubmit =
    role === 'faculty' || role === 'course_officer' || role === 'admin';

  // Active checked topics for the selected course & form (standard + custom)
  const enabledItemIds = useMemo(() => {
    return (
      selectedCourse.enabledItems?.[selectedForm] ??
      getAllMergedFormItemIds(selectedForm, selectedCourse)
    );
  }, [selectedCourse, selectedForm]);

  const activeWellBabyItems = useMemo(
    () => WELL_BABY_ITEMS.filter((item) => enabledItemIds.includes(item.id)),
    [enabledItemIds]
  );
  const activeFormBItems = useMemo(
    () => FORM_B_ITEMS.filter((item) => enabledItemIds.includes(item.id)),
    [enabledItemIds]
  );
  const activeFormADomains = useMemo(
    () => FORM_A_DOMAINS.filter((d) => enabledItemIds.includes(d.id)),
    [enabledItemIds]
  );
  const activeFormCDomains = useMemo(
    () => FORM_C_DOMAINS.filter((d) => enabledItemIds.includes(d.id)),
    [enabledItemIds]
  );
  const activeFormEAttitude = useMemo(
    () =>
      FORM_E_ATTITUDE_OBJECTS.map((item, idx) => ({ ...item, idx })).filter(
        (item) => enabledItemIds.includes(item.id)
      ),
    [enabledItemIds]
  );
  const activeFormEComm = useMemo(
    () =>
      FORM_E_COMM_OBJECTS.map((item, idx) => ({ ...item, idx })).filter((item) =>
        enabledItemIds.includes(item.id)
      ),
    [enabledItemIds]
  );
  const activeCustomItems: CustomEvaluationItem[] = useMemo(
    () =>
      (selectedCourse.customItems?.[selectedForm] ?? []).filter((item) =>
        enabledItemIds.includes(item.id)
      ),
    [selectedCourse, selectedForm, enabledItemIds]
  );

  const getCustomItemDefault = (item: CustomEvaluationItem): number => {
    if (selectedForm === 'form_a' || selectedForm === 'form_c') return 8;
    return Math.max(1, Math.round(item.maxScore * 0.8));
  };

  const getCustomScoreValue = (studentId: string, item: CustomEvaluationItem): number | null => {
    const key = `${selectedCourse.courseCode}:${selectedForm}:${studentId}:${item.id}`;
    if (Object.prototype.hasOwnProperty.call(customScoreMap, key)) {
      return customScoreMap[key];
    }
    return getCustomItemDefault(item);
  };

  const setCustomScoreValue = (
    studentId: string,
    itemId: string,
    value: number | null
  ) => {
    const key = `${selectedCourse.courseCode}:${selectedForm}:${studentId}:${itemId}`;
    setCustomScoreMap((prev) => ({ ...prev, [key]: value }));
  };

  const getTopicMappingBadgeLabel = (topicKey: string): string | null => {
    const target = resolveTopicGradeTarget(topicKey, selectedCourse);
    const defaultTarget = FORM_DEFAULT_GRADE_TARGET[selectedForm];
    if (target === defaultTarget) return null;
    const customGrp = (selectedCourse.customGradeGroups ?? []).find((g) => g.id === target);
    if (customGrp) return customGrp.name;
    const builtIn = BUILT_IN_GRADE_BUCKETS.find((b) => b.id === target);
    return builtIn ? `→ ${builtIn.shortLabel}` : null;
  };

  // Available groups in selected year
  const availableGroups = useMemo(() => {
    const groups = Array.from(
      new Set(
        COHORT_STUDENTS.filter((s) => s.yearLevel === selectedYear).map((s) => s.group)
      )
    );
    return groups;
  }, [selectedYear]);

  // Ensure selectedGroup stays valid when changing year
  const effectiveGroup =
    selectedGroup === 'ทั้งหมด' || availableGroups.includes(selectedGroup)
      ? selectedGroup
      : availableGroups[0] ?? 'ทั้งหมด';

  const targetStudents: CohortStudent[] = useMemo(() => {
    if (role === 'student') {
      return COHORT_STUDENTS.filter((s) => s.studentId === currentStudentId);
    }
    return COHORT_STUDENTS.filter(
      (s) =>
        s.yearLevel === selectedYear &&
        (effectiveGroup === 'ทั้งหมด' || s.group === effectiveGroup)
    );
  }, [role, currentStudentId, selectedYear, effectiveGroup]);

  const getWbRow = (id: string) => wbMap[id] ?? createDefaultWellBabyRow();
  const getFbRow = (id: string) => fbMap[id] ?? createDefaultFormBRow();
  const getFaRow = (id: string) => faMap[id] ?? createDefaultFormARow();
  const getFcRow = (id: string) => fcMap[id] ?? createDefaultFormCRow();
  const getFeRow = (id: string) => feMap[id] ?? createDefaultFormERow();

  const resolvedWard =
    wardOrUnit === '__custom__'
      ? customWardText.trim() || 'ระบุหอผู้ป่วย/คลินิก'
      : wardOrUnit;

  const computeStudentSummary = (student: CohortStudent) => {
    const itemPercentages: Record<string, number> = {};
    let customRaw = 0;
    let customMax = 0;

    activeCustomItems.forEach((item) => {
      const val = getCustomScoreValue(student.studentId, item);
      if (val !== null) {
        const clamped = Math.max(0, Math.min(item.maxScore, val));
        customRaw += clamped;
        customMax += item.maxScore;
        itemPercentages[`${selectedForm}:${item.id}`] =
          item.maxScore > 0 ? Math.round((clamped / item.maxScore) * 1000) / 10 : 0;
      }
    });

    if (selectedForm === 'well_baby') {
      const row = getWbRow(student.studentId);
      activeWellBabyItems.forEach((item) => {
        const val = row.scores[item.id] ?? 0;
        itemPercentages[`well_baby:${item.id}`] =
          item.maxScore > 0 ? Math.round((val / item.maxScore) * 1000) / 10 : 0;
      });
      const raw =
        activeWellBabyItems.reduce((sum, item) => sum + (row.scores[item.id] ?? 0), 0) +
        customRaw;
      const max =
        activeWellBabyItems.reduce((sum, item) => sum + item.maxScore, 0) + customMax;
      const pct = max > 0 ? Math.round((raw / max) * 1000) / 10 : 0;
      let rating = 'U';
      if (pct >= 90) rating = 'O';
      else if (pct >= 75) rating = 'M';
      else if (pct >= 60) rating = 'S';
      return {
        raw,
        max,
        pct,
        rating,
        passedGate: pct >= 60,
        feedback: row.feedback,
        detailsSummary: `Well Baby ${raw}/${max} (${rating}) · ${resolvedWard}`,
        itemPercentages,
      };
    }

    if (selectedForm === 'form_b') {
      const row = getFbRow(student.studentId);
      activeFormBItems.forEach((item) => {
        const val = row.scores[item.id] ?? 0;
        itemPercentages[`form_b:${item.id}`] =
          item.maxScore > 0 ? Math.round((val / item.maxScore) * 1000) / 10 : 0;
      });
      const raw =
        activeFormBItems.reduce((sum, item) => sum + (row.scores[item.id] ?? 0), 0) +
        customRaw;
      const max =
        activeFormBItems.reduce((sum, item) => sum + item.maxScore, 0) + customMax;
      const pct = max > 0 ? Math.round((raw / max) * 1000) / 10 : 0;
      const rating =
        pct >= 85 ? 'ดีเยี่ยม' : pct >= 75 ? 'ดี' : pct >= 60 ? 'ผ่านเกณฑ์' : 'ต้องปรับปรุง';
      return {
        raw,
        max,
        pct,
        rating,
        passedGate: pct >= 60,
        feedback: row.feedback,
        detailsSummary: `Form B (${activeFormBItems.length + activeCustomItems.length} หัวข้อ) ${raw}/${max} · ${resolvedWard}`,
        itemPercentages,
      };
    }

    if (selectedForm === 'form_a') {
      const row = getFaRow(student.studentId);
      const evaluated = activeFormADomains.filter((d) => row.scores[d.id] !== null);
      evaluated.forEach((d) => {
        const val = row.scores[d.id] ?? 0;
        itemPercentages[`form_a:${d.id}`] = Math.round((val / 10) * 1000) / 10;
      });
      const raw = evaluated.reduce((sum, d) => sum + (row.scores[d.id] ?? 0), 0) + customRaw;
      const max = evaluated.length * 10 + customMax;
      const pct = max > 0 ? Math.round((raw / max) * 1000) / 10 : 0;
      return {
        raw,
        max,
        pct,
        rating: row.overall,
        passedGate: row.overall !== 'unsatisfactory',
        feedback: row.feedback,
        detailsSummary: `Form A (${evaluated.length}/${activeFormADomains.length} ด้าน${
          activeCustomItems.length > 0 ? ` + ${activeCustomItems.length} หัวข้อเพิ่ม` : ''
        }) · Overall: ${row.overall} · ${resolvedWard}`,
        itemPercentages,
      };
    }

    if (selectedForm === 'form_c') {
      const row = getFcRow(student.studentId);
      const numericDomains = activeFormCDomains.filter(
        (d) => !d.isPassFailGate && row.scores[d.id] !== null
      );
      numericDomains.forEach((d) => {
        const val = row.scores[d.id] ?? 0;
        itemPercentages[`form_c:${d.id}`] = Math.round((val / 10) * 1000) / 10;
      });
      const raw =
        numericDomains.reduce((sum, d) => sum + (row.scores[d.id] ?? 0), 0) + customRaw;
      const max = numericDomains.length * 10 + customMax;
      const pct = max > 0 ? Math.round((raw / max) * 1000) / 10 : 0;
      const hasEthicsGate = activeFormCDomains.some((d) => d.id === 'fc-7');
      const hasHonestyGate = activeFormCDomains.some((d) => d.id === 'fc-12');
      const ethicsPass = !hasEthicsGate || row.scores['fc-7'] === 1;
      const honestyPass = !hasHonestyGate || row.scores['fc-12'] === 1;
      const passedGate = ethicsPass && honestyPass && row.overall !== 'unsatisfactory';
      return {
        raw,
        max,
        pct,
        rating: passedGate ? row.overall : 'ไม่ผ่านเกณฑ์จริยธรรม/ซื่อสัตย์',
        passedGate,
        feedback: row.feedback,
        detailsSummary: `Form C (${numericDomains.length + activeCustomItems.length} ด้าน) ${raw}/${max} · ลา ${row.leaveDays} ขาด ${row.absentDays} วัน · Ethics/Honesty: ${
          ethicsPass && honestyPass ? 'ผ่าน' : 'ไม่ผ่าน'
        }`,
        itemPercentages,
      };
    }

    // form_e
    const row = getFeRow(student.studentId);
    activeFormEAttitude.forEach((item) => {
      const val = row.attitude[item.idx] ?? 0;
      itemPercentages[`form_e:${item.id}`] =
        item.maxScore > 0 ? Math.round((val / item.maxScore) * 1000) / 10 : 0;
    });
    activeFormEComm.forEach((item) => {
      const val = row.comm[item.idx] ?? 0;
      itemPercentages[`form_e:${item.id}`] =
        item.maxScore > 0 ? Math.round((val / item.maxScore) * 1000) / 10 : 0;
    });
    const attSum = activeFormEAttitude.reduce(
      (sum, item) => sum + (row.attitude[item.idx] ?? 0),
      0
    );
    const attMax = activeFormEAttitude.reduce((sum, item) => sum + item.maxScore, 0);
    const commSum = activeFormEComm.reduce(
      (sum, item) => sum + (row.comm[item.idx] ?? 0),
      0
    );
    const commMax = activeFormEComm.reduce((sum, item) => sum + item.maxScore, 0);
    const raw = attSum + commSum + customRaw;
    const max = attMax + commMax + customMax;
    const pct = max > 0 ? Math.round((raw / max) * 1000) / 10 : 0;
    const attPassThreshold = attMax > 0 ? attMax * 0.6 : 0;
    const passedGate = !row.severeMisconduct && attSum >= attPassThreshold;
    return {
      raw,
      max,
      pct,
      rating: passedGate ? 'ผ่านเจตคติ' : 'ไม่ผ่าน (F)',
      passedGate,
      feedback: row.feedback,
      detailsSummary: `Form E: (A) เจตคติ ${attSum}/${attMax} · (B) สัมพันธภาพ ${commSum}/${commMax}${
        activeCustomItems.length > 0 ? ` + เพิ่มเติม ${customRaw}/${customMax}` : ''
      }`,
      itemPercentages,
    };
  };

  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || targetStudents.length === 0) return;

    const batchPayload: Omit<FacultyFormSubmission, 'id' | 'date'>[] = targetStudents.map(
      (student) => {
        const summary = computeStudentSummary(student);
        return {
          formType: selectedForm,
          formTitle: FORM_METADATA[selectedForm].fullName,
          courseCode: selectedCourse.courseCode,
          courseName: selectedCourse.courseName,
          wardOrSubrotation: resolvedWard,
          rotationStartDate,
          rotationEndDate,
          studentId: student.studentId,
          studentName: student.studentName,
          evaluatorName: evaluatorName.trim() || 'อาจารย์แพทย์ประจำศูนย์ฯ',
          rawScore: summary.raw,
          maxScore: summary.max,
          percentage: summary.pct,
          ratingLabel: summary.rating,
          passedAttitudeGate: summary.passedGate,
          feedback:
            summary.feedback.trim() ||
            (summary.passedGate
              ? 'ปฏิบัติงานทางคลินิกและแสดงเจตคติวิชาชีพได้เหมาะสมตามมาตรฐาน'
              : 'ควรนัดพบอาจารย์ที่ปรึกษาเพื่อวางแผนปรับปรุงสมรรถนะทางคลินิก'),
          detailsSummary: `${student.group} (ปี ${student.yearLevel}) · ${summary.detailsSummary}`,
          itemPercentages: summary.itemPercentages,
        };
      }
    );

    onSubmitBatchForms(batchPayload);
  };

  const visibleSubmissions =
    role === 'student'
      ? submissions.filter((s) => s.studentId === currentStudentId)
      : submissions;

  return (
    <div className="space-y-8">
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-[#0F2A4A]" aria-hidden="true" />
              ตารางกรอกคะแนนประเมินรายกลุ่ม (MEC_Surin Group Grading Matrix)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              เลือกแบบประเมิน ชั้นปี และกลุ่มนักศึกษา เพื่อกรอกคะแนนเรียงตามแนวนอนและบันทึกพร้อมกันทั้งกลุ่ม
            </p>
          </div>

          <div className="text-xs font-medium">
            {canSubmit ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-700">
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                สิทธิ์อาจารย์/วิชาการ: กรอกคะแนนทั้งกลุ่มได้
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-amber-700">
                <Lock className="w-4 h-4" aria-hidden="true" />
                สิทธิ์นักศึกษา: แสดงเฉพาะข้อมูลของตนเอง (อ่านอย่างเดียว)
              </span>
            )}
          </div>
        </div>

        {/* Course-Enabled Evaluation Forms Switcher */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <span>
              แบบประเมินที่เปิดใช้งานในรายวิชา <strong className="text-[#0F2A4A]">{selectedCourse.courseCode}</strong> ({enabledFormsForCourse.length} ฟอร์ม)
            </span>
            <span className="text-[11px] text-slate-500">
              แต่ละรายวิชาเลือกแบบประเมินและหัวข้อย่อยได้ต่างกัน
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {enabledFormsForCourse.map((key) => {
              const meta = FORM_METADATA[key];
              const active = selectedForm === key;
              const enabledItemCount = (
                selectedCourse.enabledItems?.[key] ?? getAllMergedFormItemIds(key, selectedCourse)
              ).length;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedForm(key)}
                  className={`text-left p-3.5 rounded-lg border transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#0F2A4A] text-white border-[#0F2A4A]'
                      : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-xs font-semibold">{meta.shortName}</div>
                  <div className={`text-[11px] mt-1 tabular-nums ${active ? 'text-white/80' : 'text-slate-500'}`}>
                    เปิดประเมิน {enabledItemCount} หัวข้อ
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Course, Year, Group, Ward/Subrotation, Evaluator, and Rotation Dates Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              เลือกรายวิชา
            </label>
            <select
              value={selectedCourse.courseCode}
              onChange={(e) => setSelectedCourseCode(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
            >
              {availableCourses.map((c) => (
                <option key={c.courseCode} value={c.courseCode}>
                  {c.courseCode} · {c.courseName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Ward / Sub-rotation
            </label>
            <select
              value={wardOrUnit}
              disabled={!canSubmit}
              onChange={(e) => setWardOrUnit(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg disabled:bg-slate-100"
            >
              {(selectedCourse.subrotations ?? []).map((sr) => (
                <option key={sr} value={sr}>
                  {sr}
                </option>
              ))}
              <option value="__custom__">ระบุ Ward / Sub-rotation เอง...</option>
            </select>
            {wardOrUnit === '__custom__' && (
              <input
                type="text"
                disabled={!canSubmit}
                value={customWardText}
                onChange={(e) => setCustomWardText(e.target.value)}
                placeholder="พิมพ์ชื่อ Ward / Sub-rotation..."
                className="mt-1.5 w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              เลือกชั้นปี
            </label>
            <select
              value={selectedYear}
              disabled={role === 'student'}
              onChange={(e) => {
                const yr = e.target.value as AcademicYearLevel;
                setSelectedYear(yr);
                setSelectedGroup('กลุ่ม A');
              }}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg disabled:bg-slate-100"
            >
              <option value="4">ชั้นปีที่ 4</option>
              <option value="5">ชั้นปีที่ 5</option>
              <option value="6">ชั้นปีที่ 6 (Extern)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              เลือกกลุ่มนักศึกษา
            </label>
            <select
              value={effectiveGroup}
              disabled={role === 'student'}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg disabled:bg-slate-100"
            >
              {availableGroups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
              <option value="ทั้งหมด">ทุกกลุ่มในชั้นปีที่ {selectedYear}</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              ชื่ออาจารย์ผู้ประเมิน
            </label>
            <input
              type="text"
              value={evaluatorName}
              disabled={!canSubmit}
              onChange={(e) => setEvaluatorName(e.target.value)}
              placeholder="ระบุชื่ออาจารย์แพทย์ผู้ประเมิน..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg disabled:bg-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              วันที่ปฏิบัติงาน (เริ่ม)
            </label>
            <input
              type="date"
              value={rotationStartDate}
              disabled={!canSubmit}
              onChange={(e) => setRotationStartDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg tabular-nums disabled:bg-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              จนถึงวันที่
            </label>
            <input
              type="date"
              value={rotationEndDate}
              min={rotationStartDate}
              disabled={!canSubmit}
              onChange={(e) => setRotationEndDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg tabular-nums disabled:bg-slate-100"
            />
          </div>
        </div>

        {/* Active Form Info + Rubric Legend Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-[#0F2A4A]">
              {FORM_METADATA[selectedForm].fullName}
            </div>
            <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
              Ward: <span className="font-medium text-slate-800">{resolvedWard}</span> · วันที่ปฏิบัติงาน{' '}
              <span className="font-medium text-slate-800">
                {formatThaiIsoDate(rotationStartDate)} ถึง {formatThaiIsoDate(rotationEndDate)}
              </span>{' '}
              · นักศึกษา {targetStudents.length} คน
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowRubricGuide((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0F2A4A] bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
            {showRubricGuide ? 'ซ่อนคำอธิบายเกณฑ์คะแนน' : 'ดูคำอธิบายเกณฑ์คะแนนแต่ละข้อ'}
          </button>
        </div>

        {/* Collapsible Rubric Guide */}
        {showRubricGuide && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-700">
            <div className="font-semibold text-slate-900">
              เกณฑ์การให้คะแนน ({FORM_METADATA[selectedForm].shortName} — เฉพาะหัวข้อที่เปิดใช้ในรายวิชา {selectedCourse.courseCode})
            </div>
            {selectedForm === 'well_baby' && (
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                {activeWellBabyItems.map((i) => (
                  <li key={i.id}>
                    <span className="font-medium text-slate-900">{i.label}</span> (เต็ม {i.maxScore})
                  </li>
                ))}
              </ul>
            )}
            {selectedForm === 'form_b' && (
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                {activeFormBItems.map((i) => (
                  <li key={i.id}>
                    <span className="font-medium text-slate-900">{i.label}</span> (เต็ม 10)
                  </li>
                ))}
              </ul>
            )}
            {(selectedForm === 'form_a' || selectedForm === 'form_c') && (
              <div className="space-y-1">
                <div>10 = Outstanding · 8 = Very Satisfactory · 6 = Satisfactory · 4 = Unsatisfactory · N/A = ไม่นำมาคิดเป็นตัวหาร</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 pt-1">
                  {(selectedForm === 'form_a' ? activeFormADomains : activeFormCDomains).map((d) => (
                    <div key={d.id}>
                      <span className="font-semibold text-slate-900">{d.domainName}:</span>{' '}
                      {d.options[0]?.description}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selectedForm === 'form_e' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="font-semibold text-slate-900 mb-1">หมวด (A) เจตคติ (0–5 คะแนน)</div>
                  {activeFormEAttitude.map((item) => (
                    <div key={item.id}>{item.label}</div>
                  ))}
                </div>
                <div>
                  <div className="font-semibold text-slate-900 mb-1">หมวด (B) สัมพันธภาพ (0–2 คะแนน)</div>
                  {activeFormEComm.map((item) => (
                    <div key={item.id}>{item.label}</div>
                  ))}
                </div>
              </div>
            )}
            {activeCustomItems.length > 0 && (
              <div className="pt-2 border-t border-slate-200">
                <div className="font-semibold text-[#0F2A4A] mb-1">
                  หัวข้อเพิ่มเติมประจำรายวิชา ({activeCustomItems.length} หัวข้อ)
                </div>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                  {activeCustomItems.map((ci) => (
                    <li key={ci.id}>
                      <span className="font-medium text-slate-900">{ci.label}</span> (เต็ม {ci.maxScore})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Horizontal Batch Grading Table */}
        <form onSubmit={handleBatchSubmit} className="space-y-4">
          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[980px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-semibold text-slate-700">
                  <th className="py-3 px-3 sticky left-0 z-20 bg-slate-100 border-r border-slate-200 min-w-[200px]">
                    รหัส / ชื่อนักศึกษาแพทย์
                  </th>

                  {selectedForm === 'well_baby' &&
                    activeWellBabyItems.map((item) => (
                      <th
                        key={item.id}
                        title={item.label}
                        className="py-3 px-2 text-center whitespace-nowrap min-w-[105px]"
                      >
                        {WELL_BABY_SHORT_HEADERS[item.id]}
                      </th>
                    ))}

                  {selectedForm === 'form_b' &&
                    activeFormBItems.map((item) => (
                      <th
                        key={item.id}
                        title={item.label}
                        className="py-3 px-2 text-center whitespace-nowrap min-w-[105px]"
                      >
                        {FORM_B_SHORT_HEADERS[item.id]} (10)
                      </th>
                    ))}

                  {selectedForm === 'form_a' && (
                    <>
                      {activeFormADomains.map((d) => (
                        <th
                          key={d.id}
                          title={d.domainName}
                          className="py-3 px-2 text-center whitespace-nowrap min-w-[105px]"
                        >
                          {FORM_A_SHORT_HEADERS[d.id]}
                        </th>
                      ))}
                      <th className="py-3 px-2 text-center whitespace-nowrap min-w-[130px]">
                        Overall
                      </th>
                    </>
                  )}

                  {selectedForm === 'form_c' && (
                    <>
                      {activeFormCDomains.map((d) => (
                        <th
                          key={d.id}
                          title={d.domainName}
                          className="py-3 px-2 text-center whitespace-nowrap min-w-[105px]"
                        >
                          {FORM_C_SHORT_HEADERS[d.id]}
                        </th>
                      ))}
                      <th className="py-3 px-2 text-center whitespace-nowrap min-w-[72px]">
                        ลา (วัน)
                      </th>
                      <th className="py-3 px-2 text-center whitespace-nowrap min-w-[72px]">
                        ขาด (วัน)
                      </th>
                      <th className="py-3 px-2 text-center whitespace-nowrap min-w-[130px]">
                        Overall
                      </th>
                    </>
                  )}

                  {selectedForm === 'form_e' && (
                    <>
                      {activeFormEAttitude.map((item) => (
                        <th
                          key={item.id}
                          title={item.label}
                          className="py-3 px-2 text-center whitespace-nowrap min-w-[90px]"
                        >
                          {item.shortLabel} ({item.maxScore})
                        </th>
                      ))}
                      {activeFormEComm.map((item) => (
                        <th
                          key={item.id}
                          title={item.label}
                          className="py-3 px-2 text-center whitespace-nowrap min-w-[85px]"
                        >
                          {item.shortLabel} ({item.maxScore})
                        </th>
                      ))}
                      <th className="py-3 px-2 text-center whitespace-nowrap min-w-[110px]">
                        ผิดร้ายแรง
                      </th>
                    </>
                  )}

                  {activeCustomItems.map((ci) => {
                    const badge = getTopicMappingBadgeLabel(`${selectedForm}:${ci.id}`);
                    return (
                      <th
                        key={ci.id}
                        title={ci.label}
                        className="py-3 px-2 text-center min-w-[118px] bg-teal-50/70 text-[#0F2A4A]"
                      >
                        <div className="truncate max-w-[130px] mx-auto">
                          {ci.label} ({ci.maxScore})
                        </div>
                        {badge && (
                          <div className="text-[10px] font-normal text-[#0F766E] truncate max-w-[130px] mx-auto">
                            {badge}
                          </div>
                        )}
                      </th>
                    );
                  })}

                  <th className="py-3 px-3 text-right whitespace-nowrap bg-slate-100 border-l border-slate-200">
                    คะแนนรวม
                  </th>
                  <th className="py-3 px-3 text-right whitespace-nowrap bg-slate-100">
                    ร้อยละ
                  </th>
                  <th className="py-3 px-3 text-center whitespace-nowrap bg-slate-100">
                    ผลประเมิน
                  </th>
                  <th className="py-3 px-3 whitespace-nowrap bg-slate-100 min-w-[180px]">
                    ข้อเสนอแนะ
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 text-xs">
                {targetStudents.map((student) => {
                  const summary = computeStudentSummary(student);

                  return (
                    <tr key={student.studentId} className="hover:bg-slate-50/70">
                      {/* Sticky Left Student Identity */}
                      <td className="py-3 px-3 sticky left-0 z-10 bg-white border-r border-slate-200">
                        <div className="flex items-center gap-2.5">
                          <StudentAvatar
                            studentId={student.studentId}
                            studentName={student.studentName}
                            studentPhotos={studentPhotos}
                            size="xs"
                          />
                          <div>
                            <div className="font-semibold text-slate-900 whitespace-nowrap">
                              {student.studentName}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 tabular-nums">
                              {student.studentId} · ปี {student.yearLevel} · {student.group}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* WELL BABY HORIZONTAL CELLS */}
                      {selectedForm === 'well_baby' &&
                        activeWellBabyItems.map((item) => {
                          const row = getWbRow(student.studentId);
                          const val = row.scores[item.id] ?? 0;
                          return (
                            <td key={item.id} className="py-2.5 px-2 text-center">
                              <select
                                disabled={!canSubmit}
                                value={val}
                                aria-label={`${student.studentName} ${item.label}`}
                                onChange={(e) =>
                                  setWbMap((prev) => ({
                                    ...prev,
                                    [student.studentId]: {
                                      ...row,
                                      scores: {
                                        ...row.scores,
                                        [item.id]: Number(e.target.value),
                                      },
                                    },
                                  }))
                                }
                                className="w-16 px-1.5 py-1.5 text-center font-mono bg-white border border-slate-300 rounded-md tabular-nums disabled:bg-slate-100"
                              >
                                {Array.from({ length: item.maxScore + 1 }, (_, n) => n).map(
                                  (opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  )
                                )}
                              </select>
                            </td>
                          );
                        })}

                      {/* FORM B HORIZONTAL CELLS */}
                      {selectedForm === 'form_b' &&
                        activeFormBItems.map((item) => {
                          const row = getFbRow(student.studentId);
                          const val = row.scores[item.id] ?? 0;
                          return (
                            <td key={item.id} className="py-2.5 px-2 text-center">
                              <input
                                type="number"
                                min={0}
                                max={10}
                                step={0.5}
                                disabled={!canSubmit}
                                value={val}
                                aria-label={`${student.studentName} ${item.label}`}
                                onChange={(e) =>
                                  setFbMap((prev) => ({
                                    ...prev,
                                    [student.studentId]: {
                                      ...row,
                                      scores: {
                                        ...row.scores,
                                        [item.id]: Math.min(
                                          10,
                                          Math.max(0, Number(e.target.value))
                                        ),
                                      },
                                    },
                                  }))
                                }
                                className="w-16 px-1.5 py-1.5 text-center font-mono bg-white border border-slate-300 rounded-md tabular-nums disabled:bg-slate-100"
                              />
                            </td>
                          );
                        })}

                      {/* FORM A HORIZONTAL CELLS */}
                      {selectedForm === 'form_a' && (
                        <>
                          {activeFormADomains.map((d) => {
                            const row = getFaRow(student.studentId);
                            const val = row.scores[d.id];
                            return (
                              <td key={d.id} className="py-2.5 px-2 text-center">
                                <select
                                  disabled={!canSubmit}
                                  value={val === null ? 'NA' : String(val)}
                                  aria-label={`${student.studentName} ${d.domainName}`}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setFaMap((prev) => ({
                                      ...prev,
                                      [student.studentId]: {
                                        ...row,
                                        scores: {
                                          ...row.scores,
                                          [d.id]: v === 'NA' ? null : Number(v),
                                        },
                                      },
                                    }));
                                  }}
                                  className="w-24 px-1.5 py-1.5 font-mono text-xs bg-white border border-slate-300 rounded-md tabular-nums disabled:bg-slate-100"
                                >
                                  {d.options.map((opt) => (
                                    <option key={opt.label} value={String(opt.score)}>
                                      {opt.score} ({opt.label.split(' ')[0]})
                                    </option>
                                  ))}
                                  {d.allowNa && <option value="NA">N/A</option>}
                                </select>
                              </td>
                            );
                          })}
                          <td className="py-2.5 px-2 text-center">
                            {(() => {
                              const row = getFaRow(student.studentId);
                              return (
                                <select
                                  disabled={!canSubmit}
                                  value={row.overall}
                                  aria-label={`${student.studentName} Overall`}
                                  onChange={(e) =>
                                    setFaMap((prev) => ({
                                      ...prev,
                                      [student.studentId]: { ...row, overall: e.target.value },
                                    }))
                                  }
                                  className="w-32 px-1.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md disabled:bg-slate-100"
                                >
                                  <option value="outstanding">outstanding</option>
                                  <option value="very satisfactory">very satisfactory</option>
                                  <option value="satisfactory">satisfactory</option>
                                  <option value="borderline">borderline</option>
                                  <option value="unsatisfactory">unsatisfactory</option>
                                </select>
                              );
                            })()}
                          </td>
                        </>
                      )}

                      {/* FORM C HORIZONTAL CELLS */}
                      {selectedForm === 'form_c' && (
                        <>
                          {activeFormCDomains.map((d) => {
                            const row = getFcRow(student.studentId);
                            const val = row.scores[d.id];
                            return (
                              <td key={d.id} className="py-2.5 px-2 text-center">
                                {d.isPassFailGate ? (
                                  <select
                                    disabled={!canSubmit}
                                    value={String(val ?? 1)}
                                    aria-label={`${student.studentName} ${d.domainName}`}
                                    onChange={(e) =>
                                      setFcMap((prev) => ({
                                        ...prev,
                                        [student.studentId]: {
                                          ...row,
                                          scores: {
                                            ...row.scores,
                                            [d.id]: Number(e.target.value),
                                          },
                                        },
                                      }))
                                    }
                                    className={`w-24 px-1.5 py-1.5 text-xs font-medium border rounded-md disabled:bg-slate-100 ${
                                      val === 0
                                        ? 'bg-red-50 border-red-300 text-red-800'
                                        : 'bg-white border-slate-300 text-emerald-800'
                                    }`}
                                  >
                                    <option value="1">ผ่าน</option>
                                    <option value="0">ไม่ผ่าน</option>
                                  </select>
                                ) : (
                                  <select
                                    disabled={!canSubmit}
                                    value={val === null ? 'NA' : String(val)}
                                    aria-label={`${student.studentName} ${d.domainName}`}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      setFcMap((prev) => ({
                                        ...prev,
                                        [student.studentId]: {
                                          ...row,
                                          scores: {
                                            ...row.scores,
                                            [d.id]: v === 'NA' ? null : Number(v),
                                          },
                                        },
                                      }));
                                    }}
                                    className="w-24 px-1.5 py-1.5 font-mono text-xs bg-white border border-slate-300 rounded-md tabular-nums disabled:bg-slate-100"
                                  >
                                    {d.options.map((opt) => (
                                      <option key={opt.label} value={String(opt.score)}>
                                        {opt.score}
                                      </option>
                                    ))}
                                    {d.allowNa && <option value="NA">N/A</option>}
                                  </select>
                                )}
                              </td>
                            );
                          })}
                          <td className="py-2.5 px-2 text-center">
                            {(() => {
                              const row = getFcRow(student.studentId);
                              return (
                                <input
                                  type="number"
                                  min={0}
                                  disabled={!canSubmit}
                                  value={row.leaveDays}
                                  onChange={(e) =>
                                    setFcMap((prev) => ({
                                      ...prev,
                                      [student.studentId]: {
                                        ...row,
                                        leaveDays: Math.max(0, Number(e.target.value)),
                                      },
                                    }))
                                  }
                                  className="w-14 px-1.5 py-1.5 text-center font-mono bg-white border border-slate-300 rounded-md tabular-nums"
                                />
                              );
                            })()}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            {(() => {
                              const row = getFcRow(student.studentId);
                              return (
                                <input
                                  type="number"
                                  min={0}
                                  disabled={!canSubmit}
                                  value={row.absentDays}
                                  onChange={(e) =>
                                    setFcMap((prev) => ({
                                      ...prev,
                                      [student.studentId]: {
                                        ...row,
                                        absentDays: Math.max(0, Number(e.target.value)),
                                      },
                                    }))
                                  }
                                  className="w-14 px-1.5 py-1.5 text-center font-mono bg-white border border-slate-300 rounded-md tabular-nums"
                                />
                              );
                            })()}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            {(() => {
                              const row = getFcRow(student.studentId);
                              return (
                                <select
                                  disabled={!canSubmit}
                                  value={row.overall}
                                  onChange={(e) =>
                                    setFcMap((prev) => ({
                                      ...prev,
                                      [student.studentId]: { ...row, overall: e.target.value },
                                    }))
                                  }
                                  className="w-32 px-1.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md disabled:bg-slate-100"
                                >
                                  <option value="outstanding">outstanding</option>
                                  <option value="very satisfactory">very satisfactory</option>
                                  <option value="satisfactory">satisfactory</option>
                                  <option value="borderline">borderline</option>
                                  <option value="unsatisfactory">unsatisfactory</option>
                                </select>
                              );
                            })()}
                          </td>
                        </>
                      )}

                      {/* FORM E HORIZONTAL CELLS */}
                      {selectedForm === 'form_e' && (
                        <>
                          {activeFormEAttitude.map((item) => {
                            const row = getFeRow(student.studentId);
                            return (
                              <td key={item.id} className="py-2.5 px-2 text-center">
                                <select
                                  disabled={!canSubmit}
                                  value={row.attitude[item.idx]}
                                  aria-label={`${student.studentName} ${item.shortLabel}`}
                                  onChange={(e) =>
                                    setFeMap((prev) => ({
                                      ...prev,
                                      [student.studentId]: {
                                        ...row,
                                        attitude: row.attitude.map((v, i) =>
                                          i === item.idx ? Number(e.target.value) : v
                                        ),
                                      },
                                    }))
                                  }
                                  className="w-14 px-1.5 py-1.5 text-center font-mono bg-white border border-slate-300 rounded-md tabular-nums disabled:bg-slate-100"
                                >
                                  {[0, 1, 2, 3, 4, 5].map((n) => (
                                    <option key={n} value={n}>
                                      {n}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            );
                          })}
                          {activeFormEComm.map((item) => {
                            const row = getFeRow(student.studentId);
                            return (
                              <td key={item.id} className="py-2.5 px-2 text-center">
                                <select
                                  disabled={!canSubmit}
                                  value={row.comm[item.idx]}
                                  aria-label={`${student.studentName} ${item.shortLabel}`}
                                  onChange={(e) =>
                                    setFeMap((prev) => ({
                                      ...prev,
                                      [student.studentId]: {
                                        ...row,
                                        comm: row.comm.map((v, i) =>
                                          i === item.idx ? Number(e.target.value) : v
                                        ),
                                      },
                                    }))
                                  }
                                  className="w-14 px-1.5 py-1.5 text-center font-mono bg-white border border-slate-300 rounded-md tabular-nums disabled:bg-slate-100"
                                >
                                  {[0, 1, 2].map((n) => (
                                    <option key={n} value={n}>
                                      {n}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            );
                          })}
                          <td className="py-2.5 px-2 text-center">
                            {(() => {
                              const row = getFeRow(student.studentId);
                              return (
                                <label className="inline-flex items-center gap-1.5 text-xs text-red-800 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    disabled={!canSubmit}
                                    checked={row.severeMisconduct}
                                    onChange={(e) =>
                                      setFeMap((prev) => ({
                                        ...prev,
                                        [student.studentId]: {
                                          ...row,
                                          severeMisconduct: e.target.checked,
                                        },
                                      }))
                                    }
                                    className="w-4 h-4 accent-red-700"
                                  />
                                  <span>ผิด</span>
                                </label>
                              );
                            })()}
                          </td>
                        </>
                      )}

                      {/* CUSTOM EVALUATION ITEMS CELLS */}
                      {activeCustomItems.map((ci) => {
                        const val = getCustomScoreValue(student.studentId, ci);
                        const isRubric = selectedForm === 'form_a' || selectedForm === 'form_c';
                        return (
                          <td key={ci.id} className="py-2.5 px-2 text-center bg-teal-50/30">
                            {isRubric ? (
                              <select
                                disabled={!canSubmit}
                                value={val === null ? 'NA' : String(val)}
                                aria-label={`${student.studentName} ${ci.label}`}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setCustomScoreValue(
                                    student.studentId,
                                    ci.id,
                                    v === 'NA' ? null : Number(v)
                                  );
                                }}
                                className="w-20 px-1.5 py-1.5 font-mono text-xs bg-white border border-slate-300 rounded-md tabular-nums disabled:bg-slate-100"
                              >
                                {[10, 8, 6, 4].map((opt) => (
                                  <option key={opt} value={String(opt)}>
                                    {opt}
                                  </option>
                                ))}
                                {ci.allowNa && <option value="NA">N/A</option>}
                              </select>
                            ) : (
                              <input
                                type="number"
                                min={0}
                                max={ci.maxScore}
                                disabled={!canSubmit}
                                value={val ?? 0}
                                aria-label={`${student.studentName} ${ci.label}`}
                                onChange={(e) =>
                                  setCustomScoreValue(
                                    student.studentId,
                                    ci.id,
                                    Math.max(0, Math.min(ci.maxScore, Number(e.target.value)))
                                  )
                                }
                                className="w-16 px-1.5 py-1.5 text-center font-mono bg-white border border-slate-300 rounded-md tabular-nums disabled:bg-slate-100"
                              />
                            )}
                          </td>
                        );
                      })}

                      {/* Live Summary Columns */}
                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900 tabular-nums border-l border-slate-200 whitespace-nowrap">
                        {summary.raw} / {summary.max}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-[#0F2A4A] tabular-nums whitespace-nowrap">
                        {summary.pct}%
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            summary.passedGate ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {summary.rating}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          disabled={!canSubmit}
                          value={summary.feedback}
                          placeholder="ข้อเสนอแนะ..."
                          onChange={(e) => {
                            const val = e.target.value;
                            if (selectedForm === 'well_baby') {
                              const r = getWbRow(student.studentId);
                              setWbMap((prev) => ({
                                ...prev,
                                [student.studentId]: { ...r, feedback: val },
                              }));
                            } else if (selectedForm === 'form_b') {
                              const r = getFbRow(student.studentId);
                              setFbMap((prev) => ({
                                ...prev,
                                [student.studentId]: { ...r, feedback: val },
                              }));
                            } else if (selectedForm === 'form_a') {
                              const r = getFaRow(student.studentId);
                              setFaMap((prev) => ({
                                ...prev,
                                [student.studentId]: { ...r, feedback: val },
                              }));
                            } else if (selectedForm === 'form_c') {
                              const r = getFcRow(student.studentId);
                              setFcMap((prev) => ({
                                ...prev,
                                [student.studentId]: { ...r, feedback: val },
                              }));
                            } else {
                              const r = getFeRow(student.studentId);
                              setFeMap((prev) => ({
                                ...prev,
                                [student.studentId]: { ...r, feedback: val },
                              }));
                            }
                          }}
                          className="w-44 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md disabled:bg-slate-100"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {canSubmit ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <div className="text-xs text-slate-600">
                เมื่อกดบันทึก ระบบจะจัดเก็บคะแนนของนักศึกษาทั้งกลุ่ม ({targetStudents.length} คน) ในรายวิชา{' '}
                <span className="font-semibold text-slate-900">{selectedCourse.courseCode}</span>{' '}
                และอัปเดตตารางตัดเกรด MPL ทันที
              </div>
              <button
                type="submit"
                className="px-6 py-2.5 text-sm font-medium text-white bg-[#0F2A4A] rounded-lg hover:bg-[#163B66] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                บันทึกผลประเมินทั้งกลุ่ม ({targetStudents.length} คน)
              </button>
            </div>
          ) : (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
              <Lock className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
              <span>
                ระดับสิทธิ์ 1 (นักศึกษาแพทย์) ไม่สามารถแก้ไขคะแนนหรือบันทึกแบบประเมินได้ กรุณาสลับเป็น{' '}
                <span className="font-semibold">ระดับ 2: อาจารย์แพทย์</span> หรือ{' '}
                <span className="font-semibold">ระดับ 3: ฝ่ายวิชาการ</span> เพื่อทดลองกรอกคะแนนทั้งกลุ่ม
              </span>
            </div>
          )}
        </form>
      </section>

      {/* Recorded Submissions History */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <h3 className="text-base font-semibold text-slate-900">
            ประวัติแบบประเมินที่บันทึกแล้ว ({visibleSubmissions.length} รายการ)
          </h3>
          {role === 'student' && (
            <span className="text-xs text-slate-500">
              แสดงเฉพาะรายการของ{' '}
              {COHORT_STUDENTS.find((s) => s.studentId === currentStudentId)?.studentName}
            </span>
          )}
        </div>

        <div className="divide-y divide-slate-200">
          {visibleSubmissions.map((sub) => (
            <div key={sub.id} className="py-4 first:pt-1 last:pb-1 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-slate-500">
                  <span className="font-mono font-semibold text-[#0F2A4A]">{sub.courseCode}</span>
                  <span aria-hidden="true" className="mx-1.5">·</span>
                  <span>Ward/Sub-rotation: {sub.wardOrSubrotation || 'ไม่ระบุ'}</span>
                  <span aria-hidden="true" className="mx-1.5">·</span>
                  <span className="tabular-nums">
                    ปฏิบัติงาน {formatThaiIsoDate(sub.rotationStartDate)} ถึง {formatThaiIsoDate(sub.rotationEndDate)}
                  </span>
                  <span aria-hidden="true" className="mx-1.5">·</span>
                  <span>ผู้ประเมิน: {sub.evaluatorName}</span>
                </div>
                <div className="inline-flex items-center gap-2 text-xs font-mono font-bold tabular-nums">
                  <span className="text-slate-900">
                    {sub.rawScore}/{sub.maxScore} ({sub.percentage}%)
                  </span>
                  {sub.passedAttitudeGate ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-sans">
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      {sub.ratingLabel}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-700 font-sans">
                      <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                      {sub.ratingLabel}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <StudentAvatar
                  studentId={sub.studentId}
                  studentName={sub.studentName}
                  studentPhotos={studentPhotos}
                  size="xs"
                />
                <div className="text-sm font-semibold text-slate-900">
                  {sub.formTitle} — {sub.studentName}
                </div>
              </div>
              <div className="text-xs text-slate-600">{sub.detailsSummary}</div>
              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                ข้อเสนอแนะ: {sub.feedback}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
