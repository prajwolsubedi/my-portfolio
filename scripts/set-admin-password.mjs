// Sets/rotates the admin login password. Hashes it with bcrypt and writes
// the hash to Firestore (admin_config/main) — the plain password is never
// stored anywhere.
//
// Usage: node --env-file=.env.local scripts/set-admin-password.mjs "new-password"

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import bcrypt from "bcryptjs";

const password = process.argv[2];

if (!password) {
  console.error('Usage: node --env-file=.env.local scripts/set-admin-password.mjs "new-password"');
  process.exit(1);
}

const requiredVars = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
];
const missing = requiredVars.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing env vars: ${missing.join(", ")}`);
  console.error("Run with: node --env-file=.env.local scripts/set-admin-password.mjs \"password\"");
  process.exit(1);
}

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});
const db = getFirestore(app);

const passwordHash = bcrypt.hashSync(password, 12);

await setDoc(doc(db, "admin_config", "main"), {
  passwordHash,
  updatedAt: Date.now(),
});

console.log("Admin password updated.");
process.exit(0);
