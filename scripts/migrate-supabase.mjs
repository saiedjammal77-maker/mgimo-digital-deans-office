// Run from the project root with the Supabase project ref shown in its dashboard:
// vercel env run --project atlas-mgimo-student -e production -- node scripts/migrate-supabase.mjs <ref> [--apply]
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { demoUsers, demoPassword, fixture, loginDomain } from "../src/lib/server/fixtures.ts";

const [ref, mode, ...extra] = process.argv.slice(2);
if (!/^[a-z0-9]{20}$/.test(ref ?? "") || (mode && mode !== "--apply") || extra.length) {
  throw new Error("Usage: node scripts/migrate-supabase.mjs <project-ref> [--apply]");
}

// URL parse errors can contain the complete input, including its password.
let database;
let password;
try {
  database = new URL(process.env.POSTGRES_URL_NON_POOLING);
  password = decodeURIComponent(database.password);
} catch {
  throw new Error("A valid POSTGRES_URL_NON_POOLING from the production integration is required.");
}
const direct = database.hostname === `db.${ref}.supabase.co` && database.username === "postgres";
const pooler = database.hostname.endsWith(".pooler.supabase.com") && database.username === `postgres.${ref}`;
if ((!direct && !pooler) || !["postgres:", "postgresql:"].includes(database.protocol) ||
    !["", "5432"].includes(database.port) || database.pathname !== "/postgres" || !password) {
  throw new Error("The database connection must identify the requested Supabase project in direct or session mode.");
}
database.password = "";
database.search = "?sslmode=require";
database.hash = "";

const root = fileURLToPath(new URL("../", import.meta.url));
const migrations = readdirSync(new URL("../supabase/migrations/", import.meta.url));
if (!migrations.some(name => /^\d+_.+\.sql$/.test(name))) {
  throw new Error("No versioned SQL migrations found in supabase/migrations.");
}

function run(args) {
  const result = spawnSync("supabase", [...args, "--db-url", database.href], {
    cwd: root,
    env: { ...process.env, PGPASSWORD: password, SUPABASE_DB_PASSWORD: password },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    // SQL error diagnostics can echo seed statements containing credentials.
    throw new Error(`supabase ${args.slice(0, 2).join(" ")} failed (exit ${result.status}). Check database access and the pending SQL.`);
  }
  return result.stdout;
}

const api = `https://${ref}.supabase.co`;
const configuredApi = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (mode === "--apply" && (configuredApi?.replace(/\/$/, "") !== api || !publicKey ||
    !(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY))) {
  throw new Error("Applying and verifying the seed requires the same project's API URL, admin key and public key.");
}

const push = ["db", "push", "--skip-vault"];
run([...push, "--dry-run"]);
if (!mode) {
  console.log("Migration dry run succeeded. Local and remote versions follow.");
  process.stdout.write(run(["migration", "list"]));
  process.exit(0);
}
run([...push, "--yes"]);
process.stdout.write(run(["migration", "list"]));

const seed = spawnSync(process.execPath, ["scripts/seed.mjs"], {
  cwd: root, stdio: ["ignore", "pipe", "pipe"],
});
if (seed.error) throw seed.error;
if (seed.status !== 0) throw new Error("Migration completed but the demo seed failed. Check the seed credentials and retry.");

for (const [username, userId] of Object.entries(demoUsers)) {
  const client = createClient(api, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const login = await client.auth.signInWithPassword({ email: `${username}@${loginDomain}`, password: demoPassword });
  if (login.error || login.data.user?.id !== userId) throw new Error(`Seed login failed for ${username}.`);
  try {
    const profile = await client.from("dean_profiles").select("user_id").single();
    if (profile.error || profile.data?.user_id !== userId) throw new Error(`Profile verification failed for ${username}.`);
    const records = fixture(username);
    for (const kind of ["lessons", "grades", "applications", "notifications"]) {
      const ids = records[kind].map(row => row.id);
      if (!ids.length) continue;
      const result = await client.from(`dean_${kind}`).select("id", { head: true, count: "exact" })
        .eq("user_id", userId).in("id", ids);
      if (result.error || result.count !== ids.length) throw new Error(`Missing seeded ${kind} for ${username}.`);
    }
  } finally {
    await client.auth.signOut({ scope: "local" });
  }
}
console.log("Verified both demo logins, profiles and seeded records against the remote database.");
