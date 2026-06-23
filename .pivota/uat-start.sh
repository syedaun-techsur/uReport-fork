#!/usr/bin/env bash
# Idempotent, detached UAT app launcher (written by verify-express). Re-run after
# any code fix to (re)start the app — it frees the port first.
set -u
PORT="${UAT_PORT:-3000}"
BS="${BUILD_SYSTEM:-npm}"
LOG=/tmp/pivota-uat-app.log
# Free the port + any prior server so re-runs are clean.
PRIOR_PID="$(cat /tmp/pivota-uat-app.pid 2>/dev/null || true)"
if [ -n "$PRIOR_PID" ] && kill -0 "$PRIOR_PID" 2>/dev/null; then
  PGID="$(ps -o pgid= -p "$PRIOR_PID" 2>/dev/null | tr -d ' ')"
  if [ -n "$PGID" ]; then kill -TERM "-${PGID}" 2>/dev/null || true; fi
  kill -TERM "$PRIOR_PID" 2>/dev/null || true
fi
fuser -k "${PORT}/tcp" 2>/dev/null || true
sleep 1
if [ ! -f package.json ]; then
  echo "[uat] no package.json found" >&2
  exit 1
fi
# NestJS production start (dist/src/main.js is where nest build outputs to)
RUN_CMD='node dist/src/main'
setsid bash -c "$RUN_CMD" > "$LOG" 2>&1 < /dev/null &
echo "$!" > /tmp/pivota-uat-app.pid
echo "[uat] launched detached on :${PORT} (log: $LOG)"
