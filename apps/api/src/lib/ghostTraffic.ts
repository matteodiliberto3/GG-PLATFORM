import crypto from "node:crypto";
import { Readable } from "node:stream";

const JITTER_MS_MIN = 800;
const JITTER_MS_MAX = 1500;
const MAX_CHUNKS = 20;
const MAX_TIME_MS = 30_000;
const CHUNK_SIZE = 256;

/**
 * Creates a readable stream of junk base64 data with jitter delay between chunks.
 * Used for SHADOW_BANNED users on content routes (Ghost Traffic / deception).
 * Stops after MAX_CHUNKS chunks or MAX_TIME_MS milliseconds.
 */
export function createGhostStream(): Readable {
  const stream = new Readable({ read() { } });
  let count = 0;
  const start = Date.now();

  const sendChunk = () => {
    if (count >= MAX_CHUNKS || Date.now() - start >= MAX_TIME_MS) {
      stream.push(null);
      return;
    }
    count++;
    const junk = crypto.randomBytes(CHUNK_SIZE).toString("base64");
    stream.push(Buffer.from(junk, "utf8"));
    if (count >= MAX_CHUNKS || Date.now() - start >= MAX_TIME_MS) {
      stream.push(null);
      return;
    }
    const jitter = JITTER_MS_MIN + Math.random() * (JITTER_MS_MAX - JITTER_MS_MIN);
    setTimeout(sendChunk, jitter);
  };

  const initialJitter = JITTER_MS_MIN + Math.random() * (JITTER_MS_MAX - JITTER_MS_MIN);
  setTimeout(sendChunk, initialJitter);

  return stream;
}
