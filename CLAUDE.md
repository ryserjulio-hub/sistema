# CLAUDE.md

Instruções de contexto para o Claude (ou outros agentes de IA) trabalharem neste repositório.

## Sobre o projeto

Plataforma de IA para análise macroeconômica, modelagem econométrica, forecasting e apoio à decisão de investimento — **apenas análise e recomendações, sem execução automática de ordens**.

## Convenções de código

- Python: PEP8, type hints, docstrings em português ou inglês (definir padrão)
- Backend: (definir stack — Node/Express? FastAPI?)
- Frontend: React
- Commits: Conventional Commits (`feat:`, `fix:`, `docs:`, etc.)

## Diretrizes para agentes de IA

- Sempre consultar `docs/` antes de propor mudanças de arquitetura
- Não implementar execução real de ordens/trades sem confirmação explícita
- Validar modelos econométricos com rotinas em `stata/` quando aplicável
- Manter `ROADMAP.md` atualizado ao concluir marcos

## Comandos úteis

```bash
# (preencher conforme stack for definida)
```
