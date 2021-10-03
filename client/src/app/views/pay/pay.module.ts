import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { PayComponent } from './pay.component';

const routes: Routes = [
  {
    path: '',
    component: PayComponent
  }
];

@NgModule({
  declarations: [ PayComponent ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    FontAwesomeModule,
    FormsModule
  ]
})
export class PayModule {
}
