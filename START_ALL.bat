@echo off
REM Quick launcher for Emotion Voice Application
REM Double-click this file to start both backend and frontend

echo.
echo ============================================================
echo   EMOTION VOICE - Starting Application
echo ============================================================
echo.

set "VENV_PY=%~dp0backend\venv\Scripts\python.exe"
if not exist "%VENV_PY%" (
    echo Backend venv not found. Run:
    echo   cd backend ^&^& py -3.11 -m venv venv ^&^& venv\Scripts\pip install -r requirements.txt
    pause
    exit /b 1
)

"%VENV_PY%" "%~dp0start_all.py"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ============================================================
    echo   Error starting application
    echo ============================================================
    echo.
    pause
)
