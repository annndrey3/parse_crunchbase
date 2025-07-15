@echo off
REM Установить ngrok authtoken из переменной окружения, если задан
if not "%NGROK_AUTHTOKEN%"=="" (
  E:\scraper\ngrok.exe config add-authtoken %NGROK_AUTHTOKEN%
)
REM Запуск парсера (если он не запущен)
start "" cmd /k "cd /d E:\scraper && node crunchbase_pipeline.js --file company_urls.txt"

REM Подождать 5 секунд, чтобы парсер успел стартовать
timeout /t 5

REM Запуск ngrok для порта 3000
start "" cmd /k "E:\scraper\ngrok.exe http 3000"

REM Подождать 5 секунд, чтобы ngrok успел стартовать
timeout /t 5

REM Найти публичный адрес ngrok и скопировать в буфер обмена и файл
for /f "tokens=2 delims= " %%a in ('findstr /R /C:"https://[a-z0-9]*\\.ngrok-free\\.app" ngrok.log') do (
    echo https://%%a > ngrok_url.txt
    echo https://%%a | clip
    goto :done
)
:done
echo Публичный адрес ngrok скопирован в буфер обмена и сохранён в ngrok_url.txt
pause