import {
  BuiltInGradeTarget,
  CourseGradingConfig,
  EvaluationFormType,
} from '../types/medicalSchool';

export interface WellBabyItem {
  id: string;
  label: string;
  sublabel?: string;
  maxScore: number;
  group?: string;
}

export const WELL_BABY_ITEMS: WellBabyItem[] = [
  {
    id: 'wb-1',
    label: '1. การเตรียมความพร้อม การทักทาย และการสร้างสัมพันธภาพกับผู้ปกครอง',
    maxScore: 4,
  },
  {
    id: 'wb-2',
    label: '2. การซักประวัติอย่างเป็นระบบและครบถ้วน (Holistic History Taking)',
    sublabel: 'ประวัติการคลอด, โภชนาการ, พัฒนาการ, วัคซีน, ประวัติครอบครัวและสิ่งแวดล้อม',
    maxScore: 4,
  },
  {
    id: 'wb-3-1',
    group: '3. การตรวจร่างกายและการประเมินการเจริญเติบโต/พัฒนาการ (Clinical Process)',
    label: '3.1 การตรวจร่างกายทั่วไปอย่างถูกต้องและนุ่มนวล (General Physical Examination)',
    maxScore: 1,
  },
  {
    id: 'wb-3-2',
    group: '3. การตรวจร่างกายและการประเมินการเจริญเติบโต/พัฒนาการ (Clinical Process)',
    label: '3.2 การติดตามการเจริญเติบโตและการลงแปลผล Growth Chart (Growth Monitoring)',
    maxScore: 1,
  },
  {
    id: 'wb-3-3',
    group: '3. การตรวจร่างกายและการประเมินการเจริญเติบโต/พัฒนาการ (Clinical Process)',
    label: '3.3 การประเมินพัฒนาการตามวัย (Developmental Assessment: DSPM / Denver II)',
    maxScore: 1,
  },
  {
    id: 'wb-3-4',
    group: '3. การตรวจร่างกายและการประเมินการเจริญเติบโต/พัฒนาการ (Clinical Process)',
    label: '3.4 การประเมินภาวะโภชนาการและการให้อาหารตามวัย (Nutrition Assessment)',
    maxScore: 1,
  },
  {
    id: 'wb-3-5',
    group: '3. การตรวจร่างกายและการประเมินการเจริญเติบโต/พัฒนาการ (Clinical Process)',
    label: '3.5 การตรวจคัดกรองและประเมินความเสี่ยงพิเศษ (Screening & Risk Assessment)',
    maxScore: 1,
  },
  {
    id: 'wb-4',
    label: '4. การให้วัคซีนและการให้ความรู้เรื่องวัคซีน (Vaccination)',
    sublabel: 'ตรวจสอบประวัติวัคซีน, แนะนำวัคซีนตามเกณฑ์และวัคซีนเสริม, ข้อห้าม/ผลข้างเคียง',
    maxScore: 4,
  },
  {
    id: 'wb-5',
    label: '5. การให้คำแนะนำในการดูแลสุขภาพเด็กและการป้องกันอุบัติเหตุ (Child Health Supervision)',
    sublabel: 'Anticipatory guidance, การเลี้ยงดู, สุขอนามัยช่องปาก, ป้องกันอุบัติเหตุตามวัย',
    maxScore: 3,
  },
];

export interface FormBItem {
  id: string;
  section: string;
  label: string;
  maxScore: number;
}

export const FORM_B_ITEMS: FormBItem[] = [
  {
    id: 'fb-1-1',
    section: '1. ทักษะทางคลินิกและการดูแลผู้ป่วย (Clinical Skills & Patient Care)',
    label: '1.1 การซักประวัติ ตรวจร่างกาย และตั้งข้อวินิจฉัยโรค',
    maxScore: 10,
  },
  {
    id: 'fb-1-2',
    section: '1. ทักษะทางคลินิกและการดูแลผู้ป่วย (Clinical Skills & Patient Care)',
    label: '1.2 การวางแผนการตรวจวินิจฉัยและการรักษาอย่างเหมาะสม',
    maxScore: 10,
  },
  {
    id: 'fb-1-3',
    section: '1. ทักษะทางคลินิกและการดูแลผู้ป่วย (Clinical Skills & Patient Care)',
    label: '1.3 การทำหัตถการพื้นฐานตามระดับความสามารถ',
    maxScore: 10,
  },
  {
    id: 'fb-1-4',
    section: '1. ทักษะทางคลินิกและการดูแลผู้ป่วย (Clinical Skills & Patient Care)',
    label: '1.4 การบันทึกเวชระเบียน (Medical Record / SOAP note)',
    maxScore: 10,
  },
  {
    id: 'fb-2-1',
    section: '2. การเรียนรู้ด้วยตนเองและการพัฒนาตนเอง (SDL: Self-Directed Learning)',
    label: '2.1 การค้นคว้าข้อมูลและหลักฐานทางวิทยาศาสตร์การแพทย์ (EBM)',
    maxScore: 10,
  },
  {
    id: 'fb-2-2',
    section: '2. การเรียนรู้ด้วยตนเองและการพัฒนาตนเอง (SDL: Self-Directed Learning)',
    label: '2.2 การนำความรู้มาประยุกต์ใช้และแก้ปัญหาในการดูแลผู้ป่วย',
    maxScore: 10,
  },
  {
    id: 'fb-3-1',
    section: '3. การเรียนรู้จากการปฏิบัติงานและการให้บริการ (OPL: Outpatient / Procedural / Practical Learning)',
    label: '3.1 ความรับผิดชอบต่อการปฏิบัติงานและผู้ป่วยที่ได้รับมอบหมาย',
    maxScore: 10,
  },
  {
    id: 'fb-3-2',
    section: '3. การเรียนรู้จากการปฏิบัติงานและการให้บริการ (OPL: Outpatient / Procedural / Practical Learning)',
    label: '3.2 การตรงต่อเวลาและความพร้อมในการทำงาน/การราวตามสายงาน',
    maxScore: 10,
  },
  {
    id: 'fb-4-1',
    section: '4. พฤติกรรม เจตคติ และความเป็นมืออาชีพ (Professionalism & Ethics)',
    label: '4.1 มนุษยสัมพันธ์และการสื่อสารกับผู้ป่วย ญาติ และทีมบุคลากรทางการแพทย์',
    maxScore: 10,
  },
  {
    id: 'fb-4-2',
    section: '4. พฤติกรรม เจตคติ และความเป็นมืออาชีพ (Professionalism & Ethics)',
    label: '4.2 จริยธรรม สมรรถนะ คุณธรรม และการรักษาความลับของผู้ป่วย',
    maxScore: 10,
  },
];

