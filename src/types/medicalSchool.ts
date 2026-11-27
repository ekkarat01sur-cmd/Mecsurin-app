export type UserRole = 'student' | 'faculty' | 'course_officer' | 'admin';

export type MemberAccountStatus = 'ใช้งานปกติ' | 'ลาศึกษาต่อ/ประชุม' | 'ระงับชั่วคราว';

export interface AuthUserProfile {
  username: string;
  role: UserRole;
  level: RoleAccessLevel;
  displayName: string;
  affiliation: string;
  photoUrl?: string;
  positionTitle?: string;
  department?: string;
  phone?: string;
  email?: string;
  licenseOrCode?: string;
  status?: MemberAccountStatus;
  notes?: string;
  studentId?: string;
  assignedCourseCodes?: string[];
  hasPasswordSet: boolean;
  mustChangePassword?: boolean;
}

export type ActiveTab =
  | 'overview'
  | 'curriculum'
  | 'logbook'
  | 'assessment'
  | 'library';

export type AcademicYearLevel = '4' | '5' | '6';

export type LogbookStatus = 'pending' | 'approved' | 'revision';

export type ProcedureRole = 'Perform' | 'Assist' | 'Observe';

export type ClinicalSetting = 'IPD' | 'OPD' | 'ER' | 'OR' | 'LR' | 'Community';

export interface ConferenceEvent {
  id: string;
  time: string;
  title: string;
  department: string;
  speaker: string;
  location: string;
  type: string;
  checkedIn: boolean;
  attendeeCount: number;
}

export interface Announcement {
  id: string;
  title: string;
  category: 'วิชาการ' | 'ตารางสอบ' | 'หอพักและสวัสดิการ';
  date: string;
  author: string;
  summary: string;
  urgent?: boolean;
}

export interface ClinicalDepartment {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string;
  yearLevel: AcademicYearLevel;
  weeks: number;
  credits: number;
  headPreceptor: string;
  wards: string;
  requiredProcedures: string[];
  requiredEpAs: string[];
  overview: string;
}

export interface DutyShift {
  id: string;
  isoDate?: string;
  date: string;
  dayLabel: string;
  department: string;
  wardOrUnit: string;
  shiftType: string;
  timeRange: string;
  assignedStudent: string;
  studentYear: AcademicYearLevel;
  supervisingStaff: string;
  checkedInAt?: string;
  checkInMethod?: 'manual' | 'qr_scan';
  checkInWardCode?: string;
  swapStatus?: 'none' | 'requested' | 'approved';
  swapNote?: string;
}

export interface LogbookEntry {
  id: string;
  date: string;
  department: string;
  setting: ClinicalSetting;
  caseCode: string;
  patientSummary: string;
  icd10: string;
  diagnosis: string;
  procedure: string;
  role: ProcedureRole;
  preceptor: string;
  reflection: string;
  status: LogbookStatus;
  feedback?: string;
}

export interface ProcedureQuota {
  id: string;
  name: string;
  department: string;
  completed: number;
  target: number;
  roleRequirement: ProcedureRole;
}

export interface EpaMilestone {
  id: string;
  code: string;
  title: string;
  description: string;
  currentLevel: number;
  targetLevel: number;
  lastAssessedBy: string;
  lastAssessedDate: string;
}

export interface OsceExam {
  id: string;
  title: string;
  cohort: string;
  date: string;
  time: string;
  location: string;
  stations: number;
  format: 'OSCE' | 'MEQ' | 'MCQ' | 'Long Case';
  status: 'กำลังจะมาถึง' | 'เปิดลงทะเบียน' | 'ประกาศผลแล้ว';
}

export interface OsceEvaluationRecord {
  id: string;
  stationName: string;
  studentName: string;
  evaluatorName: string;
  date: string;
  scores: {
    historyTaking: number;
    physicalExam: number;
    clinicalReasoning: number;
    communication: number;
    professionalism: number;
  };
  totalScore: number;
  passed: boolean;
  comments: string;
}

export interface CourseGrade {
  id: string;
  courseCode: string;
  courseName: string;
  yearLevel: AcademicYearLevel;
  credits: number;
  grade: string;
  gradePoint: number;
  status: 'ผ่านเกณฑ์' | 'กำลังศึกษา';
}

export interface CpgProtocol {
  id: string;
  code: string;
  title: string;
  department: string;
  updatedAt: string;
  summary: string;
  keyCriteria: string[];
  immediateOrders: string[];
  referralOrEscalation: string;
}

export interface ResearchProject {
  id: string;
  title: string;
  leadInvestigator: string;
  advisor: string;
  department: string;
  year: string;
  status: 'กำลังเก็บข้อมูล' | 'ผ่านจริยธรรมการวิจัย (IRB)' | 'ตีพิมพ์/นำเสนอแล้ว';
  abstract: string;
}

