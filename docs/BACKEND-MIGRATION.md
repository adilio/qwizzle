# Backend plan — migrate qwizzle to Firebase, keep the rest on Supabase

_Written 2026-07-30, triggered by the "qwizzle is going to be paused" notice._

**Decision:** move **qwizzle** to Firebase. Leave **PromptStash** and
**ThreatDex** on Supabase, kept awake by cron. This document covers both halves,
plus a keep-alive defect found while writing it that needs fixing either way.

---

## Cold start — read this first

This plan is written to be executed by a session with **no prior context**.
Everything needed is below; nothing needs to be asked of Adil.

**Repos and paths** (all under `/Users/adil/Code`, which is *not* itself a repo):

| Repo | Path | GitHub | Netlify site id |
|---|---|---|---|
| qwizzle | `qwizzle/` | `adilio/qwizzle` | `cf9f0e6b-0db3-41ae-8914-46a5e14a8bea` (qwizzle.4dl.ca) |
| PromptStash | `PromptStash/` | `adilio/PromptStash` | `ac51512c-0330-4378-8746-77f738b77321` (promptstash.4dl.ca) |
| ThreatDex | `threatdex/` | `adilio/threatdex` | `aad52cb2-64c7-421a-9a21-a8fa02a67b2a` (threatdex.netlify.app) |
| 4dl.ca | `4dl.ca/` | `adilio/4dl.ca` | `5ac9c1a5-c8a8-485a-a20f-7ec492be99b6` (4dl.ca) |

**Credentials** — all in gitignored `.env` files, already on this machine:

- `qwizzle/.env` — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, a management
  `SUPABASE_ACCESS_TOKEN`, and `LLM_API_KEY`. **Known defect:** the
  `SUPABASE_PROJECT_REF` line has a typo (missing leading `q`) — derive the ref
  from the URL instead: `qxdipvsqnjzqbzkuzcua`.
- `threatdex/.env` — Supabase URL/anon/service keys plus OTX, HF, Gemini and
  Stable Horde keys.
- `PromptStash/.env` — **empty.** Its anon key lives only in the GitHub repo
  secret `SUPABASE_ANON_KEY`. Its project ref is `ecpmipfpknoxeohbafxs`; a
  service-role key must be pulled from the Supabase dashboard for step 1.
- Netlify CLI is authenticated on this machine as adilio@gmail.com.
- The `SUPABASE_ACCESS_TOKEN` in `qwizzle/.env` only sees the qwizzle project;
  PromptStash and ThreatDex are under a different org.

**Reference implementation for the Firebase side:** `Rhabbit/` (project
`rhabbit-e8f9d`) is already a working Firebase Auth + Firestore app on the free
Spark plan, deployed to Netlify. Mirror its patterns — `VITE_FIREBASE_*` env
vars, `firestore.rules` in-repo, server-side access control in rules.

**Verify before trusting this document.** It was written 2026-07-30; check that
the stated facts still hold (project status, workflow run history, whether prod
still lacks the `VITE_SUPABASE_*` vars) before acting on them.

---

## Working agreement

Adil's standing instructions for this work:

- **Work autonomously.** Execute the whole plan end to end without stopping for
  approval, confirmation, or clarification. Where a question comes up, resolve
  it with the safest defensible default, **write the assumption down in this
  file**, and keep going. Don't block; don't ask.
- **Commit and push as you go** (`/cp`) — small, self-contained commits at each
  meaningful checkpoint rather than one large drop at the end. Detailed commit
  messages.
- **No AI attribution in any git or GitHub artifact.** No `Co-Authored-By:`, no
  `Claude-Session:`, no "Generated with" line, no branch name containing
  "claude" — branches are named for the work. Commits author as the repo's
  configured user. This is non-negotiable and permanent: the `Co-Authored-By:`
  trailer writes into a GitHub per-repo contributor cache that never recomputes,
  and the only remedy is deleting and recreating the repository.