export interface RubricOption {
  label: string;
  score: number | null; // null = N/A
  description: string;
}

export interface RubricDomainItem {
  id: string;
  domainName: string;
  section?: string;
  allowNa: boolean;
  isPassFailGate?: boolean;
  options: RubricOption[];
}

export const FORM_A_DOMAINS: RubricDomainItem[] = [
  {
    id: 'fa-1',
    domainName: '1. history taking',
    allowNa: true,
    options: [
      { label: 'Outstanding (10)', score: 10, description: 'ซักประวัติสำคัญได้ครบถ้วน กระชับและเป็นระบบ' },
      { label: 'Very Satisfactory (8)', score: 8, description: 'ซักประวัติสำคัญได้ครบถ้วน แต่ไม่กระชับหรือไม่เป็นระบบ' },
      { label: 'Satisfactory (6)', score: 6, description: 'ซักประวัติสำคัญได้เพียงพอ แต่ไม่ครบถ้วน' },
      { label: 'Unsatisfactory (4)', score: 4, description: 'ขาดประวัติสำคัญ' },
    ],
  },
  {
    id: 'fa-2',
    domainName: '2. physical examination',
    allowNa: true,
    options: [
      { label: 'Outstanding (10)', score: 10, description: 'ตรวจร่างกายได้ถูกต้อง ครบถ้วน คล่องแคล่ว ดูน่าเชื่อถือ' },
      { label: 'Very Satisfactory (8)', score: 8, description: 'ตรวจร่างกายได้ถูกต้อง ครบถ้วน แต่ยังไม่คล่องแคล่ว' },
      { label: 'Satisfactory (6)', score: 6, description: 'ตรวจร่างกายได้ถูกต้อง แต่ยังไม่ครบถ้วน' },
      { label: 'Unsatisfactory (4)', score: 4, description: 'กระบวนการตรวจร่างกายไม่ถูกต้อง' },
    ],
  },
  {
    id: 'fa-3',
    domainName: '3. clinical diagnosis',
    allowNa: true,
    options: [
      { label: 'Outstanding (10)', score: 10, description: 'สรุปปัญหาผู้ป่วยได้ครบถ้วน และ Dx & DDx ได้ถูกต้องเหมาะสม' },
      { label: 'Very Satisfactory (8)', score: 8, description: 'สรุปปัญหาผู้ป่วยได้ครบถ้วน และ Dx ได้ถูกแต่ DDx ยังไม่เหมาะสม' },
      { label: 'Satisfactory (6)', score: 6, description: 'สรุปปัญหาผู้ป่วยได้ไม่ครบถ้วน หรือ Dx กลุ่มโรคได้แต่ไม่สามารถ Dx โรคได้' },
      { label: 'Unsatisfactory (4)', score: 4, description: 'ไม่สามารถสรุปปัญหาผู้ป่วยได้ หรือไม่สามารถ Dx กลุ่มโรคได้' },
    ],
  },
  {
    id: 'fa-4',
    domainName: '4. rational laboratory investigation',
    allowNa: true,
    options: [
      { label: 'Outstanding (10)', score: 10, description: 'ส่งตรวจได้ถูกต้อง ครบถ้วน ไม่มากเกินความจำเป็น และแปลผลได้ถูกต้อง' },
      { label: 'Very Satisfactory (8)', score: 8, description: 'ส่งตรวจได้ถูกต้อง ครบถ้วน แต่เกินความจำเป็น และแปลผลได้ถูกต้อง' },
      { label: 'Satisfactory (6)', score: 6, description: 'ส่งตรวจได้ถูกต้อง แต่ไม่ครบถ้วน หรือแปลผลผิดพลาดเล็กน้อย' },
      { label: 'Unsatisfactory (4)', score: 4, description: 'เลือกส่งตรวจไม่ถูกต้อง หรือแปลผลไม่ถูกต้อง' },
    ],
  },
  {
    id: 'fa-5',
    domainName: '5. patient management',
    allowNa: true,
    options: [
      { label: 'Outstanding (10)', score: 10, description: 'สั่งการรักษาได้ถูกต้อง เหมาะสมกับผู้ป่วย ครอบคลุมทุกมิติของ holistic care' },
      { label: 'Very Satisfactory (8)', score: 8, description: 'สั่งการรักษาได้ถูกต้อง เหมาะสมกับผู้ป่วยแต่ไม่ครอบคลุมทุกมิติของ holistic care' },
      { label: 'Satisfactory (6)', score: 6, description: 'สั่งการรักษาได้ถูกต้องเป็นส่วนใหญ่ มีข้อผิดพลาดเล็กน้อย' },
      { label: 'Unsatisfactory (4)', score: 4, description: 'สั่งการรักษาไม่ถูกต้อง' },
    ],
  },
  {
    id: 'fa-6',
    domainName: '6. patient education',
    allowNa: true,
    options: [
      { label: 'Outstanding (10)', score: 10, description: 'อธิบายข้อมูลสำคัญครบถ้วน เข้าใจง่ายเหมาะกับพื้นฐานผู้ป่วย เป็นการสื่อสาร 2 ทาง' },
      { label: 'Very Satisfactory (8)', score: 8, description: 'ขาดข้อมูลสำคัญเล็กน้อย หรือขาดการมีส่วนร่วมของผู้ป่วยในการสื่อสารเล็กน้อย' },
      { label: 'Satisfactory (6)', score: 6, description: 'ขาดข้อมูลสำคัญหลายประเด็น หรือเป็นการสื่อสารทางเดียวเป็นส่วนใหญ่' },
      { label: 'Unsatisfactory (4)', score: 4, description: 'การสื่อสารไม่เหมาะสมกับพื้นฐานผู้ป่วย หรือฟังเข้าใจยาก หรือให้ข้อมูลสำคัญผิด' },
    ],
  },
  {
    id: 'fa-7',
    domainName: '7. medical record',
    allowNa: true,
    options: [
      { label: 'Outstanding (10)', score: 10, description: 'บันทึกข้อมูลครบถ้วน เป็นระเบียบ กระชับ' },
      { label: 'Very Satisfactory (8)', score: 8, description: 'บันทึกข้อมูลครบถ้วน แต่ไม่เป็นระเบียบหรือไม่กระชับ' },
      { label: 'Satisfactory (6)', score: 6, description: 'บันทึกข้อมูลผิดพลาดเล็กน้อย หรือขาดข้อมูลบางประการ' },
      { label: 'Unsatisfactory (4)', score: 4, description: 'บันทึกข้อมูลผิดพลาด หรือขาดข้อมูลสำคัญหลายประการ' },
    ],
  },
  {
    id: 'fa-8',
    domainName: '8. manner',
    allowNa: false,
    options: [
      { label: 'Outstanding (10)', score: 10, description: 'แต่งกายสะอาด ถูกระเบียบ เหมาะสมกับความเป็นแพทย์ อ่อนน้อม สุภาพ ใช้วาจาและแสดงกิริยาให้เกียรติผู้ป่วย' },
      { label: 'Satisfactory (6)', score: 6, description: 'ขาดประเด็นใดประเด็นหนึ่ง' },
      { label: 'Unsatisfactory (4)', score: 4, description: 'ขาดมากกว่า 1 ประเด็น หรือแสดงกิริยาที่ไม่เหมาะสมต่อผู้ป่วย' },
    ],
  },
];

