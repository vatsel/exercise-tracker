import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// The session cookie is "<userId>.<expiry in ms>.<signature>". The HMAC signature proves the server
// issued it, so checking a request needs no database lookup.

export const sessionCookie = "session";

const sessionLengthMs = 30 * 24 * 60 * 60 * 1000;

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value) {
    throw new Error("SESSION_SECRET is not set");
  }
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function isValidSession(token: string | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  const parts = token.split(".");
  if (parts.length !== 3) {
    return false;
  }
  const [userId, expiresAtText, signature] = parts;
  const expected = Buffer.from(sign(`${userId}.${expiresAtText}`));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length) {
    return false;
  }
  if (!timingSafeEqual(actual, expected)) {
    return false;
  }
  return Number(expiresAtText) > Date.now();
}

export async function startSession(userId: number): Promise<void> {
  const expiresAt = Date.now() + sessionLengthMs;
  const payload = `${userId}.${expiresAt}`;
  const cookieStore = await cookies();
  cookieStore.set(sessionCookie, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    // Plain http is allowed in development so the app can be opened from a phone on the LAN.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}
