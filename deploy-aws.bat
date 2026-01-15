@echo off
REM AWS Deployment Script for Sea Battle Game (Windows)
REM This script sets up and runs the application on AWS Windows Server

echo Starting Sea Battle deployment...

REM Set environment variables
if "%PORT%"=="" set PORT=3001
if "%CLIENT_URL%"=="" set CLIENT_URL=http://localhost:5173
if "%NODE_ENV%"=="" set NODE_ENV=production

REM Install dependencies if not present
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)

REM Build the frontend
echo Building frontend...
call npm run build

REM Install PM2 globally if not installed
where pm2 >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Installing PM2...
    call npm install -g pm2
)

REM Start the server with PM2
echo Starting server with PM2...
call pm2 delete sea-battle-server 2>nul
call pm2 start backend/server.js --name sea-battle-server

REM Serve the built frontend with PM2
echo Starting frontend server...
call pm2 delete sea-battle-frontend 2>nul
call pm2 serve dist 8080 --spa --name sea-battle-frontend

REM Save PM2 process list
call pm2 save

echo Deployment complete!
echo Server running on port %PORT%
echo Frontend running on port 8080
echo.
echo Useful commands:
echo   pm2 status        - Check application status
echo   pm2 logs          - View logs
echo   pm2 restart all   - Restart all services
echo   pm2 stop all      - Stop all services

pause
