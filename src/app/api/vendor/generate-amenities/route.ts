import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { GoogleGenAI } from '@google/genai';
import { rateLimit } from '@/lib/rate-limit';

// POST /api/vendor/generate-amenities — AI-suggest amenities & highlights for a deal
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { maxRequests: 30, windowMs: 60 * 60 * 1000, identifier: 'ai-generate-amenities' });
  if (limited) return limited;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = await createServiceRoleClient();

  const { data: profile } = await serviceClient
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin';
  if (profile?.role !== 'vendor' && !isAdmin) {
    return NextResponse.json({ error: 'Only vendors and admins can generate amenities' }, { status: 403 });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
  }

  const body = await request.json();
  const { title, description, category, existing_amenities, existing_highlights, vendor_id: bodyVendorId } = body;
  const vendorId = (isAdmin && bodyVendorId) ? bodyVendorId : user.id;

  const { data: vendor } = await serviceClient
    .from('vendors')
    .select('business_name, category, description, city, state')
    .eq('id', vendorId)
    .single();

  if (!title) {
    return NextResponse.json({ error: 'Deal title is required' }, { status: 400 });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: geminiKey });

    const prompt = `You are a marketing expert for a local deals platform. Suggest amenities/features and highlights for this deal.

Deal info:
- Title: ${title}
- Description: ${description || 'N/A'}
- Business: ${vendor?.business_name || 'N/A'}
- Category: ${category || vendor?.category || 'N/A'}
- Location: ${vendor?.city || ''} ${vendor?.state || ''}

Already selected amenities: ${(existing_amenities || []).join(', ') || 'None'}
Already selected highlights: ${(existing_highlights || []).join(', ') || 'None'}

Generate NEW suggestions that are NOT already selected. Return a JSON object with two arrays:

1. "amenities" — 8-12 relevant features/perks/amenities for this type of business/deal (e.g., Free WiFi, Parking Available, Wheelchair Accessible, Appointment Required, Walk-Ins Welcome, etc.)
2. "highlights" — 5-8 compelling deal highlights that would make customers want to claim this deal (e.g., "Save 40% on premium service", "Rated #1 in the area", etc.)

Return ONLY valid JSON like: {"amenities":["..."],"highlights":["..."]}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text?.trim() || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    const result = JSON.parse(jsonMatch[0]);
    const amenities: string[] = (result.amenities || [])
      .map((a: string) => a.trim())
      .filter((a: string) => a.length > 0 && a.length <= 80)
      .filter((a: string) => !(existing_amenities || []).includes(a))
      .slice(0, 15);

    const highlights: string[] = (result.highlights || [])
      .map((h: string) => h.trim())
      .filter((h: string) => h.length > 0 && h.length <= 120)
      .filter((h: string) => !(existing_highlights || []).includes(h))
      .slice(0, 10);

    return NextResponse.json({ amenities, highlights });
  } catch (err) {
    console.error('Amenity generation error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to generate suggestions: ${errorMessage}` },
      { status: 500 }
    );
  }
}
