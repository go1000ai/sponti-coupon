import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

// Run on Vercel Edge Network.
// SECURITY: GHL_API_KEY (a GoHighLevel Private Integration Token) is read from
// server-side env only and used solely in the outbound Authorization header.
// It is NEVER returned to the browser and is never NEXT_PUBLIC-prefixed.
export const runtime = 'edge';

const GHL_BASE = 'https://services.leadconnectorhq.com/voice-ai/agents';
const GHL_VERSION = '2021-07-28';

// GHL agent ids are 24-char hex (Mongo ObjectId). Validate to avoid path injection
// and to stop callers from poking arbitrary upstream paths.
const AGENT_ID_RE = /^[a-f0-9]{24}$/;

// Only these fields may be written to the agent. Anything else in the body is dropped.
const WRITABLE_FIELDS = ['agentPrompt', 'welcomeMessage'] as const;
const MAX_FIELD_LEN = 100_000; // generous ceiling; current prompt is ~24k chars

/**
 * Edge-compatible admin verification.
 * Reads auth cookies directly from the incoming Request (no next/headers).
 */
async function verifyAdminEdge(request: NextRequest): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) return false;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {
        // Read-only in this Edge handler; session refresh is handled by middleware
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profile } = await serviceClient
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return profile?.role === 'admin';
}

/** Returns { apiKey, locationId } or null if the server is misconfigured. */
function ghlConfig(): { apiKey: string; locationId: string } | null {
  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;
  if (!apiKey || !locationId) return null;
  return { apiKey, locationId };
}

function ghlHeaders(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    Version: GHL_VERSION,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

// GET /api/admin/ghl/voice-agent
//   → lists Voice AI agents for the configured location
// GET /api/admin/ghl/voice-agent?agentId=<24hex>
//   → fetches a single agent
export async function GET(request: NextRequest) {
  if (!(await verifyAdminEdge(request))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const cfg = ghlConfig();
  if (!cfg) {
    return NextResponse.json(
      { error: 'GHL_API_KEY / GHL_LOCATION_ID are not configured.' },
      { status: 500 }
    );
  }

  const agentId = new URL(request.url).searchParams.get('agentId');
  if (agentId && !AGENT_ID_RE.test(agentId)) {
    return NextResponse.json({ error: 'Invalid agentId' }, { status: 400 });
  }

  // locationId always comes from server env — never from the client.
  const loc = encodeURIComponent(cfg.locationId);
  const url = agentId
    ? `${GHL_BASE}/${agentId}?locationId=${loc}`
    : `${GHL_BASE}?locationId=${loc}`;

  const res = await fetch(url, { headers: ghlHeaders(cfg.apiKey) });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Surface a status but not the upstream auth details.
    return NextResponse.json(
      { error: 'GHL API error', status: res.status },
      { status: 502 }
    );
  }

  return NextResponse.json(data);
}

// PATCH /api/admin/ghl/voice-agent?agentId=<24hex>
// Body: { agentPrompt?: string, welcomeMessage?: string }
export async function PATCH(request: NextRequest) {
  if (!(await verifyAdminEdge(request))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const cfg = ghlConfig();
  if (!cfg) {
    return NextResponse.json(
      { error: 'GHL_API_KEY / GHL_LOCATION_ID are not configured.' },
      { status: 500 }
    );
  }

  const agentId = new URL(request.url).searchParams.get('agentId');
  if (!agentId || !AGENT_ID_RE.test(agentId)) {
    return NextResponse.json({ error: 'Valid agentId is required' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Body must be an object' }, { status: 400 });
  }

  // Whitelist: copy only writable string fields, enforce length caps.
  const payload: Record<string, string> = {};
  for (const key of WRITABLE_FIELDS) {
    const value = (body as Record<string, unknown>)[key];
    if (value === undefined) continue;
    if (typeof value !== 'string') {
      return NextResponse.json({ error: `${key} must be a string` }, { status: 400 });
    }
    if (value.length > MAX_FIELD_LEN) {
      return NextResponse.json({ error: `${key} exceeds ${MAX_FIELD_LEN} chars` }, { status: 400 });
    }
    payload[key] = value;
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json(
      { error: `Provide at least one writable field: ${WRITABLE_FIELDS.join(', ')}` },
      { status: 400 }
    );
  }

  // locationId goes in the query (GHL rejects it in the body); never client-supplied.
  const loc = encodeURIComponent(cfg.locationId);
  const res = await fetch(`${GHL_BASE}/${agentId}?locationId=${loc}`, {
    method: 'PATCH',
    headers: ghlHeaders(cfg.apiKey),
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return NextResponse.json(
      { error: 'GHL API error', status: res.status },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, agent: data });
}
