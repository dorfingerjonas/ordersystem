import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './services/auth-guard/auth.guard';

const routes: Routes = [
  {
    path: 'signin',
    loadChildren: () => import('./views/signin/signin.module').then(m => m.SigninModule)
  },
  {
    path: 'tables',
    loadChildren: () => import('./views/tables/tables.module').then(m => m.TablesModule),
    canActivate: [ AuthGuard ]
  },
  {
    path: 'order/:tableNr',
    loadChildren: () => import('./views/order/order.module').then(m => m.OrderModule),
    canActivate: [ AuthGuard ]
  },
  {
    path: 'pay',
    loadChildren: () => import('./views/pay/pay.module').then(m => m.PayModule),
    canActivate: [ AuthGuard ]
  },
  {
    path: 'edit',
    loadChildren: () => import('./views/edit/edit.module').then(m => m.EditModule),
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
