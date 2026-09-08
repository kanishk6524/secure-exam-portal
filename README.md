# Exam Platform

## Local setup

```bash
git clone <repository-url>
cd <repository-directory>
npm install
cp .env.example .env.local
docker compose up -d
npx prisma db push
npx prisma db seed
npm run dev
```

The local database uses MongoDB 7 with the connection in `.env.local`. Prisma MongoDB databases use `db push`; Prisma migration commands are for relational databases.

## Authentication email setup

Local development uses Nodemailer's Ethereal test SMTP automatically when `SMTP_HOST` is not set. Registration and password-reset requests log a preview URL in the server console. For the live demo, add these Vercel environment variables:

```text
AUTH_SECRET=<long-random-secret>
NEXT_PUBLIC_APP_URL=https://secure-exam-portal-eta.vercel.app
SMTP_HOST=<provider-host>
SMTP_PORT=587
SMTP_USER=<provider-user>
SMTP_PASS=<provider-password-or-api-key>
SMTP_FROM=Exam Platform <no-reply@your-domain.example>
CRON_SECRET=<cron-bearer-secret>
```

Gmail requires an app password with SMTP enabled. SendGrid can be used with `smtp.sendgrid.net`, username `apikey`, and the SendGrid API key as `SMTP_PASS`. Never commit these values; configure them in Vercel Project Settings or an ignored local `.env.local`.

The Phase 2 auto-submit endpoint is `/api/cron/auto-submit`. Vercel Hobby does not support per-minute cron schedules, so configure this endpoint with an external scheduler or upgrade the Vercel project to Pro and add a `* * * * *` Vercel Cron schedule. Set `CRON_SECRET` in Vercel and send it as a bearer token from the scheduler.

## Realtime deployment

Phase 3 uses `server.ts` to attach Socket.io to a persistent Node HTTP server. Run it locally with `npm run dev` or in production with `npm run build && npm start`. This custom server is not compatible with Vercel's serverless runtime; deploy the realtime app to a persistent Node host such as Railway or Render. Configure `PORT`, `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, and the SMTP variables there. The admin monitoring screen receives incidents over Socket.io, while `/api/cron/auto-submit` remains available for an external scheduler.

## Hosted MongoDB

MongoDB Atlas provides a free hosted cluster. Create a database, copy its connection string into `DATABASE_URL` in `.env.local`, and then run `npx prisma db push` and `npx prisma db seed`. When using Atlas, `docker compose up -d` is optional.