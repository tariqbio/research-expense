# FGS Research Expense Tracker

A full-stack expense tracking system for research projects at DIU Faculty of Graduate Studies.

---

## 🚀 Deploy to Railway (Step-by-Step)

### Step 1 — Push to GitHub
1. Create a new repository on [github.com](https://github.com)
2. Upload all these files (drag & drop the folder, or use Git)

### Step 2 — Create a Railway project
1. Go to [railway.app](https://railway.app) and log in
2. Click **New Project → Deploy from GitHub repo**
3. Select your repository

### Step 3 — Add a PostgreSQL database
1. Inside your Railway project, click **+ New**
2. Choose **Database → Add PostgreSQL**
3. Railway will auto-create a `DATABASE_URL` variable — it links automatically ✅

### Step 4 — Set environment variables
In your Railway service (the Node.js one, not the database), go to **Variables** and add:

| Variable | Value |
|---|---|
| `JWT_SECRET` | Any long random string, e.g. `mySuperSecretKey2024!xK9pQ` |
| `NODE_ENV` | `production` |

> `DATABASE_URL` and `PORT` are set automatically by Railway — do NOT add them manually.

### Step 5 — Run the database schema
1. Click on your **PostgreSQL** service in Railway
2. Go to the **Query** tab (or connect via the provided connection string)
3. Copy and paste the contents of `backend/db/schema.sql` and run it

That's it — Railway will build and deploy automatically on every push! 🎉

---

## 🔑 Default Login

| Field | Value |
|---|---|
| Email | `admin@fgs.diu.edu` |
| Password | `Admin@1234` |

**⚠️ Change the admin password after first login by having the admin re-create the account.**

---

## 💻 Local Development

```bash
# 1. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 2. Create backend/.env from the example
cp backend/.env.example backend/.env
# Edit backend/.env with your local PostgreSQL credentials

# 3. Run the schema on your local DB
psql $DATABASE_URL -f backend/db/schema.sql

# 4. Start backend (port 4000)
cd backend && npm run dev

# 5. Start frontend (port 5173) in a new terminal
cd frontend && npm run dev
```

---

## 📁 Project Structure

```
research-tracker/
├── package.json          ← Root (Railway detects Node here)
├── railway.toml          ← Build & start commands
├── frontend/             ← React + Vite
│   ├── src/
│   └── package.json
└── backend/              ← Express + PostgreSQL
    ├── routes/
    ├── middleware/
    ├── db/
    │   ├── schema.sql    ← Run this once on your DB
    │   └── pool.js
    └── server.js
```
