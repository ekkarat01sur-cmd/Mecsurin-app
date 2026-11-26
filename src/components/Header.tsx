import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { ActiveTab } from '../types/medicalSchool';

interface HeaderProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenNewLogbook: () => void;
}

const NAV_ITEMS: { id: ActiveTab; label: string }[] = [
  { id: 'overview', label: 'หน้าหลัก' },
  { id: 'curriculum', label: 'หลักสูตรและเวร' },
  { id: 'logbook', label: 'E-Logbook' },
  { id: 'assessment', label: 'ประเมินผล OSCE' },
  { id: 'library', label: 'คลังความรู้' },
];

export function Header({ activeTab, onSelectTab, onOpenNewLogbook }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (tab: ActiveTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 pt-[env(safe-area-inset-top)] bg-[#091A32]/95 backdrop-blur-xl border-b border-white/10 shadow-[0_4px_20px_-8px_rgba(9,26,50,0.45)]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Single-line institutional wordmark */}
        <button
          type="button"
          onClick={() => handleNavClick('overview')}
          className="text-left font-serif text-lg sm:text-xl font-bold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer hover:text-[#5EEAD4] transition-colors"
        >
          ศพค. โรงพยาบาลสุรินทร์
        </button>

        {/* Zone 2: 5 concise single-line text nav links */}
        <nav className="hidden lg:flex items-center gap-7" aria-label="เมนูหลัก">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`relative py-2 text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  isActive
                    ? 'text-white font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    className="absolute inset-x-0 -bottom-[1px] h-[2.5px] bg-[#2DD4BF] rounded-t-xs"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenNewLogbook}
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-[#06202A] bg-[#2DD4BF] rounded-lg hover:bg-[#5EEAD4] transition-colors shadow-xs whitespace-nowrap shrink-0 cursor-pointer"
          >
            บันทึกหัตถการ
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="lg:hidden inline-flex items-center justify-center w-11 h-11 text-slate-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            aria-label={mobileMenuOpen ? 'ปิดเมนูนำทาง' : 'เปิดเมนูนำทาง'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-white/10 bg-[#0B203D] px-4 py-4 space-y-2">
          <nav className="flex flex-col space-y-1" aria-label="เมนูหลักมือถือ">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full text-left px-3 py-3 min-h-[44px] rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#2DD4BF]/15 text-[#5EEAD4] border border-[#2DD4BF]/30'
                      : 'text-slate-200 hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
          <div className="pt-2 border-t border-white/10 sm:hidden">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenNewLogbook();
              }}
              className="w-full px-4 py-2.5 text-sm font-semibold text-[#06202A] bg-[#2DD4BF] rounded-lg hover:bg-[#5EEAD4] transition-colors cursor-pointer"
            >
              บันทึกหัตถการ
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
