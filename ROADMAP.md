# Roadmap

## Fase 0 — Scaffold (concluído)
- [x] Estrutura de pastas e documentação inicial

## Fase 1 — Fundação
- [ ] Definir stack de backend
- [ ] Modelar schema do banco de dados (`docs/06_DATABASE.md`)
- [ ] Especificar fontes de dados do pipeline (`docs/04_DATA_PIPELINE.md`)

## Fase 2 — Modelagem
- [ ] Implementar modelos econométricos iniciais (`python/`, `stata/`)
- [ ] Validar modelos em Stata (`docs/14_STATA_VALIDATION.md`)

## Fase 3 — Forecast & Portfolio
- [ ] Forecast engine (`docs/08_FORECAST_ENGINE.md`)
- [x] Portfolio manager — agente economista v1 implementado
      (`python/agents/economist_portfolio_agent.py`, ver `docs/09_PORTFOLIO_MANAGER.md`).
      Pendente: calibrar premissas de retorno/risco com os modelos da Fase 2
      e conectar ao Forecast Engine real.
- [ ] Risk engine (`docs/10_RISK_ENGINE.md`)

## Fase 4 — Automação e Interface
- [x] Workflows n8n — recomendação de rebalanceamento
      (`n8n/workflows/portfolio_rebalance_recommendation.json`) e monitor de
      saúde dos workflows (`n8n/workflows/workflow_health_monitor.json`), ver
      `docs/11_N8N_AUTOMATION.md`. Pendente: substituir nós "mock" por
      integrações reais (Data Pipeline, Database, Dashboard).
- [ ] Dashboards (`docs/12_DASHBOARDS.md`)
- [x] APIs — endpoint inicial do Portfolio Manager
      (`python/agents/api.py`, ver `docs/13_APIS.md`). Demais módulos
      (Data Pipeline, Forecast Engine, Risk Engine) ainda sem API.

## Fase 5 — Deploy e Segurança
- [ ] Deployment (`docs/15_DEPLOYMENT.md`)
- [x] Security — runbooks iniciais (`docs/16_SECURITY.md`): falha de
      autenticação yfinance, workflow n8n pausado, tentativa de acesso
      negada. Pendente: autenticação real na Portfolio Manager API,
      rate-limiting, WAF.
