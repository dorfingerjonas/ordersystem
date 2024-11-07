import { Component, Inject } from '@angular/core';
import { Food } from '../../../../models/models';
import { FormControl, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-food-popup',
  templateUrl: './food-popup.component.html',
  styleUrls: [ './food-popup.component.scss' ]
})
export class FoodPopupComponent {

  public food: Food;
  public isEdit: boolean;
  public formControl: FormControl;

  constructor(@Inject(MAT_DIALOG_DATA) public data: Food | null,
              public dialogRef: MatDialogRef<FoodPopupComponent>) {
    this.isEdit = false;

    this.formControl = new FormControl('', [
      Validators.required,
      Validators.minLength(1)
    ]);

    if (data) {
      this.food = { ...data };
      this.isEdit = true;
      this.formControl.setValue(data.name);
    } else {
      this.food = {
        id: Date.now(),
        name: '',
        price: 0
      };
    }
  }

  public save(): void {
    if (this.formControl.invalid) return;

    this.food.name = String(this.formControl.value).trim();

    if (this.food.name.trim().length === 0) {
      this.dialogRef.close(null);
    } else {
      this.dialogRef.close(this.food);
    }
  }
}
