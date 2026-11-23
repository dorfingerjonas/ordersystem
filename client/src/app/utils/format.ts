const eurFormatter = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

/** 4 -> "4,00 €" */
export function eur(value: number): string {
  return eurFormatter.format(Math.round((value || 0) * 100) / 100);
}

/** rounds to cents, avoids float drift when summing prices */
export function cents(value: number): number {
  return Math.round((value || 0) * 100);
}

export function byOrdering<T extends { ordering: number }>(a: T, b: T): number {
  return (a.ordering ?? 0) - (b.ordering ?? 0);
}

/** natural sort for table numbers: "2" < "10", "O1" < "O2" */
export function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, 'de', { numeric: true, sensitivity: 'base' });
}

/** "max-mustermann@x.at" -> "Max Mustermann" */
export function nameFromEmail(email: string): string {
  return email
    .split('@')[0]
    .split(/[-._]/)
    .filter(Boolean)
    .map(v => v.substring(0, 1).toUpperCase() + v.substring(1).toLowerCase())
    .join(' ');
}
