import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SigninComponent } from './views/signin/signin.component';
import { TablesComponent } from './views/tables/tables.component';
import { OrderComponent } from './views/order/order.component';
import { PayComponent } from './views/pay/pay.component';
import { AuthGuard } from '@angular/fire/auth-guard';

const routes: Routes = [
  {
    path: 'signin',
    component: SigninComponent
  },
  {
    path: 'tables',
    component: TablesComponent,
    canActivate: [ AuthGuard ]
  },
  {
    path: 'order/:tableNr',
    component: OrderComponent,
    canActivate: [ AuthGuard ]
  },
  {
    path: 'pay',
    component: PayComponent,
    canActivate: [ AuthGuard ]
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'tables'
  },
  {
    path: '**',
    pathMatch: 'full',
    redirectTo: 'tables'
  }
];

@NgModule({
  imports: [ RouterModule.forRoot(routes) ],
  exports: [ RouterModule ]
})
export class AppRoutingModule {
}