export interface WelfareRequest {
  id: string;
  type: 'แจ้งซ่อมหอพัก' | 'นัดพบอาจารย์ที่ปรึกษา';
  subject: string;
  detail: string;
  preferredDateOrRoom: string;
  submittedAt: string;
  status: 'รอดำเนินการ' | 'นัดหมายแล้ว';
}

export type EvaluationFormType =
  | 'well_baby'
  | 'form_a'
  | 'form_b'
  | 'form_c'
  | 'form_e';

export type RoleAccessLevel = 1 | 2 | 3;

export interface RolePermissionProfile {
  role: UserRole;
  level: RoleAccessLevel;
  title: string;
  displayName: string;
  affiliation: string;
  canViewOwnScores: boolean;
  canViewCohortScores: boolean;
  canSubmitFacultyForms: boolean;
  canApproveLogbook: boolean;
  canConfigureGradingAndMpl: boolean;
  canPublishAnnouncements: boolean;
  canManageCourseBlueprints: boolean;
  canManageAccounts: boolean;
}

export interface FacultyFormSubmission {
  id: string;
  formType: EvaluationFormType;
  formTitle: string;
  courseCode: string;
  courseName: string;
  wardOrSubrotation: string;
  rotationStartDate: string;
  rotationEndDate: string;
  studentId: string;
  studentName: string;
  evaluatorName: string;
  date: string;
  rawScore: number;
  maxScore: number;
  percentage: number;
  ratingLabel: string;
  passedAttitudeGate: boolean;
  feedback: string;
  detailsSummary: string;
  itemPercentages?: Record<string, number>;
}

export interface CourseWeightConfig {
  formA: number;
  formB: number;
  formC: number;
  wellBaby: number;
  formE: number;
  osce: number;
  writtenExam: number;
}

export type BuiltInGradeTarget = keyof CourseWeightConfig;

export interface CustomEvaluationItem {
  id: string;
  formType: EvaluationFormType;
  section?: string;
  label: string;
  maxScore: number;
  allowNa?: boolean;
  createdBy?: string;
}

export interface CustomGradeGroup {
  id: string;
  name: string;
  weightPercent: number;
  description?: string;
  includedItemIds: string[]; // keyed as `${formType}:${itemId}`
}

export interface CourseGradingConfig {
  courseCode: string;
  courseName: string;
  credits: number;
  enabledForms: EvaluationFormType[];
  enabledItems: Record<EvaluationFormType, string[]>;
  customItems?: Partial<Record<EvaluationFormType, CustomEvaluationItem[]>>;
  itemGradeMapping?: Record<string, string>; // `${formType}:${itemId}` -> BuiltInGradeTarget | CustomGradeGroup.id
  customGradeGroups?: CustomGradeGroup[];
  subrotations: string[];
  weights: CourseWeightConfig;
  mplPercent: number;
  formEMinPercent: number;
  writtenMinPercent: number;
  osceMinPercent: number;
  strictMedicalMpl: boolean; // If true: < MPL => F; else C starts at MPL with D+/D below
  enforceAttitudeGate: boolean; // Form E / Form C Ethics fail => F
}

export interface StudentCourseScore {
  id: string;
  studentId: string;
  studentName: string;
  yearLevel: AcademicYearLevel;
  courseCode: string;
  formA: number | null; // 0-100%
  formB: number | null; // 0-100%
  formC: number | null; // 0-100%
  wellBaby: number | null; // 0-100%
  formE: number | null; // 0-100%
  osce: number | null; // 0-100%
  writtenExam: number | null; // 0-100%
  customGroupScores?: Record<string, number | null>;
  attitudeGatePassed: boolean;
  absenceDays: number;
}

export interface LeaveRequest {
  id: string;
  studentId: string;
  studentName: string;
  leaveType: 'ลาป่วย' | 'ลากิจ' | 'ลาประชุมวิชาการ';
  dateRange: string;
  daysCount: number;
  department: string;
  reason: string;
  status: 'รออนุมัติ' | 'อนุมัติแล้ว' | 'ไม่อนุมัติ';
  submittedAt: string;
}

export interface PreceptorFeedback {
  id: string;
  department: string;
  courseCode?: string;
  preceptorName: string;
  rotationPeriod: string;
  teachingScore: number; // 1-5
  feedbackScore: number; // 1-5
  atmosphereScore: number; // 1-5
  safetyCultureScore?: number; // 1-5
  comment: string;
  submittedAt: string;
}

export type StudentPhotoMap = Record<string, string>;

