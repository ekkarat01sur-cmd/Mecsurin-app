import { useState } from 'react';
import { BookOpen, CheckCircle2, FileText, Plus, Search, X } from 'lucide-react';
import {
  ClinicalReferenceMaterial,
  CpgProtocol,
  ReferenceCheckoutRecord,
  ResearchProject,
  RoomBooking,
  RoomResource,
  UserRole,
  WelfareRequest,
} from '../types/medicalSchool';
import { ClinicalCalculatorsPanel } from './ClinicalCalculatorsPanel';
import { ResearchIrbDashboard } from './ResearchIrbDashboard';
import { ResourceBookingPanel } from './ResourceBookingPanel';

interface LibraryResearchSectionProps {
  role?: UserRole;
  currentUserName?: string;
  cpgProtocols: CpgProtocol[];
  researchProjects: ResearchProject[];
  onAddResearch: (project: Omit<ResearchProject, 'id' | 'year' | 'status'>) => void;
  onUpdateResearchStatus?: (id: string, status: ResearchProject['status']) => void;
  welfareRequests: WelfareRequest[];
  onAddWelfareRequest: (req: Omit<WelfareRequest, 'id' | 'submittedAt' | 'status'>) => void;
  rooms: RoomResource[];
  timeSlots: string[];
  roomBookings: RoomBooking[];
  onBookRoom: (booking: {
    roomId: string;
    dateIso: string;
    timeSlot: string;
    title: string;
    attendeesCount: number;
    purpose: RoomBooking['purpose'];
  }) => boolean;
  onCancelRoomBooking: (bookingId: string) => void;
  referenceMaterials: ClinicalReferenceMaterial[];
  referenceCheckouts: ReferenceCheckoutRecord[];
  onCheckoutMaterial: (materialId: string) => void;
  onReturnMaterial: (checkoutId: string) => void;
}

