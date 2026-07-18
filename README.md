# N8N Automation

Workflows de automação (arquivos `.json` exportados do n8n) que orquestram
o pipeline de dados, modelos e notificações.

- `workflows/` — arquivos de workflow exportados
  - `portfolio_rebalance_recommendation.json` — chama a Portfolio Manager
    API (`python/agents/api.py`) mensalmente, avalia se a carteira precisa
    de rebalanceamento e alerta via Slack quando necessário.
  - `workflow_health_monitor.json` — roda diariamente, verifica via API do
    próprio n8n se os workflows críticos estão ativos e alerta via Slack se
    algum estiver pausado ou tiver sumido.

Ver `docs/11_N8N_AUTOMATION.md` para detalhes de importação e configuração,
e `docs/16_SECURITY.md` para os runbooks operacionais e de segurança que
motivaram o monitor de workflows.
