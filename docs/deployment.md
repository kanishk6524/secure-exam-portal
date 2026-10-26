# Deployment, scale and reliability

## Why not Vercel for exam day
`server.ts` runs Next.js together with a Socket.io server. Vercel runs each request in a short-lived serverless function, so it never runs `server.ts`. On Vercel the portal still works for taking exams (the browser polls every 10 seconds), but:

- no live incident feed for admins (they get a 10-second refresh),
- invigilator messages, pause and desk-check requests arrive within 10 seconds instead of instantly,
- the phone side camera does not work (its pictures are held in the memory of one running server),
- the "connection lost" heartbeat tracking does not run.

Use Vercel for demos of the dashboards; use a long-running server for a real exam.

## Run it on a normal server
The repository has a `Dockerfile` and a `/api/health` check.

1. Create a Postgres database (Supabase works: `DATABASE_URL` is the pooled URL on port 6543 with `?pgbouncer=true`, `DIRECT_URL` the direct one).
2. On Render, Railway or Fly.io create a Web Service from this repository using the Dockerfile. Set the environment variables from `.env.example`: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL` (the public https address), `ADMIN_REGISTRATION_CODE`, `CRON_SECRET`, `FIREBASE_API_KEY`, `PUBLIC_BASE_URL` (same https address, for the phone camera) and optionally `NEXT_PUBLIC_GRIEVANCE_EMAIL`.
3. The container applies migrations on start (`prisma migrate deploy`), then starts `server.ts`. Health check path: `/api/health`.
4. Run exactly **one** instance. Live connections, the heartbeat table and the phone-camera pictures live in that process's memory.

## Scaling beyond one instance (not built yet)
One modest server can usually hold a few hundred candidates, but that number is **unmeasured**: run the load test below and use what it prints. To go past one instance you would need (a) the Socket.io Redis adapter so events reach candidates connected to another instance, (b) the heartbeat table and phone-camera pictures moved to Redis, and (c) sticky sessions at the load balancer.

## Load test
```
npm run dev            # or the staging server
npm run load-test -- --base http://localhost:3001 --users 100 --think 1 --ramp 20
```
It creates virtual candidates, runs a whole exam for each, and writes `docs/load-test-results.md` with p50/p95/p99 latency and errors per endpoint. Only run it against a local or staging copy. Registration and login use bcrypt (deliberately slow), so a login stampede at exam start is the usual first bottleneck; the `--ramp` option spreads arrivals out.

## What happens when a candidate's internet drops
- Every answer change goes into an outbox first and is retried every 3 seconds and when the browser reports it is online again. It survives a page refresh (stored in the browser). A red banner shows how many changes are waiting.
- The exam page flushes the outbox before submitting.
- Reloading the page resumes the same session; the server keeps the clock, so no time is gained or lost.
- The server records `CONNECTION_LOST` when it stops hearing a heartbeat for 45 seconds (when the live server is running).
- An invigilator can pause a candidate's clock if there is a real outage; the end time moves later by exactly the paused time and the action is written to the audit log.

## Known gaps
- `next.config.mjs` has `typescript.ignoreBuildErrors: true`, so a build succeeds even with type errors. Run `npx tsc --noEmit` before deploying.
- Nothing here has been run under real load yet.
