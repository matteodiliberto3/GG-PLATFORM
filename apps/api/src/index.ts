import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { Readable } from "node:stream";
import Fastify from "fastify";
import { z } from "zod";
import { computeHmacSignature, secureCompare } from "./lib/hmac.js";
import { ApiError, fromZod } from "./lib/errors.js";
import { fail, ok } from "./lib/reply.js";
import { getAuthContextFromBearer, getSupabaseAdmin } from "./lib/supabase.js";
import { createGhostStream } from "./lib/ghostTraffic.js";
import {
  deleteSessionState,
  getGlobalKill,
  getSessionState,
  setGlobalKill,
  setSessionState,
  ttlBanSeconds,
  ttlSessionSeconds,
} from "./lib/redis.js";
import type { SessionState } from "./lib/redis.js";

const port = Number(process.env.API_PORT ?? "4000");
const host = process.env.API_HOST ?? "0.0.0.0";
const corsOrigin = process.env.API_CORS_ORIGIN ?? "http://localhost:3000";

const app = Fastify({
  logger: true,
});

await app.register(helmet);
await app.register(cors, { origin: corsOrigin });

app.setErrorHandler((err, _req, reply) => {
  if (err instanceof ApiError) {
    return fail(reply, { code: err.code, message: err.message, details: err.details }, err.statusCode);
  }
  app.log.error({ err }, "Unhandled error");
  return fail(reply, { code: "INTERNAL", message: "Internal error" }, 500);
});

app.get("/health", async () => ({ ok: true }));

// --- Internal: Scheduler (cron) ---
app.get("/internal/run-scheduler", async (req, reply) => {
  const secret = process.env.INTERNAL_SCHEDULER_SECRET;
  const provided = (req.headers["x-internal-secret"] as string) ?? (req.query as { secret?: string }).secret;
  if (!secret || provided !== secret) {
    throw new ApiError({ code: "UNAUTHORIZED", statusCode: 401, message: "Invalid or missing internal secret" });
  }
  const sb = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { data: due, error: fetchErr } = await sb
    .from("content_schedule")
    .select("content_id")
    .lte("publish_at", now);
  if (fetchErr) throw new ApiError({ code: "INTERNAL", statusCode: 500, message: "Scheduler fetch failed", details: fetchErr });
  const processed: string[] = [];
  for (const row of due ?? []) {
    const { error: updateErr } = await sb.from("content").update({ status: "LIVE" }).eq("id", row.content_id);
    if (updateErr) {
      app.log.warn({ content_id: row.content_id, err: updateErr }, "Scheduler: content update failed");
      continue;
    }
    const { error: deleteErr } = await sb.from("content_schedule").delete().eq("content_id", row.content_id);
    if (deleteErr) {
      app.log.warn({ content_id: row.content_id, err: deleteErr }, "Scheduler: schedule row delete failed");
      continue;
    }
    processed.push(row.content_id);
  }
  return ok(reply, { processed, count: processed.length });
});

// --- Auth helpers ---
app.decorateRequest("auth", null);
app.decorateRequest("sessionState", null as SessionState | null);
app.decorateRequest("rawBody", null as string | null);

// Capture raw body for /v1/edr/log (X-Signature validation)
app.addHook("preParsing", async (req, _reply, payload) => {
  const path = (req.url ?? "").split("?")[0];
  if (req.method !== "POST" || path !== "/v1/edr/log") return payload;
  const chunks: Buffer[] = [];
  for await (const chunk of payload) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks);
  (req as any).rawBody = raw.toString("utf8");
  return Readable.from([raw]);
});

app.addHook("preHandler", async (req) => {
  const authz = req.headers.authorization;
  const ctx = await getAuthContextFromBearer(authz);
  // @ts-expect-error fastify decorate typing done at runtime
  req.auth = ctx;

  // Fast-kill cache: HARD_BANNED -> 403; SHADOW_BANNED -> let content routes send ghost traffic
  const hwHash = (req.headers["x-hw-hash"] as string | undefined) ?? undefined;
  if (hwHash) {
    const state = await getSessionState(hwHash);
    // @ts-expect-error fastify decorate
    req.sessionState = state;
    if (state === "HARD_BANNED") {
      throw new ApiError({ code: "FORBIDDEN", statusCode: 403, message: "Session blocked" });
    }
  }
});

