import { cookies } from "next/headers";

const SESSION_COOKIE = "blog_admin_session";
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

function encodeToken(timestamp: number): string {
  const secret = process.env.SESSION_SECRET || "fallback-secret";
  const data = `${timestamp}:${secret}`;
  return Buffer.from(data).toString("base64");
}

function decodeToken(token: string): number | null {
  try {
    const secret = process.env.SESSION_SECRET || "fallback-secret";
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [timestampStr, tokenSecret] = decoded.split(":");
    if (tokenSecret !== secret) return null;
    return parseInt(timestampStr, 10);
  } catch {
    return null;
  }
}

export async function createSession(): Promise<void> {
  const token = encodeToken(Date.now());
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
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

  const timestamp = decodeToken(token);
  if (!timestamp) return false;

  return Date.now() - timestamp < SESSION_DURATION;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export function verifyPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  return password === adminPassword;
}
