# 11 — N8N Automation

## Workflow: Recomendação de Rebalanceamento de Portfólio (Longo Prazo)

Arquivo: `n8n/workflows/portfolio_rebalance_recommendation.json`

### O que faz

1. **Agendamento Mensal** (`0 7 1 * *`) — dispara todo dia 1 às 07:00.
   Rebalanceamento de longo prazo não precisa de cadência diária/5-min como
   os workflows de sincronização de mercado já existentes.
2. **Preparar Dados (mock)** — hoje contém valores fixos de exemplo (mesma
   carteira mock do dashboard e o cenário macro do ticker). **Substituir**
   por nós que leiam a carteira real do Database (docs/06) e o cenário macro
   real do Data Pipeline / BACEN-SGS / IBGE-SIDRA (docs/04) quando essas
   integrações existirem.
3. **Montar Requisição** (Code) — monta o corpo JSON esperado pela API.
4. **Gerar Recomendação** (HTTP Request) — `POST` para
   `{{ $env.PORTFOLIO_API_BASE_URL }}/api/v1/portfolio/recommendation`
   (serviço `portfolio-api` do `docker-compose.yml`, ver `docs/13_APIS.md`).
5. **Avaliar Rebalanceamento** (Code) — calcula o maior desvio de peso
   (`delta_weight`) entre a carteira atual e a alocação-alvo. Limiar padrão:
   **3 pontos percentuais** (ajustável na constante `threshold` do node).
6. **Necessário Rebalancear?** (IF) — ramifica conforme o limiar acima.
7. **Alerta de Rebalanceamento → Slack** — só roda se algum desvio relevante
   for encontrado. **Requer credencial Slack configurada manualmente** no
   n8n antes de ativar o workflow (canal padrão sugerido: `#portfolio-alerts`).
8. **Nenhuma Ação Necessária** (No Operation) — caminho quando nada relevante
   mudou.
9. **Sync Recomendação → Dashboard** — `POST` para um endpoint placeholder
   (`http://backend:8000/api/v1/portfolio/latest-recommendation`), a ser
   ajustado quando o backend/dashboard tiver um endpoint real para consumir
   e exibir a última recomendação (módulo Portfolio Manager do frontend).

### Como importar

1. Suba os serviços: `docker compose up -d portfolio-api n8n` (a partir de
   `docker/`).
2. Acesse o n8n em `http://localhost:5678`.
3. `Workflows → Import from File` e selecione
   `n8n/workflows/portfolio_rebalance_recommendation.json`
   (o compose já monta a pasta `n8n/workflows/` como leitura auxiliar em
   `/home/node/.n8n/workflows-import`, mas a importação manual pela UI
   também funciona a partir do arquivo local).
4. Configure a credencial do Slack no node **Alerta de Rebalanceamento →
   Slack**.
5. Ajuste os nós marcados como "mock" antes de ativar em produção.
6. Ative o workflow (`Active` no topo direito) quando estiver satisfeito com
   os dados de teste.

### Variável de ambiente usada pelo workflow

- `PORTFOLIO_API_BASE_URL` — já definida no `docker-compose.yml` do serviço
  `n8n` como `http://portfolio-api:8000` (nome do serviço na rede docker
  `macro-ai-net`, não `localhost`).

## Workflow: Monitor de Saúde dos Workflows n8n

Arquivo: `n8n/workflows/workflow_health_monitor.json`

Nasceu do runbook #2 em `docs/16_SECURITY.md` ("workflow pausado
manualmente"): o risco real de um workflow crítico ser pausado não é a pausa
em si, é ela ficar esquecida sem ninguém perceber.

### O que faz

1. **Agendamento Diário** (`0 8 * * *`) — roda toda manhã.
2. **Workflows Críticos (lista)** — array com os nomes dos workflows que
   devem estar sempre ativos. Hoje contém só o de recomendação de
   rebalanceamento; adicione novos nomes aqui conforme outros workflows
   críticos forem criados.
3. **Listar Workflows (API n8n)** — `GET {{ $env.N8N_BASE_URL }}/api/v1/workflows`,
   usando a API pública do próprio n8n.
4. **Verificar Status** (Code) — compara a lista de críticos com o que veio
   da API: sinaliza quem está `inativo` (existe mas `active: false`) e quem
   `não foi encontrado` (renomeado ou removido).
5. **Precisa Alertar?** (IF) → se sim, **Alertar → Slack**; se não, **Tudo OK**
   (No Operation).

### Como configurar

1. No n8n: `Settings → n8n API → Create an API key`.
2. Crie uma credencial do tipo **Header Auth** no n8n com:
   - Nome do header: `X-N8N-API-KEY`
   - Valor: a API key gerada no passo 1.
3. No node **Listar Workflows (API n8n)**, selecione essa credencial em
   "Generic Auth Type → Header Auth".
4. Configure a credencial Slack no node **Alertar → Slack** (mesmo canal
   sugerido do outro workflow: `#portfolio-alerts`).
5. Importe e ative como o workflow de rebalanceamento.

### Limitação importante

Este workflow **não detecta a si mesmo sendo pausado** — se ele for
desativado, simplesmente para de rodar, sem alertar ninguém (limitação de
qualquer scheduler baseado em cron dentro da própria ferramenta que
monitora). Para cobrir esse caso, é necessário um monitor **externo** ao
n8n (ex.: um serviço de uptime/healthcheck separado, ou o próprio Risk
Engine quando existir). Registrado como limitação conhecida, não resolvida
por este workflow.

### Limitações / próximos passos (workflow de rebalanceamento)

- Contexto macro e carteira atual ainda são mock — depende da Fase 1
  (Data Pipeline + Database) do `ROADMAP.md`.
- O endpoint de sync com o dashboard é um placeholder até o backend definir
  seu schema real (`docs/13_APIS.md`).
- O limiar de rebalanceamento (3 p.p.) é uma escolha inicial arbitrária —
  deve ser revisado com o time de risco/investimentos.

### Limitações / próximos passos (monitor de workflows)

- Não se autodetecta pausado (ver "Limitação importante" acima).
- A lista de workflows críticos é mantida manualmente no node "Workflows
  Críticos (lista)" — considerar mover para uma fonte externa (arquivo de
  config, Database) se a lista crescer muito.
- Ver `docs/16_SECURITY.md` para os demais runbooks de eventos operacionais
  e de segurança (falha de autenticação yfinance, tentativa de acesso
  negada).
