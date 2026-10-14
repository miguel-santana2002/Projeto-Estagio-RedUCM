import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

const AUTH_URL = '/api/rules/';

@Injectable({
  providedIn: 'root',
})
export class RulesService {
  constructor(private http: HttpClient) {}

  createRuleModel(ruleModel: any): Observable<any> {
    return this.http.post<any>(`${AUTH_URL}createRuleModel`, ruleModel);
  }

  getRuleModels(): Observable<any[]> {
    return this.http.get<any[]>(`${AUTH_URL}getRuleModels`);
  }

  getRules(): Observable<any[]> {
    return this.http.get<any[]>(`${AUTH_URL}getRules`);
  }

  getRulesByUseCase(useCaseId: number): Observable<any[]> {
    return this.http.get<any[]>(`${AUTH_URL}getRulesByUseCase/${useCaseId}`);
  }

  getRulesByParent(parentId: number): Observable<any[]> {
    return this.http.get<any[]>(`${AUTH_URL}getRulesByParent/${parentId}`);
  }

  getRuleModelsByUseCase(useCaseId: number): Observable<any[]> {
    return this.http.get<any[]>(
      `${AUTH_URL}getRuleModelsByUseCase/${useCaseId}`,
    );
  }

  getRuleModelById(id: number): Observable<any> {
    return this.http.get<any>(`${AUTH_URL}getRuleModelById/${id}`);
  }

  deleteRuleById(id: number): Observable<any> {
    return this.http.post<any>(`${AUTH_URL}deleteRuleById/${id}`, id);
  }

  deleteRuleModelById(id: number): Observable<any> {
    return this.http.post<any>(`${AUTH_URL}deleteRuleModelById/${id}`, id);
  }

  createRule(rule: any): Observable<any> {
    return this.http.post<any>(`${AUTH_URL}createRule`, rule);
  }

  getRuleById(id: number): Observable<any> {
    return this.http.get<any>(`${AUTH_URL}getRuleById/${id}`);
  }

  updateRule(id: number, rule: any): Observable<any> {
    return this.http.post<any>(`${AUTH_URL}updateRule/${id}`, rule, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  createRegisteredLogSource(logSource: any): Observable<any> {
    return this.http.post<any>(
      `${AUTH_URL}createRegisteredLogSource`,
      logSource,
    );
  }

  getRegisteredLogSources(): Observable<any[]> {
    return this.http.get<any[]>(`${AUTH_URL}getRegisteredLogSources`);
  }

  getRegisteredLogSourceById(id: number): Observable<any> {
    return this.http.get<any>(`${AUTH_URL}getRegisteredLogSourceById/${id}`);
  }

  deleteLogSourceById(id: number): Observable<any> {
    return this.http.post<any>(`${AUTH_URL}deleteLogSourceById/${id}`, id);
  }

  updateRuleModelCode(
    ruleCode: any,
    id: number,
    syntax?: string,
  ): Observable<any> {
    return this.http.post<any>(
      `${AUTH_URL}updateRuleModelCode/${id}`,
      {
        ruleCode: ruleCode,
        syntax: syntax,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }

  updateRuleCode(ruleCode: any, id: number): Observable<any> {
    return this.http.post<any>(
      `${AUTH_URL}updateRuleCode/${id}`,
      { ruleCode: ruleCode },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }

  updateRuleModel(id: number, ruleModel: any): Observable<any> {
    return this.http.post<any>(`${AUTH_URL}updateRuleModel/${id}`, ruleModel, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  updateLogSourceById(id: number, logSource: any): Observable<any> {
    return this.http.post<any>(
      `${AUTH_URL}updateLogSourceById/${id}`,
      logSource,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }
}
