const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const client = createClient(
  "https://ypoytvqxuxpjipcyaxwg.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlwb3l0dnF4dXhwamlwY3lheHdnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTczMDIzNCwiZXhwIjoyMDg3MzA2MjM0fQ.JirU-ZDRz-31pC2rW2aFT7bzdl2IyC3PDOdLVl_VE88"
);

const vendorId = "ff2d265f-52cb-4fcb-81c9-25bfa226dea2";

const customerIds = [
  "9b3449da-c240-4763-9d21-5d77ae354a12",
  "a3a3d030-41e7-4984-94b0-1846dabb3578",
  "054826dc-5082-46ec-82c0-6a0bc0ec10ae",
  "7290e1c7-f366-4769-b320-979f7f73dcb0",
  "711b35de-4bc3-4e9f-aa26-dcbafc2ed12a",
];

function randomDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysAgo));
  d.setHours(Math.floor(Math.random() * 14) + 8);
  d.setMinutes(Math.floor(Math.random() * 60));
  return d;
}

function randomCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function randomSessionToken() {
  return crypto.randomBytes(24).toString("hex");
}

async function run() {
  const { data: deals } = await client
    .from("deals")
    .select("id, title, deal_price, deal_type, status, expires_at")
    .eq("vendor_id", vendorId)
    .in("status", ["active", "expired"]);

  console.log("Seeding data for", deals.length, "deals...\n");

  let claimsInserted = 0;
  let redemptionsInserted = 0;

  for (const deal of deals) {
    const numClaims = 5 + Math.floor(Math.random() * 11);

    for (let i = 0; i < numClaims; i++) {
      const custIdx = i % customerIds.length;
      const createdAt = randomDate(30);
      const expiresAt = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);

      const redeemed = Math.random() < 0.7;
      const redeemedAt = redeemed
        ? new Date(createdAt.getTime() + (1 + Math.random() * 3) * 24 * 60 * 60 * 1000)
        : null;

      const isSponti = deal.deal_type === "sponti_coupon";

      const claim = {
        customer_id: customerIds[custIdx],
        deal_id: deal.id,
        session_token: randomSessionToken(),
        deposit_confirmed: isSponti,
        deposit_confirmed_at: isSponti ? new Date(createdAt.getTime() + 5 * 60 * 1000).toISOString() : null,
        qr_code: crypto.randomBytes(16).toString("hex"),
        redemption_code: randomCode(),
        redeemed: redeemed,
        redeemed_at: redeemedAt ? redeemedAt.toISOString() : null,
        expires_at: expiresAt.toISOString(),
        created_at: createdAt.toISOString(),
        review_request_sent_at: redeemed && Math.random() < 0.5
          ? new Date(redeemedAt.getTime() + 25 * 60 * 60 * 1000).toISOString()
          : null,
      };

      const { data: inserted, error } = await client.from("claims").insert(claim).select("id");
      if (error) {
        if (error.message.includes("duplicate")) continue;
        console.log("  Claim error:", error.message);
        continue;
      }

      claimsInserted++;

      if (redeemed && inserted && inserted[0]) {
        const { error: redemptionErr } = await client.from("redemptions").insert({
          claim_id: inserted[0].id,
          deal_id: deal.id,
          vendor_id: vendorId,
          customer_id: customerIds[custIdx],
          scanned_by: vendorId,
          scanned_at: redeemedAt.toISOString(),
        });
        if (redemptionErr) {
          console.log("  Redemption error:", redemptionErr.message);
        } else {
          redemptionsInserted++;
        }
      }
    }
    console.log("  Done:", deal.title.substring(0, 45));
  }

  console.log("\n=== SUMMARY ===");
  console.log("Claims inserted:", claimsInserted);
  console.log("Redemptions inserted:", redemptionsInserted);

  const { count: totalReviews } = await client.from("reviews").select("id", { count: "exact", head: true }).eq("vendor_id", vendorId);
  console.log("Reviews:", totalReviews);
  for (let r = 5; r >= 1; r--) {
    const { count } = await client.from("reviews").select("id", { count: "exact", head: true }).eq("vendor_id", vendorId).eq("rating", r);
    console.log("  " + r + " stars:", count);
  }
}

run().catch(console.error);