export const FORM_C_DOMAINS: RubricDomainItem[] = [
  {
    id: 'fc-1',
    section: 'Clinical Domain',
    domainName: '1. clinical skills (Hx taking, PE & procedures)',
    allowNa: true,
    options: [
      { label: 'Outstanding (10)', score: 10, description: 'ทำได้ถูกต้องครบถ้วน คล่องแคล่ว ดูน่าเชื่อถือ' },
      { label: 'Very Satisfactory (8)', score: 8, description: 'ทำได้ถูกต้องครบถ้วน แต่ยังไม่คล่องแคล่ว' },
      { label: 'Satisfactory (6)', score: 6, description: 'มีข้อผิดพลาดในการทำอยู่บ้าง' },
      { label: 'Unsatisfactory (4)', score: 4, description: 'มีข้อผิดพลาดในการทำหลายประการ' },
    ],
  },
  {
    id: 'fc-2',
    section: 'Clinical Domain',
    domainName: '2. clinical knowledge',
    allowNa: true,
    options: [
      { label: 'Outstanding (10)', score: 10, description: 'ความรู้ถูกต้องทันสมัย สามารถประยุกต์ความรู้ในการดูแลผู้ป่วยแต่ละรายได้ดีเลิศ' },
      { label: 'Very Satisfactory (8)', score: 8, description: 'ความรู้ถูกต้องทันสมัย การประยุกต์ความรู้มีข้อปรับปรุงอยู่บ้าง' },
      { label: 'Satisfactory (6)', score: 6, description: 'ขาดความรู้ที่จำเป็นในการดูแลผู้ป่วยบางประการ' },
      { label: 'Unsatisfactory (4)', score: 4, description: 'ขาดความรู้ที่จำเป็นในการดูแลผู้ป่วยหลายประการ' },
    ],
  },
  {
    id: 'fc-3',
    section: 'Clinical Domain',
    domainName: '3. clinical diagnosis',
    allowNa: true,
    options: [
      { label: 'Outstanding (10)', score: 10, description: 'สรุปปัญหาผู้ป่วยได้ครบถ้วน และ Dx & DDx ได้ถูกต้องเหมาะสม' },
      { label: 'Very Satisfactory (8)', score: 8, description: 'สรุปปัญหาผู้ป่วยได้ครบถ้วน และ Dx ได้ถูกแต่ DDx ยังไม่เหมาะสม' },
      { label: 'Satisfactory (6)', score: 6, description: 'สรุปปัญหาได้ไม่ครบถ้วน หรือ Dx กลุ่มโรคได้แต่ไม่สามารถ Dx โรคได้' },
      { label: 'Unsatisfactory (4)', score: 4, description: 'ไม่สามารถสรุปปัญหาผู้ป่วยได้ หรือไม่สามารถ Dx กลุ่มโรคได้' },
    ],
  },
  {
    id: 'fc-4',
    section: 'Clinical Domain',
    domainName: '4. rational patient investigation & management',
    allowNa: true,
    options: [
      { label: 'Outstanding (10)', score: 10, description: 'ตัดสินใจถูกต้องเหมาะสม ไม่มากเกินความจำเป็น อธิบายเหตุผลน่าเชื่อถือแบบ holistic care' },
      { label: 'Very Satisfactory (8)', score: 8, description: 'ตัดสินใจได้ถูกต้องเหมาะสม แต่การอธิบายเหตุผลยังมีข้อปรับปรุงอยู่บ้าง' },
      { label: 'Satisfactory (6)', score: 6, description: 'การตัดสินใจยังมีข้อผิดพลาดอยู่บ้าง หรือไม่สามารถระบุเหตุผลที่น่าเชื่อถือได้' },
      { label: 'Unsatisfactory (4)', score: 4, description: 'การตัดสินใจยังมีข้อผิดพลาดอยู่หลายประการ' },
    ],
  },
  {
    id: 'fc-5',
    section: 'Clinical Domain',
    domainName: '5. patient education',
    allowNa: true,
    options: [
      { label: 'Outstanding (10)', score: 10, description: 'อธิบายข้อมูลสำคัญครบถ้วน เข้าใจง่ายเหมาะกับพื้นฐานผู้ป่วย เป็นการสื่อสาร 2 ทาง' },
      { label: 'Very Satisfactory (8)', score: 8, description: 'ขาดข้อมูลสำคัญเล็กน้อย หรือขาดการมีส่วนร่วมของผู้ป่วยเล็กน้อย' },
      { label: 'Satisfactory (6)', score: 6, description: 'ขาดข้อมูลสำคัญหลายประเด็น หรือเป็นการสื่อสารทางเดียวเป็นส่วนใหญ่' },
      { label: 'Unsatisfactory (4)', score: 4, description: 'การสื่อสารไม่เหมาะสมกับพื้นฐานผู้ป่วย หรือให้ข้อมูลสำคัญผิด' },
    ],
  },
  {
    id: 'fc-6',
    section: 'Clinical Domain',
    domainName: '6. medical record',
    allowNa: true,
    options: [
      { label: 'Outstanding (10)', score: 10, description: 'บันทึกข้อมูลครบถ้วน เป็นระเบียบ กระชับ สม่ำเสมอ' },
      { label: 'Very Satisfactory (8)', score: 8, description: 'บันทึกข้อมูลครบถ้วนแต่ขาดประเด็นอื่น 1 ประเด็น' },
      { label: 'Satisfactory (6)', score: 6, description: 'บันทึกข้อมูลผิดพลาดเล็กน้อย หรือขาดข้อมูลบางประการ' },
      { label: 'Unsatisfactory (4)', score: 4, description: 'บันทึกข้อมูลผิดพลาดหรือขาดข้อมูลสำคัญหลายประการ' },
    ],
  },
  {
    id: 'fc-7',
    section: 'Clinical Domain',
    domainName: '7. medical ethics & professional laws',
    allowNa: false,
    isPassFailGate: true,
    options: [
      { label: 'ผ่าน (Pass)', score: 1, description: 'ไม่มีพฤติกรรมที่แสดงให้เห็นถึงการไม่รักษาจริยธรรมวิชาชีพ หรือการประพฤติผิดกฎหมาย' },
      { label: 'ไม่ผ่าน (Fail)', score: 0, description: 'มีพฤติกรรมผิดจริยธรรมวิชาชีพหรือประพฤติผิดกฎหมาย' },
    ],
  },
  {
    id: 'fc-8',
    section: 'Generic Domain',
    domainName: '8. presentation',
    allowNa: true,
    options: [
      { label: 'Outstanding (10)', score: 10, description: 'นำเสนอข้อมูลได้เป็นลำดับ เข้าใจง่าย โดยไม่ต้องถามเพิ่มเติม' },
      { label: 'Very Satisfactory (8)', score: 8, description: 'นำเสนอข้อมูลได้เป็นลำดับ เข้าใจง่าย แต่ต้องถามเพิ่มเติมเล็กน้อย' },
      { label: 'Satisfactory (6)', score: 6, description: 'นำเสนอข้อมูลไม่ค่อยเป็นลำดับ เข้าใจค่อนข้างยาก' },
      { label: 'Unsatisfactory (4)', score: 4, description: 'ข้อมูลสับสน ฟังแล้วไม่เข้าใจ นิสิตไม่พร้อมในการนำเสนอ' },
    ],
  },
  {
    id: 'fc-9',
    section: 'Generic Domain',
    domainName: '9. manner',
    allowNa: true,
    options: [
      { label: 'Outstanding (10)', score: 10, description: 'แต่งกายสะอาด ถูกระเบียบ อ่อนน้อม สุภาพ เคารพสิทธิผู้ป่วย' },
      { label: 'Satisfactory (6)', score: 6, description: 'ขาดประเด็นใดประเด็นหนึ่ง' },
      { label: 'Unsatisfactory (4)', score: 4, description: 'ขาดมากกว่า 1 ประเด็น หรือแสดงกิริยาที่ไม่เหมาะสมต่อผู้ป่วย' },
    ],
  },
  {
    id: 'fc-10',
    section: 'Generic Domain',
    domainName: '10. punctuality',
    allowNa: true,
    options: [
      { label: 'Outstanding (10)', score: 10, description: 'ส่งงานตรงตามกำหนดทุกครั้ง และไม่เคยมาสายเลย' },
      { label: 'Very Satisfactory (8)', score: 8, description: 'ส่งงานตรงตามกำหนดเกือบทุกครั้ง และแทบไม่เคยมาสายเลย' },
      { label: 'Satisfactory (6)', score: 6, description: 'ส่งงานช้ากว่ากำหนดเป็นบางครั้ง หรือมาสายเป็นบางครั้ง' },
      { label: 'Unsatisfactory (4)', score: 4, description: 'ส่งงานช้ากว่ากำหนดบ่อยครั้ง หรือมาสายบ่อยครั้ง' },
    ],
  },
  {
    id: 'fc-11',
    section: 'Generic Domain',
    domainName: '11. responsibility',
    allowNa: true,
    options: [
      { label: 'Outstanding (10)', score: 10, description: 'รับผิดชอบดีเลิศ ติดตามความเปลี่ยนแปลงของผู้ป่วยในความดูแลอย่างสม่ำเสมอ' },
      { label: 'Very Satisfactory (8)', score: 8, description: 'มีข้อบกพร่องเล็กน้อยในการดูแลผู้ป่วย/ทำงานที่ได้รับมอบหมาย' },
      { label: 'Satisfactory (6)', score: 6, description: 'มีข้อบกพร่องในการดูแลผู้ป่วย/ทำงานที่ได้รับมอบหมายพอสมควร' },
      { label: 'Unsatisfactory (4)', score: 4, description: 'มีข้อบกพร่องอย่างมาก หรือถูกร้องเรียน' },
    ],
  },
  {
    id: 'fc-12',
    section: 'Generic Domain',
    domainName: '12. honesty',
    allowNa: false,
    isPassFailGate: true,
    options: [
      { label: 'ผ่าน (Pass)', score: 1, description: 'ไม่มีพฤติกรรมที่แสดงให้เห็นถึงความไม่ซื่อสัตย์' },
      { label: 'ไม่ผ่าน (Fail)', score: 0, description: 'มีพฤติกรรมที่แสดงให้เห็นถึงความไม่ซื่อสัตย์' },
    ],
  },
  {
    id: 'fc-13',
    section: 'Generic Domain',
    domainName: '13. information searching',
    allowNa: true,
    options: [
      { label: 'Outstanding (10)', score: 10, description: 'มักจะอ้างอิงจาก journal / database ที่เชื่อถือได้' },
      { label: 'Very Satisfactory (8)', score: 8, description: 'มักจะอ้างอิงจาก standard textbook' },
      { label: 'Satisfactory (6)', score: 6, description: 'มักจะอ้างอิงจากเอกสารคำสอน / ตำราภาษาไทย' },
      { label: 'Unsatisfactory (4)', score: 4, description: 'มักจะอ้างอิงจากตัวบุคคล หรือสืบค้นแล้วได้ข้อมูลที่ไม่ถูกต้อง' },
    ],
  },
  {
    id: 'fc-14',
    section: 'Generic Domain',
    domainName: '14. active participation',
    allowNa: true,
    options: [
      { label: 'Outstanding (10)', score: 10, description: 'มีส่วนร่วมในการเรียนการสอนโดดเด่นกว่านิสิตคนอื่นอย่างชัดเจน แต่ไม่แย่งเพื่อนพูด' },
      { label: 'Very Satisfactory (8)', score: 8, description: 'แสดงความสนใจ ร่วมอภิปรายและมีส่วนร่วมในการเรียนการสอนดีมาก' },
      { label: 'Satisfactory (6)', score: 6, description: 'แสดงความสนใจ ร่วมอภิปรายและมีส่วนร่วมในการเรียนการสอนดีพอสมควร' },
      { label: 'Unsatisfactory (4)', score: 4, description: 'ไม่ค่อยแสดงความสนใจ ไม่มีสมาธิ หรือสร้างปัญหารบกวนการเรียนการสอน' },
    ],
  },
  {
    id: 'fc-15',
    section: 'Generic Domain',
    domainName: '15. teamwork',
    allowNa: true,
    options: [
      { label: 'Outstanding (10)', score: 10, description: 'มีน้ำใจดีเลิศ ช่วยเหลือเกินกว่าที่ได้รับมอบหมายด้วยความเต็มใจเป็นประจำ' },
      { label: 'Very Satisfactory (8)', score: 8, description: 'มีน้ำใจดี ช่วยเหลือเกินกว่าที่ได้รับมอบหมายด้วยความเต็มใจ' },
      { label: 'Satisfactory (6)', score: 6, description: 'ทำงานเท่าที่ได้รับมอบหมายเท่านั้น' },
      { label: 'Unsatisfactory (4)', score: 4, description: 'แสดงกิริยาไม่เหมาะสม หรือปฏิเสธเมื่อได้รับการร้องขอให้ช่วยงาน' },
    ],
  },
  {
    id: 'fc-16',
    section: 'Generic Domain',
    domainName: '16. human relationship',
    allowNa: true,
    options: [
      { label: 'Outstanding (10)', score: 10, description: 'มีมนุษยสัมพันธ์ดีเลิศ ช่วยสร้างบรรยากาศที่ดีให้กับผู้ร่วมงาน' },
      { label: 'Very Satisfactory (8)', score: 8, description: 'มีมนุษยสัมพันธ์ดีมาก ไม่เคยสร้างปัญหาให้กับผู้ร่วมงาน' },
      { label: 'Satisfactory (6)', score: 6, description: 'มีมนุษยสัมพันธ์ดี ทำให้ผู้ร่วมงานอึดอัดใจเป็นบางครั้ง' },
      { label: 'Unsatisfactory (4)', score: 4, description: 'มีปัญหาด้านมนุษยสัมพันธ์ สร้างปัญหาให้ผู้ร่วมงาน' },
    ],
  },
];