- **Never use `--no-verify`** and never disable `core.hooksPath`. The global
  `commit-msg` / `pre-push` hooks in `~/.git-hooks` enforce the above and are
  meant to be enforcing.
- Report progress by pushing working code, not by asking whether to proceed.

### Where this file lives

`/Users/adil/Code` is **not** a git repository, so this plan is not under version
control at its current path. The canonical copy is mirrored to
`qwizzle/docs/BACKEND-MIGRATION.md` and committed there, since qwizzle is where
nearly all the work happens. Update the mirrored copy; the top-level one is a
convenience scratch copy.

### Assumptions taken under autonomy

- **The qwizzle pause email's date is unknown and unobtainable** — it went to the
  Workspace mailbox, not adilio@gmail.com. Rather than ask, this plan takes the
  **pessimistic branch**: assume a read-only `SELECT` + `/auth/v1/health` does
  *not* register as Supabase activity, and build the keep-alive around a real
  **write**. That is the safe superset — it works whether or not reads count, at
  the cost of one trivial table. No further evidence needed to proceed.

---

## What's actually out there

Three Supabase projects, **all currently alive**:

| App | Project ref | Live at | Plan |
|---|---|---|---|
| qwizzle | `qxdipvsqnjzqbzkuzcua` (us-east-2, ACTIVE_HEALTHY) | qwizzle.4dl.ca | → **Firebase** |
| PromptStash | `ecpmipfpknoxeohbafxs` | promptstash.4dl.ca | Stay, cron keep-alive |
| ThreatDex | `zxutysxzhsswkwphzplf` | threatdex.netlify.app | Stay, already self-warming |

Only qwizzle is visible to the `SUPABASE_ACCESS_TOKEN` in `qwizzle/.env`; the
other two answered on their REST endpoints but sit under a different org.

**ThreatDex needs nothing.** `.github/workflows/sync.yml` (03:00 UTC) and
`image-gen.yml` (04:00 UTC) write to it nightly — real writes, which is why it
has never been flagged. No keep-alive to add, no migration. Leave it alone.

**qwizzle is idle for an ironic reason.** Prod doesn't use Supabase at all.
`src/supabase/client.ts` exports `null` when `VITE_SUPABASE_URL` /
`VITE_SUPABASE_ANON_KEY` are missing at build time, those vars were never set in
Netlify, and every account/sync feature hides itself. The deployed bundle
contains zero Supabase code and the `editions` table is empty. **So there is no
data to migrate** — this is swapping out a backend production has never once
talked to. That's what makes it the cheap one to move.

---

## ⚠️ The keep-alive is already broken, and it failed silently

Both repos already have `.github/workflows/supabase-keepalive.yml`. Neither is
trustworthy as-is. Verified run history:

**PromptStash** — keep-alive committed 2026-07-04, upgraded to daily 07-15.
Actual scheduled runs: **none until 2026-07-27.** The full run list for the repo
shows nothing between `2026-07-16` and a push-triggered CI run on `2026-07-26`;
the first successful ping is `2026-07-27T10:11Z`. Supabase's warnings landed
**2026-07-16 and 2026-07-23 — squarely inside that dead window.** The ping never
fired. What restarted it was the unrelated push on 07-26.

This is GitHub's low-activity behaviour: `schedule` triggers get deprioritised
and then dropped in quiet repos, and a push re-enables them. A keep-alive cron
living in the repo it's protecting is self-defeating — the quieter the repo, the
less the cron runs, and the quiet repo is exactly the one that needs it.

**qwizzle** — committed 07-16, and genuinely healthy: **15/15 daily runs, all
green, no gaps** through 2026-07-30. It's doing its job.

### What this means

- The 07-16 and 07-23 PromptStash warnings prove **nothing** about whether a
  read-only ping satisfies Supabase — the ping wasn't running. Its 4 real runs
  (07-27 → 07-30) are the first actual test, and no warning has arrived since.
