import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { HeaderComponent } from '../../layout/header/header.component';
import { TitlebannerComponent } from '../../layout/titlebanner/titlebanner.component';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { UsecasesService } from '../../services/usecases.service';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Modal } from 'flowbite';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { RulesService } from '../../services/rules.service';

@Component({
  selector: 'app-usecase-details',
  standalone: true,
  templateUrl: './usecase-details.component.html',
  styleUrl: './usecase-details.component.css',
  imports: [
    HeaderComponent,
    TitlebannerComponent,
    DecimalPipe,
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
  ],
})
export class UsecaseDetailsComponent implements OnInit, AfterViewInit, OnDestroy {
  createTaskForm = new FormGroup({
    title: new FormControl(''),
    description: new FormControl(''),
  });

  @ViewChild('modal') modal!: ElementRef<HTMLElement>;
  modalFlowbite!: Modal;

  regras: any[] = [];
  sigmas: any[] = [];
  private pollTimer: any = null;

  user: any = { username: '', companies: [] };

  usecase: Usecase = {
    id: 0,
    title: '',
    description: '',
    mitigation: '',
    playbook: null,
    mitreTechniques: [],
    cncsClass: '',
    cncsType: '',
    phaseTasks: [],
    attackVectors: [],
  };

  detection: any[] = [];
  showTaskDetails: boolean = false;
  showModal: boolean = false;
  selectedTask: any;
  selectedPhase: any;
  isEditing: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private usecasesService: UsecasesService,
    private authService: AuthService,
    private rulesService: RulesService,
  ) {}

  ngOnInit(): void {
    this.authService.loggedInInfo().subscribe((value) => {
      this.user = value;
      if (this.user.companies === null) {
        this.user.companies = [];
      }
    });

    const id = Number(this.route.snapshot.params['id']);

        this.usecasesService.getUseCaseById(id).subscribe({
      next: (data: any) => {
        this.usecase = data;
        this.loadAssociatedRules(this.usecase.id);
      },
      error: (err) => console.error('Erro ao obter Use Case:', err),
    });
  }

  ngAfterViewInit(): void {
    if (this.modal?.nativeElement) {
      this.modalFlowbite = new Modal(this.modal.nativeElement);
    }
  }

  /**
   * Obtém todas as regras da aplicação e filtra as que pertencem a este Use Case.
   */
    loadAssociatedRules(useCaseId: number): void {
    this.rulesService.getRules().subscribe({
      next: (allRules: any[]) => {
        const mine = allRules.filter(
          (r: any) => Number(r.useCaseId) === useCaseId && !r.client,
        );
        this.sigmas = mine.filter((r: any) => r.syntax === 'Sigma Rule');
        this.regras = mine.filter((r: any) => r.syntax !== 'Sigma Rule');
        this.managePolling(mine.some((r: any) => r.generationStatus === 'pending'));
      },
      error: (err) => console.error('Erro ao obter regras associadas:', err),
    });
  }

  private managePolling(pending: boolean): void {
    if (pending && !this.pollTimer) {
      this.pollTimer = setInterval(() => this.loadAssociatedRules(this.usecase.id), 10000);
    } else if (!pending && this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  ngOnDestroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  openTaskModal(phase: string): void {
    this.selectedPhase = phase;
    this.modalFlowbite?.show();
  }

  closeTaskModal(): void {
    this.modalFlowbite?.hide();
    this.createTaskForm.reset();
  }

  getPlaybookUrl(): string {
    const pb = this.usecase?.playbook;
    if (!pb || pb === 'null' || pb.endsWith('/null')) {
      return './assets/examplediagram.png';
    }
    return pb;
  }

  selectImage(): void {
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  clickTask(task: any): void {
    this.selectedTask = task;
    this.showTaskDetails = true;
  }

  closeTaskDetails(): void {
    this.showTaskDetails = false;
  }

  enableEdit(): void {
    this.isEditing = true;
  }

  saveTask(): void {
    this.usecasesService
      .updatePhaseTasks(this.usecase.id, this.usecase.phaseTasks)
      .subscribe({
        next: () => {
          this.isEditing = false;
          this.showTaskDetails = false;
        },
        error: (err) => console.error('Erro ao atualizar tarefas:', err),
      });
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.showTaskDetails = false;
  }

  createTask(): void {
    const title: string = this.createTaskForm.value?.title || '';
    const description: string | null =
      this.createTaskForm.value?.description || null;

    const task = {
      title: title,
      description: description,
      datecreated: new Date(),
      author: this.user.email,
    };

    this.usecase.phaseTasks
      ?.find((phase) => phase['phase'] === this.selectedPhase)
      ?.['tasks'].push(task);

    this.usecasesService
      .updatePhaseTasks(this.usecase.id, this.usecase.phaseTasks)
      .subscribe({
        next: () => {
          this.closeTaskModal();
        },
        error: (err) => console.error('Erro ao criar tarefa:', err),
      });
  }

  copiedMessage: string = '';

  copyUseCaseId(): void {
    if (this.usecase?.id) {
      navigator.clipboard.writeText(`RedUC${this.usecase.id}`);
      this.copiedMessage = 'ID copiado!';
      setTimeout(() => (this.copiedMessage = ''), 3000);
    }
  }

  getTechniqueId(technique: any): string {
    if (!technique) return '';
    const str =
      typeof technique === 'string'
        ? technique
        : technique.id || technique.value || technique.display || '';
    return str.split(' - ')[0].trim();
  }
}

export interface Usecase {
  id: number;
  title: string;
  description?: string | null;
  mitigation?: string | null;
  playbook?: string | null;
  mitreTechniques?: (string | null)[] | null;
  tactics?: string[] | null;  // <-- ADicionado
  cncsClass?: string | null;
  cncsType?: string | null;
  phaseTasks?: Array<{ [key: string]: any }> | null;
  rules?: Array<{ [key: string]: any }> | null;
  attackVectors?: String[] | null;
  logsources?: String[] | null;
}
