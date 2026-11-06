@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Football Intelligence - Start

if not exist ".venv\Scripts\python.exe" (
  echo Primeira execucao: a instalar...
  python -m venv .venv
  call .venv\Scripts\activate.bat
  python -m pip install --upgrade pip
  pip install -e ".[dev]"
  if exist "frontend\package.json" (
    where node >nul 2>&1 && (
      pushd frontend
      call npm install
      popd
    )
  )
) else (
  call .venv\Scripts\activate.bat
)

echo A iniciar API...
start "Football API" cmd /k "cd /d "%~dp0" && call .venv\Scripts\activate.bat && uvicorn football_ai.main:app --reload --host 127.0.0.1 --port 8000"
timeout /t 3 >nul

where node >nul 2>&1
if not errorlevel 1 (
  if not exist "frontend\node_modules" (
    pushd frontend
    call npm install
    popd
  )
  echo A iniciar Frontend...
  start "Football UI" cmd /k "cd /d "%~dp0frontend" && npm run dev -- --host 127.0.0.1 --port 3000"
  timeout /t 4 >nul
  start "" "http://127.0.0.1:3000"
) else (
  start "" "http://127.0.0.1:8000/docs"
)

echo.
echo  API:      http://127.0.0.1:8000/docs
echo  Frontend: http://127.0.0.1:3000
echo.
echo Podes fechar esta janela. As outras ficam a correr.
pause