- **The qwizzle notice is ambiguous and is being treated pessimistically.** That
  cron is green 15/15 since 07-16, so if the email is recent, a read-only
  `SELECT` + `/auth/v1/health` does **not** count as activity; if it predates
  ~07-15, reads are fine. The date isn't obtainable (it went to the Workspace
  mailbox — adilio@gmail.com has no qwizzle notice). Per the working agreement,
  proceed as if **reads don't count** and make the ping a write.

### Fixes to make regardless

1. **Move the keep-alive out of the quiet repos.** Put a single scheduled
   workflow in an actively-committed repo (`4dl.ca` is the natural host) that
   pings both projects. One cron, one place, and it sits in a repo that gets
   pushes.
2. **Make failure loud.** A green-but-never-running workflow is invisible.
   Either add a dead-man's-switch (healthchecks.io free tier — ping it after a
   successful Supabase ping; it alerts when the ping *stops*), or have the job
   fail if the project's last-activity timestamp is stale.
3. **Use a write, not a read** (decided — see assumptions). ThreatDex is the control group: it writes
   nightly and has never been flagged. Add a tiny `keepalive` table
   (`id int primary key, pinged_at timestamptz`) and have the cron upsert one
   row using the service-role key (repo secret, not inlined). A write is
   unambiguously activity; a `HEAD` against an empty table may not be. Cheap
   insurance either way.
4. Once qwizzle is on Firebase, delete its keep-alive workflow and the Supabase
   project.

---

## Part 1 — qwizzle → Firebase (the migration)

One focused session. No data migration, no cutover risk.

### Ground rules

- **Its own Firebase project**, matching `rhabbit-e8f9d`. Not shared.
- **Stay on Spark (free).** Cloud Functions and Firebase Storage both require
  Blaze now, so anything server-side goes to a **Netlify Function** instead —
  qwizzle already deploys on Netlify (site `cf9f0e6b-0db3-41ae-8914-46a5e14a8bea`),
  and 4dl.ca / pwsh.ca already prove the Functions + Blobs pattern.
- Spark Firestore: 1 GiB, 50k reads/day, 20k writes/day. Nowhere near it.
- **Firestore never auto-pauses.** That's the whole point of this exercise.

### Schema mapping (4 tables → Firestore)

| Supabase | Firestore |
|---|---|
| `profiles` (pk `user_id`) | `users/{uid}` |
| `stats` (pk `user_id`) | field on `users/{uid}`, or `users/{uid}/meta/stats` |
| `wordlists` (unique on `user_id,name`) | `users/{uid}/wordlists/{slug(name)}` — the unique index becomes the doc ID, so re-import overwrites for free |
| `editions` (private) | `users/{uid}/editions/{id}` |
| `editions` where `is_public` | mirror doc at top-level `publicEditions/{shareSlug}` |

The public-share split matters: `create policy "public editions readable" ...
using (is_public = true)` has no clean equivalent inside a user subcollection.
A separate top-level collection keyed by slug is simpler, and share links only
ever do a slug lookup anyway. Write both on publish.

`palette_calls` doesn't move — see the rate limiter below.

### Security rules (replaces all five RLS policies)

```
match /users/{uid}/{doc=**} {
  allow read, write: if request.auth.uid == uid;
}
match /publicEditions/{slug} {
  allow read: if true;
  allow write: if request.auth.uid == resource.data.ownerId;
}
```

### Auth

Supabase Google OAuth → Firebase Auth Google provider. `src/supabase/useAuth.ts`
is small; it becomes an `onAuthStateChanged` wrapper.

### The `palette` Edge Function → Netlify Function

`supabase/functions/palette/index.ts` needs a server: it holds `LLM_API_KEY`,
verifies JWT, rate-limits 10/hr via the `palette_calls` table, and fails closed.
Cloud Functions would force Blaze, so:

