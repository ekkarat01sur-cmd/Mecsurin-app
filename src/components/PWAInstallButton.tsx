import { useState } from 'react';
import {
  Download,
  Laptop,
  Monitor,
  Share,
  Smartphone,
  Tablet,
  X,
} from 'lucide-react';
import { DevicePlatform, usePWAInstall } from '../hooks/usePWAInstall';

const PLATFORM_GUIDES: Array<{
  id: DevicePlatform;
  title: string;
  subtitle: string;
  steps: string[];
}> = [
  {
    id: 'ios',
    title: 'iPhone / iPad (iOS & iPadOS Safari)',
    subtitle: 'ติดตั้งเป็นแอปเต็มหน้าจอบน Home Screen',
    steps: [
      'เปิดเว็บไซต์นี้ด้วยแอป Safari',
      'แตะปุ่ม Share (ไอคอนสี่เหลี่ยมมีลูกศรชี้ขึ้น) ที่แถบเครื่องมือ',
      'เลื่อนลงแล้วเลือก “เพิ่มไปยังหน้าจอโฮม” (Add to Home Screen)',
      'แตะ “เพิ่ม” (Add) เพื่อใช้งานแบบแอปพลิเคชันได้ทันที',
    ],
  },
  {
    id: 'android',
    title: 'สมาร์ทโฟนและแท็บเล็ต Android (Chrome / Edge)',
    subtitle: 'ติดตั้งเป็น Web App พร้อมรองรับการใช้งานออฟไลน์',
    steps: [
      'เปิดเว็บไซต์นี้ด้วย Google Chrome หรือ Microsoft Edge',
      'แตะไอคอนเมนู ⋮ มุมขวาบนของเบราว์เซอร์',
      'เลือก “ติดตั้งแอป” (Install app) หรือ “เพิ่มไปยังหน้าจอหลัก”',
      'กดยืนยัน “ติดตั้ง” ไอคอน ศพค.สุรินทร์ จะปรากฏบนหน้าจอทันที',
    ],
  },
  {
    id: 'macos',
    title: 'เครื่อง Mac (macOS Safari / Chrome)',
    subtitle: 'เพิ่มเข้า Dock หรือติดตั้งเป็น Desktop App',
    steps: [
      'บน Safari (macOS Sonoma ขึ้นไป): คลิกเมนู File > Add to Dock...',
      'บน Google Chrome / Edge: คลิกไอคอนติดตั้ง (Install) ที่แถบ Address Bar ด้านขวา',
      'คลิก “Add” หรือ “Install” เพื่อเปิดใช้งานจาก Dock / Spotlight ได้โดยตรง',
    ],
  },
  {
    id: 'windows',
    title: 'คอมพิวเตอร์ Windows / Linux (Chrome / Edge)',
    subtitle: 'ติดตั้งเป็นแอปเดสก์ท็อปแยกหน้าต่าง',
    steps: [
      'เปิดด้วย Google Chrome หรือ Microsoft Edge',
      'คลิกไอคอน “ติดตั้ง ศพค.สุรินทร์” ที่แถบที่อยู่เว็บไซต์ด้านขวาบน',
      'กด “Install” เพื่อปักหมุดไว้ที่ Desktop หรือ Start Menu',
    ],
  },
];

export function PWAInstallButton() {
  const { isInstallable, isInstalled, platform, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handlePrimaryClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) return;
    }
    setShowGuideModal(true);
  };

  const activePlatformKey: DevicePlatform =
    platform === 'ipados' ? 'ios' : platform;

  return (
    <>
      <button
        type="button"
        onClick={() => void handlePrimaryClick()}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-medium text-[#0F2A4A] bg-slate-100 hover:bg-slate-200/80 border border-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        title="ติดตั้งแอปสำหรับ iOS, Android, macOS, Windows และแท็บเล็ต"
      >
        <Download className="w-3.5 h-3.5 text-[#0F766E]" aria-hidden="true" />
        <span>
          {isInstallable
            ? 'ติดตั้งแอปลงอุปกรณ์'
            : platform === 'ios' || platform === 'ipados'
              ? 'ติดตั้งบน iOS / iPad'
              : 'ติดตั้งแอปทุกอุปกรณ์'}
        </span>
      </button>

      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-guide-title"
        >
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200">
              <div>
                <h2
                  id="pwa-install-guide-title"
                  className="text-base sm:text-lg font-semibold text-slate-900"
                >
                  รองรับการใช้งานและติดตั้งได้ทุกระบบปฏิบัติการ
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  ใช้งานได้ทั้งคอมพิวเตอร์ (Windows / macOS / Linux), สมาร์ทโฟน และแท็บเล็ต (iOS / iPadOS / Android)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="w-10 h-10 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer shrink-0"
                aria-label="ปิดหน้าต่าง"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
              {isInstallable && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <div className="text-xs text-emerald-950 space-y-0.5">
                    <div className="font-semibold">
                      เบราว์เซอร์ของคุณพร้อมติดตั้งแอปทันที
                    </div>
                    <div className="text-emerald-800">
                      กดปุ่มด้านขวาเพื่อติดตั้งแอป ศพค.สุรินทร์ ลงบนอุปกรณ์นี้
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void install()}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium text-white bg-[#0F766E] hover:bg-[#0D625C] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>ติดตั้งทันที</span>
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {PLATFORM_GUIDES.map((guide) => {
                  const isCurrent = guide.id === activePlatformKey;
                  const Icon =
                    guide.id === 'ios'
                      ? Smartphone
                      : guide.id === 'android'
                        ? Tablet
                        : guide.id === 'macos'
                          ? Laptop
                          : Monitor;

                  return (
                    <div
                      key={guide.id}
                      className={`rounded-xl border p-4 space-y-2.5 ${
                        isCurrent
                          ? 'border-[#0F2A4A] bg-[#0F2A4A]/[0.03]'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <Icon
                            className="w-4 h-4 text-[#0F2A4A] shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                          <div>
                            <div className="text-xs font-semibold text-slate-900">
                              {guide.title}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {guide.subtitle}
                            </div>
                          </div>
                        </div>
                        {isCurrent && (
                          <span className="text-[11px] font-semibold text-[#0F766E] shrink-0">
                            อุปกรณ์ปัจจุบัน
                          </span>
                        )}
                      </div>

                      <ol className="space-y-1.5 text-xs text-slate-700 pl-4 list-decimal">
                        {guide.steps.map((step) => (
                          <li key={step} className="leading-relaxed">
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-start gap-2.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <Share className="w-4 h-4 text-[#0F2A4A] shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  เมื่อติดตั้งแล้ว ข้อมูล E-Logbook ตารางเวร และแนวทางเวชปฏิบัติที่เปิดดูแล้วจะถูกแคชไว้ให้เปิดอ่านได้อย่างรวดเร็วทั้งบน iPhone, iPad, Android, macOS และ Windows
                </span>
              </div>
            </div>

            <div className="px-5 sm:px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2 min-h-[40px] text-xs font-medium text-white bg-[#0F2A4A] hover:bg-[#163B66] rounded-lg cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