export interface FormEItem {
  id: string;
  group: 'A' | 'B';
  label: string;
  shortLabel: string;
  maxScore: number;
}

export const FORM_E_ATTITUDE_OBJECTS: FormEItem[] = [
  {
    id: 'fe-att-1',
    group: 'A',
    label: '1. ตรงต่อเวลา ขึ้นปฏิบัติงานครบถ้วน',
    shortLabel: 'A1. ตรงเวลา',
    maxScore: 5,
  },
  {
    id: 'fe-att-2',
    group: 'A',
    label: '2. มีการปรึกษากับอาจารย์ทางวิชาการหรือมีปัญหาในงานที่ได้รับมอบหมาย',
    shortLabel: 'A2. ปรึกษาอาจารย์',
    maxScore: 5,
  },
  {
    id: 'fe-att-3',
    group: 'A',
    label: '3. ประเมินและยอมรับข้อบกพร่องตนเองและแก้ไข (มาสาย ไม่ทำ lab ปรับปรุงซักประวัติ ตรวจร่างกายและพฤติกรรมอื่นๆ)',
    shortLabel: 'A3. ยอมรับ/แก้ไข',
    maxScore: 5,
  },
  {
    id: 'fe-att-4',
    group: 'A',
    label: '4. แสดงออกซึ่งการแสวงหาความรู้ด้วยตนเองอยู่เสมอ (SDL) รับผิดชอบการศึกษาเพิ่มเติมที่อาจารย์มอบหมาย',
    shortLabel: 'A4. SDL',
    maxScore: 5,
  },
  {
    id: 'fe-att-5',
    group: 'A',
    label: '5. รับผิดชอบต่อผู้ป่วยและงานที่ได้รับมอบหมาย',
    shortLabel: 'A5. รับผิดชอบ',
    maxScore: 5,
  },
  {
    id: 'fe-att-6',
    group: 'A',
    label: '6. ปฏิบัติตามกฎระเบียบของ ศูนย์แพทยศาสตรศึกษาชั้นคลินิกโรงพยาบาลสุรินทร์และ โรงพยาบาลสุรินทร์',
    shortLabel: 'A6. กฎระเบียบ',
    maxScore: 5,
  },
];

