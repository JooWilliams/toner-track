import { HttpError } from "./http.js";

export function parsePagination(query, defaultLimit = 50, maxLimit = 100) {
  const limitValue = Number(query.limit ?? defaultLimit);
  const offsetValue = Number(query.offset ?? 0);
  if (!Number.isInteger(limitValue) || limitValue < 1 || !Number.isInteger(offsetValue) || offsetValue < 0) {
    throw new HttpError(400, "Parâmetros de paginação inválidos.");
  }
  return { limit: Math.min(limitValue, maxLimit), offset: offsetValue };
}
