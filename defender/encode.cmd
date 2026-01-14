@echo off
cd /d "%~dp0"
del /f /q messages.txt 2>nul
powershell -Command "[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Get-Content -Path 'messages.json' -Raw -Encoding UTF8)))" > messages.txt
echo 编码完成
