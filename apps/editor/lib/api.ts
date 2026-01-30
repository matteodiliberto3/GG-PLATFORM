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

export type AdminMe = { nickname: string | null; first_login: boolean };

export async function getAdminMe(bearer: string): Promise<AdminMe> {
  const res = await fetch(`${API_BASE}/v1/admin/me`, { headers: getHeaders(bearer) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `admin/me ${res.status}`);
  }
  return unwrap<AdminMe>(res);
}

export async function postOnboardingComplete(bearer: string): Promise<{ first_login: false }> {
  const res = await fetch(`${API_BASE}/v1/admin/onboarding_complete`, {
    method: "POST",
    headers: getHeaders(bearer),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `onboarding_complete ${res.status}`);
  }
  return unwrap(res);
}

export type AdminContent = {
  id: string;
  title: string;
  content_type: "THEORY" | "STRATEGY";
  status: string;
  publish_at: string | null;
  created_at: string;
};

export async function getAdminContents(bearer: string): Promise<{ contents: AdminContent[] }> {
  const res = await fetch(`${API_BASE}/v1/admin/contents`, { headers: getHeaders(bearer) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `admin/contents ${res.status}`);
  }
  return unwrap<{ contents: AdminContent[] }>(res);
}

export async function postPublish(
  bearer: string,
  body: { title: string; encrypted_payload_b64: string; type: "THEORY" | "STRATEGY" }
): Promise<{ id: string; title: string; content_type: string; status: string; created_at: string }> {
  const res = await fetch(`${API_BASE}/v1/admin/publish`, {
    method: "POST",
    headers: getHeaders(bearer),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? "Ci scusi, Sig. Giusti. Non è stato possibile salvare la bozza. Verifichi la Sua connessione.");
  }
  return unwrap(res);
}

export async function postSchedule(
  bearer: string,
  body: { content_id: string; publish_at: string; timezone?: string }
): Promise<{ content_id: string; publish_at: string; timezone: string }> {
  const res = await fetch(`${API_BASE}/v1/admin/schedule`, {
    method: "POST",
    headers: getHeaders(bearer),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? "Ci scusi, Sig. Giusti. La programmazione non è andata a buon fine.");
  }
  return unwrap(res);
}
