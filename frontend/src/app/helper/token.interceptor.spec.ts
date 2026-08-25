import { TestBed } from '@angular/core/testing';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { TokenInterceptor } from './token.interceptor';
import { Observable } from 'rxjs';

describe('tokenInterceptor', () => {
  const interceptor: HttpInterceptor = {
    intercept: (req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> => {
      const ti = TestBed.inject(TokenInterceptor);
      return ti.intercept(req, next);
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(interceptor).toBeTruthy();
  });
});
