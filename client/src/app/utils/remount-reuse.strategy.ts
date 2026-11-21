import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, BaseRouteReuseStrategy } from '@angular/router';

/**
 * Routes with `data: { remount: true }` get a fresh component when their params change
 * (e.g. clicking another product while the editor is open next to the list).
 */
@Injectable()
export class RemountReuseStrategy extends BaseRouteReuseStrategy {

  public override shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    if (future.routeConfig !== curr.routeConfig) return false;
    if (!future.routeConfig?.data?.['remount']) return true;

    return JSON.stringify(future.params) === JSON.stringify(curr.params)
      && JSON.stringify(future.queryParams) === JSON.stringify(curr.queryParams);
  }
}
