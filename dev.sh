#!/bin/bash
# Run the backend and the frontend together with one command:
#
#   ./dev.sh
#
# Backend:  http://localhost:6478   (server/, `npm run dev`)
# Frontend: http://localhost:5173   (client/, Vite)
# Press Ctrl+C once to stop both.
#
# NOTE: the backend reads server/.env. If that points at the production
# database, everything you do locally changes live data.
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

install_if_missing() {
  if [ ! -d "$ROOT/$1/node_modules" ]; then
    echo "📦 Installing $1 dependencies..."
    (cd "$ROOT/$1" && npm install)
  fi
}

install_if_missing server
install_if_missing client

if [ ! -f "$ROOT/server/.env" ]; then
  echo "❌ server/.env is missing - copy it before starting the backend."
  exit 1
fi

for port in 6478 5173; do
  if lsof -iTCP:$port -sTCP:LISTEN -P >/dev/null 2>&1; then
    echo "❌ Port $port is already in use. Stop whatever is running there first"
    echo "   (find it with: lsof -iTCP:$port -sTCP:LISTEN -P)."
    exit 1
  fi
done

STOPPING=0
cleanup() {
  [ "$STOPPING" = "1" ] && return
  STOPPING=1
  echo ""
  echo "🛑 Stopping backend and frontend..."
  # npm/vite/tsx spawn their own children, so stop whatever is listening on our ports.
  for port in 6478 5173; do
    lsof -tiTCP:$port -sTCP:LISTEN 2>/dev/null | xargs kill 2>/dev/null || true
  done
  pkill -f "$ROOT/server/node_modules/.bin/tsx watch" 2>/dev/null || true
  pkill -f "$ROOT/client/node_modules/.bin/vite" 2>/dev/null || true
  pkill -P $$ 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM EXIT

echo "🚀 Starting backend  -> http://localhost:6478"
(cd "$ROOT/server" && npm run dev 2>&1 | sed -u 's/^/[server] /') &

echo "🚀 Starting frontend -> http://localhost:5173"
(cd "$ROOT/client" && npx vite --port 5173 --strictPort 2>&1 | sed -u 's/^/[client] /') &

wait
