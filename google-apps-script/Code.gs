/**
 * ศูนย์แพทยศาสตรศึกษาชั้นคลินิก โรงพยาบาลสุรินทร์ (CPIRD Years 4-6)
 * Google Apps Script Backend (Code.gs)
 * เชื่อมต่อ Google Sheet ID: 1iwYYWj_IRqdf9IcXzBtoprQgjvEE6w2ghmBSyiHo9LE
 * Web App URL: https://script.google.com/macros/s/AKfycbxkVZe7xTSq3_p3FLBfNJ2otMUvBTn2GfApLbLtiqMKGxYc2r8KvFwdmD7BTmqp5xVbLw/exec
 */

const SPREADSHEET_ID = '1iwYYWj_IRqdf9IcXzBtoprQgjvEE6w2ghmBSyiHo9LE';
const WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbxkVZe7xTSq3_p3FLBfNJ2otMUvBTn2GfApLbLtiqMKGxYc2r8KvFwdmD7BTmqp5xVbLw/exec';
const CHUNK_SIZE = 40000; // ป้องกันขีดจำกัด 50,000 ตัวอักษรต่อเซลล์ของ Google Sheets

const SHEET_SCHEMAS = {
  Portal_Snapshot: ['key', 'chunkIndex', 'totalChunks', 'updatedAt', 'updatedBy', 'payloadChunk'],
  Logbook_Entries: [
    'id',
    'date',
    'department',
    'setting',
    'caseCode',
    'patientSummary',
    'icd10',
    'diagnosis',
    'procedure',
    'role',
    'preceptor',
    'status',
    'reflection',
    'feedback',
  ],
  Duty_Shifts: [
    'id',
    'isoDate',
    'date',
    'dayLabel',
    'department',
    'wardOrUnit',
    'shiftType',
    'timeRange',
    'assignedStudent',
    'studentYear',
    'supervisingStaff',
    'checkedInAt',
    'checkInMethod',
    'swapStatus',
    'swapNote',
  ],
  Faculty_Evaluations: [
    'id',
    'date',
    'formType',
    'formTitle',
    'courseCode',
    'courseName',
    'wardOrSubrotation',
    'studentId',
    'studentName',
    'evaluatorName',
    'rawScore',
    'maxScore',
    'percentage',
    'ratingLabel',
    'passedAttitudeGate',
    'feedback',
    'itemPercentagesJson',
  ],
  Student_Scores: [
    'id',
    'studentId',
    'studentName',
    'yearLevel',
    'courseCode',
    'formA',
    'formB',
    'formC',
    'wellBaby',
    'formE',
    'osce',
    'writtenExam',
    'attitudeGatePassed',
    'absenceDays',
    'customGroupScoresJson',
  ],
  Grading_Configs: [
    'courseCode',
    'courseName',
    'credits',
    'mplPercent',
    'strictMedicalMpl',
    'enforceAttitudeGate',
    'enabledForms',
    'weightsJson',
    'customItemsJson',
    'customGradeGroupsJson',
    'itemGradeMappingJson',
  ],
  Announcements: ['id', 'date', 'category', 'title', 'author', 'urgent', 'summary'],
};

