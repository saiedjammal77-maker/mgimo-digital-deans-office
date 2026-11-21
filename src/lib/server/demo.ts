import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { Application } from "./account";
import { secureCookies } from "./config";
import { demoKey, seal, unseal } from "./demo-crypto";
import { demoPassword, demoUsers, fixture, type DemoUser } from "./fixtures";
import { forbidden, invalidLogin, isKind, notFound, unauthorized, uuid, validNote, type Backend, type Jar } from "./http";

const prefix = (secureCookies ? "__Host-" : "") + "dean-v1-";
export const demoSessionCookie = prefix + "session";
const sessionTTL = 8 * 3600;
const stateTTL = 30 * 24 * 3600;
const historyLimit = 4;
const options = { httpOnly: true, secure: secureCookies, sameSite: "strict", path: "/" } as const;
const isStudent = (v: unknown): v is DemoUser => typeof v === "string" && Object.hasOwn(demoUsers, v);

export function demoBackend(jar: Jar, readOnly = false): Backend {
  const key = demoKey();
  const clear = (name: string) => jar.set(name, "", { ...options, maxAge: 0 });
  const write = (name: string, value: string, ttl: number, maxAge = ttl) =>
    jar.set(name, seal(key, name, value, ttl), { ...options, maxAge });
  const read = (name: string) => {
    const raw = jar.get(name);
    if (!raw) return null;
    const decoded = unseal(key, name, raw.value);
    if (!decoded && !readOnly) clear(name);
    return decoded;
  };
  const student = () => {
    const username = read(demoSessionCookie)?.value;
    if (!isStudent(username)) throw unauthorized();
    return username;
  };
  const appPrefix = (user: DemoUser) => `${prefix}${user}-app-`;
  const ticketPrefix = () => {
    // A fresh sealed session cookie is issued even for a repeated login to the same fixture.
    const visitor = createHash("sha256").update(jar.get(demoSessionCookie)!.value).digest("hex").slice(0, 32);
    return prefix + "ticket-" + visitor + "-";
  };
  const clearTickets = () => {
    for (const { name } of jar.getAll()) if (name.startsWith(prefix + "ticket-")) clear(name);
  };
  const denyStaff = async () => { student(); throw forbidden(); };
  const readName = (user: DemoUser, id: string) => `${prefix}${user}-read-${id}`;

  // Individual cookies let concurrent submissions and read receipts merge in the browser.
  // Trim oldest records on reads too, including overflow from simultaneous submissions.
  function history(start: string, keep: number, ttl: number) {
    const records: Application[] = [];
    for (const { name } of jar.getAll()) {
      if (!name.startsWith(start)) continue;
      const id = name.slice(start.length);
      if (!uuid.test(id)) continue;
      const item = read(name);
      if (!item) continue;
      const separator = item.value.indexOf("\n");
      const kind = item.value.slice(0, separator);
      const note = item.value.slice(separator + 1);
      if (separator < 0 || !isKind(kind) || !validNote(note)) {
        clear(name);
        continue;
      }
      records.push({ id, kind, note, status: "submitted", createdAt: new Date(item.expires - ttl * 1000).toISOString() });
    }
    records.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
    for (const entry of records.slice(keep)) clear(start + entry.id);
    return records.slice(0, keep);
  }
  return {
    async login(username, password) {
      if (!isStudent(username) || password !== demoPassword) throw invalidLogin();
      clearTickets();
      write(demoSessionCookie, username, sessionTTL);
    },
    async logout() {
      clearTickets();
      clear(demoSessionCookie);
    },
    async account() {
      const user = student();
      const account = fixture(user);
      account.demoExpiresAt = read(demoSessionCookie)!.expires;
      account.applications = [...history(appPrefix(user), historyLimit, stateTTL), ...history(ticketPrefix(), historyLimit, sessionTTL), ...account.applications]
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      for (const item of account.notifications) item.read ||= read(readName(user, item.id))?.value === "1";
      return account;
    },
    async apply(kind, note) {
      const user = student();
      const start = kind === "ticket" ? ticketPrefix() : appPrefix(user);
      const ttl = kind === "ticket" ? sessionTTL : stateTTL;
      history(start, historyLimit - 1, ttl);
      const id = randomUUID();
      const maxAge = kind === "ticket"
        ? Math.max(0, Math.floor((read(demoSessionCookie)!.expires - Date.now()) / 1000))
        : ttl;
      write(start + id, kind + "\n" + note, ttl, maxAge);
      return id;
    },
    requireStaff: denyStaff,
    inbox: denyStaff,
    changeStatus: denyStaff,
    async markRead(id) {
      const user = student();
      const item = fixture(user).notifications.find(item => item.id === id);
      if (!item) throw notFound();
      if (!item.read) write(readName(user, id), "1", stateTTL);
    },
  };
}