function requireAuth(req: any) {
  if (!req.auth) throw new ApiError({ code: "UNAUTHORIZED", statusCode: 401, message: "Missing/invalid bearer token" });
  return req.auth as { user: { id: string }; role: string; token: string };
}

function requireRole(req: any, roles: Array<"admin" | "soc">) {
  const ctx = requireAuth(req);
  if (!roles.includes(ctx.role as any)) {
    throw new ApiError({ code: "FORBIDDEN", statusCode: 403, message: "Insufficient role" });
  }
  return ctx;
}

// --- Schemas ---
const GateRequestBody = z.object({
  nickname: z.string().min(2).max(32),
  hw_hash: z.string().min(6).max(256),
  telemetry: z.record(z.string(), z.unknown()).optional(),
});

const GatePolicyResponseBody = z
  .object({
    nickname: z.string().min(2).max(32),
    accepted: z.boolean(),
    attempt: z.number().int().min(1).max(2),
    hw_hash: z.string().min(6).max(256).optional(),
  })
  .refine(
    (data) =>
      !(data.accepted === false && data.attempt === 2) ||
      (data.hw_hash != null && data.hw_hash.length >= 6),
    { message: "hw_hash is required when rejecting policy on second attempt", path: ["hw_hash"] },
  );

const AdminPublishBody = z.object({
  title: z.string().min(1).max(200),
  // base64 of encrypted bytes
  encrypted_payload_b64: z.string().min(1),
  type: z.enum(["THEORY", "STRATEGY"]),
});

const AdminScheduleBody = z.object({
  content_id: z.string().uuid(),
  publish_at: z.string().datetime(),
  timezone: z.string().min(1).max(64).default("UTC"),
});

const SocSetGhostingBody = z.object({
  hw_hash: z.string().min(6).max(256),
  jitter_range: z.tuple([z.number().min(0), z.number().min(0)]).optional(),
  duration: z.union([z.literal("infinite"), z.string()]).optional(),
});

const SocPardonBody = z
  .object({
    hw_hash: z.string().min(6).max(256).optional(),
    user_id: z.string().uuid().optional(),
  })
  .refine((d) => d.hw_hash != null || d.user_id != null, {
    message: "At least one of hw_hash or user_id is required",
    path: [],
  });

const SocApproveDenyBody = z
  .object({
    session_id: z.string().uuid().optional(),
    user_id: z.string().uuid().optional(),
  })
  .refine((d) => d.session_id != null || d.user_id != null, {
    message: "At least one of session_id or user_id is required",
    path: [],
  });

// --- Routes ---

// Gate: create/refresh profile + session PENDING
app.post("/v1/gate/request", async (req, reply) => {
  const parsed = GateRequestBody.safeParse(req.body);
  if (!parsed.success) throw fromZod(parsed.error);

  const { nickname, hw_hash } = parsed.data;
  const ctx = requireAuth(req);

  const sb = getSupabaseAdmin();

  // upsert profile
  const { error: profErr } = await sb.from("profiles").upsert(
    { user_id: ctx.user.id, nickname },
    { onConflict: "user_id" },
  );
  if (profErr) throw new ApiError({ code: "CONFLICT", statusCode: 409, message: "Profile upsert failed", details: profErr });

  // insert or ensure session
  const { data: sessionRow, error: sessErr } = await sb
    .from("user_sessions")
    .upsert(
      { user_id: ctx.user.id, hw_hash, status: "PENDING", last_seen_at: new Date().toISOString() },
      { onConflict: "user_id,hw_hash" },
    )
    .select("id,status,trust_score")
    .single();
  if (sessErr) throw new ApiError({ code: "INTERNAL", statusCode: 500, message: "Session upsert failed", details: sessErr });

  // state machine (fast cache)
  await setSessionState(hw_hash, "ACTIVE", ttlSessionSeconds());

  return ok(reply, { session: sessionRow });
});

