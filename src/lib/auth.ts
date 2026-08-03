import { cookies } from "next/headers";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { doc, getDoc, setDoc, deleteDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "./firebase";
import { ADMIN_HINT_COOKIE } from "./authHint";

const SESSION_COOKIE = "blog_admin_session";
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

const OTP_COOKIE = "blog_otp_challenge";
const OTP_TTL = 5 * 60 * 1000; // 5 minutes
const OTP_MAX_ATTEMPTS = 5;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return secret;
}

function sign(value: string): string {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// ---- Password (bcrypt hash stored in Firestore, not env — rotate with
// `node --env-file=.env.local scripts/set-admin-password.mjs "new-password"`) ----

export async function verifyPassword(password: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "admin_config", "main"));
  if (!snap.exists()) return false;

  const { passwordHash } = snap.data() as { passwordHash?: string };
  if (!passwordHash) return false;

  return bcrypt.compare(password, passwordHash);
}

// ---- Session (HMAC-signed, unforgeable without SESSION_SECRET) ----

export async function createSession(): Promise<void> {
  const timestamp = Date.now().toString();
  const token = `${timestamp}.${sign(timestamp)}`;
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION / 1000,
    path: "/",
  });

  // Readable twin of the session, so the public post page can tell whether an
  // auth check is worth making. Deliberately not httpOnly — it's a hint, not a
  // credential, and every authorization decision still reads SESSION_COOKIE.
  cookieStore.set(ADMIN_HINT_COOKIE, "1", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION / 1000,
    path: "/",
  });
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return false;

  const [timestampStr, signature] = token.split(".");
  if (!timestampStr || !signature || !safeEqual(signature, sign(timestampStr))) return false;

  const timestamp = parseInt(timestampStr, 10);
  if (!Number.isFinite(timestamp)) return false;

  return Date.now() - timestamp < SESSION_DURATION;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(ADMIN_HINT_COOKIE);
}

// ---- Email OTP challenge (second factor after password) ----

function generateOtp(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function hashOtp(code: string, challengeId: string): string {
  return crypto.createHmac("sha256", getSecret()).update(`${challengeId}:${code}`).digest("hex");
}

export async function createOtpChallenge(): Promise<string> {
  const challengeId = crypto.randomBytes(16).toString("hex");
  const code = generateOtp();

  await setDoc(doc(db, "otp_codes", challengeId), {
    codeHash: hashOtp(code, challengeId),
    expiresAt: Date.now() + OTP_TTL,
    attempts: 0,
  });

  const cookieStore = await cookies();
  const token = `${challengeId}.${sign(challengeId)}`;
  cookieStore.set(OTP_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: OTP_TTL / 1000,
    path: "/",
  });

  return code;
}

export async function verifyOtp(code: string): Promise<{ ok: boolean; error?: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get(OTP_COOKIE)?.value;
  if (!token) return { ok: false, error: "No pending login. Please start over." };

  const [challengeId, signature] = token.split(".");
  if (!challengeId || !signature || !safeEqual(signature, sign(challengeId))) {
    return { ok: false, error: "Invalid session. Please start over." };
  }

  const ref = doc(db, "otp_codes", challengeId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    cookieStore.delete(OTP_COOKIE);
    return { ok: false, error: "Code expired. Please start over." };
  }

  const data = snap.data() as { codeHash: string; expiresAt: number; attempts: number };

  if (Date.now() > data.expiresAt || data.attempts >= OTP_MAX_ATTEMPTS) {
    await deleteDoc(ref);
    cookieStore.delete(OTP_COOKIE);
    return { ok: false, error: "Code expired or too many attempts. Please start over." };
  }

  if (!safeEqual(hashOtp(code, challengeId), data.codeHash)) {
    await updateDoc(ref, { attempts: increment(1) });
    return { ok: false, error: "Incorrect code." };
  }

  await deleteDoc(ref);
  cookieStore.delete(OTP_COOKIE);
  await createSession();
  return { ok: true };
}
