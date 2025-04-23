import { Component } from '@angular/core';
import { Category, Product } from '../../../models/models';
import { DataService } from '../../../services/data.service';
import { HeaderService } from '../../../services/header.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { CategoryPopupComponent } from './category-popup/category-popup.component';

@Component({
  selector: 'app-edit-category',
  templateUrl: './edit-category.component.html',
  styleUrls: [ './edit-category.component.scss' ]
})
export class EditCategoryComponent {

  public categories: Category[];
  public loaded: boolean;

  constructor(private readonly data: DataService,
              private readonly header: HeaderService,
              private readonly dialog: MatDialog,
              private readonly snackBar: MatSnackBar) {
    this.categories = [];
    this.loaded = false;

    this.data.categories.subscribe(categories => {
      this.categories = categories.sort((a, b) => a.ordering - b.ordering);
      this.loaded = true;
    });

    this.data.fetchData();

    this.header.text = 'Kategorien bearbeiten';
  }

  public create(): void {
    this.dialog.open(CategoryPopupComponent, { data: null }).afterClosed().subscribe((newCategory: Product | null) => {
      if (newCategory) {
        // check if category already exists
        if (this.categories.find(c => c.id === newCategory.id)) {
          // category exists => do nothing
          this.snackBar.open(`Kategorie ${ newCategory.name } existiert bereits`, 'X', { duration: 2500 });
        } else {
          // category does not exist => add
          this.data.upsert<Category>('category', { ...newCategory });
        }
      }
    });
  }

  public delete(id: number): void {
    this.data.delete('category', id).then(res => {
      this.snackBar.open('Kategorie gelöscht', 'X', { duration: 2500 });
    }).catch(err => {
      if (err.code === '23503') {
        this.snackBar.open('Kategorie kann nicht gelöscht werden, da sie noch verwendet wird', 'X', { duration: 2500 });
      } else {
        console.log(err);
        this.snackBar.open('Kategorie konnte nicht gelöscht werden', 'X', { duration: 2500 });
      }
    });
  }

  public edit(category: Category): void {
    this.dialog.open(CategoryPopupComponent, { data: category }).afterClosed().subscribe((newCategory: Category | null) => {
      if (newCategory) {
        // check if category already exists
        if (this.categories.find(c => c.name.toLowerCase().trim() === newCategory.name.toLowerCase().trim())) {
          // category exists => do nothing
          this.snackBar.open(`Kategorie ${ newCategory.name } existiert bereits`, 'X', { duration: 2500 });
        } else {
          // category does not exist => edit
          this.data.upsert('category', { ...newCategory, id: category.id });
        }
      }
    });
  }

  public drop(event: CdkDragDrop<any, any>): void {
    moveItemInArray(this.categories, event.previousIndex, event.currentIndex);

    const categoriesToUpdate: Category[] = [];

    this.categories = this.categories.map((c, i) => {
      const newCategory = { ...c, ordering: i + 1 };

      if (c.ordering !== newCategory.ordering) {
        categoriesToUpdate.push(newCategory);
      }

      return newCategory;
    });

    categoriesToUpdate.forEach(c => {
      this.data.upsert<Category>('category', { ...c });
    });
  }
}
