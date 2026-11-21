import { GroupAttribute, Product, ProductGroup } from '../models/models';

/**
 * Pure helpers for product groups (no Angular, no Supabase) so they can be
 * used by the editor, the order screen and the save logic alike.
 *
 * Pricing:
 *  - 1 attribute:  price per value                         (grid: rows = attribute 1)
 *  - 2 attributes: price per value of attribute 2          (grid: rows = attribute 2) + surcharge per value of attribute 1
 *  - 3 attributes: price per attribute 2 x attribute 3     (grid: rows x columns)     + surcharge per value of attribute 1
 */

export const MAX_ATTRIBUTES = 3;
export const MAX_VALUES = 12;
export const MAX_VARIANTS = 120;

export type GroupShape = Pick<ProductGroup, 'name' | 'attributes' | 'prices' | 'surcharges' | 'excluded' | 'prefix_name'>;

export interface Combination {
  /** values in attribute order */
  values: string[];
  variant: Record<string, string>;
  key: string;
}

/** stable key of a variant, independent of the attribute order */
export function variantKey(variant: Record<string, string>): string {
  return Object.keys(variant).sort().map(k => `${ k }=${ variant[k] }`).join('|');
}

export function priceKey(values: string[]): string {
  return JSON.stringify(values);
}

/** the attributes that span the price grid */
export function priceAttributes(attributes: GroupAttribute[]): GroupAttribute[] {
  return attributes.length <= 1 ? attributes.slice(0, 1) : attributes.slice(1);
}

/** the attribute that can have a surcharge per value (null with only one attribute) */
export function surchargeAttribute(attributes: GroupAttribute[]): GroupAttribute | null {
  return attributes.length >= 2 ? attributes[0] : null;
}

/** every combination of the attribute values (cartesian product) in display order */
export function combinations(attributes: GroupAttribute[]): Combination[] {
  if (attributes.length === 0 || attributes.some(a => a.values.length === 0)) return [];

  let result: string[][] = [ [] ];

  attributes.forEach(attribute => {
    result = result.flatMap(prefix => attribute.values.map(v => [ ...prefix, v ]));
  });

  return result.map(values => {
    const variant: Record<string, string> = {};
    attributes.forEach((a, i) => variant[a.id] = values[i]);
    return { values, variant, key: variantKey(variant) };
  });
}

