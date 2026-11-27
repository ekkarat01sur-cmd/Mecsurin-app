import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { ActiveTab } from '../types/medicalSchool';

interface HeaderProps {
  activeTab: ActiveTab;
  isAuthenticated?: boolean;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenNewLogbook: () => void;
  onOpenAuthLogin?: () => void;
}

const NAV_ITEMS: { id: ActiveTab; label: string }[] = [
  { id: 'overview', label: 'หน้าหลัก' },
  { id: 'curriculum', label: 'หลักสูตรและเวร' },
  { id: 'logbook', label: 'E-Logbook' },
  { id: 'assessment', label: 'ประเมินผล OSCE' },
  { id: 'library', label: 'คลังความรู้' },
];

export function Header({
  activeTab,
  isAuthenticated = true,
  onSelectTab,
  onOpenNewLogbook,
  onOpenAuthLogin,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (tab: ActiveTab) => {
    if (!isAuthenticated) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setMobileMenuOpen(false);
      return;
    }
    onSelectTab(tab);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 pt-[env(safe-area-inset-top)] bg-gradient-to-r from-[#04193E]/95 via-[#08347A]/95 to-[#0B46A0]/95 backdrop-blur-xl border-b border-sky-300/20 shadow-[0_8px_28px_-10px_rgba(4,25,62,0.55)]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Single-line institutional wordmark */}
        <button
          type="button"
          onClick={() => handleNavClick('overview')}
          className="text-left font-serif text-lg sm:text-xl font-bold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer hover:text-[#7DD3FC] transition-colors"
        >
          ศพค. โรงพยาบาลสุรินทร์
        </button>

        {/* Zone 2: 5 concise single-line text nav links (only when authenticated) */}
        {isAuthenticated && (
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
                      : 'text-sky-100/80 hover:text-white'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span
                      className="absolute inset-x-0 -bottom-[1px] h-[2.5px] bg-gradient-to-r from-[#38BDF8] via-[#7DD3FC] to-[#FBBF24] rounded-t-xs shadow-[0_0_10px_rgba(56,189,248,0.7)]"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </nav>
        )}

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          {isAuthenticated ? (
            <>
              <button
                type="button"
                onClick={onOpenNewLogbook}
                className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-[#04183B] bg-gradient-to-r from-[#38BDF8] to-[#22D3EE] rounded-lg hover:from-[#7DD3FC] hover:to-[#67E8F9] transition-all duration-200 shadow-[0_4px_16px_-4px_rgba(56,189,248,0.65)] whitespace-nowrap shrink-0 cursor-pointer"
              >
                บันทึกหัตถการ
              </button>

              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="lg:hidden inline-flex items-center justify-center w-11 h-11 text-sky-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                aria-label={mobileMenuOpen ? 'ปิดเมนูนำทาง' : 'เปิดเมนูนำทาง'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onOpenAuthLogin?.()}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-[#04183B] bg-gradient-to-r from-[#38BDF8] to-[#22D3EE] rounded-lg hover:from-[#7DD3FC] hover:to-[#67E8F9] transition-all duration-200 shadow-[0_4px_16px_-4px_rgba(56,189,248,0.65)] whitespace-nowrap shrink-0 cursor-pointer"
            >
              เข้าสู่ระบบ
            </button>
          )}
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isAuthenticated && mobileMenuOpen && (
        <div className="lg:hidden border-t border-sky-300/15 bg-[#051F4B] px-4 py-4 space-y-2 animate-med-fade-up">
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
                      ? 'bg-[#38BDF8]/15 text-[#7DD3FC] border border-[#38BDF8]/35'
                      : 'text-sky-100/90 hover:bg-white/10'
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
              className="w-full px-4 py-2.5 text-sm font-semibold text-[#04183B] bg-gradient-to-r from-[#38BDF8] to-[#22D3EE] rounded-lg hover:from-[#7DD3FC] hover:to-[#67E8F9] transition-colors cursor-pointer"
            >
              บันทึกหัตถการ
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
