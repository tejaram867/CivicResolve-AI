@echo off
setlocal
cd /d "%~dp0"

echo.
echo  CivicResolve AI — Frontend + Backend + AI Engine
echo  ------------------------------------------------

REM --- Backend deps ---
if not exist "backend\node_modules\" (
  echo  [1/3] Installing backend dependencies...
  pushd backend
  call npm install
  if errorlevel 1 (
    echo  npm install failed. Install Node.js LTS from https://nodejs.org/
    pause
    exit /b 1
  )
  popd
) else (
  echo  [1/3] Backend dependencies OK
)

REM --- AI engine (optional second window) ---
if exist "ai-engine\api.py" (
  echo  [2/3] Starting AI engine on :8000 in a new window...
  start "CivicResolve AI Engine" cmd /k "cd /d ""%~dp0ai-engine"" && if not exist venv\Scripts\activate.bat (python -m venv venv) && call venv\Scripts\activate.bat && pip install -r requirements.txt && uvicorn api:app --host 0.0.0.0 --port 8000"
) else (
  echo  [2/3] ai-engine folder not found — skipping AI
)

echo  [3/3] Starting Node server ^(frontend + API^) on :3001...
echo.
echo  Open:        http://localhost:3001/
echo  Login:       http://localhost:3001/login.html
echo  API health:  http://localhost:3001/api/health
echo  AI health:   http://localhost:8000/health
echo  AI bridge:   http://localhost:3001/api/ai-health
echo.
echo  Keep BOTH windows open. Press Ctrl+C here to stop the Node server.
echo.

pushd backend
node server.js
popd
pause
