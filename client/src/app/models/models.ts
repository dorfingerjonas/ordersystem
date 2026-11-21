export interface WithId {
  id: number;
}

export interface Area extends WithId {
  name: string;
  ordering: number;
}

export interface Table extends WithId {
  nr: string;
  ordering: number;
  area: number | null;
}

export interface Category extends WithId {
  name: string;
  ordering: number;
}

export interface Product extends WithId {
  name: string;
  price: number;
  category: number;
  ordering: number;
  available: boolean;
  /** group this product is a variant of */
  product_group: number | null;
  /** attribute id -> value, only for variants */
  variant: Record<string, string> | null;
  /** hidden: variant switched off / removed; still counted in revenue and payable if already ordered */
  archived: boolean;
}

export interface GroupAttribute {
  id: string;
  name: string;
  values: string[];
}

export interface ProductGroup extends WithId {
  name: string;
  category: number;
  ordering: number;
  /** 1-3 attributes, order = order in the product name */
  attributes: GroupAttribute[];
  /** price grid in EUR, key = priceKey(values of the price attributes) */
  prices: Record<string, number>;
  /** surcharge in EUR per value of the first attribute (only with 2+ attributes) */
  surcharges: Record<string, number>;
  /** variant keys switched off ("gibt es nicht") */
  excluded: string[];
  /** product name = "<group name> <values>" instead of "<values>" */
  prefix_name: boolean;
}

/** One entry of orders.products (jsonb). Same product may appear several times with different notes. */
export interface OrderLineDTO {
  id: number;
  amount: number;
  note?: string;
}

export interface NewOrder {
  products: OrderLineDTO[];
  table: number;
  waiter: string;
  note?: string;
}

export interface OrderedProduct {
  id: string; // uuid
  item: number | null;
  paid: boolean;
  table: number | null;
}

export enum PrinterType {
  EPSON = 'EPSON',
  STAR = 'STAR',
}

export enum DeviceType {
  SERVER = 'SERVER',
  PRINTER = 'PRINTER',
}

export interface Device extends WithId {
  type: PrinterType;
  name: string;
  interface: string;
  controlInterval: number;
  deviceType: DeviceType;
}

export interface Infrastructure extends WithId {
  printer: number;
  categories: number[] | null;
  lastPing: number | null;
}

export type PrintJobStatus = 'PENDING' | 'DONE' | 'FAILED';

export interface PrintJob extends WithId {
  created_at: string;
  device: number;
  type: 'TEST';
  status: PrintJobStatus;
  message: string | null;
  finished_at: string | null;
}
