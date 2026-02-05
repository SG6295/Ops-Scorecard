const nullLike = new Set(['', 'NA', 'N/A', 'N.A.', 'NULL', 'null', 'NaN', '-']);

export function normalizeValue(value: string | undefined | null) {
  if (value === undefined || value === null) return null;
  const trimmed = value.toString().trim();
  if (nullLike.has(trimmed)) return null;
  return trimmed;
}

export function parseNumber(value: string | undefined | null) {
  const normalized = normalizeValue(value);
  if (normalized === null) return null;
  const num = Number(normalized);
  if (Number.isNaN(num)) return null;
  return num;
}

export function parseNumberLoose(value: string | undefined | null) {
  const normalized = normalizeValue(value);
  if (normalized === null) return null;
  const cleaned = normalized.replace(/,/g, '').replace(/%/g, '');
  const num = Number(cleaned);
  if (Number.isNaN(num)) return null;
  return num;
}

export function parseDateDMY(value: string | undefined | null) {
  const normalized = normalizeValue(value);
  if (!normalized) return null;
  const match = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return date;
}

const monthMap: Record<string, number> = {
  Jan: 1,
  Feb: 2,
  Mar: 3,
  Apr: 4,
  May: 5,
  Jun: 6,
  Jul: 7,
  Aug: 8,
  Sep: 9,
  Oct: 10,
  Nov: 11,
  Dec: 12
};

export function parseDateDDMonYYYY(value: string | undefined | null) {
  const normalized = normalizeValue(value);
  if (!normalized) return null;
  const match = normalized.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = monthMap[match[2]];
  const year = Number(match[3]);
  if (!month) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return date;
}

export function isSameMonthYear(date: Date, month: number, year: number) {
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1;
}

export function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
