@echo off
REM frontend-run.bat — start the Vite dev server on port 5173
cd /d "%~dp0"
if not exist node_modules (
  echo Installing Node dependencies...
  npm install
)
echo Starting Vite on http://localhost:5173
npm run dev
