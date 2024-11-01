import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderComponent } from './order.component';
import { RouterModule, Routes } from '@angular/router';
import { OrderCategoryComponent } from './order-category/order-category.component';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';

const routes: Routes = [
  {
    path: '',
    component: OrderComponent
  }
];

@NgModule({
  declarations: [
    OrderComponent,
    OrderCategoryComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    MatIconModule,
    MatRippleModule,
    MatButtonModule,
    MatInputModule,
    FormsModule,
    MatSnackBarModule
  ]
})
export class OrderModule {
}