export const FORM_E_COMM_OBJECTS: FormEItem[] = [
  {
    id: 'fe-comm-1',
    group: 'B',
    label: '1. มีสัมมาคารวะต่ออาจารย์',
    shortLabel: 'B1. อาจารย์',
    maxScore: 2,
  },
  {
    id: 'fe-comm-2',
    group: 'B',
    label: '2. การปฏิบัติต่อผู้ป่วยและญาติ',
    shortLabel: 'B2. ผู้ป่วย/ญาติ',
    maxScore: 2,
  },
  {
    id: 'fe-comm-3',
    group: 'B',
    label: '3. การปฏิบัติต่อเพื่อนนักศึกษา',
    shortLabel: 'B3. เพื่อน นศพ.',
    maxScore: 2,
  },
  {
    id: 'fe-comm-4',
    group: 'B',
    label: '4. การปฏิบัติต่อแพทย์รุ่นพี่',
    shortLabel: 'B4. แพทย์รุ่นพี่',
    maxScore: 2,
  },
  {
    id: 'fe-comm-5',
    group: 'B',
    label: '5. การปฏิบัติต่อเจ้าหน้าที่อื่น',
    shortLabel: 'B5. เจ้าหน้าที่',
    maxScore: 2,
  },
];

export const FORM_E_ALL_ITEMS: FormEItem[] = [
  ...FORM_E_ATTITUDE_OBJECTS,
  ...FORM_E_COMM_OBJECTS,
];

