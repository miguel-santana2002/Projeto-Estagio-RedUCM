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
        const isAlreadyOnNotFoundPage = this.router.url === '/page-not-found';
        const isGetRequest = request.method === 'GET';

        // 1. Redireciona APENAS se for uma leitura (GET) inexistente
        if (error.status === 404 && isGetRequest && !isAlreadyOnNotFoundPage) {
          this.router.navigate(['/page-not-found']);
        }

        // 2. Erros 404 de escrita (POST/PUT/DELETE), 400 e 500 propagam para o componente
        return throwError(() => error);
      }),
    );
  }
}
