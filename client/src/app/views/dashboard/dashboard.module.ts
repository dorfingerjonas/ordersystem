import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardComponent } from './dashboard.component';
import { RouterModule, Routes } from '@angular/router';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatRippleModule } from '@angular/material/core';
import { EditDrinksComponent } from './edit-drinks/edit-drinks.component';
import { EditTablesComponent } from './edit-tables/edit-tables.component';
import { EditFoodComponent } from './edit-food/edit-food.component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TablePopupComponent } from './edit-tables/table-popup/table-popup.component';
import { MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

const routes: Routes = [
  {
    path: '',
    component: DashboardComponent
  },
  {
    path: 'edit/tables',
    component: EditTablesComponent
  },
  {
    path: 'edit/drinks',
    component: EditDrinksComponent
  },
  {
    path: 'edit/food',
    component: EditFoodComponent
  }
];

@NgModule({
  declarations: [
    DashboardComponent,
    EditDrinksComponent,
    EditTablesComponent,
    EditFoodComponent,
    TablePopupComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    MatSnackBarModule,
    MatRippleModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatInputModule,
    FormsModule
  ]
})
export class DashboardModule {
}
