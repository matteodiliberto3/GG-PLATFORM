"use client";

const STORAGE_KEY = "gg_hw_hash";

function randomId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getHwHash(): string {
  if (typeof window === "undefined") return randomId();
  let v = localStorage.getItem(STORAGE_KEY);
  if (!v) {
    v = randomId();
    localStorage.setItem(STORAGE_KEY, v);
  }
  return v;
}
