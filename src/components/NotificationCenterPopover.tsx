import { useEffect, useRef, useState } from 'react';
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  ExternalLink,
  Send,
  Settings2,
  X,
} from 'lucide-react';
import {
  ActiveTab,
  NotificationCategory,
  NotificationChannelSettings,
  PortalNotificationItem,
  UserRole,
} from '../types/medicalSchool';
import { dispatchTestNotificationWebhook } from '../utils/portalSyncClient';

interface NotificationCenterPopoverProps {
  role: UserRole;
  authToken: string | null;
  notifications: PortalNotificationItem[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onNavigateTab: (tab: ActiveTab) => void;
  settings: NotificationChannelSettings;
  onSaveSettings: (next: NotificationChannelSettings) => void;
  onNotify: (msg: string) => void;
}

const CATEGORY_LABELS: Record<'all' | NotificationCategory, string> = {
  all: 'ทั้งหมด',
  shift: 'ตารางเวร',
  leave: 'ใบลา & แลกเวร',
  logbook: 'E-Logbook',
  exam: 'สอบ & เกรด',
  announcement: 'ประกาศ',
};

export function NotificationCenterPopover({
  role,
  authToken,
  notifications,
  onMarkRead,
  onMarkAllRead,
  onNavigateTab,
  settings,
  onSaveSettings,
  onNotify,
}: NotificationCenterPopoverProps) {
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'feed' | 'settings'>('feed');
  const [categoryFilter, setCategoryFilter] = useState<'all' | NotificationCategory>('all');
  const [draftUrl, setDraftUrl] = useState(settings.webhookUrl);
  const [draftHours, setDraftHours] = useState(settings.alertBeforeShiftHours);
  const [sendingTest, setSendingTest] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDraftUrl(settings.webhookUrl);
    setDraftHours(settings.alertBeforeShiftHours);
  }, [settings]);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const canConfigureChannels = role === 'admin' || role === 'course_officer';

  const visibleItems =
    categoryFilter === 'all'
      ? notifications
      : notifications.filter((n) => n.category === categoryFilter);

  const handleToggleBrowserPush = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      onNotify('เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือนแบบ Push');
      return;
    }
    if (!settings.enableBrowserPush) {
      const permission = await window.Notification.requestPermission();
      if (permission !== 'granted') {
        onNotify('ไม่ได้รับอนุญาตการแจ้งเตือนจากเบราว์เซอร์');
        return;
      }
      onSaveSettings({ ...settings, enableBrowserPush: true });
      new window.Notification('ศูนย์แพทยศาสตรศึกษาชั้นคลินิก รพ.สุรินทร์', {
        body: 'เปิดรับการแจ้งเตือนเวรปฏิบัติงานและสถานะ E-Logbook แล้ว',
      });
      onNotify('เปิดใช้งานการแจ้งเตือนผ่านเบราว์เซอร์แล้ว');
    } else {
      onSaveSettings({ ...settings, enableBrowserPush: false });
      onNotify('ปิดการแจ้งเตือนผ่านเบราว์เซอร์แล้ว');
    }
  };

  const handleSaveChannelSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      ...settings,
      webhookUrl: draftUrl.trim(),
      alertBeforeShiftHours: Math.max(1, Math.min(48, Number(draftHours) || 4)),
    });
    onNotify('บันทึกการตั้งค่าช่องทางแจ้งเตือนแล้ว');
  };

  const handleTestWebhook = async () => {
    if (!draftUrl.trim()) {
      onNotify('กรุณาระบุ Webhook URL (https://...) ก่อนทดสอบส่ง');
      return;
    }
    setSendingTest(true);
    const res = await dispatchTestNotificationWebhook(authToken, {
      webhookUrl: draftUrl.trim(),
      title: 'แจ้งเตือนทดสอบจากพอร์ทัล ศพค. รพ.สุรินทร์',
      message: `มีรายการรอตรวจสอบ ${unreadCount} รายการในระบบพอร์ทัล`,
    });
    setSendingTest(false);
    if (res.ok) {
      onSaveSettings({
        ...settings,
        webhookEnabled: true,
        webhookUrl: draftUrl.trim(),
      });
      onNotify('ส่งสัญญาณแจ้งเตือนทดสอบไปยัง Webhook เรียบร้อยแล้ว');
    } else {
      onNotify(res.error || 'ไม่สามารถส่งทดสอบ Webhook ได้');
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        aria-label={`ศูนย์แจ้งเตือน (${unreadCount} รายการยังไม่อ่าน)`}
        aria-expanded={open}
      >
        {unreadCount > 0 ? (
          <BellRing className="w-3.5 h-3.5 text-[#0D9488]" aria-hidden="true" />
        ) : (
          <Bell className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
        )}
        <span className="hidden sm:inline">แจ้งเตือน</span>
        {unreadCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[11px] font-bold text-white bg-[#0D9488] rounded tabular-nums">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed sm:absolute right-3 left-3 sm:left-auto sm:right-0 top-24 sm:top-full sm:mt-2 sm:w-[430px] z-50 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          role="dialog"
          aria-label="ศูนย์แจ้งเตือนพอร์ทัล"
        >
          {/* Header */}
          <div className="px-4 py-3 bg-[#091A32] text-white flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">ศูนย์แจ้งเตือนอัตโนมัติ</div>
              <div className="text-[11px] text-slate-300 tabular-nums">
                ยังไม่อ่าน {unreadCount} จาก {notifications.length} รายการ
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {canConfigureChannels && (
                <button
                  type="button"
                  onClick={() => setViewMode((m) => (m === 'feed' ? 'settings' : 'feed'))}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    viewMode === 'settings'
                      ? 'bg-[#2DD4BF] text-[#06202A]'
                      : 'bg-white/10 text-slate-200 hover:bg-white/20'
                  }`}
                >
                  <Settings2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{viewMode === 'settings' ? 'ดูรายการ' : 'ตั้งค่า'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 text-slate-300 hover:text-white rounded-md cursor-pointer"
                aria-label="ปิดศูนย์แจ้งเตือน"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {viewMode === 'feed' ? (
            <>
              {/* Filter + Mark all read */}
              <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                  {(Object.keys(CATEGORY_LABELS) as Array<'all' | NotificationCategory>).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        categoryFilter === cat
                          ? 'bg-[#0F2A4A] text-white'
                          : 'text-slate-600 hover:bg-slate-200/70'
                      }`}
                    >
                      {CATEGORY_LABELS[cat]}
                    </button>
                  ))}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={onMarkAllRead}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0F766E] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5" aria-hidden="true" />
                    อ่านทั้งหมด
                  </button>
                )}
              </div>

              {/* Feed items */}
              <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
                {visibleItems.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    ไม่มีรายการแจ้งเตือนในหมวดหมู่นี้
                  </div>
                ) : (
                  visibleItems.map((item) => (
                    <div
                      key={item.id}
                      className={`px-4 py-3 transition-colors ${
                        item.read ? 'bg-white' : 'bg-teal-50/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 tabular-nums">
                            <span className={item.urgent ? 'font-semibold text-rose-700' : 'font-medium text-[#0F766E]'}>
                              {CATEGORY_LABELS[item.category]}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{item.timeLabel}</span>
                            {!item.read && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-semibold text-[#0F2A4A]">ใหม่</span>
                              </>
                            )}
                          </div>
                          <div className="text-xs font-semibold text-slate-900 leading-snug">
                            {item.title}
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">{item.detail}</p>
                        </div>

                        {!item.read && (
                          <button
                            type="button"
                            onClick={() => onMarkRead(item.id)}
                            className="p-1 text-slate-400 hover:text-[#0F766E] rounded cursor-pointer shrink-0"
                            title="ทำเครื่องหมายว่าอ่านแล้ว"
                            aria-label="ทำเครื่องหมายว่าอ่านแล้ว"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="mt-2 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            onMarkRead(item.id);
                            onNavigateTab(item.targetTab);
                            setOpen(false);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0F2A4A] hover:text-[#0D9488] cursor-pointer"
                        >
                          <span>เปิดดูรายการนี้</span>
                          <ExternalLink className="w-3 h-3" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer browser push toggle */}
              <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-600">การแจ้งเตือนบนเบราว์เซอร์ (Web Push)</span>
                <button
                  type="button"
                  onClick={() => void handleToggleBrowserPush()}
                  className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                    settings.enableBrowserPush
                      ? 'bg-emerald-700 text-white'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {settings.enableBrowserPush ? 'เปิดอยู่' : 'เปิดใช้งาน'}
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleSaveChannelSettings} className="p-4 space-y-4 overflow-y-auto text-xs">
              <div className="space-y-1">
                <div className="font-semibold text-slate-900">
                  ตั้งค่าช่องทางส่งแจ้งเตือนอัตโนมัติ (LINE Relay / Webhook)
                </div>
                <p className="text-slate-500 leading-relaxed">
                  เชื่อม Google Apps Script / LINE Messaging API หรือ Webhook องค์กร เพื่อแจ้งเตือนเมื่อมีคำขอแลกเวร ใบลา หรือ E-Logbook รอรับรอง
                </p>
              </div>

              <label className="flex items-center justify-between gap-2 py-2 border-y border-slate-100 cursor-pointer">
                <span className="font-medium text-slate-800">เปิดใช้งานการแจ้งเตือนบนหน้าเว็บ</span>
                <input
                  type="checkbox"
                  checked={settings.enableInAppAlerts}
                  onChange={(e) =>
                    onSaveSettings({ ...settings, enableInAppAlerts: e.target.checked })
                  }
                  className="w-4 h-4 accent-[#0D9488]"
                />
              </label>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  แจ้งเตือนล่วงหน้าก่อนขึ้นเวร (ชั่วโมง)
                </label>
                <input
                  type="number"
                  min={1}
                  max={48}
                  value={draftHours}
                  onChange={(e) => setDraftHours(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg tabular-nums"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Webhook URL (HTTPS เท่านั้น)
                </label>
                <input
                  type="url"
                  value={draftUrl}
                  onChange={(e) => setDraftUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 font-semibold text-white bg-[#0F2A4A] hover:bg-[#163B66] rounded-lg cursor-pointer"
                >
                  บันทึกการตั้งค่า
                </button>
                <button
                  type="button"
                  disabled={sendingTest}
                  onClick={() => void handleTestWebhook()}
                  className="inline-flex items-center gap-1.5 py-2 px-3 font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] disabled:opacity-60 rounded-lg cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{sendingTest ? 'กำลังส่ง...' : 'ทดสอบส่ง'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
