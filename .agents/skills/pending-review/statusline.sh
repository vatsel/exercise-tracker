#!/bin/bash
# Status line: flags AGENTS.md proposals that are waiting for /pending-review. Prints nothing
# when the queue is empty.

payload=$(cat)
project_dir=$(echo "$payload" | jq -r '.workspace.project_dir')
pending_dir="$project_dir/.agents/review/pending"

pending_count=$(find "$pending_dir" -maxdepth 1 -name '*.patch' 2>/dev/null | wc -l | tr -d ' ')

if [ "$pending_count" -eq 1 ]; then
  noun="proposal"
else
  noun="proposals"
fi
if [ "$pending_count" -gt 0 ]; then
  printf '\033[33m%s %s pending review\033[0m · /pending-review\n' "$pending_count" "$noun"
fi
