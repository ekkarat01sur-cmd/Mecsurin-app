import { useState } from 'react';
import { MessageSquareHeart, ShieldCheck, Star } from 'lucide-react';
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

const PRECEPTORS = [
  'นพ.เอกรัตน์ วัฒนสุรินทร์',
  'พญ.นภัสสร สุขเจริญ',
  'นพ.ภูริทัต ศรีสวัสดิ์',
  'นพ.กิตติพงษ์ จันทรา',
  'พญ.ศิริพร วงศ์สุวรรณ',
  'พญ.ภิญญดา แก้วปลั่ง',
];

export function PreceptorFeedbackPanel({
  role,
  feedbacks,
  onAddFeedback,
}: PreceptorFeedbackPanelProps) {
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [preceptorName, setPreceptorName] = useState(PRECEPTORS[0]);
  const [rotationPeriod, setRotationPeriod] = useState('รอบที่ 2 (พ.ย. – ธ.ค. 2569)');
  const [teachingScore, setTeachingScore] = useState(5);
  const [feedbackScore, setFeedbackScore] = useState(5);
  const [atmosphereScore, setAtmosphereScore] = useState(5);
  const [comment, setComment] = useState('');

  const avgAll =
    feedbacks.length > 0
      ? (
          feedbacks.reduce(
            (sum, f) => sum + (f.teachingScore + f.feedbackScore + f.atmosphereScore) / 3,
            0
          ) / feedbacks.length
        ).toFixed(2)
      : '0.00';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    onAddFeedback({
      department,
      preceptorName,
      rotationPeriod,
      teachingScore,
      feedbackScore,
      atmosphereScore,
      comment: comment.trim(),
    });
    setComment('');
  };

  return (
    <div className="space-y-8">
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <MessageSquareHeart className="w-5 h-5 text-[#0F2A4A]" aria-hidden="true" />
            ระบบประเมินอาจารย์แพทย์และคุณภาพแหล่งฝึก (WFME Two-Way Feedback)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            แบบประเมินแบบไม่ระบุตัวตนนักศึกษา เพื่อพัฒนาคุณภาพการสอนข้างเตียงและการจัดเวรปฏิบัติงานของศูนย์แพทยฯ รพ.สุรินทร์
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-right shrink-0">
          <div className="text-xs text-slate-500">คะแนนความพึงพอใจเฉลี่ย</div>
          <div className="text-xl font-bold text-[#0F2A4A] tabular-nums">
            {avgAll} / 5.00
          </div>
        </div>
      </div>

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
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">กลุ่มงาน / รายวิชา</label>
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
                { label: '1. คุณภาพการสอนข้างเตียง (Bedside Teaching)', val: teachingScore, setter: setTeachingScore },
                { label: '2. การให้ข้อมูลป้อนกลับ (Constructive Feedback)', val: feedbackScore, setter: setFeedbackScore },
                { label: '3. บรรยากาศการเรียนรู้และความสมดุลภาระงาน', val: atmosphereScore, setter: setAtmosphereScore },
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
            ส่งแบบประเมิน (Confidential)
          </button>
        </form>

        {/* Aggregated Feedback Feed */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-base font-semibold text-slate-900">
              ผลประเมินคุณภาพการเรียนการสอนล่าสุด ({feedbacks.length} รายการ)
            </h3>
            <span className="text-xs text-slate-500">
              {role === 'admin' || role === 'course_officer' ? 'มุมมองฝ่ายวิชาการ (QA)' : 'สรุปผลรวม'}
            </span>
          </div>

          <div className="divide-y divide-slate-200">
            {feedbacks.map((item) => {
              const avg = (
                (item.teachingScore + item.feedbackScore + item.atmosphereScore) /
                3
              ).toFixed(1);
              return (
                <div key={item.id} className="py-4 first:pt-1 last:pb-1 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-slate-900">
                      {item.preceptorName} · <span className="font-normal text-slate-600">{item.department}</span>
                    </div>
                    <div className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 tabular-nums">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" aria-hidden="true" />
                      <span>{avg} / 5.0</span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 tabular-nums">
                    {item.rotationPeriod} · ส่งเมื่อ {item.submittedAt}
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{item.comment}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
