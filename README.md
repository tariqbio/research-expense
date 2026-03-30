# ResearchTrack v9 — Workspace Edition

A private research expense tracker. Each user gets their own isolated workspace.
No university, no department — just your projects, your team, your data.

## What changed from v8

- **Workspace model** — replaced "organization" with "workspace". Each person who registers
  gets their own private space. Nobody else can see your data.
- **2-step registration** — register with your details, then name your workspace and set
  the report header (what appears on exported reports).
- **Email verification** — workspace owner gets a verification email on signup via Gmail SMTP.
- **Forgot password** — fully automated email reset. No admin involvement needed.
- **Change password** — any logged-in user can change their own password from Profile page.
- **Admin resets member password** — from Members page, one click.
- **Workspace Settings page** — admin can update workspace name and report header anytime.
- **Dynamic report header** — all exports (PDF and Excel) use your workspace's report header,
  not a hardcoded "FGS" or any institution name.
- **Profile page** — every user can update their name, position, and password.

## Setup

### 1. Environment variables (Render or Railway)

Copy `.env.example` to `.env` and fill in:

```
DATABASE_URL=...        # your Postgres URL
JWT_SECRET=...          # long random string
SMTP_USER=...           # your Gmail address
SMTP_PASS=...           # Gmail App Password (16 chars, no spaces)
EMAIL_FROM=ResearchTrack <your-gmail@gmail.com>
APP_URL=https://your-app.onrender.com
FRONTEND_URL=https://your-app.onrender.com
```

### Gmail App Password (one time setup)
1. Go to myaccount.google.com → Security → 2-Step Verification → App Passwords
2. Select "Mail" → Generate
3. Copy the 16-character password into SMTP_PASS (no spaces)

### 2. Deploy
Same as before — push to GitHub, Render auto-deploys.

### 3. First use
- Go to your app URL → Register
- Enter your details → name your workspace → set report header
- Verify your email → sign in
- Add team members from the Members page
- Create projects, assign members, start tracking

## Upgrading from v7/v8
The server auto-migrates existing data into a default workspace on first boot.
All your existing projects and expenses are preserved.
