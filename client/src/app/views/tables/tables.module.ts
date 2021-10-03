import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { TablesComponent } from './tables.component';

const routes: Routes = [
  {
    path: '',
    component: TablesComponent
  }
];

@NgModule({
  declarations: [TablesComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class TablesModule { }
