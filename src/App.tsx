import { useEffect, useMemo, useState } from 'react';
import {
  ActiveTab,
  Announcement,
  AuthUserProfile,
  BedsideCheckInRecord,
  ClinicalReferenceMaterial,
  ClinicalSkillMasteryItem,
  ConferenceEvent,
  CourseGradingConfig,
  DutyShift,
  EpaMilestone,
  FacultyFormSubmission,
  LearningStreakState,
  LeaveRequest,
  LogbookEntry,
  LogbookStatus,
  OsceEvaluationRecord,
  PeerReviewComment,
  PeerReviewEntry,
  PeerReviewFeedbackInput,
  PreceptorFeedback,
  ProcedureQuota,
  QuizCompletionRecord,
  ReferenceCheckoutRecord,
  ResearchProject,
  RoomBooking,
  SbarHandoffRecord,
  StudentCourseScore,
  StudentPhotoMap,
  UserRole,
  WelfareRequest,
} from './types/medicalSchool';
import {
  CLINICAL_DEPARTMENTS,
  CLINICAL_ROOMS,
  COHORT_STUDENTS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_APPROVED_PEER_REVIEW_DOMAINS,
  INITIAL_BEDSIDE_CHECKINS,
  INITIAL_CLINICAL_SKILLS_MASTERY,
  INITIAL_CONFERENCES,
  INITIAL_COURSE_GRADES,
  INITIAL_COURSE_GRADING_CONFIGS,
  INITIAL_DUTY_SHIFTS,
  INITIAL_EPA_MILESTONES,
  INITIAL_FACULTY_SUBMISSIONS,
  INITIAL_LEAVE_REQUESTS,
  INITIAL_LOGBOOK_ENTRIES,
  INITIAL_OSCE_EVALUATIONS,
  INITIAL_OSCE_EXAMS,
  INITIAL_PEER_REVIEW_ENTRIES,
  INITIAL_PRECEPTOR_FEEDBACKS,
  INITIAL_PROCEDURE_QUOTAS,
  INITIAL_REFERENCE_CHECKOUTS,
  INITIAL_REFERENCE_MATERIALS,
  INITIAL_RESEARCH_PROJECTS,
  INITIAL_ROOM_BOOKINGS,
  INITIAL_STUDENT_PHOTOS,
  INITIAL_STUDENT_SCORES,
  INITIAL_WELFARE_REQUESTS,
  ROOM_TIME_SLOTS,
  SURIN_CPG_PROTOCOLS,
} from './data/initialMedicalData';
import { createDefaultEnabledItemsMap } from './data/evaluationFormsSchema';
import { recomputeRowScoresWithConfig } from './utils/gradeEvaluation';
import { Header } from './components/Header';
import { WorkspaceBar } from './components/WorkspaceBar';
import { OverviewSection } from './components/OverviewSection';
import { CurriculumRosterSection } from './components/CurriculumRosterSection';
import { LogbookSection } from './components/LogbookSection';
import { AssessmentSection } from './components/AssessmentSection';
import { LibraryResearchSection } from './components/LibraryResearchSection';
import { LogbookModal } from './components/LogbookModal';
import { QuickSearchModal } from './components/QuickSearchModal';
import { StudentDirectoryModal } from './components/StudentDirectoryModal';
import { AuthPortalModal } from './components/AuthPortalModal';
import {
  GoogleSheetsSyncModal,
  PortalSyncPayload,
} from './components/GoogleSheetsSyncModal';
import {
  BedsideQrPayload,
  BedsideReflectionInput,
  QrCheckInResult,
  WardQrPayload,
} from './components/WardQrScannerModal';
import { Footer } from './components/Footer';
import { MobileBottomNav } from './components/MobileBottomNav';
import { OfflineBanner } from './components/OfflineBanner';
import { computeActiveStudentBadges } from './utils/clinicalBadges';

const STORAGE_KEY = 'surin_mec_portal_v1';

function loadSavedState<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return (parsed[key] as T) ?? fallback;
  } catch {
    return fallback;
  }
}

function getBangkokDateKey(timestamp = Date.now()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(timestamp));
}

