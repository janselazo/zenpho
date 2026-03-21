This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Setup (if `npm` or `bun` not found)

You need **Node.js** (which includes npm) or **Bun** installed and on your PATH.

### Option A: Install Node.js (recommended)

1. **From the website**  
   Download the LTS installer from [nodejs.org](https://nodejs.org/) and run it. This installs both Node.js and npm.

2. **With Homebrew** (if you use it):
   ```bash
   brew install node
   ```

3. **Then in this project:**
   ```bash
   npm install
   npm run dev
   ```

### Option B: Use Bun

If Bun is installed but not on your PATH, add it and use the run script:

```bash
export PATH="$HOME/.bun/bin:$PATH"
./run.sh install   # install dependencies
./run.sh dev       # start dev server
```

### If Bun shows "Integrity check failed for tarball"

This is a known Bun issue with this project’s dependencies. **Use npm to install, then keep using Bun to run:**

1. Install **Node.js** (includes npm) from [nodejs.org](https://nodejs.org) if you don’t have it.
2. In the project folder run:

```bash
npm install
bun run dev
```

After `npm install` once, `bun run dev` will work every time.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Agency CRM (Supabase)

Internal CRM and client portal live alongside the marketing site:

| Path | Purpose |
|------|---------|
| `/login`, `/register`, `/forgot-password` | Supabase Auth |
| `/dashboard`, `/leads`, `/clients`, `/projects`, `/calendar`, `/settings` | Agency app (sidebar) |
| `/portal`, `/portal/projects/[id]` | Client portal (RLS-scoped) |

1. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. Run the SQL in [`supabase/migrations/20250321000000_init_crm.sql`](supabase/migrations/20250321000000_init_crm.sql) in the Supabase SQL editor.
3. See [`supabase/README.md`](supabase/README.md) for roles and client linking.

Without Supabase env vars, CRM routes stay reachable for layout preview; middleware does not enforce login until keys are set.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
