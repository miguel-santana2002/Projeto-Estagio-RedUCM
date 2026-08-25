import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, of } from 'rxjs';

const API_URL = '/api/';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  constructor(private http: HttpClient) {}

  get_data() {
    return this.http.get(API_URL + "data").pipe(
      map((value) => {
        return value;
      }),
      catchError((e) => {
        console.error(e.message);
        return of({});
      })
    );
  }
}
