@echo off
echo  🎹 Tempo — Setting up...
cd backend
pip install -r requirements.txt -q
cd ..
cd frontend
if not exist node_modules npm install
cd ..
echo  Backend:  http://localhost:8000
echo  Frontend: http://localhost:5173
start "Tempo Backend" cmd /c "cd backend && python server.py"
cd frontend
npm run dev
