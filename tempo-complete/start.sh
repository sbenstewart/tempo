#!/bin/bash
# ═══════════════════════════════════════════════════════
# Tempo — Start Script (runs backend + frontend)
# ═══════════════════════════════════════════════════════

set -e

if [ -f .env ]; then
  echo "📋 Loading .env..."
  export $(grep -v '^#' .env | grep -v '^\s*$' | xargs)
fi

echo ""
echo "🐍 Setting up Python backend..."
cd backend
pip3 install -r requirements.txt -q 2>/dev/null || pip install -r requirements.txt -q
cd ..

echo "📦 Setting up React frontend..."
cd frontend
if [ ! -d "node_modules" ]; then npm install; fi
cd ..

echo ""
echo "═══════════════════════════════════════════════════"
echo "  🎹 Tempo — Your AI Music Tutor"
echo "═══════════════════════════════════════════════════"
echo ""
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:5173"
echo ""
echo "  Open http://localhost:5173 in Chrome"
echo "═══════════════════════════════════════════════════"
echo ""

cd backend && python3 server.py &
PID1=$!
cd ../frontend && npm run dev &
PID2=$!

trap "kill $PID1 $PID2 2>/dev/null; exit" SIGINT SIGTERM
wait
