"""
economist_portfolio_agent.py

Agente "Economista de Portfólio" da Macroeconomic AI Platform.

Responsabilidade (ver docs/09_PORTFOLIO_MANAGER.md e SYSTEM_PROMPT.md):
    - Interpretar um cenário macroeconômico (juros, inflação, câmbio, atividade)
    - Estimar retornos esperados e risco por classe de ativo (abordagem "building block")
    - Otimizar uma alocação estratégica de longo prazo (mean-variance, estilo Markowitz)
    - Comparar a carteira atual com a alocação-alvo e sugerir um rebalanceamento
    - Rodar cenários de estresse simples sobre a carteira
    - Produzir um relatório estruturado com nível de confiança, fontes e limitações

Restrição de projeto (CLAUDE.md / SYSTEM_PROMPT.md):
    Este agente NUNCA executa ordens de compra/venda. Ele apenas analisa e
    recomenda. A execução, se houver, é responsabilidade de um humano ou de
    um sistema separado, explicitamente autorizado.

Status: implementação inicial (Fase 3 do ROADMAP). Os parâmetros de retorno/
risco por classe de ativo são premissas de mercado (building block), ainda
não calibradas pelos modelos econométricos validados da Fase 2
(VAR/ARIMA/VECM em `python/models` + validação em `stata/`). Ver seção
"Limitações" no relatório gerado.
"""

from __future__ import annotations

import datetime as _dt
import json
from dataclasses import dataclass, field
from typing import Dict, List, Optional

import numpy as np

try:
    from scipy.optimize import minimize
except ImportError as exc:  # pragma: no cover
    raise ImportError(
        "Este módulo requer scipy. Instale com: pip install scipy"
    ) from exc


# --------------------------------------------------------------------------- #
# Perfis de risco -> aversão a risco (quanto maior, mais conservador)
# --------------------------------------------------------------------------- #
RISK_AVERSION_BY_PROFILE = {
    "conservador": 6.0,
    "moderado": 3.0,
    "arrojado": 1.5,
}

# Horizonte de investimento -> multiplicador de tolerância a risco
# (horizontes mais longos toleram mais volatilidade no caminho)
HORIZON_RISK_MULTIPLIER = {
    "curto": 1.4,   # < 2 anos
    "medio": 1.0,   # 2-5 anos
    "longo": 0.7,   # > 5 anos (mais tolerante a volatilidade de curto prazo)
}


@dataclass
class AssetClass:
    """Premissas de mercado de longo prazo para uma classe de ativo.

    Todos os valores são anuais e em termos nominais (BRL), salvo indicação
    contrária. São PREMISSAS DE PARTIDA (building block), a serem
    substituídas por saídas dos modelos econométricos validados quando a
    Fase 2 do ROADMAP for concluída.
    """
    name: str
    expected_return: float          # retorno nominal esperado (ex.: 0.11 = 11% a.a.)
    volatility: float               # desvio-padrão anual (ex.: 0.18 = 18% a.a.)
    min_weight: float = 0.0         # peso mínimo permitido na otimização
    max_weight: float = 1.0         # peso máximo permitido na otimização
    stress_beta: Dict[str, float] = field(default_factory=dict)  # sensibilidade a cenários de estresse


@dataclass
class MacroContext:
    """Cenário macro corrente usado para ajustar as premissas de retorno.

    Os campos espelham os indicadores já usados no dashboard (ticker tape /
    módulo Data Pipeline): SELIC, IPCA (12m), USD/BRL, etc.
    Fonte esperada em produção: BACEN (SGS), IBGE (SIDRA), FRED.
    """
    selic: float                      # ex.: 0.1075
    ipca_12m: float                   # ex.: 0.0418
    usd_brl_change_12m: float = 0.0   # variação cambial recente, informativa
    global_growth_bias: float = 0.0   # -1 (recessivo) a +1 (expansionista), julgamento macro
    as_of: str = field(default_factory=lambda: _dt.date.today().isoformat())

    @property
    def real_risk_free(self) -> float:
        """Taxa real livre de risco via aproximação de Fisher: (1+i)/(1+pi) - 1."""
        return (1 + self.selic) / (1 + self.ipca_12m) - 1


@dataclass
class RebalanceItem:
    asset: str
    current_weight: float
    target_weight: float
    delta_weight: float          # target - current (positivo = comprar, negativo = vender)
    action: str                  # "comprar" | "vender" | "manter"
    delta_value: Optional[float] = None  # em BRL, se portfolio_value for informado


