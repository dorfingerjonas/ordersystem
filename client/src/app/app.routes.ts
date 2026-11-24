import { Routes } from '@angular/router';
import { adminGuard, authGuard, loginGuard } from './services/guards';
import { groupLeaveGuard } from './pages/admin/group-edit/group-leave.guard';

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
      {
        path: 'admin',
        canActivate: [ adminGuard ],
        children: [
          {
            // list + editor side by side on desktop, editor full screen on phones
            path: 'products',
            loadComponent: () => import('./pages/admin/products/products.page').then(m => m.ProductsPage),
            children: [
              {
                path: 'group/:groupId',
                data: { remount: true },
                canDeactivate: [ groupLeaveGuard ],
                loadComponent: () => import('./pages/admin/group-edit/group-edit.page').then(m => m.GroupEditPage)
              },
              {
                path: ':productId',
                data: { remount: true },
                loadComponent: () => import('./pages/admin/product-edit/product-edit.page').then(m => m.ProductEditPage)
              }
            ]
          },
          { path: 'groups/:groupId', redirectTo: 'products/group/:groupId' },
          { path: 'sort', loadComponent: () => import('./pages/admin/sort/sort.page').then(m => m.SortPage) },
          { path: 'tables', loadComponent: () => import('./pages/admin/tables/admin-tables.page').then(m => m.AdminTablesPage) },
          { path: 'stats', loadComponent: () => import('./pages/admin/stats/stats.page').then(m => m.StatsPage) },
          { path: 'stats/products', loadComponent: () => import('./pages/admin/stats/stats-products.page').then(m => m.StatsProductsPage) },
          { path: 'stats/timeline', loadComponent: () => import('./pages/admin/stats/stats-timeline.page').then(m => m.StatsTimelinePage) },
          { path: 'stats/waiters', loadComponent: () => import('./pages/admin/stats/stats-waiters.page').then(m => m.StatsWaitersPage) },
          { path: 'stats/tables', loadComponent: () => import('./pages/admin/stats/stats-tables.page').then(m => m.StatsTablesPage) },
          { path: 'orders', loadComponent: () => import('./pages/admin/orders/orders.page').then(m => m.OrdersPage) },
          { path: 'users', loadComponent: () => import('./pages/admin/users/users.page').then(m => m.UsersPage) },
          { path: 'printers', loadComponent: () => import('./pages/admin/printers/printers.page').then(m => m.PrintersPage) },
          { path: '', pathMatch: 'full', redirectTo: '/more' }
        ]
      },
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
  { path: '**', redirectTo: 'tables' }
];