export interface ClinicalSkillMasteryItem {
  id: string;
  code: string;
  procedureName: string;
  procedureNameEn: string;
  department: string;
  yearLevel: AcademicYearLevel;
  requiredLevel: 'Perform Independently' | 'Perform under Supervision' | 'Assist';
  studentPracticed: boolean;
  studentSelfNote?: string;
  studentMarkedAt?: string;
  facultyValidated: boolean;
  facultySignerName?: string;
  facultySignatureRef?: string;
  facultySignatureImage?: string;
  validatedAt?: string;
}

export interface RoomResource {
  id: string;
  name: string;
  location: string;
  capacity: number;
  roomType: 'Conference Room' | 'Study Group Room' | 'Simulation Briefing';
  equipment: string[];
}

export interface RoomBooking {
  id: string;
  roomId: string;
  dateIso: string;
  timeSlot: string;
  title: string;
  bookedBy: string;
  bookedByRole: UserRole;
  attendeesCount: number;
  purpose: 'กลุ่มติว / Study Group' | 'ประชุมวิชาการ / Journal Club' | 'เตรียมสอบ OSCE / Case Review';
  status: 'ยืนยันการจอง' | 'ยกเลิกแล้ว';
}

export interface ClinicalReferenceMaterial {
  id: string;
  callNumber: string;
  title: string;
  category: 'ตำราแพทย์มาตรฐาน' | 'คู่มือแนวทางเวชปฏิบัติ' | 'อุปกรณ์ฝึกทักษะ / ชุดตรวจ';
  department: string;
  totalCopies: number;
  availableCopies: number;
  shelfLocation: string;
  loanDays: number;
}

export interface ReferenceCheckoutRecord {
  id: string;
  materialId: string;
  materialTitle: string;
  callNumber: string;
  borrowerName: string;
  borrowerRole: UserRole;
  checkedOutDate: string;
  dueDate: string;
  returnedDate?: string;
  status: 'กำลังยืม' | 'คืนแล้ว';
}

export interface SbarHandoffRecord {
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
  handoffRecipient: string;
  shiftWindow: string;
  savedAt: string;
}

export interface BedsideCheckInRecord {
  id: string;
  bedsideCode: string;
  scanKind: 'patient_case' | 'ward_round';
  department: string;
  wardOrUnit: string;
  bedOrRoom: string;
  caseCode: string;
  patientSummary: string;
  diagnosis: string;
  icd10: string;
  supervisingStaff: string;
  studentName: string;
  checkedInAt: string;
  checkedInDate: string;
  reflectionNote?: string;
  clinicalTakeaway?: string;
  roleInEncounter?: ProcedureRole;
  syncedToLogbookId?: string;
  reflectionSavedAt?: string;
  roundingNote?: string;
  roundingKeyVitalsOrLabs?: string;
  roundingTodo?: string;
  roundingPriority?: 'normal' | 'watch';
  roundingUpdatedAt?: string;
  sbarHandoff?: SbarHandoffRecord;
}

export interface MedicalDigestSource {
  title: string;
  uri: string;
  hostname: string;
}

export interface MedicalDigestResponse {
  department: string;
  focusTopic?: string;
  digestTitle: string;
  summaryPoints: string[];
  bedsideTakeaways: string[];
  guidelineReferences: string[];
  rawMarkdown: string;
  sources: MedicalDigestSource[];
  searchQueries: string[];
  generatedAt: string;
  model: string;
}

export type ClinicalBadgeCategory =
  | 'สมรรถนะ EPA'
  | 'หัตถการคลินิก'
  | 'การมีส่วนร่วมทางคลินิก';

export interface ClinicalMilestoneBadge {
  id: string;
  title: string;
  shortTitle: string;
  category: ClinicalBadgeCategory;
  description: string;
  criteriaText: string;
  earned: boolean;
  progressCurrent: number;
  progressTarget: number;
  progressUnit: string;
  tier: 'gold' | 'teal' | 'navy';
  iconKey: 'shield' | 'award' | 'stethoscope' | 'clipboard' | 'users' | 'sparkles';
}

export interface ClinicalQuizQuestion {
  id: string;
  question: string;
  clinicalContext: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
  guidelineRef: string;
}

export interface ClinicalQuizResponse {
  quizInstanceId: string;
  department: string;
  dateKey: string;
  quizTitle: string;
  questions: ClinicalQuizQuestion[];
  sources: MedicalDigestSource[];
  searchQueries: string[];
  generatedAt: string;
  model: string;
}

export interface QuizCompletionRecord {
  id: string;
  dateKey: string;
  department: string;
  score: number;
  total: number;
  pointsEarned: number;
  isDailyStreakAwarded: boolean;
  completedAt: string;
}

