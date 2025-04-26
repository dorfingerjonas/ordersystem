import { PrinterTypes } from 'node-thermal-printer';

export interface WithId {
  id: number;
}

export interface Table extends WithId {
  nr: string;
  ordering: number; // used to sort tables
}

export interface Product extends WithId {
  name: string;
  price: number;
  amount: number;
  category: Category;
  ordering: number; // used to sort products
}

export interface OrderDTO extends WithId {
  products: { id: number, amount: number }[];
  table: number;
  waiter: string;
  timestamp: number;
  note?: string;
  printed: boolean;
}

export interface Order extends WithId {
  products: Product[];
  table: Table;
  waiter: string;
  timestamp: number;
  note?: string;
  printed: boolean;
}

export interface Category extends WithId {
  name: string;
  ordering: number;
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
