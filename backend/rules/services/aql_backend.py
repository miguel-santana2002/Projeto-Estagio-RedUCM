"""
Backend determinístico pySigma -> IBM QRadar AQL (Ariel Query Language).

Uso:
    from aql_backend import AQLBackend
    backend = AQLBackend()
    collection = SigmaCollection.from_yaml(sigma_yaml)
    result = backend.convert(collection)   # lista de strings AQL

Baseado em sigma.conversion.base.TextQueryBackend (pySigma). A maioria da
lógica booleana (AND/OR/NOT, agrupamento, listas IN, wildcards) é herdada
automaticamente da classe base -- só é preciso declarar os tokens/formatos
específicos da sintaxe AQL, mais duas conversões que precisam de lógica
própria (string com/sem wildcard, valor sem campo associado).

⚠️ Dois pontos por confirmar contra a tua instância QRadar real antes de
   confiares neles em produção (marcados abaixo com "VERIFICAR"):
   - sintaxe de regex em AQL (não há operador REGEXP nativo documentado
     de forma consistente; pode ser necessário usar uma função específica
     da tua versão do QRadar, ou reescrever a regex como LIKE).
   - sintaxe exata de INCIDR() para comparação de CIDR.
   Testa ambos os casos com uma regra Sigma real antes de confiar cegamente.
"""

from sigma.conversion.base import TextQueryBackend
from sigma.conversion.state import ConversionState
from sigma.rule import SigmaRule
from sigma.conditions import ConditionFieldEqualsValueExpression, ConditionValueExpression
from sigma.types import SigmaCompareExpression
from sigma.conversion.deferred import DeferredQueryExpression
from typing import ClassVar, Dict, Optional, Union


class AQLBackend(TextQueryBackend):
    """Converte regras Sigma para IBM QRadar AQL (SELECT ... FROM events WHERE ...)."""

    # --- Lógica booleana --------------------------------------------------
    # Precedência e agrupamento herdados por omissão (NOT > AND > OR),
    # que é a mesma ordem usada em AQL/SQL.
    group_expression: ClassVar[str] = "({expr})"

    token_separator: str = " "
    or_token: ClassVar[str] = "OR"
    and_token: ClassVar[str] = "AND"
    not_token: ClassVar[str] = "NOT"
    eq_token: ClassVar[str] = " = "

    # --- Strings ------------------------------------------------------------
    str_quote: ClassVar[str] = "'"
    escape_char: ClassVar[str] = "\\"
    wildcard_multi: ClassVar[str] = "%"   # AQL usa sintaxe LIKE/ILIKE estilo SQL
    wildcard_single: ClassVar[str] = "_"
    add_escaped: ClassVar[str] = ""     # escapa barras invertidas literais no valor
    filter_chars: ClassVar[str] = ""

    bool_values: ClassVar[Dict[bool, Optional[str]]] = {
        True: "true",
        False: "false",
    }

    # --- Regex (VERIFICAR contra a tua versão de QRadar) --------------------
    re_expression: ClassVar[str] = "{field} MATCHES {regex}"
    re_escape_char: ClassVar[str] = "\\"
    re_escape: ClassVar[tuple] = ("'",)

    # --- CIDR (VERIFICAR sintaxe exata de INCIDR na tua instância) ----------
    cidr_wildcard: ClassVar[Optional[str]] = None
    cidr_expression: ClassVar[str] = "INCIDR({field}, {value})"
    cidr_in_list_expression: ClassVar[str] = "INCIDR({field}, ({list}))"

    # --- Comparação numérica --------------------------------------------------
    compare_op_expression: ClassVar[str] = "{field} {operator} {value}"
    compare_operators: ClassVar[Dict] = {
        SigmaCompareExpression.CompareOperators.LT: "<",
        SigmaCompareExpression.CompareOperators.LTE: "<=",
        SigmaCompareExpression.CompareOperators.GT: ">",
        SigmaCompareExpression.CompareOperators.GTE: ">=",
    }

    # --- Null -----------------------------------------------------------------
    field_null_expression: ClassVar[str] = "{field} IS NULL"

    # --- Campo IN (lista) -------------------------------------------------------
    field_in_list_expression: ClassVar[str] = "{field} IN ({list})"
    or_in_operator: ClassVar[str] = "IN"
    list_separator: ClassVar[str] = ", "

    # --- Valores sem campo associado (keyword search) ---------------------------
    # Em AQL, um termo "solto" (sem campo) mapeia melhor para uma busca no payload.
    unbound_value_str_expression: ClassVar[str] = "UTF8(payload) ILIKE '%{value}%'"
    unbound_value_num_expression: ClassVar[str] = "UTF8(payload) ILIKE '%{value}%'"
    unbound_value_re_expression: ClassVar[str] = "UTF8(payload) MATCHES '{value}'"

    # ------------------------------------------------------------------------
    # Overrides que precisam de lógica própria
    # ------------------------------------------------------------------------

    def convert_condition_field_eq_val_str(
        self, cond: ConditionFieldEqualsValueExpression, state: ConversionState
    ) -> Union[str, DeferredQueryExpression]:
        if cond.value.contains_special():
            value = self.convert_value_str(cond.value, state)
            return f"{cond.field} ILIKE {value}"
        # igualdade exata: sem escape de wildcards, só aspas simples duplicadas
        raw = "".join(p for p in cond.value.s if isinstance(p, str)).replace("'", "''")
        return f"{cond.field} = '{raw}'"

    # ------------------------------------------------------------------------
    # Finalização: envolve a condição gerada no template SELECT ... WHERE ...
    # ------------------------------------------------------------------------

    def finalize_query_default(
        self, rule: SigmaRule, query: str, index: int, state: ConversionState
    ) -> str:
        # Ajusta a janela temporal por omissão conforme a tua retenção/caso de uso.
        return f"SELECT * FROM events WHERE {query} LAST 24 HOURS"