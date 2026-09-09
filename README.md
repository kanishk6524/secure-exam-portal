# Exam Platform

## Local setup

```bash
git clone <repository-url>
cd <repository-directory>
npm install
cp .env.example .env.local
docker compose up -d   # optional: only if not using a hosted Postgres like Supabase
npx prisma migrate dev
npx prisma db seed
npm run dev
```

The database is PostgreSQL, via Prisma. `DATABASE_URL` is a pooled connection (used by the app at runtime) and `DIRECT_URL` is a direct connection (used only by `prisma migrate`) — both are required. See "Hosted Postgres" below for where to get them from Supabase.

## Authentication email setup

Email delivery uses [Resend](https://resend.com). Set `RESEND_API_KEY` (from https://resend.com/api-keys) in `.env.local` and in Vercel. The sandbox default `RESEND_FROM=Exam Platform <onboarding@resend.dev>` only delivers to the email address you signed up to Resend with — verify a domain at https://resend.com/domains and switch `RESEND_FROM` to an address on that domain so real students/admins can receive verification and password-reset emails.

```text
AUTH_SECRET=<long-random-secret>
NEXT_PUBLIC_APP_URL=https://secure-exam-portal-eta.vercel.app
RESEND_API_KEY=<resend-api-key>
RESEND_FROM=Exam Platform <no-reply@your-domain.example>
CRON_SECRET=<cron-bearer-secret>
```

Never commit these values; configure them in Vercel Project Settings or an ignored local `.env.local`.

The Phase 2 auto-submit endpoint is `/api/cron/auto-submit`. Vercel Hobby does not support per-minute cron schedules, so configure this endpoint with an external scheduler or upgrade the Vercel project to Pro and add a `* * * * *` Vercel Cron schedule. Set `CRON_SECRET` in Vercel and send it as a bearer token from the scheduler.

## Edge AI proctoring

Phase 4 requests camera and microphone access only after the student accepts the exam instructions. Face landmarks, blink/head-turn liveness, sustained gaze, COCO-SSD object checks, face descriptor comparison, and VAD all run in the browser. Only incident type, confidence, and small metadata objects are sent to the server; raw video and audio are never uploaded. The audio check uses VAD speech segments plus a short-window overlap/alternation heuristic rather than full speaker diarization; this is a documented college-project simplification and future Phase 9 work. High/critical evidence modal support is present for incidents carrying a `snapshotUrl`; encrypted S3-compatible snapshot upload is intentionally deferred to Phase 7.

## Realtime deployment

Phase 3 uses `server.ts` to attach Socket.io to a persistent Node HTTP server. Run it locally with `npm run dev` or in production with `npm run build && npm start`. This custom server is not compatible with Vercel's serverless runtime; deploy the realtime app to a persistent Node host such as Railway or Render. Configure `PORT`, `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, and the SMTP variables there. The admin monitoring screen receives incidents over Socket.io, while `/api/cron/auto-submit` remains available for an external scheduler.

## Hosted Postgres (Supabase)

[Supabase](https://supabase.com) provides a free hosted Postgres project. From the project's "Connect" dialog, copy:
- the **Transaction pooler** connection string (port 6543) into `DATABASE_URL`, with `?pgbouncer=true` appended — this is what the app uses at runtime, including on Vercel's serverless functions.
- the **Session pooler** connection string (port 5432) into `DIRECT_URL` — this is what `prisma migrate` uses. (New Supabase projects only expose an IPv6 direct-connection host, which most networks/CI can't reach; the session pooler is the IPv4-compatible equivalent and works fine for migrations.)

Then run `npx prisma migrate dev` and `npx prisma db seed`. When using Supabase, `docker compose up -d` is not needed.