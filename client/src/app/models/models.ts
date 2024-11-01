export interface Table {
  nr: string;
}

export interface OrderableItem {
  id: number;
  name: string;
  price: number;
  amount?: number;
}

export interface Drink extends OrderableItem {
  category: 'alcohol' | 'anti';
}

export interface Food extends OrderableItem {
}

export interface Order {
  id: number;
  drinks: OrderableItem[];
  food: OrderableItem [];
  table: Table;
  waiter: string;
  timestamp: number;
  note?: string;
}