- Move it to `netlify/functions/palette.ts` on the existing qwizzle site.
- `LLM_API_KEY` → Netlify env.
- Verify the caller with the Firebase Admin SDK (`verifyIdToken`).
- Replace the `palette_calls` ledger with **Netlify Blobs** (same pattern as the
  4dl.ca shortener) or a per-user Firestore counter doc. **Keep the fail-closed
  behaviour** — that's deliberate in the original.
- Point `src/theme/aiPalette.ts` at `/.netlify/functions/palette`.

### Files touched

`src/supabase/{client,useAuth,sync}.ts` → `src/firebase/*`;
`src/account/AccountDialog.tsx`; `src/theme/aiPalette.ts`; `src/App.tsx`.
Delete `supabase/` and `.github/workflows/supabase-keepalive.yml`.

### Then actually turn it on

The long-standing activation gap applies to Firebase too: `VITE_FIREBASE_*` are
**compile-time**. Set them in Netlify env *and trigger a rebuild* — setting them
alone changes nothing. Then enable the Google provider and seed the default
edition (currently `supabase/migrations/20260714000000_default_edition.sql`).

### Order of work

1. Create the Firebase project + enable Google auth.
2. Write `src/firebase/*` and the security rules; keep Supabase code in place.
3. Port `palette` to a Netlify Function; verify rate limiting and fail-closed.
4. Set `VITE_FIREBASE_*` in Netlify, rebuild, verify sign-in and sync in prod.
5. Delete `src/supabase/`, `supabase/`, the keep-alive workflow, and the
   Supabase project.

---

## Part 2 — PromptStash and ThreatDex stay on Supabase

No migration. Rationale, so this isn't revisited later:

**PromptStash** is where Postgres genuinely earns its keep. ~15 tables, team RBAC
expressed as membership subqueries in RLS, two GIN `tsvector` indexes for
full-text search, a self-referencing folder tree, three join tables, triggers.
Firestore rules can't subquery, so team permissions would need denormalised
`memberIds` on every doc; join tables would collapse into arrays; and the
full-text search has no equivalent at all — it'd become client-side MiniSearch or
a paid Algolia tier. That's multiple sessions of work to end up with a weaker
data model. Not worth it to dodge an email.

**ThreatDex** is fine as-is and self-warming. Worth noting for the future: it's
595 rows of public, read-only catalogue data, and its two RPCs (`search_actors`
GIN full-text, `list_actors_ranked` plpgsql doing five optional filters +
composite scoring + pagination) are a poor fit for Firestore specifically. If it
ever *does* need to leave Supabase, the right move is to drop the database
entirely — have the nightly workers commit `data/actors.json`, sort in TypeScript,
search with MiniSearch in the browser. Faster site, nothing to pause. Not today.

Also unrelated but noticed: ThreatDex is still only on `threatdex.netlify.app` —
no 4dl.ca subdomain like the others.

---

## Execution order

Run top to bottom, autonomously, committing and pushing at each numbered step.

1. **Fix the keep-alive.** Add a `keepalive` table to PromptStash's Supabase
   project; move the cron into the `4dl.ca` repo (which gets regular pushes) as a
   write-based upsert using a service-role key in a repo secret; add a
   dead-man's-switch so a stopped cron is visible. Delete the two in-repo
   keep-alive workflows this replaces. Highest value per minute — PromptStash is
   currently guarded by a cron with a proven silent-failure history.
2. **qwizzle → Firebase**, per Part 1's five sub-steps. Commit at each: Firebase
   project + rules; `src/firebase/*`; `palette` Netlify Function; Netlify env +
   rebuild + prod verify; deletion of the Supabase code.
3. **Delete the qwizzle Supabase project** once prod is verified on Firebase.
4. **Clear qwizzle's Dependabot alert** (see below).
5. **ThreatDex: nothing.** Leave it entirely alone.

### Step 4 detail — Dependabot alert #8 (qwizzle)

Surfaced by GitHub on the push of 2026-07-30. Unrelated to this migration, but
cheap to clear while in the repo:

