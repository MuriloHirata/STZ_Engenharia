@echo off
rem Gate de merge (AGENTS.md) — Windows: lint + testes + verificação do site + build
node "%~dp0check.js" %*
