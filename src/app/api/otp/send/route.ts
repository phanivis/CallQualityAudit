import { NextResponse } from "next/server";
import { Resend } from "resend";
import { generateOtp, createOtpToken } from "@/lib/otp";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let email = "";
  try {
    const body = await req.json();
    email = String(body?.email ?? "").trim();
  } catch {
    // fall through to validation error
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "A valid email address is required." },
      { status: 400 }
    );
  }

  const code = generateOtp();
  const token = createOtpToken(email, code);

  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { error } = await resend.emails.send({
        from: process.env.EMAIL_FROM ?? "Call Quality Audit <onboarding@resend.dev>",
        to: email,
        subject: `${code} is your Call Quality Audit sign-in code`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2>Call Quality Audit</h2>
            <p>Your one-time sign-in code is:</p>
            <p style="font-size:32px;font-weight:bold;letter-spacing:6px">${code}</p>
            <p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>
          </div>`,
      });
      if (error) {
        return NextResponse.json(
          { error: `Failed to send email: ${error.message}` },
          { status: 502 }
        );
      }
    } catch (e) {
      return NextResponse.json(
        { error: `Failed to send email: ${e instanceof Error ? e.message : "unknown error"}` },
        { status: 502 }
      );
    }
    return NextResponse.json({ token });
  }

  // No email provider configured: dev fallback. Never expose the code in
  // production — require RESEND_API_KEY there.
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Email sign-in is not configured (RESEND_API_KEY missing)." },
      { status: 503 }
    );
  }
  console.log(`[dev] OTP for ${email}: ${code}`);
  return NextResponse.json({ token, devCode: code });
}
