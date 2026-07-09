// Rendimento (yield) evaluation — single source of truth on the server.
//
// ratio = páginas rodadas desde a última troca / rendimento esperado do componente
//   >= 1.00  -> Excelente          (verde)
//   >= 0.90  -> Dentro do esperado (verde)
//   >= 0.75  -> Próximo do limite  (amarelo)
//   <  0.75  -> Abaixo do esperado (vermelho, alerta)
//
// These thresholds are the tunable business rule. Adjust GREEN_MIN / YELLOW_MIN
// to change what counts as "dentro do esperado" vs "alerta".
export const GREEN_MIN = 0.9;
export const YELLOW_MIN = 0.75;

/**
 * @param {number|null} pagesUsed  pages printed since the previous change of the same component
 * @param {number|null} expected   expected yield (pages) for that component
 * @param {boolean} isFirst        true when there is no previous change to compare against
 */
export function computeYieldStatus(pagesUsed, expected, isFirst) {
  if (isFirst) {
    return { level: "neutral", code: "primeira", label: "Primeira troca", ratio: null };
  }
  if (pagesUsed == null) {
    return { level: "neutral", code: "reset", label: "Contador reiniciado", ratio: null };
  }
  if (!expected || expected <= 0) {
    return { level: "neutral", code: "sem_meta", label: "Sem meta definida", ratio: null };
  }
  const ratio = pagesUsed / expected;
  if (ratio >= 1.0) return { level: "green", code: "excelente", label: "Excelente", ratio };
  if (ratio >= GREEN_MIN) return { level: "green", code: "dentro", label: "Dentro do esperado", ratio };
  if (ratio >= YELLOW_MIN) return { level: "yellow", code: "limite", label: "Próximo do limite", ratio };
  return { level: "red", code: "abaixo", label: "Abaixo do esperado", ratio };
}

export const COMPONENT_LABEL = { toner: "Toner", cilindro: "Cilindro" };
