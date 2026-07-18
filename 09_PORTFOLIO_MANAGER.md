# 09 — Portfolio Manager: Agente Economista

## Objetivo

Fornecer uma alocação estratégica de longo prazo (Strategic Asset Allocation)
e recomendações de rebalanceamento, ancoradas em um cenário macroeconômico
corrente — **sem executar ordens**. A execução real (se/quando existir) é um
componente separado, explicitamente autorizado por um humano (ver
`CLAUDE.md` e `SYSTEM_PROMPT.md`).

## Implementação

- Código: `python/agents/economist_portfolio_agent.py`
- Exemplo de uso: `python/agents/example_run.py`
- Classe principal: `EconomistPortfolioAgent`

## Metodologia (v1 — placeholder até integração com Fase 2)

1. **Premissas de retorno/risco por classe de ativo** (`AssetClass`): abordagem
   *building block* (taxa real livre de risco + prêmio de risco por classe).
   Atualmente são premissas de mercado fixas — **ainda não calibradas** pelos
   modelos econométricos validados (VAR/ARIMA/VECM) descritos em
   `docs/07_ECONOMETRIC_MODELS.md` e `docs/14_STATA_VALIDATION.md`.
2. **Ajuste macro** (`MacroContext`): a Selic e o IPCA (12m) ajustam o retorno
   esperado de renda fixa/caixa via aproximação de Fisher; câmbio e viés de
   crescimento global ajustam ações e hedge cambial.
3. **Otimização** (`optimize_allocation`): mean-variance (Markowitz) via
   `scipy.optimize`, maximizando `retorno − 0.5 × aversão_a_risco × variância`,
   sujeito a `soma dos pesos = 1` e limites mín/máx por classe.
   - Aversão a risco = f(perfil de risco) × f(horizonte).
   - Perfis: `conservador`, `moderado`, `arrojado`.
   - Horizontes: `curto`, `medio`, `longo` (longo prazo tolera mais volatilidade
     de curto prazo, conforme `HORIZON_RISK_MULTIPLIER`).
   - Pisos mínimos por classe (ex.: 5% em Ações Global, 3% em Câmbio/Hedge)
     são uma **política de diversificação definida a priori**, não um
     resultado "puro" do otimizador.
4. **Risco** (`assess_risk`): volatilidade anual, VaR paramétrico (95%/99%,
   normal) e uma estimativa heurística de drawdown máximo.
5. **Estresse** (`run_stress_scenarios`): aplica sensibilidades (`stress_beta`)
   por classe aos mesmos cenários do dashboard (choque cambial, alta de Selic,
   crash de equities, liquidez sistêmica).
6. **Rebalanceamento** (`rebalance`): compara pesos atuais vs. alvo e classifica
   cada classe em `comprar` / `vender` / `manter`, com valor em BRL se o
   tamanho da carteira for informado.
7. **Relatório** (`generate_report`): saída estruturada em JSON, incluindo
   nível de confiança, fontes/premissas e limitações — no espírito do formato
   esperado descrito em `SYSTEM_PROMPT.md`.

## Entradas esperadas

- Carteira atual (pesos por classe de ativo, soma = 1)
- Perfil de risco (`conservador` | `moderado` | `arrojado`)
- Horizonte de investimento (`curto` | `medio` | `longo`)
- Cenário macro corrente (Selic, IPCA 12m, câmbio, viés de crescimento)
- Valor total da carteira (opcional, para recomendação em BRL)

## Saída

Um dicionário/JSON com: alocação-alvo, alocação atual, métricas de risco
(atual e alvo), impacto estimado nos cenários de estresse, lista de ações de
rebalanceamento, nível de confiança e as seções `fontes_e_premissas` /
`limitacoes`.

## Limitações conhecidas (v1)

- Retornos, volatilidades e correlações são premissas manuais, não estimadas
  de séries históricas reais (BACEN/IBGE/FRED/yfinance ainda não integrados).
- VaR/drawdown são paramétricos e simplificados — não substituem o
  `Risk Engine` completo (`docs/10_RISK_ENGINE.md`).
- Não considera custos de transação, tributos, liquidez de cada ativo
  específico (ex.: um Tesouro Selic 2029 vs. a classe "Renda Fixa Pós"
  genérica) ou risco de crédito idiossincrático.
- Sensibilidades de estresse por classe (`stress_beta`) são aproximações
  qualitativas, a serem substituídas por estimativas do Risk Engine.

## Próximos passos

- [ ] Conectar `_macro_adjusted_returns` às saídas reais do Forecast Engine
      (`docs/08_FORECAST_ENGINE.md`) em vez de regras fixas.
- [ ] Estimar volatilidade/correlação a partir de dados históricos reais
      (Data Lake / Database), com janela móvel.
- [ ] Validar as premissas de retorno por classe com os modelos
      econométricos da Fase 2 e cross-validação em Stata.
- [ ] Expor `generate_report()` como endpoint de API (`docs/13_APIS.md`) para
      consumo pelo dashboard e por workflows n8n.
- [ ] Integrar `stress_beta` com o Risk Engine real (`docs/10`).
