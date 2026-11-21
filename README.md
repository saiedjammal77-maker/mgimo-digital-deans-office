# Atlas · Digital Dean’s Office of the Future

A bilingual MGIMO competition entry with two fictional student accounts. The public campus homepage, 3D visitor tour at `/campus`, and privacy explainer at `/privacy` do not require a student login. The tour has three selectable landmarks, camera controls and an accessible illustrated plan. It is an interpretive model, not a survey or navigation map.

## Run

Use Node 24 and pnpm. Install with `pnpm install --frozen-lockfile`, then `pnpm dev`. Use `pnpm lint` and `pnpm build` to check the app. Run `node scripts/check-demo.mjs <origin>` to verify the deployed demo logins.

Demo usernames: `alina.volkova`, `mark.ivanov`. Both use `Atlas2026!`. Published demo credentials are for fictional records only.

## Storage

With no Supabase settings, the application runs in browser demo mode. The server authenticates the selected demo account and encrypts its session and changes in HTTP-only cookies. The latest four new applications and read receipts stay in that browser for up to 30 days. Set a private, stable `DEMO_SESSION_SECRET` on Vercel for this mode.

For a dedicated Supabase project, apply all migrations in `supabase/migrations` in filename order and enable password authentication. Set the server URL and publishable key in Vercel and redeploy. Provision private users individually; public demo usernames are reserved and use isolated demo sessions. A database administrator must explicitly assign a staff Auth UUID to `dean_staff` to enable the staff inbox at `/dean`. Students can create and track tickets at `/account/tickets`; staff can see ticket records and change their status, without access to students’ unrelated grades or profiles. No email is sent. The service-role key is not needed by the runtime. Run `node scripts/check-row-privacy.mjs` to exercise the migrations against local PostgreSQL with fictional principals.

## Art

The hero uses a licensed campus photograph (A.Savin, Wikipedia). Attribution, original source, alteration details and license are in `public/campus-photo/CREDITS.txt`. Run `node scripts/campus-foreground.mjs` to rebuild the foreground layers. The pin is a composition reference only. No paid media generation is required.
