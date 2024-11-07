import { Component, Inject } from '@angular/core';
import { Drink } from '../../../../models/models';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-drink-popup',
  templateUrl: './drink-popup.component.html',
  styleUrls: [ './drink-popup.component.scss' ]
})
export class DrinkPopupComponent {

  public drink: Drink;
  public isEdit: boolean;
  public formControl: FormControl;

  constructor(@Inject(MAT_DIALOG_DATA) public data: Drink | null,
              public dialogRef: MatDialogRef<DrinkPopupComponent>) {
    this.isEdit = false;

    this.formControl = new FormControl('', [
      Validators.required,
      Validators.minLength(1)
    ]);

    if (data) {
      this.drink = { ...data };
      this.isEdit = true;
      this.formControl.setValue(data.name);
    } else {
      this.drink = {
        id: Date.now(),
        name: '',
        price: 0,
        category: 'alcohol'
      };
    }
  }

  public save(): void {
    if (this.formControl.invalid) return;

    this.drink.name = String(this.formControl.value).trim();

    if (this.drink.name.trim().length === 0) {
      this.dialogRef.close(null);
    } else {
      this.dialogRef.close(this.drink);
    }
  }

}
