import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { RulesService } from '../../../services/rules.service';
import { HeaderComponent } from '../../../layout/header/header.component';
import { TitlebannerComponent } from '../../../layout/titlebanner/titlebanner.component';
import { UsecasesService } from '../../../services/usecases.service';
import { AppCodeEditorComponent } from '../../../shared/components/app-code-editor/app-code-editor.component';

@Component({
  selector: 'app-rule-details',
  standalone: true,
  templateUrl: './rule-details.component.html',
  styleUrl: './rule-details.component.css',
  imports: [
    HeaderComponent,
    TitlebannerComponent,
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    AppCodeEditorComponent,
  ],
})
export class RuleDetailsComponent implements OnInit {
  rule: any = { client: { name: 'Sem Cliente' }, ruleModel: {} };
  usecase: any = null;
  code: string = '';
  message: string = '';
  isLoading: boolean = true;

  constructor(
    private route: ActivatedRoute,
    private rulesService: RulesService,
    private useCaseService: UsecasesService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.params['id']);

    this.rulesService.getRuleById(id).subscribe({
      next: (data: any) => {
        // Sanitiza o cliente para garantir que o template nunca encontra null
        this.rule = {
          ...data,
          client: data.client || { name: 'Sem Cliente' },
          status: data.status || '',
          logsources: Array.isArray(data.logsources) ? data.logsources : [],
        };
        this.code = this.rule.ruleCode || '';

        // Cenário 1: ruleModel serializado como objeto com useCaseId
        if (this.rule.ruleModel?.useCaseId) {
          this.loadUseCase(this.rule.ruleModel.useCaseId);
          this.isLoading = false;
        }
        // Cenário 2: ruleModel serializado apenas como ID numérico (FK plana)
        else if (typeof data.ruleModel === 'number') {
          this.rulesService.getRuleModelById(data.ruleModel).subscribe({
            next: (modelData: any) => {
              this.rule.ruleModel = modelData;
              if (modelData.useCaseId) {
                this.loadUseCase(modelData.useCaseId);
              }
              this.isLoading = false;
            },
            error: () => (this.isLoading = false),
          });
        } else {
          this.isLoading = false;
        }
      },
      error: (err) => {
        console.error('Erro ao carregar detalhes da regra:', err);
        this.isLoading = false;
      },
    });
  }

  private loadUseCase(useCaseId: number): void {
    this.useCaseService.getUseCaseById(useCaseId).subscribe({
      next: (ucData: any) => {
        this.usecase = ucData;
      },
      error: (err) => console.error('Erro ao carregar Use Case:', err),
    });
  }

  onCodeChanged(value: string): void {
    this.code = value;
  }

  updateRuleCode(): void {
    this.rulesService.updateRuleCode(this.code, this.rule.id).subscribe({
      next: (data: any) => {
        this.message = data?.message || 'Regra atualizada com sucesso!';
        setTimeout(() => {
          this.message = '';
        }, 4000);
      },
      error: (err) => {
        console.error('Erro ao atualizar código da regra:', err);
      },
    });
  }

  getTechniqueId(tech: string): string {
    if (!tech) return '';
    return tech.split(' - ')[0].trim();
  }
}
