import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  BookOpenCheck,
  CalendarClock,
  Check,
  CheckCheck,
  CheckCircle2,
  ClipboardCheck,
  RefreshCw,
} from 'lucide-react';
import {
  ActiveTab,
  DutyShift,
  LogbookEntry,
  OsceExam,
} from '../types/medicalSchool';

interface NotificationsPanelProps {
  exams: OsceExam[];
  logbookEntries: LogbookEntry[];
  shifts: DutyShift[];
  currentStudentName?: string;
  onNavigateTab: (tab: ActiveTab) => void;
}

type NotificationCategory = 'all' | 'osce' | 'logbook' | 'swap';

interface NotificationItem {
  id: string;
  category: Exclude<NotificationCategory, 'all'>;
  priority: 'urgent' | 'success' | 'info';
  title: string;
  subtitle: string;
  detail: string;
  timestampLabel: string;
  statusLabel: string;
  targetTab: ActiveTab;
  actionLabel: string;
}

const THAI_MONTHS_SHORT: Record<string, number> = {
  'ม.ค.': 1,
  'ก.พ.': 2,
  'มี.ค.': 3,
  'เม.ย.': 4,
  'พ.ค.': 5,
  'มิ.ย.': 6,
  'ก.ค.': 7,
  'ส.ค.': 8,
  'ก.ย.': 9,
  'ต.ค.': 10,
  'พ.ย.': 11,
  'ธ.ค.': 12,
};

const TODAY_MS = new Date(2026, 10, 23).getTime(); // 23 Nov 2026

function getDaysUntilThaiDate(thaiDate: string): number | null {
  const parts = thaiDate.trim().split(/\s+/);
  if (parts.length !== 3) return null;
  const day = Number(parts[0]);
  const month = THAI_MONTHS_SHORT[parts[1]];
  const beYear = Number(parts[2]);
  if (Number.isNaN(day) || !month || Number.isNaN(beYear)) return null;
  const adYear = beYear > 2400 ? beYear - 543 : beYear;
  const targetMs = new Date(adYear, month - 1, day).getTime();
  return Math.round((targetMs - TODAY_MS) / (1000 * 60 * 60 * 24));
}