export const FORM_E_ATTITUDE_ITEMS = FORM_E_ATTITUDE_OBJECTS.map((item) => item.label);

export const FORM_E_COMM_ITEMS = FORM_E_COMM_OBJECTS.map((item) => item.label);

export function getFormCatalogItems(formType: EvaluationFormType): {
  id: string;
  label: string;
  section?: string;
  maxScoreLabel: string;
}[] {
  switch (formType) {
    case 'well_baby':
      return WELL_BABY_ITEMS.map((item) => ({
        id: item.id,
        label: item.label,
        section: item.group,
        maxScoreLabel: `เต็ม ${item.maxScore}`,
      }));
    case 'form_a':
      return FORM_A_DOMAINS.map((d) => ({
        id: d.id,
        label: d.domainName,
        maxScoreLabel: 'เต็ม 10',
      }));
    case 'form_b':
      return FORM_B_ITEMS.map((item) => ({
        id: item.id,
        label: item.label,
        section: item.section,
        maxScoreLabel: `เต็ม ${item.maxScore}`,
      }));
    case 'form_c':
      return FORM_C_DOMAINS.map((d) => ({
        id: d.id,
        label: d.domainName,
        section: d.section,
        maxScoreLabel: d.isPassFailGate ? 'ผ่าน/ไม่ผ่าน (Gate)' : 'เต็ม 10',
      }));
    case 'form_e':
      return FORM_E_ALL_ITEMS.map((item) => ({
        id: item.id,
        label: item.label,
        section: item.group === 'A' ? 'หมวด (A) เจตคติ' : 'หมวด (B) สัมพันธภาพ',
        maxScoreLabel: `เต็ม ${item.maxScore}`,
      }));
  }
}

