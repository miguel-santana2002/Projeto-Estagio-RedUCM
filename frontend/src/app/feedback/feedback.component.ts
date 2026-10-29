import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import {
  FeedbackService,
  Feedback,
  FeedbackAttachment,
} from '../services/feedback.service';
import { AuthService } from '../services/auth.service';
import { HeaderComponent } from '../layout/header/header.component';
import { TitlebannerComponent } from '../layout/titlebanner/titlebanner.component';

@Component({
  selector: 'app-feedback',
  standalone: true,
  templateUrl: './feedback.component.html',
  styleUrl: './feedback.component.css',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    HeaderComponent,
    TitlebannerComponent,
  ],
})
export class FeedbackComponent implements OnInit {
  feedbacks: Feedback[] = [];
  filteredFeedbacks: Feedback[] = [];
  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  // Autenticação / Permissões
  currentUser: any = null;
  isAdmin = false;

  // Pesquisa & Filtros
  searchTerm = '';
  selectedTypeFilter: string = 'ALL'; // 'ALL' | 'BUG' | 'FEATURE'
  selectedStatusFilter: string = 'ALL';
  selectedPriorityFilter: string = 'ALL';
  showFiltersPanel = false;

  // Ordenação
  sortColumn: string = 'created_at';
  sortReverse: boolean = true;

