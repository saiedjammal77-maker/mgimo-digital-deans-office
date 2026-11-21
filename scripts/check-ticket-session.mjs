// Run against a local portal with Playwright Chromium installed.
// PLAYWRIGHT_MODULE may point to an existing playwright-core/index.mjs.
import assert from "node:assert/strict";

const origin = new URL(process.argv[2] || "http://127.0.0.1:3000").origin;
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(origin).hostname), "Use a local portal");
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright-core");
const browser = await chromium.launch({ ignoreDefaultArgs: ["--disable-back-forward-cache"] });
const student = { username: "alina.volkova", password: "Atlas2026!" };
const text = "Fictional ticket " + crypto.randomUUID();
const loginUrl = origin + "/login?next=%2Faccount%2Ftickets";
const ticketsUrl = origin + "/account/tickets";
const ticketCookies = cookies => cookies.filter(cookie => cookie.name.includes("-ticket-"));
async function signIn(page) {
  await page.goto(loginUrl);
  await page.getByLabel("Username", { exact: true }).fill(student.username);
  await page.locator("#atlas-password").fill(student.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(ticketsUrl);
  await page.getByLabel("Ticket details").waitFor();
}

try {
  const first = await browser.newContext({ baseURL: origin });
  const other = await browser.newContext({ baseURL: origin });
  const page = await first.newPage();
  const guest = await other.newPage();
  assert.equal((await first.request.get("/api/dean/tickets")).status(), 401);
  await signIn(page);
  await signIn(guest);
  assert.equal((await first.request.post("/api/login", { data: { ...student, role: "dean" } })).status(), 400);
  const initialCookies = await first.cookies();
  assert.ok(!initialCookies.some(cookie => cookie.name.startsWith("sb-")));
  assert.ok(initialCookies.some(cookie => cookie.name.endsWith("-session") && cookie.httpOnly));

  for (let index = 0; index < 4; index++) {
    const res = await first.request.post("/api/applications", { data: { kind: "ticket", note: "Fictional " + index } });
    assert.equal(res.status(), 200);
  }
  await page.getByLabel("Ticket details").fill(text);
  await page.getByRole("button", { name: "Save demo ticket" }).click();
  await page.getByText(text, { exact: true }).waitFor();
  const account = await first.request.get("/api/account");
  assert.match(account.headers()["cache-control"], /no-store/);
  const snapshot = await account.json();
  const tickets = snapshot.applications.filter(row => row.kind === "ticket");
  assert.equal(tickets.length, 4);
  assert.ok(tickets.every(row => row.note !== "Fictional 0"));
  const ticket = tickets.find(row => row.note === text);
  assert.equal(ticket.status, "submitted");
  await page.getByText(ticket.id, { exact: true }).waitFor();
  const stored = ticketCookies(await first.cookies());
  assert.equal(stored.length, 4);
  assert.ok(stored.every(cookie => cookie.httpOnly && !cookie.value.includes(text) &&
    cookie.expires * 1000 <= snapshot.demoExpiresAt + 1000));
  assert.equal((await first.request.get("/api/dean/tickets")).status(), 403);
  assert.equal((await first.request.post("/api/dean/tickets", { data: { id: ticket.id, status: "ready" } })).status(), 403);
  const second = await (await other.request.get("/api/account")).json();
  assert.ok(second.applications.every(row => row.kind !== "ticket"));
  const denied = await other.newPage();
  await denied.goto("/dean");
  assert.equal(await denied.getByRole("heading", { name: "Dean’s office inbox" }).count(), 0);
  assert.ok(!(await denied.content()).includes(text));

  const mirror = await first.newPage();
  await mirror.goto(ticketsUrl);
  await mirror.getByText(text, { exact: true }).waitFor();
  await mirror.getByLabel("Ticket details").fill("Fictional unsent draft");
  await page.goto(origin + "/account/applications");
  await page.goto(ticketsUrl);
  await page.getByText(text, { exact: true }).waitFor();
  await page.getByRole("button", { name: "Sign out", exact: true }).first().click();
  await page.waitForURL(origin + "/login");
  await mirror.waitForURL(loginUrl);
  assert.equal(ticketCookies(await first.cookies()).length, 0);
  assert.equal((await first.request.get("/api/account")).status(), 401);
  await page.goBack();
  await page.waitForURL(url => url.pathname === "/login");
  assert.ok(!(await page.content()).includes(text));
  await signIn(page);
  assert.ok((await (await first.request.get("/api/account")).json()).applications.every(row => row.kind !== "ticket"));
  assert.equal(await page.getByLabel("Ticket details").inputValue(), "");
  console.log("Demo sign-in return link, submission and ID, four-ticket cap, session expiry, visitor isolation, staff denial, cookie deletion, second tab, Back and same-password re-login passed.");
} finally {
  await browser.close();
}
