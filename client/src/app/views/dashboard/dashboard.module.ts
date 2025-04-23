import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardComponent } from './dashboard.component';
import { RouterModule, Routes } from '@angular/router';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatRippleModule } from '@angular/material/core';
import { EditTablesComponent } from './edit-tables/edit-tables.component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TablePopupComponent } from './edit-tables/table-popup/table-popup.component';
import { MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { CdkDrag, CdkDragHandle, CdkDragPreview, CdkDropList } from '@angular/cdk/drag-drop';
import { EditProductComponent } from './edit-product/edit-product.component';
import { ProductPopupComponent } from './edit-product/product-popup/product-popup.component';
import { EditCategoryComponent } from './edit-category/edit-category.component';
import { CategoryPopupComponent } from './edit-category/category-popup/category-popup.component';
import { EditInfrastructureComponent } from './edit-infrastructure/edit-infrastructure.component';

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
    path: 'edit/products',
    component: EditProductComponent
  },
  {
    path: 'edit/categories',
    component: EditCategoryComponent
  },
  {
    path: 'edit/infrastructure',
    component: EditInfrastructureComponent
  }
];

@NgModule({
  declarations: [
    DashboardComponent,
    EditTablesComponent,
    TablePopupComponent,
    EditProductComponent,
    ProductPopupComponent,
    EditCategoryComponent,
    CategoryPopupComponent,
    EditInfrastructureComponent
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
    FormsModule,
    MatSelectModule,
    ReactiveFormsModule,
    CdkDragHandle,
    CdkDropList,
    CdkDrag,
    CdkDragPreview
  ]
})
export class DashboardModule {
}
