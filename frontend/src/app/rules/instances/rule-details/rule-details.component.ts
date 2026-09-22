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
  rule: any = { client: {}, ruleModel: {} };
  usecase: any = {};
  code: string = '';
  message: string = '';

  constructor(
    private route: ActivatedRoute,
    private rulesService: RulesService,
    private useCaseService: UsecasesService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];

    this.rulesService.getRuleById(id).subscribe((data: any) => {
      this.rule = data;
      this.code = this.rule.ruleCode || '';

      if (this.rule.ruleModel?.useCaseId) {
        this.useCaseService
          .getUseCaseById(this.rule.ruleModel.useCaseId)
          .subscribe((ucData: any) => {
            this.usecase = ucData;
          });
      }
    });
  }

  onCodeChanged(value: string): void {
    this.code = value;
  }

  updateRuleCode(): void {
    this.rulesService
      .updateRuleCode(this.code, this.rule.id)
      .subscribe((data: any) => {
        this.message = data.message || 'Regra atualizada com sucesso!';
        setTimeout(() => {
          this.message = '';
        }, 4000);
      });
  }
}