// Gate: accept/reject policies (reject twice -> banlist)
app.post("/v1/gate/policy-response", async (req, reply) => {
  const parsed = GatePolicyResponseBody.safeParse(req.body);
  if (!parsed.success) throw fromZod(parsed.error);

  const { nickname, accepted, attempt, hw_hash } = parsed.data;
  const ctx = requireAuth(req);
  const sb = getSupabaseAdmin();

  if (!accepted && attempt === 2) {
    // hw_hash required on second rejection (enforced by schema refine; guard for defense in depth)
    if (!hw_hash) {
      throw new ApiError({
        code: "BAD_REQUEST",
        statusCode: 400,
        message: "hw_hash is required when rejecting policy on second attempt",
      });
    }
    await sb.from("banlist").insert({
      hw_hash,
      reason: `POLICY_REJECTION (${nickname})`,
      severity: "GREY",
      is_active: true,
      created_by: ctx.user.id,
    });
    await setSessionState(hw_hash, "HARD_BANNED", ttlBanSeconds());

    // mark sessions denied (by user_id)
    await sb
      .from("user_sessions")
      .update({ status: "DENIED", last_seen_at: new Date().toISOString() })
      .eq("user_id", ctx.user.id);

    return reply.status(403).send({
      status: "error",
      error: { code: "POLICY_REJECTED", message: "Policy rejected twice; access denied" },
    });
  }

  // accepted policy (or first reject): keep session active (TTL refresh)
  if (hw_hash) {
    await setSessionState(hw_hash, "ACTIVE", ttlSessionSeconds());
  }

  return ok(reply, { accepted, attempt });
});

// Admin: publish encrypted content
app.post("/v1/admin/publish", async (req, reply) => {
  const parsed = AdminPublishBody.safeParse(req.body);
  if (!parsed.success) throw fromZod(parsed.error);

  const ctx = requireRole(req, ["admin"]);
  const sb = getSupabaseAdmin();

  const bytes = Buffer.from(parsed.data.encrypted_payload_b64, "base64");
  const { data, error } = await sb
    .from("content")
    .insert({
      title: parsed.data.title,
      content_type: parsed.data.type,
      status: "DRAFT",
      encrypted_payload: bytes,
      created_by: ctx.user.id,
    })
    .select("id,title,content_type,status,created_at")
    .single();
  if (error) throw new ApiError({ code: "INTERNAL", statusCode: 500, message: "Publish failed", details: error });

  return ok(reply, data);
});

// Admin: schedule content
app.post("/v1/admin/schedule", async (req, reply) => {
  const parsed = AdminScheduleBody.safeParse(req.body);
  if (!parsed.success) throw fromZod(parsed.error);

  requireRole(req, ["admin"]);
  const sb = getSupabaseAdmin();

  const { error: schedErr } = await sb.from("content_schedule").upsert({
    content_id: parsed.data.content_id,
    publish_at: parsed.data.publish_at,
    timezone: parsed.data.timezone,
  });
  if (schedErr) throw new ApiError({ code: "INTERNAL", statusCode: 500, message: "Schedule failed", details: schedErr });

  const { error: contErr } = await sb.from("content").update({ status: "SCHEDULED" }).eq("id", parsed.data.content_id);
  if (contErr) throw new ApiError({ code: "INTERNAL", statusCode: 500, message: "Content status update failed", details: contErr });

  return ok(reply, { content_id: parsed.data.content_id, publish_at: parsed.data.publish_at, timezone: parsed.data.timezone });
});

