# Agent files

Several agent types work in this repo, so shared agent material lives in `.agents/`, not `.claude/`.

- Skills go in `.agents/skills/<name>/`; `.claude/skills` is a symlink to `../.agents/skills`.
- Put a file in `.claude/` only for a Claude-only feature (`settings.json` hooks and status line).
  Keep the scripts it runs in `.agents/` and reference them by path; symlink anything else needed.
- Ending a Claude session detaches a review (`session-review/on-session-end.sh`) that writes
  `.agents/review/pending/` for minutes. Commit `pending/` only once `pgrep -f session-review/SKILL`
  finds nothing. Triage the queue with the `pending-review` skill.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
