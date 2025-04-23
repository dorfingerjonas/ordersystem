import { Component } from '@angular/core';
import { HeaderService } from '../../../services/header.service';
import { DataService } from '../../../services/data.service';
import { ActivatedRoute } from '@angular/router';
import { Category, OpenProduct, Product, Table } from '../../../models/models';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-pay',
  templateUrl: './pay.component.html',
  styleUrls: [ './pay.component.scss' ]
})
export class PayComponent {

  public readonly selectedTableNr: string | null;
  public products: Map<number, Product[]>;
  public openItems: OpenProduct[];
  public categories: Category[];
  public selectedOpenProducts: OpenProduct[];
  private tables: Table[];

  constructor(private header: HeaderService,
              private data: DataService,
              private readonly route: ActivatedRoute,
              private readonly snackBar: MatSnackBar) {
    this.selectedTableNr = this.route.snapshot.paramMap.get('tableNr');
    this.header.text = this.selectedTableNr ? `Tisch ${ this.selectedTableNr } kassieren` : 'Kassieren';

    this.products = new Map<number, Product[]>();
    this.categories = [];
    this.openItems = [];
    this.tables = [];
    this.selectedOpenProducts = [];

    this.data.categories.subscribe(categories => {
      this.categories = categories.sort((a, b) => a.ordering - b.ordering);

      this.categories.forEach(category => {
        if (!this.products.has(category.id)) {
          this.products.set(category.id, []);
        }
      });
    });

    this.data.tables.subscribe(tables => this.tables = tables);

    this.data.products.subscribe(products => {
      this.products.clear();
      products
        .sort((a, b) => a.ordering - b.ordering)
        .forEach(p => {
          p.amount = 0;

          if (this.products.has(p.category.id)) {
            this.products.get(p.category.id)!.push(p);
          } else {
            this.products.set(p.category.id, [ p ]);
          }
        });
    });

    if (this.selectedTableNr) {
      this.data.fetchData();
      this.data.orderedItems.subscribe(items => {
        this.openItems = [];

        items
          .filter(i => isNaN(Number(i.table)) && i.table.nr === this.selectedTableNr && !i.paid)
          .forEach(i => {
            const index = this.openItems.findIndex(p => p.id === i.item.id);

            if (index === -1) {
              this.openItems.push({
                id: i.item.id,
                dbIds: [ i.id ],
                amount: 1,
                category: i.item.category,
                ordering: i.item.ordering,
                name: i.item.name,
                paid: i.paid,
                price: i.item.price
              });
            } else {
              this.openItems[index].dbIds.push(i.id);
              this.openItems[index].amount! += 1;
            }
          });

        this.openItems.sort((a, b) => a.ordering - b.ordering);
      });
    }

    this.data.fetchData();
  }

  public formatPrice(price: number): string {
    return price.toString().replace('.', ',');
  }

  public reset(): void {
    this.products.forEach(p => p.forEach(i => i.amount = 0));
    this.selectedOpenProducts = [];
    this.openItems.forEach(o => o.amount = o.dbIds.length);
    document.getElementsByClassName('page-container')[0].scrollTop = 0;
  }

  public async complete(): Promise<void> {
    const upsertPromises: Promise<any>[] = [];
    const tableId = this.tables.find(t => t.nr === this.selectedTableNr)?.id || null;

    this.products.forEach(product => {
      product
        .filter(p => (p.amount || 0) > 0)
        .forEach(p => {
          const item = { id: -1, table: tableId, item: p.id, paid: true };

          for (let i = 0; i < (p.amount || 0); i++) {
            upsertPromises.push(this.data.upsert('ordered_product', item));
          }
        });
    });

    this.selectedOpenProducts.forEach(product => {
      // needed bc dbIds is manipulated in the loop
      const iterations = product.dbIds.length - (product.amount || 0);

      for (let i = 0; i < iterations; i++) {
        const id = product.dbIds.shift();

        if (id) {
          upsertPromises.push(this.data.upsert('ordered_product', {
            id,
            table: tableId,
            item: product.id,
            paid: true
          }));
        }
      }
    });

    Promise.all(upsertPromises)
      .then(() => {
        this.snackBar.open('Kassiervorgang erfolgreich.', 'X', { duration: 2500 });
        this.reset();
      })
      .catch(error => {
        console.log(error);
        this.snackBar.open('Kassiervorgang fehlgeschlagen.', 'X', { duration: 2500 });
      });
  }

  public getCategoriesWithProducts(): Category[] {
    return this.categories.filter(c => (this.products.get(c.id)?.length || 0) > 0);
  }

  public getSelectedProducts(): Product[] {
    const products: Product[] = [];

    this.products.forEach(product => {
      products.push(...product.filter(p => (p.amount || 0) > 0));
    });

    this.selectedOpenProducts.forEach((product: OpenProduct) => {
      if (product.dbIds.length !== product.amount) {
        products.push({
          ...product,
          amount: product.dbIds.length - (product.amount || 0)
        });
      }
    });

    return products.sort((a, b) => a.category.ordering - b.category.ordering);
  }

  public getTotalPrice(): number {
    let sum = 0;

    this.products.forEach(product => {
      sum += product.reduce((acc, p) => acc + (p.price * (p.amount || 0)), 0);
    });

    this.selectedOpenProducts.forEach(p => {
      sum += p.price * (p.dbIds.length - (p.amount || 0));
    });

    return sum;
  }

  public openItemsChange(products: Product[]): void {
    this.selectedOpenProducts = products as OpenProduct[];
  }
}
