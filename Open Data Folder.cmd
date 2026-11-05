@echo off
if not exist "%~dp0data" mkdir "%~dp0data"
explorer.exe "%~dp0data"