export function LibraryResearchSection({
  role = 'student',
  currentUserName = 'นศพ.ธนภัทร ศรีสุรินทร์',
  cpgProtocols,
  researchProjects,
  onAddResearch,
  onUpdateResearchStatus,
  welfareRequests,
  onAddWelfareRequest,
  rooms,
  timeSlots,
  roomBookings,
  onBookRoom,
  onCancelRoomBooking,
  referenceMaterials,
  referenceCheckouts,
  onCheckoutMaterial,
  onReturnMaterial,
}: LibraryResearchSectionProps) {
  const [cpgSearch, setCpgSearch] = useState('');
  const [selectedCpg, setSelectedCpg] = useState<CpgProtocol | null>(null);
  const [selectedResearchYear, setSelectedResearchYear] = useState<string>('ทั้งหมด');

  // Research modal state
  const [showResearchForm, setShowResearchForm] = useState(false);
  const [resTitle, setResTitle] = useState('');
  const [resLead, setResLead] = useState('นศพ.ธนภัทร ศรีสุรินทร์');
  const [resAdvisor, setResAdvisor] = useState('นพ.เอกรัตน์ วัฒนสุรินทร์');
  const [resDept, setResDept] = useState('กลุ่มงานอายุรศาสตร์');
  const [resAbstract, setResAbstract] = useState('');

  // Welfare & Advisor form state
  const [welType, setWelType] = useState<WelfareRequest['type']>('นัดพบอาจารย์ที่ปรึกษา');
  const [welSubject, setWelSubject] = useState('');
  const [welPreferred, setWelPreferred] = useState('');
  const [welDetail, setWelDetail] = useState('');

  const filteredCpg = cpgProtocols.filter((c) => {
    const q = cpgSearch.trim().toLowerCase();
    return (
      !q ||
      c.title.toLowerCase().includes(q) ||
      c.department.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q)
    );
  });

  const filteredResearch =
    selectedResearchYear === 'ทั้งหมด'
      ? researchProjects
      : researchProjects.filter((p) => p.year === selectedResearchYear);

  const canManageIrbStatus =
    role === 'faculty' || role === 'course_officer' || role === 'admin';

  const handleResearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resTitle.trim() || !resAbstract.trim()) return;
    onAddResearch({
      title: resTitle.trim(),
      leadInvestigator: resLead.trim(),
      advisor: resAdvisor.trim(),
      department: resDept.trim(),
      abstract: resAbstract.trim(),
    });
    setResTitle('');
    setResAbstract('');
    setShowResearchForm(false);
  };

  const handleWelfareSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!welSubject.trim() || !welDetail.trim()) return;
    onAddWelfareRequest({
      type: welType,
      subject: welSubject.trim(),
      preferredDateOrRoom: welPreferred.trim() || 'ตามเวลาที่สะดวก',
      detail: welDetail.trim(),
    });
    setWelSubject('');
    setWelPreferred('');
    setWelDetail('');
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">
          คลังแนวทางเวชปฏิบัติ (CPG) งานวิจัย R2R และกิจการนักศึกษา
        </h1>
        <p className="text-sm text-slate-600 mt-1.5">
          แนวทางเวชปฏิบัติฉุกเฉินโรงพยาบาลสุรินทร์ เครื่องคำนวณทางคลินิกข้างเตียง ระบบยื่นข้อเสนอวิจัย R2R และบริการหอพัก-อาจารย์ที่ปรึกษา
        </p>
      </div>

      {/* Bedside Clinical Calculators */}
      <ClinicalCalculatorsPanel />

      {/* Surin Hospital CPG Directory */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#0F2A4A]" aria-hidden="true" />
              แนวทางเวชปฏิบัติมาตรฐาน โรงพยาบาลสุรินทร์ (Clinical Practice Guidelines)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              คลิกที่แนวทางเพื่อดูเกณฑ์การวินิจฉัย คำสั่งการรักษาเบื้องต้น และเบอร์ติดต่อปรึกษาเร่งด่วน
            </p>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="text"
              value={cpgSearch}
              onChange={(e) => setCpgSearch(e.target.value)}
              placeholder="ค้นหา Sepsis, STEMI, Stroke..."
              className="w-full sm:w-64 pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCpg.map((cpg) => (
            <button
              key={cpg.id}
              type="button"
              onClick={() => setSelectedCpg(cpg)}
              className="text-left p-5 border border-slate-200 rounded-xl hover:border-[#0F2A4A]/40 hover:bg-slate-50/80 transition-colors cursor-pointer space-y-2"
            >
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                <span className="font-mono font-semibold text-[#0F2A4A]">{cpg.code}</span>
                <span>อัปเดต {cpg.updatedAt}</span>
              </div>
              <h3 className="text-base font-semibold text-slate-900 leading-snug">
                {cpg.title}
              </h3>
              <div className="text-xs text-slate-500">{cpg.department}</div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-2">
                {cpg.summary}
              </p>
              <div className="pt-1 text-xs font-medium text-[#0F2A4A]">
                เปิดอ่านแนวทางปฏิบัติฉบับย่อ →
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Resource & Conference Room Booking + Reference Material Checkout */}
      <ResourceBookingPanel
        role={role}
        currentUserName={currentUserName}
        rooms={rooms}
        timeSlots={timeSlots}
        bookings={roomBookings}
        onBookRoom={onBookRoom}
        onCancelBooking={onCancelRoomBooking}
        materials={referenceMaterials}
        checkouts={referenceCheckouts}
        onCheckoutMaterial={onCheckoutMaterial}
        onReturnMaterial={onReturnMaterial}
      />

      {/* Research & IRB Analytics Dashboard (Recharts PieChart & Yearly Statistics) */}
      <ResearchIrbDashboard
        projects={researchProjects}
        selectedYear={selectedResearchYear}
        onSelectYear={setSelectedResearchYear}
      />

      {/* Two-Column: Research Portal + Student Welfare */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Research & R2R Portal */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#0F2A4A]" aria-hidden="true" />
                โครงการวิจัยนักศึกษาแพทย์และงาน R2R
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ฐานข้อมูลโครงการวิจัยทางคลินิกและเวชศาสตร์ชุมชนจังหวัดสุรินทร์
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowResearchForm((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#0F2A4A] rounded-lg hover:bg-[#163B66] cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              ยื่นข้อเสนอวิจัยใหม่
            </button>
          </div>

          {showResearchForm && (
            <form
              onSubmit={handleResearchSubmit}
              className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3"
            >
              <input
                type="text"
                value={resTitle}
                onChange={(e) => setResTitle(e.target.value)}
                placeholder="ชื่อโครงการวิจัยภาษาไทย..."
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={resLead}
                  onChange={(e) => setResLead(e.target.value)}
                  placeholder="ผู้วิจัยหลัก"
                  className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                />
                <input
                  type="text"
                  value={resAdvisor}
                  onChange={(e) => setResAdvisor(e.target.value)}
                  placeholder="อาจารย์ที่ปรึกษาวิจัย"
                  className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                />
                <input
                  type="text"
                  value={resDept}
                  onChange={(e) => setResDept(e.target.value)}
                  placeholder="กลุ่มงาน"
                  className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                />
              </div>
              <textarea
                rows={2}
                value={resAbstract}
                onChange={(e) => setResAbstract(e.target.value)}
                placeholder="บทคัดย่อและวัตถุประสงค์การวิจัยโดยสังเขป..."
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowResearchForm(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium text-white bg-[#0F2A4A] rounded-lg hover:bg-[#163B66] cursor-pointer"
                >
                  ส่งขอพิจารณาจริยธรรม (IRB)
                </button>
              </div>
            </form>
          )}

          <div className="divide-y divide-slate-200">
            {filteredResearch.map((proj) => (
              <div key={proj.id} className="py-4 first:pt-1 last:pb-1 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>
                    {proj.department} · ปีการศึกษา {proj.year}
                  </span>
                  {canManageIrbStatus && onUpdateResearchStatus ? (
                    <select
                      value={proj.status}
                      onChange={(e) =>
                        onUpdateResearchStatus(
                          proj.id,
                          e.target.value as ResearchProject['status']
                        )
                      }
                      aria-label={`สถานะ IRB ของโครงการ ${proj.title}`}
                      className={`px-2 py-1 text-xs font-semibold bg-white border border-slate-300 rounded-md cursor-pointer ${
                        proj.status === 'ตีพิมพ์/นำเสนอแล้ว'
                          ? 'text-emerald-700'
                          : proj.status === 'ผ่านจริยธรรมการวิจัย (IRB)'
                            ? 'text-[#0F2A4A]'
                            : 'text-amber-700'
                      }`}
                    >
                      <option value="กำลังเก็บข้อมูล">กำลังเก็บข้อมูล</option>
                      <option value="ผ่านจริยธรรมการวิจัย (IRB)">
                        ผ่านจริยธรรมการวิจัย (IRB)
                      </option>
                      <option value="ตีพิมพ์/นำเสนอแล้ว">ตีพิมพ์/นำเสนอแล้ว</option>
                    </select>
                  ) : (
                    <span
                      className={`font-semibold ${
                        proj.status === 'ตีพิมพ์/นำเสนอแล้ว'
                          ? 'text-emerald-700'
                          : proj.status === 'ผ่านจริยธรรมการวิจัย (IRB)'
                            ? 'text-[#0F2A4A]'
                            : 'text-amber-700'
                      }`}
                    >
                      {proj.status}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-slate-900 leading-snug">
                  {proj.title}
                </h3>
                <div className="text-xs text-slate-600">
                  ผู้วิจัย: {proj.leadInvestigator} · อาจารย์ที่ปรึกษา: {proj.advisor}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{proj.abstract}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Student Affairs, Dormitory & Advisor Counseling */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              กิจการนักศึกษา หอพัก และอาจารย์ที่ปรึกษา
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              แจ้งซ่อมบำรุงหอพักนักศึกษาแพทย์ รพ.สุรินทร์ หรือนัดพบอาจารย์ที่ปรึกษา
            </p>
          </div>

          <form onSubmit={handleWelfareSubmit} className="space-y-3.5">
            <div className="inline-flex w-full p-1 bg-slate-100 rounded-lg">
              {(['นัดพบอาจารย์ที่ปรึกษา', 'แจ้งซ่อมหอพัก'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setWelType(t)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    welType === t
                      ? 'bg-white text-[#0F2A4A] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={welSubject}
              onChange={(e) => setWelSubject(e.target.value)}
              placeholder={
                welType === 'นัดพบอาจารย์ที่ปรึกษา'
                  ? 'หัวข้อที่ต้องการปรึกษา...'
                  : 'รายการแจ้งซ่อม เช่น หลอดไฟห้องน้ำ / เครื่องปรับอากาศ...'
              }
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
            />
            <input
              type="text"
              value={welPreferred}
              onChange={(e) => setWelPreferred(e.target.value)}
              placeholder={
                welType === 'นัดพบอาจารย์ที่ปรึกษา'
                  ? 'วันและเวลาที่สะดวก'
                  : 'อาคารและหมายเลขห้องพัก (เช่น อาคาร B ห้อง 508)'
              }
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
            />
            <textarea
              rows={2}
              value={welDetail}
              onChange={(e) => setWelDetail(e.target.value)}
              placeholder="รายละเอียดเพิ่มเติม..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
            />
            <button
              type="submit"
              className="w-full py-2 text-sm font-medium text-white bg-[#0F2A4A] rounded-lg hover:bg-[#163B66] cursor-pointer"
            >
              ส่งคำร้องถึงงานกิจการนักศึกษา
            </button>
          </form>

          <div className="pt-2 border-t border-slate-200 space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              ประวัติคำร้องล่าสุด
            </h3>
            <div className="divide-y divide-slate-200">
              {welfareRequests.map((req) => (
                <div key={req.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#0F2A4A]">{req.type}</span>
                    <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      {req.status}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-slate-900">{req.subject}</div>
                  <div className="text-xs text-slate-500">
                    {req.preferredDateOrRoom} · ส่งเมื่อ {req.submittedAt}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* CPG Detail Modal */}
      {selectedCpg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-xl">
            <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-200">
              <div>
                <div className="text-xs font-mono text-slate-500">
                  {selectedCpg.code} · {selectedCpg.department} · อัปเดต {selectedCpg.updatedAt}
                </div>
                <h3 className="text-lg font-semibold text-[#0F2A4A] mt-1">
                  {selectedCpg.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCpg(null)}
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer shrink-0"
                aria-label="ปิดหน้าต่าง"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-sm">
              <p className="text-slate-700 leading-relaxed">{selectedCpg.summary}</p>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  เกณฑ์การวินิจฉัยและคัดกรอง (Key Diagnostic Criteria)
                </h4>
                <ul className="space-y-1.5 text-slate-800">
                  {selectedCpg.keyCriteria.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-[#0F2A4A] font-bold" aria-hidden="true">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  แนวทางการรักษาเร่งด่วน (Immediate Standing Orders)
                </h4>
                <ol className="space-y-1.5 text-slate-800 list-decimal list-inside">
                  {selectedCpg.immediateOrders.map((order) => (
                    <li key={order} className="leading-relaxed">
                      {order}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs sm:text-sm text-amber-900">
                <span className="font-semibold">การปรึกษาและส่งต่อ: </span>
                {selectedCpg.referralOrEscalation}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
