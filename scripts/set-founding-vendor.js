// Switch an existing vendor to the FOUNDING15 founding-vendor offer (Business tier, 3 months free).
// Usage:
//   node scripts/set-founding-vendor.js <search>           # dry run: find & preview matching vendor(s)
//   node scripts/set-founding-vendor.js <search> --apply   # apply the update to the single match
// <search> is matched against business_name (ilike) and email (ilike).

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// Load NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local
const envPath = path.join(__dirname, "..", ".env.local");
const env = {};
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

const search = process.argv[2];
const apply = process.argv.includes("--apply");

if (!search) {
  console.error("Provide a search term (business name or email).");
  process.exit(1);
}

(async () => {
  const { data: vendors, error } = await supabase
    .from("vendors")
    .select(
      "id, business_name, email, subscription_tier, subscription_status, promo_code, promo_expires_at"
    )
    .or(`business_name.ilike.%${search}%,email.ilike.%${search}%`);

  if (error) {
    console.error("Query error:", error.message);
    process.exit(1);
  }

  if (!vendors || vendors.length === 0) {
    console.log(`No vendor matched "${search}".`);
    return;
  }

  console.log(`Matched ${vendors.length} vendor(s):`);
  console.table(vendors);

  if (!apply) {
    console.log("\nDry run. Re-run with --apply to update the single match.");
    return;
  }

  if (vendors.length > 1) {
    console.error("\nMore than one match — refine the search before applying.");
    process.exit(1);
  }

  const vendor = vendors[0];
  const expires = new Date();
  expires.setMonth(expires.getMonth() + 3);

  const { data: updated, error: upErr } = await supabase
    .from("vendors")
    .update({
      subscription_tier: "business",
      subscription_status: "active",
      promo_code: "FOUNDING15",
      promo_expires_at: expires.toISOString(),
    })
    .eq("id", vendor.id)
    .select(
      "id, business_name, email, subscription_tier, subscription_status, promo_code, promo_expires_at"
    );

  if (upErr) {
    console.error("Update error:", upErr.message);
    process.exit(1);
  }

  console.log("\nUpdated:");
  console.table(updated);
})();
