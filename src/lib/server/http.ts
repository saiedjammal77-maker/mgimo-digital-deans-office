import "server-only";
import type { cookies } from "next/headers";
import type { Account, Application, ApplicationKind, InboxTicket } from "./account";

export type Jar = Awaited<ReturnType<typeof cookies>>;
export interface Backend {
  login(username: string, password: string): Promise<void>;
  logout(): Promise<void>;
  account(): Promise<Account>;
  apply(kind: ApplicationKind, note: string): Promise<string>;
  requireStaff(): Promise<void>;
  inbox(): Promise<InboxTicket[]>;
  changeStatus(id: string, status: Application["status"]): Promise<void>;
  markRead(id: string): Promise<void>;
}

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}
export const unauthorized = () => new ApiError(401, "Sign in required.");
export const forbidden = () => new ApiError(403, "Dean staff access required.");
export const invalidLogin = () => new ApiError(401, "Invalid username or password.");
export const unavailable = () => new ApiError(503, "Account service unavailable.");
export const notFound = () => new ApiError(404, "Notification not found.");
export const isKind = (v: unknown): v is ApplicationKind => v === "application" || v === "certificate" || v === "ticket";
export const validNote = (v: unknown): v is string =>
  typeof v === "string" && Buffer.byteLength(v) <= 256 && !v.includes("\0") && v.isWellFormed();
export const uuid = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;

export function checkOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (req.headers.get("sec-fetch-site") === "cross-site" ||
      (origin && origin !== new URL(req.url).origin &&
        origin !== `${new URL(req.url).protocol}//${req.headers.get("host")}`)) {
    throw new ApiError(403, "Cross-origin request denied.");
  }
}

export async function jsonBody(req: Request, keys: string[]): Promise<Record<string, unknown>> {
  if (!req.body && keys.length === 0) return {};
  if (req.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new ApiError(415, "Expected a JSON request.");
  }
  const limit = 4096;
  const tooLarge = () => new ApiError(413, "Request body too large.");
  if (Number(req.headers.get("content-length")) > limit) throw tooLarge();
  const reader = req.body?.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  if (reader) {
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > limit) {
          void reader.cancel().catch(() => {});
          throw tooLarge();
        }
        parts.push(value);
      }
    } finally {
      reader.releaseLock();
    }
  }
  try {
    const body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(parts)));
    if (body && typeof body === "object" && !Array.isArray(body) &&
        Object.keys(body).length === keys.length && keys.every(key => Object.hasOwn(body, key))) return body;
  } catch { /* Return the same validation error for malformed JSON and malformed objects. */ }
  throw new ApiError(400, "Invalid request body.");
}
