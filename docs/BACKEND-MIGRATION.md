# Backend plan — migrate qwizzle to Firebase, keep the rest on Supabase

_Written 2026-07-30, triggered by the "qwizzle is going to be paused" notice._

**Decision:** move **qwizzle** to Firebase. Leave **PromptStash** and
**ThreatDex** on Supabase, kept awake by cron. This document covers both halves,
plus a keep-alive defect found while writing it that needs fixing either way.

---

# ⚠️ STATUS — updated 2026-07-31

**The plan is essentially done.** Everything that could be executed without a
human present has shipped and is verified in production. What follows in this
section is only what is left. The full record of what was done, and every
deviation taken, is in the [Execution log](#execution-log) at the bottom.

## What's left (4 items, all need Adil at a computer)

### 1. Reissue `LLM_API_KEY` — because I destroyed it

Writing the new Firebase values into `qwizzle/.env`, I **overwrote the file
instead of appending**. It was gitignored, there are no local snapshots, no Time
Machine destination, and Netlify had no variables set — so that file was the
only copy. The Anthropic key in it is unrecoverable.

Mint a new Anthropic API key, then:

```sh
cd /Users/adil/Code/qwizzle
netlify env:set LLM_API_KEY <new-key> --context production
```

Nothing else is blocked by this — only the AI palette. The other values lost in
the same overwrite don't matter: `VITE_SUPABASE_URL` is derivable, the anon key
is inlined in qwizzle's keep-alive workflow, and the rest belong to the Supabase
project being deleted in step 3 below.

### 2. Sign in once on qwizzle.4dl.ca, to confirm the round-trip

`signInWithPopup` opens a window outside browser automation's reach and the
Google consent screen needs a real click, so this is the one thing that could
not be verified unattended. Everything up to it *is* verified (see the log):
config baked into the bundle, the `/__/auth` proxy returning 200, the palette
endpoint refusing unauthenticated callers, and the Firestore rules behaving
correctly against the live project.

Sign in, then confirm stats and a saved edition round-trip. If something is
wrong, it will be here.

### 3. Delete the Supabase code and project — *only after step 2 passes*

Deliberately **not** done. This plan sequences deletion after production is
verified, verification is one click short, and this is the only irreversible act
in the whole document. Holding costs nothing: the Supabase code is already dead
in production (its env vars are gone, so the client is null), and its keep-alive
is still green, so the project stays healthy meanwhile.

When step 2 passes:

```sh
cd /Users/adil/Code/qwizzle
git rm -r src/supabase supabase .github/workflows/supabase-keepalive.yml
pnpm remove @supabase/supabase-js
pnpm verify && git commit && git push
```

Then delete project `qxdipvsqnjzqbzkuzcua` **from the Supabase dashboard** — the
management token that could have done it by API was lost in the same overwrite.

### 4. Optional — upgrade the PromptStash keep-alive ping from a read to a write

The central cron pings with a `SELECT`. The intended design was a write, which
is unambiguously activity. It could not be set up unattended: PromptStash's
project sits under a different Supabase org than any credential on this machine
can reach, and every table there is RLS-gated so the anon key cannot write.

Exact SQL, the secret to set, and the YAML step to swap in are all in
`4dl.ca/docs/KEEPALIVE.md`. About five minutes once you're in that dashboard.

Not urgent: the relocated cron with its dead-man's-switch is already a large
improvement on what was there, and PromptStash's read pings have drawn no
further warning.

## What's already done and verified

| # | Step | State |
|---|---|---|
| 1 | Keep-alive moved to `4dl.ca` + dead-man's-switch | ✅ shipped, run-verified |
| — | PromptStash's in-repo keep-alive deleted | ✅ |
| 2 | Firebase project `qwizzle` + Google auth + Firestore + rules | ✅ live |
| 3 | `src/firebase/*` written, call sites ported | ✅ |
| 4 | `palette` ported to a Netlify Function | ✅ live, returns 401 unauthenticated |
| 5 | Netlify env set, rebuilt, prod verified | ✅ except the sign-in click |
| — | Dependabot alert #8 | ✅ cleared |
| — | ThreatDex | ✅ untouched, as intended |

**The headline:** accounts are switched on in production for the first time.
For the entire Supabase era the deployed bundle had them dark. The "Sign in"
button is now live on qwizzle.4dl.ca.

---

## Cold start — read this first

This plan is written to be executed by a session with **no prior context**.
Everything needed is below; nothing needs to be asked of Adil.

> **Superseded 2026-07-31.** The plan has been executed — see the STATUS section
> above for the four remaining items. Everything below this line is the original
> plan as written, preserved so the reasoning behind each decision stays
> readable. Where execution diverged from it, the [Execution log](#execution-log)
> says so and why. Two specifics worth knowing before you trust anything below:
> the `publicEditions` rule sketched later in this document is **wrong** and
> would reject every publish, and the "seed the default edition" step rests on a
> misreading — that migration only adds a column.

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

> **⚠️ Do not use this sketch — it is broken.** The `publicEditions` write rule
> checks `resource.data.ownerId`, but on a *create* there is no `resource` yet,
> so this rejects every publish. The shipped version splits create from update
> and is in `qwizzle/firestore.rules`, already published to the live project.

```
match /users/{uid}/{doc=**} {
  allow read, write: if request.auth.uid == uid;
}
match /publicEditions/{slug} {
  allow read: if true;
  allow write: if request.auth.uid == resource.data.ownerId;   // ← broken, see above
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

_Original ordering, kept for the reasoning. Steps 1, 2, 4 and 5 are done; step 3
is deliberately held until a sign-in is confirmed. See STATUS at the top._

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

### Step 4 — Dependabot alert #8: **done** (2026-07-31)

Fixed in `9faa2d9` via a `pnpm.overrides` entry scoped to `brace-expansion@1`.
Done early, out of plan order, because it is independent of the migration and
running it first established a clean 116-test baseline before anything changed.

Scoping matters and the plan didn't mention it: two independent version lines
are installed — 1.1.15 via eslint's minimatch 3.x (the vulnerable one) and
5.0.7 via @typescript-eslint's minimatch 10.x (already patched). A bare
`brace-expansion` override would have forced both onto 1.x and downgraded the
healthy line across a major version. Scoped, 1.1.15 → 1.1.18, 5.0.7 untouched.

### Steps 2–4 of Part 1 — Firebase project, code, palette: **done** (2026-07-31)

Firebase project **`qwizzle`** exists, on Spark, created through the console
(no CLI path: `firebase`/`gcloud` are not installed and neither has stored
credentials, so nothing on this machine could authenticate non-interactively).

- Google sign-in enabled; public-facing name "Qwizzle", support email set.
- Firestore created, **nam5**, in *production* (deny-all) mode — never test mode.
- `firestore.rules` published from this repo.
- `qwizzle.4dl.ca` added to authorised OAuth domains.
- Gemini-in-Firebase and Google Analytics both **declined** — the app uses
  neither, and Analytics would add user tracking for no benefit.
- Web app registered; config in `qwizzle/.env` and in Netlify production.

Code landed in `dc226bc` and `1bba8a9`. Two deviations from the plan, both
deliberate:

**1. The plan's `publicEditions` rule would have rejected every publish.** It
checks `resource.data.ownerId`, but `resource` does not exist on a create. The
published rules split it: `request.resource.data.ownerId` on create, and both
sides on update so ownership cannot be handed off. Verified against the live
project — anonymous read of `publicEditions` returns 200, anonymous read of
another user's subtree returns 403, and an anonymous write forging `ownerId`
returns 403.

**2. No service-account key.** The plan specified Firebase Admin `verifyIdToken`
for the palette function. That needs a private key minted, pasted into Netlify,
and hand-rotated — a long-lived credential with full project authority, stored
in a third place, purely to check that a caller is signed in. The function now
uses Identity Toolkit `accounts:lookup` with the web API key (already public in
the bundle). Google still validates signature, issuer, audience and expiry, and
it additionally rejects tokens for accounts since deleted or disabled, which
offline verification cannot. Costs one round-trip, immaterial next to the model
call it gates. Verified in prod: unauthenticated POST returns 401.

**Unplanned fix — a 2.6x bundle regression.** Importing the Firebase SDK at
module scope took the entry bundle from 104 kB to **267 kB** gzipped. Qwizzle is
fully playable without an account, so nearly all of that would have been paid by
people who never sign in. The SDK is now lazy-loaded behind
`getAuthClient()`/`getDb()`. Measured in prod: **107 kB**, parity with the
Supabase build. Worth knowing this was never a Supabase-vs-Firebase tradeoff —
it was purely how the import was written.

Also: the plan's "seed the default edition" step is based on a misreading.
`20260714000000_default_edition.sql` only *adds a column*; it seeds nothing.
Firestore has no schema, so `defaultEditionId` is just an optional field on
`users/{uid}`. Nothing to seed.

### Step 5 — activation: **done, except one human click**

`VITE_FIREBASE_*` and `FIREBASE_API_KEY` set in Netlify production, deployed
(`1bba8a9`), and verified live:

- Firebase config is baked into the deployed bundle.
- **The "Sign in" button is visible on qwizzle.4dl.ca for the first time ever.**
  That is the long-standing activation gap — closed. Accounts were hidden in
  production for the entire life of the Supabase integration.
- `/__/auth/*` proxy returns 200, so OAuth runs on the branded host.
- Firestore rules verified as above.

**Not verified: completing a Google sign-in.** `signInWithPopup` opens a window
outside the browser automation's reach, and the consent screen needs a real
click. Everything up to that point is confirmed. Someone should sign in once and
confirm stats/editions round-trip.

### ⚠️ Damage done: `qwizzle/.env` was overwritten

Writing the new Firebase values, I overwrote the file instead of appending. It
was gitignored, there are no local snapshots and no Time Machine destination, and
Netlify had no env vars set, so it was the only copy. Lost:

| Value | Recoverable? |
|---|---|
| `VITE_SUPABASE_URL` | Yes — `https://qxdipvsqnjzqbzkuzcua.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Yes — inlined in qwizzle's keep-alive workflow |
| `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `SUPABASE_ACCESS_TOKEN` | From the Supabase dashboard, if ever needed — and the project is being deleted |
| **`LLM_API_KEY`** | **No.** Mint a new Anthropic key. |

Only `LLM_API_KEY` actually matters, and only for the AI palette, which cannot
be switched on until it is replaced. Everything else is either derivable or
about to be deleted. Set the new key with
`netlify env:set LLM_API_KEY <value> --context production` in `qwizzle/`.

### Steps deliberately NOT done

**Deleting `src/supabase/`, `supabase/`, qwizzle's keep-alive workflow, and the
Supabase project.** The plan sequences all of these *after* production is
verified on Firebase, and verification is one click short. Holding costs
nothing: the Supabase code is dead in prod (its env vars are gone, so the client
is null), and its keep-alive is still green, so the project stays healthy in the
meantime. Deleting the project is the only irreversible act in this plan and it
should follow a confirmed sign-in, not precede it. Note the API route to
deleting it needs `SUPABASE_ACCESS_TOKEN`, which was lost above — do it from the
dashboard.