export function getAllFormItemIds(formType: EvaluationFormType): string[] {
  return getFormCatalogItems(formType).map((item) => item.id);
}

export function createDefaultEnabledItemsMap(): Record<EvaluationFormType, string[]> {
  return {
    well_baby: getAllFormItemIds('well_baby'),
    form_a: getAllFormItemIds('form_a'),
    form_b: getAllFormItemIds('form_b'),
    form_c: getAllFormItemIds('form_c'),
    form_e: getAllFormItemIds('form_e'),
  };
}

export const FORM_METADATA: Record<
  EvaluationFormType,
  { shortName: string; fullName: string; description: string; maxScoreLabel: string }
> = {
  form_a: {
    shortName: 'Form A (OPD/BST)',
    fullName: 'MEC_Surin Performance Assessment Form A (Cross-Sectional Observation)',
    description: 'แบบประเมินการสังเกตทางคลินิกแบบตัดขวาง ณ OPD / Ward / Bedside Teaching (8 ด้าน + Overall)',
    maxScoreLabel: 'เต็ม 10 คะแนน/ด้าน (คิดร้อยละ)',
  },
  form_b: {
    shortName: 'แบบประเมิน B (SDL/OPL)',
    fullName: 'แบบประเมิน B (No Inter / SDL / OPL สำหรับอาจารย์แพทย์ประเมินไว้ตัดเกรด)',
    description: 'ประเมินทักษะทางคลินิก การเรียนรู้ด้วยตนเอง (EBM/SDL) การปฏิบัติงาน (OPL) และเจตคติ',
    maxScoreLabel: 'คะแนนเต็ม 100 คะแนน',
  },
  form_c: {
    shortName: 'Form C (Longitudinal)',
    fullName: 'MEC_Surin Performance Assessment Form C (Longitudinal Observation)',
    description: 'ประเมินต่อเนื่องตลอดสายงาน (17 ด้าน: Clinical Domain, Ethics/Honesty Gate และ Generic Domain)',
    maxScoreLabel: 'เต็ม 10 คะแนน/ด้าน + ผ่านเกณฑ์จริยธรรม',
  },
  form_e: {
    shortName: 'Form E (เจตคติ 40 คะแนน)',
    fullName: 'Surin Performance Assessment Form E: เจตคติและการสร้างสัมพันธภาพ',
    description: 'เจตคติ (A) 30 คะแนน + สัมพันธภาพ (B) 10 คะแนน พร้อมเกณฑ์ตัดสิทธิ์สอบ/F หากไม่ผ่านด้านเจตคติ',
    maxScoreLabel: 'คะแนนเต็ม 40 คะแนน (Gatekeeper)',
  },
  well_baby: {
    shortName: 'Well Baby Clinic (20 คะแนน)',
    fullName: 'แบบประเมินคลินิกสุขภาพเด็กดี (Well Baby Clinic) สำหรับอาจารย์แพทย์ประเมินไว้ตัดเกรด',
    description: 'ประเมิน Holistic History, Growth Chart, พัฒนาการ DSPM/Denver II, วัคซีน และ Child Health Supervision',
    maxScoreLabel: 'คะแนนเต็ม 20 คะแนน (O / M / S / U)',
  },
};

