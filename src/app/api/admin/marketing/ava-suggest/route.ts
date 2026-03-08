import { NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';

export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const now = new Date();
    const dayName = dayNames[now.getDay()];
    const hour = now.getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are Ava, the AI marketing strategist for SpontiCoupon — a deal marketplace for local businesses launching in Orlando, FL.

CONTEXT:
- Today is ${dayName} ${timeOfDay}
- SpontiCoupon helps local businesses (restaurants, salons, auto shops) attract customers with flash deals and ongoing deals
- Vendors pay $49-$499/month; customers claim deals for free
- Website: sponticoupon.com
- Current campaign: Founders 20 (first 20 vendors get lifetime discount)
- Goal: Get more VENDORS to sign up and more CUSTOMERS to use the platform

As a social media marketing expert, suggest 4 posts for today. Mix vendor-targeting and customer-targeting posts. For each, provide:
1. type: one of "hook", "engagement", "social_proof", "urgency", "educational", "behind_scenes"
2. idea: A specific, detailed description of what to post (2-3 sentences)
3. why: Why this type of post works right now (1 sentence marketing strategy)
4. hook: The opening line/hook that grabs attention (the first words people see)

Return as JSON array:
[{"type":"...","idea":"...","why":"...","hook":"..."}]

RULES:
- Be specific to SpontiCoupon, not generic marketing advice
- Each suggestion should be different in tone and target audience
- Include at least one vendor-targeted and one customer-targeted suggestion
- Consider the day and time — ${dayName} ${timeOfDay} posting patterns
- Think about what drives engagement: questions, urgency, social proof, behind-the-scenes
- NEVER suggest anything with purple/violet

Return ONLY valid JSON, no markdown.`,
    });

    const text = (result.text || '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    try {
      const suggestions = JSON.parse(text);
      return NextResponse.json({ suggestions });
    } catch {
      return NextResponse.json({ suggestions: [] });
    }
  } catch (err) {
    console.error('Ava suggest error:', err);
    return NextResponse.json({ suggestions: [] });
  }
}