- **Alert:** https://github.com/adilio/qwizzle/security/dependabot/8
- `brace-expansion` `< 1.1.16`, ReDoS — exponential-time expansion of
  consecutive non-expanding `{}` groups. Rated **high**, but scope is
  **development** (a transitive dev dependency, not shipped in the bundle), so
  real-world exposure is negligible. Fix it, don't panic about it.
- Fix: bump the transitive dep to `>= 1.1.16` via a `pnpm.overrides` entry in
  `package.json` (or `pnpm update brace-expansion --recursive` if that resolves
  it), then run `pnpm verify` — the repo's 116-test gate — before committing.
- Do this as its own commit, not folded into migration work.

Where a step reveals something that contradicts this plan, update this file in
the same commit that acts on it.

---

## Execution log

### Step 1 — keep-alive: **done, with one deviation** (2026-07-31)

Verified first, and every factual claim in this document held: all three
projects alive; PromptStash's keep-alive really did have only 4 runs, the first
on 2026-07-27; qwizzle's really was green with no gaps; `4dl.ca` and `qwizzle`
had no repo secrets.

**Shipped:**

- `4dl.ca/.github/workflows/supabase-keepalive.yml` — one central daily cron,
  jittered, pinging PromptStash's PostgREST and GoTrue. Committed `742caf6`.
- `4dl.ca/docs/KEEPALIVE.md` — rationale, coverage table, and the manual
  upgrade path (see deviation).
- Dead-man's-switch, no third-party signup required. The job writes and pushes
  `.github/keepalive-heartbeat.json` after a successful ping; the next run to
  fire compares against it and **fails** if the gap exceeded 3 days. Verified
  end to end on run `30607631903` — ping green, heartbeat committed and pushed
  by the job.
- Deleted `PromptStash/.github/workflows/supabase-keepalive.yml` (`24755e7`),
  only after the replacement was confirmed working.

**Better than planned:** the plan assumed hosting the cron in `4dl.ca` was
sufficient because that repo "gets pushes." It doesn't — its last push before
this work was 2026-07-24, six days prior. Relocating alone would have
reproduced the same silent-stall failure in a new repo. The heartbeat commit
fixes this properly: it makes the workflow generate a daily push into its own
host repo, so it keeps *itself* scheduled. That is a real fix for the root
cause rather than a move to slightly-less-quiet ground.

**Deviation — the ping is still a read, not a write.** The plan called for a
`keepalive` table plus a service-role upsert. That is not reachable unattended:

- PromptStash's project (`ecpmipfpknoxeohbafxs`) is under a different Supabase
  org, and the `SUPABASE_ACCESS_TOKEN` in `qwizzle/.env` returns *only* the
  qwizzle project — confirmed against `api.supabase.com/v1/projects`.
- No service-role key for it exists anywhere on this machine. `PromptStash/.env`
  doesn't exist at all (the plan says "empty"); its Netlify env holds only
  `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; its single GitHub secret is
  `SUPABASE_ANON_KEY`, and secret *values* can't be read back.
- Every PromptStash table is RLS-gated to authenticated users, so the anon key
  cannot write anywhere. Creating the table needs DDL, which needs the key.

Per the working agreement this did not block. What shipped is the read ping —
which is strictly better than the status quo, since the status quo was a ping
that wasn't running at all — with the write upgrade written up as a ~5-minute
task in `docs/KEEPALIVE.md`: exact SQL, the `gh secret set` line, and the YAML
step to swap in. **This is the one item needing Adil**, and only because it
needs a dashboard login nothing here can perform.

Worth noting the evidence is mildly reassuring: PromptStash's 4 real read pings
(07-27 → 07-30) drew no further warning, while both prior warnings landed
during the window when nothing was pinging. Not conclusive — do the upgrade.

**qwizzle's keep-alive stays for now**, deliberately: the central cron doesn't
ping qwizzle, so removing it before the Firebase cutover would leave that
project unguarded. It goes in step 5, as the plan specifies.
