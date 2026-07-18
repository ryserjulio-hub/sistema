# 16 — Security

## Status

🚧 Este documento cobre o que já existe (Portfolio Manager API + workflow n8n)
e os runbooks para os três tipos de evento hoje simulados no audit log mock
do dashboard (`frontend/src/App.jsx` → `auditLog`). Segurança de outros
componentes (Data Pipeline, Database, Dashboards) será adicionada conforme
forem implementados (ver `ROADMAP.md`, Fase 5).

## Estado atual de autenticação/acesso

- **Portfolio Manager API** (`python/agents/api.py`): **sem autenticação
  hoje**. Qualquer serviço com acesso à rede `macro-ai-net` (ou à porta
  `8010` exposta no host) pode chamar `/api/v1/portfolio/recommendation`.
  Aceitável enquanto a API só roda localmente/dev; **bloqueante para
  produção** — ver "Próximos passos".
- **n8n**: autenticação própria da instância (usuário/senha ou SSO, conforme
  configuração do container `n8nio/n8n`). Credenciais de serviços externos
  (Slack, futura API key do n8n) ficam armazenadas no cofre de credenciais
  do próprio n8n — nunca hardcoded nos arquivos de workflow `.json`
  versionados neste repositório.

## Runbooks

### 1. Falha de autenticação `yfinance` (`svc-ingestion`, nível `warn`)

`yfinance` não usa uma API key tradicional — ele faz scraping do Yahoo
Finance. "Falha de autenticação" nesse contexto normalmente é o Yahoo
bloqueando ou limitando as requisições (comum em IPs de datacenter/cloud),
não uma credencial errada.

Passos:
1. Checar o código de erro HTTP retornado (429 = rate limit; 401/403 =
   bloqueio mais duro).
2. Confirmar a versão instalada do `yfinance` — a lib quebra com frequência
   quando o Yahoo muda a página/API interna; atualizar costuma resolver.
3. Se for rate limit recorrente: adicionar backoff exponencial e cache de
   requisições (`requests_cache`) no pipeline de ingestão.
4. Se persistir: usar uma fonte alternativa já prevista em
   `docs/04_DATA_PIPELINE.md` (BACEN, IBGE, FRED) para os dados que também
   estão disponíveis lá; `yfinance` fica reservado para o que só ele cobre
   (preços de ações/ETFs específicos).
5. Não é um evento de segurança — não escalar como incidente, só como
   confiabilidade de pipeline.

### 2. Workflow pausado manualmente (`n8n-runner`, nível `warn`)

"Pausado manualmente" indica uma ação humana intencional, não uma falha do
n8n. O risco real não é a pausa em si, é ela **ficar esquecida**.

Passos:
1. Confirmar quem pausou e o motivo (manutenção, investigação de outro
   problema, deploy em andamento).
2. Se a pausa não tiver dono/prazo registrado, tratar como incidente de
   processo: workflows críticos (ex.: sync de portfólio, geração de
   recomendação) não devem ficar pausados sem um registro de por quê e até
   quando.
3. Usar o workflow de monitoramento (`n8n/workflows/workflow_health_monitor.json`,
   ver `docs/11_N8N_AUTOMATION.md`) para detectar automaticamente workflows
   que deveriam estar ativos e não estão, e alertar.
4. Reativar o workflow assim que o motivo da pausa deixar de existir.

### 3. Tentativa de acesso negada de IP desconhecido (nível `critical`)

Este é o único dos três que é de fato um evento de segurança.

Passos imediatos:
1. Confirmar que o bloqueio funcionou como esperado (resposta 401/403, sem
   vazamento de dados na resposta de erro).
2. Verificar se é uma tentativa isolada ou um padrão (múltiplas tentativas
   do mesmo IP/range, varredura de rotas, credential stuffing).
3. Checar se a API/serviço afetado está atrás de rate-limiting e/ou WAF, ou
   se está exposta diretamente à internet sem proteção.
4. Registrar o IP e o padrão observado; bloquear a nível de rede/firewall se
   o padrão persistir.
5. Se a tentativa teve qualquer sucesso parcial (autenticação aceita,
   mesmo que a ação tenha sido negada depois), tratar como incidente maior:
   revisar logs de acesso completos e considerar rotação de credenciais.

## Próximos passos

- [ ] Adicionar autenticação (API key ou OAuth) na Portfolio Manager API
      antes de qualquer deploy fora de rede local/dev.
- [ ] Definir política de rate-limiting para APIs expostas publicamente.
- [ ] Formalizar processo de "pausa com dono e prazo" para workflows n8n
      críticos (hoje é só convenção, não é imposto por ferramenta).
- [ ] Definir retenção e armazenamento do audit log real (hoje é mock no
      frontend) — provavelmente Database (`docs/06`) + exportação periódica.
- [ ] Avaliar WAF/rate-limiting na borda quando o backend for exposto à
      internet.
