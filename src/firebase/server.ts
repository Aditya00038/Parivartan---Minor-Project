// src/firebase/server.ts
import 'server-only';
import { cert, initializeApp, getApp, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseConfig } from './config';

const runtimeProjectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCLOUD_PROJECT ||
  firebaseConfig.projectId;

// Normalize the private key: replace literal \n with real newlines and strip
// surrounding quotes that some env-var editors add.
function parsePrivateKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  return raw.replace(/\\n/g, '\n').replace(/^["']|["']$/g, '').trim();
}

const rawPrivateKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? undefined // handled below via JSON.parse
  : parsePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : {
      projectId: runtimeProjectId,
      privateKey: rawPrivateKey,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };

let adminApp: App;

const hasPlaceholderCredentials =
  String(serviceAccount.clientEmail || '').includes('your-client-email') ||
  String(serviceAccount.privateKey || '').includes('YOUR_PRIVATE_KEY_HERE') ||
  String(serviceAccount.projectId || '').includes('your-project');

// A real PEM key starts with -----BEGIN and must be at least 100 chars.
const isValidPem =
  typeof serviceAccount.privateKey === 'string' &&
  serviceAccount.privateKey.trim().startsWith('-----BEGIN') &&
  serviceAccount.privateKey.length > 100;

if (!getApps().length) {
  const hasExplicitCredentials =
    !!serviceAccount.projectId &&
    !!serviceAccount.clientEmail &&
    isValidPem &&
    !hasPlaceholderCredentials;

  if (!hasExplicitCredentials && process.env.NODE_ENV !== 'production') {
    throw new Error(
      'Firebase Admin credentials are missing for server routes. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY (or FIREBASE_SERVICE_ACCOUNT_KEY JSON).'
    );
  }

  adminApp = initializeApp(
    hasExplicitCredentials
      ? {
          credential: cert({
            projectId: serviceAccount.projectId,
            clientEmail: serviceAccount.clientEmail,
            privateKey: serviceAccount.privateKey,
          }),
        }
      : {
          projectId: runtimeProjectId,
          // Fall back to the hosting/runtime identity when explicit credentials are not set.
          // On Vercel without credentials, Admin SDK features won't work at runtime
          // but the build will succeed.
        }
  );
} else {
  adminApp = getApp();
}

const auth = getAuth(adminApp);
const firestore = getFirestore(adminApp);

export async function getFirebaseAdmin() {
  return { auth, firestore, app: adminApp };
}
