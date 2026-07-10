-- Row Level Security for the shared leaderboard project (COTE + MathSprint).
--
-- Model: leaderboards are PUBLIC to read (the games fetch them directly with the
-- anon key), but NO ONE may write with the anon key. All inserts/updates/deletes
-- go through the `submit-score` Edge Function, which uses the service-role key and
-- therefore bypasses RLS. This closes the "anyone can wipe/overwrite rows" hole
-- without changing how the boards display or losing any existing data.
--
-- Applied via the Supabase Management API (see deploy notes). Idempotent.

-- Enable RLS (denies everything by default until policies are added).
alter table public."COTE"  enable row level security;
alter table public.scores  enable row level security;

-- Public read access (leaderboards are meant to be seen by everyone).
drop policy if exists "public read COTE"   on public."COTE";
drop policy if exists "public read scores" on public.scores;

create policy "public read COTE"
  on public."COTE" for select
  to anon, authenticated
  using (true);

create policy "public read scores"
  on public.scores for select
  to anon, authenticated
  using (true);

-- No insert / update / delete policies for anon or authenticated roles.
-- Without a matching policy, RLS denies those operations. The service-role key
-- used by the Edge Function is exempt from RLS, so legitimate writes still work.

-- Defensive cleanup: drop any pre-existing permissive write policies if present.
do $$
declare p record;
begin
  for p in
    select schemaname, tablename, policyname, cmd
    from pg_policies
    where schemaname = 'public'
      and tablename in ('COTE', 'scores')
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  loop
    execute format('drop policy if exists %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;
