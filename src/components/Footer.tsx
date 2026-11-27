import { ActiveTab } from '../types/medicalSchool';
import { AgencyLogo } from './AgencyLogo';

interface FooterProps {
  isAuthenticated?: boolean;
  onSelectTab: (tab: ActiveTab) => void;
}

export function Footer({ isAuthenticated = true, onSelectTab }: FooterProps) {
  return (
    <footer
      className={`mt-16 bg-gradient-to-r from-[#04183B] via-[#073070] to-[#08347A] text-sky-100/85 ${
        isAuthenticated ? 'pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0' : 'pb-0'
      }`}
    >
      <div className="med-gold-hairline w-full" aria-hidden="true" />
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-3.5">
          <AgencyLogo size="md" />
          <div className="space-y-1">
            <div className="font-serif text-base font-bold text-white">
              ศูนย์แพทยศาสตรศึกษาชั้นคลินิก โรงพยาบาลสุรินทร์
            </div>
            <p className="text-xs text-sky-200/75">
              เลขที่ 68 ถนนหลักเมือง ตำบลในเมือง อำเภอเมืองสุรินทร์ จังหวัดสุรินทร์ 32000 · โทรศัพท์ 044-511-006
            </p>
          </div>
        </div>

        {isAuthenticated && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-sky-100/85">
            <button
              type="button"
              onClick={() => onSelectTab('overview')}
              className="hover:text-[#7DD3FC] transition-colors cursor-pointer whitespace-nowrap"
            >
              หน้าหลัก
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('curriculum')}
              className="hover:text-[#7DD3FC] transition-colors cursor-pointer whitespace-nowrap"
            >
              หลักสูตรและตารางเวร
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('logbook')}
              className="hover:text-[#7DD3FC] transition-colors cursor-pointer whitespace-nowrap"
            >
              E-Logbook
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('assessment')}
              className="hover:text-[#7DD3FC] transition-colors cursor-pointer whitespace-nowrap"
            >
              ประเมินผล OSCE / EPA
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('library')}
              className="hover:text-[#7DD3FC] transition-colors cursor-pointer whitespace-nowrap"
            >
              คลังแนวทางเวชปฏิบัติ (CPG)
            </button>
          </div>
        )}
      </div>
    </footer>
  );
}
