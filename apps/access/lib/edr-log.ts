"use client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

type WasmModule = {
  default?: (init?: WebAssembly.Memory | RequestInfo) => Promise<void>;
  init?: (init?: WebAssembly.Memory | RequestInfo) => Promise<void>;
  generate_hmac_signature: (payload: string, secret: string) => string;
  embed_watermark?: (text: string, user_id: string) => string;
  decode_watermark?: (watermarked_text: string) => string;
};

let wasmInit: Promise<WasmModule> | null = null;

async function getWasm(): Promise<WasmModule> {
  if (wasmInit) return wasmInit;
  wasmInit = (async () => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const mod = await import(/* webpackIgnore: true */ `${base}/pkg/gg_wasm_hmac.js`);
    return mod as unknown as WasmModule;
  })();
  return wasmInit;
}

/** Returns HMAC-SHA256 hex signature of payload (Wasm). Call init before first use. */
export async function signPayload(payload: string, secret: string): Promise<string> {
  const wasm = await getWasm();
  const initFn = wasm.default ?? wasm.init;
  if (typeof initFn === "function") await initFn();
  return wasm.generate_hmac_signature(payload, secret);
}

/** Embeds invisible watermark (zero-width encoding of user_id) into text. Requires Wasm init. */
export async function embedWatermark(text: string, userId: string): Promise<string> {
  if (!userId) return text;
  const wasm = await getWasm();
  const initFn = wasm.default ?? wasm.init;
  if (typeof initFn === "function") await initFn();
  if (typeof wasm.embed_watermark === "function") return wasm.embed_watermark(text, userId);
  return text;
}

/** Extracts embedded user_id from watermarked text (forensic). */
export async function decodeWatermark(watermarkedText: string): Promise<string> {
  const wasm = await getWasm();
  const initFn = wasm.default ?? wasm.init;
  if (typeof initFn === "function") await initFn();
  if (typeof wasm.decode_watermark === "function") return wasm.decode_watermark(watermarkedText);
  return "";
}

export type EdrLogPayload = {
  event_type: string;
  payload?: Record<string, unknown>;
  timestamp?: string;
};

/** Builds JSON string for EDR log (same string must be sent as body for X-Signature validation). */
export function buildEdrLogBody(payload: EdrLogPayload): string {
  return JSON.stringify({
    event_type: payload.event_type,
    payload: payload.payload ?? {},
    timestamp: payload.timestamp ?? new Date().toISOString(),
  });
}

/** Sends EDR log to API with X-Signature (Wasm HMAC). Secret from env NEXT_PUBLIC_HMAC_SECRET. */
export async function sendEdrLog(
  bearer: string,
  payload: EdrLogPayload,
  secret: string
): Promise<void> {
  const body = buildEdrLogBody(payload);
  const signature = await signPayload(body, secret);
  const res = await fetch(`${API_BASE}/v1/edr/log`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearer}`,
      "X-Signature": signature,
    },
    body,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `edr/log ${res.status}`);
  }
}
