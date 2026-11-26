import { useEffect, useState } from 'react';
import {
  Check,
  CloudDownload,
  CloudUpload,
  Code2,
  Copy,
  ExternalLink,
  FileCode2,
  FileSpreadsheet,
  RefreshCw,
  X,
} from 'lucide-react';
import codeGsTemplate from '../../google-apps-script/Code.gs?raw';
import indexHtmlTemplate from '../../google-apps-script/Index.html?raw';

export interface PortalSyncPayload {
  conferences: unknown[];
  announcements: unknown[];
  shifts: unknown[];
  logbookEntries: unknown[];
  quotas: unknown[];
  epas: unknown[];
  evaluations: unknown[];
  researchProjects: unknown[];
  welfareRequests: unknown[];
  gradingConfigs: unknown[];
  studentScores: unknown[];
  facultySubmissions: unknown[];
  leaveRequests: unknown[];
  preceptorFeedbacks: unknown[];
  clinicalSkills: unknown[];
  roomBookings: unknown[];
  referenceMaterials: unknown[];
  referenceCheckouts: unknown[];
  bedsideCheckIns: unknown[];
  approvedPeerReviewDomains: unknown[];
  peerReviewEntries: unknown[];
}

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  actorName: string;
  currentPayload: PortalSyncPayload;
  onApplyPulledData: (data: Partial<PortalSyncPayload>) => void;
  onNotify: (message: string) => void;
}

const DEFAULT_SHEET_ID = '1iwYYWj_IRqdf9IcXzBtoprQgjvEE6w2ghmBSyiHo9LE';
const DEFAULT_GAS_URL =
  'https://script.google.com/macros/s/AKfycbxkVZe7xTSq3_p3FLBfNJ2otMUvBTn2GfApLbLtiqMKGxYc2r8KvFwdmD7BTmqp5xVbLw/exec';