function getSpreadsheet_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function ensureSheet_(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  const lastRow = sheet.getLastRow();
  if (lastRow === 0 && headers && headers.length > 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet
      .getRange(1, 1, 1, headers.length)
      .setBackground('#091A32')
      .setFontColor('#FFFFFF')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function initializeSheets_() {
  const ss = getSpreadsheet_();
  Object.keys(SHEET_SCHEMAS).forEach(function (name) {
    ensureSheet_(ss, name, SHEET_SCHEMAS[name]);
  });
  return ss;
}

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function doGet(e) {
  const params = (e && e.parameter) || {};
  const action = params.action || '';

  if (!action) {
    return HtmlService.createTemplateFromFile('Index')
      .evaluate()
      .setTitle('ศูนย์แพทยศาสตรศึกษาชั้นคลินิก โรงพยาบาลสุรินทร์')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=yes')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  try {
    const ss = initializeSheets_();

    if (action === 'ping') {
      return jsonOutput_({
        ok: true,
        spreadsheetId: SPREADSHEET_ID,
        spreadsheetName: ss.getName(),
        webAppUrl: WEB_APP_URL,
        sheets: ss.getSheets().map(function (s) {
          return { name: s.getName(), rows: Math.max(0, s.getLastRow() - 1) };
        }),
        serverTime: new Date().toISOString(),
      });
    }

    if (action === 'getAll') {
      return jsonOutput_(readSnapshotOrTables_(ss));
    }

    if (action === 'getSummary') {
      return jsonOutput_(getDashboardData());
    }

    return jsonOutput_({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonOutput_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const ss = initializeSheets_();
    const rawBody = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const body = JSON.parse(rawBody);
    const action = body.action || 'syncAll';

    if (action === 'syncAll') {
      const payload = body.data || {};
      const actor = body.actor || 'Surin MEC Portal';
      const syncedAt = new Date().toISOString();

      saveSnapshotChunks_(ss, payload, actor, syncedAt);
      syncTabularSheets_(ss, payload);

      return jsonOutput_({
        ok: true,
        action: 'syncAll',
        spreadsheetId: SPREADSHEET_ID,
        syncedAt: syncedAt,
        counts: {
          logbookEntries: Array.isArray(payload.logbookEntries) ? payload.logbookEntries.length : 0,
          shifts: Array.isArray(payload.shifts) ? payload.shifts.length : 0,
          facultySubmissions: Array.isArray(payload.facultySubmissions)
            ? payload.facultySubmissions.length
            : 0,
          studentScores: Array.isArray(payload.studentScores) ? payload.studentScores.length : 0,
          gradingConfigs: Array.isArray(payload.gradingConfigs) ? payload.gradingConfigs.length : 0,
          announcements: Array.isArray(payload.announcements) ? payload.announcements.length : 0,
        },
      });
    }

    if (action === 'appendLogbook') {
      const saved = saveLogbookFromWeb(body.entry || body.data || {});
      return jsonOutput_(saved);
    }

    if (action === 'updateLogbookStatus') {
      const updated = updateLogbookStatusFromWeb(body.id, body.status, body.feedback || '');
      return jsonOutput_(updated);
    }

    if (action === 'appendEvaluation') {
      const savedEval = saveEvaluationFromWeb(body.evaluation || body.data || {});
      return jsonOutput_(savedEval);
    }

    if (action === 'checkInShift') {
      const checked = saveShiftCheckInFromWeb(body.shiftId);
      return jsonOutput_(checked);
    }

    return jsonOutput_({ ok: false, error: 'Unsupported POST action: ' + action });
  } catch (err) {
    return jsonOutput_({ ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    lock.releaseLock();
  }
}

function saveSnapshotChunks_(ss, payload, actor, syncedAt) {
  const sheet = ensureSheet_(ss, 'Portal_Snapshot', SHEET_SCHEMAS.Portal_Snapshot);
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, SHEET_SCHEMAS.Portal_Snapshot.length).clearContent();
  }

  const keys = Object.keys(payload || {});
  const rows = [];
  keys.forEach(function (key) {
    const serialized = JSON.stringify(payload[key]);
    if (!serialized) return;
    const totalChunks = Math.max(1, Math.ceil(serialized.length / CHUNK_SIZE));
    for (let i = 0; i < totalChunks; i++) {
      rows.push([
        key,
        i,
        totalChunks,
        syncedAt,
        actor,
        serialized.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
      ]);
    }
  });

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, SHEET_SCHEMAS.Portal_Snapshot.length).setValues(rows);
  }
}

function readSnapshotOrTables_(ss) {
  const snapSheet = ensureSheet_(ss, 'Portal_Snapshot', SHEET_SCHEMAS.Portal_Snapshot);
  const lastRow = snapSheet.getLastRow();
  const data = {};
  let updatedAt = null;
  let updatedBy = null;

  if (lastRow > 1) {
    const values = snapSheet
      .getRange(2, 1, lastRow - 1, SHEET_SCHEMAS.Portal_Snapshot.length)
      .getValues();
    const grouped = {};
    values.forEach(function (r) {
      const key = String(r[0] || '').trim();
      if (!key) return;
      const chunkIdx = Number(r[1] || 0);
      updatedAt = updatedAt || r[3] || null;
      updatedBy = updatedBy || r[4] || null;
      if (!grouped[key]) grouped[key] = [];
      grouped[key][chunkIdx] = String(r[5] || '');
    });

    Object.keys(grouped).forEach(function (key) {
      try {
        data[key] = JSON.parse(grouped[key].join(''));
      } catch (e) {
        // ข้ามฟิลด์ที่แปลง JSON ไม่ได้
      }
    });
  }

  // เสริมข้อมูลจากตารางหลักเสมอหากยังไม่มีใน Snapshot
  if (!Array.isArray(data.logbookEntries)) {
    data.logbookEntries = readTableAsObjects_(ss, 'Logbook_Entries');
  }
  if (!Array.isArray(data.shifts)) {
    data.shifts = readTableAsObjects_(ss, 'Duty_Shifts');
  }
  if (!Array.isArray(data.announcements)) {
    data.announcements = readTableAsObjects_(ss, 'Announcements');
  }

  return {
    ok: true,
    spreadsheetId: SPREADSHEET_ID,
    spreadsheetName: ss.getName(),
    updatedAt: updatedAt,
    updatedBy: updatedBy,
    data: data,
  };
}

function writeTableRows_(ss, sheetName, headers, rows) {
  const sheet = ensureSheet_(ss, sheetName, headers);
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, headers.length).clearContent();
  }
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function syncTabularSheets_(ss, payload) {
  if (Array.isArray(payload.logbookEntries)) {
    writeTableRows_(
      ss,
      'Logbook_Entries',
      SHEET_SCHEMAS.Logbook_Entries,
      payload.logbookEntries.map(function (item) {
        return [
          item.id || '',
          item.date || '',
          item.department || '',
          item.setting || '',
          item.caseCode || '',
          item.patientSummary || '',
          item.icd10 || '',
          item.diagnosis || '',
          item.procedure || '',
          item.role || '',
          item.preceptor || '',
          item.status || 'pending',
          item.reflection || '',
          item.feedback || '',
        ];
      })
    );
  }

  if (Array.isArray(payload.shifts)) {
    writeTableRows_(
      ss,
      'Duty_Shifts',
      SHEET_SCHEMAS.Duty_Shifts,
      payload.shifts.map(function (s) {
        return [
          s.id || '',
          s.isoDate || '',
          s.date || '',
          s.dayLabel || '',
          s.department || '',
          s.wardOrUnit || '',
          s.shiftType || '',
          s.timeRange || '',
          s.assignedStudent || '',
          s.studentYear || '',
          s.supervisingStaff || '',
          s.checkedInAt || '',
          s.checkInMethod || '',
          s.swapStatus || 'none',
          s.swapNote || '',
        ];
      })
    );
  }

  if (Array.isArray(payload.facultySubmissions)) {
    writeTableRows_(
      ss,
      'Faculty_Evaluations',
      SHEET_SCHEMAS.Faculty_Evaluations,
      payload.facultySubmissions.map(function (f) {
        return [
          f.id || '',
          f.date || '',
          f.formType || '',
          f.formTitle || '',
          f.courseCode || '',
          f.courseName || '',
          f.wardOrSubrotation || '',
          f.studentId || '',
          f.studentName || '',
          f.evaluatorName || '',
          f.rawScore != null ? f.rawScore : '',
          f.maxScore != null ? f.maxScore : '',
          f.percentage != null ? f.percentage : '',
          f.ratingLabel || '',
          Boolean(f.passedAttitudeGate),
          f.feedback || '',
          f.itemPercentages ? JSON.stringify(f.itemPercentages) : '',
        ];
      })
    );
  }

  if (Array.isArray(payload.studentScores)) {
    writeTableRows_(
      ss,
      'Student_Scores',
      SHEET_SCHEMAS.Student_Scores,
      payload.studentScores.map(function (sc) {
        return [
          sc.id || '',
          sc.studentId || '',
          sc.studentName || '',
          sc.yearLevel || '',
          sc.courseCode || '',
          sc.formA != null ? sc.formA : '',
          sc.formB != null ? sc.formB : '',
          sc.formC != null ? sc.formC : '',
          sc.wellBaby != null ? sc.wellBaby : '',
          sc.formE != null ? sc.formE : '',
          sc.osce != null ? sc.osce : '',
          sc.writtenExam != null ? sc.writtenExam : '',
          Boolean(sc.attitudeGatePassed),
          sc.absenceDays != null ? sc.absenceDays : 0,
          sc.customGroupScores ? JSON.stringify(sc.customGroupScores) : '',
        ];
      })
    );
  }

  if (Array.isArray(payload.gradingConfigs)) {
    writeTableRows_(
      ss,
      'Grading_Configs',
      SHEET_SCHEMAS.Grading_Configs,
      payload.gradingConfigs.map(function (cfg) {
        return [
          cfg.courseCode || '',
          cfg.courseName || '',
          cfg.credits != null ? cfg.credits : '',
          cfg.mplPercent != null ? cfg.mplPercent : '',
          Boolean(cfg.strictMedicalMpl),
          Boolean(cfg.enforceAttitudeGate),
          Array.isArray(cfg.enabledForms) ? cfg.enabledForms.join(',') : '',
          cfg.weights ? JSON.stringify(cfg.weights) : '{}',
          cfg.customItems ? JSON.stringify(cfg.customItems) : '{}',
          cfg.customGradeGroups ? JSON.stringify(cfg.customGradeGroups) : '[]',
          cfg.itemGradeMapping ? JSON.stringify(cfg.itemGradeMapping) : '{}',
        ];
      })
    );
  }

  if (Array.isArray(payload.announcements)) {
    writeTableRows_(
      ss,
      'Announcements',
      SHEET_SCHEMAS.Announcements,
      payload.announcements.map(function (a) {
        return [
          a.id || '',
          a.date || '',
          a.category || '',
          a.title || '',
          a.author || '',
          Boolean(a.urgent),
          a.summary || '',
        ];
      })
    );
  }
}

function readTableAsObjects_(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() <= 1) return [];
  const lastCol = sheet.getLastColumn();
  const values = sheet.getRange(1, 1, sheet.getLastRow(), lastCol).getValues();
  const headers = values[0];
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row.some(function (cell) { return cell !== '' && cell !== null; })) continue;
    const obj = {};
    headers.forEach(function (h, idx) {
      obj[String(h)] = row[idx];
    });
    rows.push(obj);
  }
  return rows;
}

