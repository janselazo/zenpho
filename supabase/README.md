# Supabase setup (Agency CRM)

1. Create a project at [supabase.com](https://supabase.com).
2. Copy **Project URL** and **anon public** key into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. In the Supabase SQL Editor, run the contents of `migrations/20250321000000_init_crm.sql` (or use the Supabase CLI: `supabase db push` if you link the project).  
   If Supabase warns about **destructive operations**, that’s from `DROP TRIGGER IF EXISTS` and `CREATE OR REPLACE FUNCTION`—intentional so the script can be reapplied safely for the auth trigger; it does not wipe your CRM tables. On a **new** project, proceed. Don’t run the **full** script twice on a DB that already has these tables (you’ll get “already exists” errors).
4. **Auth → URL configuration**: add your local and production site URLs (e.g. `http://127.0.0.1:3000`, `https://yourdomain.com`) to **Redirect URLs**.
5. Optionally disable **Confirm email** for faster local testing (Auth → Providers → Email).

### First user

The first account you register becomes `agency_member` by default. Promote to `agency_admin` in SQL if you like:

```sql
update public.profiles set role = 'agency_admin' where email = 'you@example.com';
```

### Client portal users

1. Create a row in `public.client`.
2. Register the user (or invite via Supabase Auth).
3. Set their profile:

```sql
update public.profiles
set role = 'client', client_id = '<client-uuid>'
where email = 'client@example.com';
```

They can then open `/portal` and see projects for that client.