class EconomistPortfolioAgent:
    """Agente economista responsável por alocação e rebalanceamento de carteira.

    Uso típico:
        agent = EconomistPortfolioAgent(asset_classes, correlation_matrix)
        agent.set_macro_context(macro)
        report = agent.generate_report(
            current_weights=..., risk_profile="moderado", horizon="longo",
            portfolio_value=250_000.0,
        )
    """

    def __init__(
        self,
        asset_classes: List[AssetClass],
        correlation_matrix: np.ndarray,
    ):
        names = [a.name for a in asset_classes]
        if len(set(names)) != len(names):
            raise ValueError("Nomes de classes de ativo devem ser únicos.")
        n = len(asset_classes)
        if correlation_matrix.shape != (n, n):
            raise ValueError(
                f"Matriz de correlação deve ser {n}x{n}, recebida {correlation_matrix.shape}."
            )
        self.asset_classes = asset_classes
        self.names = names
        self.correlation_matrix = correlation_matrix
        self.macro: Optional[MacroContext] = None

    # ------------------------------------------------------------------ #
    # Contexto macro
    # ------------------------------------------------------------------ #
    def set_macro_context(self, macro: MacroContext) -> None:
        self.macro = macro

    def _macro_adjusted_returns(self) -> np.ndarray:
        """Ajusta o retorno esperado "base" de cada classe pelo cenário macro.

        Regra simples e transparente (building block), não um modelo
        estatístico ajustado: soma-se a taxa real livre de risco corrente e
        um pequeno ajuste de viés de crescimento global. Isto deve ser
        substituído pelas saídas do Forecast Engine (docs/08) quando
        disponíveis.
        """
        base = np.array([a.expected_return for a in self.asset_classes])
        if self.macro is None:
            return base

        adjusted = base.copy()
        # Renda fixa pós-fixada e caixa acompanham de perto a Selic/juro real.
        for i, a in enumerate(self.asset_classes):
            lname = a.name.lower()
            if "renda fixa" in lname or "caixa" in lname:
                adjusted[i] = self.macro.selic * 0.98  # spread pequeno sobre a Selic
            elif "ações" in lname or "acoes" in lname or "multimercado" in lname:
                adjusted[i] = base[i] + self.macro.global_growth_bias * 0.02
            elif "câmbio" in lname or "cambio" in lname or "hedge" in lname:
                adjusted[i] = base[i] + self.macro.usd_brl_change_12m * 0.1
        return adjusted

    def _covariance_matrix(self) -> np.ndarray:
        vol = np.array([a.volatility for a in self.asset_classes])
        return np.outer(vol, vol) * self.correlation_matrix

    # ------------------------------------------------------------------ #
    # Otimização (mean-variance, estilo Markowitz)
    # ------------------------------------------------------------------ #
    def optimize_allocation(
        self,
        risk_profile: str = "moderado",
        horizon: str = "longo",
    ) -> Dict[str, float]:
        if risk_profile not in RISK_AVERSION_BY_PROFILE:
            raise ValueError(
                f"risk_profile deve ser um de {list(RISK_AVERSION_BY_PROFILE)}"
            )
        if horizon not in HORIZON_RISK_MULTIPLIER:
            raise ValueError(
                f"horizon deve ser um de {list(HORIZON_RISK_MULTIPLIER)}"
            )

        mu = self._macro_adjusted_returns()
        sigma = self._covariance_matrix()
        n = len(self.asset_classes)

        risk_aversion = (
            RISK_AVERSION_BY_PROFILE[risk_profile] * HORIZON_RISK_MULTIPLIER[horizon]
        )

        def neg_utility(w: np.ndarray) -> float:
            port_return = w @ mu
            port_var = w @ sigma @ w
            return -(port_return - 0.5 * risk_aversion * port_var)

        bounds = [(a.min_weight, a.max_weight) for a in self.asset_classes]
        constraints = [{"type": "eq", "fun": lambda w: np.sum(w) - 1.0}]
        w0 = np.full(n, 1.0 / n)

        result = minimize(
            neg_utility,
            w0,
            method="SLSQP",
            bounds=bounds,
            constraints=constraints,
            options={"maxiter": 500, "ftol": 1e-10},
        )
        if not result.success:
            raise RuntimeError(f"Otimização não convergiu: {result.message}")

        weights = np.clip(result.x, 0, None)
        weights = weights / weights.sum()  # normaliza por segurança numérica
        return {name: float(w) for name, w in zip(self.names, weights)}

    # ------------------------------------------------------------------ #
    # Risco
    # ------------------------------------------------------------------ #
    def assess_risk(self, weights: Dict[str, float]) -> Dict[str, float]:
        w = np.array([weights[n] for n in self.names])
        sigma = self._covariance_matrix()
        port_vol = float(np.sqrt(w @ sigma @ w))
        # VaR paramétrico (normal), 1 ano, 95% e 99%
        var_95 = 1.645 * port_vol
        var_99 = 2.326 * port_vol
        # Estimativa heurística de drawdown máximo em cenário adverso
        # (aprox. 2.5x a vol anual — placeholder até haver histórico real)
        max_drawdown_estimate = 2.5 * port_vol
        return {
            "volatilidade_anual": round(port_vol, 4),
            "var_95_1ano": round(var_95, 4),
            "var_99_1ano": round(var_99, 4),
            "max_drawdown_estimado": round(max_drawdown_estimate, 4),
        }

    def run_stress_scenarios(self, weights: Dict[str, float]) -> Dict[str, float]:
        """Aplica os betas de estresse cadastrados em cada AssetClass.stress_beta.

        Cenários sem beta definido para uma classe são tratados como beta 0
        (sem sensibilidade) para aquela classe.
        """
        scenarios: Dict[str, float] = {}
        all_scenarios = set()
        for a in self.asset_classes:
            all_scenarios.update(a.stress_beta.keys())

        for scenario in all_scenarios:
            impact = 0.0
            for a in self.asset_classes:
                beta = a.stress_beta.get(scenario, 0.0)
                impact += weights.get(a.name, 0.0) * beta
            scenarios[scenario] = round(impact, 4)
        return scenarios

    # ------------------------------------------------------------------ #
    # Rebalanceamento
    # ------------------------------------------------------------------ #
    def rebalance(
        self,
        current_weights: Dict[str, float],
        target_weights: Dict[str, float],
        portfolio_value: Optional[float] = None,
        tolerance: float = 0.01,
    ) -> List[RebalanceItem]:
        items: List[RebalanceItem] = []
        for name in self.names:
            cur = current_weights.get(name, 0.0)
            tgt = target_weights.get(name, 0.0)
            delta = tgt - cur
            if abs(delta) < tolerance:
                action = "manter"
            elif delta > 0:
                action = "comprar"
            else:
                action = "vender"
            delta_value = delta * portfolio_value if portfolio_value else None
            items.append(
                RebalanceItem(
                    asset=name,
                    current_weight=round(cur, 4),
                    target_weight=round(tgt, 4),
                    delta_weight=round(delta, 4),
                    action=action,
                    delta_value=round(delta_value, 2) if delta_value is not None else None,
                )
            )
        return items

    # ------------------------------------------------------------------ #
    # Relatório final (formato compatível com SYSTEM_PROMPT.md)
    # ------------------------------------------------------------------ #
    def generate_report(
        self,
        current_weights: Dict[str, float],
        risk_profile: str = "moderado",
        horizon: str = "longo",
        portfolio_value: Optional[float] = None,
    ) -> dict:
        target_weights = self.optimize_allocation(risk_profile, horizon)
        risk_current = self.assess_risk(current_weights)
        risk_target = self.assess_risk(target_weights)
        stress_target = self.run_stress_scenarios(target_weights)
        rebalance_items = self.rebalance(current_weights, target_weights, portfolio_value)

        confidence = "moderada" if self.macro is not None else "baixa"

        report = {
            "agente": "EconomistPortfolioAgent",
            "tipo": "recomendacao_alocacao_longo_prazo",
            "gerado_em": _dt.datetime.now().isoformat(timespec="seconds"),
            "parametros": {
                "perfil_risco": risk_profile,
                "horizonte": horizon,
                "cenario_macro": (
                    {
                        "selic": self.macro.selic,
                        "ipca_12m": self.macro.ipca_12m,
                        "usd_brl_change_12m": self.macro.usd_brl_change_12m,
                        "global_growth_bias": self.macro.global_growth_bias,
                        "data_referencia": self.macro.as_of,
                    }
                    if self.macro
                    else None
                ),
            },
            "alocacao_alvo": {k: round(v, 4) for k, v in target_weights.items()},
            "alocacao_atual": {k: round(v, 4) for k, v in current_weights.items()},
            "risco": {
                "carteira_atual": risk_current,
                "carteira_alvo": risk_target,
            },
            "cenarios_de_estresse_carteira_alvo": stress_target,
            "recomendacao_rebalanceamento": [item.__dict__ for item in rebalance_items],
            "nivel_confianca": confidence,
            "fontes_e_premissas": [
                "Retornos/volatilidades por classe: premissas de mercado (building block),"
                " não calibradas por modelo econométrico validado (ver ROADMAP Fase 2).",
                "Taxa livre de risco real: aproximação de Fisher sobre Selic e IPCA (12m).",
                "Fontes de dados macro previstas em produção: BACEN (SGS), IBGE (SIDRA), FRED.",
                "Correlações entre classes: matriz fixa informada manualmente, não estimada"
                " a partir de série histórica.",
                "Pisos mínimos por classe (ex.: Ações Global, Câmbio/Hedge) refletem uma"
                " política de diversificação mínima definida a priori, não um resultado"
                " 'puro' do otimizador de média-variância.",
            ],
            "limitacoes": [
                "Este relatório é uma RECOMENDAÇÃO. Nenhuma ordem de compra/venda é executada"
                " por este agente (ver CLAUDE.md e SYSTEM_PROMPT.md).",
                "VaR e drawdown são estimativas paramétricas simplificadas (distribuição normal),"
                " não backtestadas.",
                "Sensibilidades de estresse (stress_beta) são aproximações e devem ser revisadas"
                " pelo Risk Engine (docs/10) quando disponível.",
                "Alocação-alvo não considera custos de transação, liquidez, impostos ou eventos"
                " de crédito específicos de cada ativo.",
            ],
        }
        return report


