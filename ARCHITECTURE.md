# Arquitetura do Sistema

> Ver também `docs/03_SYSTEM_ARCHITECTURE.md` para detalhes.

## Visão geral (alto nível)

```
[Fontes de Dados] -> [Data Pipeline] -> [Data Lake] -> [Database]
                                              |
                          +-------------------+-------------------+
                          |                                       |
                 [Econometric Models]                     [Forecast Engine]
                          |                                       |
                          +-------------------+-------------------+
                                              |
                       [Portfolio Manager] <--+--> [Risk Engine]
                                              |
                          +-------------------+-------------------+
                          |                                       |
                    [Dashboards]                          [APIs / N8N Automation]
```

## Componentes

- **Data Pipeline**: ingestão de dados macro/financeiros (fontes a definir: BACEN, IBGE, FRED, yfinance, etc.)
- **Data Lake**: armazenamento bruto/staged
- **Database**: dados estruturados e prontos para consumo
- **Econometric Models**: modelos de regressão, séries temporais, VAR/VECM, etc.
- **Forecast Engine**: geração de previsões a partir dos modelos
- **Portfolio Manager**: alocação e recomendações
- **Risk Engine**: métricas de risco (VaR, stress test, drawdown)
- **N8N Automation**: orquestração de workflows entre componentes
- **Dashboards**: visualização (frontend)
- **APIs**: interface programática
- **Stata Validation**: validação cruzada dos modelos econométricos

## Stack (a definir/confirmar)

| Camada | Tecnologia (proposta) |
|---|---|
| Backend | ? |
| Frontend | React |
| Automação | n8n |
| Modelagem | Python, R, Stata |
| Banco de dados | ? |
| Infra | Docker |
