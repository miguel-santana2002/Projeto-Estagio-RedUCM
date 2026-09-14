import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LoaderService {
  private loadingSignal = signal<boolean>(false);

  // Getter público somente de leitura para o template
  readonly isLoading = this.loadingSignal.asReadonly();

  setLoading(loading: boolean): void {
    this.loadingSignal.set(loading);
  }
}