export function NotificationsPanel({
  exams,
  logbookEntries,
  shifts,
  currentStudentName = 'นศพ.ธนภัทร ศรีสุรินทร์',
  onNavigateTab,
}: NotificationsPanelProps) {
  const [filterCategory, setFilterCategory] = useState<NotificationCategory>('all');
  const [readIds, setReadIds] = useState<string[]>([]);

  const notifications = useMemo<NotificationItem[]>(() => {
    const items: NotificationItem[] = [];

    // 1. Upcoming OSCE / MEQ Exam Deadlines
    exams
      .filter((exam) => exam.status !== 'ประกาศผลแล้ว')
      .forEach((exam) => {
        const daysLeft = getDaysUntilThaiDate(exam.date);
        const countdownText =
          daysLeft !== null && daysLeft >= 0
            ? daysLeft === 0
              ? 'สอบวันนี้'
              : `อีก ${daysLeft} วัน`
            : exam.date;

        items.push({
          id: `notif-osce-${exam.id}`,
          category: 'osce',
          priority: daysLeft !== null && daysLeft <= 14 ? 'urgent' : 'info',
          title: exam.title,
          subtitle: `${exam.format} · ${exam.cohort} · ${exam.stations} สถานี`,
          detail: `วันสอบ ${exam.date} เวลา ${exam.time} น. ณ ${exam.location}`,
          timestampLabel: countdownText,
          statusLabel: exam.status === 'เปิดลงทะเบียน' ? 'เปิดลงทะเบียนแล้ว' : 'กำหนดการสอบใกล้ถึง',
          targetTab: 'assessment',
          actionLabel: 'ดูตารางสอบ OSCE',
        });
      });

    // 2. Logbook Approval & Revision Feedback
    const revisionOrApproved = logbookEntries.filter(
      (entry) => entry.status === 'revision' || (entry.status === 'approved' && entry.feedback)
    );
    revisionOrApproved.forEach((entry) => {
      if (entry.status === 'revision') {
        items.push({
          id: `notif-log-${entry.id}`,
          category: 'logbook',
          priority: 'urgent',
          title: `ขอให้แก้ไขเพิ่มเติม: ${entry.diagnosis}`,
          subtitle: `เคส ${entry.caseCode} · ${entry.department} · อาจารย์${entry.preceptor}`,
          detail: entry.feedback
            ? `ข้อเสนอแนะจากอาจารย์: "${entry.feedback}"`
            : 'อาจารย์ผู้ควบคุมส่งเคสกลับเพื่อบันทึกข้อมูลเพิ่มเติม',
          timestampLabel: entry.date,
          statusLabel: 'ต้องแก้ไข E-Logbook',
          targetTab: 'logbook',
          actionLabel: 'แก้ไขใน E-Logbook',
        });
      } else {
        items.push({
          id: `notif-log-${entry.id}`,
          category: 'logbook',
          priority: 'success',
          title: `รับรองผล E-Logbook แล้ว: ${entry.diagnosis}`,
          subtitle: `เคส ${entry.caseCode} · ${entry.department} · อาจารย์${entry.preceptor}`,
          detail: entry.feedback ? `ความเห็นอาจารย์: "${entry.feedback}"` : 'อาจารย์รับรองรายการเรียบร้อยแล้ว',
          timestampLabel: entry.date,
          statusLabel: 'อาจารย์รับรองแล้ว',
          targetTab: 'logbook',
          actionLabel: 'ดูบันทึก E-Logbook',
        });
      }
    });

    // 3. Shift Swap Request Status Updates
    shifts
      .filter((shift) => shift.swapStatus === 'requested' || shift.swapStatus === 'approved')
      .forEach((shift) => {
        const involvesCurrentStudent =
          shift.assignedStudent === currentStudentName ||
          (shift.swapNote?.includes('ธนภัทร') ?? false);

        if (shift.swapStatus === 'requested') {
          items.push({
            id: `notif-swap-${shift.id}`,
            category: 'swap',
            priority: involvesCurrentStudent ? 'urgent' : 'info',
            title: `คำขอแลกเวร${involvesCurrentStudent ? ' (เกี่ยวข้องกับคุณ)' : ''}: ${shift.department}`,
            subtitle: `${shift.dayLabel} ${shift.date} · ${shift.timeRange} น. · ${shift.assignedStudent}`,
            detail: shift.swapNote
              ? shift.swapNote
              : 'อยู่ระหว่างรออาจารย์ประจำกลุ่มงานหรือฝ่ายวิชาการพิจารณาอนุมัติ',
            timestampLabel: shift.date,
            statusLabel: 'รอพิจารณาอนุมัติแลกเวร',
            targetTab: 'curriculum',
            actionLabel: 'ตรวจสอบในปฏิทินเวร',
          });
        } else if (shift.swapStatus === 'approved') {
          items.push({
            id: `notif-swap-${shift.id}`,
            category: 'swap',
            priority: 'success',
            title: `อนุมัติการแลกเวรแล้ว: ${shift.department}`,
            subtitle: `${shift.dayLabel} ${shift.date} · ${shift.timeRange} น. · ผู้รับผิดชอบ: ${shift.assignedStudent}`,
            detail: shift.swapNote
              ? shift.swapNote
              : `อนุมัติการสลับเวรโดย ${shift.supervisingStaff}`,
            timestampLabel: shift.date,
            statusLabel: 'อนุมัติแลกเวรแล้ว',
            targetTab: 'curriculum',
            actionLabel: 'ดูปฏิทินตารางเวร',
          });
        }
      });

    // Sort urgent items first, then success, then info
    const priorityRank = { urgent: 0, success: 1, info: 2 };
    return items.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
  }, [exams, logbookEntries, shifts, currentStudentName]);

  const counts = useMemo(() => {
    return {
      all: notifications.length,
      osce: notifications.filter((n) => n.category === 'osce').length,
      logbook: notifications.filter((n) => n.category === 'logbook').length,
      swap: notifications.filter((n) => n.category === 'swap').length,
      unread: notifications.filter((n) => !readIds.includes(n.id)).length,
    };
  }, [notifications, readIds]);

  const visibleNotifications =
    filterCategory === 'all'
      ? notifications
      : notifications.filter((n) => n.category === filterCategory);

  const handleMarkRead = (id: string) => {
    setReadIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const handleMarkAllRead = () => {
    setReadIds(notifications.map((n) => n.id));
  };

  return (
    <section
      aria-label="ศูนย์แจ้งเตือนนักศึกษา"
      className="bg-white border border-slate-200 rounded-xl overflow-hidden"
    >
      {/* Panel Header */}
      <div className="px-6 py-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#0F2A4A]/8 text-[#0F2A4A] flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
                การแจ้งเตือนและการติดตามสถานะ (Notifications)
              </h2>
              <span className="text-xs font-semibold text-[#0F2A4A] tabular-nums">
                ยังไม่อ่าน {counts.unread} / {counts.all} รายการ
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              แจ้งเตือนกำหนดสอบ OSCE ใกล้ถึง ข้อเสนอแนะการรับรอง E-Logbook จากอาจารย์ และความคืบหน้าคำขอแลกเวร
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {counts.unread > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 cursor-pointer whitespace-nowrap shrink-0"
            >
              <CheckCheck className="w-3.5 h-3.5 text-[#0F2A4A]" aria-hidden="true" />
              <span>ทำเครื่องหมายว่าอ่านแล้วทั้งหมด</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Bar */}
      <div className="px-6 py-3 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 p-1 bg-slate-200/70 rounded-lg">
          {(
            [
              { id: 'all', label: 'ทั้งหมด', count: counts.all },
              { id: 'osce', label: 'กำหนดสอบ OSCE', count: counts.osce },
              { id: 'logbook', label: 'ผลรับรอง E-Logbook', count: counts.logbook },
              { id: 'swap', label: 'สถานะแลกเวร', count: counts.swap },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterCategory(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 tabular-nums ${
                filterCategory === tab.id
                  ? 'bg-white text-[#0F2A4A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-500 tabular-nums">
          อัปเดตล่าสุดจากข้อมูลการประเมินและตารางเวรปัจจุบัน
        </div>
      </div>

      {/* Notification Items Grid / List */}
      {visibleNotifications.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-slate-500">
          ไม่มีรายการแจ้งเตือนในหมวดหมู่ที่เลือก
        </div>
      ) : (
        <div className="divide-y divide-slate-200">
          {visibleNotifications.map((item) => {
            const isRead = readIds.includes(item.id);

            const CategoryIcon =
              item.category === 'osce'
                ? CalendarClock
                : item.category === 'logbook'
                  ? BookOpenCheck
                  : RefreshCw;

            const iconBg =
              item.priority === 'urgent'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : item.priority === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-sky-50 text-[#0F2A4A] border-sky-200';

            const statusTextClass =
              item.priority === 'urgent'
                ? 'text-amber-700'
                : item.priority === 'success'
                  ? 'text-emerald-700'
                  : 'text-[#0F2A4A]';

            return (
              <div
                key={item.id}
                className={`px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                  isRead ? 'bg-white opacity-75' : 'bg-slate-50/40 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${iconBg}`}
                  >
                    {item.priority === 'urgent' && item.category === 'logbook' ? (
                      <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                    ) : item.priority === 'success' ? (
                      <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <CategoryIcon className="w-4 h-4" aria-hidden="true" />
                    )}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                      <span className={`font-semibold ${statusTextClass}`}>
                        {item.statusLabel}
                      </span>
                      <span className="text-slate-300" aria-hidden="true">
                        ·
                      </span>
                      <span className="font-mono text-slate-500 tabular-nums">
                        {item.timestampLabel}
                      </span>
                      {!isRead && (
                        <>
                          <span className="text-slate-300" aria-hidden="true">
                            ·
                          </span>
                          <span className="font-semibold text-[#0F2A4A]">ใหม่</span>
                        </>
                      )}
                    </div>

                    <h3 className="text-sm font-semibold text-slate-900 leading-snug">
                      {item.title}
                    </h3>

                    <div className="text-xs text-slate-500">{item.subtitle}</div>

                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                      {item.detail}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 md:pl-4">
                  {!isRead && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(item.id)}
                      title="ทำเครื่องหมายว่าอ่านแล้ว"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>รับทราบ</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      handleMarkRead(item.id);
                      onNavigateTab(item.targetTab);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0F2A4A] bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{item.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
