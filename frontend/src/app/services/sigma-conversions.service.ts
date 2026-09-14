import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

const AUTH_URL = '/api/sigmaconversions/';

@Injectable({
  providedIn: 'root',
})
export class SigmaConversionsService {
  constructor(private http: HttpClient) {}

  convertSigmaToSplunk(rule: any) {
    return this.http.post(`${AUTH_URL}convertSigmaToSplunk`, { rule: rule });
  }

  convertSigmaToQRadar(rule: any) {
    return this.http.post(`${AUTH_URL}convertSigmaToQRadar`, { rule: rule });
  }

  convertSigmaToElasticLucena(rule: any) {
    return this.http.post(`${AUTH_URL}convertSigmaToElasticLucena`, { rule: rule });
  }

  // --- REENCAMINHADOS PARA O ENDPOINT GENÉRICO ---
  
  convertSigmaToCrowdstrike(rule: any) {
    return this.convertSigma(rule, 'CrowdStrike Rule');
  }

  convertSigmaToSentinel(rule: any) {
    return this.convertSigma(rule, 'Sentinel Rule');
  }

  convertSigmaToSplunk2(rule: any) {
    return this.convertSigma(rule, 'Splunk SPL2 Rule');
  }

  // Endpoint genérico
  convertSigma(rule: any, backend: any) {
    return this.http.post(`${AUTH_URL}convertSigma`, { rule: rule, backend: backend });
  }
}
