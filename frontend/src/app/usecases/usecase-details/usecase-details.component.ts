import { Component, ElementRef, ViewChild } from '@angular/core';
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
export class UsecaseDetailsComponent {
  createTaskForm = new FormGroup({
    title: new FormControl(''),
    description: new FormControl(''),
  });

  @ViewChild('modal') modal!: ElementRef<HTMLElement>;
  modalFlowbite!: Modal;

  ruleModels: any = [];

  ngAfterViewInit() {
    this.modalFlowbite = new Modal(this.modal.nativeElement);
  }

  openTaskModal(phase: string) {
    this.modalFlowbite.show();
    this.selectedPhase = phase;
  }

  closeTaskModal() {
    this.modalFlowbite.hide();
    this.createTaskForm.reset();
  }

  user: any = { username: '', companies: [] };

  usecase: Usecase = {
    id: 0,
    title: 'Use Case de Exemplo',
    description: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce arcu augue, cursus euismod tristique eget, lobortis a arcu. Phasellus auctor eu justo id fermentum. Pellentesque eu varius magna, et egestas ante. Pellentesque eleifend et lorem sit amet consequat. Cras a eros ut metus vestibulum volutpat. Suspendisse justo urna, interdum ultrices finibus sed, lacinia in sem. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Suspendisse enim urna, facilisis quis pulvinar quis, venenatis ut enim. Morbi bibendum massa massa, tempor posuere nibh dictum quis. Aliquam sodales eget sapien et eleifend. Morbi a lectus at diam molestie fringilla id nec tellus.

        Vestibulum posuere fermentum nulla quis varius. Sed cursus egestas laoreet. Curabitur consequat sit amet justo eu imperdiet. Sed sodales, dui vel lacinia molestie, dui ex blandit est, at pharetra est sem sed felis. Morbi mattis, erat a tincidunt efficitur, mi augue euismod lacus, sed condimentum turpis augue eget sem. Cras imperdiet, lacus eget aliquet iaculis, lacus eros dignissim nulla, vel pulvinar enim urna eget diam. In id quam lobortis, mollis lectus feugiat, semper lectus. Vestibulum feugiat accumsan enim non pulvinar. Mauris sed velit nec nulla lobortis feugiat. Suspendisse gravida consequat rutrum. Aliquam erat volutpat.
        
        `,
    mitigation: `Donec consectetur vulputate ex nec venenatis. Mauris a commodo purus, maximus vulputate magna. Mauris vel turpis in lorem sollicitudin tempor. Pellentesque ullamcorper blandit purus, id lacinia risus volutpat eu. Aliquam eleifend risus mi, ut sollicitudin nibh ultricies vitae. Nulla finibus arcu metus, ac eleifend metus ultricies sit amet. Pellentesque in elit aliquet, rhoncus ex in, laoreet ipsum. Cras cursus ante sit amet odio vulputate ultricies. Fusce tincidunt pharetra arcu nec pulvinar. Orci varius natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Ut at tortor sed velit molestie ultricies at eu quam. Curabitur sapien arcu, varius eget pretium ac, tristique sed lectus.

        Maecenas iaculis, erat vel fermentum consequat, risus lacus consectetur justo, id aliquam metus ipsum vel nisi. Proin ultricies odio augue, a vulputate massa lacinia at. Nulla molestie magna urna, in scelerisque urna elementum a. Nulla faucibus lectus a posuere iaculis. Proin eget dui nec justo volutpat pellentesque vel sit amet erat. Integer est tellus, aliquam nec convallis in, interdum quis massa. Quisque maximus, libero quis elementum ultricies, leo metus fringilla diam, in ultrices massa leo sit amet purus..`,
    playbook: null,

    mitreTechniques: ['T1552', 'T1547'],
    cncsClass: 'Classe 1',
    cncsType: 'Tipo X',
    phaseTasks: [
      {
        Preparation: {
          'Tarefa 1': `Este é um texto exemplificativo da tarefa 1 que visa X Y Z. 
            É assim necessário H Y J K L M N O P Q R S T U V W X Y Z. `,
          'Fazer X': 'tarefa2',
        },
        'Detection and Analysis': {
          titulo1: 'tarefa1',
          'Construir Y': 'tarefa2',
          'Detetar W': 'tarefa3',
        },
        'Containment, Eradication and Recovery': {
          titulo1: 'tarefa1',
          titulo2: 'tarefa2',
          titulo3: 'tarefa3',
        },
        'Post-Event Activity': {
          titulo1: 'tarefa1',
          titulo2: 'tarefa2',
          titulo3: 'tarefa3',
        },
      },
    ],
    attackVectors: ['Phishing', 'Compromised Credentials'],
  };

  detection = [] as any;
  showTaskDetails: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private usecasesService: UsecasesService,
    private authService: AuthService,
    private rulesService: RulesService,
  ) {}

  showLog() {
    console.log('funciono');
  }

  ngOnInit(): void {
    this.authService.loggedInInfo().subscribe((value) => {
      this.user = value;
      if (this.user.companies === null) {
        this.user.companies = [];
      }
    });

    const id = Number(this.route.snapshot.params['id']);

    this.usecasesService.getUseCaseById(id).subscribe((data: any) => {
      this.usecase = data;

      this.rulesService.getRuleModelsByUseCase(this.usecase.id).subscribe({
        next: (ruleData: any) => {
          this.ruleModels = ruleData;
        },
        error: (err) => console.error('Erro ao obter rule models:', err),
      });
    });
  }

  showModal: boolean = false;

  selectedTask: any;

  selectImage(): void {
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  clickTask(task: any) {
    this.selectedTask = task;
    this.showTaskDetails = true;
  }

  closeTaskDetails(): void {
    this.showTaskDetails = false;
  }

  selectedPhase: any;

  isEditing: boolean = false;
  enableEdit() {
    this.isEditing = true;
  }

  saveTask() {
    console.log(this.usecase.phaseTasks);

    this.usecasesService
      .updatePhaseTasks(this.usecase.id, this.usecase.phaseTasks)
      .subscribe((data: any) => {
        console.log(data);
        this.isEditing = false;
        this.showTaskDetails = false;
      });
  }

  cancelEdit() {
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

    console.log(this.selectedPhase);
    console.log(task);

    this.usecase.phaseTasks
      ?.find((phase) => phase['phase'] == this.selectedPhase)
      ?.['tasks'].push(task);

    console.log(this.usecase.phaseTasks);

    this.usecasesService
      .updatePhaseTasks(this.usecase.id, this.usecase.phaseTasks)
      .subscribe((data: any) => {
        console.log(data);

        this.closeTaskModal();
      });
  }
}

export interface Usecase {
  id: number;
  title: string;
  description?: string | null;
  mitigation?: string | null;
  playbook?: string | null;
  mitreTechniques?: (string | null)[] | null;
  cncsClass?: string | null;
  cncsType?: string | null;
  phaseTasks?: Array<{ [key: string]: any }> | null;
  rules?: Array<{ [key: string]: any }> | null;
  attackVectors?: String[] | null;
  logsources?: String[] | null;
}
