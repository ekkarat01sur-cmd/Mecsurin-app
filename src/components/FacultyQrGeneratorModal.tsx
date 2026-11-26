import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  BedDouble,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Lock,
  PauseCircle,
  PlayCircle,
  Printer,
  QrCode,
  ScanLine,
  Stethoscope,
  Trash2,
  X,
} from 'lucide-react';
import {
  ClinicalDepartment,
  ClinicalSetting,
  ClinicalSkillMasteryItem,
  FacultyGeneratedQrStation,
  ProcedureQuota,
  ProcedureRole,
  UserRole,
} from '../types/medicalSchool';
import { generateUniqueQrCode, serializeFacultyStationQr } from '../utils/qrPayloads';

interface FacultyQrGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: UserRole;
  currentUserName: string;
  initialKind?: 'ward' | 'procedure';
  departments: ClinicalDepartment[];
  quotas: ProcedureQuota[];
  clinicalSkills: ClinicalSkillMasteryItem[];
  customQrStations: FacultyGeneratedQrStation[];
  onCreateQrStation: (station: FacultyGeneratedQrStation) => void;
  onToggleQrStationActive: (stationId: string) => void;
  onDeleteQrStation: (stationId: string) => void;
  onOpenScannerWithStation?: (station: FacultyGeneratedQrStation) => void;
}

const SHIFT_TYPE_OPTIONS = [
  'เวรปฏิบัติงานหอผู้ป่วย (QR Check-in)',
  'Ward Round เช้า',
  'เวรเช้า (08:00 - 16:00)',
  'เวรบ่าย (16:00 - 24:00)',
  'เวรดึก (24:00 - 08:00)',
  'OPD Clinic / ห้องตรวจผู้ป่วยนอก',
];

const SETTING_OPTIONS: ClinicalSetting[] = ['IPD', 'OPD', 'ER', 'OR', 'LR', 'Community'];

