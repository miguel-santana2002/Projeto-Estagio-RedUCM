import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuditLog } from './audit-log.model';
import { AuditService } from './audit.service';

import { HeaderComponent } from '../layout/header/header.component';
import { TitlebannerComponent } from '../layout/titlebanner/titlebanner.component';

@Component({
  selector: 'app-audit-list',
  templateUrl: './audit-list.component.html',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    TitlebannerComponent
  ]
})
export class AuditListComponent implements OnInit {
  logs: AuditLog[] = [];
  loading: boolean = false;
  errorMessage: string | null = null;

  constructor(private auditService: AuditService) {}

  ngOnInit(): void {
    this.loadAuditLogs();
  }

  loadAuditLogs(): void {
    this.loading = true;
    this.errorMessage = null;

    this.auditService.getAuditLogs().subscribe({
      next: (data) => {
        this.logs = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar logs de auditoria:', err);
        this.errorMessage = 'Não foi possível carregar o histórico de auditoria.';
        this.loading = false;
      }
    });
  }
}