"use client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export async function gateRequest(
  bearer: string,
  body: { nickname: string; hw_hash: string; telemetry?: Record<string, unknown> },
) {
  const res = await fetch(`${API_BASE}/v1/gate/request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearer}`,
      "X-HW-Hash": body.hw_hash,
    },
    body: JSON.stringify({
      nickname: body.nickname,
      hw_hash: body.hw_hash,
      telemetry: body.telemetry,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `gate/request ${res.status}`);
  }
  return res.json();
}

export async function gatePolicyResponse(
  bearer: string,
  body: { nickname: string; accepted: boolean; attempt: number; hw_hash?: string },
) {
  const res = await fetch(`${API_BASE}/v1/gate/policy-response`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearer}`,
      ...(body.hw_hash ? { "X-HW-Hash": body.hw_hash } : {}),
    },
    body: JSON.stringify({
      nickname: body.nickname,
      accepted: body.accepted,
      attempt: body.attempt,
      ...(body.hw_hash ? { hw_hash: body.hw_hash } : {}),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `policy-response ${res.status}`);
  }
  return res.json();
}

export type ReaderContent = {
  id: string;
  title: string;
  content_type: "THEORY" | "STRATEGY";
  status: string;
  publish_at: string | null;
  created_at: string;
};

export async function getReaderContents(bearer: string, hwHash?: string): Promise<{ contents: ReaderContent[] }> {
  const res = await fetch(`${API_BASE}/v1/reader/contents`, {
    headers: {
      Authorization: `Bearer ${bearer}`,
      ...(hwHash ? { "X-HW-Hash": hwHash } : {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `reader/contents ${res.status}`);
  }
  const json = await res.json();
  return (json.data ?? json) as { contents: ReaderContent[] };
}

export type WidgetConfig = { sandbox_rules: string; csp_headers: string };

export async function getReaderContent(
  bearer: string,
  contentId: string,
  hwHash?: string
): Promise<{ id: string; title: string; content_type: "THEORY" | "STRATEGY"; status: string; publish_at: string | null; created_at: string }> {
  const res = await fetch(`${API_BASE}/v1/reader/contents/${contentId}`, {
    headers: {
      Authorization: `Bearer ${bearer}`,
      ...(hwHash ? { "X-HW-Hash": hwHash } : {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `reader/contents/${contentId} ${res.status}`);
  }
  const data = await res.json();
  return data.data ?? data;
}

export async function getWidgetConfig(): Promise<WidgetConfig> {
  const res = await fetch(`${API_BASE}/v1/security/widget-config`);
  if (!res.ok) throw new Error("widget-config failed");
  const json = await res.json();
  return (json.data ?? json) as WidgetConfig;
}