export function GoogleSheetsSyncModal({
  isOpen,
  onClose,
  actorName,
  currentPayload,
  onApplyPulledData,
  onNotify,
}: GoogleSheetsSyncModalProps) {
  const [activeSubTab, setActiveSubTab] = useState<'sync' | 'gs' | 'index'>('sync');
  const [spreadsheetId, setSpreadsheetId] = useState(DEFAULT_SHEET_ID);
  const [webAppUrl, setWebAppUrl] = useState(DEFAULT_GAS_URL);
  const [busyAction, setBusyAction] = useState<'ping' | 'push' | 'pull' | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sheetSummary, setSheetSummary] = useState<{
    spreadsheetName?: string;
    sheets?: { name: string; rows: number }[];
    serverTime?: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<'gs' | 'index' | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage(null);
    fetch('/api/sheets/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((cfg: { spreadsheetId?: string; webAppUrl?: string } | null) => {
        if (cfg?.spreadsheetId) setSpreadsheetId(cfg.spreadsheetId);
        if (cfg?.webAppUrl) setWebAppUrl(cfg.webAppUrl);
      })
      .catch(() => {
        // Fallback to defaults
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const callGasJsonWithProxyFallback = async (
    proxyUrl: string,
    directUrl: string,
    init?: RequestInit
  ): Promise<{ok: boolean; body: Record<string, unknown>}> => {
    try {
      const res = await fetch(proxyUrl, init);
      const contentType = res.headers.get('content-type') || '';
      if (res.status !== 404 && contentType.includes('application/json')) {
        const body = (await res.json()) as Record<string, unknown>;
        return {ok: res.ok, body};
      }
    } catch {
      // Fall through to direct Google Apps Script request
    }

    const directRes = await fetch(directUrl, {
      ...init,
      redirect: 'follow',
      ...(init?.method === 'POST'
        ? {headers: {'Content-Type': 'text/plain;charset=utf-8'}}
        : {}),
    });
    const text = await directRes.text();
    const parsed = JSON.parse(text.trim()) as Record<string, unknown>;
    return {ok: directRes.ok && parsed.ok !== false, body: parsed};
  };

  const handlePing = async () => {
    setBusyAction('ping');
    setErrorMessage(null);
    setStatusMessage(null);
    const trimmedUrl = webAppUrl.trim();
    const sep = trimmedUrl.includes('?') ? '&' : '?';
    try {
      const {ok, body} = await callGasJsonWithProxyFallback(
        `/api/sheets/ping?url=${encodeURIComponent(trimmedUrl)}`,
        `${trimmedUrl}${sep}action=ping`
      );
      const typed = body as {
        error?: string;
        spreadsheetName?: string;
        sheets?: {name: string; rows: number}[];
        serverTime?: string;
      };
      if (!ok) {
        setErrorMessage(typed.error || 'ไม่สามารถเชื่อมต่อ Google Apps Script ได้');
        return;
      }
      setSheetSummary({
        spreadsheetName: typed.spreadsheetName,
        sheets: typed.sheets,
        serverTime: typed.serverTime,
      });
      setStatusMessage(
        `เชื่อมต่อไฟล์ "${typed.spreadsheetName ?? spreadsheetId}" สำเร็จแล้ว`
      );
    } catch {
      setErrorMessage('เกิดข้อผิดพลาดระหว่างตรวจสอบการเชื่อมต่อ');
    } finally {
      setBusyAction(null);
    }
  };

  const handlePush = async () => {
    setBusyAction('push');
    setErrorMessage(null);
    setStatusMessage(null);
    const trimmedUrl = webAppUrl.trim();
    try {
      let ok = false;
      let body: Record<string, unknown> = {};
      try {
        const res = await fetch('/api/sheets/push', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            webAppUrl: trimmedUrl,
            actor: actorName,
            data: currentPayload,
          }),
        });
        const contentType = res.headers.get('content-type') || '';
        if (res.status !== 404 && contentType.includes('application/json')) {
          ok = res.ok;
          body = (await res.json()) as Record<string, unknown>;
        } else {
          throw new Error('use_direct');
        }
      } catch {
        const directRes = await fetch(trimmedUrl, {
          method: 'POST',
          redirect: 'follow',
          headers: {'Content-Type': 'text/plain;charset=utf-8'},
          body: JSON.stringify({
            action: 'syncAll',
            actor: actorName,
            data: currentPayload,
          }),
        });
        const text = await directRes.text();
        body = JSON.parse(text.trim()) as Record<string, unknown>;
        ok = directRes.ok && body.ok !== false;
      }

      const typed = body as {
        error?: string;
        syncedAt?: string;
        counts?: Record<string, number>;
      };
      if (!ok) {
        setErrorMessage(typed.error || 'ไม่สามารถส่งข้อมูลขึ้น Google Sheets ได้');
        return;
      }
      const countText = typed.counts
        ? `Logbook ${typed.counts.logbookEntries ?? 0} · เวร ${typed.counts.shifts ?? 0} · แบบประเมิน ${typed.counts.facultySubmissions ?? 0} · คะแนน ${typed.counts.studentScores ?? 0}`
        : '';
      const msg = `ส่งข้อมูลขึ้น Google Sheet สำเร็จ (${countText})`;
      setStatusMessage(msg);
      onNotify(msg);
    } catch {
      setErrorMessage('เกิดข้อผิดพลาดในการส่งข้อมูลขึ้น Google Sheets');
    } finally {
      setBusyAction(null);
    }
  };

  const handlePull = async () => {
    setBusyAction('pull');
    setErrorMessage(null);
    setStatusMessage(null);
    const trimmedUrl = webAppUrl.trim();
    const sep = trimmedUrl.includes('?') ? '&' : '?';
    try {
      const {ok, body} = await callGasJsonWithProxyFallback(
        `/api/sheets/pull?url=${encodeURIComponent(trimmedUrl)}`,
        `${trimmedUrl}${sep}action=getAll`
      );
      const typed = body as {
        error?: string;
        spreadsheetName?: string;
        updatedAt?: string;
        data?: Partial<PortalSyncPayload>;
      };
      if (!ok) {
        setErrorMessage(typed.error || 'ไม่สามารถดึงข้อมูลจาก Google Sheets ได้');
        return;
      }
      if (!typed.data || Object.keys(typed.data).length === 0) {
        setErrorMessage(
          'ยังไม่มีข้อมูลใน Google Sheet กรุณากด "ส่งข้อมูลขึ้น Google Sheet" ก่อนเพื่อสร้างฐานข้อมูลเริ่มต้น'
        );
        return;
      }
      onApplyPulledData(typed.data);
      const msg = `นำเข้าข้อมูลล่าสุดจาก "${typed.spreadsheetName ?? spreadsheetId}" เข้าสู่ระบบแล้ว`;
      setStatusMessage(msg);
      onNotify(msg);
    } catch {
      setErrorMessage('เกิดข้อผิดพลาดในการดึงข้อมูลจาก Google Sheets');
    } finally {
      setBusyAction(null);
    }
  };

  const handleCopyCode = async (kind: 'gs' | 'index', content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedKey(kind);
      onNotify(
        kind === 'gs'
          ? 'คัดลอกโค้ด Code.gs เรียบร้อยแล้ว'
          : 'คัดลอกโค้ด Index.html เรียบร้อยแล้ว'
      );
      window.setTimeout(() => {
        setCopiedKey((prev) => (prev === kind ? null : prev));
      }, 2400);
    } catch {
      onNotify('ไม่สามารถคัดลอกอัตโนมัติได้ กรุณาเลือกข้อความและกด Ctrl+C / Cmd+C');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#091A32]/65 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gs-sync-modal-title"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#091A32] text-white px-5 sm:px-6 py-4 flex items-center justify-between gap-4 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#2DD4BF]/15 border border-[#2DD4BF]/30 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-[#2DD4BF]" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 id="gs-sync-modal-title" className="text-base sm:text-lg font-bold truncate">
                เชื่อมต่อ Google Sheets & Apps Script
              </h2>
              <p className="text-xs text-slate-300 font-mono truncate">
                Sheet ID: {spreadsheetId}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-navigation */}
        <div className="px-5 sm:px-6 pt-3 pb-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('sync')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSubTab === 'sync'
                ? 'bg-[#091A32] text-white'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            ซิงค์ข้อมูลกับ Google Sheet
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('gs')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSubTab === 'gs'
                ? 'bg-[#091A32] text-white'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" aria-hidden="true" />
            โค้ด Code.gs
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('index')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSubTab === 'index'
                ? 'bg-[#091A32] text-white'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" aria-hidden="true" />
            โค้ด Index.html
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {activeSubTab === 'sync' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="text-xs font-semibold text-slate-500">
                    Google Spreadsheet ID
                  </div>
                  <div className="font-mono text-xs sm:text-sm text-[#091A32] break-all font-semibold">
                    {spreadsheetId}
                  </div>
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#0D9488] hover:underline"
                  >
                    เปิดไฟล์ Google Sheet
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                  </a>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <label
                    htmlFor="gas-url-input"
                    className="block text-xs font-semibold text-slate-500"
                  >
                    Google Apps Script Web App URL (/exec)
                  </label>
                  <input
                    id="gas-url-input"
                    type="url"
                    value={webAppUrl}
                    onChange={(e) => setWebAppUrl(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#0D9488]"
                  />
                  <a
                    href={webAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#0D9488] hover:underline"
                  >
                    เปิดหน้าเว็บ Apps Script (/exec)
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                  </a>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={busyAction !== null}
                  onClick={() => void handlePing()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] text-sm font-semibold text-[#091A32] bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${busyAction === 'ping' ? 'animate-spin' : ''}`}
                    aria-hidden="true"
                  />
                  <span>ตรวจสอบการเชื่อมต่อ (Ping)</span>
                </button>

                <button
                  type="button"
                  disabled={busyAction !== null}
                  onClick={() => void handlePush()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] text-sm font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-xl transition-colors disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <CloudUpload className="w-4 h-4" aria-hidden="true" />
                  <span>
                    {busyAction === 'push'
                      ? 'กำลังส่งข้อมูลขึ้น Sheet...'
                      : 'ส่งข้อมูลทั้งหมดขึ้น Google Sheet'}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={busyAction !== null}
                  onClick={() => void handlePull()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] text-sm font-semibold text-white bg-[#091A32] hover:bg-[#142F56] rounded-xl transition-colors disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <CloudDownload className="w-4 h-4" aria-hidden="true" />
                  <span>
                    {busyAction === 'pull'
                      ? 'กำลังดึงข้อมูล...'
                      : 'ดึงข้อมูลจาก Google Sheet'}
                  </span>
                </button>
              </div>

              {statusMessage && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">
                  {statusMessage}
                </div>
              )}

              {errorMessage && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-900">
                  {errorMessage}
                </div>
              )}

              {sheetSummary?.sheets && sheetSummary.sheets.length > 0 && (
                <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="text-xs font-semibold text-slate-700">
                    แท็บข้อมูลที่พร้อมใช้งานใน "{sheetSummary.spreadsheetName}"
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {sheetSummary.sheets.map((s) => (
                      <div
                        key={s.name}
                        className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                      >
                        <div className="font-mono font-semibold text-[#091A32] truncate">
                          {s.name}
                        </div>
                        <div className="text-slate-500 tabular-nums mt-0.5">
                          {s.rows} แถว
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Current local records overview */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="text-xs font-semibold text-slate-700">
                  ข้อมูลปัจจุบันในพอร์ทัลที่พร้อมซิงค์ขึ้น Google Sheet
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-slate-500">E-Logbook</div>
                    <div className="text-base font-bold text-[#091A32] tabular-nums">
                      {currentPayload.logbookEntries.length}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-slate-500">ตารางเวร</div>
                    <div className="text-base font-bold text-[#091A32] tabular-nums">
                      {currentPayload.shifts.length}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-slate-500">แบบประเมิน</div>
                    <div className="text-base font-bold text-[#091A32] tabular-nums">
                      {currentPayload.facultySubmissions.length}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-slate-500">คะแนนรายวิชา</div>
                    <div className="text-base font-bold text-[#091A32] tabular-nums">
                      {currentPayload.studentScores.length}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-slate-500">โครงสร้างเกรด</div>
                    <div className="text-base font-bold text-[#091A32] tabular-nums">
                      {currentPayload.gradingConfigs.length}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-slate-500">ประกาศ</div>
                    <div className="text-base font-bold text-[#091A32] tabular-nums">
                      {currentPayload.announcements.length}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeSubTab === 'gs' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-slate-600">
                  นำโค้ดด้านล่างไปวางในไฟล์ <span className="font-mono font-semibold text-[#091A32]">Code.gs</span> ของ Google Apps Script แล้วกด Deploy → Manage deployments → New version (สิทธิ์ Anyone)
                </div>
                <button
                  type="button"
                  onClick={() => void handleCopyCode('gs', codeGsTemplate)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {copiedKey === 'gs' ? (
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  <span>{copiedKey === 'gs' ? 'คัดลอกแล้ว' : 'คัดลอก Code.gs'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-[#091A32] text-slate-100 text-xs font-mono overflow-x-auto max-h-[50vh] leading-relaxed">
                <code>{codeGsTemplate}</code>
              </pre>
            </div>
          )}

          {activeSubTab === 'index' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-slate-600">
                  สร้างไฟล์ HTML ชื่อ <span className="font-mono font-semibold text-[#091A32]">Index</span> (Google Apps Script จะบันทึกเป็น <span className="font-mono">Index.html</span>) แล้ววางโค้ดนี้
                </div>
                <button
                  type="button"
                  onClick={() => void handleCopyCode('index', indexHtmlTemplate)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {copiedKey === 'index' ? (
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  <span>{copiedKey === 'index' ? 'คัดลอกแล้ว' : 'คัดลอก Index.html'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-[#091A32] text-slate-100 text-xs font-mono overflow-x-auto max-h-[50vh] leading-relaxed">
                <code>{indexHtmlTemplate}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
