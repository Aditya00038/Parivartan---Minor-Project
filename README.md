<div align="center">

# 🌿 Parivartan
### Smart Civic Complaint Management System

**Pune Municipal Corporation · Team Parivartan · MITAOE, Alandi, Pune**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![Firebase](https://img.shields.io/badge/Firebase-11-orange?logo=firebase)](https://firebase.google.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org)
[![Gemini AI](https://img.shields.io/badge/Gemini_AI-1.5_Flash-4285F4?logo=google)](https://ai.google.dev)
[![PWA](https://img.shields.io/badge/PWA-Enabled-blueviolet)](https://web.dev/progressive-web-apps/)

*Connecting Pune citizens with the Municipal Corporation — report, track, resolve.*

</div>

---

## Overview

**Parivartan** (meaning *"change"* in Marathi/Hindi) is a production-grade Progressive Web App for Pune Municipal Corporation. Citizens report civic infrastructure issues with photo evidence and GPS tagging. Google Gemini AI instantly classifies the complaint, suggests a department and priority, and detects duplicate reports. SMC officials and department heads manage the workflow; field workers document resolution with before/after proof. Real-time FCM push notifications keep citizens informed at every step — no native app needed.

```
Citizen submits → AI analyses → Dept assigns worker
    → Worker resolves with proof → Citizen rates → Rewards
```

---

## Portals

| Portal | URL | Role |
|--------|-----|------|
| 🌿 Citizen | `/citizen/login` | `citizen` — register + login |
| 🛡️ SMC Admin | `/smc/login` | `official` / `admin` |
| 🏛️ Department | `/dept/login` | `department_head` |
| 👷 Worker | `/worker/login` | `worker` (logs in with Employee ID) |

---

## Key Features

### Citizen
- **AI-assisted submission** — Gemini 1.5 Flash analyses photo, pre-fills category/severity/department
- **Duplicate detection** — Haversine + text-similarity check warns if a similar complaint exists ≤400m away
- **Real-time tracking** — 5-stage progress bar, activity timeline, before/after photos
- **Push notifications** — FCM browser push at every status change; works with app closed
- **Star rating** — Rate resolution quality after complaint is resolved
- **Leaderboard** — City-wide ranking with podium, tier badges, and reward milestones
- **Roadie AI chatbot** — Civic Q&A in English / Hindi / Marathi

### SMC Admin
- Analytics dashboard: live stats, weekly trend charts, complaint heatmap (Leaflet)
- Full complaint workflow: status, department, worker, broadcast alerts via push + SMS

### Department Head
- Department-filtered queue, priority-sorted
- Inline worker assignment with real-time capacity bars
- Atomic assignment with Firestore transaction (no double-booking)

### Field Worker
- Task list sorted by priority with overdue detection
- Before/after proof upload enforced server-side
- Self-assign open low-priority tasks (race-condition safe)
- Performance page: citizen ratings breakdown + history

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 App Router |
| Language | TypeScript 5 |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Cloud Firestore (real-time) |
| Auth | Firebase Auth (email/password) |
| AI | Google Gemini 1.5 Flash via Genkit |
| Push | Firebase Cloud Messaging (FCM, free) |
| SMS | Twilio Programmable SMS |
| Maps | Leaflet + React-Leaflet |
| Charts | Recharts |

---

## Getting Started

```bash
git clone https://github.com/your-org/parivartan.git
cd parivartan
npm install
cp .env.example .env.local   # fill in all values
npm run dev                   # http://localhost:3000
```

### Firebase bootstrap

```bash
npm install -g firebase-tools
firebase login && firebase use your-project-id
firebase deploy --only firestore:rules,firestore:indexes
npx tsx scripts/seed-firestore.ts
```

---

## Environment Variables

```bash
# Gemini AI
GEMINI_API_KEY=

# Firebase client (NEXT_PUBLIC_ = browser-safe)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# FCM push notifications — Firebase Console > Project Settings
# > Cloud Messaging > Web Push Certificates > Generate key pair
NEXT_PUBLIC_FIREBASE_VAPID_KEY=

# Firebase Admin (server only)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Twilio SMS (server only)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
```

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              PRESENTATION (Next.js 15)               │
│    /citizen/*  /smc/*  /worker/*  /dept/*           │
└────────────────────┬────────────────────────────────┘
                     │ API Routes (Node.js runtime)
┌────────────────────▼────────────────────────────────┐
│         APPLICATION + AI LAYER (Genkit)              │
│  /api/notifications  /api/reports/nearby             │
│  /api/smc  /api/dept  /api/worker                   │
└──────────┬──────────────────────┬───────────────────┘
           │                      │
    ┌──────▼──────┐      ┌────────▼────────┐
    │  Firestore   │      │ FCM + Twilio SMS │
    │  + Auth      │      │ Push & SMS alerts│
    └─────────────┘      └─────────────────┘
```

---

## Duplicate Detection

When GPS is acquired on the report form:

```
score = (distance_weight × 0.5) + (category_match × 0.3) + (text_similarity × 0.2)

≥ 70  →  🔴 Likely duplicate — shows link to existing complaint
45–69 →  🟡 Similar complaint nearby — citizen can still submit
< 45  →  ✅ No warning
```

Submitting is always allowed — multiple reports on the same spot **raise priority automatically**.

---

## Reward Milestones

| Reports Resolved & Verified | Reward |
|-----------------------------|--------|
| 3 | Discount coupon |
| 4 | Free bus/railway pass (1 month) |
| 5 | ₹500 cashback via UPI |
| 6+ | Cash payout (Razorpay) |

---

## Known Issues Fixed

| Issue | Fix |
|-------|-----|
| `FIRESTORE INTERNAL ASSERTION FAILED (ca9)` | `reactStrictMode: false` + FirebaseErrorListener reconnect cycle |
| `Missing permissions: list on /reports` | Explicit `allow read, list: if isAuth()` in firestore.rules |
| Worker login broken import | Replaced `initiateEmailSignIn` with direct `signInWithEmailAndPassword` |
| Worker capacity not tracked | `activeTasks` incremented on accept, decremented on resolve/reject |

---

## Free Tier Summary

| Service | Free limit |
|---------|-----------|
| Firebase Auth | 10,000 MAU/month |
| Firestore reads | 50,000/day |
| Firestore writes | 20,000/day |
| **FCM Push** | **Unlimited — always free** |
| Twilio SMS | ~15 trial credits |
| Gemini API | 15 req/min |
| Vercel | 100 GB/month |

---

## Team

**MIT Academy of Engineering, Alandi, Pune**

| Name | Role |
|------|------|
| Aditya Suryawanshi | Project Lead, Firebase Architecture |
| Vaishnavi Kharpase | Frontend, UI/UX |
| Himanshu Patil | Backend, AI Integration |
| Aaditya Hande | API Development, PWA |
| Sneha Gurav | Database, Documentation |

🥇 Rank #1 — CodeX 2026 · 🏅 Top 5 — RIFT Hackathon · 🌐 Top 12% — GSSoC

---

*MIT License © 2025–2026 Team Parivartan*
