@echo off
chcp 65001 >nul
echo ========================================
echo   Savdo Apparati - Ishga tushirish
echo ========================================
echo.
cd /d "%~dp0"

echo Eski server jarayonlari tozalanmoqda...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1
timeout /t 1 /nobreak >nul

echo Backend server ishga tushmoqda...
start "Backend Server" cmd /k "node server\index.cjs"

echo.
echo Backend tekshirilmoqda...
timeout /t 4 /nobreak >nul
netstat -ano | findstr :3001 | findstr LISTENING >nul 2>&1
if errorlevel 1 (
    echo [XATOLIK] Backend server ishga tushmadi! 3001-port ochilmadi.
    echo Qayta urinish: node server\index.cjs buyrug'ini qo'lda ishga tushiring.
    pause
    exit /b 1
) else (
    echo [OK] Backend server 3001-portda ishga tushdi!
)

echo.
echo 3 soniya kutib Vite (Frontend) ishga tushmoqda...
timeout /t 3 /nobreak >nul

echo Frontend ishga tushmoqda...
start "Frontend" cmd /k "npx vite"

echo.
echo ========================================
echo   Ikkala server ham ishga tushdi!
echo   Backend:  http://localhost:3001
echo   Frontend: http://localhost:5173
echo ========================================
echo.
timeout /t 2 /nobreak >nul
start http://localhost:5173
echo Dastur brauzerda ochildi.
echo Serverlar fonda ishlamoqda.
echo Ushbu oynani yopishingiz mumkin.
timeout /t 5 >nul
exit
