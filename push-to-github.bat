@echo off
echo ========================================
echo   Push to GitHub: Wei-nb/We
echo ========================================
echo.
echo This will upload all files including large videos (LFS).
echo It may take several minutes depending on your internet speed.
echo.
cd /d "d:\Desktop\web"
git push -u origin master
echo.
echo ========================================
echo   Push completed! Check your repo at:
echo   https://github.com/Wei-nb/We
echo ========================================
pause
