@echo off
REM run.bat — start the FastAPI backend on port 8000
cd /d "%~dp0"
echo Installing Python dependencies...
python -m pip install -r requirements.txt
echo.
echo Starting FastAPI on http://localhost:8000
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
