@echo off
setlocal
cd /d "%~dp0"
title RAIDVERSE Aurora - Local Server
echo.
echo RAIDVERSE Aurora Edition - Local Windows Server
echo Folder: %CD%
echo Keep this terminal open. Ctrl+C stops the server.
echo.
where node.exe >nul 2>nul
if errorlevel 1 goto missingnode
where npm.cmd >nul 2>nul
if errorlevel 1 goto missingnode
if not exist "node_modules\tsx\dist\cli.mjs" goto missingdeps
if exist "dist\index.html" goto run
echo Building the existing frontend...
call npm.cmd run build
if errorlevel 1 goto failed
:run
echo Starting backend and compiled frontend together on the configured port.
echo Default address: http://localhost:3000
echo.
call npm.cmd start
set "raidverse_exit=%ERRORLEVEL%"
echo.
echo RAIDVERSE stopped. Exit code: %raidverse_exit%
echo Read the error above before closing this terminal.
pause
exit /b %raidverse_exit%
:missingnode
echo ERROR: Node.js 24+ and npm must be installed and available in PATH.
goto failed
:missingdeps
echo ERROR: Dependencies are missing. In this folder run npm.cmd ci first.
:failed
echo Server was not started. No data or credentials were changed.
pause
exit /b 1
