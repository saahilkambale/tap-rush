@echo off
title TAP RUSH Local HTTP Server
echo ========================================================
echo               TAP RUSH - ARCADE HTTP SERVER
echo ========================================================
echo.
echo Starting local server at http://localhost:3000/
echo.
start "" "http://localhost:3000/"

where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    node server.js
) else (
    set ELECTRON_RUN_AS_NODE=1
    "C:\Users\Sachin\AppData\Local\Programs\antigravity\Antigravity.exe" server.js
)

pause
