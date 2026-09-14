import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

const AUTH_URL = '/api/sigmaconversions/';

@Injectable({
  providedIn: 'root',
})
export class SigmaConversionsService {
  constructor(private http: HttpClient) {}

  convertSigmaToSplunk(rule: any) {
    return this.convertSigma(rule, 'Splunk Rule');
  }

  convertSigmaToQRadar(rule: any) {
    return this.convertSigma(rule, 'QRadar Rule');
  }

  convertSigmaToElasticLucena(rule: any) {
    return this.convertSigma(rule, 'Elastic Rule');
  }

  convertSigmaToCrowdstrike(rule: any) {
    return this.convertSigma(rule, 'CrowdStrike Rule');
  }

  convertSigmaToSentinel(rule: any) {
    return this.convertSigma(rule, 'Sentinel Rule');
  }

  convertSigmaToSplunk2(rule: any) {
    return this.convertSigma(rule, 'Splunk SPL2 Rule');
  }

  // Endpoint genérico central que fala com o views.py do Django
  convertSigma(rule: any, backend: any) {
    return this.http.post(`${AUTH_URL}convertSigma`, { rule: rule, backend: backend });
  }
}