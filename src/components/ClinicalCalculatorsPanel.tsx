import { useState } from 'react';
import { Calculator } from 'lucide-react';

type CalcType = 'crcl' | 'fluid421' | 'calcium_map';

export function ClinicalCalculatorsPanel() {
  const [activeCalc, setActiveCalc] = useState<CalcType>('crcl');

  // 1. Cockcroft-Gault CrCl
  const [age, setAge] = useState('58');
  const [weightKg, setWeightKg] = useState('62');
  const [scr, setScr] = useState('1.4');
  const [sex, setSex] = useState<'male' | 'female'>('male');

  // 2. Pediatric Holliday-Segar 4-2-1 Maintenance Fluid
  const [pedWeight, setPedWeight] = useState('16');

  // 3. Corrected Calcium & MAP
  const [measuredCa, setMeasuredCa] = useState('7.8');
  const [albumin, setAlbumin] = useState('2.5');
  const [sbp, setSbp] = useState('92');
  const [dbp, setDbp] = useState('58');

  // Computations
  const numAge = Math.max(1, Number(age) || 0);
  const numWeight = Math.max(1, Number(weightKg) || 0);
  const numScr = Math.max(0.1, Number(scr) || 0.1);
  const crclRaw = ((140 - numAge) * numWeight) / (72 * numScr);
  const crcl = (sex === 'female' ? crclRaw * 0.85 : crclRaw).toFixed(1);

  const pw = Math.max(0, Number(pedWeight) || 0);
  let hourlyMl = 0;
  if (pw <= 10) hourlyMl = pw * 4;
  else if (pw <= 20) hourlyMl = 40 + (pw - 10) * 2;
  else hourlyMl = 60 + (pw - 20) * 1;
  const dailyMl = Math.round(hourlyMl * 24);

  const ca = Number(measuredCa) || 0;
  const alb = Number(albumin) || 0;
  const correctedCa = (ca + 0.8 * (4.0 - alb)).toFixed(2);
  const sbpVal = Number(sbp) || 0;
  const dbpVal = Number(dbp) || 0;
  const mapVal = ((sbpVal + 2 * dbpVal) / 3).toFixed(0);

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-[#0F2A4A]" aria-hidden="true" />
            เครื่องคำนวณทางคลินิกข้างเตียง (Bedside Clinical Calculators)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            เครื่องมือช่วยคำนวณขนาดยา สารน้ำเด็ก และค่าทางห้องปฏิบัติการระหว่างปฏิบัติงานบนหอผู้ป่วยและ ER
          </p>
        </div>

        <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg self-start">
          {(
            [
              { id: 'crcl', label: 'CrCl (Cockcroft-Gault)' },
              { id: 'fluid421', label: 'สารน้ำเด็ก (4-2-1)' },
              { id: 'calcium_map', label: 'Corrected Ca & MAP' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveCalc(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeCalc === tab.id
                  ? 'bg-white text-[#0F2A4A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeCalc === 'crcl' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">อายุ (ปี)</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">น้ำหนัก (kg)</label>
              <input
                type="number"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Serum Cr (mg/dL)</label>
              <input
                type="number"
                step="0.1"
                value={scr}
                onChange={(e) => setScr(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">เพศ</label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value as 'male' | 'female')}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              >
                <option value="male">ชาย</option>
                <option value="female">หญิง (×0.85)</option>
              </select>
            </div>
          </div>

          <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs text-slate-500">Estimated Creatinine Clearance</div>
              <div className="text-2xl font-bold text-[#0F2A4A] tabular-nums mt-0.5">
                {crcl} <span className="text-sm font-normal text-slate-600">mL/min</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {Number(crcl) < 30
                  ? 'ควรปรับขนาดยาปฏิชีวนะและหลีกเลี่ยงยาที่มีพิษต่อไต'
                  : Number(crcl) < 60
                    ? 'การทำงานของไตลดลงปานกลาง (ตรวจ Renal Dosing ก่อนสั่งยา)'
                    : 'อยู่ในเกณฑ์ปกติสำหรับการบริหารยาทั่วไป'}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeCalc === 'fluid421' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-5">
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              น้ำหนักตัวผู้ป่วยเด็ก (kg)
            </label>
            <input
              type="number"
              step="0.5"
              value={pedWeight}
              onChange={(e) => setPedWeight(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg tabular-nums"
            />
            <p className="text-xs text-slate-500 mt-1.5">
              สูตร Holliday-Segar: 10 kg แรก × 4 · 10 kg ถัดไป × 2 · เกิน 20 kg × 1 mL/kg/hr
            </p>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="text-xs text-slate-500">อัตราการหยดสารน้ำ (Maintenance Rate)</div>
              <div className="text-2xl font-bold text-[#0F2A4A] tabular-nums mt-0.5">
                {hourlyMl.toFixed(1)} <span className="text-sm font-normal text-slate-600">mL/hr</span>
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="text-xs text-slate-500">ปริมาณสารน้ำรวมต่อ 24 ชั่วโมง</div>
              <div className="text-2xl font-bold text-emerald-700 tabular-nums mt-0.5">
                {dailyMl} <span className="text-sm font-normal text-slate-600">mL/day</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeCalc === 'calcium_map' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Serum Ca (mg/dL)</label>
              <input
                type="number"
                step="0.1"
                value={measuredCa}
                onChange={(e) => setMeasuredCa(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Albumin (g/dL)</label>
              <input
                type="number"
                step="0.1"
                value={albumin}
                onChange={(e) => setAlbumin(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">SBP (mmHg)</label>
              <input
                type="number"
                value={sbp}
                onChange={(e) => setSbp(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">DBP (mmHg)</label>
              <input
                type="number"
                value={dbp}
                onChange={(e) => setDbp(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg tabular-nums"
              />
            </div>
          </div>

          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="text-xs text-slate-500">Corrected Calcium</div>
              <div className="text-2xl font-bold text-[#0F2A4A] tabular-nums mt-0.5">
                {correctedCa} <span className="text-sm font-normal text-slate-600">mg/dL</span>
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="text-xs text-slate-500">Mean Arterial Pressure (MAP)</div>
              <div
                className={`text-2xl font-bold tabular-nums mt-0.5 ${
                  Number(mapVal) < 65 ? 'text-rose-700' : 'text-emerald-700'
                }`}
              >
                {mapVal} <span className="text-sm font-normal text-slate-600">mmHg</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
