// Node 22.18+ strips the type annotations from the same fixtures the browser demo uses.
import { createClient } from "@supabase/supabase-js";
import { demoUsers, demoPassword, fixture, loginDomain } from "../src/lib/server/fixtures.ts";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set the seed project URL and its Supabase secret or service-role key.");
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const marker = "dean-fixtures-v1";

async function ensureStudent(username, id) {
  const email = username + "@" + loginDomain;
  const existing = await db.auth.admin.getUserById(id);
  let user = existing.data.user;
  if (existing.error) {
    if (existing.error.status !== 404 && existing.error.code !== "user_not_found") throw existing.error;
    const created = await db.auth.admin.createUser({
      id, email, password: demoPassword, email_confirm: true, app_metadata: { dean_seed: marker },
    });
    // Another seed process may have created exactly this identity concurrently.
    user = created.data.user ?? (await db.auth.admin.getUserById(id)).data.user;
    if (!user) throw created.error ?? new Error("Could not provision fictional student.");
  }
  if (user?.id !== id || user.email !== email || user.app_metadata?.dean_seed !== marker) {
    throw new Error("Fixture identity collision. Check the target project and existing accounts.");
  }
}

async function insertMissing(table, records, onConflict = "id") {
  const { error } = await db.from(table).upsert(records, { onConflict, ignoreDuplicates: true });
  if (error) throw new Error(table + ": " + error.message);
}

for (const [username, user_id] of Object.entries(demoUsers)) {
  await ensureStudent(username, user_id);
  const { profile, lessons, grades, applications, notifications } = fixture(username);
  const { group, ...fields } = profile;
  await insertMissing("dean_profiles", { ...fields, user_id, group_code: group }, "user_id");
  await insertMissing("dean_lessons", lessons.map(({ start, end, change, ...row }) => ({
    ...row, user_id, start_time: start, end_time: end, change: change ?? null,
  })));
  await insertMissing("dean_grades", grades.map(({ examDate, ...row }) => ({
    ...row, user_id, exam_date: examDate ?? null,
  })));
  await insertMissing("dean_applications", applications.map(({ createdAt, ...row }) => ({
    ...row, user_id, created_at: createdAt,
  })));
  await insertMissing("dean_notifications", notifications.map(row => ({ ...row, user_id })));
  console.log("Seeded fictional student " + username);
}