/* ================= ฟังก์ชันเรียกใช้งานจาก Index.html (google.script.run) ================= */

function initializeSheetsFromWeb() {
  const ss = initializeSheets_();
  return {
    ok: true,
    spreadsheetName: ss.getName(),
    spreadsheetId: SPREADSHEET_ID,
    sheets: ss.getSheets().map(function (s) { return s.getName(); }),
  };
}

function getDashboardData() {
  const ss = initializeSheets_();
  const logbooks = readTableAsObjects_(ss, 'Logbook_Entries');
  const shifts = readTableAsObjects_(ss, 'Duty_Shifts');
  const evaluations = readTableAsObjects_(ss, 'Faculty_Evaluations');
  const scores = readTableAsObjects_(ss, 'Student_Scores');
  const announcements = readTableAsObjects_(ss, 'Announcements');

  return {
    ok: true,
    spreadsheetId: SPREADSHEET_ID,
    spreadsheetName: ss.getName(),
    webAppUrl: WEB_APP_URL,
    logbooks: logbooks.reverse(),
    shifts: shifts,
    evaluations: evaluations.reverse(),
    scores: scores,
    announcements: announcements.reverse(),
    serverTime: Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm น.'),
  };
}

function saveLogbookFromWeb(entry) {
  const ss = initializeSheets_();
  const sheet = ensureSheet_(ss, 'Logbook_Entries', SHEET_SCHEMAS.Logbook_Entries);
  const id = entry.id || 'log-' + Date.now();
  const thaiNow = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy');
  const row = [
    id,
    entry.date || thaiNow,
    entry.department || 'กลุ่มงานอายุรศาสตร์',
    entry.setting || 'IPD',
    entry.caseCode || 'HN-SUR-' + String(Date.now()).slice(-4),
    entry.patientSummary || '',
    entry.icd10 || '',
    entry.diagnosis || '',
    entry.procedure || '',
    entry.role || 'Perform',
    entry.preceptor || 'อาจารย์แพทย์ประจำหอผู้ป่วย',
    'pending',
    entry.reflection || '',
    '',
  ];
  sheet.appendRow(row);
  return { ok: true, id: id };
}

