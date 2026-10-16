import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { AuthService } from '../../services/auth.service';
import { RulesService } from '../../services/rules.service';
import { HeaderComponent } from '../../layout/header/header.component';
import { TitlebannerComponent } from '../../layout/titlebanner/titlebanner.component';

@Component({
  selector: 'app-edit-logsource',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    HeaderComponent,
    TitlebannerComponent,
  ],
  templateUrl: './edit-logsource.component.html',
  styleUrls: ['./edit-logsource.component.css'],
})
export class EditLogsourceComponent implements OnInit {
  logsourceId!: number;
  isLoading: boolean = true;
  isSubmitting: boolean = false;
  errorMessage: string = '';
  originalLogSource: any = null;

  isAdmin: boolean = true;

  typeOptions = [
    { value: 'windows', label: 'Windows' },
    { value: 'linux', label: 'Linux' },
    { value: 'network', label: 'Network' },
    { value: 'cloud', label: 'Cloud' },
    { value: 'application', label: 'Application' },
    { value: 'other', label: 'Outro' },
  ];

  collectionOptions = [
    { value: 'agent', label: 'Agent' },
    { value: 'syslog', label: 'Syslog' },
    { value: 'api', label: 'API' },
    { value: 'file', label: 'File' },
    { value: 'other', label: 'Outro' },
  ];

  editLogSourceForm = new FormGroup({
    name: new FormControl('', [Validators.required]),
    type: new FormControl(''),
    customType: new FormControl(''),
    collectionMethod: new FormControl(''),
    customCollection: new FormControl(''),
    description: new FormControl('', [Validators.required]),
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private rulesService: RulesService,
  ) {}

  ngOnInit(): void {
    this.logsourceId = Number(this.route.snapshot.paramMap.get('id'));
    this.checkUserRole();
  }

  checkUserRole(): void {
    this.authService.loggedInInfo().subscribe({
      next: (res: any) => {
        this.isAdmin = Boolean(res?.is_superuser || res?.is_admin);
        this.loadLogSourceData();
      },
      error: (err) => {
        console.error('Erro ao verificar permissões do utilizador:', err);
        this.isAdmin = false;
        this.loadLogSourceData();
      },
    });
  }

  loadLogSourceData(): void {
    this.isLoading = true;
    this.rulesService.getRegisteredLogSourceById(this.logsourceId).subscribe({
      next: (log: any) => {
        this.originalLogSource = log;

        let mappedType = log.type || '';
        let customTypeVal = '';
        if (mappedType && !this.typeOptions.some((o) => o.value === mappedType)) {
          customTypeVal = mappedType;
          mappedType = 'other';
        }

        let mappedCollection = log.collectionMethod || '';
        let customCollectionVal = '';
        if (
          mappedCollection &&
          !this.collectionOptions.some((o) => o.value === mappedCollection)
        ) {
          customCollectionVal = mappedCollection;
          mappedCollection = 'other';
        }

        this.editLogSourceForm.patchValue({
          name: log.name,
          type: mappedType,
          customType: customTypeVal,
          collectionMethod: mappedCollection,
          customCollection: customCollectionVal,
          description: log.description || '',
        });

        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar log source:', err);
        this.errorMessage = 'Não foi possível carregar os dados da log source.';
        this.isLoading = false;
      },
    });
  }

  updateLogSource(): void {
    if (this.editLogSourceForm.invalid) {
      return;
    }

    const val = this.editLogSourceForm.value;
    let finalType = val.type || '';
    if (finalType === 'other') {
      finalType = val.customType?.trim() || 'other';
    }

    let finalCollection = val.collectionMethod || '';
    if (finalCollection === 'other') {
      finalCollection = val.customCollection?.trim() || 'other';
    }

    const payload = {
      name: val.name?.trim(),
      description: val.description?.trim(),
      type: finalType,
      collectionMethod: finalCollection,
      products: this.originalLogSource?.products || [],
    };

    this.isSubmitting = true;
    this.errorMessage = '';

    this.rulesService
      .updateLogSourceById(this.logsourceId, payload)
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.router.navigate(['/manage-logsources']);
        },
        error: (err: HttpErrorResponse) => {
          this.isSubmitting = false;
          if (err.status === 400 && err.error?.error) {
            this.errorMessage = err.error.error;
          } else {
            this.errorMessage =
              'Ocorreu um erro ao guardar as alterações. Tente novamente.';
          }
        },
      });
  }

  cancel(): void {
    this.router.navigate(['/manage-logsources']);
  }
}

