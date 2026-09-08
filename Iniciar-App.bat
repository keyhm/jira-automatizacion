@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules" (
  echo Instalando dependencias del servidor por primera vez...
  call npm install
)

if not exist "client\node_modules" (
  echo Instalando dependencias del cliente por primera vez...
  call npm install --prefix client
)

echo Iniciando Jira Automation QA...
start "Jira Automation QA" cmd /k "npm run app"

echo Esperando a que el servidor arranque...
timeout /t 6 /nobreak >nul

set CHROME=
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" set "CHROME=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"

if defined CHROME (
  start "" "%CHROME%" "http://localhost:5173"
) else (
  start "" "http://localhost:5173"
)

endlocal