function updateLogbookStatusFromWeb(id, status, feedback) {
  const ss = initializeSheets_();
  const sheet = ensureSheet_(ss, 'Logbook_Entries', SHEET_SCHEMAS.Logbook_Entries);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { ok: false, error: 'ไม่พบข้อมูล Logbook' };
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) {
      sheet.getRange(i + 2, 12).setValue(status || 'approved');
      if (feedback !== undefined) {
        sheet.getRange(i + 2, 14).setValue(feedback);
      }
      return { ok: true, id: id, status: status };
    }
  }
  return { ok: false, error: 'ไม่พบรหัสรายการ: ' + id };
}

function saveShiftCheckInFromWeb(shiftId) {
  const ss = initializeSheets_();
  const sheet = ensureSheet_(ss, 'Duty_Shifts', SHEET_SCHEMAS.Duty_Shifts);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { ok: false, error: 'ไม่พบตารางเวรใน Sheet' };
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  const timeStr = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'HH:mm') + ' น.';
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(shiftId)) {
      sheet.getRange(i + 2, 12).setValue(timeStr);
      sheet.getRange(i + 2, 13).setValue('web_app');
      return { ok: true, shiftId: shiftId, checkedInAt: timeStr };
    }
  }
  return { ok: false, error: 'ไม่พบรหัสเวร: ' + shiftId };
}

