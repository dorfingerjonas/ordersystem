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

/** one sold item (one row per unit) */
export interface OrderedProduct {
  id: string; // uuid
  item: number | null;
  paid: boolean;
  table: number | null;
  /** ISO time it was ordered / sold directly (null for rows from before the statistics migration) */
  created_at?: string | null;
  /** price in EUR at that moment (null: use the current product price) */
  price?: number | null;
  /** order it came from, null = direct sale while cashing up */
  order_id?: number | null;
  /** who ordered it (direct sale: who sold it) */
  waiter?: string | null;
  /** ISO time it was cashed up */
  paid_at?: string | null;
  /** who cashed it up */
  paid_by?: string | null;
}

/** row of "orders" as needed by the statistics */
export interface OrderRow extends WithId {
  table: number | null;
  waiter: string | null;
  timestamp: string | number | null;
  products?: OrderLineDTO[] | null;
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

/** snapshot of a payment, printed as "Zahlungsbestätigung" (print_job.payload) */
export interface ReceiptPayload {
  /** table nr, null = direct sale */
  table: string | null;
  waiter: string;
  /** free text, e.g. the club the receipt is for */
  recipient?: string;
  /** epoch millis of the payment */
  timestamp: number;
  lines: { name: string; amount: number; price: number }[];
  /** total in EUR */
  total: number;
  /** cash received in EUR, null = not entered */
  received: number | null;
}

/** print_job.payload of type 'ORDER': print an order slip again ("NACHDRUCK") */
export interface ReprintPayload {
  order_id: number;
  /** true: every line on this printer, false: only the categories of this printer */
  all?: boolean;
}

/** row of the orders table as shown in the order list */
export interface OrderRecord {
  id: number;
  table: number;
  waiter: string;
  timestamp: string;
  products: OrderLineDTO[] | null;
  note: string | null;
  printed: boolean;
}

export interface PrintJob extends WithId {
  created_at: string;
  device: number;
  type: 'TEST' | 'RECEIPT' | 'ORDER';
  payload?: ReceiptPayload | ReprintPayload | null;
  status: PrintJobStatus;
  message: string | null;
  finished_at: string | null;
}
