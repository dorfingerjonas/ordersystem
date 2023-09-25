export interface Table {
  nr: string;
}

export interface Drink {
  id: number;
  name: string;
  price: number;
  category: 'alcohol' | 'anti';
  amount?: number;
}

export interface Food {
  id: number;
  name: string;
  price: number;
  amount?: number;
}

export interface Order {
  id: number;
  drinks: Drink[];
  food: Food[];
  table: Table;
  waiter: string;
  timestamp: number;
}
