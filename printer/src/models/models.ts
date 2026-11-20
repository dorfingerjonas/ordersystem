import { PrinterTypes } from 'node-thermal-printer';

export interface WithId {
  id: number;
}

export interface Table extends WithId {
  nr: string;
  ordering: number; // used to sort tables
}

export interface Category extends WithId {
  name: string;
  ordering: number;
}

export interface Product extends WithId {
  name: string;
  price: number;
  category: Category;
  ordering: number; // used to sort products
}

/** product line of an order; the same product can appear several times with different notes */
export interface OrderLine extends Product {
  amount: number;
  note?: string;
}

/** one entry of orders.products (jsonb) */
export interface OrderLineDTO {
  id: number;
  amount: number;
  note?: string;
}

export interface OrderDTO extends WithId {
  products: OrderLineDTO[];
  table: number;
  waiter: string;
  timestamp: string | number;
  note?: string;
  printed: boolean;
}

export interface Order extends WithId {
  products: OrderLine[];
  table: Table;
  waiter: string;
  timestamp: number;
  note?: string;
  printed: boolean;
}

export enum DeviceType {
  PRINTER = 'PRINTER',
  SERVER = 'SERVER'
}

export interface Device extends WithId {
  type: PrinterTypes;
  name: string;
  interface: string;
  controlInterval: number;
  deviceType: DeviceType;
}

export interface PrintJob extends WithId {
  created_at: string;
  device: number;
  type: 'TEST';
  status: 'PENDING' | 'DONE' | 'FAILED';
  message: string | null;
  finished_at: string | null;
}
