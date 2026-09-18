    import { Injectable } from '@angular/core';
    import { HttpClient } from '@angular/common/http';
    import { Observable } from 'rxjs';
    import { AuditLog } from './audit-log.model';

    @Injectable({
    providedIn: 'root'
    })
    export class AuditService {
    // Ajusta o URL base conforme a configuração de ambiente do teu projeto
    private apiUrl = 'http://localhost:8000/api/audit/audit-logs/';

    constructor(private http: HttpClient) {}

    getAuditLogs(): Observable<AuditLog[]> {
        return this.http.get<AuditLog[]>(this.apiUrl);
    }
    }