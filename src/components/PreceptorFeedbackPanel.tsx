import { useMemo, useState } from 'react';
import {
  BarChart3,
  Download,
  Lock,
  MessageSquareHeart,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { PreceptorFeedback, UserRole } from '../types/medicalSchool';

interface PreceptorFeedbackPanelProps {
  role: UserRole;
  feedbacks: PreceptorFeedback[];
  onAddFeedback: (item: Omit<PreceptorFeedback, 'id' | 'submittedAt'>) => void;
}

const DEPARTMENTS = [
  'กลุ่มงานอายุรศาสตร์',
  'กลุ่มงานศัลยศาสตร์',
  'กลุ่มงานสูติศาสตร์-นรีเวชวิทยา',
  'กลุ่มงานกุมารเวชศาสตร์',
  'กลุ่มงานเวชศาสตร์ฉุกเฉิน',
  'กลุ่มงานออร์โธปิดิกส์',
];

const COURSE_CODES = [
  'SUR-MED-401',
  'SUR-SURG-402',
  'SUR-OBG-501',
  'SUR-PED-502',
  'SUR-EM-601',
  'SUR-ORTHO-503',
];

const PRECEPTORS = [
  'นพ.เอกรัตน์ วัฒนสุรินทร์',
  'พญ.นภัสสร สุขเจริญ',
  'นพ.ภูริทัต ศรีสวัสดิ์',
  'นพ.กิตติพงษ์ จันทรา',
  'พญ.ศิริพร วงศ์สุวรรณ',
  'พญ.ภิญญดา แก้วปลั่ง',
];

const ANONYMITY_THRESHOLD = 3;

export function PreceptorFeedbackPanel({
  role,
  feedbacks,
  onAddFeedback,
}: PreceptorFeedbackPanelProps) {
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [courseCode, setCourseCode] = useState(COURSE_CODES[0]);
  const [preceptorName, setPreceptorName] = useState(PRECEPTORS[0]);
  const [rotationPeriod, setRotationPeriod] = useState('รอบที่ 2 (พ.ย. – ธ.ค. 2569)');
  const [teachingScore, setTeachingScore] = useState(5);
  const [feedbackScore, setFeedbackScore] = useState(5);
  const [atmosphereScore, setAtmosphereScore] = useState(5);
  const [safetyCultureScore, setSafetyCultureScore] = useState(5);
  const [comment, setComment] = useState('');
  const [filterDept, setFilterDept] = useState<string>('ทั้งหมด');

  const isQaManager = role === 'admin' || role === 'course_officer';
  const canViewAnalytics = role === 'admin' || role === 'course_officer' || role === 'faculty';

  const filteredFeedbacks = useMemo(
    () =>
      filterDept === 'ทั้งหมด'
        ? feedbacks
        : feedbacks.filter((f) => f.department === filterDept),
    [feedbacks, filterDept]
  );

  const dimensionAverages = useMemo(() => {
    const source = filteredFeedbacks;
    if (source.length === 0) {
      return {
        teaching: 0,
        feedback: 0,
        atmosphere: 0,
        safety: 0,
        overall: 0,
      };
    }
    const teaching =
      source.reduce((sum, f) => sum + f.teachingScore, 0) / source.length;
    const feedback =
      source.reduce((sum, f) => sum + f.feedbackScore, 0) / source.length;
    const atmosphere =
      source.reduce((sum, f) => sum + f.atmosphereScore, 0) / source.length;
    const safety =
      source.reduce((sum, f) => sum + (f.safetyCultureScore ?? f.atmosphereScore), 0) /
      source.length;
    return {
      teaching,
      feedback,
      atmosphere,
      safety,
      overall: (teaching + feedback + atmosphere + safety) / 4,
    };
  }, [filteredFeedbacks]);

  const departmentBreakdown = useMemo(() => {
    const map = new Map<string, PreceptorFeedback[]>();
    for (const f of feedbacks) {
      const list = map.get(f.department) ?? [];
      list.push(f);
      map.set(f.department, list);
    }
    return Array.from(map.entries()).map(([dept, items]) => {
      const avg =
        items.reduce(
          (sum, f) =>
            sum +
            (f.teachingScore +
              f.feedbackScore +
              f.atmosphereScore +
              (f.safetyCultureScore ?? f.atmosphereScore)) /
              4,
          0
        ) / items.length;
      return { dept, count: items.length, avg };
    });
  }, [feedbacks]);

  // Privacy guard: For non-QA faculty viewing filtered comments with < 3 submissions,
  // suppress raw comments to prevent de-anonymization.
  const commentStreamAllowed =
    isQaManager ||
    role === 'student' ||
    filteredFeedbacks.length >= ANONYMITY_THRESHOLD;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    onAddFeedback({
      department,
      courseCode,
      preceptorName,
      rotationPeriod,
      teachingScore,
      feedbackScore,
      atmosphereScore,
      safetyCultureScore,
      comment: comment.trim(),
    });
    setComment('');
  };

  const handleExportQaCsv = () => {
    const header = [
      'SubmittedAt',
      'Department',
      'CourseCode',
      'Preceptor',
      'RotationPeriod',
      'TeachingScore',
      'FeedbackScore',
      'AtmosphereScore',
      'SafetyCultureScore',
      'Comment',
    ];
    const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [
      header.join(','),
      ...filteredFeedbacks.map((f) =>
        [
          f.submittedAt,
          f.department,
          f.courseCode ?? '-',
          f.preceptorName,
          f.rotationPeriod,
          f.teachingScore,
          f.feedbackScore,
          f.atmosphereScore,
          f.safetyCultureScore ?? f.atmosphereScore,
          f.comment,
        ]
          .map(escape)
          .join(',')
      ),
    ];
    const blob = new Blob(['\uFEFF' + lines.join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `surin-mec-qa-evaluation-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <MessageSquareHeart className="w-5 h-5 text-[#0F2A4A]" aria-hidden="true" />
            ระบบประเมินอาจารย์แพทย์และหลักสูตรแบบไม่ระบุตัวตน (WFME Two-Way QA)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            ระบบไม่บันทึกรหัสหรือชื่อนักศึกษาผู้ส่งลงฐานข้อมูล (Zero-Identity Storage) เพื่อความปลอดภัยทางจิตใจในการสะท้อนผลพัฒนาการเรียนการสอน
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-right shrink-0">
          <div className="text-xs text-slate-500">คะแนนความพึงพอใจรวม</div>
          <div className="text-xl font-bold text-[#0F2A4A] tabular-nums">
            {dimensionAverages.overall.toFixed(2)} / 5.00
          </div>
        </div>
      </div>

      {/* Aggregated Analytics Breakdown */}
      {canViewAnalytics && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4.5 h-4.5 text-[#0D9488]" aria-hidden="true" />
                ผลวิเคราะห์คุณภาพการสอนรายด้านและรายกลุ่มงาน (QA Analytics)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                อ้างอิงจากแบบประเมินทั้งหมด {filteredFeedbacks.length} ชุด
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
              >
                <option value="ทั้งหมด">ทุกกลุ่มงานคลินิก</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              {isQaManager && (
                <button
                  type="button"
                  onClick={handleExportQaCsv}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>ส่งออก QA CSV</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-3">
              {[
                { label: '1. คุณภาพการสอนข้างเตียง (Bedside Teaching)', value: dimensionAverages.teaching },
                { label: '2. การให้ข้อมูลป้อนกลับ (Constructive Feedback)', value: dimensionAverages.feedback },
                { label: '3. บรรยากาศการเรียนรู้และความสมดุลภาระงาน', value: dimensionAverages.atmosphere },
                { label: '4. ความปลอดภัยทางคลินิก (Psychological Safety)', value: dimensionAverages.safety },
              ].map((dim) => {
                const pct = Math.min(100, Math.round((dim.value / 5) * 100));
                return (
                  <div key={dim.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-700 font-medium">{dim.label}</span>
                      <span className="font-semibold text-[#0F2A4A] tabular-nums">
                        {dim.value.toFixed(2)} / 5.00
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#0D9488] rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-slate-200 pt-4 lg:pt-0 lg:pl-6 space-y-2.5">
              <div className="text-xs font-semibold text-slate-800">สรุปคะแนนเฉลี่ยรายกลุ่มงาน</div>
              {departmentBreakdown.length === 0 ? (
                <div className="text-xs text-slate-500">ยังไม่มีข้อมูลการประเมิน</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {departmentBreakdown.map((item) => (
                    <div key={item.dept} className="py-2 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 truncate">{item.dept}</div>
                        <div className="text-[11px] text-slate-500 tabular-nums">
                          {item.count} แบบประเมิน
                        </div>
                      </div>
                      <div className="font-bold text-[#0F2A4A] tabular-nums shrink-0">
                        {item.avg.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Submit Anonymous Evaluation Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-base font-semibold text-slate-900">
              ส่งแบบประเมินรายวิชา / อาจารย์แพทย์
            </h3>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              ไม่ระบุชื่อผู้ส่ง
            </span>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">กลุ่มงาน / ภาควิชา</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">รหัสรายวิชา</label>
                <select
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg font-mono"
                >
                  {COURSE_CODES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">อาจารย์แพทย์ผู้สอน</label>
              <select
                value={preceptorName}
                onChange={(e) => setPreceptorName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              >
                {PRECEPTORS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">รอบการฝึกปฏิบัติงาน</label>
              <input
                type="text"
                value={rotationPeriod}
                onChange={(e) => setRotationPeriod(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <div className="space-y-2.5 pt-1">
              {[
                { label: '1. การสอนข้างเตียง (Bedside Teaching)', val: teachingScore, setter: setTeachingScore },
                { label: '2. การให้ข้อมูลป้อนกลับ (Feedback)', val: feedbackScore, setter: setFeedbackScore },
                { label: '3. บรรยากาศและสมดุลภาระงาน', val: atmosphereScore, setter: setAtmosphereScore },
                { label: '4. ความปลอดภัยในการซักถาม/เรียนรู้', val: safetyCultureScore, setter: setSafetyCultureScore },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-700">{item.label}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <button
                        key={score}
                        type="button"
                        onClick={() => item.setter(score)}
                        className={`w-7 h-7 rounded-md font-semibold tabular-nums cursor-pointer transition-colors ${
                          item.val >= score
                            ? 'bg-[#0F2A4A] text-white'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                ข้อเสนอแนะเชิงสร้างสรรค์เพื่อพัฒนาการเรียนการสอน
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="จุดเด่นของรายวิชา หรือข้อเสนอแนะเพิ่มเติมในการจัดกิจกรรมวิชาการ..."
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 text-sm font-medium text-white bg-[#0F2A4A] rounded-lg hover:bg-[#163B66] cursor-pointer"
          >
            ส่งแบบประเมินแบบไม่ระบุตัวตน (Anonymous)
          </button>
        </form>

        {/* Aggregated Feedback Feed */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-base font-semibold text-slate-900">
              ข้อเสนอแนะเชิงสร้างสรรค์ล่าสุด ({filteredFeedbacks.length} รายการ)
            </h3>
            <span className="text-xs text-slate-500">
              {isQaManager ? 'มุมมองฝ่ายวิชาการ (QA)' : 'สรุปผลแบบนิรนาม'}
            </span>
          </div>

          {!commentStreamAllowed ? (
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F2A4A]">
                <Lock className="w-4 h-4 text-[#0D9488]" aria-hidden="true" />
                คุ้มครองความเป็นส่วนตัวผู้ประเมิน (Anonymity Threshold)
              </div>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                กลุ่มงานที่เลือกมีข้อเสนอแนะน้อยกว่า {ANONYMITY_THRESHOLD} รายการ ระบบจึงแสดงเฉพาะค่าเฉลี่ยรวมด้านบน และซ่อนข้อความรายบุคคลเพื่อป้องกันการระบุตัวตนนักศึกษา
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredFeedbacks.map((item) => {
                const avg = (
                  (item.teachingScore +
                    item.feedbackScore +
                    item.atmosphereScore +
                    (item.safetyCultureScore ?? item.atmosphereScore)) /
                  4
                ).toFixed(1);
                return (
                  <div key={item.id} className="py-4 first:pt-1 last:pb-1 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-slate-900">
                        {item.preceptorName} ·{' '}
                        <span className="font-normal text-slate-600">
                          {item.department}
                          {item.courseCode ? ` (${item.courseCode})` : ''}
                        </span>
                      </div>
                      <div className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 tabular-nums">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" aria-hidden="true" />
                        <span>{avg} / 5.0</span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 tabular-nums">
                      {item.rotationPeriod} · ส่งเมื่อ {item.submittedAt} · ไม่ระบุตัวตนผู้ส่ง
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{item.comment}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
