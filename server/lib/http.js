// Small helpers shared across route modules.

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Wrap a (sync or async) handler so thrown errors reach the error middleware. */
export const h = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/** Trim a value to a string, returning null for empty/blank/nullish input. */
export function emptyToNull(v) {
  const s = (v == null ? "" : String(v)).trim();
  return s === "" ? null : s;
}
