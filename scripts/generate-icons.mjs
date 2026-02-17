import sharp from 'sharp';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// --- SVG Source (512x512 viewBox) ---
// Dark navy background (#1a1b2e) with rounded-square clipping.
// White wallet: body rectangle + flap + clasp circle.
const SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <clipPath id="bg-clip">
      <rect width="512" height="512" rx="112" ry="112"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="512" height="512" rx="112" ry="112" fill="#1a1b2e"/>

  <!-- Wallet body -->
  <rect x="116" y="172" width="280" height="196" rx="24" ry="24" fill="#ffffff"/>

  <!-- Wallet flap -->
  <path d="M116 220 C116 172, 140 148, 188 148 L372 148 C396 148, 396 148, 396 172 L396 220 Z"
        fill="#ffffff"/>

  <!-- Flap fold line (subtle shadow) -->
  <rect x="116" y="216" width="280" height="4" rx="2" fill="#1a1b2e" opacity="0.12"/>

  <!-- Clasp bump (right side) -->
  <rect x="332" y="248" width="64" height="48" rx="12" ry="12" fill="#1a1b2e"/>
  <circle cx="348" cy="272" r="10" fill="#ffffff"/>
</svg>
`;

// --- Output targets ---
const targets = [
  { width: 192,  height: 192,  out: 'apps/web/public/icons/icon-192x192.png' },
  { width: 512,  height: 512,  out: 'apps/web/public/icons/icon-512x512.png' },
  { width: 1024, height: 1024, out: 'apps/mobile/assets/icon.png' },
  { width: 1024, height: 1024, out: 'apps/mobile/assets/adaptive-icon.png' },
  { width: 1024, height: 1024, out: 'apps/mobile/assets/splash-icon.png' },
  { width: 32,   height: 32,   out: 'apps/mobile/assets/favicon.png' },
];

async function generate() {
  const svgBuffer = Buffer.from(SVG);

  for (const { width, height, out } of targets) {
    const outPath = join(ROOT, out);
    await sharp(svgBuffer)
      .resize(width, height)
      .png()
      .toFile(outPath);
    console.log(`\u2713 ${out} (${width}x${height})`);
  }

  console.log('\nDone \u2014 all icons generated.');
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
