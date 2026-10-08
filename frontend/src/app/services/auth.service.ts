import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Accordion } from 'flowbite';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';

const AUTH_URL = '/api/accounts/';
const USER_TOKEN = 'user-token';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private accessToken: string = '';
  constructor(private http: HttpClient) {}

  login(
    email: string,
    password: string,
  ): Observable<{ otpSent: boolean; otpMethod?: string }> {
    localStorage.removeItem(USER_TOKEN);
    return this.http.post(AUTH_URL + 'login', { email, password }).pipe(
      map((response: any) => {
        this.accessToken = response.access;

        if (response.otpSent) {
          return {
            otpSent: true,
            otpMethod: response.otpMethod,
            showTotp: Boolean(response.showTotp),
          };
        }
        return { otpSent: false };
      }),
      catchError((e) => {
        let errorMsg = 'Credenciais inválidas para início de sessão';
        if (e.error) {
          if (typeof e.error === 'string') {
            errorMsg = e.error;
          } else if (e.error.detail) {
            errorMsg = e.error.detail;
          } else if (e.error.error) {
            errorMsg = e.error.error;
          } else if (
            e.error.non_field_errors &&
            e.error.non_field_errors.length > 0
          ) {
            errorMsg = e.error.non_field_errors[0];
          }
        }
        return throwError(() => new Error(errorMsg));
      }),
    );
  }

  verifyOTP(email: string, otp: string) {
    return this.http.post(AUTH_URL + 'verify-otp', { email, otp }).pipe(
      map((response: any) => {
        localStorage.setItem(USER_TOKEN, JSON.stringify(response));
        return true;
      }),
      catchError((e) => {
        let errorMsg = 'Código de verificação inválido';
        if (e.error) {
          if (typeof e.error === 'string') {
            errorMsg = e.error;
          } else if (e.error.detail) {
            errorMsg = e.error.detail;
          } else if (e.error.error) {
            errorMsg = e.error.error;
          }
        }
        return throwError(() => new Error(errorMsg));
      }),
    );
  }

  generateTOTP(email: string): Observable<string | null> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.accessToken}`,
    });

    // Sem barra final para coincidir com a rota do Django
    return this.http
      .get(AUTH_URL + 'generate-totp', {
        headers,
        params: { email },
      })
      .pipe(
        map((response: any) => {
          return response?.totp_uri || response;
        }),
        catchError((e) => {
          console.error('Erro backend generate-totp:', e.error);
          return of(null);
        }),
      );
  }
  deleteUser(id: any) {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<any>(`${AUTH_URL}deleteUser/${id}`, { headers });
  }

  deleteCompany(id: any) {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<any>(`${AUTH_URL}deleteCompany/${id}`, { headers });
  }

  loggedInInfo() {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.getAccessToken()}`,
    });

    return this.http.get(AUTH_URL + 'loggedInInfo', { headers }).pipe(
      tap((value) => {}),
      catchError((e) => {
        console.error(e.message);
        return of(false);
      }),
    );
  }

  refreshToken() {
    let item = localStorage.getItem(USER_TOKEN);
    if (!item) {
      return;
    }
    let tokens = JSON.parse(item);

    return this.http
      .post(AUTH_URL + 'refresh', { refresh: tokens.refresh })
      .pipe(
        map((value: any) => {
          tokens.access = value.access;
          localStorage.setItem(USER_TOKEN, JSON.stringify(tokens));
          return of(true);
        }),
        catchError((e) => {
          console.log(e);
          this.logout();
          return of(false);
        }),
      );
  }

  isLogged(): boolean {
    return localStorage.getItem(USER_TOKEN) != null;
  }

  getAccessToken() {
    let item = localStorage.getItem(USER_TOKEN);
    if (item != null) {
      let tokens = JSON.parse(item);
      return tokens.access;
    }
  }

  getRefreshToken() {
    let item = localStorage.getItem(USER_TOKEN);
    if (item != null) {
      let tokens = JSON.parse(item);
      return tokens.refresh;
    }
  }

  logout() {
    localStorage.removeItem(USER_TOKEN);
  }

  createUser(userData: any): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<any>(`${AUTH_URL}createUser`, userData, { headers });
  }

  createClient(clientData: any): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<any>(`${AUTH_URL}createCompany`, clientData, {
      headers,
    });
  }

  getUsers(): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.get<any>(`${AUTH_URL}getUsers`, { headers });
  }

  getClients(): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.get<any>(`${AUTH_URL}getCompanies`, { headers });
  }

  getLogsourcesByClient(clientName: any): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.get<any>(
      `${AUTH_URL}getLogsourcesByClient/${clientName}`,
      { headers },
    );
  }

  updateUserInfo(userData: any, id: any): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<any>(`${AUTH_URL}updateUserInfo/` + id, userData, {
      headers,
    });
  }

  resetTotp(id: any, force?: boolean): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const body = force !== undefined ? { force } : {};
    return this.http.post<any>(`${AUTH_URL}resetTotp/` + id, body, { headers });
  }

  toggleUserStatus(id: any, isBlocked?: boolean): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const body = isBlocked !== undefined ? { is_blocked: isBlocked } : {};
    return this.http.post<any>(`${AUTH_URL}toggleUserStatus/` + id, body, {
      headers,
    });
  }

  changePassword(userId: string, password: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.getAccessToken()}`,
    });
    const body = { password: password };
    return this.http
      .post(`${AUTH_URL}change-password/${userId}/`, body, { headers })
      .pipe(
        catchError((e) => {
          console.error(e.message);
          return throwError(() => new Error('Failed to change password'));
        }),
      );
  }

  getClientById(id: any): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.get<any>(`${AUTH_URL}getCompany/${id}`, { headers });
  }

  updateCompany(id: any, payload: any): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<any>(`${AUTH_URL}updateCompany/${id}`, payload, {
      headers,
    });
  }
}

export class User {
  id: number = 0;
  username: string = '';
  email: string = '';
  date_joined: string = '';
  last_login: string = '';
  is_admin: boolean = false;
  is_active: boolean = false;
  is_staff: boolean = false;
  is_superuser: boolean = false;
  company: string | null = null;
}
