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

## Authentication (Firebase)

Registration, email verification, and password-reset emails are handled by [Firebase Authentication](https://console.firebase.google.com) via its server-side REST API (Identity Toolkit) — no separate email provider or API key rotation is needed, Firebase sends the emails itself. Two one-time setup steps in the Firebase console:

1. **Authentication → Sign-in method → Email/Password → Enable.** Without this, registration fails with "Email/password sign-in is not enabled for this Firebase project."
2. Copy the **Web API Key** from Project settings → General into `FIREBASE_API_KEY`. This key is not a secret (Firebase's own docs confirm it's safe to expose client-side too) but it's still kept in `.env.local`/Vercel env vars for consistency.

```text
AUTH_SECRET=<long-random-secret>
NEXT_PUBLIC_APP_URL=https://secure-exam-portal-eta.vercel.app
FIREBASE_API_KEY=<firebase-web-api-key>
CRON_SECRET=<cron-bearer-secret>
```

Accounts created before this switch (e.g. the seeded demo users) have no `firebaseUid` and keep authenticating against the local bcrypt `passwordHash` — `auth.ts`'s `authorize()` branches on whether `firebaseUid` is set. All new registrations go through Firebase.

Password reset for Firebase accounts is entirely self-service on Firebase's own hosted page (the emailed link goes straight there, not through this app); `/reset-password` in this app only serves the legacy bcrypt accounts.

The Phase 2 auto-submit endpoint is `/api/cron/auto-submit`. Vercel Hobby does not support per-minute cron schedules, so configure this endpoint with an external scheduler or upgrade the Vercel project to Pro and add a `* * * * *` Vercel Cron schedule. Set `CRON_SECRET` in Vercel and send it as a bearer token from the scheduler.

## Edge AI proctoring

Phase 4 requests camera and microphone access only after the student accepts the exam instructions. Face landmarks, blink/head-turn liveness, sustained gaze, COCO-SSD object checks, face descriptor comparison, and VAD all run in the browser. Only incident type, confidence, and small metadata objects are sent to the server; raw video and audio are never uploaded. The audio check uses VAD speech segments plus a short-window overlap/alternation heuristic rather than full speaker diarization; this is a documented college-project simplification and future Phase 9 work. High/critical evidence modal support is present for incidents carrying a `snapshotUrl`; encrypted S3-compatible snapshot upload is intentionally deferred to Phase 7.

## Realtime deployment

Phase 3 uses `server.ts` to attach Socket.io to a persistent Node HTTP server. Run it locally with `npm run dev` or in production with `npm run build && npm start`. This custom server is not compatible with Vercel's serverless runtime; deploy the realtime app to a persistent Node host such as Railway or Render. Configure `PORT`, `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, and `FIREBASE_API_KEY` there. The admin monitoring screen receives incidents over Socket.io, while `/api/cron/auto-submit` remains available for an external scheduler.

## Hosted Postgres (Supabase)

[Supabase](https://supabase.com) provides a free hosted Postgres project. From the project's "Connect" dialog, copy:
- the **Transaction pooler** connection string (port 6543) into `DATABASE_URL`, with `?pgbouncer=true` appended — this is what the app uses at runtime, including on Vercel's serverless functions.
- the **Session pooler** connection string (port 5432) into `DIRECT_URL` — this is what `prisma migrate` uses. (New Supabase projects only expose an IPv6 direct-connection host, which most networks/CI can't reach; the session pooler is the IPv4-compatible equivalent and works fine for migrations.)

Then run `npx prisma migrate dev` and `npx prisma db seed`. When using Supabase, `docker compose up -d` is not needed.