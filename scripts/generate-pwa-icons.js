#!/usr/bin/env node

/**
 * PWA Icon Generator
 * Generates PNG icons from SVG for PWA manifest
 * 
 * Note: This requires sharp package. Install it if needed:
 * npm install sharp --save-dev
 */

const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconDir = path.join(__dirname, '..', 'public', 'icons');
const svgPath = path.join(iconDir, 'icon.svg');

console.log('📱 PWA Icon Generator\n');

// Check if sharp is installed
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('⚠️  Sharp not installed. Please run: npm install sharp --save-dev');
  console.log('   Or manually create PNG icons in public/icons/ directory');
  process.exit(0);
}

// Ensure icons directory exists
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
}

// Generate icons
async function generateIcons() {
  const svgBuffer = fs.readFileSync(svgPath);

  for (const size of sizes) {
    const outputPath = path.join(iconDir, `icon-${size}x${size}.png`);
    
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    
    console.log(`✓ Generated ${size}x${size} icon`);
  }

  console.log('\n✅ All PWA icons generated successfully!');
}

generateIcons().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
