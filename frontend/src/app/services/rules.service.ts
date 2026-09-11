import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
const AUTH_URL = '/api/rules/';

@Injectable({
  providedIn: 'root',
})
export class RulesService {
  constructor(private http: HttpClient) {}

  createRuleModel(ruleModel: any) {
    return this.http.post(`${AUTH_URL}createRuleModel`, ruleModel);
  }

  getRuleModels() {
    return this.http.get(`${AUTH_URL}getRuleModels`);
  }

  getRules() {
    return this.http.get(`${AUTH_URL}getRules`);
  }

  getRuleModelsByUseCase(useCaseId: number) {
    return this.http.get(`${AUTH_URL}getRuleModelsByUseCase/${useCaseId}`);
  }

  getRuleModelById(id: number) {
    return this.http.get(`${AUTH_URL}getRuleModelById/${id}`);
  }

  deleteRuleById(id: number) {
    return this.http.post(`${AUTH_URL}deleteRuleById/${id}`, id);
  }
  deleteRuleModelById(id: number) {
    return this.http.post(`${AUTH_URL}deleteRuleModelById/${id}`, id);
  }

  createRule(rule: any) {
    return this.http.post(`${AUTH_URL}createRule`, rule);
  }

  getRuleById(id: number) {
    return this.http.get(`${AUTH_URL}getRuleById/${id}`);
  }

  createRegisteredLogSource(logSource: any) {
    return this.http.post(`${AUTH_URL}createRegisteredLogSource`, logSource);
  }

  getRegisteredLogSources() {
    return this.http.get(`${AUTH_URL}getRegisteredLogSources`);
  }

  deleteLogSourceById(id: number) {
    return this.http.post(`${AUTH_URL}deleteLogSourceById/${id}`, id);
  }

  updateRuleModelCode(ruleCode: any, id: number, syntax?: string) {
    return this.http.post(
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

  updateRuleCode(ruleCode: any, id: number) {
    return this.http.post(
      `${AUTH_URL}updateRuleCode/${id}`,
      { ruleCode: ruleCode },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }
}
