import { Component, Inject } from '@angular/core';
import { Category } from '../../../../models/models';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-category-popup',
  templateUrl: './category-popup.component.html',
  styleUrls: [ './category-popup.component.scss' ]
})
export class CategoryPopupComponent {

  public category: Category;
  public isEdit: boolean;

  constructor(@Inject(MAT_DIALOG_DATA) public data: Category | null,
              public dialogRef: MatDialogRef<CategoryPopupComponent>) {
    this.isEdit = false;

    if (data) {
      this.category = { ...data };
      this.isEdit = true;
    } else {
      this.category = {
        id: -1,
        name: '',
        ordering: NaN
      };
    }
  }

  public save(): void {
    if (this.category.name.trim().length === 0) {
      this.dialogRef.close(null);
    } else {
      console.log(this.category);
      this.dialogRef.close({ name: this.category.name.trim() });
    }
  }

}