// Admin: profile (for Editor onboarding flag)
app.get("/v1/admin/me", async (req, reply) => {
  const ctx = requireRole(req, ["admin"]);
  const sb = getSupabaseAdmin();
  const { data: profile, error } = await sb
    .from("profiles")
    .select("nickname, first_login")
    .eq("user_id", ctx.user.id)
    .maybeSingle();
  if (error) throw new ApiError({ code: "INTERNAL", statusCode: 500, message: "Profile fetch failed", details: error });
  const firstLogin = profile?.first_login ?? true;
  return ok(reply, { nickname: profile?.nickname ?? null, first_login: firstLogin });
});

// Admin: complete onboarding (Editor tutorial)
app.post("/v1/admin/onboarding_complete", async (req, reply) => {
  const ctx = requireRole(req, ["admin"]);
  const sb = getSupabaseAdmin();
  const { error } = await sb
    .from("profiles")
    .update({ first_login: false, updated_at: new Date().toISOString() })
    .eq("user_id", ctx.user.id);
  if (error) throw new ApiError({ code: "INTERNAL", statusCode: 500, message: "Onboarding complete failed", details: error });
  return ok(reply, { first_login: false });
});

// Admin: list contents (Editor Navigator)
app.get("/v1/admin/contents", async (req, reply) => {
  requireRole(req, ["admin"]);
  const sb = getSupabaseAdmin();
  const { data: rows, error } = await sb
    .from("content")
    .select("id, title, content_type, status, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new ApiError({ code: "INTERNAL", statusCode: 500, message: "Contents fetch failed", details: error });
  const ids = (rows ?? []).map((r) => r.id);
  const { data: schedRows } = await sb
    .from("content_schedule")
    .select("content_id, publish_at")
    .in("content_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  const scheduleByContentId = new Map<string, string>();
  for (const s of schedRows ?? []) {
    scheduleByContentId.set(s.content_id, s.publish_at);
  }
  const contents = (rows ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    content_type: r.content_type,
    status: r.status,
    publish_at: scheduleByContentId.get(r.id) ?? null,
    created_at: r.created_at,
  }));
  return ok(reply, { contents });
});

// Admin: user monitor (basic)
app.get("/v1/admin/user-monitor", async (req, reply) => {
  requireRole(req, ["admin"]);
  const sb = getSupabaseAdmin();

  const filter = (req.query as any)?.filter as string | undefined;

  // Select latest session per user by last_seen_at (simplified: returns all sessions; UI will group later)
  let q = sb.from("user_sessions").select("id,user_id,status,trust_score,hw_hash,last_seen_at,created_at");
  if (filter === "BLOCKED") {
    q = q.in("status", ["DENIED", "SHADOW_BANNED", "HARD_BANNED"]);
  }
  const { data, error } = await q.order("last_seen_at", { ascending: false, nullsFirst: false }).limit(500);
  if (error) throw new ApiError({ code: "INTERNAL", statusCode: 500, message: "User monitor query failed", details: error });

  return ok(reply, { sessions: data });
});

// SOC: set ghosting (shadow ban by hw_hash)
app.post("/v1/soc/set-ghosting", async (req, reply) => {
  requireRole(req, ["soc", "admin"]);
  const parsed = SocSetGhostingBody.safeParse(req.body);
  if (!parsed.success) throw fromZod(parsed.error);

  const sb = getSupabaseAdmin();

  const { error } = await sb.from("user_sessions").update({ status: "SHADOW_BANNED" }).eq("hw_hash", parsed.data.hw_hash);
  if (error) throw new ApiError({ code: "INTERNAL", statusCode: 500, message: "Failed to set ghosting", details: error });

  await setSessionState(parsed.data.hw_hash, "SHADOW_BANNED", ttlBanSeconds());

  return ok(reply, { hw_hash: parsed.data.hw_hash, status: "SHADOW_BANNED" });
});

// Ghost traffic: for SHADOW_BANNED on content routes, stream junk instead of 403
function sendGhostTraffic(reply: any) {
  reply.header("Content-Type", "application/octet-stream");
  return reply.send(createGhostStream());
}

