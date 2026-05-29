-- Event-level idempotency table for webhook handlers (Stripe, Stripe Connect, PayPal,
-- Square, etc.). Webhook providers retry deliveries — without dedupe, side effects like
-- "generate redemption code", "increment claims count", and "send email" can fire multiple
-- times for a single payment.

create table if not exists webhook_events (
  provider text not null,
  event_id text not null,
  processed_at timestamptz not null default now(),
  primary key (provider, event_id)
);

alter table webhook_events enable row level security;
-- Service role only — webhook handlers run with service role.
