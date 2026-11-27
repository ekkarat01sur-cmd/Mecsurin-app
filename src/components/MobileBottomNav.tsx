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
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-gradient-to-r from-[#04193E]/95 via-[#08347A]/95 to-[#0A3E8F]/95 backdrop-blur-xl border-t border-sky-300/20 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_22px_rgba(4,25,62,0.35)]"
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
                  : 'text-sky-200/70 hover:text-white'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <span
                  className="absolute top-0 inset-x-3 h-[2.5px] bg-gradient-to-r from-[#38BDF8] to-[#FBBF24] rounded-b-xs"
                  aria-hidden="true"
                />
              )}
              <Icon
                className={`w-5 h-5 shrink-0 ${
                  isActive ? 'text-[#38BDF8]' : 'text-sky-200/70'
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
