import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import type { Provider } from "next-auth/providers";
import { verifyOtpToken } from "@/lib/otp";

const providers: Provider[] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

providers.push(
  Credentials({
    id: "email-otp",
    name: "Email OTP",
    credentials: {
      email: { label: "Email", type: "email" },
      code: { label: "One-time code", type: "text" },
      token: { label: "Token", type: "text" },
    },
    async authorize(credentials) {
      const email = (credentials?.email as string) ?? "";
      const code = (credentials?.code as string) ?? "";
      const token = (credentials?.token as string) ?? "";
      if (!email || !code || !token) return null;
      if (!verifyOtpToken(email, code, token)) return null;
      const normalized = email.trim().toLowerCase();
      return { id: normalized, email: normalized, name: normalized.split("@")[0] };
    },
  })
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
});

export function googleEnabled(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}