// Reader: contents list (only for users with approved/active session)
app.get("/v1/reader/contents", async (req, reply) => {
  const sessionState = (req as any).sessionState;
  if (sessionState === "SHADOW_BANNED") return sendGhostTraffic(reply);

  const ctx = requireAuth(req);
  const sb = getSupabaseAdmin();

  const { data: sessions } = await sb
    .from("user_sessions")
    .select("id")
    .eq("user_id", ctx.user.id)
    .in("status", ["ACTIVE", "APPROVED"])
    .limit(1);
  if (!sessions?.length) {
    throw new ApiError({ code: "FORBIDDEN", statusCode: 403, message: "Session not approved" });
  }

  const { data: contentRows } = await sb
    .from("content")
    .select("id,title,content_type,status,created_at")
    .in("status", ["LIVE", "SCHEDULED"])
    .order("created_at", { ascending: false });

  const contentIds = (contentRows ?? []).map((r) => r.id);
  const { data: scheduleRows } = await sb
    .from("content_schedule")
    .select("content_id,publish_at")
    .in("content_id", contentIds);

  const scheduleByContentId = new Map((scheduleRows ?? []).map((r) => [r.content_id, r.publish_at]));

  const contents = (contentRows ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    content_type: r.content_type,
    status: r.status,
    publish_at: scheduleByContentId.get(r.id) ?? null,
    created_at: r.created_at,
  }));

  return ok(reply, { contents });
});

// Reader: single content (metadata; body/decrypt in future)
app.get("/v1/reader/contents/:id", async (req, reply) => {
  const sessionState = (req as any).sessionState;
  if (sessionState === "SHADOW_BANNED") return sendGhostTraffic(reply);

  const ctx = requireAuth(req);
  const id = (req.params as { id: string }).id;
  if (!z.string().uuid().safeParse(id).success) {
    throw new ApiError({ code: "BAD_REQUEST", statusCode: 400, message: "Invalid content id" });
  }
  const sb = getSupabaseAdmin();

  const { data: sessions } = await sb
    .from("user_sessions")
    .select("id")
    .eq("user_id", ctx.user.id)
    .in("status", ["ACTIVE", "APPROVED"])
    .limit(1);
  if (!sessions?.length) {
    throw new ApiError({ code: "FORBIDDEN", statusCode: 403, message: "Session not approved" });
  }

  const { data: row, error } = await sb
    .from("content")
    .select("id,title,content_type,status,created_at")
    .eq("id", id)
    .in("status", ["LIVE", "SCHEDULED"])
    .single();
  if (error || !row) throw new ApiError({ code: "NOT_FOUND", statusCode: 404, message: "Content not found" });

  const { data: sched } = await sb.from("content_schedule").select("publish_at").eq("content_id", id).maybeSingle();
  const publish_at = sched?.publish_at ?? null;
  if (row.status === "SCHEDULED" && publish_at && new Date(publish_at) > new Date()) {
    throw new ApiError({ code: "FORBIDDEN", statusCode: 403, message: "Content not yet available" });
  }

  return ok(reply, { id: row.id, title: row.title, content_type: row.content_type, status: row.status, publish_at, created_at: row.created_at });
});

// Security: widget sandbox config
app.get("/v1/security/widget-config", async (_req, reply) => {
  return ok(reply, {
    sandbox_rules: "allow-scripts allow-same-origin",
    csp_headers: "default-src 'self' *.tradingview.com",
  });
});

// EDR log/alert: requires X-Signature (HMAC-SHA256 of raw body). Same secret server-side (HMAC_SECRET).
const EdrLogBody = z.object({
  event_type: z.string().min(1).max(64),
  payload: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.string().datetime().optional(),
});