  // Paginação
  page = 1;
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];

  // Modais
  isFormModalOpen = false;
  isDetailsModalOpen = false;
  isDeleteModalOpen = false;
  isEditing = false;

  // Item selecionado para visualização ou edição
  selectedFeedback: Feedback | null = null;
  feedbackToDelete: Feedback | null = null;

  // Dados do Formulário
  formId: number | null = null;
  formTitle = '';
  formDescription = '';
  formType: 'BUG' | 'FEATURE' = 'BUG';
  formPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';
  formStatus: 'CRIADO' | 'EM_ANALISE' | 'CONCLUIDO' | 'FECHADO' = 'CRIADO';

  // Gestão de Anexos
  selectedNewFiles: File[] = [];
  existingAttachments: FeedbackAttachment[] = [];
  attachmentIdsToRemove: number[] = [];
  isDraggingOver = false;

  // Opções para selects de estado atualizadas
  statusOptions = [
    { value: 'CRIADO', label: 'Criado' },
    { value: 'EM_ANALISE', label: 'Em Análise' },
    { value: 'CONCLUIDO', label: 'Concluido' },
    { value: 'FECHADO', label: 'Fechado' },
  ];

  priorityOptions = [
    { value: 'LOW', label: 'Baixa' },
    { value: 'MEDIUM', label: 'Média' },
    { value: 'HIGH', label: 'Alta' },
    { value: 'CRITICAL', label: 'Crítica' },
  ];

  constructor(
    private feedbackService: FeedbackService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.loadUserInfo();
    this.loadFeedbacks();
  }

  loadUserInfo(): void {
    this.authService.loggedInInfo().subscribe({
      next: (user: any) => {
        if (user && typeof user === 'object') {
          this.currentUser = user;
          // Removido o !!user?.is_staff para impedir que Operadores sejam marcados como Admin
          this.isAdmin = !!user?.is_admin || !!user?.is_superuser;
        } else {
          this.currentUser = null;
          this.isAdmin = false;
        }
      },
      error: () => {
        this.currentUser = null;
        this.isAdmin = false;
      },
    });
  }

  loadFeedbacks(): void {
    this.loading = true;
    this.errorMessage = '';
    this.feedbackService.getFeedbacks().subscribe({
      next: (data) => {
        this.feedbacks = Array.isArray(data) ? data : [];
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar feedbacks:', err);
        this.errorMessage = 'Não foi possível carregar as submissões.';
        this.loading = false;
      },
    });
  }

  // Permissões: apenas o criador ou admins/devs podem editar/eliminar
  canEditOrDelete(item: Feedback | null): boolean {
    if (!item) return false;
    if (this.isAdmin) return true;
    if (!this.currentUser) return false;

    const currentUserId = this.currentUser.id || this.currentUser.pk;
    if (currentUserId && item.created_by) {
      const itemUserId =
        typeof item.created_by === 'object'
          ? (item.created_by as any).id
          : item.created_by;
      if (itemUserId === currentUserId) return true;
    }

    const currentUsername = this.currentUser.username || this.currentUser.email;
    if (
      currentUsername &&
      (item.author === currentUsername ||
        item.created_by_name === currentUsername)
    ) {
      return true;
    }

    return false;
  }

  applyFilters(): void {
    let result = [...this.feedbacks];

    if (this.selectedTypeFilter !== 'ALL') {
      result = result.filter((item) => item.type === this.selectedTypeFilter);
    }

    if (this.selectedStatusFilter !== 'ALL') {
      result = result.filter(
        (item) => item.status === this.selectedStatusFilter,
      );
    }

    if (this.selectedPriorityFilter !== 'ALL') {
      result = result.filter(
        (item) => item.priority === this.selectedPriorityFilter,
      );
    }

    if (this.searchTerm && this.searchTerm.trim() !== '') {
      const term = this.searchTerm.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.title?.toLowerCase().includes(term) ||
          item.description?.toLowerCase().includes(term) ||
          item.author?.toLowerCase().includes(term) ||
          item.created_by_name?.toLowerCase().includes(term) ||
          `#${item.id}`.includes(term),
      );
    }

    result.sort((a: any, b: any) => {
      let valA = a[this.sortColumn];
      let valB = b[this.sortColumn];

      if (valA == null) valA = '';
      if (valB == null) valB = '';

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return this.sortReverse ? 1 : -1;
      if (valA > valB) return this.sortReverse ? -1 : 1;
      return 0;
    });

    this.filteredFeedbacks = result;
    this.page = 1;
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  setTypeFilter(type: string): void {
    this.selectedTypeFilter = type;
    this.applyFilters();
  }

  clearAllFilters(): void {
    this.searchTerm = '';
    this.selectedTypeFilter = 'ALL';
    this.selectedStatusFilter = 'ALL';
    this.selectedPriorityFilter = 'ALL';
    this.applyFilters();
  }

  sortTable(column: string): void {
    if (this.sortColumn === column) {
      this.sortReverse = !this.sortReverse;
    } else {
      this.sortColumn = column;
      this.sortReverse = false;
    }
    this.applyFilters();
  }

  get totalCount(): number {
    return this.feedbacks.length;
  }

  get bugCount(): number {
    return this.feedbacks.filter((f) => f.type === 'BUG').length;
  }

  get featureCount(): number {
    return this.feedbacks.filter((f) => f.type === 'FEATURE').length;
  }

  get totalPages(): number {
    return Math.ceil(this.filteredFeedbacks.length / this.pageSize) || 1;
  }

  get pagedFeedbacks(): Feedback[] {
    const startIndex = (this.page - 1) * this.pageSize;
    return this.filteredFeedbacks.slice(startIndex, startIndex + this.pageSize);
  }

  setPage(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.page = newPage;
    }
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize = Number(newSize);
    this.page = 1;
  }

  openCreateModal(): void {
    this.isEditing = false;
    this.formId = null;
    this.formTitle = '';
    this.formDescription = '';
    this.formType = 'BUG';
    this.formPriority = 'MEDIUM';
    this.formStatus = 'CRIADO'; // Valor padrão para novos tickets
    this.selectedNewFiles = [];
    this.existingAttachments = [];
    this.attachmentIdsToRemove = [];
    this.errorMessage = '';
    this.isFormModalOpen = true;
  }

  openEditModal(item: Feedback, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (!this.canEditOrDelete(item)) {
      return;
    }
    this.isEditing = true;
    this.formId = item.id;
    this.formTitle = item.title;
    this.formDescription = item.description;
    this.formType = item.type;
    this.formPriority = item.priority;
    this.formStatus = item.status as any;
    this.selectedNewFiles = [];
    this.existingAttachments = [...(item.attachments || [])];
    this.attachmentIdsToRemove = [];
    this.errorMessage = '';
    this.isDetailsModalOpen = false;
    this.isFormModalOpen = true;
  }

  openDetailsModal(item: Feedback): void {
    this.selectedFeedback = item;
    this.isDetailsModalOpen = true;
  }

  closeDetailsModal(): void {
    this.isDetailsModalOpen = false;
    this.selectedFeedback = null;
  }

  closeFormModal(): void {
    this.isFormModalOpen = false;
    this.selectedNewFiles = [];
    this.existingAttachments = [];
    this.attachmentIdsToRemove = [];
  }

  openDeleteModal(item: Feedback, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (!this.canEditOrDelete(item)) {
      return;
    }
    this.feedbackToDelete = item;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen = false;
    this.feedbackToDelete = null;
  }

  onFilesSelected(event: any): void {
    const files: FileList = event.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        this.selectedNewFiles.push(files[i]);
      }
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver = false;
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver = false;

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const files = event.dataTransfer.files;
      for (let i = 0; i < files.length; i++) {
        this.selectedNewFiles.push(files[i]);
      }
    }
  }

  removeNewFile(index: number): void {
    this.selectedNewFiles.splice(index, 1);
  }

  markExistingAttachmentForRemoval(attachment: FeedbackAttachment): void {
    if (!this.attachmentIdsToRemove.includes(attachment.id)) {
      this.attachmentIdsToRemove.push(attachment.id);
    }
    this.existingAttachments = this.existingAttachments.filter(
      (a) => a.id !== attachment.id,
    );
  }

  formatBytes(bytes: number, decimals: number = 2): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  isImageFile(filename: string): boolean {
    if (!filename) return false;
    const lower = filename.toLowerCase();
    return (
      lower.endsWith('.png') ||
      lower.endsWith('.jpg') ||
      lower.endsWith('.jpeg') ||
      lower.endsWith('.gif') ||
      lower.endsWith('.webp') ||
      lower.endsWith('.svg')
    );
  }

  submitForm(): void {
    if (!this.formTitle.trim()) {
      this.errorMessage = 'O título é obrigatório.';
      return;
    }
    if (!this.formDescription.trim()) {
      this.errorMessage = 'A descrição é obrigatória.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    const formData = new FormData();
    formData.append('title', this.formTitle.trim());
    formData.append('description', this.formDescription.trim());
    formData.append('type', this.formType);
    formData.append('priority', this.formPriority);

    // Se estiver em modo de criação, o estado é sempre "CRIADO"
    formData.append('status', this.isEditing ? this.formStatus : 'CRIADO');

    for (const file of this.selectedNewFiles) {
      formData.append('attachments', file, file.name);
    }

    if (this.isEditing && this.formId) {
      if (this.attachmentIdsToRemove.length > 0) {
        formData.append(
          'remove_attachment_ids',
          JSON.stringify(this.attachmentIdsToRemove),
        );
      }

      this.feedbackService.updateFeedback(this.formId, formData).subscribe({
        next: (updated) => {
          this.saving = false;
          this.closeFormModal();
          this.showSuccess('Submissão atualizada com sucesso!');
          this.loadFeedbacks();
          if (
            this.selectedFeedback &&
            this.selectedFeedback.id === updated.id
          ) {
            this.selectedFeedback = updated;
          }
        },
        error: (err) => {
          console.error('Erro ao atualizar submissão:', err);
          this.saving = false;
          this.errorMessage =
            err.error?.detail || 'Erro ao guardar alterações. Tente novamente.';
        },
      });
    } else {
      this.feedbackService.createFeedback(formData).subscribe({
        next: () => {
          this.saving = false;
          this.closeFormModal();
          this.showSuccess(
            'Submissão enviada com sucesso! Obrigado pelo feedback.',
          );
          this.loadFeedbacks();
        },
        error: (err) => {
          console.error('Erro ao criar submissão:', err);
          this.saving = false;
          this.errorMessage =
            err.error?.detail || 'Erro ao submeter. Tente novamente.';
        },
      });
    }
  }

  confirmDelete(): void {
    if (!this.feedbackToDelete) return;

    const id = this.feedbackToDelete.id;
    this.saving = true;

    this.feedbackService.deleteFeedback(id).subscribe({
      next: () => {
        this.saving = false;
        this.closeDeleteModal();
        if (this.selectedFeedback && this.selectedFeedback.id === id) {
          this.closeDetailsModal();
        }
        this.showSuccess('Submissão eliminada com sucesso!');
        this.loadFeedbacks();
      },
      error: (err) => {
        console.error('Erro ao eliminar submissão:', err);
        this.saving = false;
        this.errorMessage = 'Erro ao eliminar submissão. Tente novamente.';
      },
    });
  }

  showSuccess(msg: string): void {
    this.successMessage = msg;
    setTimeout(() => {
      this.successMessage = '';
    }, 4000);
  }

  getTypeBadgeClasses(type: string): string {
    if (type === 'BUG') {
      return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800';
    }
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
  }

  getStatusBadgeClasses(status: string): string {
    switch (status) {
      case 'CRIADO':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
      case 'EM_ANALISE':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800';
      case 'CONCLUIDO':
        return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border border-green-200 dark:border-green-800';
      case 'FECHADO':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  }

  getPriorityBadgeClasses(priority: string): string {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-600 text-white shadow-xs';
      case 'HIGH':
        return 'bg-orange-500 text-white shadow-xs';
      case 'MEDIUM':
        return 'bg-amber-500 text-white shadow-xs';
      case 'LOW':
        return 'bg-gray-500 text-white shadow-xs';
      default:
        return 'bg-gray-400 text-white';
    }
  }

  getStatusLabel(status: string): string {
    const found = this.statusOptions.find((o) => o.value === status);
    return found ? found.label : status;
  }

  getPriorityLabel(priority: string): string {
    const found = this.priorityOptions.find((o) => o.value === priority);
    return found ? found.label : priority;
  }
}
