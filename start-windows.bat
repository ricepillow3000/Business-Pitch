@echo off
title JIDO site
cd /d "%~dp0"
where node >NUL 2>NUL || (echo Node.js is not installed. Get the LTS version from https://nodejs.org then run this again. & pause & exit /b 1)

rem Close any older copy of the site still running on port 3000,
rem otherwise the browser keeps showing the old version.
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000 " ^| findstr LISTENING') do (
  if not "%%p"=="0" (
    echo Closing an older copy of the site that was still running...
    taskkill /f /pid %%p >NUL 2>NUL
  )
)

rem Clear the saved build so the newest files are always used.
if exist .next rmdir /s /q .next

if not exist node_modules (
  echo Installing - first time only, takes about a minute...
  call npm.cmd install || (echo Install failed. & pause & exit /b 1)
)
echo.
echo JIDO build 1.1.0 (10-block logo)
echo Starting at http://localhost:3000  ^(keep this window open, close it to stop^)
start "" cmd /c "timeout /t 8 >NUL & start http://localhost:3000"
call npm.cmd run dev -- -p 3000
pause
