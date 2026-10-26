# Agent files

Several agent types work in this repo, so shared agent material lives in `.agents/`, not `.claude/`.

- Skills go in `.agents/skills/<name>/`; `.claude/skills` is a symlink to `../.agents/skills`.
- Put a file in `.claude/` only for a Claude-only feature (`settings.json` hooks and status line).
  Keep the scripts it runs in `.agents/` and reference them by path; symlink anything else needed.
- Ending a Claude session detaches a review (`session-review/on-session-end.sh`) that writes
  `.agents/review/pending/` for minutes. Commit `pending/` only once
  `pgrep -f 'session-review/SKILL.*-repos-exercise-tracker/'` finds nothing; a bare `session-review/SKILL`
  also matches other repos' reviews. Triage the queue with the `pending-review` skill.

# Code

- **Strict DRY.** Every piece of knowledge (a value, rule, type, query, style or piece of markup) has
  one home. Before writing code, search for an existing helper, component, constant or type and
  reuse or extend it. If the same logic would appear twice, extract it first and call it from both
  places. Copy-pasting and then editing the copy is never acceptable.
- **No new dependencies unless the user asks for one.** Build on the platform, Next.js, React and
  what `package.json` already has. If a package would clearly help, propose it and wait.
- **Icons live in `src/components/Icons.tsx`**, one exported component per icon, built on its shared
  `Icon` wrapper. Take each SVG from its page on https://lucide.dev (e.g. `https://lucide.dev/icons/copy`)
  and copy only the child elements (`<path>`, `<rect>`, …); never install `lucide-react`. Add an icon
  only when something uses it.
- **Database:** Neon Postgres, schema in `db/schema.sql`, connection string in `.env` as `DB_CONN_STR`.
  App code queries it only through `src/lib/db.ts` (Neon's HTTP endpoint over `fetch`, no driver).
  `.env` can't be sourced (unquoted `&`); for ad-hoc psql use `psql "$(sed -n 's/^DB_CONN_STR=//p' .env)"`.
- **Dev server:** the user usually keeps `next dev` running, and a second one in this repo exits with
  "Another next dev server is already running". Use the `appUrl` in `.next/dev/lock` instead.
- **Deploy:** pushing `main` deploys production through Vercel's git integration (project `exercise-tracker`,
  `prj_Z0tcb2sxtmW8K8pY6NKYVRsyVXCj`, team `team_qoOiTWNNItywejUoC28BZNDx`), served at https://exercise.vatsel.com.
- **Request-time values:** `next.config.ts` enables `cacheComponents`, so call `await connection()` before
  `new Date()` (e.g. `todayDate()`) in a server component; awaiting `searchParams` first doesn't suffice.
- **Check UI changes in a browser** at that `appUrl` before reporting them done. Every page except
  `/login` needs a session. Prefer Chrome DevTools: its profile persists, so a login there carries over,
  while Firefox automation starts logged out. If Chrome says its profile is already running, another
  session holds it; ask the user before closing it. If the browser lands on `/login`, ask the user to
  log in there; never report the change as unchecked without asking, and never create users or forge
  a session cookie to get past it.
  In Firefox DevTools, `fill_by_uid` garbles an ISO date in `<input type=date>`, so read `.value` back
  after filling; `confirm()` auto-cancels before `accept_dialog`, so stub `window.confirm` via `evaluate_script`.
  Chrome's `resize_page` won't go below 500px wide; for a phone width use `emulate` with
  `viewport: "375x812x2,mobile,touch"`.
  Chrome's `take_screenshot` writes a `filePath` only inside the repo; `/tmp` and the session scratchpad
  are refused, so save it in the repo and `mv` it out.
- **Scripts:** one-off Node scripts go in `scripts/` as `.mts`, run with `node --no-warnings scripts/<name>.mts`
  (Node 22 strips types). Import `src/` modules with their `.ts` extension; `tsconfig.json` allows it.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
