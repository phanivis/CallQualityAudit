import crypto from "crypto";

// Stateless OTP: the code is never stored server-side. We hand the client an
// HMAC token binding (email, expiry, code); verification recomputes the MAC.
// Works on serverless (Vercel) without a database.

function secret(): string {
  return process.env.AUTH_SECRET ?? "insecure-dev-secret-change-me";
}

export function generateOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

export function createOtpToken(
  email: string,
  code: string,
  ttlMs = 10 * 60 * 1000
): string {
  const exp = Date.now() + ttlMs;
  const payload = `${email.trim().toLowerCase()}|${exp}`;
  const mac = crypto
    .createHmac("sha256", secret())
    .update(`${payload}|${code}`)
    .digest("hex");
  return Buffer.from(`${payload}|${mac}`).toString("base64url");
}

export function verifyOtpToken(
  email: string,
  code: string,
  token: string
): boolean {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [tokenEmail, expStr, mac] = decoded.split("|");
    if (!tokenEmail || !expStr || !mac) return false;
    if (tokenEmail !== email.trim().toLowerCase()) return false;
    if (Date.now() > Number(expStr)) return false;
    const expected = crypto
      .createHmac("sha256", secret())
      .update(`${tokenEmail}|${expStr}|${code.trim()}`)
      .digest("hex");
    return (
      mac.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))
    );
  } catch {
    return false;
  }
}
