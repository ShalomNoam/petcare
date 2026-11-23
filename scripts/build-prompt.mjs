// Turns supabase/functions/vet-chat/system-prompt.md into a TS module the
// Edge Function can import (so the readable .md stays the source of truth).
//   node scripts/build-prompt.mjs           → write the generated file
//   node scripts/build-prompt.mjs --check   → fail if it is out of date
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'supabase/functions/vet-chat/system-prompt.md');
const out = join(root, 'supabase/functions/_shared/system-prompt.generated.ts');

const md = readFileSync(src, 'utf8');
// Drop the editor note (blockquote lines) – it is for humans, not for the model.
const prompt = md
  .split('\n')
  .filter((line) => !line.startsWith('>'))
  .join('\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

const content = `// GENERATED from vet-chat/system-prompt.md by scripts/build-prompt.mjs – do not edit by hand.\nexport const SYSTEM_PROMPT = ${JSON.stringify(prompt)};\n`;

if (process.argv.includes('--check')) {
  if (!existsSync(out) || readFileSync(out, 'utf8') !== content) {
    console.error('system-prompt.generated.ts is out of date. Run: npm run build:prompt');
    process.exit(1);
  }
  console.log('system prompt is up to date');
} else {
  writeFileSync(out, content);
  console.log(`wrote ${out}`);
}
