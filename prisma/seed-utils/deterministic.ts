import { createHash } from "node:crypto";

export function deterministicUuid(namespace: string, key: string) {
  const bytes = createHash("sha256").update(`${namespace}:${key}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function mulberry32(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function daysFrom(date: Date, days: number) {
  return new Date(date.getTime() + days * 86_400_000);
}

export function pick<T>(values: readonly T[], random: () => number) {
  return values[Math.floor(random() * values.length)];
}

export function pad(value: number, width: number) {
  return String(value).padStart(width, "0");
}
