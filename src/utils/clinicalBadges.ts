import {
  AcademicYearLevel,
  BedsideCheckInRecord,
  ClinicalMilestoneBadge,
  ClinicalSkillMasteryItem,
  ConferenceEvent,
  DutyShift,
  EpaMilestone,
  LogbookEntry,
  ProcedureQuota,
  StudentCourseScore,
} from '../types/medicalSchool';

export interface ActiveStudentBadgeInputs {
  epas: EpaMilestone[];
  quotas: ProcedureQuota[];
  clinicalSkills: ClinicalSkillMasteryItem[];
  conferences: ConferenceEvent[];
  shifts: DutyShift[];
  bedsideCheckIns: BedsideCheckInRecord[];
  logbookEntries: LogbookEntry[];
  studentName: string;
}

export function computeActiveStudentBadges(
  inputs: ActiveStudentBadgeInputs
): ClinicalMilestoneBadge[] {
  const {
    epas,
    quotas,
    clinicalSkills,
    conferences,
    shifts,
    bedsideCheckIns,
    logbookEntries,
    studentName,
  } = inputs;

  const epaLevel4Count = epas.filter((e) => e.currentLevel >= 4).length;
  const epaTargetMetCount = epas.filter((e) => e.currentLevel >= e.targetLevel).length;
  const epaTotalCount = Math.max(1, epas.length);

  const completedQuotasCount = quotas.filter((q) => q.completed >= q.target).length;
  const validatedSkillsCount = clinicalSkills.filter((s) => s.facultyValidated).length;

  const checkedInConfs = conferences.filter((c) => c.checkedIn).length;
  const checkedInShifts = shifts.filter(
    (s) => Boolean(s.checkedInAt) && s.assignedStudent === studentName
  ).length;
  const bedsideCount = bedsideCheckIns.length;
  const bedsideWithReflectionCount = bedsideCheckIns.filter(
    (b) => Boolean(b.reflectionNote && b.reflectionNote.trim().length > 0)
  ).length;
  const approvedLogbookCount = logbookEntries.filter(
    (l) => l.status === 'approved'
  ).length;

  const activeParticipationPoints =
    checkedInConfs + checkedInShifts + bedsideCount + approvedLogbookCount;

  const leaderPoints =
    Math.min(2, checkedInConfs) + Math.min(2, bedsideWithReflectionCount);

  return [
    {
      id: 'badge-epa-entrustable',
      title: 'สมรรถนะคลินิกขั้นอิสระภายใต้การกำกับ (EPA Level 4+)',
      shortTitle: 'EPA Level 4+ Achiever',
      category: 'สมรรถนะ EPA',
      description:
        'ได้รับการประเมินสมรรถนะวิชาชีพ (EPA) ถึงระดับ 4 ขึ้นไปอย่างน้อย 3 สมรรถนะหลัก',
      criteriaText: 'EPA ระดับ 4+ ≥ 3 ด้าน',
      earned: epaLevel4Count >= 3,
      progressCurrent: Math.min(3, epaLevel4Count),
      progressTarget: 3,
      progressUnit: 'สมรรถนะ',
      tier: 'navy',
      iconKey: 'shield',
    },
    {
      id: 'badge-epa-all-targets',
      title: 'บรรลุเป้าหมาย EPA ครบทุกด้าน (Full EPA Milestone)',
      shortTitle: 'All-EPA Target Master',
      category: 'สมรรถนะ EPA',
      description:
        'ผ่านระดับความไว้วางใจเป้าหมาย (Target Level) ครบทุกด้านตามเกณฑ์ชั้นคลินิก',
      criteriaText: `EPA ถึงเป้าหมาย ${epaTotalCount}/${epaTotalCount} ด้าน`,
      earned: epaTargetMetCount >= epaTotalCount,
      progressCurrent: epaTargetMetCount,
      progressTarget: epaTotalCount,
      progressUnit: 'ด้าน',
      tier: 'gold',
      iconKey: 'award',
    },
    {
      id: 'badge-proc-core',
      title: 'ผู้ชำนาญหัตถการพื้นฐานคลินิก (Core Procedure Qualifier)',
      shortTitle: 'Core Procedure Qualifier',
      category: 'หัตถการคลินิก',
      description:
        'ทำหัตถการครบตามโควตา ≥ 2 รายการ และผ่านการลงนามรับรองความชำนาญโดยอาจารย์ ≥ 4 หัตถการ',
      criteriaText: 'โควตาครบ ≥ 2 รายการ · รับรอง ≥ 4 หัตถการ',
      earned: completedQuotasCount >= 2 && validatedSkillsCount >= 4,
      progressCurrent: Math.min(2, completedQuotasCount) + Math.min(4, validatedSkillsCount),
      progressTarget: 6,
      progressUnit: 'เกณฑ์',
      tier: 'teal',
      iconKey: 'stethoscope',
    },
    {
      id: 'badge-proc-mastery',
      title: 'เกียรติคุณทักษะหัตถการครบวงจร (Procedure Mastery)',
      shortTitle: 'Clinical Skill Mastery',
      category: 'หัตถการคลินิก',
      description:
        'ทำหัตถการครบโควตา ≥ 5 รายการ และผ่านลายเซ็นรับรองจากอาจารย์ ≥ 8 หัตถการ',
      criteriaText: 'โควตาครบ ≥ 5 รายการ · รับรอง ≥ 8 หัตถการ',
      earned: completedQuotasCount >= 5 && validatedSkillsCount >= 8,
      progressCurrent: Math.min(5, completedQuotasCount) + Math.min(8, validatedSkillsCount),
      progressTarget: 13,
      progressUnit: 'เกณฑ์',
      tier: 'gold',
      iconKey: 'clipboard',
    },
    {
      id: 'badge-active-ward',
      title: 'ปฏิบัติงานหอผู้ป่วยและเคสข้างเตียงดีเด่น (Active Ward Participant)',
      shortTitle: 'Active Ward Participant',
      category: 'การมีส่วนร่วมทางคลินิก',
      description:
        'มีส่วนร่วมในกิจกรรมวิชาการ เวรปฏิบัติงาน สแกนข้างเตียง และ E-Logbook ที่รับรองแล้วรวม ≥ 4 ครั้ง',
      criteriaText: 'กิจกรรมคลินิกรับรอง ≥ 4 ครั้ง',
      earned: activeParticipationPoints >= 4,
      progressCurrent: Math.min(4, activeParticipationPoints),
      progressTarget: 4,
      progressUnit: 'ครั้ง',
      tier: 'teal',
      iconKey: 'users',
    },
    {
      id: 'badge-reflection-leader',
      title: 'ผู้นำการเรียนรู้ทางคลินิก (Conference & Reflection Leader)',
      shortTitle: 'Conference & Reflection',
      category: 'การมีส่วนร่วมทางคลินิก',
      description:
        'ลงชื่อประชุมวิชาการ (Morning Report / Grand Round) ≥ 2 ครั้ง และบันทึก Reflection ข้างเตียง ≥ 2 เคส',
      criteriaText: 'ประชุมวิชาการ ≥ 2 · Reflection ≥ 2',
      earned: checkedInConfs >= 2 && bedsideWithReflectionCount >= 2,
      progressCurrent: leaderPoints,
      progressTarget: 4,
      progressUnit: 'กิจกรรม',
      tier: 'navy',
      iconKey: 'sparkles',
    },
  ];
}

