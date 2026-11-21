import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { linkSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { secureCookies } from "./config";
import { unavailable } from "./http";

// An atomic link lets independent local Next workers share the same generated key.
function developmentKey() {
  const dir = join(process.cwd(), ".next", "cache");
  const path = join(dir, "dean-demo.key");
  try {
    return readFileSync(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  mkdirSync(dir, { recursive: true });
  const tmp = `${path}.${randomUUID()}`;
  writeFileSync(tmp, randomBytes(32), { mode: 0o600, flag: "wx" });
  try {
    linkSync(tmp, path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  } finally {
    unlinkSync(tmp);
  }
  return readFileSync(path);
}

export function demoKey() {
  const secret = process.env.DEMO_SESSION_SECRET;
  if (secret) {
    if (Buffer.byteLength(secret.trim()) < 32) throw unavailable();
    return createHash("sha256").update(secret).digest();
  }
  if (secureCookies) throw unavailable();
  const key = developmentKey();
  if (key.length !== 32) throw unavailable();
  return key;
}

// Envelope: 12-byte nonce, 16-byte GCM tag, encrypted expiry + UTF-8 payload.
// The cookie name binds the ciphertext to its version, purpose, student and record.
export function seal(key: Buffer, name: string, value: string, ttl: number) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(name));
  const expiry = Buffer.alloc(8);
  expiry.writeDoubleBE(Date.now() + ttl * 1000);
  const ciphertext = Buffer.concat([cipher.update(expiry), cipher.update(value, "utf8"), cipher.final()]);
  const encoded = Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url");
  if (encoded.length > 420) throw new Error("Demo cookie exceeds the storage limit.");
  return encoded;
}

export function unseal(key: Buffer, name: string, encoded: string) {
  if (encoded.length > 420 || !/^[\w-]+$/.test(encoded)) return null;
  try {
    const packed = Buffer.from(encoded, "base64url");
    if (packed.length < 36 || packed.toString("base64url") !== encoded) return null;
    const cipher = createDecipheriv("aes-256-gcm", key, packed.subarray(0, 12));
    cipher.setAAD(Buffer.from(name));
    cipher.setAuthTag(packed.subarray(12, 28));
    const data = Buffer.concat([cipher.update(packed.subarray(28)), cipher.final()]);
    const expires = data.readDoubleBE();
    return Number.isSafeInteger(expires) && expires > Date.now()
      ? { expires, value: data.toString("utf8", 8) } : null;
  } catch {
    return null;
  }
}
