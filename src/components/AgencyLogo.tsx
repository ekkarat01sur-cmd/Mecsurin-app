import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { IMAGE_ASSETS } from '../data/initialMedicalData';

interface AgencyLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<AgencyLogoProps['size']>, string> = {
  xs: 'w-7 h-7 p-0.5 rounded-lg',
  sm: 'w-9 h-9 p-0.5 rounded-xl',
  md: 'w-11 h-11 p-1 rounded-xl',
  lg: 'w-14 h-14 sm:w-16 sm:h-16 p-1 rounded-2xl',
};

export function AgencyLogo({ size = 'sm', className = '' }: AgencyLogoProps) {
  const [hasError, setHasError] = useState(false);

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 bg-white/95 border border-sky-200/70 shadow-[0_4px_14px_-2px_rgba(56,189,248,0.45)] overflow-hidden ${SIZE_CLASSES[size]} ${className}`}
    >
      {hasError ? (
        <ShieldCheck className="w-2/3 h-2/3 text-[#08347A]" aria-hidden="true" />
      ) : (
        <img
          src={IMAGE_ASSETS.agencyLogo}
          alt="โลโก้ศูนย์แพทยศาสตรศึกษาชั้นคลินิก โรงพยาบาลสุรินทร์"
          loading="eager"
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          className="w-full h-full object-contain"
        />
      )}
    </div>
  );
}
