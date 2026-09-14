import {
  ApplicationConfig,
  Provider,
  importProvidersFrom,
} from '@angular/core';
import { RouteReuseStrategy, provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';

import { routes } from './app.routes';
import { TokenInterceptor } from './helper/token.interceptor';
import { Error404Interceptor } from './interceptors/error-404.interceptor';
import { LoadingInterceptor } from './layout/loading';
import { CustomReuseStrategy } from './app.strategies';
import { CodeEditorModule } from '@ngstack/code-editor';

const tokenInterceptorProvider: Provider = {
  provide: HTTP_INTERCEPTORS,
  useClass: TokenInterceptor,
  multi: true,
};

const error404InterceptorProvider: Provider = {
  provide: HTTP_INTERCEPTORS,
  useClass: Error404Interceptor,
  multi: true,
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptorsFromDi()),
    importProvidersFrom(CodeEditorModule.forRoot()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: LoadingInterceptor,
      multi: true,
    },
    tokenInterceptorProvider,
    error404InterceptorProvider,
    {
      provide: RouteReuseStrategy,
      useClass: CustomReuseStrategy,
    },
  ],
};
