# Queue Manager

Queue Manager is a web app for walk-in service counters, the kind you find at clinics, pharmacies and help desks, anywhere people take a number and wait. Staff add people as they arrive, issue each one a token, and call them in order. Managers get live wait estimates and a dashboard that shows exactly where the day slowed down.

The idea behind it is simple: nobody in the waiting room should have to wonder whether they've been skipped.

## What it does

- **Queues.** Set up a queue for each counter or service. The overview shows how long every line is and flags any queue where people are waiting but nobody is being served.
- **Counter view.** The person being served is front and centre, and the call button names who's next, so staff never call the wrong token. Mark people as served or as no-shows, reorder the line, or remove someone, all from one screen.
- **Wait estimates.** When someone joins, staff see their token number, how many people are ahead of them, and an estimated wait based on how long each person has actually been taking at the counter.
- **Dashboard.** A plain-language summary of the last 24 hours, 7 days or 30 days, with charts for the busiest hours, line length, wait times and how many people left before being called. Filter by queue to compare counters.
- **Manager accounts.** Managers register and sign in with an email and password. Every page beyond the login screen is protected.

## Tech stack

| Part | Built with |
|---|---|
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS v4, Recharts |
| Backend | Node.js, TypeScript |
| Database | PostgreSQL, accessed through Prisma |
| Auth | JSON Web Tokens (JWT), passwords stored as hashes |

### How the pieces fit together

- **PostgreSQL** stores everything: manager accounts, queues, and every token issued, along with when it was created, called and finished. The dashboard's numbers are worked out from those timestamps.
- **Prisma** sits between the backend and the database. The tables are defined once in `backend/prisma/schema.prisma`, and Prisma turns that into SQL migrations (`prisma/migrations/`) and a fully typed client (`src/lib/prisma.ts`). A typo in a field name is a compile error, not a runtime surprise.
- **JWT** handles sign-in. When a manager registers or signs in, the backend checks their password and returns a signed token. The frontend sends that token with every request, and `backend/src/middleware/auth.ts` verifies it before any protected route runs. The token is signed with `JWT_SECRET`, so it can't be forged without that secret.

## Project layout

```
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   │   ├── 20261114120000_init/
│   │   │   │   └── migration.sql      SQL that creates the first version of the tables
│   │   │   └── migration_lock.toml    Records which database the migrations are for
│   │   ├── schema.prisma              Database models: managers, queues and tokens
│   │   └── seed.ts                    Adds demo data and the demo manager account
│   ├── src/
│   │   ├── lib/
│   │   │   ├── analytics.ts           Dashboard maths: wait times, busy hours, line length
│   │   │   ├── errors.ts              Shared error types and the error handler
│   │   │   └── prisma.ts              One shared database client for the whole backend
│   │   ├── middleware/
│   │   │   └── auth.ts                Blocks requests that don't come from a signed-in manager
│   │   ├── routes/
│   │   │   ├── analytics.ts           GET /analytics for the dashboard
│   │   │   ├── auth.ts                Sign up, sign in, sign out, current manager
│   │   │   ├── queues.ts              Create, list, view, rename, delete queues; add people; call next
│   │   │   └── tokens.ts              Finish, cancel or move one person in a line
│   │   ├── app.ts                     Builds the app: middleware, routes, error handler
│   │   └── index.ts                   Starts the server
│   ├── .env.example                   Template for backend settings (database URL, secrets)
│   ├── .prettierignore                Files Prettier should skip
│   ├── .prettierrc                    Code formatting rules
│   ├── package-lock.json              Exact versions of every installed package
│   ├── package.json                   Backend dependencies and scripts
│   ├── prisma.config.ts               Prisma settings: schema, migrations and seed command
│   └── tsconfig.json                  TypeScript settings
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (app)/                 Pages that need a signed-in manager (brackets keep it out of the URL)
│   │   │   │   ├── dashboard/
│   │   │   │   │   └── page.tsx       /dashboard: summary, charts and per-queue table
│   │   │   │   ├── queues/
│   │   │   │   │   ├── [id]/
│   │   │   │   │   │   ├── components/
│   │   │   │   │   │   │   ├── addPerson.tsx    Name box and the "Give them token A-015" message
│   │   │   │   │   │   │   ├── counter.tsx      Who's at the counter, Done, No-show and Call buttons
│   │   │   │   │   │   │   ├── history.tsx      Recently finished list
│   │   │   │   │   │   │   ├── misc.tsx         Not-found message, loading placeholder, small helpers
│   │   │   │   │   │   │   ├── queueHeader.tsx  Back link, rename-on-click title, line summary
│   │   │   │   │   │   │   ├── uiStyles.tsx     Shared class names for buttons, inputs and panels
│   │   │   │   │   │   │   └── waitingPage.tsx  The line itself, with move and remove buttons
│   │   │   │   │   │   └── page.tsx   /queues/:id: loads the queue and puts the sections together
│   │   │   │   │   └── page.tsx       /queues: all queues with waiting counts, create a queue
│   │   │   │   └── layout.tsx         Header and navigation; sends signed-out users to /login
│   │   │   ├── login/
│   │   │   │   └── page.tsx           /login: sign in or create an account
│   │   │   ├── globals.css            Theme colours and shared styles
│   │   │   ├── icon.svg               Browser tab icon
│   │   │   ├── layout.tsx             Root layout: html, body, global styles, sign-in state
│   │   │   └── page.tsx               / : sends you on to the right page
│   │   ├── components/
│   │   │   └── charts.tsx             Line and bar charts used on the dashboard
│   │   └── lib/
│   │       ├── api.ts                 Calls the backend and defines the data types
│   │       ├── auth.tsx               Sign-in state and useAuth() (login, register, logout)
│   │       └── format.ts              Formats durations, times and token numbers
│   ├── .env.example                   Template for frontend settings (backend URL)
│   ├── .prettierignore                Files Prettier should skip
│   ├── .prettierrc                    Code formatting rules
│   ├── next.config.ts                 Next.js settings
│   ├── package-lock.json              Exact versions of every installed package
│   ├── package.json                   Frontend dependencies and scripts
│   ├── postcss.config.mjs             Turns on Tailwind CSS
│   └── tsconfig.json                  TypeScript settings
└── .gitignore                         Files Git should never commit (node_modules, .env, builds)
```

