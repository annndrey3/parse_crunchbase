@echo off
REM Запуск ngrok для порта 3000
cd /d E:\scraper
start "" ngrok.exe http 3000
pause 