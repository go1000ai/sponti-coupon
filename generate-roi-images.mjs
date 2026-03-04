import { writeFileSync } from 'fs';

const key = 'AIzaSyCfuj1s41McDb3wwNpsABqCKR8-HeyPqOg';

async function generate(prompt, filename) {
  console.log(`Generating ${filename}...`);
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-ultra-generate-001:predict?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1, aspectRatio: '1:1' }
      })
    }
  );
  const data = await res.json();
  if (!res.ok) {
    console.error(`Error for ${filename}:`, JSON.stringify(data, null, 2));
    return false;
  }
  const b64 = data.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) {
    console.error(`No image data for ${filename}:`, JSON.stringify(data, null, 2));
    return false;
  }
  writeFileSync(`public/${filename}`, Buffer.from(b64, 'base64'));
  console.log(`Saved public/${filename}`);
  return true;
}

await generate(
  'Professional DSLR photograph of a real person, a stressed business owner in their 30s sitting at a modern desk, head resting in hands, staring down at an open laptop with a worried expression. Shot on Canon EOS R5, 85mm lens, f/2.0 aperture, natural window light, bokeh background, ultra photorealistic, hyperrealistic, 8K resolution. NOT a cartoon, NOT an illustration, NOT animated.',
  'roi-before.png'
);

await generate(
  'Professional DSLR photograph of a real person, a happy business owner in their 30s sitting at a modern desk, big genuine smile, one fist raised in celebration, looking at an open laptop. Shot on Canon EOS R5, 85mm lens, f/2.0 aperture, warm natural light, bokeh background, ultra photorealistic, hyperrealistic, 8K resolution. NOT a cartoon, NOT an illustration, NOT animated.',
  'roi-after.png'
);
