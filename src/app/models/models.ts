export interface Table {
  nr: number;
}

export interface Drink {
  id: number;
  name: string;
  price: number;
  category: 'alcohol' | 'anti';
}

export interface Food {
  id: number;
  name: string;
  price: number;
}
