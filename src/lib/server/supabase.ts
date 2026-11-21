import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { AuthError } from "@supabase/supabase-js";
import type { Database } from "./database";
import { secureCookies } from "./config";
import { demoUsers, loginDomain } from "./fixtures";
import { ApiError, forbidden, invalidLogin, notFound, unavailable, unauthorized, type Backend, type Jar } from "./http";

function authFailure(error: AuthError, login = false) {
  if (error.status === 429) return new ApiError(429, "Too many attempts. Try again later.");
  if (error.name === "AuthSessionMissingError" || [400, 401, 403, 422].includes(error.status ?? 0)) {
    return login ? invalidLogin() : unauthorized();
  }
  return unavailable();
}

type Result<T> = { data: T | null; error: { code: string } | null };
function checked<T>(result: Result<T>) {
  if (result.error?.code === "PGRST301" || result.error?.code === "PGRST303") throw unauthorized();
  if (result.error) throw unavailable();
  return result.data;
}

// Keyset pagination avoids the Data API row limit and ties between dates.
const batch = 200;
async function rows<T extends { id: string }>(page: (after: string) => PromiseLike<Result<T[]>>) {
  const result: T[] = [];
  let after = "00000000-0000-0000-0000-000000000000";
  for (;;) {
    const data = checked(await page(after));
    if (!data) throw unavailable();
    result.push(...data);
    if (data.length < batch) return result;
    after = data[data.length - 1].id;
  }
}

export function supabaseBackend(config: { url: string; key: string }, jar: Jar, readOnly = false): Backend {
  const db = createServerClient<Database>(config.url, config.key, {
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
    cookieOptions: { httpOnly: true, secure: secureCookies, sameSite: "lax", path: "/" },
    cookies: {
      encode: "tokens-only",
      getAll: () => jar.getAll(),
      setAll: values => {
        if (readOnly) return; // Server Components can only read cookies.
        for (const { name, value, options } of values) jar.set(name, value, options);
      },
    },
  });
  async function owner() {
    const { data, error } = await db.auth.getUser();
    if (error) throw authFailure(error);
    if (!data.user || Object.values<string>(demoUsers).includes(data.user.id) ||
        data.user.app_metadata.dean_seed === "dean-fixtures-v1") throw unauthorized();
    return data.user.id;
  }

  async function requireStaff() {
    const user = await owner();
    if (!checked(await db.from("dean_staff").select("user_id").eq("user_id", user).maybeSingle())) throw forbidden();
  }

  return {
    requireStaff,
    async inbox() {
      await requireStaff();
      const tickets = await rows(after => db.from("dean_applications")
        .select("id,user_id,kind,note,status,createdAt:created_at").eq("kind", "ticket")
        .gt("id", after).order("id").limit(batch));
      return tickets.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async changeStatus(id, status) {
      await requireStaff();
      const row = checked(await db.from("dean_applications").update({ status })
        .eq("kind", "ticket").eq("id", id).select("id").maybeSingle());
      if (!row) throw new ApiError(404, "Ticket not found.");
    },
    async login(username, password) {
      const { data, error } = await db.auth.signInWithPassword({ email: username + "@" + loginDomain, password });
      if (error) throw authFailure(error, true);
      if (!data.session) throw invalidLogin();
    },
    async logout() {
      const { error } = await db.auth.signOut({ scope: "local" });
      if (error && error.name !== "AuthSessionMissingError") throw authFailure(error);
    },
    async account() {
      const user = await owner();
      const [profileResult, lessons, grades, applications, notifications] = await Promise.all([
        db.from("dean_profiles").select("name,faculty,program,year,group:group_code").eq("user_id", user).maybeSingle(),
        rows(after => db.from("dean_lessons").select("id,weekday,start:start_time,end:end_time,subject,teacher,room,change")
          .eq("user_id", user).gt("id", after).order("id").limit(batch)),
        rows(after => db.from("dean_grades").select("id,subject,score,credits,assessment,examDate:exam_date")
          .eq("user_id", user).gt("id", after).order("id").limit(batch)),
        rows(after => db.from("dean_applications").select("id,kind,note,status,createdAt:created_at")
          .eq("user_id", user).gt("id", after).order("id").limit(batch)),
        rows(after => db.from("dean_notifications").select("id,title,body,kind,date,read")
          .eq("user_id", user).gt("id", after).order("id").limit(batch)),
      ]);
      const profile = checked(profileResult);
      if (!profile) throw new ApiError(403, "Student profile unavailable.");
      return {
        demo: false, profile,
        lessons: lessons.map(({ change, start, end, ...lesson }) => ({
          ...lesson, start: start.slice(0, 5), end: end.slice(0, 5), ...(change && { change }),
        })).sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start)),
        grades: grades.map(({ examDate, ...grade }) => ({ ...grade, ...(examDate && { examDate }) })),
        applications: applications.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
        notifications: notifications.sort((a, b) => Date.parse(b.date) - Date.parse(a.date)),
      };
    },
    async apply(kind, note) {
      await owner();
      const row = checked<{ id: string }>(await db.from("dean_applications").insert({ kind, note }).select("id").single());
      if (!row) throw unavailable();
      return row.id;
    },
    async markRead(id) {
      const user = await owner();
      const result = await db.from("dean_notifications").update({ read: true })
        .eq("user_id", user).eq("id", id).select("id").maybeSingle();
      if (!checked(result)) throw notFound();
    },
  };
}
