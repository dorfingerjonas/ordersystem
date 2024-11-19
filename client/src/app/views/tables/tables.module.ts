import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TablesComponent } from './tables.component';
import { RouterModule, Routes } from '@angular/router';
import { MatRippleModule } from '@angular/material/core';

const routes: Routes = [
  {
    path: '',
    component: TablesComponent
  }
];

@NgModule({
  declarations: [
    TablesComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    MatRippleModule
  ]
})
export class TablesModule {
}
