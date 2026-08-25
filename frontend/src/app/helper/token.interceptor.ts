import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

@Injectable()
export class TokenInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService, private router: Router) {}

 public intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    if (this.authService.isLogged()) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${this.authService.getAccessToken()}`,
        },
      });
    }

    return next.handle(request).pipe(
      tap({
        next: (event) => {},
        error: (_error) => {
          if (_error.status == 401) {
            if (this.authService.isLogged()) {
              this.authService.refreshToken()?.subscribe((success) => {
                if (success) {
                  //TODO eseguire reload
                  console.log(
                    'successful refreshed token, reload ' + this.router.url
                  );
                  
                  this.router.navigateByUrl(this.router.url, {
                    onSameUrlNavigation: 'reload',
                    skipLocationChange: true,
                  });
                } else {
                  console.warn(
                    'Redirecting on login due to 401 error from server'
                  );
                  this.router.navigate(['login']);
                }
              });
            } else {
              console.warn('Redirecting on login due to 401 error from server');
              this.authService.logout();
              this.router.navigate(['login']);
            }
          }
        },
      })
    );
  }
}