app.post("/v1/edr/log", async (req, reply) => {
  const ctx = requireAuth(req);
  const rawBody = (req as any).rawBody as string | undefined;
  const signature = (req.headers["x-signature"] as string) ?? "";
  const secret = process.env.HMAC_SECRET;

  if (!secret) {
    throw new ApiError({ code: "INTERNAL", statusCode: 500, message: "HMAC_SECRET not configured" });
  }
  if (!rawBody || !signature) {
    throw new ApiError({ code: "UNAUTHORIZED", statusCode: 401, message: "X-Signature required and body must be sent as raw JSON" });
  }

  const expected = computeHmacSignature(rawBody, secret);
  if (!secureCompare(signature, expected)) {
    throw new ApiError({ code: "UNAUTHORIZED", statusCode: 401, message: "Invalid X-Signature (log spoofing)" });
  }

  const parsed = EdrLogBody.safeParse(req.body);
  if (!parsed.success) throw fromZod(parsed.error);

  const sb = getSupabaseAdmin();
  const severity = parsed.data.event_type === "copy_attempt" || parsed.data.event_type === "focus_loss" ? "YELLOW" : "GREY";
  const { error } = await sb.from("forensic_logs").insert({
    user_id: ctx.user.id,
    severity,
    violation_code: parsed.data.event_type.toUpperCase(),
    evidence_score: null,
    telemetry: (parsed.data.payload ?? {}) as Record<string, unknown>,
  });
  if (error) throw new ApiError({ code: "INTERNAL", statusCode: 500, message: "Failed to store EDR log", details: error });

  return ok(reply, { received: true });
});

