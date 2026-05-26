# AXIOM — Workforce Orchestration Platform

> A premium SaaS roster management system built for Taylor's University ICT Service Desk.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss)

## Features

- **Role-Based Authentication** — Admin, Manager, and Employee roles via NextAuth.js
- **Employee Management** — CRUD with activation/deactivation, buddy assignments
- **Roster Builder Canvas** — Interactive week × shift grid with dropdown assignments
- **Auto-Schedule Engine** — Randomized fairness-balanced assignment algorithm
- **Excel Import/Export** — Parses the actual Q2 June Duty Roster format
- **Multi-Format Export** — CSV, Excel (.xlsx), and PDF downloads
- **Email Notifications** — Resend-powered shift alerts with React Email templates
- **Analytics Dashboard** — Coverage, workload, weekend equity, and shift heatmap visualizations
- **Settings Panel** — Organization config, shift type CRUD, notification preferences

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Database | SQLite (dev) / PostgreSQL (production-ready) |
| ORM | Prisma |
| Auth | NextAuth.js (Credentials Provider) |
| State | TanStack Query + Zustand |
| Charts | Recharts |
| Email | Resend + React Email |
| Excel | SheetJS (xlsx) |
| PDF | jsPDF + autoTable |

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your DATABASE_URL and NEXTAUTH_SECRET

# Generate Prisma client
npx prisma generate

# Push schema & seed data
npx prisma db push
npx prisma db seed

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with:
- **Admin:** `admin@taylors.edu.my` / `admin123`
- **Manager:** `manager@taylors.edu.my` / `manager123`

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@taylors.edu.my` | `admin123` |
| Manager | `manager@taylors.edu.my` | `manager123` |
| Employee | Any seeded employee email | `employee123` |

## Deployment

### Option A: Vercel + Neon PostgreSQL (Recommended)

1. Switch `prisma/schema.prisma` to `provider = "postgresql"`
2. Create a [Neon](https://neon.tech) database
3. Set `DATABASE_URL` in Vercel environment variables
4. Deploy: `vercel --prod`

### Option B: Render / Railway (Keep SQLite)

1. Push this repo to GitHub
2. Create a new Web Service on [Render](https://render.com)
3. Build command: `npm install && npx prisma generate && npx prisma db push && npm run build`
4. Start command: `npm start`

## Project Structure

```
axiom/
├── app/
│   ├── (auth)/          # Login page
│   ├── (dashboard)/      # Main app pages (rosters, employees, analytics, settings)
│   └── api/              # API routes
├── components/
│   ├── emails/           # React Email templates
│   ├── layout/           # Sidebar, header
│   └── ui/               # shadcn/ui components
├── lib/
│   ├── auth.ts           # NextAuth config
│   └── prisma.ts         # Prisma client
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Seed script
└── types/
    └── next-auth.d.ts    # Auth type extensions
```

## License

MIT — Built for Taylor's University ICT Service Desk.
