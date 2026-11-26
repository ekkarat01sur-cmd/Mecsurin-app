import {
  Award,
  BookOpen,
  CalendarDays,
  ClipboardList,
  Home,
} from 'lucide-react';
import { ActiveTab } from '../types/medicalSchool';

interface MobileBottomNavProps {
  activeTab: ActiveTab;
  isAuthenticated?: boolean;
  onSelectTab: (tab: ActiveTab) => void;
}

const MOBILE_TABS: Array<{
  id: ActiveTab;
  label: string;
  icon: typeof Home;
}> = [
  { id: 'overview', label: 'หน้าหลัก', icon: Home },
  { id: 'curriculum', label: 'ตารางเวร', icon: CalendarDays },
  { id: 'logbook', label: 'Logbook', icon: ClipboardList },
  { id: 'assessment', label: 'ประเมินผล', icon: Award },
  { id: 'library', label: 'คลังความรู้', icon: BookOpen },
];

export function MobileBottomNav({
  activeTab,
  isAuthenticated = true,
  onSelectTab,
}: MobileBottomNavProps) {
  if (!isAuthenticated) return null;

  const handleSelect = (tab: ActiveTab) => {
    onSelectTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav
      aria-label="แถบนำทางสำหรับสมาร์ทโฟนและแท็บเล็ต"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#091A32]/95 backdrop-blur-xl border-t border-white/10 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(9,26,50,0.28)]"
    >
      <div className="grid grid-cols-5 items-stretch">
        {MOBILE_TABS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              className={`relative min-h-[54px] px-1 py-1.5 flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                isActive
                  ? 'text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <span
                  className="absolute top-0 inset-x-3 h-[2.5px] bg-[#2DD4BF] rounded-b-xs"
                  aria-hidden="true"
                />
              )}
              <Icon
                className={`w-5 h-5 shrink-0 ${
                  isActive ? 'text-[#2DD4BF]' : 'text-slate-400'
                }`}
                aria-hidden="true"
              />
              <span className="text-[11px] leading-tight whitespace-nowrap truncate max-w-full">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
