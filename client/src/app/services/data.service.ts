import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  Category,
  Device,
  InfrastructureConfigDTO,
  Order,
  OrderedItem,
  Product,
  Table,
  WithId
} from '../models/models';
import { supabase } from '../supabase/supabase';
import { PostgrestSingleResponse } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  public tables: BehaviorSubject<Table[]>;
  public categories: BehaviorSubject<Category[]>;
  public products: BehaviorSubject<Product[]>;
  public orderedItems: BehaviorSubject<OrderedItem[]>;
  public devices: BehaviorSubject<Device[]>;
  public infrastructure: BehaviorSubject<InfrastructureConfigDTO[]>;

  constructor() {
    this.tables = new BehaviorSubject<Table[]>([]);
    this.categories = new BehaviorSubject<Category[]>([]);
    this.products = new BehaviorSubject<Product[]>([]);
    this.orderedItems = new BehaviorSubject<OrderedItem[]>([]);
    this.devices = new BehaviorSubject<Device[]>([]);
    this.infrastructure = new BehaviorSubject<InfrastructureConfigDTO[]>([]);

    this.initTableData('ordered_product', this.orderedItems, '*, table:table(*), item:product(*)');
    this.initTableData('product', this.products, '*, category:category(*)');
    this.initTableData('category', this.categories);
    this.initTableData('tables', this.tables);
    this.initTableData('device', this.devices);
    this.initTableData('infrastructure', this.infrastructure, '*, printer:device(*)');

    this.fetchData();
  }

  public fetchData(): void {
    this.tables.next(this.tables.value);
    this.products.next(this.products.value);
    this.categories.next(this.categories.value);
    this.orderedItems.next(this.orderedItems.value);
    this.devices.next(this.devices.value);
    this.infrastructure.next(this.infrastructure.value);
  }

  public upsert<T extends WithId>(relation: string, element: T): Promise<PostgrestSingleResponse<any>> {
    if (element.id === -1) {
      delete (element as never)['id'];
    }

    return new Promise((resolve) => {
      supabase.from(relation).upsert([ element ]).then(r => {
        resolve(r);
      });
    });
  }

  public delete(relation: string, id: number): Promise<unknown> {
    return new Promise(async (resolve, reject) => {
      const { data, error } = await supabase.from(relation).delete().eq('id', id);

      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    });

  }

  public createOrder(order: Order): Promise<PostgrestSingleResponse<any>> {
    return new Promise((resolve, reject) => {
      supabase.from('orders').insert([ order ]).then(r => {
        if (r.error) {
          console.error(r.error);
          reject(r.error);
        } else {
          resolve(r);
        }
      });
    });
  }

  private async initTableData<T extends WithId[]>(relation: string, collection: BehaviorSubject<T>, select: string = '*'): Promise<void> {
    const { data, error } = await supabase.from(relation).select(select);

    if (error) {
      console.log(error.message);
    } else {
      collection.next(data as unknown as T);
    }

    supabase
      .channel(`realtime-${ relation }`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: relation },
        (payload) => {
          console.log('Realtime Change:', payload);

          const currentValue: T = collection.getValue();

          switch (payload.eventType) {
            case 'INSERT':
              const newElement = payload.new as any;

              if (newElement.category && !isNaN(Number(newElement.category))) {
                const id = Number(newElement.category);
                newElement.category = this.categories.getValue().find(c => c.id === id) || { id };
              }

              currentValue.push(newElement as T[0]);
              collection.next(currentValue);
              break;
            case 'UPDATE':
              const index = currentValue.findIndex(v => v.id === payload.old['id']);
              const newElem = payload.new as any;

              if (newElem.category && !isNaN(Number(newElem.category))) {
                const id = Number(newElem.category);
                newElem.category = this.categories.getValue().find(c => c.id === id) || { id };
              }

              if (index !== -1) {
                currentValue[index] = newElem as T[0];

                collection.next(currentValue);
              }
              break;
            case 'DELETE':
              collection.next(currentValue.filter(v => v.id !== payload.old['id']) as T);
              break;
          }
        }
      )
      .subscribe();
  }
}
