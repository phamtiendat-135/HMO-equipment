@echo off
chcp 65001 > nul
echo ============================================
echo   HMO Equipment - Push len GitHub Pages
echo ============================================
echo.

cd /d "%~dp0"

echo [0/4] Xoa lock file cu neu ton tai...
if exist ".git\index.lock" del /f ".git\index.lock" && echo   Xoa index.lock thanh cong
if exist ".git\objects\maintenance.lock" del /f ".git\objects\maintenance.lock"

echo.
echo [1/4] Kiem tra thay doi...
git status --short
echo.

echo [2/4] Staging cac file da sua...
git add index.html QR_Landing_Page.html sw.js Kich_ban_video_HMO_Eq.docx Slide_intro_outro_HMO_Eq.pptx HMO_Master_Equipment_Database.xlsx update_managers.py

echo [3/4] Commit...
git commit -m "feat(thang 6): PWA cai dat app 3 nen tang; kich ban video huong dan; slide intro/outro 9:16" 2>nul || echo (Khong co gi moi de commit)

echo [4/4] Push len GitHub...
git push

echo.
if %ERRORLEVEL% == 0 (
    echo  THANH CONG! GitHub Pages se cap nhat trong 1-2 phut.
    echo  Kiem tra tai: https://phamtiendat-135.github.io/HMO-equipment/
) else (
    echo  LOI push. Nhap GitHub username va Personal Access Token khi duoc hoi.
    echo  Tao token tai: https://github.com/settings/tokens
)
echo.
pause
