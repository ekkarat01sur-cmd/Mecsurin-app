import { useMemo, useState } from 'react';
import {
  BookMarked,
  Calendar,
  CheckCircle2,
  Clock,
  DoorOpen,
  MapPin,
  Plus,
  RotateCcw,
  Search,
  Users,
  X,
} from 'lucide-react';
import {
  ClinicalReferenceMaterial,
  ReferenceCheckoutRecord,
  RoomBooking,
  RoomResource,
  UserRole,
} from '../types/medicalSchool';

interface ResourceBookingPanelProps {
  role: UserRole;
  currentUserName: string;
  rooms: RoomResource[];
  timeSlots: string[];
  bookings: RoomBooking[];
  onBookRoom: (booking: {
    roomId: string;
    dateIso: string;
    timeSlot: string;
    title: string;
    attendeesCount: number;
    purpose: RoomBooking['purpose'];
  }) => boolean;
  onCancelBooking: (bookingId: string) => void;
  materials: ClinicalReferenceMaterial[];
  checkouts: ReferenceCheckoutRecord[];
  onCheckoutMaterial: (materialId: string) => void;
  onReturnMaterial: (checkoutId: string) => void;
}

const ROOM_TYPE_LABELS: Record<RoomResource['roomType'], string> = {
  'Conference Room': 'ห้องประชุมวิชาการ',
  'Study Group Room': 'ห้องติวกลุ่มย่อย',
  'Simulation Briefing': 'ห้องเตรียม OSCE / Sim',
};

const QUICK_DATES = [
  { iso: '2026-11-24', label: 'วันนี้ (24 พ.ย. 69)' },
  { iso: '2026-11-25', label: 'พรุ่งนี้ (25 พ.ย. 69)' },
  { iso: '2026-11-26', label: '26 พ.ย. 69' },
];

function formatThaiDateShort(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const year = Number(parts[0]) + 543;
  const monthIdx = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  const months = [
    'ม.ค.',
    'ก.พ.',
    'มี.ค.',
    'เม.ย.',
    'พ.ค.',
    'มิ.ย.',
    'ก.ค.',
    'ส.ค.',
    'ก.ย.',
    'ต.ค.',
    'พ.ย.',
    'ธ.ค.',
  ];
  return `${day} ${months[monthIdx] ?? ''} ${year}`;
}

