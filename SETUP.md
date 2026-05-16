# 🚀 Parivartan – Complete Setup Guide

> **Pune Municipal Corporation · Smart Civic Complaint Management Platform**  
> Stack: Next.js 14 · Firebase · Gemini AI · Twilio · PWA with Push Notifications

---

## 📋 Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | ≥ 18.17 | Use nvm if needed |
| npm | ≥ 9 | comes with Node |
| Firebase CLI | Latest | `npm i -g firebase-tools` |
| A Firebase project | — | Free Spark or Blaze plan |
| Twilio account | — | Free trial works fine |
| Google AI Studio key | — | For Gemini AI |

---

## 1 · Firebase Project Setup

### 1.1 Create the project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. **Add project** → name it (e.g. `parivartan-pmc`)
3. Enable Google Analytics if you want (optional)

### 1.2 Enable services
| Service | How to enable |
|---------|--------------|
| Authentication | Authentication → Get started → Email/Password → Enable |
| Firestore | Firestore Database → Create database → Start in **production mode** |
| Cloud Messaging | Project Settings → Cloud Messaging → Enable |

### 1.3 Get your config keys

**Client config** (Project Settings → Your Apps → Web App → SDK setup):
```
apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId, measurementId
```

**VAPID key for Push Notifications** (Project Settings → Cloud Messaging → Web Push Certificates):  
Click **Generate key pair** — copy the public key string.

**Service Account** (Project Settings → Service Accounts → Generate new private key):  
Download JSON → extract `project_id`, `client_email`, `private_key`

---

## 2 · Twilio Setup (Free Trial)

1. Sign up at [twilio.com](https://www.twilio.com)
2. Get a free phone number with SMS capability
3. Note: Account SID, Auth Token, Phone Number
4. In trial, you can only send SMS to verified numbers — verify yours first

---

## 3 · Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **Create API Key** → copy it

---

## 4 · Environment Variables

Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in all values. See `.env.example` for a full checklist.

> ⚠️ **NEVER commit `.env.local` to git.** It's already in `.gitignore`.

---

## 5 · Install & Run

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

App starts at **http://localhost:3000**

---

## 6 · Deploy Firestore Rules & Indexes

```bash
# Login to Firebase CLI
firebase login

# Use your project
firebase use your-project-id

# Deploy security rules
firebase deploy --only firestore:rules

# Deploy indexes (important for filter queries)
firebase deploy --only firestore:indexes
```

---

## 7 · Create Your First Users

### Option A – Via the App UI

1. Open http://localhost:3000
2. Go to `/citizen/login` → Register as a citizen
3. Then manually set `role` in Firestore to `official` for SMC officers

### Option B – Via Firebase Console

In Firestore → `users` collection → Add document:

**Citizen:**
```json
{
  "name": "Test Citizen",
  "email": "citizen@example.com",
  "role": "citizen",
  "points": 0,
  "phoneNumber": "+919876543210"
}
```

**SMC Official:**
```json
{
  "name": "SMC Officer",
  "email": "officer@pmc.gov.in",
  "role": "official",
  "points": 0
}
```

**Field Worker:**
```json
{
  "name": "Worker Name",
  "email": "worker@pmc.gov.in",
  "role": "worker",
  "employeeId": "PMC001",
  "department": "Engineering",
  "designation": "Technician",
  "skillType": "Road Repair",
  "points": 0
}
```

> **Important:** The document ID must match the Firebase Auth UID for the user.

---

## 8 · Push Notifications Setup

Push notifications are fully set up — they work automatically once:
1. `NEXT_PUBLIC_FIREBASE_VAPID_KEY` is in your `.env.local`
2. Firebase Cloud Messaging API (V1) is **enabled** in the Firebase Console  
   → Project Settings → Cloud Messaging → Firebase Cloud Messaging API (V1) → Enable

When a citizen opens the app for the first time, a permission prompt appears after 3 seconds.

**What triggers push notifications:**
- 🔍 Complaint moved to "Under Verification"
- 👷 Worker assigned to complaint
- 🔧 Work started ("In Progress")
- ✅ Complaint resolved (with +10 points)
- ❌ Complaint rejected
- 📢 SMC broadcasts (road works, traffic updates)

---

## 9 · App Roles & Access

| Role | Login URL | Can do |
|------|-----------|--------|
| Citizen | `/citizen/login` | Submit reports, track status, rate resolved complaints |
| SMC Official | `/smc/login` | Manage all complaints, assign workers, send notifications |
| Field Worker | `/worker/login` | View assigned tasks, upload before/after proof |

---

## 10 · PWA Installation

The app is a full PWA. On mobile:
- Open in Chrome/Safari → browser shows "Add to Home Screen" prompt
- Or tap the banner that appears in the app

---

## 11 · Key Features Summary

| Feature | Status |
|---------|--------|
| AI damage assessment (Gemini) | ✅ Live |
| Photo capture & compression | ✅ Live |
| GPS location tagging | ✅ Live |
| Real-time Firestore sync | ✅ Live |
| Push notifications (FCM) | ✅ Live |
| SMS notifications (Twilio) | ✅ Live |
| Citizen rating system | ✅ Live |
| Worker before/after proof | ✅ Live |
| SMC analytics dashboard | ✅ Live |
| Complaint heatmap | ✅ Live |
| Reward points system | ✅ Live |
| Multi-language support | ✅ Live |
| Offline support (PWA) | ✅ Live |
| AI chatbot (Roadie) | ✅ Live |

---

## 12 · Free Tier Limits

Everything used is **free** within these limits:

| Service | Free limit | Notes |
|---------|-----------|-------|
| Firebase Auth | 10K/month | More than enough |
| Firestore reads | 50K/day | Plenty for development |
| Firestore writes | 20K/day | Fine for small deployments |
| FCM push | Unlimited | Always free |
| Twilio SMS | ~15 free credits | Enough for testing |
| Gemini API | 15 req/min free | Works fine |
| Next.js (Vercel) | 100GB/month | Free hobby plan |

---

## 13 · Production Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# (same as .env.local values)
```

Or connect your GitHub repo to Vercel for auto-deploy on push.

---

## Troubleshooting

**Push notifications not working?**
- Check VAPID key is set
- Ensure FCM API V1 is enabled in Firebase Console
- Check browser supports push (Chrome/Firefox/Edge — not iOS Safari)

**SMS not sending?**
- Twilio trial requires verified destination numbers
- Check TWILIO_PHONE_NUMBER is in E.164 format: `+1XXXXXXXXXX`

**Firestore permission errors?**
- Run `firebase deploy --only firestore:rules`
- Check your Auth token is valid (re-login)

**AI analysis not working?**
- Verify GEMINI_API_KEY is set and valid
- Check Google AI Studio quota

---

*Built by Team Parivartan · MITAOE · CodeX 2026 #1*
