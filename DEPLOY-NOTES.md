# Backend — Vercel deployment notes

## New dependencies
Run in `backend/`:
```
npm install helmet express-rate-limit @vercel/blob
```

## Vercel dashboard — Storage
Connect a **Blob** store to this project (Storage tab -> Create Database ->
Blob). This automatically injects `BLOB_READ_WRITE_TOKEN` as an env var —
no manual copying of a token into Environment Variables.

## Vercel dashboard — Environment Variables
Set these on the **backend** project (Settings -> Environment Variables):

| Key | Value |
|---|---|
| `DATABASE_URL` | Supabase pooled connection string, port **6543**, with `?pgbouncer=true` |
| `DIRECT_URL` | Supabase direct connection string, port 5432 (used by `prisma migrate`, not by the app at runtime) |
| `MONGO_URI` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | Same long random string as before |
| `ALLOWED_ORIGINS` | The deployed frontend URL, e.g. `https://relay-frontend.vercel.app` (comma-separate if you need to allow more than one, e.g. also a preview URL) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `EMAIL_FROM` | Same as before, optional |
| `NODE_ENV` | `production` (Vercel sets this automatically, no action needed) |

## Prisma schema — add DIRECT_URL
`backend/prisma/schema.prisma` datasource block needs a second field so
migrations bypass the pooler (pgbouncer doesn't support the prepared
statements Prisma migrate needs):

```prisma
datasource db {
  provider          = "postgresql"
  url               = env("DATABASE_URL")
  directUrl         = env("DIRECT_URL")
  extensions        = [uuidOssp(map: "uuid-ossp")]
}
```

## What did NOT change
- `server.js` is untouched and still works for local dev (`npm start`) —
  it's simply not used by Vercel, which invokes `api/index.js` instead.
- `docker-compose.yml` / Dockerfiles are untouched — still useful for local
  Docker development, just no longer the deployment path.
- Models, routes, and business logic in `controllers/`, `models/`,
  `services/` are unchanged except `productController.js` and
  `uploadMiddleware.js`.
