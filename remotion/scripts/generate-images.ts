/**
 * Generate lifestyle images for the Tutorial Video via Gemini.
 *
 * Usage:
 *   npx tsx remotion/scripts/generate-images.ts
 */

import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

const IMAGES = [
  {
    name: 'happy-vendor-restaurant',
    prompt:
      'A happy, smiling small business owner standing proudly inside their modern restaurant, warm natural lighting, customers dining in the background, the owner is looking at a tablet showing analytics. Professional commercial photography, vibrant, welcoming atmosphere. No text or logos.',
  },
  {
    name: 'happy-vendor-salon',
    prompt:
      'A confident, cheerful salon owner greeting a customer at the front desk of a modern hair salon, bright and airy space, warm smile, professional setting. High quality lifestyle photography, natural lighting. No text or logos.',
  },
  {
    name: 'customer-phone-deal',
    prompt:
      'A happy young woman sitting at a cafe, looking at her smartphone and smiling excitedly, as if she just found a great deal. Warm coffee shop ambiance, natural daylight, lifestyle photography. No text or logos.',
  },
  {
    name: 'vendor-tablet-dashboard',
    prompt:
      'A small business owner in a casual setting looking at a tablet computer with a bright dashboard interface, smiling with satisfaction. Clean modern environment, warm lighting, professional lifestyle photography. No text or logos.',
  },
  {
    name: 'busy-local-shop',
    prompt:
      'A busy, thriving local boutique shop with happy customers browsing products and a cheerful shop owner assisting them. Warm inviting atmosphere, natural lighting, lifestyle commercial photography showing a successful small business. No text or logos.',
  },
];

async function main() {
  if (!GEMINI_API_KEY) {
    console.error('Missing GEMINI_API_KEY in environment');
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const outDir = path.join(__dirname, '..', 'public', 'images');
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`Generating ${IMAGES.length} images via Gemini...\n`);

  for (const img of IMAGES) {
    try {
      console.log(`  Generating ${img.name}...`);

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: img.prompt,
        config: {
          responseModalities: ['IMAGE'],
        },
      });

      const parts = response.candidates?.[0]?.content?.parts;
      if (!parts) {
        console.error(`  ✗ ${img.name}: No response parts`);
        continue;
      }

      let imageData: string | null = null;
      let mimeType = 'image/png';

      for (const part of parts) {
        if (part.inlineData) {
          imageData = part.inlineData.data as string;
          mimeType = part.inlineData.mimeType || 'image/png';
          break;
        }
      }

      if (!imageData) {
        console.error(`  ✗ ${img.name}: No image data in response`);
        continue;
      }

      const buffer = Buffer.from(imageData, 'base64');
      if (buffer.length < 5000) {
        console.error(`  ✗ ${img.name}: Image too small (${buffer.length} bytes)`);
        continue;
      }

      const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
      const outPath = path.join(outDir, `${img.name}.${ext}`);
      fs.writeFileSync(outPath, buffer);
      console.log(`  ✓ ${img.name}.${ext} (${(buffer.length / 1024).toFixed(0)} KB)`);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${img.name}: ${errMsg}`);
    }
  }

  console.log(`\nDone! Images saved to remotion/public/images/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
