"use client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

function getHeaders(bearer: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${bearer}`,
  };
}

async function unwrap<T>(res: Response): Promise<T> {
  const json = await res.json();
  return (json.data ?? json) as T;
}

export type PendingRow = {
  id: string;
  user_id: string;
  nickname: string | null;
  trust_score: number;
  hw_hash: string | null;
  ip: string | null;
  created_at: string;
};

export async function getSocPending(bearer: string): Promise<{ pending: PendingRow[] }> {
  const res = await fetch(`${API_BASE}/v1/soc/pending`, { headers: getHeaders(bearer) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `soc/pending ${res.status}`);
  }
  return unwrap(res);
}

export type SocEvent = {
  id: string;
  user_id: string | null;
  session_id: string | null;
  severity: "GREY" | "YELLOW" | "RED";
  violation_code: string;
  evidence_score: number | null;
  telemetry: Record<string, unknown>;
  created_at: string;
};

export async function getSocEvents(bearer: string, limit?: number): Promise<{ events: SocEvent[] }> {
  const url = limit != null ? `${API_BASE}/v1/soc/events?limit=${limit}` : `${API_BASE}/v1/soc/events`;
  const res = await fetch(url, { headers: getHeaders(bearer) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `soc/events ${res.status}`);
  }
  return unwrap(res);
}

export type ForensicDetail = {
  id: string;
  severity: string;
  violation_code: string;
  evidence_score: number | null;
  telemetry: Record<string, unknown>;
  created_at: string;
};

export async function getSocForensicDetails(bearer: string, userId: string): Promise<ForensicDetail> {
  const res = await fetch(`${API_BASE}/v1/soc/forensic-details/${userId}`, { headers: getHeaders(bearer) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `forensic-details ${res.status}`);
  }
  return unwrap(res);
}

export async function postSocApprove(bearer: string, body: { session_id?: string; user_id?: string }) {
  const res = await fetch(`${API_BASE}/v1/soc/approve`, {
    method: "POST",
    headers: getHeaders(bearer),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `soc/approve ${res.status}`);
  }
  return unwrap(res);
}

export async function postSocDeny(bearer: string, body: { session_id?: string; user_id?: string }) {
  const res = await fetch(`${API_BASE}/v1/soc/deny`, {
    method: "POST",
    headers: getHeaders(bearer),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `soc/deny ${res.status}`);
  }
  return unwrap(res);
}

export async function postSocSetGhosting(bearer: string, body: { hw_hash: string }) {
  const res = await fetch(`${API_BASE}/v1/soc/set-ghosting`, {
    method: "POST",
    headers: getHeaders(bearer),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `soc/set-ghosting ${res.status}`);
  }
  return unwrap(res);
}

export async function postSocPardon(bearer: string, body: { hw_hash?: string; user_id?: string }) {
  const res = await fetch(`${API_BASE}/v1/soc/pardon`, {
    method: "POST",
    headers: getHeaders(bearer),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `soc/pardon ${res.status}`);
  }
  return unwrap(res);
}

export async function postSocGlobalKill(bearer: string) {
  const res = await fetch(`${API_BASE}/v1/soc/global-kill`, {
    method: "POST",
    headers: getHeaders(bearer),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `soc/global-kill ${res.status}`);
  }
  return unwrap(res);
}

export type SocHealth = { edge: string; backend: string; db: string; global_kill: boolean };

export async function getSocHealth(bearer: string): Promise<SocHealth> {
  const res = await fetch(`${API_BASE}/v1/soc/health`, { headers: getHeaders(bearer) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `soc/health ${res.status}`);
  }
  return unwrap(res);
}
