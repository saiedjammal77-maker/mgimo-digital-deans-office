// Runs both actual migrations in disposable PostgreSQL (PGlite).
// Install @electric-sql/pglite in a test environment, or set PGLITE_MODULE to its module path.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const { PGlite } = await import(process.env.PGLITE_MODULE || "@electric-sql/pglite");

const db = new PGlite();
const alice = "00000000-0000-4000-8000-000000000001";
const bob = "00000000-0000-4000-8000-000000000002";
const dean = "00000000-0000-4000-8000-000000000003";
const demo = "57f01001-0000-4000-8000-000000000001";
async function as(user, role = "authenticated") {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user || ""]);
  await db.exec("set role " + role);
}
const list = async () => (await db.query("select id, note, status from public.dean_applications")).rows;
const submit = (kind, note) => db.query("insert into public.dean_applications(kind,note) values($1,$2) returning id", [kind,note]);
const update = id => db.query("update public.dean_applications set status='review' where id=$1 returning id", [id]);
const denied = { code: "42501" };
try {
  await db.exec(`
    create role authenticated; create role anon; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
    $$;
    grant usage on schema auth to authenticated, anon;
  `);
  for (const migration of ["20261119000100_dean_accounts", "20261120000100_private_dean_tickets"]) {
    await db.exec(await readFile(new URL("../supabase/migrations/" + migration + ".sql", import.meta.url), "utf8"));
  }
  for (const id of [alice, bob, dean, demo]) {
    await db.query("insert into auth.users values ($1)", [id]);
    if (id !== dean) await db.query(`insert into public.dean_profiles values
      ($1,'{"en":"Name","ru":"Имя"}','{"en":"F","ru":"Ф"}','{"en":"P","ru":"П"}',1,'A')`, [id]);
  }
  await db.query("insert into public.dean_staff values ($1)", [dean]);
  await assert.rejects(db.query("insert into public.dean_staff values ($1)", [demo]), { code: "23514" });
  // A pre-migration non-fixture note on a shared identity must also stay hidden.
  await db.query("insert into public.dean_applications(user_id,kind,note) values($1,'application','legacy note')", [demo]);

  await as(alice);
  const ticket = (await submit("ticket", "Alice private")).rows[0].id;
  const certificate = (await submit("certificate", "Ordinary request")).rows[0].id;
  assert.equal((await list()).length, 2);
  assert.equal((await update(ticket)).affectedRows, 0);
  await assert.rejects(db.query("insert into public.dean_staff values ($1)", [alice]), denied);
  await assert.rejects(db.query("insert into public.dean_applications(user_id,kind,note) values ($1,'ticket','wrong owner')", [bob]), denied);
  await assert.rejects(submit("ticket", "  "), { code: "23514" });

  await as(bob);
  assert.deepEqual(await list(), []);
  assert.equal((await update(ticket)).affectedRows, 0);
  await submit("ticket", "Bob private");

  await as(dean);
  const inbox = await list();
  assert.deepEqual(inbox.map(row => row.note).sort(), ["Alice private", "Bob private"]);
  assert.equal((await db.query("select name from public.dean_profiles")).rows.length, 0);
  assert.equal((await update(ticket)).affectedRows, 1);
  assert.equal((await update(certificate)).affectedRows, 0);
  await assert.rejects(db.query("update public.dean_applications set note='edited' where id=$1", [ticket]), denied);
  await assert.rejects(db.query("delete from public.dean_applications where id=$1", [ticket]), denied);
  await assert.rejects(db.query("update public.dean_applications set status='invalid' where id=$1", [ticket]), { code: "23514" });
  await as(alice);
  assert.equal((await list()).find(row => row.id === ticket).status, "review");

  await as(demo);
  assert.deepEqual(await list(), []);
  await assert.rejects(submit("ticket", "shared account"), denied);
  await assert.rejects(submit("application", "shared account"), denied);
  await as(null, "anon");
  await assert.rejects(list(), denied);
  await assert.rejects(submit("ticket", "anonymous"), denied);

  await db.exec("reset role");
  await db.query("delete from public.dean_staff where user_id=$1", [dean]);
  await as(dean);
  assert.deepEqual(await list(), []);
  assert.equal((await update(ticket)).affectedRows, 0);
  console.log("Ticket ownership, staff designation and revocation, status-only changes, anonymous and public fixture isolation passed.");
} finally {
  await db.close();
}