export function variantName(group: Pick<GroupShape, 'name' | 'prefix_name'>, values: string[]): string {
  return [ ...(group.prefix_name ? [ group.name ] : []), ...values ]
    .map(v => v.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ');
}

/** price of a variant in cents, null if the grid cell is empty */
export function variantPriceCents(group: Pick<GroupShape, 'attributes' | 'prices' | 'surcharges'>, values: string[]): number | null {
  const attributes = group.attributes;
  const priceValues = attributes.length <= 1 ? values.slice(0, 1) : values.slice(1);
  const base = group.prices[priceKey(priceValues)];

  if (base === undefined || base === null || !Number.isFinite(base)) return null;

  const surchargeAttr = surchargeAttribute(attributes);
  const surcharge = surchargeAttr ? group.surcharges[values[0]] ?? 0 : 0;

  return Math.round(base * 100) + Math.round((Number.isFinite(surcharge) ? surcharge : 0) * 100);
}

/** "2,50", "2.5", "2,50 €", " 3 " -> cents; empty / invalid / negative -> null */
export function parseEuro(text: string | null | undefined): number | null {
  const cleaned = String(text ?? '').replace(/[€\s]/g, '').replace(',', '.');

  // max. 2 decimals: "1,005" is a typo, not 1,01 €
  if (!cleaned || !/^\d*\.?\d{0,2}$/.test(cleaned) || cleaned === '.') return null;

  const value = Number(cleaned);

  return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : null;
}

/** cents -> "2,50" (for inputs) */
export function euroInput(cents: number | null | undefined): string {
  return cents === null || cents === undefined ? '' : (cents / 100).toFixed(2).replace('.', ',');
}

/** values of an active product, in attribute order; null if it doesn't match the attributes anymore */
export function valuesOf(attributes: GroupAttribute[], product: Pick<Product, 'variant'>): string[] | null {
  const variant = product.variant;

  if (!variant) return null;

  const values = attributes.map(a => variant[a.id]);

  if (values.some((v, i) => v === undefined || !attributes[i].values.includes(v))) return null;
  if (Object.keys(variant).length !== attributes.length) return null;

  return values;
}

export interface GroupSavePlan {
  inserts: Pick<Product, 'name' | 'price' | 'category' | 'variant' | 'available' | 'archived' | 'ordering'>[];
  updates: { id: number; patch: Partial<Product> }[];
  archive: number[];
  /** names that would exist twice */
  duplicateNames: string[];
}

/**
 * What has to happen to the product table so it matches the group:
 * active combinations get a product (re-using an existing / archived one with
 * the same variant), everything else in the group is archived (never deleted,
 * so revenue and open items stay intact).
 */
export function planGroupSave(
  group: GroupShape & { category: number; ordering: number },
  existing: Product[]
): GroupSavePlan {
  const excluded = new Set(group.excluded);
  const active = combinations(group.attributes).filter(c => !excluded.has(c.key));

  const byKey = new Map<string, Product>();

  // prefer non-archived rows if there are duplicates for the same variant
  [ ...existing ]
    .sort((a, b) => Number(a.archived) - Number(b.archived) || a.id - b.id)
    .forEach(p => {
      if (!p.variant) return;
      const key = variantKey(p.variant);
      if (!byKey.has(key)) byKey.set(key, p);
    });

  const plan: GroupSavePlan = { inserts: [], updates: [], archive: [], duplicateNames: [] };
  const used = new Set<number>();
  const names = new Map<string, number>();

  active.forEach(combination => {
    const name = variantName(group, combination.values);
    const cents = variantPriceCents(group, combination.values);
    const price = (cents ?? 0) / 100;
    const product = byKey.get(combination.key);

    names.set(name.toLowerCase(), (names.get(name.toLowerCase()) ?? 0) + 1);

    if (product) {
      used.add(product.id);

      const patch: Partial<Product> = {};

      if (product.name !== name) patch.name = name;
      if (Math.round(product.price * 100) !== Math.round(price * 100)) patch.price = price;
      if (product.category !== group.category) patch.category = group.category;
      if (product.archived) patch.archived = false;

      if (Object.keys(patch).length > 0) plan.updates.push({ id: product.id, patch });
    } else {
      plan.inserts.push({
        name,
        price,
        category: group.category,
        variant: combination.variant,
        available: true,
        archived: false,
        ordering: group.ordering
      });
    }
  });

  existing
    .filter(p => !used.has(p.id) && !p.archived)
    .forEach(p => plan.archive.push(p.id));

  plan.duplicateNames = [ ...names.entries() ].filter(([ , n ]) => n > 1).map(([ name ]) => name);

  return plan;
}

/** first problem that prevents saving, null if the group is fine */
export function validateGroup(group: GroupShape & { category: number | null }): string | null {
  if (!group.name.trim()) return 'Name fehlt';
  if (group.category === null) return 'Kategorie fehlt';
  if (group.attributes.length === 0) return 'Mindestens ein Merkmal anlegen';
  if (group.attributes.length > MAX_ATTRIBUTES) return `Höchstens ${ MAX_ATTRIBUTES } Merkmale`;

  const attributeNames = new Set<string>();

  for (const attribute of group.attributes) {
    const name = attribute.name.trim().toLowerCase();

    if (!name) return 'Ein Merkmal hat keinen Namen';
    if (attributeNames.has(name)) return `Merkmal „${ attribute.name.trim() }“ gibt es doppelt`;
    attributeNames.add(name);

    if (attribute.values.length === 0) return `„${ attribute.name.trim() }“ braucht mindestens einen Wert`;
  }

  const all = combinations(group.attributes);

  if (all.length > MAX_VARIANTS) return `Zu viele Varianten (${ all.length }, max. ${ MAX_VARIANTS })`;

  const excluded = new Set(group.excluded);
  const active = all.filter(c => !excluded.has(c.key));

  if (active.length === 0) return 'Mindestens eine Variante muss aktiv sein';

  const missing = active.find(c => variantPriceCents(group, c.values) === null);

  if (missing) return `Preis fehlt für „${ variantName(group, missing.values) }“`;

  return null;
}

// ---------------------------------------------------------------------
// order screen: tiles + variant sheet
// ---------------------------------------------------------------------

export interface ActiveVariant {
  product: Product;
  values: string[];
}

export interface VariantCell {
  label: string;
  product: Product | null;
}

export interface VariantRow {
  label: string;
  cells: VariantCell[];
}

export interface GroupTile {
  /** unique per tile, e.g. "3" or "3:Apfel" */
  key: string;
  group: ProductGroup;
  title: string;
  /** active variants shown in this tile */
  variants: ActiveVariant[];
  rows: VariantRow[];
  columns: number;
}

/**
 * Splits a group into tiles: with 2+ attributes one tile per value of the
 * first attribute ("Apfel", "Orange"), otherwise one tile for the group.
 */
export function groupTiles(group: ProductGroup, variants: ActiveVariant[]): GroupTile[] {
  const attributes = group.attributes;

  if (variants.length === 0 || attributes.length === 0) return [];

  const find = (values: string[]) =>
    variants.find(v => v.values.every((x, i) => x === values[i]))?.product ?? null;

  if (attributes.length === 1) {
    const cells = attributes[0].values.map(v => ({ label: v, product: find([ v ]) }));

    return [ {
      key: `${ group.id }`,
      group,
      title: group.name,
      variants,
      rows: [ { label: attributes[0].name, cells } ],
      columns: Math.min(cells.length, 3)
    } ];
  }

  return attributes[0].values
    .map(first => {
      const own = variants.filter(v => v.values[0] === first);
      let rows: VariantRow[];
      let columns: number;

      if (attributes.length === 2) {
        rows = [ { label: attributes[1].name, cells: attributes[1].values.map(v => ({ label: v, product: find([ first, v ]) })) } ];
        columns = Math.min(attributes[1].values.length, 3);
      } else {
        rows = attributes[1].values.map(second => ({
          label: second,
          cells: attributes[2].values.map(third => ({ label: third, product: find([ first, second, third ]) }))
        }));
        columns = Math.min(attributes[2].values.length, 3);
      }

      // drop rows without any active variant
      rows = rows.filter(r => r.cells.some(c => c.product));

      return {
        key: `${ group.id }:${ first }`,
        group,
        title: group.prefix_name ? `${ group.name } ${ first }` : first,
        variants: own,
        rows,
        columns
      };
    })
    .filter(t => t.variants.length > 0);
}

/** "2,50 €" or "2,50–4,00 €" */
export function priceRange(products: Pick<Product, 'price'>[], format: (v: number) => string): string {
  if (products.length === 0) return '';

  const prices = products.map(p => Math.round(p.price * 100));
  const min = Math.min(...prices);
  const max = Math.max(...prices);

  return min === max ? format(min / 100) : `${ format(min / 100).replace(/\s*€$/, '') }–${ format(max / 100) }`;
}
