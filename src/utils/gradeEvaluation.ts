import {
  BuiltInGradeTarget,
  CourseGradingConfig,
  EvaluationFormType,
  FacultyFormSubmission,
  StudentCourseScore,
} from '../types/medicalSchool';
import { FORM_DEFAULT_GRADE_TARGET } from '../data/evaluationFormsSchema';

export interface ComputedGradeResult {
  weightedTotal: number;
  grade: string;
  gradePoint: number;
  passed: boolean;
  reason: string;
}

const BUILT_IN_BUCKETS: BuiltInGradeTarget[] = [
  'formA',
  'formB',
  'formC',
  'wellBaby',
  'formE',
  'osce',
  'writtenExam',
];

export function computeMplCutoffs(mpl: number, strictMedicalMpl: boolean) {
  const passSpan = Math.max(5, 100 - mpl);
  const step = passSpan / 5;
  const cutA = Math.min(98, Math.round((mpl + step * 4) * 10) / 10);
  const cutBPlus = Math.round((mpl + step * 3) * 10) / 10;
  const cutB = Math.round((mpl + step * 2) * 10) / 10;
  const cutCPlus = Math.round((mpl + step * 1) * 10) / 10;
  const cutC = Math.round(mpl * 10) / 10;
  const cutDPlus = strictMedicalMpl ? null : Math.max(0, Math.round((mpl - 5) * 10) / 10);
  const cutD = strictMedicalMpl ? null : Math.max(0, Math.round((mpl - 10) * 10) / 10);

  return { cutA, cutBPlus, cutB, cutCPlus, cutC, cutDPlus, cutD };
}

export function getTotalConfiguredWeight(config: CourseGradingConfig): number {
  const w = config.weights;
  const baseSum =
    w.formA +
    w.formB +
    w.formC +
    w.wellBaby +
    w.formE +
    w.osce +
    w.writtenExam;
  const customSum = (config.customGradeGroups ?? []).reduce(
    (sum, grp) => sum + (Number.isFinite(grp.weightPercent) ? grp.weightPercent : 0),
    0
  );
  return Math.round((baseSum + customSum) * 10) / 10;
}

export function resolveTopicGradeTarget(
  topicKey: string,
  config: Pick<CourseGradingConfig, 'itemGradeMapping' | 'customGradeGroups'>
): string {
  const customGroup = (config.customGradeGroups ?? []).find((grp) =>
    grp.includedItemIds.includes(topicKey)
  );
  if (customGroup) return customGroup.id;

  const mapped = config.itemGradeMapping?.[topicKey];
  if (mapped) {
    const isBuiltIn = BUILT_IN_BUCKETS.includes(mapped as BuiltInGradeTarget);
    const isExistingCustom = (config.customGradeGroups ?? []).some((g) => g.id === mapped);
    if (isBuiltIn || isExistingCustom) return mapped;
  }

  const formType = topicKey.split(':')[0] as EvaluationFormType;
  return FORM_DEFAULT_GRADE_TARGET[formType] ?? 'formA';
}

export function recomputeRowScoresWithConfig(
  row: StudentCourseScore,
  config: CourseGradingConfig,
  courseSubmissions: FacultyFormSubmission[]
): StudentCourseScore {
  const studentSubs = courseSubmissions.filter(
    (s) => s.studentId === row.studentId && s.courseCode === config.courseCode
  );

  // Pick latest submission per formType
  const latestByForm = new Map<EvaluationFormType, FacultyFormSubmission>();
  studentSubs.forEach((sub) => {
    if (!latestByForm.has(sub.formType)) {
      latestByForm.set(sub.formType, sub);
    }
  });

  const bucketPcts: Record<string, number[]> = {};
  const addPct = (bucket: string, pct: number) => {
    if (!bucketPcts[bucket]) bucketPcts[bucket] = [];
    bucketPcts[bucket].push(pct);
  };

  latestByForm.forEach((sub) => {
    if (sub.itemPercentages && Object.keys(sub.itemPercentages).length > 0) {
      Object.entries(sub.itemPercentages).forEach(([topicKey, pct]) => {
        const target = resolveTopicGradeTarget(topicKey, config);
        addPct(target, pct);
      });
    } else {
      const defaultBucket = FORM_DEFAULT_GRADE_TARGET[sub.formType];
      addPct(defaultBucket, sub.percentage);
    }
  });

  const avg = (arr: number[]) =>
    Math.round((arr.reduce((sum, v) => sum + v, 0) / arr.length) * 10) / 10;

  const nextRow: StudentCourseScore = {
    ...row,
    formA: bucketPcts.formA?.length ? avg(bucketPcts.formA) : row.formA,
    formB: bucketPcts.formB?.length ? avg(bucketPcts.formB) : row.formB,
    formC: bucketPcts.formC?.length ? avg(bucketPcts.formC) : row.formC,
    wellBaby: bucketPcts.wellBaby?.length ? avg(bucketPcts.wellBaby) : row.wellBaby,
    formE: bucketPcts.formE?.length ? avg(bucketPcts.formE) : row.formE,
    osce: bucketPcts.osce?.length ? avg(bucketPcts.osce) : row.osce,
    writtenExam: bucketPcts.writtenExam?.length
      ? avg(bucketPcts.writtenExam)
      : row.writtenExam,
  };

  const nextCustomScores: Record<string, number | null> = {};
  (config.customGradeGroups ?? []).forEach((grp) => {
    const directValues = bucketPcts[grp.id];
    if (directValues && directValues.length > 0) {
      nextCustomScores[grp.id] = avg(directValues);
      return;
    }

    // Fallback when grouping existing seeded forms without per-item history
    const fallbackValues: number[] = [];
    grp.includedItemIds.forEach((topicKey) => {
      const formType = topicKey.split(':')[0] as EvaluationFormType;
      const defaultField = FORM_DEFAULT_GRADE_TARGET[formType];
      const existingVal = defaultField ? row[defaultField] : null;
      if (existingVal !== null && existingVal !== undefined) {
        fallbackValues.push(existingVal);
      }
    });

    if (fallbackValues.length > 0) {
      nextCustomScores[grp.id] = avg(fallbackValues);
    } else if (row.customGroupScores?.[grp.id] !== undefined) {
      nextCustomScores[grp.id] = row.customGroupScores[grp.id];
    } else {
      nextCustomScores[grp.id] = null;
    }
  });

  nextRow.customGroupScores = nextCustomScores;
  return nextRow;
}

