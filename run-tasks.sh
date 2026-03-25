#!/bin/bash
set -e

TASKS_DIR="tasks"
PROGRESS="progress.md"

# Get all task files sorted numerically
TASK_FILES=$(ls "$TASKS_DIR"/*.md 2>/dev/null | sort -t/ -k2 -V)

if [ -z "$TASK_FILES" ]; then
  echo "No task files found in $TASKS_DIR/"
  exit 1
fi

FAILED=0

for TASK_FILE in $TASK_FILES; do
  TASK_NUM=$(basename "$TASK_FILE" .md)
  TASK_TITLE=$(head -1 "$TASK_FILE" | sed 's/^# Task [0-9]*: //')

  # Check if already done in progress.md
  if grep -q "\[x\] $TASK_NUM" "$PROGRESS" 2>/dev/null; then
    echo "-- Task $TASK_NUM already complete, skipping."
    continue
  fi

  echo ""
  echo "========================================"
  echo ">>  Running Task $TASK_NUM: $TASK_TITLE"
  echo "========================================"
  echo ""

  # Run the agent — prompt is just the skill invocation, the skill handles the rest
  if ! claude --dangerously-skip-permissions -p "/execute @tasks/$TASK_NUM.md"; then
    echo ""
    echo "!! Task $TASK_NUM: claude exited with non-zero status. Stopping."
    exit 1
  fi

  # Verify the agent actually marked the task complete
  if ! grep -q "\[x\] $TASK_NUM" "$PROGRESS" 2>/dev/null; then
    echo ""
    echo "!! Task $TASK_NUM: agent finished but did not mark task complete in progress.md. Stopping."
    exit 1
  fi

  echo ""
  echo "** Task $TASK_NUM complete."
done

if [ "$FAILED" -eq 0 ]; then
  echo ""
  echo "========================================"
  echo "All tasks complete!"
  echo "========================================"
fi
