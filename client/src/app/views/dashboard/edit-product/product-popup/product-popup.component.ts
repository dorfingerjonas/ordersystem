import { Component, Inject } from '@angular/core';
import { Category, Product } from '../../../../models/models';
import { FormControl, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DataService } from '../../../../services/data.service';

@Component({
  selector: 'app-product-popup',
  templateUrl: './product-popup.component.html',
  styleUrls: [ './product-popup.component.scss' ]
})
export class ProductPopupComponent {

  public product: Product;
  public isEdit: boolean;
  public formControl: FormControl;
  public categories: Category[];

  constructor(@Inject(MAT_DIALOG_DATA) public dialogData: Product | null,
              public dialogRef: MatDialogRef<ProductPopupComponent>,
              private readonly data: DataService) {
    this.isEdit = false;
    this.categories = [];

    this.data.categories.subscribe(categories => {
      this.categories = categories.sort((a, b) => a.ordering - b.ordering);
    });

    this.data.fetchData();

    this.formControl = new FormControl('', [
      Validators.required,
      Validators.minLength(1)
    ]);

    if (dialogData) {
      this.product = {
        ...dialogData,
        category: this.categories.find(c => c.id === dialogData.category.id) || this.categories[0]
      };
      this.isEdit = true;
      this.formControl.setValue(this.product.name);
    } else {
      this.product = {
        id: -1,
        name: '',
        price: NaN,
        ordering: NaN,
        category: {
          id: -1,
          name: '',
          ordering: NaN
        }
      };
    }
  }

  public save(): void {
    if (this.formControl.invalid) return;

    this.product.name = String(this.formControl.value).trim();

    if (this.product.name.trim().length === 0) {
      this.dialogRef.close(null);
    } else {
      this.dialogRef.close(this.product);
    }
  }

}
