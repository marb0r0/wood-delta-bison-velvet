@echo off
chcp 65001 >nul
title Football Intelligence
cd /d "%~dp0"

:MENU
cls
echo.
echo  ========================================================
echo       GLOBAL FOOTBALL INTELLIGENCE
echo  ========================================================
echo.
echo    [1]  Instalar tudo (primeira vez)
echo    [2]  Arrancar API + Frontend  (recomendado)
echo    [3]  Arrancar so a API
echo    [4]  Arrancar so o Frontend
echo    [5]  Carregar dados de demonstracao
echo    [6]  Abrir documentacao no browser
echo    [7]  Correr testes unitarios
echo    [0]  Sair
echo.
echo  ========================================================
echo.
set /p OPCAO="  Escolhe uma opcao: "

if "%OPCAO%"=="1" goto INSTALL
if "%OPCAO%"=="2" goto START_ALL
if "%OPCAO%"=="3" goto START_API
if "%OPCAO%"=="4" goto START_UI
if "%OPCAO%"=="5" goto SEED
if "%OPCAO%"=="6" goto DOCS
if "%OPCAO%"=="7" goto TEST
if "%OPCAO%"=="0" exit /b 0
echo  Opcao invalida.
timeout /t 2 >nul
goto MENU

:INSTALL
echo.
echo  [INSTALL] A verificar Python...
where python >nul 2>&1
if errorlevel 1 (
  echo  ERRO: Python nao encontrado. Instala Python 3.11+ de https://python.org
  echo  Marca a opcao "Add Python to PATH" na instalacao.
  pause
  goto MENU
)
python --version
echo.
echo  [INSTALL] A criar ambiente virtual .venv ...
if not exist ".venv\Scripts\python.exe" (
  python -m venv .venv
)
call .venv\Scripts\activate.bat
echo  [INSTALL] A instalar dependencias Python...
python -m pip install --upgrade pip
pip install -e ".[dev]"
if errorlevel 1 (
  echo  ERRO no pip install.
  pause
  goto MENU
)
echo.
echo  [INSTALL] A verificar Node.js...
where node >nul 2>&1
if errorlevel 1 (
  echo  AVISO: Node.js nao encontrado. O frontend React precisa de Node 18+.
  echo  Descarrega em https://nodejs.org
) else (
  node --version
  echo  [INSTALL] A instalar dependencias do frontend...
  pushd frontend
  call npm install
  popd
)
echo.
echo  Instalacao concluida.
pause
goto MENU

:START_ALL
call :ENSURE_VENV
if errorlevel 1 goto MENU
echo  A arrancar API em nova janela (porta 8000)...
start "Football API" cmd /k "cd /d "%~dp0" && call .venv\Scripts\activate.bat && uvicorn football_ai.main:app --reload --host 127.0.0.1 --port 8000"
timeout /t 3 >nul
where node >nul 2>&1
if errorlevel 1 (
  echo  Node.js em falta - so a API foi arrancada.
  echo  Abre http://127.0.0.1:8000/docs
) else (
  echo  A arrancar Frontend React em nova janela (porta 3000)...
  start "Football UI" cmd /k "cd /d "%~dp0frontend" && npm run dev -- --host 127.0.0.1 --port 3000"
  timeout /t 4 >nul
  start "" "http://127.0.0.1:3000"
)
echo.
echo  API:       http://127.0.0.1:8000/docs
echo  Frontend:  http://127.0.0.1:3000
echo.
pause
goto MENU

:START_API
call :ENSURE_VENV
if errorlevel 1 goto MENU
start "Football API" cmd /k "cd /d "%~dp0" && call .venv\Scripts\activate.bat && uvicorn football_ai.main:app --reload --host 127.0.0.1 --port 8000"
timeout /t 2 >nul
start "" "http://127.0.0.1:8000/docs"
pause
goto MENU

:START_UI
where node >nul 2>&1
if errorlevel 1 (
  echo  ERRO: Node.js nao encontrado.
  pause
  goto MENU
)
if not exist "frontend\node_modules" (
  echo  A instalar npm packages...
  pushd frontend
  call npm install
  popd
)
start "Football UI" cmd /k "cd /d "%~dp0frontend" && npm run dev -- --host 127.0.0.1 --port 3000"
timeout /t 3 >nul
start "" "http://127.0.0.1:3000"
pause
goto MENU

:SEED
call :ENSURE_VENV
if errorlevel 1 goto MENU
call .venv\Scripts\activate.bat
python scripts\seed_demo.py
pause
goto MENU

:DOCS
start "" "https://github.com"
if exist "README.md" start "" notepad "README.md"
pause
goto MENU

:TEST
call :ENSURE_VENV
if errorlevel 1 goto MENU
call .venv\Scripts\activate.bat
pytest -q -m "not integration"
pause
goto MENU

:ENSURE_VENV
if not exist ".venv\Scripts\python.exe" (
  echo  Ambiente virtual em falta. Corre a opcao [1] Instalar primeiro.
  pause
  exit /b 1
)
exit /b 0
