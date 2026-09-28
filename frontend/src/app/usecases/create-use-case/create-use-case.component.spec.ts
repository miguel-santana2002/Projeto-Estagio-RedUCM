import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateUseCaseComponent } from './create-use-case.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { MitreService } from '../../services/mitre.service';
import { UsecasesService } from '../../services/usecases.service';
import { Router } from '@angular/router';

// Dados mock: T1098 pertence a VÁRIAS táticas (multi-tática)
const MOCK_TECHNIQUES = [
  { id: 'T1059', name: 'Command and Scripting Interpreter', tactics: ['Execution'] },
  { id: 'T1098', name: 'Account Manipulation', tactics: ['Persistence', 'Defense Evasion'] },
  { id: 'T1112', name: 'Modify Registry', tactics: ['Defense Evasion'] },
];

describe('CreateUseCaseComponent', () => {
  let component: CreateUseCaseComponent;
  let fixture: ComponentFixture<CreateUseCaseComponent>;
  let mitreService: MitreService;
  let usecasesService: UsecasesService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        ReactiveFormsModule,
        FormsModule,
        RouterTestingModule,
        NoopAnimationsModule,
      ],
      providers: [
        {
          provide: MitreService,
          useValue: {
            getAllTechniques: jasmine
              .createSpy('getAllTechniques')
              .and.returnValue(of(MOCK_TECHNIQUES)),
          },
        },
        {
          provide: UsecasesService,
          useValue: {
            createUseCase: jasmine.createSpy('createUseCase').and.returnValue(of({})),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateUseCaseComponent);
    component = fixture.componentInstance;
    mitreService = TestBed.inject(MitreService);
    usecasesService = TestBed.inject(UsecasesService);
    router = TestBed.inject(Router);
    fixture.detectChanges(); // dispara ngOnInit -> loadMitreTechniques
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    const form = component.createUseCaseForm;
    expect(form).toBeDefined();
    expect(form.get('title')?.value).toBe('');
    expect(form.get('mitreTechniques')?.value).toEqual([]);
    expect(form.get('tactics')?.value).toEqual([]);
  });

  it('should build tactics list and technique list from API data', () => {
    expect(component.allTacticsList).toEqual(['Defense Evasion', 'Execution', 'Persistence']);
    expect(component.mitreAutocompleteList.length).toBe(3);
    expect(component.filteredTechniquesList.length).toBe(3);
  });

  // ---------- Fase 3: filtro cruzado ----------

  it('onTacticChange: união de várias táticas mostra técnicas de todas', () => {
    component.createUseCaseForm.get('tactics')?.setValue(['Execution', 'Persistence']);
    component.onTacticChange();

    expect(component.filteredTechniquesList).toContain('T1059 - Command and Scripting Interpreter'); // Execution
    expect(component.filteredTechniquesList).toContain('T1098 - Account Manipulation'); // Persistence
    expect(component.filteredTechniquesList).not.toContain('T1112 - Modify Registry'); // só Defense Evasion
  });

  it('onTacticChange: sem táticas selecionadas mostra todas as técnicas', () => {
    component.createUseCaseForm.get('tactics')?.setValue([]);
    component.onTacticChange();
    expect(component.filteredTechniquesList.length).toBe(3);
  });

  it('onTechniqueChange: técnica multi-tática adiciona TODAS as suas táticas', () => {
    component.createUseCaseForm.get('mitreTechniques')?.setValue(['T1098 - Account Manipulation']);
    component.onTechniqueChange();

    const tactics = component.createUseCaseForm.get('tactics')?.value || [];
    expect(tactics).toContain('Persistence');
    expect(tactics).toContain('Defense Evasion');
  });

  it('remover uma tática auto-remove as técnicas que deixaram de ser válidas', () => {
    // Utilizador seleciona duas táticas
    component.createUseCaseForm.get('tactics')?.setValue(['Defense Evasion', 'Persistence']);
    component.onTacticChange();
    // e duas técnicas válidas nesse âmbito
    component.createUseCaseForm
      .get('mitreTechniques')
      ?.setValue(['T1098 - Account Manipulation', 'T1112 - Modify Registry']);
    component.onTechniqueChange();

    // Utilizador remove 'Defense Evasion' -> T1112 (só Defense Evasion) fica inválida
    component.createUseCaseForm.get('tactics')?.setValue(['Persistence']);
    component.onTacticChange();

    const techs = component.createUseCaseForm.get('mitreTechniques')?.value || [];
    expect(techs).toContain('T1098 - Account Manipulation'); // ainda tem Persistence
    expect(techs).not.toContain('T1112 - Modify Registry'); // removida automaticamente
  });

  // ---------- CNCS ----------

  it('should update CNCS values based on selected category', () => {
    component.createUseCaseForm.get('cncsClass')?.setValue('Código Malicioso');
    component.updateCNCSValues();
    expect(component.selectedCategoryValues).toEqual([
      'Sistema Infetado',
      'Distribuição de Malware',
      'Servidor C2',
      'Configuração de Malware',
    ]);
  });

  it('should handle file selection', () => {
    const file = new File([''], 'test-file.txt');
    const event = { target: { files: [file] } } as unknown as Event;
    component.onFileSelected(event);
    expect(component.selectedFile).toBe(file);
  });
});