export function computePeerCohortBadges(params: {
  studentId: string;
  yearLevel: AcademicYearLevel;
  scores: StudentCourseScore[];
  activeStudentId: string;
  activeBadges: ClinicalMilestoneBadge[];
}): ClinicalMilestoneBadge[] {
  const { studentId, yearLevel, scores, activeStudentId, activeBadges } = params;

  if (studentId === activeStudentId) {
    return activeBadges;
  }

  const studentScores = scores.filter((s) => s.studentId === studentId);
  const avgOsce =
    studentScores.length > 0
      ? studentScores.reduce((sum, s) => sum + (s.osce ?? 0), 0) / studentScores.length
      : yearLevel === '6'
        ? 82
        : yearLevel === '5'
          ? 76
          : 72;
  const zeroAbsences =
    studentScores.length > 0
      ? studentScores.every((s) => s.absenceDays === 0)
      : Number(studentId.slice(-1)) % 2 === 0;
  const highAttitude =
    studentScores.length > 0
      ? studentScores.every((s) => s.attitudeGatePassed && (s.formE ?? 0) >= 85)
      : yearLevel !== '4';

  const earnedEpa4 = yearLevel === '6' || (yearLevel === '5' && avgOsce >= 74);
  const earnedCoreProc = yearLevel === '6' || (yearLevel === '5' && highAttitude);
  const earnedActiveWard = zeroAbsences || yearLevel === '6';
  const earnedReflection = yearLevel === '6' && avgOsce >= 84;

  return [
    {
      ...activeBadges[0],
      earned: earnedEpa4,
      progressCurrent: earnedEpa4 ? 3 : yearLevel === '5' ? 2 : 1,
    },
    {
      ...activeBadges[2],
      earned: earnedCoreProc,
      progressCurrent: earnedCoreProc ? 6 : 3,
    },
    {
      ...activeBadges[4],
      earned: earnedActiveWard,
      progressCurrent: earnedActiveWard ? 4 : 2,
    },
    {
      ...activeBadges[5],
      earned: earnedReflection,
      progressCurrent: earnedReflection ? 4 : 2,
    },
  ];
}