# --------------------------------------------------------------------------- #
# Fábrica de configuração default, alinhada às 6 classes já usadas no
# dashboard (frontend/src/App.jsx, módulo Portfolio Manager).
# --------------------------------------------------------------------------- #
def default_asset_universe() -> List[AssetClass]:
    return [
        AssetClass(
            name="Renda Fixa Pós",
            expected_return=0.1075,
            volatility=0.03,
            min_weight=0.10,
            max_weight=0.60,
            stress_beta={
                "Choque cambial +15%": 0.0,
                "Selic +200bps": 0.01,
                "Crash equities -20%": 0.0,
                "Liquidez sistêmica": -0.02,
            },
        ),
        AssetClass(
            name="Ações Brasil",
            expected_return=0.14,
            volatility=0.24,
            min_weight=0.0,
            max_weight=0.40,
            stress_beta={
                "Choque cambial +15%": -0.03,
                "Selic +200bps": -0.06,
                "Crash equities -20%": -0.20,
                "Liquidez sistêmica": -0.08,
            },
        ),
        AssetClass(
            name="Ações Global",
            expected_return=0.11,
            volatility=0.18,
            min_weight=0.05,  # piso de diversificação internacional
            max_weight=0.35,
            stress_beta={
                "Choque cambial +15%": 0.05,
                "Selic +200bps": -0.02,
                "Crash equities -20%": -0.20,
                "Liquidez sistêmica": -0.05,
            },
        ),
        AssetClass(
            name="Câmbio / Hedge",
            expected_return=0.06,
            volatility=0.15,
            min_weight=0.03,  # piso de hedge cambial
            max_weight=0.25,
            stress_beta={
                "Choque cambial +15%": 0.15,
                "Selic +200bps": 0.0,
                "Crash equities -20%": 0.03,
                "Liquidez sistêmica": 0.02,
            },
        ),
        AssetClass(
            name="Multimercado",
            expected_return=0.12,
            volatility=0.10,
            min_weight=0.0,
            max_weight=0.25,
            stress_beta={
                "Choque cambial +15%": -0.02,
                "Selic +200bps": -0.02,
                "Crash equities -20%": -0.08,
                "Liquidez sistêmica": -0.04,
            },
        ),
        AssetClass(
            name="Caixa",
            expected_return=0.1075,
            volatility=0.005,
            min_weight=0.02,
            max_weight=0.20,
            stress_beta={
                "Choque cambial +15%": 0.0,
                "Selic +200bps": 0.0,
                "Crash equities -20%": 0.0,
                "Liquidez sistêmica": 0.0,
            },
        ),
    ]


