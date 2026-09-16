import { Component, ViewChild } from '@angular/core';
import { HeaderComponent } from "../../layout/header/header.component";
import { TitlebannerComponent } from "../../layout/titlebanner/titlebanner.component";
import { FormsModule, ReactiveFormsModule, NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RulesService } from '../../services/rules.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
    selector: 'app-manage-logsources',
    standalone: true,
    templateUrl: './manage-logsources.component.html',
    styleUrl: './manage-logsources.component.css',
    imports: [HeaderComponent, TitlebannerComponent, FormsModule, CommonModule, ReactiveFormsModule]
})
export class ManageLogsourcesComponent {

  @ViewChild('logForm') logForm!: NgForm;

  typeOptions = [
    { value: 'windows', label: 'Windows' },
    { value: 'linux', label: 'Linux' },
    { value: 'network', label: 'Network' },
    { value: 'cloud', label: 'Cloud' },
    { value: 'application', label: 'Application' },
    { value: 'other', label: 'Other' },
  ];

  collectionOptions = [
    { value: 'agent', label: 'Agent' },
    { value: 'syslog', label: 'Syslog' },
    { value: 'api', label: 'API' },
    { value: 'file', label: 'File' },
    { value: 'other', label: 'Other' },
  ];

  newLog: any = this.emptyLog();
  productsInput: string = '';
  customType: string = '';
  customCollection: string = '';

  logsources: any = [];
  searchTerm: string = '';

  editingId: number | null = null;
  errorMessage: any;
  successMessage: string | null = null;
  private successTimeout: any;

  private emptyLog() {
    return { name: '', description: '', type: '', collectionMethod: '', products: [] };
  }

  get filteredLogsources(): any[] {
    if (!this.searchTerm.trim()) {
      return this.logsources;
    }
    const term = this.searchTerm.toLowerCase();
    return this.logsources.filter((log: any) =>
      log.name?.toLowerCase().includes(term) ||
      log.description?.toLowerCase().includes(term)
    );
  }

  get isEditing(): boolean {
    return this.editingId !== null;
  }

  typeLabel(value: string): string {
    return this.typeOptions.find(o => o.value === value)?.label || value;
  }

  collectionLabel(value: string): string {
    return this.collectionOptions.find(o => o.value === value)?.label || value;
  }

  startEdit(log: any) {
    this.editingId = log.id;

    // Se o tipo existir mas não estiver na lista padrão, passa a palavra para a caixa custom e seleciona 'other'
    let mappedType = log.type || '';
    if (mappedType && !this.typeOptions.some(o => o.value === mappedType)) {
      this.customType = mappedType;
      mappedType = 'other';
    } else {
      this.customType = '';
    }

    // O mesmo para a recolha
    let mappedCollection = log.collectionMethod || '';
    if (mappedCollection && !this.collectionOptions.some(o => o.value === mappedCollection)) {
      this.customCollection = mappedCollection;
      mappedCollection = 'other';
    } else {
      this.customCollection = '';
    }

    this.newLog = {
      name: log.name,
      description: log.description,
      type: mappedType,
      collectionMethod: mappedCollection,
      products: log.products || [],
    };
    this.productsInput = (log.products || []).join(', ');
    this.errorMessage = null;
  }

  cancelEdit() {
    this.editingId = null;
    this.errorMessage = null;
    this.resetFormState();
  }

  private resetFormState() {
    this.newLog = this.emptyLog();
    this.productsInput = '';
    this.customType = '';
    this.customCollection = '';
    if (this.logForm) {
      this.logForm.resetForm();
    }
  }

  private showSuccess(message: string) {
    this.successMessage = message;
    clearTimeout(this.successTimeout);
    this.successTimeout = setTimeout(() => {
      this.successMessage = null;
    }, 2500);
  }

  private syncProducts() {
    this.newLog.products = this.productsInput
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }

  submitForm() {
    this.syncProducts();
    if (this.isEditing) {
      this.updateLogSource();
    } else {
      this.createLogSource();
    }
  }

  createLogSource() {
    const payload = { ...this.newLog };
    if (payload.type === 'other') payload.type = this.customType;
    if (payload.collectionMethod === 'other') payload.collectionMethod = this.customCollection;

    this.rulesService.createRegisteredLogSource(payload).subscribe({
      next: (data) => {
        this.rulesService.getRegisteredLogSources().subscribe((data) => {
          this.logsources = data;
          this.errorMessage = null;
          this.resetFormState();
          this.showSuccess('Fonte registada com sucesso!');
        });
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 400) {
          this.errorMessage = error.error.error;
        }
      }
    });
  }

  updateLogSource() {
    if (this.editingId === null) return;

    const payload = { ...this.newLog };
    if (payload.type === 'other') payload.type = this.customType;
    if (payload.collectionMethod === 'other') payload.collectionMethod = this.customCollection;

    this.rulesService.updateLogSourceById(this.editingId, payload).subscribe({
      next: (data) => {
        this.rulesService.getRegisteredLogSources().subscribe((data) => {
          this.logsources = data;
          this.errorMessage = null;
          this.editingId = null;
          this.resetFormState();
          this.showSuccess('Alterações guardadas com sucesso!');
        });
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 400) {
          this.errorMessage = error.error.error;
        }
      }
    });
  }

  confirmDelete(log: any) {
    if (confirm(`Eliminar a logsource "${log.name}"?`)) {
      this.deleteLogSourceById(log.id);
    }
  }

  deleteLogSourceById(id: any) {
    this.rulesService.deleteLogSourceById(id).subscribe((data) => {
      this.rulesService.getRegisteredLogSources().subscribe((data) => {
        this.logsources = data;
        if (this.editingId === id) {
          this.cancelEdit();
        }
      })
    })
  }

  constructor(private rulesService: RulesService) { }

  ngOnInit() {
    this.rulesService.getRegisteredLogSources().subscribe((data) => {
      this.logsources = data;
    })
  }

    selectedLog: any = null;

  viewDetails(log: any) {
    this.selectedLog = log;
  }

  closeDetails() {
    this.selectedLog = null;
  }

  visibleProducts(products: string[]): string[] {
    return (products || []).slice(0, 3);
  }

  extraProductsCount(products: string[]): number {
    return Math.max((products || []).length - 3, 0);
  }

}

