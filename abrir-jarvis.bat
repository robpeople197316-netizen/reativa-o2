@echo off
chcp 65001 >nul 2>nul
title JARVIS CORE - Salao
cd /d "%~dp0"

echo.
echo   ====================================
echo     JARVIS CORE - Gestao de Salao
echo   ====================================
echo.

rem --- 1. O Node.js esta instalado? ---
where node >nul 2>nul
if errorlevel 1 goto sem_node

rem --- 2. Primeira vez? Instala as dependencias. ---
if exist "node_modules\next\package.json" goto tem_modulos
echo   Primeira vez aqui: preparando o sistema.
echo   Isso demora 1 a 3 minutos. Nao feche esta janela.
echo.
call npm install --no-audit --no-fund
if errorlevel 1 goto falha_install
echo.
:tem_modulos

rem --- 3. Cria o arquivo de chaves, se ainda nao existir. ---
if not exist ".env.local" if exist ".env.example" copy ".env.example" ".env.local" >nul

rem --- 4. Abre o navegador alguns segundos depois, quando o servidor subir. ---
start "abrindo" /min cmd /c "timeout /t 9 >nul && start http://localhost:3000"

echo   Ligando o JARVIS...
echo   O navegador abre sozinho em alguns segundos.
echo.
echo   Endereco: http://localhost:3000
echo   Para desligar: feche esta janela.
echo.
call npm run dev
goto fim

:sem_node
echo   [!] O Node.js nao esta instalado neste computador.
echo.
echo   Ele e necessario para o sistema funcionar.
echo   Vou abrir a pagina de download. Baixe a versao LTS,
echo   instale clicando em Avancar ate o fim, e depois abra
echo   este arquivo de novo.
echo.
start "" https://nodejs.org/pt-br/download
pause
goto fim

:falha_install
echo.
echo   [!] A preparacao falhou.
echo   Verifique se este computador esta conectado a internet
echo   e abra este arquivo de novo.
echo.
pause

:fim
