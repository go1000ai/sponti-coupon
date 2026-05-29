-- Cross-instance rate limiting for serverless functions.
-- The in-memory Map in src/lib/rate-limit.ts only limits requests landing on the same Vercel
-- instance — security-critical endpoints (login, forgot-password, public lookups) need a
-- shared backing store so limits hold regardless of which instance handles the request.

create table if not exists rate_limit_buckets (
  bucket_key text primary key,
  count integer not null default 0,
  reset_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_buckets_reset_at_idx on rate_limit_buckets(reset_at);

-- Atomic increment + expiry-aware reset, returns the post-increment count.
create or replace function rl_increment(p_key text, p_window_ms integer)
returns integer
language plpgsql
as $$
declare
  v_now timestamptz := now();
  v_count integer;
begin
  insert into rate_limit_buckets(bucket_key, count, reset_at)
  values (p_key, 1, v_now + (p_window_ms || ' milliseconds')::interval)
  on conflict (bucket_key) do update
    set
      count = case
        when rate_limit_buckets.reset_at <= v_now then 1
        else rate_limit_buckets.count + 1
      end,
      reset_at = case
        when rate_limit_buckets.reset_at <= v_now then v_now + (p_window_ms || ' milliseconds')::interval
        else rate_limit_buckets.reset_at
      end
  returning count into v_count;
  return v_count;
end;
$$;

-- RLS: only service-role can read/write. No anon/authed access — rate-limit state is
-- never user-facing.
alter table rate_limit_buckets enable row level security;