export function evaluateStudentGrade(
  score: StudentCourseScore,
  config: CourseGradingConfig
): ComputedGradeResult {
  const w = config.weights;
  const customGroups = config.customGradeGroups ?? [];

  const customActiveWeightSum = customGroups.reduce((sum, grp) => {
    const val = score.customGroupScores?.[grp.id];
    return val !== null && val !== undefined ? sum + grp.weightPercent : sum;
  }, 0);

  const customRawWeightedSum = customGroups.reduce((sum, grp) => {
    const val = score.customGroupScores?.[grp.id];
    return val !== null && val !== undefined ? sum + val * grp.weightPercent : sum;
  }, 0);

  const activeWeightSum =
    (score.formA !== null ? w.formA : 0) +
    (score.formB !== null ? w.formB : 0) +
    (score.formC !== null ? w.formC : 0) +
    (score.wellBaby !== null ? w.wellBaby : 0) +
    (score.formE !== null ? w.formE : 0) +
    (score.osce !== null ? w.osce : 0) +
    (score.writtenExam !== null ? w.writtenExam : 0) +
    customActiveWeightSum;

  const rawWeightedSum =
    (score.formA ?? 0) * w.formA +
    (score.formB ?? 0) * w.formB +
    (score.formC ?? 0) * w.formC +
    (score.wellBaby ?? 0) * w.wellBaby +
    (score.formE ?? 0) * w.formE +
    (score.osce ?? 0) * w.osce +
    (score.writtenExam ?? 0) * w.writtenExam +
    customRawWeightedSum;

  const weightedTotal =
    activeWeightSum > 0 ? Math.round((rawWeightedSum / activeWeightSum) * 100) / 100 : 0;

  if (
    config.enforceAttitudeGate &&
    (!score.attitudeGatePassed || (score.formE !== null && score.formE < config.formEMinPercent))
  ) {
    return {
      weightedTotal,
      grade: 'F',
      gradePoint: 0,
      passed: false,
      reason: 'ไม่ผ่านเกณฑ์เจตคติ/จริยธรรม (Form E หรือ Form C)',
    };
  }

  if (score.writtenExam !== null && score.writtenExam < config.writtenMinPercent) {
    return {
      weightedTotal,
      grade: 'F',
      gradePoint: 0,
      passed: false,
      reason: `คะแนนข้อเขียนต่ำกว่าเกณฑ์ขั้นต่ำ (${config.writtenMinPercent}%)`,
    };
  }

  if (score.osce !== null && score.osce < config.osceMinPercent) {
    return {
      weightedTotal,
      grade: 'F',
      gradePoint: 0,
      passed: false,
      reason: `คะแนน OSCE ต่ำกว่าเกณฑ์ขั้นต่ำ (${config.osceMinPercent}%)`,
    };
  }

  const cuts = computeMplCutoffs(config.mplPercent, config.strictMedicalMpl);

  if (weightedTotal >= cuts.cutA) {
    return { weightedTotal, grade: 'A', gradePoint: 4.0, passed: true, reason: 'ผ่านเกณฑ์ MPL' };
  }
  if (weightedTotal >= cuts.cutBPlus) {
    return { weightedTotal, grade: 'B+', gradePoint: 3.5, passed: true, reason: 'ผ่านเกณฑ์ MPL' };
  }
  if (weightedTotal >= cuts.cutB) {
    return { weightedTotal, grade: 'B', gradePoint: 3.0, passed: true, reason: 'ผ่านเกณฑ์ MPL' };
  }
  if (weightedTotal >= cuts.cutCPlus) {
    return { weightedTotal, grade: 'C+', gradePoint: 2.5, passed: true, reason: 'ผ่านเกณฑ์ MPL' };
  }
  if (weightedTotal >= cuts.cutC) {
    return { weightedTotal, grade: 'C', gradePoint: 2.0, passed: true, reason: 'ผ่านเกณฑ์ MPL' };
  }

  if (!config.strictMedicalMpl && cuts.cutDPlus !== null && cuts.cutD !== null) {
    if (weightedTotal >= cuts.cutDPlus) {
      return {
        weightedTotal,
        grade: 'D+',
        gradePoint: 1.5,
        passed: true,
        reason: 'ต่ำกว่า MPL (เกณฑ์ผ่อนผัน 8 ระดับ)',
      };
    }
    if (weightedTotal >= cuts.cutD) {
      return {
        weightedTotal,
        grade: 'D',
        gradePoint: 1.0,
        passed: true,
        reason: 'ต่ำกว่า MPL (เกณฑ์ผ่อนผัน 8 ระดับ)',
      };
    }
  }

  return {
    weightedTotal,
    grade: 'F',
    gradePoint: 0,
    passed: false,
    reason: `คะแนนรวมต่ำกว่าจุดตัด MPL (${config.mplPercent}%)`,
  };
}
