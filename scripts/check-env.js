#!/usr/bin/env node

console.log('\n🛣️  PMC Road Damage Reporting System\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const fs = require('fs');
const path = require('path');

// Check if .env exists
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.log('⚠️  .env file missing. Please create one based on .env.example\n');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');

// Check for placeholder values
const hasPlaceholders = envContent.includes('your_gemini_api_key_here') || 
                        envContent.includes('your_firebase_api_key');

if (hasPlaceholders) {
  console.log('⚠️  WARNING: CONFIGURATION INCOMPLETE\n');
  console.log('Your .env file contains placeholder values. Real AI features and Firebase will NOT work.');
  console.log('Please update .env with your real credentials when ready.');
} else {
  console.log('✅ Configuration looks good!');
}

console.log('\nStarting development server...\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
