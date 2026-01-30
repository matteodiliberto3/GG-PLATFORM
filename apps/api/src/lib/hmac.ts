import crypto from "node:crypto";

/**
 * Compute HMAC-SHA256 of payload with secret, hex-encoded.
 * Must match client-side Wasm generate_hmac_signature(payload, secret).
 */
export function computeHmacSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

/** Constant-time compare to avoid timing attacks. */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}
