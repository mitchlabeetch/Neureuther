import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DIR = path.resolve(__dirname, '../public');
const ICONS_DIR = path.resolve(PUBLIC_DIR, 'icons');

// Ensure output directories exist
await fs.mkdir(ICONS_DIR, { recursive: true });

const FAVICON_SVG = path.resolve(ICONS_DIR, 'icon-favicon.svg');
const IOS_SVG = path.resolve(ICONS_DIR, 'icon-ios.svg');
const BASE_SVG = path.resolve(ICONS_DIR, 'neureuther-icon-base.svg');

/**
 * Generate PNG from SVG at given sizes
 */
async function generatePng(inputSvg, outputPath, size) {
  await sharp(inputSvg)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
  console.log(`Generated: ${outputPath} (${size}x${size})`);
}

/**
 * Generate splash screen: full background color with centered icon
 * Supports both portrait and landscape orientations
 */
async function generateSplashScreen(inputSvg, outputPath, width, height, iconSize, bgColor) {
  const background = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: bgColor,
    },
  }).png().toBuffer();

  const iconBuffer = await sharp(inputSvg)
    .resize(iconSize, iconSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const offsetX = Math.round((width - iconSize) / 2);
  const offsetY = Math.round((height - iconSize) / 2);
  await sharp(background)
    .composite([{
      input: iconBuffer,
      left: offsetX,
      top: offsetY,
    }])
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
  console.log(`Generated: ${outputPath} (${width}x${height})`);
}

/**
 * Generate multi-resolution ICO from 16x16 and 32x32 PNGs
 */
async function generateIco(png16, png32, outputPath) {
  // Use sharp to create a multi-resolution ICO
  // ICO format: combine PNGs at different sizes
  // We'll use the 32x32 as the primary and embed 16x16
  const buf16 = await fs.readFile(png16);
  const buf32 = await fs.readFile(png32);

  // Build ICO header
  // ICONDIR structure
  const iconDir = Buffer.alloc(6);
  iconDir.writeUInt16LE(0, 0);      // Reserved
  iconDir.writeUInt16LE(1, 2);      // Type: 1 = ICO
  iconDir.writeUInt16LE(2, 4);      // Count: 2 images

  // ICONDIRENTRY for 16x16
  const entry16 = Buffer.alloc(16);
  entry16.writeUInt8(16, 0);        // Width
  entry16.writeUInt8(16, 1);        // Height
  entry16.writeUInt8(0, 2);         // Colors (0 = >256)
  entry16.writeUInt8(0, 3);         // Reserved
  entry16.writeUInt16LE(1, 4);      // Color planes
  entry16.writeUInt16LE(32, 6);     // Bits per pixel
  entry16.writeUInt32LE(buf16.length, 8);   // Size
  entry16.writeUInt32LE(22 + 16, 12);      // Offset (after header + first entry)

  // ICONDIRENTRY for 32x32
  const entry32 = Buffer.alloc(16);
  entry32.writeUInt8(32, 0);        // Width
  entry32.writeUInt8(32, 1);        // Height
  entry32.writeUInt8(0, 2);         // Colors (0 = >256)
  entry32.writeUInt8(0, 3);         // Reserved
  entry32.writeUInt16LE(1, 4);      // Color planes
  entry32.writeUInt16LE(32, 6);     // Bits per pixel
  entry32.writeUInt32LE(buf32.length, 8);   // Size
  entry32.writeUInt32LE(22 + 16 + 16, 12); // Offset

  const ico = Buffer.concat([iconDir, entry16, entry32, buf16, buf32]);
  await fs.writeFile(outputPath, ico);
  console.log(`Generated: ${outputPath} (16x16 + 32x32)`);
}

// === FAVICON PNGS ===
await generatePng(FAVICON_SVG, path.resolve(PUBLIC_DIR, 'favicon-16x16.png'), 16);
await generatePng(FAVICON_SVG, path.resolve(PUBLIC_DIR, 'favicon-32x32.png'), 32);

// === FAVICON ICO ===
await generateIco(
  path.resolve(PUBLIC_DIR, 'favicon-16x16.png'),
  path.resolve(PUBLIC_DIR, 'favicon-32x32.png'),
  path.resolve(PUBLIC_DIR, 'favicon.ico')
);

// === iOS APP ICON (180x180 @3x for iPhone, 120x120 @2x) ===
await generatePng(IOS_SVG, path.resolve(ICONS_DIR, 'icon-180.png'), 180);
await generatePng(IOS_SVG, path.resolve(ICONS_DIR, 'icon-120.png'), 120);
await generatePng(IOS_SVG, path.resolve(ICONS_DIR, 'icon-167.png'), 167); // iPad Pro

// === PWA ICONS ===
await generatePng(IOS_SVG, path.resolve(ICONS_DIR, 'icon-192.png'), 192);
await generatePng(IOS_SVG, path.resolve(ICONS_DIR, 'icon-512.png'), 512);

