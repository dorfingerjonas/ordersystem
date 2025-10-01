import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PayTablesComponent } from './pay-tables/pay-tables.component';
import { RouterLink, RouterModule, Routes } from '@angular/router';
import { MatRippleModule } from '@angular/material/core';
import { PayComponent } from './pay/pay.component';
import { ComponentsModule } from '../../components/components.module';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

const routes: Routes = [
  {
    path: 'open-tables',
    component: PayTablesComponent
  },
  {
    path: 'cart/:tableNr',
    component: PayComponent
  },
  {
    path: 'cart',
    component: PayComponent
  },
  {
    path: '',
    redirectTo: 'open-tables',
    pathMatch: 'full'
  }
];

@NgModule({
  declarations: [
    PayTablesComponent,
    PayComponent
  ],
  imports: [
    CommonModule,
    MatRippleModule,
    RouterLink,
    RouterModule.forChild(routes),
    ComponentsModule,
    MatInputModule,
    MatIconModule,
    MatSnackBarModule,
    ReactiveFormsModule,
    FormsModule
  ]
})
export class PayModule {
}
