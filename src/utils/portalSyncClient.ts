import { AuditLogCategory, AuditLogEntry } from '../types/medicalSchool';

export interface PortalStateSyncResult {
  supported: boolean;
  state?: Record<string, unknown>;
  auditLogs?: AuditLogEntry[];
  updatedAt?: string;
  updatedBy?: string;
}

function getApiBase(): string {
  const base = import.meta.env.BASE_URL || '/';
  return base.endsWith('/') ? base.slice(0, -1) : base;
}

async function parseJsonSafe(response: Response): Promise<Record<string, unknown> | null> {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return null;
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function fetchServerPortalState(
  token: string | null
): Promise<PortalStateSyncResult> {
  if (!token || token.startsWith('local.')) {
    return { supported: false };
  }
  try {
    const res = await fetch(`${getApiBase()}/api/portal/state`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await parseJsonSafe(res);
    if (!res.ok || !data) {
      return { supported: false };
    }
    return {
      supported: true,
      state:
        data.state && typeof data.state === 'object'
          ? (data.state as Record<string, unknown>)
          : {},
      auditLogs: Array.isArray(data.auditLogs)
        ? (data.auditLogs as AuditLogEntry[])
        : undefined,
      updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : undefined,
      updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : undefined,
    };
  } catch {
    return { supported: false };
  }
}

export async function pushServerPortalPatch(
  token: string | null,
  patch: Record<string, unknown>,
  fullReplace = false
): Promise<{ ok: boolean; updatedAt?: string }> {
  if (!token || token.startsWith('local.')) {
    return { ok: false };
  }
  try {
    const res = await fetch(`${getApiBase()}/api/portal/state`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ patch, fullReplace }),
    });
    const data = await parseJsonSafe(res);
    if (!res.ok || !data) return { ok: false };
    return {
      ok: true,
      updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : undefined,
    };
  } catch {
    return { ok: false };
  }
}

export async function recordServerAuditLog(
  token: string | null,
  entry: {
    category: AuditLogCategory;
    action: string;
    targetLabel: string;
    detail: string;
  }
): Promise<AuditLogEntry | null> {
  if (!token || token.startsWith('local.')) {
    return null;
  }
  try {
    const res = await fetch(`${getApiBase()}/api/portal/audit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(entry),
    });
    const data = await parseJsonSafe(res);
    if (!res.ok || !data || !data.entry) return null;
    return data.entry as AuditLogEntry;
  } catch {
    return null;
  }
}

export async function dispatchTestNotificationWebhook(
  token: string | null,
  payload: { webhookUrl: string; title: string; message: string }
): Promise<{ ok: boolean; error?: string }> {
  if (!token || token.startsWith('local.')) {
    return {
      ok: false,
      error:
        'การส่ง Webhook ไปยัง LINE / Slack / Google Apps Script ต้องทำงานผ่านเซิร์ฟเวอร์หลัก (Full-Stack Server) เพื่อความปลอดภัยของ URL',
    };
  }
  try {
    const res = await fetch(`${getApiBase()}/api/notifications/test-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      return {
        ok: false,
        error:
          (data && typeof data.error === 'string' && data.error) ||
          'ไม่สามารถทดสอบส่ง Webhook ได้',
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'ไม่สามารถติดต่อเซิร์ฟเวอร์แจ้งเตือนได้' };
  }
}