// SOC: forensic details (for Sig. Giusti modal)
app.get("/v1/soc/forensic-details/:user_id", async (req, reply) => {
  requireRole(req, ["soc", "admin"]);
  const userId = (req.params as any).user_id as string;
  if (!z.string().uuid().safeParse(userId).success) {
    throw new ApiError({ code: "BAD_REQUEST", statusCode: 400, message: "Invalid user_id" });
  }

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("forensic_logs")
    .select("id,severity,violation_code,evidence_score,telemetry,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new ApiError({ code: "INTERNAL", statusCode: 500, message: "Forensic query failed", details: error });
  if (!data) throw new ApiError({ code: "NOT_FOUND", statusCode: 404, message: "No forensic log found" });

  return ok(reply, data);
});

// SOC: pardon / whitelist (reset ban and session state)
app.post("/v1/soc/pardon", async (req, reply) => {
  requireRole(req, ["soc", "admin"]);
  const parsed = SocPardonBody.safeParse(req.body);
  if (!parsed.success) throw fromZod(parsed.error);

  const sb = getSupabaseAdmin();
  const { hw_hash: hwHash, user_id: userId } = parsed.data;

  let hwHashesToClear: string[] = [];

  if (hwHash) {
    hwHashesToClear = [hwHash];
    await sb.from("banlist").update({ is_active: false }).eq("hw_hash", hwHash);
    await sb
      .from("user_sessions")
      .update({ status: "ACTIVE", last_seen_at: new Date().toISOString() })
      .eq("hw_hash", hwHash);
  }

  if (userId) {
    const { data: sessions } = await sb.from("user_sessions").select("hw_hash").eq("user_id", userId);
    const hashes = [...new Set((sessions ?? []).map((s) => s.hw_hash).filter(Boolean))] as string[];
    hwHashesToClear = [...new Set([...hwHashesToClear, ...hashes])];
    for (const h of hashes) {
      await sb.from("banlist").update({ is_active: false }).eq("hw_hash", h);
    }
    await sb
      .from("user_sessions")
      .update({ status: "ACTIVE", last_seen_at: new Date().toISOString() })
      .eq("user_id", userId);
  }

  for (const h of hwHashesToClear) {
    await deleteSessionState(h);
  }

  return ok(reply, { pardoned: true, hw_hashes_cleared: hwHashesToClear.length });
});

// SOC: approve access (session or user)
app.post("/v1/soc/approve", async (req, reply) => {
  requireRole(req, ["soc", "admin"]);
  const parsed = SocApproveDenyBody.safeParse(req.body);
  if (!parsed.success) throw fromZod(parsed.error);

  const sb = getSupabaseAdmin();
  const { session_id: sessionId, user_id: userId } = parsed.data;
  const now = new Date().toISOString();

  if (sessionId) {
    const { data: session, error: fetchErr } = await sb
      .from("user_sessions")
      .select("id,user_id,hw_hash")
      .eq("id", sessionId)
      .single();
    if (fetchErr || !session) throw new ApiError({ code: "NOT_FOUND", statusCode: 404, message: "Session not found" });
    const { error: updateErr } = await sb.from("user_sessions").update({ status: "ACTIVE", last_seen_at: now }).eq("id", sessionId);
    if (updateErr) throw new ApiError({ code: "INTERNAL", statusCode: 500, message: "Approve update failed", details: updateErr });
    if (session.hw_hash) await setSessionState(session.hw_hash, "ACTIVE", ttlSessionSeconds());
    return ok(reply, { approved: true, session_id: sessionId });
  }

  const { data: sessions } = await sb.from("user_sessions").select("id,hw_hash").eq("user_id", userId!);
  if (!sessions?.length) throw new ApiError({ code: "NOT_FOUND", statusCode: 404, message: "No sessions found for user" });
  const { error: updateErr } = await sb.from("user_sessions").update({ status: "ACTIVE", last_seen_at: now }).eq("user_id", userId!);
  if (updateErr) throw new ApiError({ code: "INTERNAL", statusCode: 500, message: "Approve update failed", details: updateErr });
  for (const s of sessions) {
    if (s.hw_hash) await setSessionState(s.hw_hash, "ACTIVE", ttlSessionSeconds());
  }
  return ok(reply, { approved: true, user_id: userId, sessions_updated: sessions.length });
});

// SOC: deny access (session or user)
app.post("/v1/soc/deny", async (req, reply) => {
  requireRole(req, ["soc", "admin"]);
  const parsed = SocApproveDenyBody.safeParse(req.body);
  if (!parsed.success) throw fromZod(parsed.error);

  const sb = getSupabaseAdmin();
  const { session_id: sessionId, user_id: userId } = parsed.data;
  const now = new Date().toISOString();

  if (sessionId) {
    const { data: session, error: fetchErr } = await sb
      .from("user_sessions")
      .select("id,hw_hash")
      .eq("id", sessionId)
      .single();
    if (fetchErr || !session) throw new ApiError({ code: "NOT_FOUND", statusCode: 404, message: "Session not found" });
    const { error: updateErr } = await sb.from("user_sessions").update({ status: "DENIED", last_seen_at: now }).eq("id", sessionId);
    if (updateErr) throw new ApiError({ code: "INTERNAL", statusCode: 500, message: "Deny update failed", details: updateErr });
    if (session.hw_hash) await setSessionState(session.hw_hash, "HARD_BANNED", ttlBanSeconds());
    return ok(reply, { denied: true, session_id: sessionId });
  }

  const { data: sessions } = await sb.from("user_sessions").select("id,hw_hash").eq("user_id", userId!);
  if (!sessions?.length) throw new ApiError({ code: "NOT_FOUND", statusCode: 404, message: "No sessions found for user" });
  const { error: updateErr } = await sb.from("user_sessions").update({ status: "DENIED", last_seen_at: now }).eq("user_id", userId!);
  if (updateErr) throw new ApiError({ code: "INTERNAL", statusCode: 500, message: "Deny update failed", details: updateErr });
  for (const s of sessions) {
    if (s.hw_hash) await setSessionState(s.hw_hash, "HARD_BANNED", ttlBanSeconds());
  }
  return ok(reply, { denied: true, user_id: userId, sessions_updated: sessions.length });
});

// Admin: notifications for Security Live Feed (Editor)
app.get("/v1/admin/notifications", async (req, reply) => {
  requireRole(req, ["admin"]);
  const sb = getSupabaseAdmin();
  const limit = Math.min(Number((req.query as { limit?: string }).limit) || 50, 100);

  const { data: forensics, error: fErr } = await sb
    .from("forensic_logs")
    .select("id,user_id,session_id,severity,violation_code,evidence_score,telemetry,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (fErr) throw new ApiError({ code: "INTERNAL", statusCode: 500, message: "Notifications query failed", details: fErr });

  const notifications = (forensics ?? []).map((r) => ({
    id: r.id,
    type: "forensic" as const,
    severity: r.severity,
    violation_code: r.violation_code,
    evidence_score: r.evidence_score,
    user_id: r.user_id,
    session_id: r.session_id,
    telemetry: r.telemetry,
    created_at: r.created_at,
  }));

  return ok(reply, { notifications });
});

// WebSocket stub: notifiche real-time (opzionale; attualmente non implementato)
app.get("/v1/admin/notifications/ws", async (req, reply) => {
  return reply.status(501).send({
    status: "error",
    error: {
      code: "NOT_IMPLEMENTED",
      message: "WebSocket not implemented; use polling GET /v1/admin/notifications",
    },
  });
});

// SOC: pending queue (The Gate)
app.get("/v1/soc/pending", async (req, reply) => {
  requireRole(req, ["soc", "admin"]);
  const sb = getSupabaseAdmin();

  const { data: sessions, error: sErr } = await sb
    .from("user_sessions")
    .select("id,user_id,status,trust_score,hw_hash,ip,created_at")
    .eq("status", "PENDING")
    .order("created_at", { ascending: false })
    .limit(200);
  if (sErr) throw new ApiError({ code: "INTERNAL", statusCode: 500, message: "Pending query failed", details: sErr });

  const userIds = [...new Set((sessions ?? []).map((s) => s.user_id))];
  const { data: profiles } = await sb
    .from("profiles")
    .select("user_id,nickname")
    .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
  const nicknameByUserId = new Map((profiles ?? []).map((p) => [p.user_id, p.nickname ?? null]));

  const pending = (sessions ?? []).map((s) => ({
    id: s.id,
    user_id: s.user_id,
    nickname: nicknameByUserId.get(s.user_id) ?? null,
    trust_score: s.trust_score,
    hw_hash: s.hw_hash ?? null,
    ip: s.ip != null ? String(s.ip) : null,
    created_at: s.created_at,
  }));

  return ok(reply, { pending });
});

// SOC: threat feed events (forensic_logs)
app.get("/v1/soc/events", async (req, reply) => {
  requireRole(req, ["soc", "admin"]);
  const sb = getSupabaseAdmin();
  const limit = Math.min(Number((req.query as { limit?: string }).limit) || 100, 200);

  const { data: forensics, error: fErr } = await sb
    .from("forensic_logs")
    .select("id,user_id,session_id,severity,violation_code,evidence_score,telemetry,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (fErr) throw new ApiError({ code: "INTERNAL", statusCode: 500, message: "Events query failed", details: fErr });

  const events = (forensics ?? []).map((r) => ({
    id: r.id,
    user_id: r.user_id,
    session_id: r.session_id,
    severity: r.severity,
    violation_code: r.violation_code,
    evidence_score: r.evidence_score,
    telemetry: r.telemetry,
    created_at: r.created_at,
  }));

  return ok(reply, { events });
});

// SOC: global kill switch (stub: Redis flag + invalidate sessions conceptually)
app.post("/v1/soc/global-kill", async (req, reply) => {
  requireRole(req, ["soc", "admin"]);
  const ttl = 3600; // 1h maintenance mode
  await setGlobalKill(ttl);
  return ok(reply, { active: true, ttl_seconds: ttl });
});

// SOC: health / node status (for Top Bar; optional)
app.get("/v1/soc/health", async (req, reply) => {
  requireRole(req, ["soc", "admin"]);
  const killActive = await getGlobalKill();
  return ok(reply, {
    edge: "ok",
    backend: "ok",
    db: "ok",
    global_kill: killActive,
  });
});

await app.listen({ port, host });
