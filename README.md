# Call Quality Audit

A web app that scores sales/support call recordings against a customizable
evaluation rubric and produces formatted audit reports.

**Flow:**

1. Sign in with **Google SSO** or **Email + OTP** (6-digit code, no database needed)
2. Upload one or more audio files (`.mp3`, `.wav`, `.m4a`, `.ogg`, `.flac`, …)
3. Review or edit the **evaluation criteria** (default: 9-category, 100-point
   sales call rubric) and click **Submit**
4. Each call is transcribed (OpenAI Whisper) and evaluated (Claude Opus 4.8),
   then rendered as a formatted HTML report — downloadable per call, plus an
   **Excel export with one row per call**

## Stack

- Next.js (App Router) + Tailwind — deploys to Vercel as-is
- NextAuth v5 (Auth.js) — Google provider + stateless HMAC-signed email OTP
- OpenAI Whisper for transcription, Anthropic Claude (`claude-opus-4-8`) with
  structured outputs for evaluation
- SheetJS (`xlsx`) for client-side Excel export

## Local development

```bash
cp .env.example .env.local   # fill in the keys (see below)
npm install
npm run dev
```

Open http://localhost:3000. Without `RESEND_API_KEY`, dev mode shows the OTP
code directly on the login screen so you can sign in without email setup.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `AUTH_SECRET` | ✅ | Session JWT + OTP signing. `openssl rand -base64 32` |
| `ANTHROPIC_API_KEY` | ✅ | Call evaluation (Claude) |
| `OPENAI_API_KEY` | ✅ | Audio transcription (Whisper) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | optional | Enables the Google sign-in button |
| `RESEND_API_KEY` | prod | Sends OTP emails (required for email login in production) |
| `EMAIL_FROM` | optional | Verified Resend sender, e.g. `Audit <audit@yourdomain.com>` |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | optional | Vercel KV / Upstash Redis — per-user criteria + audit history that syncs across devices. Without it, persistence falls back to browser localStorage |

## Persistence

- **Evaluation criteria** auto-save per user as you edit (debounced) and are
  restored on the next sign-in.
- **Audit history** — every evaluated call is saved automatically and listed
  on the **History** page (`/history`), where reports can be re-opened,
  downloaded as HTML, exported to Excel (one row per call), or deleted.
- Storage backend: if `KV_REST_API_URL`/`KV_REST_API_TOKEN` (or the
  `UPSTASH_REDIS_REST_*` equivalents) are set, data lives in Redis keyed by
  user email and follows the user across devices. Otherwise the browser's
  localStorage is used — zero setup, but per-device. On Vercel, create a
  Redis store under the project's **Storage** tab and the env vars are added
  automatically.

## Deploying to Vercel

1. Push this repo to GitHub (already at
   [phanivis/CallQualityAudit](https://github.com/phanivis/CallQualityAudit))
2. In [Vercel](https://vercel.com/new), **Import** the GitHub repo — the
   Next.js defaults work unchanged
3. Add the environment variables above under **Settings → Environment Variables**
4. For Google SSO, add `https://<your-vercel-domain>/api/auth/callback/google`
   as an authorized redirect URI in the Google Cloud console
5. Deploy

### Notes & limits

- Audio files are capped at **25 MB** (Whisper API limit). On Vercel's Hobby
  plan, request bodies are limited to ~4.5 MB — for larger recordings either
  upgrade the plan or compress recordings to mono 32 kbps MP3 (an hour-long
  call fits in ~14 MB).
- Evaluation of a single call takes 1–3 minutes; the evaluate route sets
  `maxDuration = 300` (requires a Vercel plan that allows it; Hobby caps lower).
- Files are processed in memory and never stored server-side.