export function ResourceBookingPanel({
  role,
  currentUserName,
  rooms,
  timeSlots,
  bookings,
  onBookRoom,
  onCancelBooking,
  materials,
  checkouts,
  onCheckoutMaterial,
  onReturnMaterial,
}: ResourceBookingPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<'rooms' | 'materials'>('rooms');
  const [selectedDate, setSelectedDate] = useState<string>('2026-11-24');
  const [roomTypeFilter, setRoomTypeFilter] = useState<'all' | RoomResource['roomType']>('all');

  // Room booking modal state
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [draftRoomId, setDraftRoomId] = useState<string>(rooms[0]?.id ?? '');
  const [draftDateIso, setDraftDateIso] = useState<string>('2026-11-24');
  const [draftTimeSlot, setDraftTimeSlot] = useState<string>(timeSlots[0] ?? '08:00 - 10:00');
  const [draftTitle, setDraftTitle] = useState<string>('');
  const [draftPurpose, setDraftPurpose] = useState<RoomBooking['purpose']>('กลุ่มติว / Study Group');
  const [draftAttendees, setDraftAttendees] = useState<number>(6);
  const [bookingError, setBookingError] = useState<string>('');

  // Materials filter state
  const [materialSearch, setMaterialSearch] = useState<string>('');
  const [materialCategory, setMaterialCategory] = useState<
    'ทั้งหมด' | ClinicalReferenceMaterial['category']
  >('ทั้งหมด');

  const canManageAllBookings =
    role === 'faculty' || role === 'course_officer' || role === 'admin';

  const activeBookings = useMemo(
    () => bookings.filter((b) => b.status === 'ยืนยันการจอง'),
    [bookings]
  );

  const filteredRooms = useMemo(() => {
    if (roomTypeFilter === 'all') return rooms;
    return rooms.filter((r) => r.roomType === roomTypeFilter);
  }, [rooms, roomTypeFilter]);

  const bookingsOnSelectedDate = useMemo(
    () => activeBookings.filter((b) => b.dateIso === selectedDate),
    [activeBookings, selectedDate]
  );

  const totalSlotsForDate = filteredRooms.length * timeSlots.length;
  const occupiedSlotsForDate = bookingsOnSelectedDate.filter((b) =>
    filteredRooms.some((r) => r.id === b.roomId)
  ).length;
  const availableSlotsForDate = Math.max(0, totalSlotsForDate - occupiedSlotsForDate);

  const myActiveBookingsCount = activeBookings.filter(
    (b) => b.bookedBy === currentUserName
  ).length;

  const activeCheckouts = useMemo(
    () => checkouts.filter((c) => c.status === 'กำลังยืม'),
    [checkouts]
  );

  const filteredMaterials = useMemo(() => {
    const q = materialSearch.trim().toLowerCase();
    return materials.filter((m) => {
      const matchCategory =
        materialCategory === 'ทั้งหมด' || m.category === materialCategory;
      const matchQuery =
        !q ||
        m.title.toLowerCase().includes(q) ||
        m.callNumber.toLowerCase().includes(q) ||
        m.department.toLowerCase().includes(q);
      return matchCategory && matchQuery;
    });
  }, [materials, materialCategory, materialSearch]);

  const findBookingForSlot = (roomId: string, dateIso: string, slot: string) =>
    activeBookings.find(
      (b) => b.roomId === roomId && b.dateIso === dateIso && b.timeSlot === slot
    );

  const openBookingModal = (roomId: string, dateIso: string, timeSlot: string) => {
    const room = rooms.find((r) => r.id === roomId);
    setDraftRoomId(roomId);
    setDraftDateIso(dateIso);
    setDraftTimeSlot(timeSlot);
    setDraftTitle('');
    setDraftPurpose(
      role === 'faculty' ? 'ประชุมวิชาการ / Journal Club' : 'กลุ่มติว / Study Group'
    );
    setDraftAttendees(room ? Math.min(6, room.capacity) : 6);
    setBookingError('');
    setBookingModalOpen(true);
  };

  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = draftTitle.trim();
    if (!trimmedTitle) {
      setBookingError('กรุณาระบุหัวข้อกิจกรรมหรือกลุ่มติว');
      return;
    }
    const targetRoom = rooms.find((r) => r.id === draftRoomId);
    if (targetRoom && draftAttendees > targetRoom.capacity) {
      setBookingError(
        `จำนวนผู้เข้าร่วมเกินความจุของห้อง (${targetRoom.capacity} ที่นั่ง)`
      );
      return;
    }
    const conflict = findBookingForSlot(draftRoomId, draftDateIso, draftTimeSlot);
    if (conflict) {
      setBookingError(
        `ช่วงเวลานี้ถูกจองแล้วโดย ${conflict.bookedBy} (${conflict.title})`
      );
      return;
    }

    const success = onBookRoom({
      roomId: draftRoomId,
      dateIso: draftDateIso,
      timeSlot: draftTimeSlot,
      title: trimmedTitle,
      attendeesCount: Math.max(1, draftAttendees),
      purpose: draftPurpose,
    });

    if (success) {
      setSelectedDate(draftDateIso);
      setBookingModalOpen(false);
    }
  };

  const selectedModalRoom = rooms.find((r) => r.id === draftRoomId);

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
      {/* Header + Sub-tab Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900 flex items-center gap-2">
            <DoorOpen className="w-5 h-5 text-[#0F2A4A]" aria-hidden="true" />
            ระบบจองห้องประชุม ห้องติวกลุ่มย่อย และยืม-คืนสื่อการเรียนทางคลินิก
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ตรวจสอบตารางห้องว่างแบบรายช่วงเวลา จองห้องสำหรับกลุ่มติว/Journal Club และยืมตำราหรืออุปกรณ์ฝึกตรวจทางคลินิก
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center p-1 bg-slate-100 border border-slate-200 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveSubTab('rooms')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeSubTab === 'rooms'
                  ? 'bg-white text-[#0F2A4A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
              <span>ตารางว่างและจองห้อง ({availableSlotsForDate})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('materials')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeSubTab === 'materials'
                  ? 'bg-white text-[#0F2A4A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookMarked className="w-3.5 h-3.5" aria-hidden="true" />
              <span>ยืม-คืนตำราและสื่อคลินิก ({activeCheckouts.length} ยืมอยู่)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-tab 1: Room Availability & Time Slot Booking */}
      {activeSubTab === 'rooms' && (
        <div className="space-y-6">
          {/* Summary Bar + Controls */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600">
              <span>
                วันที่เลือก:{' '}
                <strong className="text-slate-900 tabular-nums">
                  {formatThaiDateShort(selectedDate)}
                </strong>
              </span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span>
                ช่วงเวลาว่าง:{' '}
                <strong className="text-emerald-700 tabular-nums">
                  {availableSlotsForDate} / {totalSlotsForDate} ช่วง
                </strong>
              </span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span>
                รายการจองของคุณ:{' '}
                <strong className="text-[#0F2A4A] tabular-nums">
                  {myActiveBookingsCount} รายการ
                </strong>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center p-1 bg-white border border-slate-200 rounded-lg">
                {QUICK_DATES.map((d) => (
                  <button
                    key={d.iso}
                    type="button"
                    onClick={() => setSelectedDate(d.iso)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      selectedDate === d.iso
                        ? 'bg-[#0F2A4A] text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                aria-label="เลือกวันที่ต้องการตรวจสอบห้องว่าง"
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 tabular-nums"
              />

              <select
                value={roomTypeFilter}
                onChange={(e) =>
                  setRoomTypeFilter(e.target.value as 'all' | RoomResource['roomType'])
                }
                aria-label="กรองประเภทห้อง"
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-700"
              >
                <option value="all">ทุกประเภทห้อง</option>
                <option value="Conference Room">ห้องประชุมวิชาการ</option>
                <option value="Study Group Room">ห้องติวกลุ่มย่อย</option>
                <option value="Simulation Briefing">ห้องเตรียม OSCE / Sim</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  const firstFreeRoom =
                    filteredRooms.find((r) =>
                      timeSlots.some((slot) => !findBookingForSlot(r.id, selectedDate, slot))
                    ) ?? filteredRooms[0];
                  const firstFreeSlot =
                    (firstFreeRoom &&
                      timeSlots.find(
                        (slot) => !findBookingForSlot(firstFreeRoom.id, selectedDate, slot)
                      )) ??
                    timeSlots[0];
                  if (firstFreeRoom) {
                    openBookingModal(firstFreeRoom.id, selectedDate, firstFreeSlot);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#0F766E] hover:bg-[#0D625C] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>จองห้องด่วน</span>
              </button>
            </div>
          </div>

          {/* Availability Matrix Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse min-w-[820px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4 w-64">ห้องประชุม / ห้องติวกลุ่มย่อย</th>
                  {timeSlots.map((slot) => (
                    <th key={slot} className="py-3 px-3 text-center tabular-nums">
                      <span className="inline-flex items-center gap-1 justify-center">
                        <Clock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                        {slot}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {filteredRooms.map((room) => (
                  <tr key={room.id} className="align-top">
                    <td className="py-3.5 px-4 bg-white">
                      <div className="font-semibold text-slate-900 leading-snug">
                        {room.name}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3" aria-hidden="true" />
                          {room.location}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <Users className="w-3 h-3" aria-hidden="true" />
                          {room.capacity} ที่นั่ง
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{ROOM_TYPE_LABELS[room.roomType]}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        อุปกรณ์: {room.equipment.join(' · ')}
                      </div>
                    </td>

                    {timeSlots.map((slot) => {
                      const booking = findBookingForSlot(room.id, selectedDate, slot);
                      if (!booking) {
                        return (
                          <td key={slot} className="py-3 px-2.5 text-center align-middle">
                            <button
                              type="button"
                              onClick={() => openBookingModal(room.id, selectedDate, slot)}
                              className="w-full py-2.5 px-2 rounded-lg border border-emerald-200 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100 font-medium transition-colors cursor-pointer"
                            >
                              ว่าง · กดจอง
                            </button>
                          </td>
                        );
                      }

                      const canCancel =
                        canManageAllBookings || booking.bookedBy === currentUserName;

                      return (
                        <td key={slot} className="py-2.5 px-2.5 align-middle">
                          <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
                            <div className="font-semibold text-slate-900 line-clamp-2 leading-snug">
                              {booking.title}
                            </div>
                            <div className="text-[11px] text-slate-600 truncate">
                              {booking.bookedBy}
                            </div>
                            <div className="flex items-center justify-between gap-1 text-[11px] text-slate-500">
                              <span className="tabular-nums">{booking.attendeesCount} คน</span>
                              {canCancel && (
                                <button
                                  type="button"
                                  onClick={() => onCancelBooking(booking.id)}
                                  className="text-rose-700 hover:underline font-medium cursor-pointer whitespace-nowrap shrink-0"
                                >
                                  ยกเลิก
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Upcoming Confirmed Reservations */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              รายการจองที่ยืนยันแล้ว ({activeBookings.length} รายการ)
            </h3>
            {activeBookings.length === 0 ? (
              <div className="text-xs text-slate-500 py-4 border border-dashed border-slate-200 rounded-lg text-center">
                ยังไม่มีรายการจองห้องในระบบ
              </div>
            ) : (
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl px-4">
                {activeBookings.map((booking) => {
                  const room = rooms.find((r) => r.id === booking.roomId);
                  const canCancel =
                    canManageAllBookings || booking.bookedBy === currentUserName;
                  return (
                    <div
                      key={booking.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-slate-500">
                          <span className="font-semibold text-[#0F2A4A] tabular-nums">
                            {formatThaiDateShort(booking.dateIso)} · {booking.timeSlot} น.
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{room?.name ?? booking.roomId}</span>
                          <span aria-hidden="true">·</span>
                          <span>{booking.purpose}</span>
                        </div>
                        <div className="text-sm font-medium text-slate-900">
                          {booking.title}
                        </div>
                        <div className="text-slate-600">
                          ผู้จอง: {booking.bookedBy} · ผู้เข้าร่วม{' '}
                          <span className="tabular-nums">{booking.attendeesCount}</span> คน
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          {booking.status}
                        </span>
                        {canCancel && (
                          <button
                            type="button"
                            onClick={() => onCancelBooking(booking.id)}
                            className="px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-md hover:bg-rose-100 cursor-pointer whitespace-nowrap shrink-0"
                          >
                            ยกเลิกจอง
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-tab 2: Clinical Reference Materials & Checkout */}
      {activeSubTab === 'materials' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 border border-slate-200 rounded-lg self-start">
              {(
                [
                  'ทั้งหมด',
                  'ตำราแพทย์มาตรฐาน',
                  'คู่มือแนวทางเวชปฏิบัติ',
                  'อุปกรณ์ฝึกทักษะ / ชุดตรวจ',
                ] as const
              ).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setMaterialCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    materialCategory === cat
                      ? 'bg-white text-[#0F2A4A] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                type="text"
                value={materialSearch}
                onChange={(e) => setMaterialSearch(e.target.value)}
                placeholder="ค้นหาชื่อตำรา รหัส Call No. หรือกลุ่มงาน..."
                className="w-full sm:w-72 pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {/* Materials Catalog */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">รหัส / รายการสื่อการเรียนรู้</th>
                  <th className="py-3 px-4">ประเภทและชั้นวาง</th>
                  <th className="py-3 px-4 text-center">ระยะเวลายืม</th>
                  <th className="py-3 px-4 text-center">คงเหลือ</th>
                  <th className="py-3 px-4 text-right">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                {filteredMaterials.map((mat) => {
                  const alreadyBorrowedByUser = activeCheckouts.some(
                    (c) =>
                      c.materialId === mat.id && c.borrowerName === currentUserName
                  );
                  const outOfStock = mat.availableCopies <= 0;

                  return (
                    <tr key={mat.id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-xs text-[#0F2A4A] font-semibold tabular-nums">
                          {mat.callNumber}
                        </div>
                        <div className="font-medium text-slate-900 mt-0.5">
                          {mat.title}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {mat.department}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        <div className="font-medium text-slate-800">{mat.category}</div>
                        <div className="text-slate-500 mt-0.5">{mat.shelfLocation}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center text-xs text-slate-700 tabular-nums whitespace-nowrap">
                        {mat.loanDays} วัน
                      </td>
                      <td className="py-3.5 px-4 text-center tabular-nums whitespace-nowrap">
                        <span
                          className={`text-xs font-semibold ${
                            outOfStock ? 'text-rose-700' : 'text-emerald-700'
                          }`}
                        >
                          {mat.availableCopies} / {mat.totalCopies}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {alreadyBorrowedByUser ? (
                          <span className="text-xs font-medium text-[#0F2A4A] whitespace-nowrap">
                            คุณกำลังยืมรายการนี้อยู่
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={outOfStock}
                            onClick={() => onCheckoutMaterial(mat.id)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                              outOfStock
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-[#0F2A4A] text-white hover:bg-[#163B66] cursor-pointer'
                            }`}
                          >
                            {outOfStock ? 'ถูกยืมครบแล้ว' : 'ยืมสื่อ / Check Out'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Checkout History & Return */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              รายการยืม-คืนสื่ออ้างอิงทางคลินิก ({checkouts.length} รายการ)
            </h3>
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl px-4">
              {checkouts.map((rec) => {
                const canReturn =
                  rec.status === 'กำลังยืม' &&
                  (canManageAllBookings || rec.borrowerName === currentUserName);

                return (
                  <div
                    key={rec.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-slate-500">
                        <span className="font-mono font-semibold text-[#0F2A4A]">
                          {rec.callNumber}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>ผู้ยืม: {rec.borrowerName}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">ยืม {rec.checkedOutDate}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">กำหนดคืน {rec.dueDate}</span>
                      </div>
                      <div className="text-sm font-medium text-slate-900">
                        {rec.materialTitle}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`font-semibold ${
                          rec.status === 'กำลังยืม'
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {rec.status === 'คืนแล้ว' && rec.returnedDate
                          ? `คืนแล้ว (${rec.returnedDate})`
                          : rec.status}
                      </span>

                      {canReturn && (
                        <button
                          type="button"
                          onClick={() => onReturnMaterial(rec.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <RotateCcw className="w-3 h-3" aria-hidden="true" />
                          <span>บันทึกคืนสื่อ</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Room Booking Modal */}
      {bookingModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">
                จองห้องประชุม / ห้องติวกลุ่มย่อย
              </h3>
              <button
                type="button"
                onClick={() => setBookingModalOpen(false)}
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
                aria-label="ปิดหน้าต่าง"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmBooking} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  ห้องที่ต้องการจอง
                </label>
                <select
                  value={draftRoomId}
                  onChange={(e) => {
                    setDraftRoomId(e.target.value);
                    setBookingError('');
                  }}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} (สูงสุด {r.capacity} ที่นั่ง)
                    </option>
                  ))}
                </select>
                {selectedModalRoom && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    {selectedModalRoom.location} · อุปกรณ์:{' '}
                    {selectedModalRoom.equipment.join(' · ')}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    วันที่ใช้งาน
                  </label>
                  <input
                    type="date"
                    value={draftDateIso}
                    onChange={(e) => {
                      setDraftDateIso(e.target.value);
                      setBookingError('');
                    }}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    ช่วงเวลา
                  </label>
                  <select
                    value={draftTimeSlot}
                    onChange={(e) => {
                      setDraftTimeSlot(e.target.value);
                      setBookingError('');
                    }}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg tabular-nums"
                  >
                    {timeSlots.map((slot) => {
                      const occupied = findBookingForSlot(
                        draftRoomId,
                        draftDateIso,
                        slot
                      );
                      return (
                        <option key={slot} value={slot}>
                          {slot} {occupied ? '(ไม่ว่าง)' : '(ว่าง)'}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  หัวข้อกิจกรรม / ชื่อกลุ่มติว
                </label>
                <input
                  type="text"
                  value={draftTitle}
                  onChange={(e) => {
                    setDraftTitle(e.target.value);
                    setBookingError('');
                  }}
                  placeholder="เช่น ติวกลุ่มย่อย OSCE อายุรศาสตร์ หรือ Journal Club"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    วัตถุประสงค์การใช้งาน
                  </label>
                  <select
                    value={draftPurpose}
                    onChange={(e) =>
                      setDraftPurpose(e.target.value as RoomBooking['purpose'])
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="กลุ่มติว / Study Group">กลุ่มติว / Study Group</option>
                    <option value="เตรียมสอบ OSCE / Case Review">
                      เตรียมสอบ OSCE / Case Review
                    </option>
                    <option value="ประชุมวิชาการ / Journal Club">
                      ประชุมวิชาการ / Journal Club
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    จำนวนผู้เข้าร่วม (คน)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={selectedModalRoom?.capacity ?? 60}
                    value={draftAttendees}
                    onChange={(e) => {
                      setDraftAttendees(Number(e.target.value));
                      setBookingError('');
                    }}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg tabular-nums"
                  />
                </div>
              </div>

              <div className="text-xs text-slate-500">
                ผู้จอง: <strong className="text-slate-800">{currentUserName}</strong>
              </div>

              {bookingError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                  {bookingError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBookingModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-[#0F2A4A] rounded-lg hover:bg-[#163B66] cursor-pointer"
                >
                  ยืนยันการจองห้อง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
