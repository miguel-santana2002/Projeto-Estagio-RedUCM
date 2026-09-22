import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

const AUTH_URL = '/api/usecases/';

@Injectable({
  providedIn: 'root',
})
export class MitreService {
  constructor(private http: HttpClient) {}

  getTechniqueById(id: string): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.get<any>(`${AUTH_URL}getTechniqueById/${id}`, { headers });
  }

  getMitigationsByTechniqueId(id: string): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.get<any>(`${AUTH_URL}getMitigationsByTechniqueId/${id}`, {
      headers,
    });
  }

  getDatasourcesByTechniqueId(id: string): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.get<any>(`${AUTH_URL}getDataSourcesByTechniqueId/${id}`, {
      headers,
    });
  }

  getComponentsByTechniqueId(id: string): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.get<any>(`${AUTH_URL}getComponentsByTechniqueId/${id}`, {
      headers,
    });
  }

  getAllTechniques(): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.get<any>(`${AUTH_URL}getAllTechniques/`, { headers });
  }
}
