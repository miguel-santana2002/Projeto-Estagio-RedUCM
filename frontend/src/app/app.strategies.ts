import {
  ActivatedRouteSnapshot,
  DetachedRouteHandle,
  RouteReuseStrategy,
} from '@angular/router';
import { ComponentRef } from '@angular/core';

interface StoredRoute {
  route: ActivatedRouteSnapshot;
  handle: DetachedRouteHandle;
}

export function getFullPath(route: ActivatedRouteSnapshot): string {
  return route.pathFromRoot
    .map((v) => v.url.map((segment) => segment.toString()).join('/'))
    .join('/')
    .trim()
    .replace(/\/$/, ''); // Remove trailing slash
}

export class CustomReuseStrategy implements RouteReuseStrategy {
  storedRoutes: Record<string, StoredRoute> = {};
  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return !!route.data['storeRoute'];
  }

  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle): void {
    const key = getFullPath(route);
    this.storedRoutes[key] = { route, handle };
  }

  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    const key = getFullPath(route);
    const isStored = !!route.routeConfig && !!this.storedRoutes[key];

    if (isStored) {
      const paramsMatch = this.compareObjects(
        route.params,
        this.storedRoutes[key].route.params
      );
      const queryParamsMatch = this.compareObjects(
        route.queryParams,
        this.storedRoutes[key].route.queryParams
      );

      return paramsMatch && queryParamsMatch;
    }
    return false;
  }

  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle {
    const key = getFullPath(route);
    if (!route.routeConfig || !this.storedRoutes[key]) return null!;
    return this.storedRoutes[key].handle;
  }

  shouldReuseRoute(
    previous: ActivatedRouteSnapshot,
    next: ActivatedRouteSnapshot
  ): boolean {
    return false;
  }

  private compareObjects(a: any, b: any): boolean {
    for (let prop in a) {
      if (b.hasOwnProperty(prop)) {
        switch (typeof a[prop]) {
          case 'object':
            if (
              typeof b[prop] !== 'object' ||
              !this.compareObjects(a[prop], b[prop])
            ) {
              return false;
            }
            break;
          case 'function':
            if (
              typeof b[prop] !== 'function' ||
              a[prop].toString() !== b[prop].toString()
            ) {
              return false;
            }
            break;
          default:
            if (a[prop] != b[prop]) {
              return false;
            }
        }
      } else {
        return false;
      }
    }
    return true;
  }

  clearAllRoutes() {
    for (const key in this.storedRoutes) {
      this.destroyComponent(this.storedRoutes[key].handle);
    }
    this.storedRoutes = {};
  }

  clearRoute(fullPath: string) {
    this.destroyComponent(this.storedRoutes[fullPath].handle);
    this.storedRoutes[fullPath] = undefined!;
  }

  private destroyComponent(handle: any): void {
    const componentRef: ComponentRef<any> = handle && handle['componentRef'];
    if (componentRef) {
      componentRef.destroy();
    }
  }
}
