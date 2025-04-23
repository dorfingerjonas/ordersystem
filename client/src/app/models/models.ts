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
  amount?: number;
  category: Category;
  ordering: number; // used to sort products
}

export interface Order {
  products: { id: number, amount: number }[];
  table: number;
  waiter: string;
  note?: string;
}

export interface Category extends WithId {
  name: string;
  ordering: number;
}

export interface OrderedItem extends WithId {
  item: Product;
  paid: boolean;
  table: Table;
}

export interface OpenProduct extends Product {
  dbIds: number[];
  paid: boolean;
}

export interface Printer extends WithId {
  type: PrinterType;
  name: string;
  interface: string;
  controlInterval: number;
}

export interface InfrastructureConfig extends WithId {
  printer: Printer;
  categories: Category[];
  lastPing: number;
}

export interface InfrastructureConfigDTO extends WithId {
  printer: Printer;
  categories: number[];
  lastPing: number;
}

export enum PrinterType {
  EPSON = 'EPSON',
  STAR = 'STAR',
}
