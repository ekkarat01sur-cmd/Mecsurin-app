import { useMemo, useState } from 'react';
import {
  Award,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  Lock,
  ShieldCheck,
  Stethoscope,
  Users,
} from 'lucide-react';
import {
  ClinicalBadgeCategory,
  ClinicalMilestoneBadge,
} from '../types/medicalSchool';

interface ClinicalMilestoneBadgesPanelProps {
  studentName: string;
  badges: ClinicalMilestoneBadge[];
  onOpenStudentDirectory?: () => void;
}

export function BadgeGlyph({
  iconKey,
  className = 'w-5 h-5',
}: {
  iconKey: ClinicalMilestoneBadge['iconKey'];
  className?: string;
}) {
  switch (iconKey) {
    case 'shield':
      return <ShieldCheck className={className} aria-hidden="true" />;
    case 'award':
      return <Award className={className} aria-hidden="true" />;
    case 'stethoscope':
      return <Stethoscope className={className} aria-hidden="true" />;
    case 'clipboard':
      return <ClipboardCheck className={className} aria-hidden="true" />;
    case 'users':
      return <Users className={className} aria-hidden="true" />;
    case 'sparkles':
      return <BookOpenCheck className={className} aria-hidden="true" />;
  }
}

export function ClinicalMilestoneBadgesPanel({
  studentName,
  badges,
  onOpenStudentDirectory,
}: ClinicalMilestoneBadgesPanelProps) {
  const [categoryFilter, setCategoryFilter] = useState<'ทั้งหมด' | ClinicalBadgeCategory>(
    'ทั้งหมด'
  );
  const [earnedFilter, setEarnedFilter] = useState<'all' | 'earned' | 'in_progress'>(
    'all'
  );

  const earnedCount = useMemo(
    () => badges.filter((b) => b.earned).length,
    [badges]
  );

  const filteredBadges = useMemo(() => {
    return badges.filter((b) => {
      const matchCategory =
        categoryFilter === 'ทั้งหมด' || b.category === categoryFilter;
      const matchEarned =
        earnedFilter === 'all' ||
        (earnedFilter === 'earned' && b.earned) ||
        (earnedFilter === 'in_progress' && !b.earned);
      return matchCategory && matchEarned;
    });
  }, [badges, categoryFilter, earnedFilter]);

  const tierEmblemClass = (badge: ClinicalMilestoneBadge) => {
    if (!badge.earned) return 'bg-slate-100 text-slate-400 border border-slate-200';
    if (badge.tier === 'gold') return 'bg-amber-700 text-white';
    if (badge.tier === 'teal') return 'bg-[#0F766E] text-white';
    return 'bg-[#0F2A4A] text-white';
  };

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
            <span className="font-semibold text-[#0F766E]">
              ตราสัญลักษณ์ความสำเร็จทางคลินิก (Clinical Milestone Badges)
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              ได้รับแล้ว <strong className="text-slate-900">{earnedCount}</strong> / {badges.length} รายการ
            </span>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-[#0F2A4A]" aria-hidden="true" />
            <span>เกียรติคุณและเหรียญความก้าวหน้าของ {studentName}</span>
          </h2>
          <p className="text-xs text-slate-500">
            คำนวณอัตโนมัติจากระดับสมรรถนะ EPA โควตาหัตถการที่ทำครบ และกิจกรรมการมีส่วนร่วมในหอผู้ป่วย โดยแสดงผลบนโปรไฟล์และทำเนียบนักศึกษา
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenStudentDirectory && (
            <button
              type="button"
              onClick={onOpenStudentDirectory}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#0F2A4A] bg-slate-50 border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Users className="w-3.5 h-3.5" aria-hidden="true" />
              <span>ดูบนทำเนียบนักศึกษา</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-lg self-start">
          {(
            [
              'ทั้งหมด',
              'สมรรถนะ EPA',
              'หัตถการคลินิก',
              'การมีส่วนร่วมทางคลินิก',
            ] as const
          ).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-white text-[#0F2A4A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="inline-flex items-center p-1 bg-slate-100 border border-slate-200 rounded-lg self-start">
          {(
            [
              { id: 'all', label: 'ทั้งหมด' },
              { id: 'earned', label: `ได้รับแล้ว (${earnedCount})` },
              { id: 'in_progress', label: `กำลังสะสม (${badges.length - earnedCount})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setEarnedFilter(tab.id)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                earnedFilter === tab.id
                  ? 'bg-white text-[#0F2A4A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredBadges.map((badge) => {
          const pct = Math.min(
            100,
            Math.round((badge.progressCurrent / Math.max(1, badge.progressTarget)) * 100)
          );

          return (
            <div
              key={badge.id}
              className={`border rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-4 transition-colors ${
                badge.earned
                  ? 'border-slate-300 bg-white'
                  : 'border-slate-200 bg-slate-50/70'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${tierEmblemClass(
                    badge
                  )}`}
                >
                  <BadgeGlyph iconKey={badge.iconKey} className="w-5 h-5" />
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
                    <span className="font-medium text-slate-700">{badge.category}</span>
                    <span aria-hidden="true">·</span>
                    {badge.earned ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                        ผ่านเกณฑ์แล้ว
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <Lock className="w-3 h-3" aria-hidden="true" />
                        กำลังสะสม
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-semibold text-slate-900 leading-snug">
                    {badge.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {badge.description}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500 truncate">{badge.criteriaText}</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums shrink-0">
                    {badge.progressCurrent}/{badge.progressTarget} {badge.progressUnit}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      badge.earned ? 'bg-[#0F766E]' : 'bg-[#0F2A4A]/65'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