export const FORM_DEFAULT_GRADE_TARGET: Record<EvaluationFormType, BuiltInGradeTarget> = {
  form_a: 'formA',
  form_b: 'formB',
  form_c: 'formC',
  well_baby: 'wellBaby',
  form_e: 'formE',
};

export const BUILT_IN_GRADE_BUCKETS: {
  id: BuiltInGradeTarget;
  shortLabel: string;
  label: string;
  formType?: EvaluationFormType;
}[] = [
  { id: 'formA', shortLabel: 'Form A', label: 'Form A (OPD / Bedside Teaching)', formType: 'form_a' },
  { id: 'formB', shortLabel: 'Form B', label: 'แบบประเมิน B (SDL / OPL)', formType: 'form_b' },
  { id: 'formC', shortLabel: 'Form C', label: 'Form C (Longitudinal)', formType: 'form_c' },
  { id: 'wellBaby', shortLabel: 'Well Baby', label: 'แบบประเมิน Well Baby Clinic', formType: 'well_baby' },
  { id: 'formE', shortLabel: 'Form E', label: 'Form E (เจตคติและสัมพันธภาพ)', formType: 'form_e' },
  { id: 'osce', shortLabel: 'OSCE', label: 'คะแนนสอบปฏิบัติ OSCE / Long Case' },
  { id: 'writtenExam', shortLabel: 'ข้อเขียน', label: 'คะแนนสอบข้อเขียน MCQ / MEQ' },
];

export interface MergedFormCatalogItem {
  id: string;
  formType: EvaluationFormType;
  topicKey: string; // `${formType}:${id}`
  label: string;
  section?: string;
  maxScore: number;
  maxScoreLabel: string;
  isCustom?: boolean;
  allowNa?: boolean;
  isPassFailGate?: boolean;
}

export function getMergedFormCatalogItems(
  formType: EvaluationFormType,
  config?: Pick<CourseGradingConfig, 'customItems'>
): MergedFormCatalogItem[] {
  const baseItems: MergedFormCatalogItem[] = (() => {
    switch (formType) {
      case 'well_baby':
        return WELL_BABY_ITEMS.map((item) => ({
          id: item.id,
          formType,
          topicKey: `${formType}:${item.id}`,
          label: item.label,
          section: item.group,
          maxScore: item.maxScore,
          maxScoreLabel: `เต็ม ${item.maxScore}`,
        }));
      case 'form_a':
        return FORM_A_DOMAINS.map((d) => ({
          id: d.id,
          formType,
          topicKey: `${formType}:${d.id}`,
          label: d.domainName,
          maxScore: 10,
          maxScoreLabel: 'เต็ม 10',
          allowNa: d.allowNa,
        }));
      case 'form_b':
        return FORM_B_ITEMS.map((item) => ({
          id: item.id,
          formType,
          topicKey: `${formType}:${item.id}`,
          label: item.label,
          section: item.section,
          maxScore: item.maxScore,
          maxScoreLabel: `เต็ม ${item.maxScore}`,
        }));
      case 'form_c':
        return FORM_C_DOMAINS.map((d) => ({
          id: d.id,
          formType,
          topicKey: `${formType}:${d.id}`,
          label: d.domainName,
          section: d.section,
          maxScore: d.isPassFailGate ? 1 : 10,
          maxScoreLabel: d.isPassFailGate ? 'ผ่าน/ไม่ผ่าน (Gate)' : 'เต็ม 10',
          allowNa: d.allowNa,
          isPassFailGate: d.isPassFailGate,
        }));
      case 'form_e':
        return FORM_E_ALL_ITEMS.map((item) => ({
          id: item.id,
          formType,
          topicKey: `${formType}:${item.id}`,
          label: item.label,
          section: item.group === 'A' ? 'หมวด (A) เจตคติ' : 'หมวด (B) สัมพันธภาพ',
          maxScore: item.maxScore,
          maxScoreLabel: `เต็ม ${item.maxScore}`,
        }));
    }
  })();

  const customList = (config?.customItems?.[formType] ?? []).map((item) => ({
    id: item.id,
    formType,
    topicKey: `${formType}:${item.id}`,
    label: item.label,
    section: item.section || 'หัวข้อเพิ่มเติมประจำรายวิชา',
    maxScore: item.maxScore,
    maxScoreLabel: `เต็ม ${item.maxScore}`,
    isCustom: true,
    allowNa: item.allowNa,
  }));

  return [...baseItems, ...customList];
}

export function getAllMergedFormItemIds(
  formType: EvaluationFormType,
  config?: Pick<CourseGradingConfig, 'customItems'>
): string[] {
  return getMergedFormCatalogItems(formType, config).map((i) => i.id);
}

export function getAllCourseTopicCatalog(
  config: Pick<CourseGradingConfig, 'enabledForms' | 'enabledItems' | 'customItems'>
): MergedFormCatalogItem[] {
  const forms: EvaluationFormType[] =
    config.enabledForms && config.enabledForms.length > 0
      ? config.enabledForms
      : ['form_a', 'form_b', 'form_c', 'well_baby', 'form_e'];
  return forms.flatMap((formType) => {
    const allItems = getMergedFormCatalogItems(formType, config);
    const enabled = config.enabledItems?.[formType];
    if (!enabled) return allItems;
    return allItems.filter((item) => enabled.includes(item.id));
  });
}