export function FacultyQrGeneratorModal({
  isOpen,
  onClose,
  role,
  currentUserName,
  initialKind = 'ward',
  departments,
  quotas,
  clinicalSkills,
  customQrStations,
  onCreateQrStation,
  onToggleQrStationActive,
  onDeleteQrStation,
  onOpenScannerWithStation,
}: FacultyQrGeneratorModalProps) {
  const isAuthorizedStaff =
    role === 'faculty' || role === 'course_officer' || role === 'admin';

  const [kind, setKind] = useState<'ward' | 'procedure'>(initialKind);
  const [department, setDepartment] = useState(
    departments[0]?.nameTh ?? 'กลุ่มงานอายุรศาสตร์'
  );
  const [wardOrUnit, setWardOrUnit] = useState('หอผู้ป่วยอายุรกรรมชาย 1');
  const [shiftType, setShiftType] = useState(SHIFT_TYPE_OPTIONS[0]);
  const [procedureName, setProcedureName] = useState(
    quotas[0]?.name ?? 'การเจาะหลัง (Lumbar Puncture)'
  );
  const [customProcedureName, setCustomProcedureName] = useState('');
  const [clinicalSetting, setClinicalSetting] = useState<ClinicalSetting>('IPD');
  const [defaultRole, setDefaultRole] = useState<ProcedureRole>('Perform');
  const [supervisingStaff, setSupervisingStaff] = useState(currentUserName);
  const [note, setNote] = useState('');

  const [selectedStationId, setSelectedStationId] = useState<string | null>(
    customQrStations[0]?.id ?? null
  );
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [listFilter, setListFilter] = useState<'all' | 'ward' | 'procedure'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setKind(initialKind);
    setSupervisingStaff(currentUserName);
  }, [isOpen, initialKind, currentUserName]);

  useEffect(() => {
    if (customQrStations.length > 0 && !customQrStations.some((s) => s.id === selectedStationId)) {
      setSelectedStationId(customQrStations[0].id);
    }
  }, [customQrStations, selectedStationId]);

  const wardSuggestions = useMemo(() => {
    const dept = departments.find((d) => d.nameTh === department);
    if (!dept?.wards) return [];
    return dept.wards
      .split(',')
      .map((w) => w.trim())
      .filter(Boolean);
  }, [departments, department]);

  const procedureCatalog = useMemo(() => {
    const set = new Set<string>();
    quotas
      .filter((q) => !department || q.department === department)
      .forEach((q) => set.add(q.name));
    clinicalSkills
      .filter((s) => !department || s.department === department)
      .forEach((s) => set.add(`${s.procedureName} (${s.code})`));
    if (set.size === 0) {
      quotas.forEach((q) => set.add(q.name));
      clinicalSkills.forEach((s) => set.add(`${s.procedureName} (${s.code})`));
    }
    return Array.from(set);
  }, [quotas, clinicalSkills, department]);

  useEffect(() => {
    if (wardSuggestions.length > 0 && !wardSuggestions.includes(wardOrUnit)) {
      setWardOrUnit(wardSuggestions[0]);
    }
  }, [wardSuggestions, wardOrUnit]);

  useEffect(() => {
    if (
      procedureCatalog.length > 0 &&
      procedureName !== '__custom__' &&
      !procedureCatalog.includes(procedureName)
    ) {
      setProcedureName(procedureCatalog[0]);
    }
  }, [procedureCatalog, procedureName]);

  // Generate QR DataURL for every station
  useEffect(() => {
    if (!isOpen || customQrStations.length === 0) return;
    let cancelled = false;

    const renderAll = async () => {
      const entries = await Promise.all(
        customQrStations.map(async (st) => {
          const payload = serializeFacultyStationQr(st);
          const url = await QRCode.toDataURL(payload, {
            width: 320,
            margin: 2,
            color: {
              dark: st.kind === 'procedure' ? '#0F766E' : '#091A32',
              light: '#FFFFFF',
            },
          });
          return [st.id, url] as const;
        })
      );
      if (!cancelled) {
        setQrImages(Object.fromEntries(entries));
      }
    };

    void renderAll();
    return () => {
      cancelled = true;
    };
  }, [isOpen, customQrStations]);

  const filteredStations = useMemo(() => {
    return customQrStations.filter((st) =>
      listFilter === 'all' ? true : st.kind === listFilter
    );
  }, [customQrStations, listFilter]);

  const activePreviewStation =
    customQrStations.find((s) => s.id === selectedStationId) ?? customQrStations[0] ?? null;

  if (!isOpen) return null;

  if (!isAuthorizedStaff) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
        role="dialog"
        aria-modal="true"
      >
        <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
          <div className="flex items-center gap-2 text-slate-900 font-semibold">
            <Lock className="w-5 h-5 text-slate-600" aria-hidden="true" />
            <span>จำกัดสิทธิ์เครื่องมือสร้าง QR Code</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            เครื่องมือสร้าง QR Code ประจำหอผู้ป่วยและหัตถการสงวนสิทธิ์เฉพาะอาจารย์แพทย์ นักวิชาการประจำรายวิชา และแอดมินเท่านั้น
          </p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-white bg-[#091A32] rounded-lg cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanWard = wardOrUnit.trim();
    if (!cleanWard || !department.trim()) return;

    const resolvedProcedure =
      procedureName === '__custom__'
        ? customProcedureName.trim()
        : procedureName.trim();
    if (kind === 'procedure' && !resolvedProcedure) return;

    const code = generateUniqueQrCode(kind === 'ward' ? 'WARD' : 'PROC');
    const now = new Date();
    const createdAt = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')} น. · 24 พ.ย. 2569`;

    const newStation: FacultyGeneratedQrStation = {
      id: `fq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      code,
      kind,
      department: department.trim(),
      wardOrUnit: cleanWard,
      ...(kind === 'procedure'
        ? {
            procedureName: resolvedProcedure,
            clinicalSetting,
            defaultRole,
          }
        : {
            shiftType,
          }),
      note: note.trim() || undefined,
      supervisingStaff: supervisingStaff.trim() || currentUserName,
      createdBy: currentUserName,
      createdAt,
      isActive: true,
      checkInCount: 0,
    };

    onCreateQrStation(newStation);
    setSelectedStationId(newStation.id);
    setJustCreatedId(newStation.id);
    setNote('');
    if (procedureName === '__custom__') {
      setCustomProcedureName('');
    }
  };

  const handleDownloadPosterCard = (station: FacultyGeneratedQrStation) => {
    const qrSrc = qrImages[station.id];
    if (!qrSrc) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 720;
      canvas.height = 920;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Top institutional header
      ctx.fillStyle = station.kind === 'procedure' ? '#0F766E' : '#091A32';
      ctx.fillRect(0, 0, canvas.width, 148);

      ctx.fillStyle = '#5EEAD4';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('ศูนย์แพทยศาสตรศึกษาชั้นคลินิก โรงพยาบาลสุรินทร์', 44, 52);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText(
        station.kind === 'procedure'
          ? 'QR เช็กอินหัตถการทางคลินิก'
          : 'QR ลงเวลาเข้าหอผู้ป่วย (Ward Check-in)',
        44,
        102
      );

      // QR frame
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 3;
      ctx.strokeRect(150, 195, 420, 420);
      ctx.drawImage(img, 170, 215, 380, 380);

      // Metadata text
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 26px sans-serif';
      const primaryTitle =
        station.kind === 'procedure'
          ? station.procedureName || 'หัตถการทางคลินิก'
          : station.wardOrUnit;
      ctx.fillText(primaryTitle.slice(0, 44), 48, 680);

      ctx.fillStyle = '#334155';
      ctx.font = '20px sans-serif';
      ctx.fillText(`${station.department} · ${station.wardOrUnit}`, 48, 725);
      ctx.fillText(
        station.kind === 'procedure'
          ? `Setting: ${station.clinicalSetting ?? 'IPD'} · บทบาท: ${station.defaultRole ?? 'Perform'}`
          : `ประเภท: ${station.shiftType ?? 'Ward Check-in'}`,
        48,
        762
      );
      ctx.fillText(`อาจารย์ผู้กำกับ: ${station.supervisingStaff}`, 48, 799);

      ctx.fillStyle = '#0F766E';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(`CODE: ${station.code}`, 48, 862);

      ctx.fillStyle = '#64748B';
      ctx.font = '16px sans-serif';
      ctx.fillText('สแกนผ่านหน้าตารางเวร / QR Scanner ในพอร์ทัล ศพค. รพ.สุรินทร์', 48, 892);

      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `SURIN_MEC_${station.code}.png`;
      link.click();
    };
    img.src = qrSrc;
  };

  const handleCopyPayload = (station: FacultyGeneratedQrStation) => {
    const raw = serializeFacultyStationQr(station);
    void navigator.clipboard?.writeText(raw);
    setCopiedId(station.id);
    window.setTimeout(() => setCopiedId((prev) => (prev === station.id ? null : prev)), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="เครื่องมือสร้าง QR Code สำหรับอาจารย์แพทย์"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 bg-[#091A32] text-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-[#0D9488] text-white flex items-center justify-center shrink-0">
              <QrCode className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold truncate">
                เครื่องมือสร้าง QR Code เช็กอินหอผู้ป่วยและหัตถการ (Faculty QR Generator)
              </h2>
              <p className="text-xs text-slate-300 mt-0.5 truncate">
                สร้าง QR Code เฉพาะหอผู้ป่วยหรือหัตถการทางคลินิก ให้นักศึกษาสแกนเพื่อเช็กอินและบันทึก Logbook อัตโนมัติ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่าง"
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Generator Form */}
            <form
              onSubmit={handleGenerate}
              className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <h3 className="text-sm font-semibold text-slate-900">
                  1. กำหนดรายละเอียดจุดเช็กอิน QR Code ใหม่
                </h3>
                <div className="inline-flex items-center p-1 bg-white border border-slate-200 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setKind('ward')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-colors ${
                      kind === 'ward'
                        ? 'bg-[#091A32] text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <BedDouble className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>หอผู้ป่วย / เวร</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setKind('procedure')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-colors ${
                      kind === 'procedure'
                        ? 'bg-[#0F766E] text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Stethoscope className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>หัตถการทางคลินิก</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    กลุ่มงานคลินิก
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.nameTh}>
                        {d.nameTh}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    หอผู้ป่วย / จุดปฏิบัติงาน
                  </label>
                  <input
                    type="text"
                    required
                    value={wardOrUnit}
                    onChange={(e) => setWardOrUnit(e.target.value)}
                    placeholder="เช่น หอผู้ป่วยอายุรกรรมชาย 1"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg"
                  />
                  {wardSuggestions.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {wardSuggestions.slice(0, 4).map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => setWardOrUnit(w)}
                          className="px-2 py-0.5 text-[11px] bg-white border border-slate-200 rounded hover:border-[#0D9488] text-slate-600 hover:text-slate-900 cursor-pointer"
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {kind === 'ward' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      ประเภทเวร / กิจกรรม
                    </label>
                    <select
                      value={shiftType}
                      onChange={(e) => setShiftType(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg"
                    >
                      {SHIFT_TYPE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      อาจารย์เวร / ผู้รับผิดชอบ
                    </label>
                    <input
                      type="text"
                      required
                      value={supervisingStaff}
                      onChange={(e) => setSupervisingStaff(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      หัตถการที่ต้องการให้นักศึกษาเช็กอิน
                    </label>
                    <select
                      value={procedureName}
                      onChange={(e) => setProcedureName(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg"
                    >
                      {procedureCatalog.map((proc) => (
                        <option key={proc} value={proc}>
                          {proc}
                        </option>
                      ))}
                      <option value="__custom__">+ ระบุชื่อหัตถการเพิ่มเติมเอง...</option>
                    </select>
                  </div>

                  {procedureName === '__custom__' && (
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        ชื่อหัตถการที่กำหนดเอง
                      </label>
                      <input
                        type="text"
                        required
                        value={customProcedureName}
                        onChange={(e) => setCustomProcedureName(e.target.value)}
                        placeholder="เช่น Central Venous Catheterization (CVC)"
                        className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        สถานที่ (Setting)
                      </label>
                      <select
                        value={clinicalSetting}
                        onChange={(e) =>
                          setClinicalSetting(e.target.value as ClinicalSetting)
                        }
                        className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg"
                      >
                        {SETTING_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        บทบาทเมื่อสแกน
                      </label>
                      <select
                        value={defaultRole}
                        onChange={(e) => setDefaultRole(e.target.value as ProcedureRole)}
                        className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg"
                      >
                        <option value="Perform">Perform (ทำเอง)</option>
                        <option value="Assist">Assist (ผู้ช่วย)</option>
                        <option value="Observe">Observe (สังเกตการณ์)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        อาจารย์ผู้รับรอง
                      </label>
                      <input
                        type="text"
                        required
                        value={supervisingStaff}
                        onChange={(e) => setSupervisingStaff(e.target.value)}
                        className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  หมายเหตุจุดติดป้าย (ถ้ามี)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="เช่น ห้องหัตถการ ER เตียง 2 หรือ เคาน์เตอร์พยาบาลชั้น 4"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-1 flex flex-wrap items-center justify-between gap-3">
                <span className="text-[11px] text-slate-500">
                  ระบบจะสุ่มรหัส QR เฉพาะตัวที่ไม่ซ้ำกัน และบันทึกข้อมูลเมื่อสแกนได้ทันที
                </span>
                <button
                  type="submit"
                  className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white rounded-lg cursor-pointer whitespace-nowrap shrink-0 ${
                    kind === 'procedure'
                      ? 'bg-[#0F766E] hover:bg-[#0D625C]'
                      : 'bg-[#091A32] hover:bg-[#0F2A4A]'
                  }`}
                >
                  <QrCode className="w-4 h-4" aria-hidden="true" />
                  <span>
                    {kind === 'procedure'
                      ? 'สร้าง QR หัตถการเฉพาะ'
                      : 'สร้าง QR หอผู้ป่วยเฉพาะ'}
                  </span>
                </button>
              </div>
            </form>

            {/* Right: Active QR Card Preview */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              {activePreviewStation ? (
                <>
                  <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#0F766E]">
                        <span>{activePreviewStation.code}</span>
                        <span>·</span>
                        <span
                          className={
                            activePreviewStation.isActive
                              ? 'text-emerald-700'
                              : 'text-amber-700'
                          }
                        >
                          {activePreviewStation.isActive ? 'เปิดใช้งาน' : 'ปิดชั่วคราว'}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-slate-900 mt-0.5 truncate">
                        {activePreviewStation.kind === 'procedure'
                          ? activePreviewStation.procedureName
                          : activePreviewStation.wardOrUnit}
                      </h3>
                      <p className="text-xs text-slate-500 truncate">
                        {activePreviewStation.department} · {activePreviewStation.wardOrUnit}
                      </p>
                    </div>
                  </div>

                  {justCreatedId === activePreviewStation.id && (
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>สร้าง QR Code ใหม่เรียบร้อยแล้ว พร้อมให้นักศึกษาสแกน</span>
                    </div>
                  )}

                  <div className="flex justify-center py-4 bg-slate-50 border border-slate-200 rounded-xl">
                    {qrImages[activePreviewStation.id] ? (
                      <img
                        src={qrImages[activePreviewStation.id]}
                        alt={`QR Code ${activePreviewStation.code}`}
                        className="w-48 h-48 object-contain bg-white p-2 rounded-lg border border-slate-200"
                      />
                    ) : (
                      <div className="w-48 h-48 flex items-center justify-center text-xs text-slate-400">
                        กำลังสร้างภาพ QR...
                      </div>
                    )}
                  </div>

                  <dl className="text-xs space-y-1 text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-200/80">
                    <div className="flex justify-between gap-2">
                      <dt>อาจารย์ผู้กำกับ</dt>
                      <dd className="font-medium text-slate-900">
                        {activePreviewStation.supervisingStaff}
                      </dd>
                    </div>
                    {activePreviewStation.kind === 'procedure' ? (
                      <div className="flex justify-between gap-2">
                        <dt>Setting / บทบาท</dt>
                        <dd className="font-mono font-medium text-slate-900">
                          {activePreviewStation.clinicalSetting} · {activePreviewStation.defaultRole}
                        </dd>
                      </div>
                    ) : (
                      <div className="flex justify-between gap-2">
                        <dt>ประเภทเวร</dt>
                        <dd className="font-medium text-slate-900">
                          {activePreviewStation.shiftType}
                        </dd>
                      </div>
                    )}
                    <div className="flex justify-between gap-2">
                      <dt>จำนวนการเช็กอิน</dt>
                      <dd className="font-mono font-bold text-[#0F2A4A] tabular-nums">
                        {activePreviewStation.checkInCount} ครั้ง
                      </dd>
                    </div>
                  </dl>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadPosterCard(activePreviewStation)}
                      disabled={!qrImages[activePreviewStation.id]}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-[#091A32] hover:bg-[#0F2A4A] rounded-lg cursor-pointer disabled:opacity-50"
                    >
                      <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>โหลดป้ายติดหน้างาน PNG</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const raw = qrImages[activePreviewStation.id];
                        if (!raw) return;
                        const link = document.createElement('a');
                        link.href = raw;
                        link.download = `QR_${activePreviewStation.code}.png`;
                        link.click();
                      }}
                      disabled={!qrImages[activePreviewStation.id]}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-[#0F2A4A] bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>โหลดเฉพาะ QR</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => handleCopyPayload(activePreviewStation)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                    >
                      {copiedId === activePreviewStation.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {copiedId === activePreviewStation.id ? 'คัดลอกแล้ว' : 'คัดลอก Payload'}
                      </span>
                    </button>

                    {onOpenScannerWithStation && (
                      <button
                        type="button"
                        onClick={() => onOpenScannerWithStation(activePreviewStation)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#0F766E] hover:bg-[#0D625C] rounded-md cursor-pointer"
                      >
                        <ScanLine className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>ทดสอบเช็กอินด้วย QR นี้</span>
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-xs text-slate-500">
                  เลือกหอผู้ป่วยหรือหัตถการด้านซ้ายแล้วกดสร้าง QR Code เพื่อดูตัวอย่าง
                </div>
              )}
            </div>
          </div>

          {/* Generated QR Stations Directory */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-900">
                รายการ QR Code ที่อาจารย์สร้างไว้ ({customQrStations.length} รายการ)
              </div>
              <div className="inline-flex items-center p-1 bg-white border border-slate-200 rounded-lg">
                {(
                  [
                    { id: 'all', label: 'ทั้งหมด' },
                    { id: 'ward', label: 'หอผู้ป่วย' },
                    { id: 'procedure', label: 'หัตถการ' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setListFilter(f.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer ${
                      listFilter === f.id
                        ? 'bg-[#091A32] text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-slate-200 max-h-[260px] overflow-y-auto">
              {filteredStations.length === 0 ? (
                <div className="px-5 py-8 text-center text-xs text-slate-500">
                  ยังไม่มี QR Code ในหมวดนี้
                </div>
              ) : (
                filteredStations.map((st) => (
                  <div
                    key={st.id}
                    className={`px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors ${
                      activePreviewStation?.id === st.id ? 'bg-teal-50/40' : 'hover:bg-slate-50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedStationId(st.id)}
                      className="text-left min-w-0 flex-1 space-y-0.5 cursor-pointer"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-semibold text-[#0F766E]">
                          {st.code}
                        </span>
                        <span className="font-semibold text-slate-900">
                          {st.kind === 'procedure' ? st.procedureName : st.wardOrUnit}
                        </span>
                        <span
                          className={`text-[11px] font-medium ${
                            st.isActive ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          ({st.isActive ? 'ใช้งานอยู่' : 'ปิดชั่วคราว'})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {st.department} · {st.wardOrUnit} · ผู้กำกับ: {st.supervisingStaff} · เช็กอินแล้ว {st.checkInCount} ครั้ง
                      </div>
                    </button>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onToggleQrStationActive(st.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-md cursor-pointer"
                      >
                        {st.isActive ? (
                          <>
                            <PauseCircle className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
                            <span>ปิดชั่วคราว</span>
                          </>
                        ) : (
                          <>
                            <PlayCircle className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                            <span>เปิดใช้งาน</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteQrStation(st.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-md cursor-pointer"
                        aria-label={`ลบ QR ${st.code}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>ลบ</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
