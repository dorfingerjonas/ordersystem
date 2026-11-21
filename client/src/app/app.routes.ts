import { Routes } from '@angular/router';
import { adminGuard, authGuard, loginGuard } from './services/guards';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [ loginGuard ],
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage)
  },
  {
    path: '',
    canActivate: [ authGuard ],
    loadComponent: () => import('./layout/shell.component').then(m => m.ShellComponent),
    children: [
      { path: 'tables', loadComponent: () => import('./pages/tables/tables.page').then(m => m.TablesPage) },
      { path: 'pay', loadComponent: () => import('./pages/pay-tables/pay-tables.page').then(m => m.PayTablesPage) },
      { path: 'more', loadComponent: () => import('./pages/more/more.page').then(m => m.MorePage) },
      { path: '', pathMatch: 'full', redirectTo: 'tables' }
    ]
  },
  {
    path: 'order/:tableId',
    canActivate: [ authGuard ],
    loadComponent: () => import('./pages/order/order.page').then(m => m.OrderPage)
  },
  {
    path: 'pay/:tableId',
    canActivate: [ authGuard ],
    loadComponent: () => import('./pages/pay/pay.page').then(m => m.PayPage)
  },
  {
    path: 'admin',
    canActivate: [ authGuard, adminGuard ],
    children: [
      { path: 'products', loadComponent: () => import('./pages/admin/products/products.page').then(m => m.ProductsPage) },
      { path: 'products/:productId', loadComponent: () => import('./pages/admin/product-edit/product-edit.page').then(m => m.ProductEditPage) },
      { path: 'groups/:groupId', loadComponent: () => import('./pages/admin/group-edit/group-edit.page').then(m => m.GroupEditPage) },
      { path: 'sort', loadComponent: () => import('./pages/admin/sort/sort.page').then(m => m.SortPage) },
      { path: 'tables', loadComponent: () => import('./pages/admin/tables/admin-tables.page').then(m => m.AdminTablesPage) },
      { path: 'printers', loadComponent: () => import('./pages/admin/printers/printers.page').then(m => m.PrintersPage) },
      { path: '', pathMatch: 'full', redirectTo: '/more' }
    ]
  },
  { path: '**', redirectTo: 'tables' }
];
