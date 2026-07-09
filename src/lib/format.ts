const nf = new Intl.NumberFormat("pt-BR");

export function formatNumber(n: number | null | undefined): string {
  return n == null ? "—" : nf.format(n);
}

export function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function todayISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function formatPercent(ratio: number | null | undefined): string {
  if (ratio == null) return "—";
  return `${Math.round(ratio * 100)}%`;
}

/** "Nome — Localização" quando houver localização; senão só o nome. */
export function printerLabel(p: { name: string; location?: string | null }): string {
  return p.location ? `${p.name} — ${p.location}` : p.name;
}
