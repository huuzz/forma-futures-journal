@echo off
if exist "%~dp0..\Forma Journal\Forma Journal.exe" (
  start "" "%~dp0..\Forma Journal\Forma Journal.exe"
  exit /b
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\launch.ps1"