## Getting started

### What you need

- Node.js 20 or newer
- PostgreSQL 14 or newer, installed locally or running in Docker

If you have Docker, this starts a database you can use straight away:

```bash
docker run --name queue-manager-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=queue_manager \
  -p 5432:5432 -d postgres:16
```

If you installed PostgreSQL yourself, create an empty database for the app:

```bash
createdb queue_manager
```

### 1. Set up the backend

```bash
cd backend
npm install
cp .env.example .env
```

Open `backend/.env` and fill it in:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/queue_manager"
JWT_SECRET="replace-with-a-long-random-string"
PORT=3001
```

| Variable | What it's for |
|---|---|
| `DATABASE_URL` | Where Prisma connects. The format is `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`. |
| `JWT_SECRET` | The key used to sign and verify login tokens. Use a long random value and never commit it. `openssl rand -base64 32` generates a good one. |
| `PORT` | The port the API listens on. |

Then create the tables, load the demo data and start the server:

```bash
npx prisma migrate dev    # applies the migrations and generates the Prisma client
npx prisma db seed        # adds demo queues and the demo manager account
npm run dev
```

### 2. Set up the frontend

In a second terminal:

```bash
cd frontend
npm install
cp .env.example .env
```

Open `frontend/.env` and point it at the backend:

```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

| Variable | What it's for |
|---|---|
| `NEXT_PUBLIC_API_URL` | The address of the backend. It must match the backend's `PORT`. |

Then start it:

```bash
npm run dev
```

Open http://localhost:3000 and sign in.

### Demo account

After seeding, sign in with:

- Email: `admin@example.com`
- Password: `password123`

The login page also has a "Fill in the demo account" link.

### Handy Prisma commands

| Command | What it does |
|---|---|
| `npx prisma studio` | Opens a browser view of the database, useful for checking data |
| `npx prisma migrate dev --name <change>` | Creates a new migration after you edit `schema.prisma` |
| `npx prisma migrate reset` | Wipes the database, re-runs every migration and re-seeds it |
| `npx prisma generate` | Regenerates the typed client without touching the database |

### If something goes wrong

- **`Can't reach database server`**: PostgreSQL isn't running, or `DATABASE_URL` has the wrong host, port, user or password.
- **The frontend loads but every request fails**: check that the backend is running and that `NEXT_PUBLIC_API_URL` matches its port.
- **Signed out after restarting the backend**: `JWT_SECRET` changed, so old tokens no longer verify. Sign in again.

## API

All routes except sign-in and sign-up need a signed-in manager.

| Method | Path | What it does |
|---|---|---|
| GET | `/queues` | List queues with waiting and serving counts |
| POST | `/queues` | Create a queue |
| GET | `/queues/:id` | One queue with who's waiting, being served and recently finished |
| PATCH | `/queues/:id` | Rename a queue |
| DELETE | `/queues/:id` | Delete a queue and its tokens |
| POST | `/queues/:id/tokens` | Add a person and issue a token |
| POST | `/queues/:id/serve-next` | Finish the current person and call the next |
| POST | `/tokens/:id/complete` | Finish serving without calling anyone |
| POST | `/tokens/:id/cancel` | Remove someone or mark a no-show |
| POST | `/tokens/:id/move` | Move someone up or down (`{ "direction": "up" \| "down" }`) |
| GET | `/analytics` | Dashboard data. Query: `range` (`24h`, `7d`, `30d`), `queueId` (`all` or an id), `tzOffset` |

Sign-in and sign-up routes are in `backend/src/routes/auth.ts`.

## Formatting

Both projects use Prettier. Run it from either folder:

```bash
npx prettier --write .
```