// === SPLASH SCREEN (2732x2732, solid #FDA172 background, centered house) ===
await generateSplashScreen(
  BASE_SVG,
  path.resolve(ICONS_DIR, 'splash-2732.png'),
  2732, 2732,
  1200, // Icon size centered
  { r: 0xFD, g: 0xA1, b: 0x72, alpha: 1 }
);

// === APPLE SPLASH SCREENS (common device sizes) ===
// iPhone 14 Pro Max / 15 Pro Max
await generateSplashScreen(BASE_SVG, path.resolve(ICONS_DIR, 'splash-1290x2796.png'), 1290, 2796, 560, { r: 0xFD, g: 0xA1, b: 0x72, alpha: 1 });
await generateSplashScreen(BASE_SVG, path.resolve(ICONS_DIR, 'splash-2796x1290.png'), 2796, 1290, 560, { r: 0xFD, g: 0xA1, b: 0x72, alpha: 1 });
// iPhone 14 Pro / 15 Pro
await generateSplashScreen(BASE_SVG, path.resolve(ICONS_DIR, 'splash-1179x2556.png'), 1179, 2556, 510, { r: 0xFD, g: 0xA1, b: 0x72, alpha: 1 });
await generateSplashScreen(BASE_SVG, path.resolve(ICONS_DIR, 'splash-2556x1179.png'), 2556, 1179, 510, { r: 0xFD, g: 0xA1, b: 0x72, alpha: 1 });
// iPhone 14 / 15
await generateSplashScreen(BASE_SVG, path.resolve(ICONS_DIR, 'splash-1170x2532.png'), 1170, 2532, 510, { r: 0xFD, g: 0xA1, b: 0x72, alpha: 1 });
await generateSplashScreen(BASE_SVG, path.resolve(ICONS_DIR, 'splash-2532x1170.png'), 2532, 1170, 510, { r: 0xFD, g: 0xA1, b: 0x72, alpha: 1 });
// iPhone 13 / 13 Pro / 14
await generateSplashScreen(BASE_SVG, path.resolve(ICONS_DIR, 'splash-1284x2778.png'), 1284, 2778, 550, { r: 0xFD, g: 0xA1, b: 0x72, alpha: 1 });
await generateSplashScreen(BASE_SVG, path.resolve(ICONS_DIR, 'splash-2778x1284.png'), 2778, 1284, 550, { r: 0xFD, g: 0xA1, b: 0x72, alpha: 1 });
// iPhone 12 / 12 Pro (already done above with same size)
// iPhone 12 mini / 13 mini
await generateSplashScreen(BASE_SVG, path.resolve(ICONS_DIR, 'splash-1080x2340.png'), 1080, 2340, 470, { r: 0xFD, g: 0xA1, b: 0x72, alpha: 1 });
await generateSplashScreen(BASE_SVG, path.resolve(ICONS_DIR, 'splash-2340x1080.png'), 2340, 1080, 470, { r: 0xFD, g: 0xA1, b: 0x72, alpha: 1 });
// iPhone SE / 8 / 7 / 6s
await generateSplashScreen(BASE_SVG, path.resolve(ICONS_DIR, 'splash-750x1334.png'), 750, 1334, 320, { r: 0xFD, g: 0xA1, b: 0x72, alpha: 1 });
await generateSplashScreen(BASE_SVG, path.resolve(ICONS_DIR, 'splash-1334x750.png'), 1334, 750, 320, { r: 0xFD, g: 0xA1, b: 0x72, alpha: 1 });
// iPad Pro 12.9"
await generateSplashScreen(BASE_SVG, path.resolve(ICONS_DIR, 'splash-2048x2732.png'), 2048, 2732, 900, { r: 0xFD, g: 0xA1, b: 0x72, alpha: 1 });
await generateSplashScreen(BASE_SVG, path.resolve(ICONS_DIR, 'splash-2732x2048.png'), 2732, 2048, 900, { r: 0xFD, g: 0xA1, b: 0x72, alpha: 1 });
// iPad Pro 11" / Air
await generateSplashScreen(BASE_SVG, path.resolve(ICONS_DIR, 'splash-1668x2388.png'), 1668, 2388, 730, { r: 0xFD, g: 0xA1, b: 0x72, alpha: 1 });
await generateSplashScreen(BASE_SVG, path.resolve(ICONS_DIR, 'splash-2388x1668.png'), 2388, 1668, 730, { r: 0xFD, g: 0xA1, b: 0x72, alpha: 1 });
// iPad mini
await generateSplashScreen(BASE_SVG, path.resolve(ICONS_DIR, 'splash-1536x2048.png'), 1536, 2048, 670, { r: 0xFD, g: 0xA1, b: 0x72, alpha: 1 });
await generateSplashScreen(BASE_SVG, path.resolve(ICONS_DIR, 'splash-2048x1536.png'), 2048, 1536, 670, { r: 0xFD, g: 0xA1, b: 0x72, alpha: 1 });

console.log('\nAll icons generated successfully!');