function buildInitialLearningStreak(): LearningStreakState {
  const yesterday = getBangkokDateKey(Date.now() - 86_400_000);
  const twoDaysAgo = getBangkokDateKey(Date.now() - 2 * 86_400_000);
  const threeDaysAgo = getBangkokDateKey(Date.now() - 3 * 86_400_000);

  return {
    totalPoints: 120,
    currentStreakDays: 3,
    bestStreakDays: 3,
    lastCompletedDate: yesterday,
    completedDates: [threeDaysAgo, twoDaysAgo, yesterday],
    recentHistory: [
      {
        id: 'quiz-seed-1',
        dateKey: yesterday,
        department: 'กลุ่มงานอายุรศาสตร์',
        score: 3,
        total: 3,
        pointsEarned: 60,
        isDailyStreakAwarded: true,
        completedAt: 'เมื่อวาน · 18:15 น.',
      },
      {
        id: 'quiz-seed-2',
        dateKey: twoDaysAgo,
        department: 'กลุ่มงานเวชศาสตร์ฉุกเฉิน',
        score: 2,
        total: 3,
        pointsEarned: 40,
        isDailyStreakAwarded: true,
        completedAt: '2 วันก่อน · 17:40 น.',
      },
    ],
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [role, setRole] = useState<UserRole>('student');
  // Session token stays strictly in React memory (never persisted to localStorage)
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<AuthUserProfile | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'manage' | 'password'>('login');

  const [logbookModalOpen, setLogbookModalOpen] = useState(false);
  const [directoryModalOpen, setDirectoryModalOpen] = useState(false);
  const [quickSearchOpen, setQuickSearchOpen] = useState(false);
  const [sheetsSyncModalOpen, setSheetsSyncModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [conferences, setConferences] = useState<ConferenceEvent[]>(() =>
    loadSavedState('conferences', INITIAL_CONFERENCES)
  );
  const [announcements, setAnnouncements] = useState<Announcement[]>(() =>
    loadSavedState('announcements', INITIAL_ANNOUNCEMENTS)
  );
  const [shifts, setShifts] = useState<DutyShift[]>(() => {
    const saved = loadSavedState<DutyShift[]>('shifts', INITIAL_DUTY_SHIFTS);
    const hasIsoDates = saved.some((s) => Boolean(s.isoDate));
    if (hasIsoDates) return saved;
    const savedById = new Map(saved.map((s) => [s.id, s]));
    return INITIAL_DUTY_SHIFTS.map((base) => {
      const prev = savedById.get(base.id);
      if (!prev) return base;
      return {
        ...base,
        checkedInAt: prev.checkedInAt ?? base.checkedInAt,
        swapStatus: prev.swapStatus ?? base.swapStatus,
        swapNote: prev.swapNote ?? base.swapNote,
      };
    });
  });
  const [logbookEntries, setLogbookEntries] = useState<LogbookEntry[]>(() =>
    loadSavedState('logbookEntries', INITIAL_LOGBOOK_ENTRIES)
  );
  const [quotas, setQuotas] = useState<ProcedureQuota[]>(() =>
    loadSavedState('quotas', INITIAL_PROCEDURE_QUOTAS)
  );
  const [epas, setEpas] = useState<EpaMilestone[]>(() =>
    loadSavedState('epas', INITIAL_EPA_MILESTONES)
  );
  const [evaluations, setEvaluations] = useState<OsceEvaluationRecord[]>(() =>
    loadSavedState('evaluations', INITIAL_OSCE_EVALUATIONS)
  );
  const [researchProjects, setResearchProjects] = useState<ResearchProject[]>(() => {
    const saved = loadSavedState<ResearchProject[]>(
      'researchProjects',
      INITIAL_RESEARCH_PROJECTS
    );
    const savedIds = new Set(saved.map((p) => p.id));
    const missingSeeds = INITIAL_RESEARCH_PROJECTS.filter((p) => !savedIds.has(p.id));
    return [...saved, ...missingSeeds];
  });
  const [welfareRequests, setWelfareRequests] = useState<WelfareRequest[]>(() =>
    loadSavedState('welfareRequests', INITIAL_WELFARE_REQUESTS)
  );
  const [gradingConfigs, setGradingConfigs] = useState<CourseGradingConfig[]>(() => {
    const saved = loadSavedState<CourseGradingConfig[]>(
      'gradingConfigs',
      INITIAL_COURSE_GRADING_CONFIGS
    );
    const baseByCode = new Map(
      INITIAL_COURSE_GRADING_CONFIGS.map((c) => [c.courseCode, c])
    );
    return saved.map((cfg) => {
      const base = baseByCode.get(cfg.courseCode);
      const fallbackItems = createDefaultEnabledItemsMap();
      return {
        ...cfg,
        enabledForms:
          Array.isArray(cfg.enabledForms) && cfg.enabledForms.length > 0
            ? cfg.enabledForms
            : (base?.enabledForms ?? ['form_a', 'form_b', 'form_c', 'form_e']),
        enabledItems: cfg.enabledItems
          ? { ...fallbackItems, ...(base?.enabledItems ?? {}), ...cfg.enabledItems }
          : (base?.enabledItems ?? fallbackItems),
        customItems: cfg.customItems ?? {},
        itemGradeMapping: cfg.itemGradeMapping ?? {},
        customGradeGroups: Array.isArray(cfg.customGradeGroups)
          ? cfg.customGradeGroups
          : [],
        subrotations:
          Array.isArray(cfg.subrotations) && cfg.subrotations.length > 0
            ? cfg.subrotations
            : (base?.subrotations ?? ['OPD / หอผู้ป่วยสามัญ']),
      };
    });
  });
  const [studentScores, setStudentScores] = useState<StudentCourseScore[]>(() =>
    loadSavedState('studentScores', INITIAL_STUDENT_SCORES)
  );
  const [facultySubmissions, setFacultySubmissions] = useState<FacultyFormSubmission[]>(() => {
    const saved = loadSavedState<FacultyFormSubmission[]>(
      'facultySubmissions',
      INITIAL_FACULTY_SUBMISSIONS
    );
    const baseById = new Map(INITIAL_FACULTY_SUBMISSIONS.map((f) => [f.id, f]));
    return saved.map((sub) => {
      const base = baseById.get(sub.id);
      return {
        ...sub,
        wardOrSubrotation:
          sub.wardOrSubrotation || base?.wardOrSubrotation || 'OPD / หอผู้ป่วยใน',
        rotationStartDate:
          sub.rotationStartDate || base?.rotationStartDate || '2026-11-02',
        rotationEndDate:
          sub.rotationEndDate || base?.rotationEndDate || '2026-11-29',
      };
    });
  });
  const [studentPhotos, setStudentPhotos] = useState<StudentPhotoMap>(() =>
    loadSavedState('studentPhotos', INITIAL_STUDENT_PHOTOS)
  );
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() =>
    loadSavedState('leaveRequests', INITIAL_LEAVE_REQUESTS)
  );
  const [preceptorFeedbacks, setPreceptorFeedbacks] = useState<PreceptorFeedback[]>(() =>
    loadSavedState('preceptorFeedbacks', INITIAL_PRECEPTOR_FEEDBACKS)
  );
  const [clinicalSkills, setClinicalSkills] = useState<ClinicalSkillMasteryItem[]>(() => {
    const saved = loadSavedState<ClinicalSkillMasteryItem[]>(
      'clinicalSkills',
      INITIAL_CLINICAL_SKILLS_MASTERY
    );
    const savedIds = new Set(saved.map((item) => item.id));
    const missingSeeds = INITIAL_CLINICAL_SKILLS_MASTERY.filter(
      (item) => !savedIds.has(item.id)
    );
    return [...saved, ...missingSeeds];
  });
  const [roomBookings, setRoomBookings] = useState<RoomBooking[]>(() => {
    const saved = loadSavedState<RoomBooking[]>('roomBookings', INITIAL_ROOM_BOOKINGS);
    const savedIds = new Set(saved.map((b) => b.id));
    const missingSeeds = INITIAL_ROOM_BOOKINGS.filter((b) => !savedIds.has(b.id));
    return [...saved, ...missingSeeds];
  });
  const [referenceMaterials, setReferenceMaterials] = useState<ClinicalReferenceMaterial[]>(
    () => {
      const saved = loadSavedState<ClinicalReferenceMaterial[]>(
        'referenceMaterials',
        INITIAL_REFERENCE_MATERIALS
      );
      const savedIds = new Set(saved.map((m) => m.id));
      const missingSeeds = INITIAL_REFERENCE_MATERIALS.filter(
        (m) => !savedIds.has(m.id)
      );
      return [...saved, ...missingSeeds];
    }
  );
  const [referenceCheckouts, setReferenceCheckouts] = useState<ReferenceCheckoutRecord[]>(
    () => {
      const saved = loadSavedState<ReferenceCheckoutRecord[]>(
        'referenceCheckouts',
        INITIAL_REFERENCE_CHECKOUTS
      );
      const savedIds = new Set(saved.map((c) => c.id));
      const missingSeeds = INITIAL_REFERENCE_CHECKOUTS.filter(
        (c) => !savedIds.has(c.id)
      );
      return [...saved, ...missingSeeds];
    }
  );
  const [bedsideCheckIns, setBedsideCheckIns] = useState<BedsideCheckInRecord[]>(() => {
    const saved = loadSavedState<BedsideCheckInRecord[]>(
      'bedsideCheckIns',
      INITIAL_BEDSIDE_CHECKINS
    );
    const seedById = new Map(INITIAL_BEDSIDE_CHECKINS.map((b) => [b.id, b]));
    const hydrated = saved.map((rec) => {
      const seed = seedById.get(rec.id);
      if (!seed) return rec;
      return {
        ...rec,
        roundingNote: rec.roundingNote ?? seed.roundingNote,
        roundingKeyVitalsOrLabs: rec.roundingKeyVitalsOrLabs ?? seed.roundingKeyVitalsOrLabs,
        roundingTodo: rec.roundingTodo ?? seed.roundingTodo,
        roundingPriority: rec.roundingPriority ?? seed.roundingPriority,
        roundingUpdatedAt: rec.roundingUpdatedAt ?? seed.roundingUpdatedAt,
        sbarHandoff: rec.sbarHandoff ?? seed.sbarHandoff,
      };
    });
    const savedIds = new Set(hydrated.map((b) => b.id));
    const missingSeeds = INITIAL_BEDSIDE_CHECKINS.filter((b) => !savedIds.has(b.id));
    return [...hydrated, ...missingSeeds];
  });
  const [learningStreak, setLearningStreak] = useState<LearningStreakState>(() =>
    loadSavedState<LearningStreakState>('learningStreak', buildInitialLearningStreak())
  );
  const [approvedPeerReviewDomains, setApprovedPeerReviewDomains] = useState<string[]>(
    () =>
      loadSavedState<string[]>(
        'approvedPeerReviewDomains',
        INITIAL_APPROVED_PEER_REVIEW_DOMAINS
      )
  );
  const [peerReviewEntries, setPeerReviewEntries] = useState<PeerReviewEntry[]>(() => {
    const saved = loadSavedState<PeerReviewEntry[]>(
      'peerReviewEntries',
      INITIAL_PEER_REVIEW_ENTRIES
    );
    const savedIds = new Set(saved.map((item) => item.id));
    const missingSeeds = INITIAL_PEER_REVIEW_ENTRIES.filter(
      (item) => !savedIds.has(item.id)
    );
    return [...saved, ...missingSeeds];
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          conferences,
          announcements,
          shifts,
          logbookEntries,
          quotas,
          epas,
          evaluations,
          researchProjects,
          welfareRequests,
          gradingConfigs,
          studentScores,
          facultySubmissions,
          studentPhotos,
          leaveRequests,
          preceptorFeedbacks,
          clinicalSkills,
          roomBookings,
          referenceMaterials,
          referenceCheckouts,
          bedsideCheckIns,
          learningStreak,
          approvedPeerReviewDomains,
          peerReviewEntries,
        })
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [
    conferences,
    announcements,
    shifts,
    logbookEntries,
    quotas,
    epas,
    evaluations,
    researchProjects,
    welfareRequests,
    gradingConfigs,
    studentScores,
    facultySubmissions,
    studentPhotos,
    leaveRequests,
    preceptorFeedbacks,
    clinicalSkills,
    roomBookings,
    referenceMaterials,
    referenceCheckouts,
    bedsideCheckIns,
    learningStreak,
    approvedPeerReviewDomains,
    peerReviewEntries,
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const activeRole: UserRole = authUser ? authUser.role : role;
  const activeStudentId = authUser?.studentId ?? '64104218';
  const activeStudentName =
    authUser?.role === 'student'
      ? authUser.displayName
      : (COHORT_STUDENTS.find((s) => s.studentId === activeStudentId)?.studentName ??
        'นศพ.ธนภัทร ศรีสุรินทร์');
  const authenticatedDisplayName = authUser?.displayName;
  const assignedCourseCodes = authUser?.assignedCourseCodes;

  const handleOpenAuthModal = (tab: 'login' | 'manage' | 'password') => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  };

  const handleAuthenticated = (token: string, user: AuthUserProfile) => {
    setAuthToken(token);
    setAuthUser(user);
    setRole(user.role);
    showToast(`เข้าสู่ระบบในนาม ${user.displayName} (@${user.username}) สำเร็จ`);
  };

  const handleLogout = async () => {
    if (authToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
        });
      } catch {
        // Ignore transient network errors on logout
      }
    }
    setAuthToken(null);
    setAuthUser(null);
    showToast('ออกจากระบบเรียบร้อยแล้ว');
  };

  const handleToggleConferenceCheckIn = (id: string) => {
    setConferences((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const nextChecked = !c.checkedIn;
        showToast(
          nextChecked
            ? `ลงชื่อเข้าร่วม ${c.type} เรียบร้อยแล้ว`
            : `ยกเลิกการลงชื่อ ${c.type}`
        );
        return {
          ...c,
          checkedIn: nextChecked,
          attendeeCount: nextChecked ? c.attendeeCount + 1 : Math.max(0, c.attendeeCount - 1),
        };
      })
    );
  };

  const handleAddAnnouncement = (ann: Omit<Announcement, 'id' | 'date'>) => {
    const newItem: Announcement = {
      ...ann,
      id: `ann-${Date.now()}`,
      date: '24 พ.ย. 2569',
    };
    setAnnouncements((prev) => [newItem, ...prev]);
    showToast('เผยแพร่ประกาศศูนย์แพทยฯ เรียบร้อยแล้ว');
  };

  const handleCheckInShift = (shiftId: string) => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')} น.`;
    setShifts((prev) =>
      prev.map((s) =>
        s.id === shiftId ? { ...s, checkedInAt: timeStr, checkInMethod: 'manual' } : s
      )
    );
    showToast(`บันทึกเวลาขึ้นเวรหอผู้ป่วย (${timeStr}) เรียบร้อยแล้ว`);
  };

  const handleQrCheckIn = (payload: WardQrPayload): QrCheckInResult => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')} น.`;

    const matchedShift =
      (payload.shiftId
        ? shifts.find((s) => s.id === payload.shiftId && !s.checkedInAt)
        : undefined) ??
      shifts.find(
        (s) =>
          !s.checkedInAt &&
          s.assignedStudent === activeStudentName &&
          (s.wardOrUnit === payload.wardOrUnit || s.department === payload.department)
      ) ??
      shifts.find(
        (s) =>
          !s.checkedInAt &&
          (s.wardOrUnit === payload.wardOrUnit || s.department === payload.department)
      );

    if (matchedShift) {
      const updatedShift: DutyShift = {
        ...matchedShift,
        checkedInAt: timeStr,
        checkInMethod: 'qr_scan',
        checkInWardCode: payload.wardCode,
      };
      setShifts((prev) =>
        prev.map((s) => (s.id === matchedShift.id ? updatedShift : s))
      );
      showToast(
        `สแกน QR ลงเวลาเข้า ${payload.wardOrUnit} (${timeStr}) เรียบร้อยแล้ว`
      );
      return {
        shift: updatedShift,
        matchedExisting: true,
        wardCode: payload.wardCode,
      };
    }

    const activeStudent = COHORT_STUDENTS.find(
      (s) => s.studentId === activeStudentId
    );
    const deptMeta = CLINICAL_DEPARTMENTS.find(
      (d) => d.nameTh === payload.department
    );
    const thaiMonths = [
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
    const thaiDays = [
      'อาทิตย์',
      'จันทร์',
      'อังคาร',
      'พุธ',
      'พฤหัสบดี',
      'ศุกร์',
      'เสาร์',
    ];
    const isoDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(now.getDate()).padStart(2, '0')}`;
    const thaiDate = `${now.getDate()} ${thaiMonths[now.getMonth()]} ${
      now.getFullYear() + 543
    }`;

    const newShift: DutyShift = {
      id: `shift-qr-${Date.now()}`,
      isoDate,
      date: thaiDate,
      dayLabel: thaiDays[now.getDay()],
      department: payload.department,
      wardOrUnit: payload.wardOrUnit,
      shiftType: 'ลงเวลาปฏิบัติงานด้วย QR Code',
      timeRange: `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')} - 16:00`,
      assignedStudent: activeStudentName,
      studentYear: activeStudent?.yearLevel ?? '6',
      supervisingStaff: deptMeta?.headPreceptor ?? 'อาจารย์แพทย์ประจำหอผู้ป่วย',
      checkedInAt: timeStr,
      checkInMethod: 'qr_scan',
      checkInWardCode: payload.wardCode,
      swapStatus: 'none',
    };

    setShifts((prev) => [newShift, ...prev]);
    showToast(
      `สแกน QR บันทึกการมาถึง ${payload.wardOrUnit} (${timeStr}) เรียบร้อยแล้ว`
    );
    return {
      shift: newShift,
      matchedExisting: false,
      wardCode: payload.wardCode,
    };
  };

  const handleBedsideQrCheckIn = (
    payload: BedsideQrPayload
  ): BedsideCheckInRecord => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')} น.`;
    const newRecord: BedsideCheckInRecord = {
      id: `bed-chk-${Date.now()}`,
      bedsideCode: payload.bedsideCode,
      scanKind: payload.scanKind,
      department: payload.department,
      wardOrUnit: payload.wardOrUnit,
      bedOrRoom: payload.bedOrRoom,
      caseCode: payload.caseCode,
      patientSummary: payload.patientSummary,
      diagnosis: payload.diagnosis,
      icd10: payload.icd10,
      supervisingStaff: payload.supervisingStaff,
      studentName: activeStudentName,
      checkedInAt: timeStr,
      checkedInDate: '24 พ.ย. 2569',
      roleInEncounter: payload.scanKind === 'ward_round' ? 'Observe' : 'Assist',
    };
    setBedsideCheckIns((prev) => [newRecord, ...prev]);
    showToast(
      `สแกน QR เข้าเคส ${payload.caseCode} (${payload.bedOrRoom}) เวลา ${timeStr} แล้ว`
    );
    return newRecord;
  };

  const handleSaveBedsideReflection = (
    recordId: string,
    input: BedsideReflectionInput
  ) => {
    const target = bedsideCheckIns.find((r) => r.id === recordId);
    if (!target) return;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')} น.`;

    let syncedLogbookId = target.syncedToLogbookId;
    if (input.syncToLogbook && !syncedLogbookId) {
      syncedLogbookId = `log-bed-${Date.now()}`;
      const newLogEntry: LogbookEntry = {
        id: syncedLogbookId,
        date: target.checkedInDate,
        department: target.department,
        setting: target.wardOrUnit.includes('ER')
          ? 'ER'
          : target.wardOrUnit.includes('คลอด')
            ? 'LR'
            : 'IPD',
        caseCode: target.caseCode,
        patientSummary: target.patientSummary,
        icd10: target.icd10,
        diagnosis: target.diagnosis,
        procedure:
          input.clinicalTakeaway ||
          (target.scanKind === 'ward_round'
            ? 'Bedside Ward Round Case Discussion'
            : 'Bedside History & Physical Examination'),
        role: input.roleInEncounter,
        preceptor: target.supervisingStaff,
        reflection: input.reflectionNote,
        status: 'pending',
      };
      setLogbookEntries((prev) => [newLogEntry, ...prev]);
    }

    setBedsideCheckIns((prev) =>
      prev.map((rec) =>
        rec.id === recordId
          ? {
              ...rec,
              roleInEncounter: input.roleInEncounter,
              clinicalTakeaway: input.clinicalTakeaway || undefined,
              reflectionNote: input.reflectionNote,
              reflectionSavedAt: timeStr,
              syncedToLogbookId: syncedLogbookId,
            }
          : rec
      )
    );

    showToast(
      input.syncToLogbook && !target.syncedToLogbookId
        ? 'บันทึก Clinical Reflection และส่งเข้า E-Logbook เรียบร้อยแล้ว'
        : 'บันทึก Clinical Reflection / Case Note เรียบร้อยแล้ว'
    );
  };

  const handleSaveBedsideRoundingNote = (
    recordId: string,
    payload: {
      roundingNote: string;
      roundingKeyVitalsOrLabs?: string;
      roundingTodo?: string;
      roundingPriority: 'normal' | 'watch';
    }
  ) => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')} น.`;

    setBedsideCheckIns((prev) =>
      prev.map((rec) =>
        rec.id === recordId
          ? {
              ...rec,
              roundingNote: payload.roundingNote.trim() || undefined,
              roundingKeyVitalsOrLabs: payload.roundingKeyVitalsOrLabs?.trim() || undefined,
              roundingTodo: payload.roundingTodo?.trim() || undefined,
              roundingPriority: payload.roundingPriority,
              roundingUpdatedAt: payload.roundingNote.trim() || payload.roundingKeyVitalsOrLabs?.trim() || payload.roundingTodo?.trim()
                ? timeStr
                : undefined,
            }
          : rec
      )
    );

    showToast(
      payload.roundingNote.trim() || payload.roundingKeyVitalsOrLabs?.trim() || payload.roundingTodo?.trim()
        ? 'บันทึก Patient Rounding Note ส่วนตัวเรียบร้อยแล้ว'
        : 'ล้างบันทึก Rounding Note สำหรับเคสนี้แล้ว'
    );
  };

  const handleSaveBedsideSbarHandoff = (
    recordId: string,
    payload: Omit<SbarHandoffRecord, 'savedAt'>
  ) => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')} น.`;

    setBedsideCheckIns((prev) =>
      prev.map((rec) =>
        rec.id === recordId
          ? {
              ...rec,
              sbarHandoff: {
                ...payload,
                savedAt: timeStr,
              },
            }
          : rec
      )
    );

    showToast('บันทึกแบบฟอร์มส่งเวรมาตรฐาน SBAR ลงประวัติเคสเรียบร้อยแล้ว');
  };

  const handleRequestSwap = (shiftId: string, note: string) => {
    setShifts((prev) =>
      prev.map((s) =>
        s.id === shiftId ? { ...s, swapStatus: 'requested', swapNote: note } : s
      )
    );
    showToast('ส่งคำขอแลกเวรให้อาจารย์และฝ่ายวิชาการพิจารณาแล้ว');
  };

  const handleApproveSwap = (shiftId: string) => {
    setShifts((prev) =>
      prev.map((s) => (s.id === shiftId ? { ...s, swapStatus: 'approved' } : s))
    );
    showToast('อนุมัติคำขอแลกเวรเรียบร้อยแล้ว');
  };

  const handleAddLogbookEntry = (entry: Omit<LogbookEntry, 'id' | 'status'>) => {
    const newEntry: LogbookEntry = {
      ...entry,
      id: `log-${Date.now()}`,
      status: 'pending',
    };
    setLogbookEntries((prev) => [newEntry, ...prev]);
    setQuotas((prev) =>
      prev.map((q) =>
        q.name === entry.procedure ? { ...q, completed: q.completed + 1 } : q
      )
    );
    setActiveTab('logbook');
    showToast('บันทึกเคสเข้าสู่ E-Logbook และส่งให้อาจารย์รับรองแล้ว');
  };

  const handleUpdateLogbookStatus = (
    id: string,
    status: LogbookStatus,
    feedback?: string
  ) => {
    setLogbookEntries((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status, feedback } : item))
    );
    showToast(
      status === 'approved'
        ? 'รับรองรายการ E-Logbook เรียบร้อยแล้ว'
        : 'ส่งรายการกลับให้นักศึกษาแก้ไขเพิ่มเติมแล้ว'
    );
  };

  const handleSubmitPeerReview = (
    entryId: string,
    feedback: PeerReviewFeedbackInput
  ) => {
    const targetEntry = peerReviewEntries.find((e) => e.id === entryId);
    if (!targetEntry || !approvedPeerReviewDomains.includes(targetEntry.department)) {
      showToast('ไม่สามารถส่ง Peer-Review นอกกลุ่มงานคลินิกที่ได้รับอนุมัติได้');
      return;
    }

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')} น.`;

    const newComment: PeerReviewComment = {
      id: `prc-${Date.now()}`,
      reviewerAlias: 'เพื่อนร่วมรุ่น (ไม่ระบุตัวตน)',
      submittedAt: `24 พ.ย. 2569 · ${timeStr}`,
      clinicalReasoningScore: feedback.clinicalReasoningScore,
      reflectionDepthScore: feedback.reflectionDepthScore,
      strengths: feedback.strengths,
      suggestions: feedback.suggestions,
      helpfulCount: 0,
      markedHelpfulByMe: false,
    };

    setPeerReviewEntries((prev) =>
      prev.map((item) =>
        item.id === entryId
          ? { ...item, reviews: [newComment, ...item.reviews] }
          : item
      )
    );
    showToast(
      `ส่งความเห็น Peer-Review แบบไม่ระบุตัวตนสำหรับ ${targetEntry.anonymizedPeerCode} เรียบร้อยแล้ว`
    );
  };

  const handleTogglePeerReviewHelpful = (entryId: string, commentId: string) => {
    setPeerReviewEntries((prev) =>
      prev.map((entry) => {
        if (entry.id !== entryId) return entry;
        return {
          ...entry,
          reviews: entry.reviews.map((rev) => {
            if (rev.id !== commentId) return rev;
            const nextMarked = !rev.markedHelpfulByMe;
            return {
              ...rev,
              markedHelpfulByMe: nextMarked,
              helpfulCount: nextMarked
                ? rev.helpfulCount + 1
                : Math.max(0, rev.helpfulCount - 1),
            };
          }),
        };
      })
    );
  };

  const handleToggleApprovedPeerDomain = (departmentName: string) => {
    setApprovedPeerReviewDomains((prev) => {
      const exists = prev.includes(departmentName);
      const next = exists
        ? prev.filter((d) => d !== departmentName)
        : [...prev, departmentName];
      showToast(
        exists
          ? `ปิดการทำ Peer-Review ใน ${departmentName} แล้ว`
          : `อนุญาตให้ทำ Peer-Review ใน ${departmentName} แล้ว`
      );
      return next;
    });
  };

  const handleUpdateEpaLevel = (epaId: string, level: number) => {
    setEpas((prev) =>
      prev.map((e) =>
        e.id === epaId
          ? {
              ...e,
              currentLevel: level,
              lastAssessedDate: '24 พ.ย. 2569',
              lastAssessedBy: authenticatedDisplayName ?? 'นพ.เอกรัตน์ วัฒนสุรินทร์',
            }
          : e
      )
    );
    showToast(`อัปเดตสมรรถนะ EPA เป็นระดับ ${level} เรียบร้อยแล้ว`);
  };

  const handleAddEvaluation = (
    record: Omit<OsceEvaluationRecord, 'id' | 'date'>
  ) => {
    const newRecord: OsceEvaluationRecord = {
      ...record,
      id: `eval-${Date.now()}`,
      date: '24 พ.ย. 2569',
    };
    setEvaluations((prev) => [newRecord, ...prev]);
    showToast('บันทึกผลคะแนนประเมิน OSCE / Mini-CEX เรียบร้อยแล้ว');
  };

  const handleAddResearch = (
    project: Omit<ResearchProject, 'id' | 'year' | 'status'>
  ) => {
    const newProj: ResearchProject = {
      ...project,
      id: `res-${Date.now()}`,
      year: '2569',
      status: 'กำลังเก็บข้อมูล',
    };
    setResearchProjects((prev) => [newProj, ...prev]);
    showToast('ยื่นข้อเสนอโครงการวิจัยเข้าสู่ระบบพิจารณา IRB แล้ว');
  };

  const handleUpdateResearchStatus = (
    id: string,
    status: ResearchProject['status']
  ) => {
    setResearchProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status } : p))
    );
    showToast(`อัปเดตสถานะโครงการวิจัยเป็น “${status}” เรียบร้อยแล้ว`);
  };

  const handleAddWelfareRequest = (
    req: Omit<WelfareRequest, 'id' | 'submittedAt' | 'status'>
  ) => {
    const newReq: WelfareRequest = {
      ...req,
      id: `wel-${Date.now()}`,
      submittedAt: '24 พ.ย. 2569',
      status: 'รอดำเนินการ',
    };
    setWelfareRequests((prev) => [newReq, ...prev]);
    showToast(`ส่งคำร้อง${req.type}เรียบร้อยแล้ว`);
  };

  const handleUpdateGradingConfig = (updated: CourseGradingConfig) => {
    setGradingConfigs((prev) =>
      prev.map((c) => (c.courseCode === updated.courseCode ? updated : c))
    );
    setStudentScores((prev) =>
      prev.map((row) =>
        row.courseCode === updated.courseCode
          ? recomputeRowScoresWithConfig(row, updated, facultySubmissions)
          : row
      )
    );
    showToast(`บันทึกการตั้งค่ารายวิชา ${updated.courseCode} เรียบร้อยแล้ว`);
  };

  const handleUpdateStudentScore = (updated: StudentCourseScore) => {
    setStudentScores((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s))
    );
  };

  const handleSubmitBatchForms = (
    submissionsList: Omit<FacultyFormSubmission, 'id' | 'date'>[]
  ) => {
    if (submissionsList.length === 0) return;

    const timestamp = Date.now();
    const newSubmissions: FacultyFormSubmission[] = submissionsList.map((sub, i) => ({
      ...sub,
      id: `fsub-${timestamp}-${i}`,
      date: '24 พ.ย. 2569',
    }));

    const combinedSubmissions = [...newSubmissions, ...facultySubmissions];
    setFacultySubmissions(combinedSubmissions);

    const fieldMap = {
      form_a: 'formA',
      form_b: 'formB',
      form_c: 'formC',
      well_baby: 'wellBaby',
      form_e: 'formE',
    } as const;

    setStudentScores((prev) => {
      const next = [...prev];
      newSubmissions.forEach((submission, idx) => {
        const targetField = fieldMap[submission.formType];
        const courseConfig = gradingConfigs.find(
          (c) => c.courseCode === submission.courseCode
        );
        const existingIdx = next.findIndex(
          (s) =>
            s.studentId === submission.studentId &&
            s.courseCode === submission.courseCode
        );

        let updatedRow: StudentCourseScore;
        if (existingIdx >= 0) {
          const row = next[existingIdx];
          const gateStillPassed =
            submission.formType === 'form_e' || submission.formType === 'form_c'
              ? submission.passedAttitudeGate
              : row.attitudeGatePassed;
          updatedRow = {
            ...row,
            [targetField]: submission.percentage,
            attitudeGatePassed: gateStillPassed,
          };
        } else {
          const studentInfo =
            COHORT_STUDENTS.find((s) => s.studentId === submission.studentId) ??
            COHORT_STUDENTS[0];
          updatedRow = {
            id: `sc-${timestamp}-${idx}`,
            studentId: submission.studentId,
            studentName: submission.studentName,
            yearLevel: studentInfo.yearLevel,
            courseCode: submission.courseCode,
            formA: submission.formType === 'form_a' ? submission.percentage : 75,
            formB: submission.formType === 'form_b' ? submission.percentage : 75,
            formC: submission.formType === 'form_c' ? submission.percentage : 75,
            wellBaby: submission.formType === 'well_baby' ? submission.percentage : null,
            formE: submission.formType === 'form_e' ? submission.percentage : 85,
            osce: 75,
            writtenExam: 72,
            attitudeGatePassed: submission.passedAttitudeGate,
            absenceDays: 0,
          };
        }

        const recomputed = courseConfig
          ? recomputeRowScoresWithConfig(updatedRow, courseConfig, combinedSubmissions)
          : updatedRow;

        if (existingIdx >= 0) {
          next[existingIdx] = recomputed;
        } else {
          next.push(recomputed);
        }
      });
      return next;
    });

    showToast(
      `บันทึกผลประเมิน ${submissionsList[0].formTitle} (${submissionsList[0].wardOrSubrotation}) สำหรับนักศึกษา ${submissionsList.length} คน และอัปเดตตารางเกรด MPL แล้ว`
    );
  };

  const handleUploadStudentPhoto = (studentId: string, dataUrl: string) => {
    setStudentPhotos((prev) => ({ ...prev, [studentId]: dataUrl }));
    const student = COHORT_STUDENTS.find((s) => s.studentId === studentId);
    showToast(
      `อัปโหลดรูปถ่าย ${student?.studentName ?? studentId} เรียบร้อยแล้ว`
    );
  };

  const handleRemoveStudentPhoto = (studentId: string) => {
    setStudentPhotos((prev) => {
      const next = { ...prev };
      delete next[studentId];
      return next;
    });
    showToast('ลบรูปถ่ายนักศึกษาออกจากระบบแล้ว');
  };

  const handleResetAllPhotos = () => {
    setStudentPhotos(INITIAL_STUDENT_PHOTOS);
    showToast('คืนค่ารูปถ่ายนักศึกษาเริ่มต้นทั้งหมดเรียบร้อยแล้ว');
  };

  const handleAddLeaveRequest = (
    req: Omit<LeaveRequest, 'id' | 'submittedAt' | 'status'>
  ) => {
    const newReq: LeaveRequest = {
      ...req,
      id: `leave-${Date.now()}`,
      submittedAt: '24 พ.ย. 2569',
      status: 'รออนุมัติ',
    };
    setLeaveRequests((prev) => [newReq, ...prev]);
    showToast('ส่งใบลาปฏิบัติงานคลินิกให้อาจารย์พิจารณาแล้ว');
  };

  const handleUpdateLeaveStatus = (
    leaveId: string,
    status: LeaveRequest['status']
  ) => {
    setLeaveRequests((prev) =>
      prev.map((l) => (l.id === leaveId ? { ...l, status } : l))
    );
    showToast(
      status === 'อนุมัติแล้ว'
        ? 'อนุมัติใบลาปฏิบัติงานเรียบร้อยแล้ว'
        : 'บันทึกสถานะไม่อนุมัติใบลาแล้ว'
    );
  };

  const handleAddPreceptorFeedback = (
    item: Omit<PreceptorFeedback, 'id' | 'submittedAt'>
  ) => {
    const newItem: PreceptorFeedback = {
      ...item,
      id: `pfb-${Date.now()}`,
      submittedAt: '24 พ.ย. 2569',
    };
    setPreceptorFeedbacks((prev) => [newItem, ...prev]);
    showToast('บันทึกแบบประเมินอาจารย์แพทย์และรายวิชาเรียบร้อยแล้ว');
  };

  const handleToggleStudentSkill = (
    skillId: string,
    practiced: boolean,
    note?: string
  ) => {
    setClinicalSkills((prev) =>
      prev.map((item) => {
        if (item.id !== skillId) return item;
        return {
          ...item,
          studentPracticed: practiced,
          studentSelfNote: note !== undefined ? note : item.studentSelfNote,
          studentMarkedAt: practiced ? '24 พ.ย. 2569' : undefined,
        };
      })
    );
    showToast(
      practiced
        ? 'บันทึกสถานะฝึกปฏิบัติหัตถการแล้ว (รออาจารย์แพทย์ลงนามรับรอง)'
        : 'อัปเดตสถานะหัตถการเป็นยังไม่ฝึกปฏิบัติแล้ว'
    );
  };

  const handleValidateSkillWithSignature = (
    skillId: string,
    payload: {
      signerName: string;
      signatureRef: string;
      signatureImage?: string;
    }
  ) => {
    setClinicalSkills((prev) =>
      prev.map((item) => {
        if (item.id !== skillId) return item;
        return {
          ...item,
          studentPracticed: true,
          studentMarkedAt: item.studentMarkedAt ?? '24 พ.ย. 2569',
          facultyValidated: true,
          facultySignerName: payload.signerName,
          facultySignatureRef: payload.signatureRef,
          facultySignatureImage: payload.signatureImage,
          validatedAt: '24 พ.ย. 2569',
        };
      })
    );
    showToast(`ลงนามรับรองความชำนาญหัตถการโดย ${payload.signerName} เรียบร้อยแล้ว`);
  };

  const handleRevokeSkillValidation = (skillId: string) => {
    setClinicalSkills((prev) =>
      prev.map((item) => {
        if (item.id !== skillId) return item;
        return {
          ...item,
          facultyValidated: false,
          facultySignerName: undefined,
          facultySignatureRef: undefined,
          facultySignatureImage: undefined,
          validatedAt: undefined,
        };
      })
    );
    showToast('ยกเลิกการรับรองลายเซ็นอาจารย์สำหรับหัตถการนี้แล้ว');
  };

  const currentActorName =
    authenticatedDisplayName ??
    (activeRole === 'faculty'
      ? 'นพ. เอกรัตน์ วัฒนสุรินทร์'
      : activeRole === 'course_officer'
        ? 'นักวิชาการประจำรายวิชา ศพค. รพ.สุรินทร์'
        : activeRole === 'admin'
          ? 'ผู้บริหารศูนย์แพทยฯ รพ.สุรินทร์'
          : activeStudentName);

  const handleBookRoom = (booking: {
    roomId: string;
    dateIso: string;
    timeSlot: string;
    title: string;
    attendeesCount: number;
    purpose: RoomBooking['purpose'];
  }): boolean => {
    const conflict = roomBookings.some(
      (b) =>
        b.status === 'ยืนยันการจอง' &&
        b.roomId === booking.roomId &&
        b.dateIso === booking.dateIso &&
        b.timeSlot === booking.timeSlot
    );
    if (conflict) {
      showToast('ช่วงเวลาดังกล่าวมีผู้จองแล้ว กรุณาเลือกช่วงเวลาอื่น');
      return false;
    }
    const newBooking: RoomBooking = {
      id: `book-${Date.now()}`,
      ...booking,
      bookedBy: currentActorName,
      bookedByRole: activeRole,
      status: 'ยืนยันการจอง',
    };
    setRoomBookings((prev) => [newBooking, ...prev]);
    const roomName =
      CLINICAL_ROOMS.find((r) => r.id === booking.roomId)?.name ?? 'ห้องประชุม';
    showToast(`จอง ${roomName} (${booking.timeSlot} น.) เรียบร้อยแล้ว`);
    return true;
  };

  const handleCancelRoomBooking = (bookingId: string) => {
    setRoomBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: 'ยกเลิกแล้ว' } : b))
    );
    showToast('ยกเลิกการจองห้องและคืนช่วงเวลาว่างเรียบร้อยแล้ว');
  };

  const handleCheckoutMaterial = (materialId: string) => {
    const mat = referenceMaterials.find((m) => m.id === materialId);
    if (!mat || mat.availableCopies <= 0) {
      showToast('สื่อการเรียนรู้รายการนี้ถูกยืมครบจำนวนแล้ว');
      return;
    }
    const alreadyActive = referenceCheckouts.some(
      (c) =>
        c.materialId === materialId &&
        c.borrowerName === currentActorName &&
        c.status === 'กำลังยืม'
    );
    if (alreadyActive) {
      showToast('คุณกำลังยืมสื่อการเรียนรู้รายการนี้อยู่แล้ว');
      return;
    }

    const baseDate = new Date(2026, 10, 24);
    const due = new Date(baseDate);
    due.setDate(due.getDate() + mat.loanDays);
    const thaiMonths = [
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
    const dueDateStr = `${due.getDate()} ${thaiMonths[due.getMonth()]} ${due.getFullYear() + 543}`;

    const newRecord: ReferenceCheckoutRecord = {
      id: `chk-${Date.now()}`,
      materialId: mat.id,
      materialTitle: mat.title,
      callNumber: mat.callNumber,
      borrowerName: currentActorName,
      borrowerRole: activeRole,
      checkedOutDate: '24 พ.ย. 2569',
      dueDate: dueDateStr,
      status: 'กำลังยืม',
    };

    setReferenceMaterials((prev) =>
      prev.map((m) =>
        m.id === materialId
          ? { ...m, availableCopies: Math.max(0, m.availableCopies - 1) }
          : m
      )
    );
    setReferenceCheckouts((prev) => [newRecord, ...prev]);
    showToast(`บันทึกรายการยืม "${mat.callNumber}" กำหนดคืน ${dueDateStr}`);
  };

  const handleReturnMaterial = (checkoutId: string) => {
    const target = referenceCheckouts.find((c) => c.id === checkoutId);
    if (!target || target.status === 'คืนแล้ว') return;

    setReferenceCheckouts((prev) =>
      prev.map((c) =>
        c.id === checkoutId
          ? { ...c, status: 'คืนแล้ว', returnedDate: '24 พ.ย. 2569' }
          : c
      )
    );
    setReferenceMaterials((prev) =>
      prev.map((m) =>
        m.id === target.materialId
          ? { ...m, availableCopies: Math.min(m.totalCopies, m.availableCopies + 1) }
          : m
      )
    );
    showToast(`บันทึกการคืน "${target.callNumber}" เรียบร้อยแล้ว`);
  };

  const handleCompleteClinicalQuiz = (result: {
    department: string;
    score: number;
    total: number;
  }): QuizCompletionRecord => {
    const todayKey = getBangkokDateKey();
    const yesterdayKey = getBangkokDateKey(Date.now() - 86_400_000);
    const alreadyCompletedToday = learningStreak.completedDates.includes(todayKey);

    const pointsEarned = alreadyCompletedToday
      ? result.score * 5 + (result.score === result.total ? 5 : 0)
      : result.score * 10 + 20 + (result.score === result.total ? 10 : 0);

    const now = new Date();
    const timeLabel = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')} น.`;

    const record: QuizCompletionRecord = {
      id: `quiz-rec-${Date.now()}`,
      dateKey: todayKey,
      department: result.department,
      score: result.score,
      total: result.total,
      pointsEarned,
      isDailyStreakAwarded: !alreadyCompletedToday,
      completedAt: `วันนี้ · ${timeLabel}`,
    };

    const nextStreakDays = alreadyCompletedToday
      ? learningStreak.currentStreakDays
      : learningStreak.lastCompletedDate === yesterdayKey
        ? learningStreak.currentStreakDays + 1
        : 1;

    setLearningStreak((prev) => {
      const prevAlreadyDone = prev.completedDates.includes(todayKey);
      const computedStreak = prevAlreadyDone
        ? prev.currentStreakDays
        : prev.lastCompletedDate === yesterdayKey
          ? prev.currentStreakDays + 1
          : 1;

      return {
        totalPoints: prev.totalPoints + pointsEarned,
        currentStreakDays: computedStreak,
        bestStreakDays: Math.max(prev.bestStreakDays, computedStreak),
        lastCompletedDate: prevAlreadyDone ? prev.lastCompletedDate : todayKey,
        completedDates: prevAlreadyDone
          ? prev.completedDates
          : [...prev.completedDates, todayKey],
        recentHistory: [record, ...prev.recentHistory].slice(0, 10),
      };
    });

    if (!alreadyCompletedToday) {
      showToast(
        `ต่อ Learning Streak สำเร็จ (${nextStreakDays} วันต่อเนื่อง) · รับ +${pointsEarned} คะแนน`
      );
    } else {
      showToast(`บันทึกคะแนนชุดฝึกหัดเพิ่มเติม · รับ +${pointsEarned} คะแนน`);
    }

    return record;
  };

  const activeStudentBadges = useMemo(
    () =>
      computeActiveStudentBadges({
        epas,
        quotas,
        clinicalSkills,
        conferences,
        shifts,
        bedsideCheckIns,
        logbookEntries,
        studentName: activeStudentName,
      }),
    [
      epas,
      quotas,
      clinicalSkills,
      conferences,
      shifts,
      bedsideCheckIns,
      logbookEntries,
      activeStudentName,
    ]
  );

  const pendingLogbookCount = logbookEntries.filter(
    (e) => e.status === 'pending'
  ).length;

  const currentSyncPayload: PortalSyncPayload = useMemo(
    () => ({
      conferences,
      announcements,
      shifts,
      logbookEntries,
      quotas,
      epas,
      evaluations,
      researchProjects,
      welfareRequests,
      gradingConfigs,
      studentScores,
      facultySubmissions,
      leaveRequests,
      preceptorFeedbacks,
      clinicalSkills,
      roomBookings,
      referenceMaterials,
      referenceCheckouts,
      bedsideCheckIns,
      approvedPeerReviewDomains,
      peerReviewEntries,
    }),
    [
      conferences,
      announcements,
      shifts,
      logbookEntries,
      quotas,
      epas,
      evaluations,
      researchProjects,
      welfareRequests,
      gradingConfigs,
      studentScores,
      facultySubmissions,
      leaveRequests,
      preceptorFeedbacks,
      clinicalSkills,
      roomBookings,
      referenceMaterials,
      referenceCheckouts,
      bedsideCheckIns,
      approvedPeerReviewDomains,
      peerReviewEntries,
    ]
  );

  const handleApplyPulledSheetsData = (pulled: Partial<PortalSyncPayload>) => {
    if (Array.isArray(pulled.conferences) && pulled.conferences.length > 0) {
      setConferences(pulled.conferences as ConferenceEvent[]);
    }
    if (Array.isArray(pulled.announcements) && pulled.announcements.length > 0) {
      setAnnouncements(pulled.announcements as Announcement[]);
    }
    if (Array.isArray(pulled.shifts) && pulled.shifts.length > 0) {
      setShifts(pulled.shifts as DutyShift[]);
    }
    if (Array.isArray(pulled.logbookEntries) && pulled.logbookEntries.length > 0) {
      setLogbookEntries(pulled.logbookEntries as LogbookEntry[]);
    }
    if (Array.isArray(pulled.quotas) && pulled.quotas.length > 0) {
      setQuotas(pulled.quotas as ProcedureQuota[]);
    }
    if (Array.isArray(pulled.epas) && pulled.epas.length > 0) {
      setEpas(pulled.epas as EpaMilestone[]);
    }
    if (Array.isArray(pulled.evaluations) && pulled.evaluations.length > 0) {
      setEvaluations(pulled.evaluations as OsceEvaluationRecord[]);
    }
    if (Array.isArray(pulled.researchProjects) && pulled.researchProjects.length > 0) {
      setResearchProjects(pulled.researchProjects as ResearchProject[]);
    }
    if (Array.isArray(pulled.welfareRequests) && pulled.welfareRequests.length > 0) {
      setWelfareRequests(pulled.welfareRequests as WelfareRequest[]);
    }
    if (Array.isArray(pulled.gradingConfigs) && pulled.gradingConfigs.length > 0) {
      setGradingConfigs(pulled.gradingConfigs as CourseGradingConfig[]);
    }
    if (Array.isArray(pulled.studentScores) && pulled.studentScores.length > 0) {
      setStudentScores(pulled.studentScores as StudentCourseScore[]);
    }
    if (Array.isArray(pulled.facultySubmissions) && pulled.facultySubmissions.length > 0) {
      setFacultySubmissions(pulled.facultySubmissions as FacultyFormSubmission[]);
    }
    if (Array.isArray(pulled.leaveRequests) && pulled.leaveRequests.length > 0) {
      setLeaveRequests(pulled.leaveRequests as LeaveRequest[]);
    }
    if (Array.isArray(pulled.preceptorFeedbacks) && pulled.preceptorFeedbacks.length > 0) {
      setPreceptorFeedbacks(pulled.preceptorFeedbacks as PreceptorFeedback[]);
    }
    if (Array.isArray(pulled.clinicalSkills) && pulled.clinicalSkills.length > 0) {
      setClinicalSkills(pulled.clinicalSkills as ClinicalSkillMasteryItem[]);
    }
    if (Array.isArray(pulled.roomBookings) && pulled.roomBookings.length > 0) {
      setRoomBookings(pulled.roomBookings as RoomBooking[]);
    }
    if (Array.isArray(pulled.referenceMaterials) && pulled.referenceMaterials.length > 0) {
      setReferenceMaterials(pulled.referenceMaterials as ClinicalReferenceMaterial[]);
    }
    if (Array.isArray(pulled.referenceCheckouts) && pulled.referenceCheckouts.length > 0) {
      setReferenceCheckouts(pulled.referenceCheckouts as ReferenceCheckoutRecord[]);
    }
    if (Array.isArray(pulled.bedsideCheckIns) && pulled.bedsideCheckIns.length > 0) {
      setBedsideCheckIns(pulled.bedsideCheckIns as BedsideCheckInRecord[]);
    }
    if (Array.isArray(pulled.approvedPeerReviewDomains)) {
      setApprovedPeerReviewDomains(pulled.approvedPeerReviewDomains as string[]);
    }
    if (Array.isArray(pulled.peerReviewEntries) && pulled.peerReviewEntries.length > 0) {
      setPeerReviewEntries(pulled.peerReviewEntries as PeerReviewEntry[]);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-clinical-canvas text-[#0F172A]">
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenNewLogbook={() => setLogbookModalOpen(true)}
      />

      <WorkspaceBar
        role={activeRole}
        onChangeRole={setRole}
        pendingCount={pendingLogbookCount}
        currentStudentId={activeStudentId}
        currentStudentName={activeStudentName}
        authUser={authUser}
        onOpenAuthModal={handleOpenAuthModal}
        onLogout={() => void handleLogout()}
        studentPhotos={studentPhotos}
        onOpenStudentDirectory={() => setDirectoryModalOpen(true)}
        onOpenQuickSearch={() => setQuickSearchOpen(true)}
        onOpenSheetsSync={() => setSheetsSyncModalOpen(true)}
      />

      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {activeTab === 'overview' && (
          <OverviewSection
            role={activeRole}
            currentStudentId={activeStudentId}
            currentStudentName={activeStudentName}
            authenticatedDisplayName={authenticatedDisplayName}
            studentPhotos={studentPhotos}
            onOpenStudentDirectory={() => setDirectoryModalOpen(true)}
            conferences={conferences}
            onToggleConferenceCheckIn={handleToggleConferenceCheckIn}
            announcements={announcements}
            onAddAnnouncement={handleAddAnnouncement}
            exams={INITIAL_OSCE_EXAMS}
            evaluations={evaluations}
            courseGrades={INITIAL_COURSE_GRADES}
            studentScores={studentScores}
            gradingConfigs={gradingConfigs}
            bedsideCheckIns={bedsideCheckIns}
            logbookEntries={logbookEntries}
            shifts={shifts}
            badges={activeStudentBadges}
            learningStreak={learningStreak}
            onCompleteClinicalQuiz={handleCompleteClinicalQuiz}
            onNavigateTab={setActiveTab}
            onOpenNewLogbook={() => setLogbookModalOpen(true)}
          />
        )}

        {activeTab === 'curriculum' && (
          <CurriculumRosterSection
            role={activeRole}
            currentStudentId={activeStudentId}
            currentStudentName={activeStudentName}
            currentUserName={
              authenticatedDisplayName ??
              (activeRole === 'faculty'
                ? 'นพ. เอกรัตน์ วัฒนสุรินทร์'
                : activeRole === 'course_officer'
                  ? 'นักวิชาการประจำรายวิชา ศพค. รพ.สุรินทร์'
                  : activeRole === 'admin'
                    ? 'ผู้บริหารศูนย์แพทยฯ รพ.สุรินทร์'
                    : activeStudentName)
            }
            studentPhotos={studentPhotos}
            departments={CLINICAL_DEPARTMENTS}
            shifts={shifts}
            onCheckInShift={handleCheckInShift}
            onQrCheckIn={handleQrCheckIn}
            bedsideCheckIns={bedsideCheckIns}
            onRecordBedsideCheckIn={handleBedsideQrCheckIn}
            onSaveBedsideReflection={handleSaveBedsideReflection}
            onSaveBedsideRoundingNote={handleSaveBedsideRoundingNote}
            onSaveBedsideSbarHandoff={handleSaveBedsideSbarHandoff}
            onRequestSwap={handleRequestSwap}
            onApproveSwap={handleApproveSwap}
            leaveRequests={leaveRequests}
            onAddLeaveRequest={handleAddLeaveRequest}
            onUpdateLeaveStatus={handleUpdateLeaveStatus}
            clinicalSkills={clinicalSkills}
            onToggleStudentSkill={handleToggleStudentSkill}
            onValidateSkillWithSignature={handleValidateSkillWithSignature}
            onRevokeSkillValidation={handleRevokeSkillValidation}
            badges={activeStudentBadges}
            onOpenStudentDirectory={() => setDirectoryModalOpen(true)}
          />
        )}

        {activeTab === 'logbook' && (
          <LogbookSection
            role={activeRole}
            currentUserName={
              authenticatedDisplayName ??
              (activeRole === 'faculty'
                ? 'นพ. เอกรัตน์ วัฒนสุรินทร์'
                : activeRole === 'course_officer'
                  ? 'นักวิชาการประจำรายวิชา ศพค. รพ.สุรินทร์'
                  : activeRole === 'admin'
                    ? 'ผู้บริหารศูนย์แพทยฯ รพ.สุรินทร์'
                    : activeStudentName)
            }
            entries={logbookEntries}
            quotas={quotas}
            peerReviewEntries={peerReviewEntries}
            approvedPeerReviewDomains={approvedPeerReviewDomains}
            onOpenNewLogbook={() => setLogbookModalOpen(true)}
            onUpdateStatus={handleUpdateLogbookStatus}
            onSubmitPeerReview={handleSubmitPeerReview}
            onTogglePeerReviewHelpful={handleTogglePeerReviewHelpful}
            onToggleApprovedPeerDomain={handleToggleApprovedPeerDomain}
            onNotify={showToast}
          />
        )}

        {activeTab === 'assessment' && (
          <AssessmentSection
            role={activeRole}
            currentStudentId={activeStudentId}
            currentStudentName={activeStudentName}
            authenticatedDisplayName={authenticatedDisplayName}
            assignedCourseCodes={assignedCourseCodes}
            studentPhotos={studentPhotos}
            epas={epas}
            onUpdateEpaLevel={handleUpdateEpaLevel}
            exams={INITIAL_OSCE_EXAMS}
            evaluations={evaluations}
            onAddEvaluation={handleAddEvaluation}
            grades={INITIAL_COURSE_GRADES}
            gradingConfigs={gradingConfigs}
            onUpdateGradingConfig={handleUpdateGradingConfig}
            studentScores={studentScores}
            onUpdateStudentScore={handleUpdateStudentScore}
            facultySubmissions={facultySubmissions}
            onSubmitBatchForms={handleSubmitBatchForms}
            preceptorFeedbacks={preceptorFeedbacks}
            onAddPreceptorFeedback={handleAddPreceptorFeedback}
            onNotify={showToast}
          />
        )}

        {activeTab === 'library' && (
          <LibraryResearchSection
            role={activeRole}
            currentUserName={currentActorName}
            cpgProtocols={SURIN_CPG_PROTOCOLS}
            researchProjects={researchProjects}
            onAddResearch={handleAddResearch}
            onUpdateResearchStatus={handleUpdateResearchStatus}
            welfareRequests={welfareRequests}
            onAddWelfareRequest={handleAddWelfareRequest}
            rooms={CLINICAL_ROOMS}
            timeSlots={ROOM_TIME_SLOTS}
            roomBookings={roomBookings}
            onBookRoom={handleBookRoom}
            onCancelRoomBooking={handleCancelRoomBooking}
            referenceMaterials={referenceMaterials}
            referenceCheckouts={referenceCheckouts}
            onCheckoutMaterial={handleCheckoutMaterial}
            onReturnMaterial={handleReturnMaterial}
          />
        )}
      </main>

      <Footer onSelectTab={setActiveTab} />

      <LogbookModal
        isOpen={logbookModalOpen}
        onClose={() => setLogbookModalOpen(false)}
        onAddEntry={handleAddLogbookEntry}
      />

      <StudentDirectoryModal
        isOpen={directoryModalOpen}
        onClose={() => setDirectoryModalOpen(false)}
        role={activeRole}
        activeStudentId={activeStudentId}
        activeBadges={activeStudentBadges}
        studentScores={studentScores}
        studentPhotos={studentPhotos}
        onUploadStudentPhoto={handleUploadStudentPhoto}
        onRemoveStudentPhoto={handleRemoveStudentPhoto}
        onResetAllPhotos={handleResetAllPhotos}
      />

      <QuickSearchModal
        isOpen={quickSearchOpen}
        onClose={() => setQuickSearchOpen(false)}
        studentPhotos={studentPhotos}
        departments={CLINICAL_DEPARTMENTS}
        cpgProtocols={SURIN_CPG_PROTOCOLS}
        exams={INITIAL_OSCE_EXAMS}
        onNavigateTab={setActiveTab}
        onOpenStudentDirectory={() => setDirectoryModalOpen(true)}
      />

      <AuthPortalModal
        isOpen={authModalOpen}
        initialTab={authModalTab}
        onClose={() => setAuthModalOpen(false)}
        authToken={authToken}
        authUser={authUser}
        onAuthenticated={handleAuthenticated}
        onUpdatedProfile={(updated) => {
          setAuthUser(updated);
          showToast('อัปเดตรหัสผ่านเรียบร้อยแล้ว');
        }}
      />

      <GoogleSheetsSyncModal
        isOpen={sheetsSyncModalOpen}
        onClose={() => setSheetsSyncModalOpen(false)}
        actorName={currentActorName}
        currentPayload={currentSyncPayload}
        onApplyPulledData={handleApplyPulledSheetsData}
        onNotify={showToast}
      />

      <MobileBottomNav activeTab={activeTab} onSelectTab={setActiveTab} />

      <OfflineBanner />

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 lg:bottom-5 right-4 lg:right-5 z-50 max-w-[calc(100vw-2rem)] bg-[#091A32] text-white text-sm font-medium px-4 py-3 rounded-xl shadow-xl border border-[#2DD4BF]/30"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
