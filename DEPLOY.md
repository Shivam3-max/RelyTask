# Deploying RELYTASK to Hostinger (Business plan, subdomain)

RELYTASK is a server-rendered Next.js 16 app (App Router, NextAuth, Prisma + MySQL)
that stores uploaded files on disk. It runs on Hostinger's **Node.js Web Apps**
(included on the Business plan — up to 5 apps, Node 18–24, managed MySQL, free SSL,
SSH, daily backups).

## 1. Create the subdomain

hPanel → **Domains → Subdomains** → create e.g. `app` → `app.yourdomain.com`.

## 2. Create the MySQL database

hPanel → **Databases → MySQL Databases** → Create. Save the **name / user / password**.
Host is `localhost` (app and DB share the account).

Connection string:

```
mysql://DBUSER:DBPASS@localhost:3306/DBNAME
```

## 3. Create a persistent storage directory

Uploads must live OUTSIDE the deployed app dir or they are wiped on every deploy.
Over SSH (hPanel → **Advanced → SSH Access**):

```bash
echo $HOME                          # e.g. /home/u123456789
mkdir -p $HOME/storage/relytask
```

## 4. Create the Node.js Web App

hPanel → **Websites → Node.js / Web Apps → Create app**:

| Field            | Value                                         |
| ---------------- | --------------------------------------------- |
| Source           | GitHub → this repo, `main` branch             |
| Domain           | `app.yourdomain.com`                          |
| Node version     | `22.x`                                        |
| App type         | Server-side (Next.js)                         |
| Build command    | `npm run build`                               |
| Start command    | `npm run start`                               |
| Output directory | `.next`                                       |

`npm run build` runs, in order: `prisma generate` → `next build` →
`prisma migrate deploy` → `prisma db seed`. So **every deploy automatically
applies new migrations and re-runs the seed**. Both steps are non-destructive
(see [§7](#7-what-runs-automatically-on-every-deploy)).

## 5. Environment variables (app dashboard → Environment variables)

```
DATABASE_URL         = mysql://DBUSER:DBPASS@localhost:3306/DBNAME
DIRECT_URL           = mysql://DBUSER:DBPASS@localhost:3306/DBNAME
NEXTAUTH_SECRET      = <openssl rand -base64 32>
NEXTAUTH_URL         = https://app.yourdomain.com
NEXT_PUBLIC_APP_URL  = https://app.yourdomain.com
STORAGE_DIR          = /home/u123456789/storage/relytask
SMTP_HOST            = ...
SMTP_PORT            = 587
SMTP_USER            = ...
SMTP_PASS            = ...
SMTP_FROM            = ...
SEED_ADMIN_EMAIL     = you@yourdomain.com
SEED_ADMIN_PASSWORD  = <strong password>
SEED_TEMP_PASSWORD   = <temp password for the initial team members>
# TWILIO_* left unset → WhatsApp notifications disabled
```

`NEXTAUTH_URL` / `NEXT_PUBLIC_APP_URL` **must** be the public `https://` subdomain
URL or login breaks.

## 6. One-time database baseline (ONLY if the database already has data)

`prisma migrate deploy` compares the `_prisma_migrations` table against the
`prisma/migrations/` folder. If this database was previously set up with
`prisma db push`, or with an older/renamed migration, the first automatic
`migrate deploy` will fail ("migration not found" / "drift detected").

Fix it once, over SSH, before the first GitHub deploy:

```bash
# point the CLI at the production DB
export DATABASE_URL='mysql://DBUSER:DBPASS@localhost:3306/DBNAME'

npx prisma migrate status          # see what it thinks is applied

# If the schema already matches the current schema.prisma, mark every existing
# migration as already-applied so deploy treats the DB as the baseline:
npx prisma migrate resolve --applied 20260620013059_init
npx prisma migrate resolve --applied 20260620020232_add_password_reset
npx prisma migrate resolve --applied 20260821020541_add_client_video_recording_category

npx prisma migrate status          # should now report "up to date"
```

For a brand-new empty database you can skip this entirely — the first deploy
applies all migrations from scratch.

## 7. What runs automatically on every deploy

Nothing to do here — this is just what to expect. Each GitHub push triggers
`npm run build`, which after compiling the app runs:

1. **`prisma migrate deploy`** — applies any migration files not yet in
   `_prisma_migrations`. Never edits or drops existing columns/data on its own;
   it only runs the SQL in your migration files. If a migration would fail, the
   deploy fails and the currently running version stays up.
2. **`prisma db seed`** (`prisma/seed.ts`) — idempotent bootstrap only:
   - creates the permission rows and the default roles **only if missing**
     (`master_admin`, `project_manager`, `video_editor`, `graphic_designer`,
     `social_media_handler`, `ads_manager`, `client`); an existing role and its
     permission set are left untouched;
   - creates the `SEED_ADMIN_EMAIL` admin user **only if it doesn't exist**;
   - creates the initial team (`TEAM` in `seed.ts`) — each as
     `<firstname>@relytask.com` with `SEED_TEMP_PASSWORD` — **only if the email
     doesn't already exist**. A reseed never resets an existing account's
     password, name, or role;
   - touches no clients, projects, tasks, files, comments, or other users.

   If the seed errors it exits non-zero and fails the deploy.

   Initial team seeded: Shivam & Manik (admin), Shubham (graphic designer),
   Sumit & Gagandeep (video editor), Daksh (social media handler), Rohit (ads
   manager). Tell each to sign in with their `@relytask.com` address and the
   temp password, then change it.

To apply a deliberate change to the default permission set of a role that
already exists in production, write a one-off script — don't put it in the seed.

If your Hostinger build environment turns out not to reach the database at build
time (you'll see a connection error during deploy), remove `&& npm run db:deploy`
from the `build` script and instead run `npm run db:deploy` from an SSH session
or a post-deploy Cron Job.

## 8. SSL

hPanel → **Security → SSL** → install the free Let's Encrypt certificate for the
subdomain (often automatic). Visit `https://app.yourdomain.com` and log in with
`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

## 9. Updates

`git push` → Hostinger rebuilds automatically, applying migrations and reseeding
as part of the build (see §7). Nothing manual needed for routine schema changes,
as long as you committed the generated migration in `prisma/migrations/`.

## Backups

The Business plan includes **automated daily backups** (files + databases, 7-day
retention). Manage/restore at hPanel → **Websites → (site) → Files → Backups**.
`$STORAGE_DIR` is inside the account file tree, so uploads are included.

For retention beyond 7 days, add a daily **Cron Job** (hPanel → Advanced → Cron Jobs):

```bash
DB=DBNAME; U=DBUSER; P='DBPASS'; OUT=$HOME/backups; mkdir -p $OUT
mysqldump -u $U -p"$P" $DB | gzip > $OUT/db-$(date +\%F).sql.gz
tar czf $OUT/files-$(date +\%F).tar.gz -C $HOME/storage relytask
find $OUT -type f -mtime +14 -delete
```

## Notes

- **Upload size:** shared hosting caps request body size. `MAX_VIDEO_UPLOAD_BYTES`
  in `src/lib/constants.ts` is 500 MB — large video uploads may hit a 413 from the
  proxy. Lower it or ask Hostinger support for your limit.
- **Build memory:** `next build` needs ~1.5 GB. If the managed build OOMs, build
  locally and deploy via ZIP upload with `.next` included.
