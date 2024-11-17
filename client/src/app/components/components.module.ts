import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderCategoryComponent } from './order-category/order-category.component';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';

@NgModule({
  declarations: [ OrderCategoryComponent ],
  exports: [ OrderCategoryComponent ],
  imports: [
    CommonModule,
    MatIconModule,
    MatRippleModule
  ]
})
export class ComponentsModule {
}
