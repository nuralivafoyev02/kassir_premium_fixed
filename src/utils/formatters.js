export const fmt = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return '0';
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(v);
};

export const toMs = (v) => {
  if (typeof v === 'number') return v;
  const p = new Date(v).getTime();
  return Number.isFinite(p) ? p : Date.now();
};
