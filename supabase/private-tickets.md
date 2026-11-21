# Private dean tickets

Students enter at `/account/tickets` or `/login?next=%2Faccount%2Ftickets`. A personal account needs a Supabase Auth user and its existing `dean_profiles` row. Each submission stores one `dean_applications` row of kind `ticket`. The student can read the full ticket ID, details, submission date, and status, and use **Refresh status** to see changes.

Staff sign in at `/dean` or `/login?next=%2Fdean`. The page and its read and update endpoints check the signed-in identity against `public.dean_staff`. The database independently enforces access to ticket rows and grants updates only to the status column. The inbox identifies the author by student UUID. Staff can set Submitted, In review, or Ready. Delivery means the ticket appears in this inbox. No email is generated.

## Provisioning

Use the existing account migration followed by `20261120000100_private_dean_tickets.sql` in a managed Supabase project. The app uses the publishable key and the user's session. A trusted administrator creates an individual password-based Auth account with the portal's existing login convention, `<username>@students.example.invalid`. A staff-only account can use the inbox without a student profile.

Using a trusted SQL administrator session, substitute that individual's verified Auth UUID below. There is no portal role field, public provisioning endpoint, or seeded staff login.

```sql
insert into public.dean_staff (user_id)
values ('<verified-auth-uuid>'::uuid)
on conflict (user_id) do nothing;
```

To revoke staff access, delete the designation. Subsequent reads and changes recheck membership even for existing sessions.

```sql
delete from public.dean_staff where user_id = '<verified-auth-uuid>'::uuid;
```

## Demo privacy

The public Alina and Mark logins always open the browser demo, including when Supabase is configured. In production this requires a stable private `DEMO_SESSION_SECRET` of at least 32 bytes. The seeded public Auth UUIDs are also restricted at the database level.

Suggested privacy-page copy:

> The demo keeps your four most recent dean tickets in encrypted cookies in this browser for the current sign-in, for up to eight hours from sign-in. Signing out clears the saved tickets. Signing in again starts an empty ticket history, even with the same demo account. Demo tickets stay out of the staff inbox. Use fictional details.

Эта формулировка для русской версии:

> В деморежиме четыре последних обращения хранятся в зашифрованных cookie этого браузера до выхода из аккаунта, но не дольше восьми часов с момента входа. При выходе сохранённые обращения удаляются. При новом входе история обращений пуста, даже если вы выбрали тот же демоаккаунт. Демообращения не поступают сотрудникам деканата. Используйте вымышленные данные.

The cap applies to dean tickets. The existing ordinary demo applications and notification read receipts have their own 30-day retention. Real tickets persist in Supabase after sign-out. The existing note limit is 256 UTF-8 bytes.

## Local verification

- Run `node scripts/check-ticket-policies.mjs` with `@electric-sql/pglite` available. To use an external test installation, set `PGLITE_MODULE` to its absolute entry point. The script applies both migrations to a disposable PostgreSQL database and verifies access as students, staff, a revoked staff member, a seeded public account, and an anonymous visitor.
- Run `node scripts/check-ticket-session.mjs http://127.0.0.1:3000` against a local portal with Playwright Chromium installed. If Playwright is installed elsewhere, set `PLAYWRIGHT_MODULE` to the absolute path to `playwright-core/index.mjs`. This uses disposable browser profiles and fictional notes. To verify public accounts bypass Supabase, start the portal with a loopback Supabase URL pointing to an unused port and a test publishable key.
