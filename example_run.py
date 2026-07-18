"""
example_run.py

Exemplo de execução do EconomistPortfolioAgent com uma carteira e cenário
macro fictícios, alinhados aos dados mock já usados no módulo Portfolio
Manager do frontend (frontend/src/App.jsx).

Rodar:
    python python/agents/example_run.py
"""

import json

from economist_portfolio_agent import (
    EconomistPortfolioAgent,
    MacroContext,
    default_asset_universe,
    default_correlation_matrix,
)


def main() -> None:
    agent = EconomistPortfolioAgent(default_asset_universe(), default_correlation_matrix())

    # Cenário macro corrente (equivalente aos indicadores do ticker do dashboard)
    macro = MacroContext(
        selic=0.1075,
        ipca_12m=0.0418,
        usd_brl_change_12m=0.03,
        global_growth_bias=0.1,  # leve viés de crescimento global positivo
    )
    agent.set_macro_context(macro)

    # Carteira atual (mesma composição do mock "allocation" no App.jsx)
    current_weights = {
        "Renda Fixa Pós": 0.34,
        "Ações Brasil": 0.24,
        "Ações Global": 0.16,
        "Câmbio / Hedge": 0.12,
        "Multimercado": 0.09,
        "Caixa": 0.05,
    }

    for perfil in ("conservador", "moderado", "arrojado"):
        report = agent.generate_report(
            current_weights=current_weights,
            risk_profile=perfil,
            horizon="longo",
            portfolio_value=250_000.0,
        )
        print(f"\n=== Perfil: {perfil} | Horizonte: longo prazo ===")
        print(json.dumps(report["alocacao_alvo"], indent=2, ensure_ascii=False))
        print("Volatilidade anual (alvo):", report["risco"]["carteira_alvo"]["volatilidade_anual"])

    # Relatório completo (perfil moderado) — formato pronto para consumo por
    # dashboard / API / n8n, conforme SYSTEM_PROMPT.md
    full_report = agent.generate_report(
        current_weights=current_weights,
        risk_profile="moderado",
        horizon="longo",
        portfolio_value=250_000.0,
    )
    print("\n=== Relatório completo (perfil moderado) ===")
    print(json.dumps(full_report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
