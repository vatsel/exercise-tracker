#!/bin/bash
# SessionEnd hook: reviews the session that just ended with SKILL.md, in a detached
# headless run so closing the session is not held up. Proposals land in
# .agents/review/pending/; output goes to .agents/review/session-review.log.

# The headless review is itself a session; don't let its own end trigger another review.
if [ -n "$SESSION_REVIEW_RUNNING" ]; then
  exit 0
fi

payload=$(cat)
session_id=$(echo "$payload" | jq -r '.session_id')
transcript_path=$(echo "$payload" | jq -r '.transcript_path')

cd "$CLAUDE_PROJECT_DIR" || exit 0
mkdir -p .agents/review/pending
log_file=".agents/review/session-review.log"

prompt="Read and follow .agents/skills/session-review/SKILL.md. Review session $session_id; its transcript is $transcript_path. Queue proposals only; do not edit AGENTS.md."

{
  echo "######## $(date '+%Y-%m-%d %H:%M:%S') session $session_id"
  SESSION_REVIEW_RUNNING=1 claude -p "$prompt" \
    --no-session-persistence \
    --add-dir "$(dirname "$transcript_path")" \
    --allowedTools "Read" "Grep" "Glob" "Bash(git diff:*)" "Bash(git status:*)" "Bash(wc:*)" \
      "Edit(.agents/review/pending/**)" \
    --disallowedTools "Edit(AGENTS.md)"
} >> "$log_file" 2>&1 < /dev/null &
disown

exit 0
