#!/bin/bash
set -e

TASKS_DIR="tasks"
PROGRESS="progress.md"
TASK_TIMEOUT="30m"
MAX_RETRIES=1

# --- Input validation ---
if [ ! -d "$TASKS_DIR" ]; then
  echo "!! Tasks directory '$TASKS_DIR' does not exist."
  exit 1
fi

if [ ! -f "$PROGRESS" ]; then
  echo "!! Progress file '$PROGRESS' does not exist."
  exit 1
fi

# --- Cleanup trap: reset uncommitted changes on failure ---
cleanup_on_failure() {
  local exit_code=$?
  if [ $exit_code -ne 0 ]; then
    echo ""
    echo "!! Script exited with status $exit_code. Resetting uncommitted changes."
    git checkout . 2>/dev/null || true
    git clean -fd 2>/dev/null || true
  fi
}
trap cleanup_on_failure EXIT

# --- Collect task files via globbing (safe for spaces) ---
TASK_FILES=()
for f in "$TASKS_DIR"/*.md; do
  [ -e "$f" ] && TASK_FILES+=("$f")
done

if [ ${#TASK_FILES[@]} -eq 0 ]; then
  echo "No task files found in $TASKS_DIR/"
  exit 1
fi

# Sort numerically by filename
IFS=$'\n' TASK_FILES=($(printf '%s\n' "${TASK_FILES[@]}" | sort -V)); unset IFS

for TASK_FILE in "${TASK_FILES[@]}"; do
  TASK_NUM=$(basename "$TASK_FILE" .md)
  # Extract title from first "# Task NNN:" heading (may not be line 1 due to HTML comments)
  TASK_TITLE=$(grep -m1 '^# Task [0-9]' "$TASK_FILE" | sed 's/^#[[:space:]]*Task [0-9]*:[[:space:]]*//' || echo "Unknown")

  # Check if already done — trailing space prevents "01" matching "010"
  if grep -q "^- \[x\] ${TASK_NUM} " "$PROGRESS" 2>/dev/null; then
    echo "-- Task $TASK_NUM already complete, skipping."
    continue
  fi

  echo ""
  echo "========================================"
  echo ">>  Running Task $TASK_NUM: $TASK_TITLE"
  echo "========================================"
  echo ""

  # Run the agent with timeout and retry
  ATTEMPT=0
  SUCCESS=false
  while [ $ATTEMPT -le $MAX_RETRIES ]; do
    if [ $ATTEMPT -gt 0 ]; then
      echo "** Retrying task $TASK_NUM (attempt $((ATTEMPT + 1))/$((MAX_RETRIES + 1)))..."
      git checkout . 2>/dev/null || true
    fi

    if timeout "$TASK_TIMEOUT" claude --dangerously-skip-permissions -p "/execute @tasks/$TASK_NUM.md"; then
      SUCCESS=true
      break
    fi

    echo "!! Task $TASK_NUM: attempt $((ATTEMPT + 1)) failed."
    ATTEMPT=$((ATTEMPT + 1))
  done

  if [ "$SUCCESS" = false ]; then
    echo ""
    echo "!! Task $TASK_NUM: all attempts exhausted. Stopping."
    exit 1
  fi

  # Verify the agent marked the task complete
  if ! grep -q "^- \[x\] ${TASK_NUM} " "$PROGRESS" 2>/dev/null; then
    echo ""
    echo "!! Task $TASK_NUM: agent finished but did not mark task complete in progress.md. Stopping."
    exit 1
  fi

  # Verify working tree is clean (agent should have committed)
  if [ -n "$(git status --porcelain)" ]; then
    echo ""
    echo "!! Task $TASK_NUM: working tree is dirty after agent run. Uncommitted changes detected. Stopping."
    exit 1
  fi

  echo ""
  echo "** Task $TASK_NUM complete."
done

echo ""
echo "========================================"
echo "All tasks complete!"
echo "========================================"
