import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderCategoryComponent } from './order-category/order-category.component';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { MenuComponent } from './menu/menu.component';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

@NgModule({
  declarations: [ OrderCategoryComponent, MenuComponent ],
  exports: [ OrderCategoryComponent ],
  imports: [
    CommonModule,
    MatIconModule,
    MatRippleModule,
    MatButtonModule,
    RouterLink
  ]
})
export class ComponentsModule {
}
