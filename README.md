# School Portal: ONE Next.js frontend + two Express backends (MySQL and Supabase)

```
fullstack-practice/
  frontend/               Next.js (login page has a MySQL | Supabase switch)   http://localhost:3000
  mysql-app/backend/      Express + MySQL + node-cron (+ optional MySQL->Supabase sync)   http://localhost:4000
  supabase-app/backend/   Express + Supabase                                    http://localhost:4001
```

Roles: student (courses dekh sakta hai), teacher (+ course add), admin (+ Users page).
Admin banne ke liye register par `ADMIN_CODES` (backend ke `.env`) ka koi code dena parta hai.

## 1. Windows par MySQL (dobara setup)

1. MySQL Installer download karein (dev.mysql.com/downloads/installer), **MySQL Server 8.0** + **Workbench** install karein.
   Root password wohi rakhein jo `mysql-app/backend/.env` ke `DB_PASSWORD` mein hai.
2. Check: PowerShell mein `Get-Service MySQL80` (Status = Running).
3. Database + tables (koi ek tareeqa):
   - **Workbench:** File > Open SQL Script > `mysql-app/backend/schema.sql` > Ctrl+Shift+Enter.
   - **cmd.exe:** `"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p < mysql-app\backend\schema.sql`
4. Check: `USE school; SHOW TABLES;` -> `courses`, `users`.
5. Supabase wale tables aap ke Supabase project mein pehle se hain (cloud mein hain, Windows se nahi mitay).
   Agar nahi hain to `supabase-app/backend/schema.sql` Supabase SQL Editor mein chalayein.

## 2. Local run (3 terminals, Node 22+ chahiye: `node -v`)

```
cd mysql-app/backend    ; npm install ; npm run dev    # MySQL connected + node-cron: report scheduled
cd supabase-app/backend ; npm install ; npm run dev    # API running ... 4001
cd frontend             ; npm install ; npm run dev    # http://localhost:3000
```

`.env` badalne ke baad us terminal ko band karke dobara chalayein (auto-reload nahi hota).
Sirf ek backend chalana ho to chalayein; doosra login page par "Cannot reach ... backend" dikhayega.

## 3. Cron report (MySQL backend)

- node-cron har `REPORT_SCHEDULE` par terminal mein report print karta hai
  (default: har 10 minute, pichle `REPORT_WINDOW_MINUTES`=10 minute ke naye students/courses).
- 1 minute wali report: `.env` mein `REPORT_SCHEDULE="* * * * *"` aur `REPORT_WINDOW_MINUTES=1`.
- Foran check (cron-job.org wala endpoint):
  `curl.exe -H "x-cron-secret: <CRON_SECRET>" http://localhost:4000/cron/report`

## 4. MySQL -> Supabase sync (optional, default OFF)

Sync tabhi chalta hai jab `mysql-app/backend/.env` mein **dono** `SUPABASE_URL` aur `SUPABASE_SERVICE_KEY` bhare hon
(`supabase-app/backend/.env` se copy karein). Phir:

1. Supabase SQL Editor mein `mysql-app/backend/supabase-sync.sql` ek dafa chalayein.
2. MySQL backend restart: log mein `node-cron: sync scheduled (*/5 * * * *)`.
3. Foran check: `curl.exe -H "x-cron-secret: <CRON_SECRET>" http://localhost:4000/cron/sync`

MySQL asal hai, Supabase sirf copy. Dono values khali ho to log mein `Sync is OFF` aata hai.

## 5. Deploy (Railway + Vercel)

- Railway: MySQL service + **do** backend services (ek hi GitHub repo se):
  - `mysql-app/backend` (Root Directory = `mysql-app/backend`): `DB_HOST=${{MySQL.MYSQLHOST}}`, `DB_PORT=${{MySQL.MYSQLPORT}}`,
    `DB_USER=${{MySQL.MYSQLUSER}}`, `DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}`, `DB_NAME=${{MySQL.MYSQLDATABASE}}`,
    `JWT_SECRET`, `ADMIN_CODES`, `CRON_SECRET`. Tables: `schema.cloud.sql`. App Sleeping OFF, replica sirf 1.
  - `supabase-app/backend` (Root Directory = `supabase-app/backend`): `JWT_SECRET` (mysql wale se alag), `ADMIN_CODES`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`.
- Vercel: Root Directory = `frontend`, `MYSQL_API_URL` aur `SUPABASE_API_URL` = dono Railway https URLs, phir Redeploy.
- `.env` aur `.env.local` kabhi GitHub par push na karein (`.gitignore` mein hain).
