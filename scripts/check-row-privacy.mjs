import assert from "node:assert/strict";
import {readFile,readdir} from "node:fs/promises";
import {PGlite} from "@electric-sql/pglite";

const db=new PGlite();
const migrations=new URL("../supabase/migrations/",import.meta.url);
const first="71000000-0000-4000-8000-000000000001";
const second="71000000-0000-4000-8000-000000000002";
const dean="71000000-0000-4000-8000-000000000003";
async function identity(id){
  await db.exec("reset role;set role authenticated");
  await db.query("select set_config('student_test.uid',$1,false)",[id]);
}
try {
  await db.exec("create role authenticated;create role anon;create role service_role;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('student_test.uid', true),'')::uuid $$;grant usage on schema auth to authenticated,anon");
  for(const name of (await readdir(migrations)).filter(n=>n.endsWith(".sql")).sort()) await db.exec(await readFile(new URL(name,migrations),"utf8"));
  for(const id of [first,second,dean]) await db.query("insert into auth.users values($1)",[id]);
  for(const id of [first,second]) await db.query("insert into dean_profiles values($1,$2,$2,$2,1,'TEST')",[id,JSON.stringify({en:"Test",ru:"Пример"})]);
  await db.query("insert into dean_staff values($1)",[dean]);
  for(const [id,note] of [[first,"alpha"],[second,"bravo"]]){
    await identity(id);
    await db.query("insert into dean_applications(kind,note) values('ticket',$1),('certificate','sample')",[note]);
    assert.deepEqual((await db.query("select user_id from dean_profiles")).rows,[{user_id:id}]);
    assert.deepEqual((await db.query("select note from dean_applications where kind='ticket'")).rows,[{note}]);
    assert.equal((await db.query("select user_id from dean_staff")).rows.length,0);
    assert.equal((await db.query("update dean_applications set status='review' where kind='ticket' returning id")).rows.length,0);
  }
  await identity(dean);
  assert.deepEqual((await db.query("select note from dean_applications order by note")).rows,[{note:"alpha"},{note:"bravo"}]);
  assert.equal((await db.query("select user_id from dean_profiles")).rows.length,0);
  assert.equal((await db.query("update dean_applications set status='review' where note='alpha' returning id")).rows.length,1);
  await identity(first);
  assert.deepEqual((await db.query("select status from dean_applications where kind='ticket'")).rows,[{status:"review"}]);
  await db.exec("reset role; set role anon");
  await assert.rejects(()=>db.query("select note from dean_applications"),(err)=>err.code==="42501");
  console.log("PostgreSQL RLS passed: own records, staff inbox scope, staff-only updates, student-visible tracking, anonymous denial.");
} finally {await db.close()}
