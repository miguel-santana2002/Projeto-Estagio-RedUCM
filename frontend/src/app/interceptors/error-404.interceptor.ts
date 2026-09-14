import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class Error404Interceptor implements HttpInterceptor {
  constructor(private router: Router) {}

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler,
  ): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        const isNotFoundOrServerError =
          error.status === 404 || error.status === 500;
        const isAlreadyOnNotFoundPage = this.router.url === '/page-not-found';

        if (isNotFoundOrServerError && !isAlreadyOnNotFoundPage) {
          this.router.navigate(['/page-not-found'], {
            skipLocationChange: true,
          });
        }

        return throwError(() => error);
      }),
    );
  }
}
