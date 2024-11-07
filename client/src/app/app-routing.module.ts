import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from './services/guard/auth.guard';

const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('./views/login/login.module').then(m => m.LoginModule)
  },
  {
    path: 'tables',
    loadChildren: () => import('./views/tables/tables.module').then(m => m.TablesModule),
    canActivate: [ authGuard ]
  },
  {
    path: 'order/:tableNr',
    loadChildren: () => import('./views/order/order.module').then(m => m.OrderModule),
    canActivate: [ authGuard ]
  },
  {
    path: 'pay',
    loadChildren: () => import('./views/pay/pay.module').then(m => m.PayModule),
    canActivate: [ authGuard ]
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./views/dashboard/dashboard.module').then(m => m.DashboardModule),
    canActivate: [ authGuard ]
  },
  {
    path: '**',
    redirectTo: 'tables',
    pathMatch: 'full'
  },
  {
    path: '',
    redirectTo: 'tables',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [ RouterModule.forRoot(routes) ],
  exports: [ RouterModule ]
})
export class AppRoutingModule {
}
