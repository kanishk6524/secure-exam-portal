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

## Hosted MongoDB

MongoDB Atlas provides a free hosted cluster. Create a database, copy its connection string into `DATABASE_URL` in `.env.local`, and then run `npx prisma db push` and `npx prisma db seed`. When using Atlas, `docker compose up -d` is optional.