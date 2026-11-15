@echo off
title JIDO site
cd /d "%~dp0"
where node >NUL 2>NUL || (echo Node.js is not installed. Get the LTS version from https://nodejs.org then run this again. & pause & exit /b 1)
if not exist node_modules (
  echo Installing - first time only, takes about a minute...
  call npm.cmd install || (echo Install failed. & pause & exit /b 1)
)
echo Starting JIDO at http://localhost:3000  ^(keep this window open, close it to stop^)
start "" cmd /c "timeout /t 8 >NUL & start http://localhost:3000"
call npm.cmd run dev
pause
