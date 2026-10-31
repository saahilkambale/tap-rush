@echo off
set "HTML_FILE=%~dp0index.html"

REM 1. Try launching Google Chrome
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" "%HTML_FILE%"
    exit
)

REM 2. Try launching Microsoft Edge
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" "%HTML_FILE%"
    exit
)

REM 3. Fallback to Windows default web browser
start "" "%HTML_FILE%"
exit