function saveEvaluationFromWeb(ev) {
  const ss = initializeSheets_();
  const sheet = ensureSheet_(ss, 'Faculty_Evaluations', SHEET_SCHEMAS.Faculty_Evaluations);
  const id = ev.id || 'eval-' + Date.now();
  const thaiNow = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy');
  const raw = Number(ev.rawScore || 0);
  const max = Number(ev.maxScore || 100);
  const pct = max > 0 ? Math.round((raw / max) * 1000) / 10 : 0;
  sheet.appendRow([
    id,
    ev.date || thaiNow,
    ev.formType || 'form_a',
    ev.formTitle || 'แบบประเมิน Form A',
    ev.courseCode || 'SUR-MED-401',
    ev.courseName || 'อายุรศาสตร์คลินิก',
    ev.wardOrSubrotation || 'หอผู้ป่วยสามัญ',
    ev.studentId || '',
    ev.studentName || '',
    ev.evaluatorName || '',
    raw,
    max,
    pct,
    pct >= 80 ? 'ดีเยี่ยม' : pct >= 60 ? 'ผ่านเกณฑ์' : 'ต้องพัฒนา',
    ev.passedAttitudeGate !== false,
    ev.feedback || '',
    '',
  ]);
  return { ok: true, id: id, percentage: pct };
}

function saveAnnouncementFromWeb(ann) {
  const ss = initializeSheets_();
  const sheet = ensureSheet_(ss, 'Announcements', SHEET_SCHEMAS.Announcements);
  const id = ann.id || 'ann-' + Date.now();
  const thaiNow = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy');
  sheet.appendRow([
    id,
    ann.date || thaiNow,
    ann.category || 'วิชาการ',
    ann.title || '',
    ann.author || 'ฝ่ายวิชาการ ศพค.สุรินทร์',
    Boolean(ann.urgent),
    ann.summary || '',
  ]);
  return { ok: true, id: id };
}
