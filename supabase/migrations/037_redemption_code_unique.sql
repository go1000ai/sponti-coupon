-- Add UNIQUE constraint on claims.redemption_code
-- Prevents two claims from sharing the same 6-digit code,
-- which would cause Supabase .single() to error on lookup.
-- Also adds index for fast lookups by redemption_code.

ALTER TABLE claims
  ADD CONSTRAINT claims_redemption_code_unique UNIQUE (redemption_code);
