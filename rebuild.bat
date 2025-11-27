@echo off
echo Rebuilding Aether Player...
cd /d "%~dp0"
npx electron-packager . "Aether Player" --platform=win32 --arch=x64 --out=dist --overwrite
echo.
echo Done! Press any key to exit.
pause
