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
