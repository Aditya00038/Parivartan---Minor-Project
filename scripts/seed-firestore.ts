/**
 * Firestore Seed Script
 * Run: npx ts-node --project tsconfig.seed.json scripts/seed-firestore.ts
 *
 * Or set env vars manually and run with:
 *   FIREBASE_PROJECT_ID=xxx FIREBASE_CLIENT_EMAIL=xxx FIREBASE_PRIVATE_KEY=xxx \
 *   npx tsx scripts/seed-firestore.ts
 */

import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID!,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')!,
};

const app = getApps().length
  ? getApp()
  : initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore(app);

const DEPARTMENTS = [
  { name: 'Engineering', description: 'Roads, bridges, and infrastructure', color: '#f97316' },
  { name: 'Sanitation', description: 'Garbage collection and cleanliness', color: '#10b981' },
  { name: 'Electrical', description: 'Streetlights and electrical systems', color: '#f59e0b' },
  { name: 'Water Supply', description: 'Water pipes, sewage and drainage', color: '#3b82f6' },
  { name: 'Parks & Environment', description: 'Parks, trees and green spaces', color: '#22c55e' },
  { name: 'Traffic & Roads', description: 'Traffic signals and road markings', color: '#8b5cf6' },
  { name: 'Public Works', description: 'General public infrastructure', color: '#ec4899' },
];

const SETTINGS = {
  autoAssignEnabled: true,
  autoAssignStrategy: 'least_busy',
  maxKmRadius: 5,
  slaHours: {
    Critical: 4,
    High: 24,
    Medium: 48,
    Low: 72,
  },
  rewardMilestones: [
    { reports: 3, reward: 'Free Bus Pass (1 month)' },
    { reports: 5, reward: '₹500 Cashback on Paytm' },
    { reports: 10, reward: 'Free Railway Pass (1 month)' },
  ],
  city: 'Pune',
  organization: 'Pune Municipal Corporation',
};

async function seed() {
  console.log('🌱 Seeding Firestore...\n');

  // Seed departments
  const depBatch = db.batch();
  for (const dept of DEPARTMENTS) {
    const ref = db.collection('departments').doc(dept.name.replace(/\s+/g, '-').toLowerCase());
    depBatch.set(ref, { ...dept, createdAt: new Date().toISOString() }, { merge: true });
    console.log(`  ✓ Department: ${dept.name}`);
  }
  await depBatch.commit();

  // Seed settings
  await db.collection('settings').doc('global').set(
    { ...SETTINGS, updatedAt: new Date().toISOString() },
    { merge: true }
  );
  console.log('  ✓ Global settings');

  console.log('\n✅ Seed complete!');
  console.log('\nNext steps:');
  console.log('  1. Register users via the app (/citizen/login, /smc/login, /worker/login)');
  console.log('  2. In Firestore, set their "role" field to: citizen | official | worker | department_head');
  console.log('  3. For workers, also set: department, employeeId, designation, skillType');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
