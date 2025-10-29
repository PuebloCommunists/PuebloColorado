@echo off
title ACP Revolution Server
echo ========================================
echo    ACP Revolution Backend Server
echo ========================================
echo.
echo Your server IP: 10.0.0.121
echo.
echo Starting server...
echo Server accessible at: http://10.0.0.121:3000
echo Local access at: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo ========================================
node server.js
pause