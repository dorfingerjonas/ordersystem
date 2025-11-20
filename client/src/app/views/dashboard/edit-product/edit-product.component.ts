import { Component } from '@angular/core';
import { Category, Product } from '../../../models/models';
import { DataService } from '../../../services/data.service';
import { HeaderService } from '../../../services/header.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProductPopupComponent } from './product-popup/product-popup.component';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-edit-product',
  templateUrl: './edit-product.component.html',
  styleUrls: [ './edit-product.component.scss' ]
})
export class EditProductComponent {

  public products: Product[];
  public categories: Category[];
  public loaded: boolean;
  public displayData: { name: string; id: number; products: Product[] }[];

  constructor(private readonly data: DataService,
              private readonly header: HeaderService,
              private readonly dialog: MatDialog,
              private readonly snackBar: MatSnackBar) {
    this.products = [];
    this.categories = [];
    this.loaded = false;
    this.displayData = [];

    setTimeout(() => this.header.text = 'Produkte bearbeiten');

    this.data.products.subscribe(products => {
      this.products = products;
      this.loaded = true;
      this.mapDisplayData();
    });

    this.data.categories.subscribe(categories => {
      this.categories = categories.sort((a, b) => a.ordering - b.ordering);
      this.mapDisplayData();
    });

    this.data.fetchData();
  }

  public create(): void {
    this.dialog.open(ProductPopupComponent, { data: null }).afterClosed().subscribe((newProduct: Product | null) => {
      if (newProduct) {
        // check if product already exists
        if (this.products.find(p => p.name === newProduct.name)) {
          // product exists => do nothing
          this.snackBar.open(`Produkt ${ newProduct.name } existiert bereits`, 'X', { duration: 2500 });
        } else {
          // product does not exist => add
          delete (newProduct as any).id;
          this.data.upsert('product', {
            ...newProduct,
            category: newProduct.category.id,
            ordering: this.products.length
          });
        }
      }
    });
  }

  public delete(id: number): void {
    this.data.delete('product', id).catch(err => {
      console.error(err);
      this.snackBar.open('Fehler beim Löschen', 'X', { duration: 2500 });
    });
  }

  public edit(product: Product): void {
    this.dialog.open(ProductPopupComponent, { data: product }).afterClosed().subscribe((editedProduct: Product | null) => {
      if (editedProduct) {
        // check if product already exists
        const indexName = this.products.findIndex(t => t.name.toLowerCase().trim() === editedProduct.name.toLowerCase().trim()
          && t.id !== editedProduct.id);

        if (indexName != -1) {
          // product exists => do nothing
          this.snackBar.open(`Produkt ${ editedProduct.name } existiert bereits`, 'X', { duration: 2500 });
          return;
        }

        this.data.upsert('product', { ...editedProduct, category: editedProduct.category.id });
      }
    });
  }

  public drop(event: CdkDragDrop<any, any>, categoryIndex: number): void {
    moveItemInArray(this.displayData[categoryIndex].products, event.previousIndex, event.currentIndex);

    const productsToUpdate: Product[] = [];

    this.displayData[categoryIndex].products = this.displayData[categoryIndex].products.map((t, i) => {
      const newProduct = { ...t, ordering: i + 1 };

      if (t.ordering !== newProduct.ordering) {
        productsToUpdate.push(newProduct);
      }

      return newProduct;
    });

    productsToUpdate.forEach(p => {
      this.data.upsert('product', { ...p, category: p.category.id });
    });
  }

  public getFilteredProducts(categoryId: number): Product[] {
    return this.products
      .filter(p => p.category.id === categoryId)
      .sort((a, b) => a.ordering - b.ordering);
  }

  public formatPrice(price: string | null): string {
    if (!price) return '0,00';
    return price.replace('.', ',');
  }

  private mapDisplayData(): void {
    if (!this.loaded || this.categories.length === 0) return;

    this.displayData = this.categories.map(c => ({
      name: c.name,
      id: c.id,
      products: this.getFilteredProducts(c.id)
    }));
  }
}
