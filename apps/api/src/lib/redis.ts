import Redis from "ioredis";

export type SessionState = "ACTIVE" | "SUSPICIOUS" | "SHADOW_BANNED" | "HARD_BANNED";

// Helper function to get Redis instance type (works with Node16)
function createRedisInstance(url: string): Redis {
  return new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1 });
}

type RedisClient = ReturnType<typeof createRedisInstance>;

let client: RedisClient | null = null;

function getRedisUrl() {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  return url;
}

export function getRedis(): RedisClient | null {
  if (client) return client;
  const url = getRedisUrl();
  if (!url) return null;
  client = createRedisInstance(url);
  return client;
}

function sessionKey(hwHash: string) {
  return `gg:session:${hwHash}`;
}

export async function getSessionState(hwHash: string): Promise<SessionState | null> {
  const r = getRedis();
  if (!r) return null;
  const value = await r.get(sessionKey(hwHash));
  if (!value) return null;
  return value as SessionState;
}

export async function setSessionState(hwHash: string, state: SessionState, ttlSeconds: number) {
  const r = getRedis();
  if (!r) return;
  // atomic set + ttl
  await r.set(sessionKey(hwHash), state, "EX", ttlSeconds);
}

export async function deleteSessionState(hwHash: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  await r.del(sessionKey(hwHash));
}

export function ttlSessionSeconds() {
  return Number(process.env.SESSION_STATE_TTL_SECONDS ?? "3600");
}

export function ttlBanSeconds() {
  return Number(process.env.BAN_STATE_TTL_SECONDS ?? "2592000");
}

const GLOBAL_KILL_KEY = "gg:global_kill";

export async function setGlobalKill(ttlSeconds: number): Promise<void> {
  const r = getRedis();
  if (!r) return;
  await r.set(GLOBAL_KILL_KEY, "1", "EX", ttlSeconds);
}

export async function getGlobalKill(): Promise<boolean> {
  const r = getRedis();
  if (!r) return false;
  const v = await r.get(GLOBAL_KILL_KEY);
  return v === "1";
}

