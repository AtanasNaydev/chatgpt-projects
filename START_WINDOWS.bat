@echo off
chcp 65001 > nul
cd /d "%~dp0"
title МИСИЯ 404 - Сървър за учебния час
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 server.py
) else (
  where python >nul 2>nul
  if %errorlevel%==0 (
    python server.py
  ) else (
    echo.
    echo Не е открит Python. Инсталирайте Python 3 от python.org
    echo При инсталацията включете Add Python to PATH.
    echo.
    pause
    exit /b 1
  )
)
pause
