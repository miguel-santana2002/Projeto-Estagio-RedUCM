import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

const AUTH_URL = '/api/sigmaconversions/';
const RULES_API_URL = '/api/rules/';

export interface RuleConvertRequest {
  source_query: string;
  source_syntax: string;
  target_syntax: string;
}

export interface RuleConvertResponse {
  sigma_rule: string;
  target_query: string;
}

@Injectable({
  providedIn: 'root',
})
export class SigmaConversionsService {
  constructor(private http: HttpClient) {}

  convertRuleWithAI(
    payload: RuleConvertRequest,
  ): Observable<RuleConvertResponse> {
    return this.http.post<RuleConvertResponse>(
      `${RULES_API_URL}convertRule`,
      payload,
    );
  }

  convertSigmaToSplunk(rule: any) {
    return this.http.post(`${AUTH_URL}convertSigmaToSplunk`, { rule: rule });
  }

  convertSigmaToQRadar(rule: any) {
    return this.http.post(`${AUTH_URL}convertSigmaToQRadar`, { rule: rule });
  }

  // Substituído o antigo Lucene por EQL limpo em JSON
  convertSigmaToElasticEQL(rule: any) {
    return this.http.post(`${AUTH_URL}convertSigma`, {
      rule: rule,
      backend: 'Elastic Rule',
    });
  }

  convertSigmaToCrowdStrike(ruleCode: string) {
    const formData = new FormData();
    formData.append('rule', ruleCode);
    formData.append('backend', 'CrowdStrike Rule');
    return this.http.post(`${AUTH_URL}convertSigma`, formData);
  }

  convertSigma(rule: any, backend: any) {
    return this.http.post(`${AUTH_URL}convertSigma`, {
      rule: rule,
      backend: backend,
    });
  }
}