export interface LearningStreakState {
  totalPoints: number;
  currentStreakDays: number;
  bestStreakDays: number;
  lastCompletedDate: string | null;
  completedDates: string[];
  recentHistory: QuizCompletionRecord[];
}

export interface PeerReviewComment {
  id: string;
  reviewerAlias: string;
  submittedAt: string;
  clinicalReasoningScore: number;
  reflectionDepthScore: number;
  strengths: string;
  suggestions: string;
  helpfulCount: number;
  markedHelpfulByMe?: boolean;
}

export interface PeerReviewEntry {
  id: string;
  anonymizedPeerCode: string;
  cohortYear: AcademicYearLevel;
  date: string;
  department: string;
  setting: ClinicalSetting;
  icd10: string;
  diagnosis: string;
  procedure: string;
  role: ProcedureRole;
  anonymizedPatientSummary: string;
  reflection: string;
  status: LogbookStatus;
  reviews: PeerReviewComment[];
}

export interface PeerReviewFeedbackInput {
  clinicalReasoningScore: number;
  reflectionDepthScore: number;
  strengths: string;
  suggestions: string;
}

export interface FacultyGeneratedQrStation {
  id: string;
  code: string;
  kind: 'ward' | 'procedure';
  department: string;
  wardOrUnit: string;
  procedureName?: string;
  clinicalSetting?: ClinicalSetting;
  defaultRole?: ProcedureRole;
  shiftType?: string;
  note?: string;
  supervisingStaff: string;
  createdBy: string;
  createdAt: string;
  isActive: boolean;
  checkInCount: number;
}

export type AuditLogCategory =
  | 'grading'
  | 'logbook'
  | 'roster'
  | 'rotation'
  | 'admin_crud'
  | 'auth';

export interface AuditLogEntry {
  id: string;
  isoTimestamp: string;
  timestampLabel: string;
  actorName: string;
  actorUsername: string;
  actorRole: UserRole;
  category: AuditLogCategory;
  action: string;
  targetLabel: string;
  detail: string;
}

export interface CourseGradeSignOff {
  courseCode: string;
  courseName: string;
  status: 'draft' | 'officer_verified' | 'chair_signed';
  verifiedBy?: string;
  verifiedAt?: string;
  signedBy?: string;
  signedAt?: string;
  verificationCode?: string;
  note?: string;
}

export type NotificationCategory =
  | 'shift'
  | 'leave'
  | 'logbook'
  | 'exam'
  | 'announcement';

export interface PortalNotificationItem {
  id: string;
  category: NotificationCategory;
  title: string;
  detail: string;
  timeLabel: string;
  urgent?: boolean;
  targetTab: ActiveTab;
  read: boolean;
}

export interface NotificationChannelSettings {
  enableInAppAlerts: boolean;
  enableBrowserPush: boolean;
  webhookEnabled: boolean;
  webhookUrl: string;
  alertBeforeShiftHours: number;
}

export interface RotationScheduleBlock {
  id: string;
  academicYear: AcademicYearLevel;
  groupName: string;
  departmentCode: string;
  departmentName: string;
  blockIndex: number;
  startDateIso: string;
  endDateIso: string;
  weeks: number;
  supervisingStaff: string;
  studentNames: string[];
  hasHolidayOverlap?: boolean;
  holidayNote?: string;
}

export interface CohortStudentRecord {
  studentId: string;
  studentName: string;
  yearLevel: AcademicYearLevel;
  group: string;
  photoUrl?: string;
  advisorName?: string;
  contactInfo?: string;
  status?: 'กำลังศึกษา' | 'ฝึกปฏิบัติคลินิก' | 'พักการศึกษา';
}

export type ClinicalPersonnelCategory = 'intern' | 'preceptor' | 'resident';

export type PersonnelYearTag =
  | 'ปี 1'
  | 'ปี 2'
  | 'ปี 3'
  | 'ดูแลปี 4'
  | 'ดูแลปี 5'
  | 'ดูแลปี 6 (Extern)'
  | 'ประจำกลุ่มงาน';

export interface ClinicalPersonnelRecord {
  id: string;
  personnelCode: string;
  fullName: string;
  photoUrl?: string;
  category: ClinicalPersonnelCategory;
  yearLevel: PersonnelYearTag;
  department: string;
  currentWard: string;
  medicalLicenseNo: string;
  institutionOrBoard: string;
  phoneOrPager: string;
  email?: string;
  supervisingNote: string;
  status:
    | 'ปฏิบัติงานปกติ'
    | 'หมุนเวียน รพ.ชุมชน'
    | 'ออกตรวจ OPD / OR'
    | 'ลาศึกษาต่อ/ประชุม';
}
