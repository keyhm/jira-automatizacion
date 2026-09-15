@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

set NEEDS_INSTALL=0

if exist ".git" (
  echo Buscando actualizaciones...
  for /f "delims=" %%h in ('git rev-parse HEAD 2^>nul') do set BEFORE=%%h

  git pull --ff-only
  if errorlevel 1 (
    echo No se pudo actualizar automaticamente ^(sin conexion, o tienes cambios locales sin guardar^).
    echo Continuando con la version que ya tienes...
  ) else (
    for /f "delims=" %%h in ('git rev-parse HEAD 2^>nul') do set AFTER=%%h
    if not "!BEFORE!"=="!AFTER!" (
      echo Se encontraron cambios nuevos.
      git diff --name-only !BEFORE! !AFTER! | findstr /I "package.json package-lock.json" >nul
      if not errorlevel 1 set NEEDS_INSTALL=1
    )
  )
) else (
  echo ^(Esta copia no es un clon de git, no se puede autoactualizar. Ver README.^)
)

if not exist "node_modules" set NEEDS_INSTALL=1
if not exist "client\node_modules" set NEEDS_INSTALL=1

if "!NEEDS_INSTALL!"=="1" (
  echo Instalando/actualizando dependencias...
  call npm install
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
