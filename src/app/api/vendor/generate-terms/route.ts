import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { GoogleGenAI } from '@google/genai';
import { rateLimit } from '@/lib/rate-limit';

// POST /api/vendor/generate-terms — AI-assist writing deal terms, how it works, fine print
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { maxRequests: 30, windowMs: 60 * 60 * 1000, identifier: 'ai-generate-terms' });
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
    return NextResponse.json({ error: 'Only vendors and admins can use this' }, { status: 403 });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
  }

  const body = await request.json();
  const { title, description, instruction, field, current_value, vendor_id: bodyVendorId } = body;
  const vendorId = (isAdmin && bodyVendorId) ? bodyVendorId : user.id;

  if (!instruction) {
    return NextResponse.json({ error: 'Tell Ava what you need' }, { status: 400 });
  }

  const { data: vendor } = await serviceClient
    .from('vendors')
    .select('business_name, category, description')
    .eq('id', vendorId)
    .single();

  const fieldLabels: Record<string, string> = {
    how_it_works: 'How It Works',
    terms_and_conditions: 'Terms & Conditions',
    fine_print: 'Fine Print',
  };

  const fieldLabel = fieldLabels[field] || field;

  try {
    const ai = new GoogleGenAI({ apiKey: geminiKey });

    const prompt = `You are Ava, a helpful deal copywriter for SpontiCoupon, a local deals marketplace. A vendor needs help writing the "${fieldLabel}" section of their deal listing.

Deal info:
- Title: ${title || 'N/A'}
- Description: ${description || 'N/A'}
- Business: ${vendor?.business_name || 'N/A'}
- Category: ${vendor?.category || 'N/A'}

Current "${fieldLabel}" text: ${current_value || '(empty)'}

The vendor says: "${instruction}"

${field === 'how_it_works' ? `Write clear, numbered steps explaining how a customer uses this deal. Keep it simple — assume the customer has never used a deal platform before. Use 3-5 steps.` : ''}
${field === 'terms_and_conditions' ? `Write fair, clear terms and conditions for this deal. Include relevant restrictions (expiration, one per customer, etc.) but keep it readable — no dense legal jargon. Use bullet points or short paragraphs.` : ''}
${field === 'fine_print' ? `Write concise fine print disclosures. Include any limitations, exclusions, or important details the customer should know. Keep it brief and honest.` : ''}

If the current text exists and the vendor wants to edit it, modify the existing text based on their instruction. If starting fresh, write new content.

Return ONLY the text content — no JSON, no markdown formatting, no field labels. Just the ready-to-use text.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text?.trim() || '';
    if (!text) {
      return NextResponse.json({ error: 'Ava could not generate text' }, { status: 500 });
    }

    return NextResponse.json({ text, field });
  } catch (err) {
    console.error('Terms generation error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to generate: ${errorMessage}` },
      { status: 500 }
    );
  }
}