def default_correlation_matrix() -> np.ndarray:
    # Ordem: Renda Fixa Pós, Ações Brasil, Ações Global, Câmbio/Hedge, Multimercado, Caixa
    return np.array([
        [1.00, 0.05, 0.00, -0.10, 0.10, 0.20],
        [0.05, 1.00, 0.55, -0.30, 0.40, 0.00],
        [0.00, 0.55, 1.00, 0.10, 0.35, 0.00],
        [-0.10, -0.30, 0.10, 1.00, 0.10, 0.05],
        [0.10, 0.40, 0.35, 0.10, 1.00, 0.05],
        [0.20, 0.00, 0.00, 0.05, 0.05, 1.00],
    ])


if __name__ == "__main__":
    # Execução de exemplo — ver também python/agents/example_run.py
    agent = EconomistPortfolioAgent(default_asset_universe(), default_correlation_matrix())
    agent.set_macro_context(MacroContext(selic=0.1075, ipca_12m=0.0418, usd_brl_change_12m=0.03))

    current = {
        "Renda Fixa Pós": 0.34,
        "Ações Brasil": 0.24,
        "Ações Global": 0.16,
        "Câmbio / Hedge": 0.12,
        "Multimercado": 0.09,
        "Caixa": 0.05,
    }

    report = agent.generate_report(
        current_weights=current,
        risk_profile="moderado",
        horizon="longo",
        portfolio_value=250_000.0,
    )
    print(json.dumps(report, indent=2, ensure_ascii=False))
