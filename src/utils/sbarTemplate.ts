import { BedsideCheckInRecord, SbarHandoffRecord } from '../types/medicalSchool';

export function buildStandardizedSbarTemplate(
  rec: BedsideCheckInRecord
): Omit<SbarHandoffRecord, 'savedAt'> {
  const priorityPrefix =
    rec.roundingPriority === 'watch' ? '[เฝ้าระวังใกล้ชิด] ' : '';

  const situation = `${priorityPrefix}${rec.wardOrUnit} (${rec.bedOrRoom}) · รหัสเคส ${rec.caseCode} — ผู้ป่วยวินิจฉัย ${rec.diagnosis} (${rec.icd10}) อาการนำ: ${rec.patientSummary}`;

  const backgroundParts = [
    `กลุ่มงาน: ${rec.department}`,
    `อาจารย์แพทย์ผู้ดูแล: ${rec.supervisingStaff}`,
  ];
  if (rec.roundingKeyVitalsOrLabs) {
    backgroundParts.push(`Vitals / Key Labs ล่าสุด: ${rec.roundingKeyVitalsOrLabs}`);
  }
  if (rec.clinicalTakeaway) {
    backgroundParts.push(`ประเด็นการดูแลสำคัญ: ${rec.clinicalTakeaway}`);
  }
  const background = backgroundParts.join(' · ');

  const assessment =
    rec.roundingNote?.trim() ||
    rec.reflectionNote?.trim() ||
    `ประเมินอาการเบื้องต้นหลังเช็กอินข้างเตียงเวลา ${rec.checkedInAt} (${rec.checkedInDate}) ผู้ป่วยอยู่ระหว่างติดตามอาการอย่างต่อเนื่อง`;

  const recommendation =
    rec.roundingTodo?.trim() ||
    `ติดตามสัญญาณชีพ อาการแสดงทางคลินิก และรายงานผลตรวจเพิ่มเติมต่อ ${rec.supervisingStaff} หรือแพทย์เวรทันทีหากพบความเปลี่ยนแปลง`;

  return {
    situation,
    background,
    assessment,
    recommendation,
    handoffRecipient: 'ทีมแพทย์เวร / นศพ. เวรรับช่วงต่อ',
    shiftWindow: 'ส่งเวรบ่าย–ดึก (16:00 น. / 24:00 น.)',
  };
}

export function formatSbarPlainText(
  rec: BedsideCheckInRecord,
  sbar: Pick<
    SbarHandoffRecord,
    | 'situation'
    | 'background'
    | 'assessment'
    | 'recommendation'
    | 'handoffRecipient'
    | 'shiftWindow'
  >
): string {
  return [
    `[SBAR PATIENT HANDOFF] ${rec.caseCode} · ${rec.wardOrUnit} (${rec.bedOrRoom})`,
    `การวินิจฉัย: ${rec.diagnosis} (${rec.icd10}) | อาจารย์: ${rec.supervisingStaff}`,
    `ผู้รับเวร: ${sbar.handoffRecipient} | รอบส่งเวร: ${sbar.shiftWindow}`,
    `----------------------------------------`,
    `S (Situation): ${sbar.situation}`,
    `B (Background): ${sbar.background}`,
    `A (Assessment): ${sbar.assessment}`,
    `R (Recommendation): ${sbar.recommendation}`,
  ].join('\n');
}
