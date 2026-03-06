import bcrypt from "bcryptjs";
import crypto from "crypto";

const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "fallback-secret";

export async function hashPasscode(raw: string): Promise<string> {
  return bcrypt.hash(raw, 10);
}

export async function verifyPasscode(
  raw: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(raw, hash);
}

export function generateAccessToken(eventId: string): string {
  const payload = `${eventId}:${Date.now()}`;
  const hmac = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}:${hmac}`).toString("base64url");
}

export function verifyAccessToken(token: string, eventId: string): boolean {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const parts = decoded.split(":");
    if (parts.length < 3) return false;

    const tokenEventId = parts[0];
    const timestamp = parseInt(parts[1], 10);
    const providedHmac = parts.slice(2).join(":");

    if (tokenEventId !== eventId) return false;

    // Tokens expire after 24 hours
    if (Date.now() - timestamp > 24 * 60 * 60 * 1000) return false;

    const expectedPayload = `${tokenEventId}:${timestamp}`;
    const expectedHmac = crypto
      .createHmac("sha256", SECRET)
      .update(expectedPayload)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(providedHmac),
      Buffer.from(expectedHmac)
    );
  } catch {
    return false;
  }
}
