import assert from "node:assert/strict";

const origin = new URL(process.argv[2]).origin;
const cookies = new Map();
async function request(path, body, expected = 200) {
  const response = await fetch(origin + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", Origin: origin, Cookie: [...cookies].map(pair => pair.join("=")).join("; ") },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual"
  });
  assert.equal(response.status, expected, path + " status");
  for (const header of response.headers.getSetCookie()) {
    const first = header.split(";")[0], split = first.indexOf("=");
    if (first.slice(split + 1)) cookies.set(first.slice(0, split), first.slice(split + 1));
    else cookies.delete(first.slice(0, split));
  }
  return response;
}
const asStudent = username => request("/api/login", {username,password:"Atlas2026!"});
const front = await (await request("/")).text();
assert.match(front, /Бюллетень кампуса/);
assert.match(front, /Дипломатический протокол/);
assert.match(front, /vernadsky\.webp/);
assert.match(front, /\/campus\/walk/);
assert.match(front, /<html lang="ru"/);
assert.match(front, /kind=application/);
assert.match(await (await request("/campus/walk")).text(), /Начать прогулку/);
for (const path of ["/login", "/campus", "/privacy", "/campus-photo/vernadsky.webp", "/campus-photo/CREDITS.txt",
  "/campus-map/materials/architecture.glb", "/campus-map/materials/canopy-0.webp", "/campus-map/materials/paving.webp"]) await request(path);
const model = await (await request("/campus-photo/vernadsky.glb")).arrayBuffer();
assert.equal(Buffer.from(model, 0, 4).toString(), "glTF");
await request("/api/account", undefined, 401);
await asStudent("alina.volkova");
for(const section of ["","/schedule","/grades","/applications","/tickets","/notifications"]) await request("/account"+section);
const response = await request("/api/account");
assert.match(response.headers.get("cache-control"), /no-store/);
const alina = await response.json();
assert.equal(alina.profile.name.en, "Alina Volkova");
assert.ok(alina.lessons.some(item => item.change));
assert.ok(alina.grades.some(item => item.examDate));
assert.ok(alina.notifications.length && alina.applications.length);
assert.equal(alina.demo,true,"This check writes tickets only to an isolated demo session");
await request("/api/dean/tickets",undefined,403);
const {id:ticketId}=await (await request("/api/applications",{kind:"ticket",note:"Demo: please confirm the Wednesday seminar room."})).json();
assert.ok((await (await request("/api/account")).json()).applications.some(row=>row.id===ticketId && row.kind==="ticket" && row.status==="submitted"));
await request("/api/logout", {});
await request("/api/account", undefined, 401);
await asStudent("mark.ivanov");
const mark = await (await request("/api/account")).json();
assert.equal(mark.profile.name.en, "Mark Ivanov");
assert.ok(mark.notifications.every(notice => !alina.notifications.some(other => other.id === notice.id)));
assert.ok(!mark.applications.some(row=>row.id===ticketId));
await request("/api/logout", {});
await asStudent("alina.volkova");
assert.ok(!(await (await request("/api/account")).json()).applications.some(row=>row.id===ticketId));
await request("/api/logout", {});
console.log("Public campus tour and media, both demo logins, ticket submission, student isolation, staff inbox denial and demo ticket removal on logout passed.");
